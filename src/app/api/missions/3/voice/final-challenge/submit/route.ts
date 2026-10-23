import { NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';
import { writeErrorAuditLog } from '@/lib/audit';

import {
  EXECUTIVE_VOICE_FINAL_ITEMS,
  EXECUTIVE_VOICE_FINAL_DECISIONS,
  deriveExecutiveVoiceFinalOutcome,
  type ExecutiveVoiceFinalAction,
} from '@/lib/missions/mission-three-scoring';

type FinalChallengeRoundResult = {
  items: Record<string, { action: string; outcome: string; points: number }>;
  outcome: 'correct' | 'partial' | 'incorrect';
  points: number;
};

// Scores and saves the Executive Voice Verification section's
// closing multi-clip challenge. Saved under the same
// mission_progress.progress.voice_rounds map as the 5 individual
// rounds (round key "final_challenge"), via the same idempotent RPC
// -- so a completed challenge can't be replayed either.
export async function POST(request: Request) {
  let authedUserId: string | null = null;

  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { code: 'AUTH_REQUIRED', message: 'You must be signed in.' },
        { status: 401 }
      );
    }

    authedUserId = user.id;

    const { data: attempt, error: attemptError } = await supabase
      .from('mission_attempts')
      .select('id, status, current_stage')
      .eq('player_id', user.id)
      .eq('mission_id', 3)
      .maybeSingle();

    if (attemptError || !attempt) {
      return NextResponse.json(
        { message: 'Mission attempt not found.' },
        { status: 404 }
      );
    }

    if (attempt.status !== 'active' || attempt.current_stage !== 'voice') {
      return NextResponse.json(
        {
          message:
            'This round is not currently active for your attempt.',
        },
        { status: 409 }
      );
    }

    const body = await request.json().catch(() => ({}));

    const submittedActions: Record<string, unknown> =
      body?.actions && typeof body.actions === 'object' ? body.actions : {};

    const items: FinalChallengeRoundResult['items'] = {};

    let rawTotal = 0;
    let correctCount = 0;

    for (const item of EXECUTIVE_VOICE_FINAL_ITEMS) {
      const actionId = submittedActions[item.id];

      const option =
        typeof actionId === 'string' &&
        actionId in EXECUTIVE_VOICE_FINAL_DECISIONS
          ? EXECUTIVE_VOICE_FINAL_DECISIONS[
              actionId as ExecutiveVoiceFinalAction
            ]
          : undefined;

      if (!option) {
        return NextResponse.json(
          { message: `Missing or invalid decision for "${item.id}".` },
          { status: 400 }
        );
      }

      items[item.id] = {
        action: option.id,
        outcome: option.outcome,
        points: option.points,
      };

      rawTotal += option.points;

      if (option.outcome === 'correct') {
        correctCount++;
      }
    }

    const outcome = deriveExecutiveVoiceFinalOutcome(correctCount, rawTotal);

    const roundResult: FinalChallengeRoundResult = {
      items,
      outcome,
      points: rawTotal,
    };

    const { data: progress, error: rpcError } = await supabase.rpc(
      'save_mission_three_voice_round',
      {
        p_attempt_id: attempt.id,
        p_round_key: 'final_challenge',
        p_round_result: roundResult,
      }
    );

    if (rpcError) {
      console.error(
        '[MISSION 03 VOICE FINAL CHALLENGE] save failed:',
        rpcError
      );

      await writeErrorAuditLog({
        actorId: user.id,
        actorRole: 'player',
        action: 'MISSION_VOICE_ROUND_SAVE_FAILED',
        targetType: 'mission',
        targetId: '3',
        description: 'Unable to save the Mission 03 voice final challenge.',
        error: rpcError,
        context: { round: 'final_challenge' },
      });

      return NextResponse.json(
        { message: 'Unable to save your answers.' },
        { status: 500 }
      );
    }

    const savedRounds = (
      progress as Record<string, Record<string, FinalChallengeRoundResult>> | null
    )?.voice_rounds;

    const saved = savedRounds?.final_challenge ?? roundResult;

    return NextResponse.json(
      {
        ok: true,
        roundKey: 'final_challenge',
        outcome: saved.outcome,
        points: saved.points,
        items: saved.items,
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    console.error('[MISSION 03 VOICE FINAL CHALLENGE]', error);

    await writeErrorAuditLog({
      actorId: authedUserId,
      actorRole: authedUserId ? 'player' : null,
      action: 'MISSION_VOICE_ROUND_SAVE_FAILED',
      targetType: 'mission',
      targetId: '3',
      description:
        'Unexpected error submitting the Mission 03 voice final challenge.',
      error,
    });

    return NextResponse.json(
      { message: 'Unable to save your answers.' },
      { status: 500 }
    );
  }
}
