import { NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';
import { writeErrorAuditLog } from '@/lib/audit';

import {
  EXECUTIVE_VOICE_ROUNDS,
  getExecutiveVoiceTrustDecisions,
  computeExecutiveVoiceRoundPoints,
  type ExecutiveVoiceTrustAction,
} from '@/lib/missions/mission-three-scoring';

const VALID_TRUST_ACTIONS: ExecutiveVoiceTrustAction[] = [
  'trust',
  'investigate',
  'reject',
];

// Scores and saves a single Executive Voice Verification round.
// current_stage stays "voice" for every call here -- this never
// advances the attempt. See save_mission_three_voice_round()
// (migration 011) for the idempotency guarantee that keeps a
// completed round from being replayed for extra points.
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

    const body = await request.json().catch(() => ({}));

    const roundKey = typeof body?.roundKey === 'string' ? body.roundKey : null;
    const trustAction =
      typeof body?.trustAction === 'string' ? body.trustAction : null;
    const followUpAnswerId =
      typeof body?.followUpAnswerId === 'string'
        ? body.followUpAnswerId
        : null;
    const hintUsed = body?.hintUsed === true;

    const round = roundKey
      ? EXECUTIVE_VOICE_ROUNDS.find((candidate) => candidate.id === roundKey)
      : undefined;

    if (!round) {
      return NextResponse.json({ message: 'Invalid round.' }, { status: 400 });
    }

    const trustOption =
      trustAction &&
      VALID_TRUST_ACTIONS.includes(trustAction as ExecutiveVoiceTrustAction)
        ? getExecutiveVoiceTrustDecisions(round)[
            trustAction as ExecutiveVoiceTrustAction
          ]
        : undefined;

    const followUpOption = followUpAnswerId
      ? round.followUp.options.find(
          (option) => option.id === followUpAnswerId
        )
      : undefined;

    if (!trustOption || !followUpOption) {
      return NextResponse.json(
        { message: 'Answer both the trust decision and the follow-up question.' },
        { status: 400 }
      );
    }

    const { data: attempt, error: attemptError } = await supabase
      .from('mission_attempts')
      .select('id, status, current_stage')
      .eq('player_id', user.id)
      .eq('mission_id', 3)
      .maybeSingle();

    if (attemptError || !attempt) {
      console.error(
        '[MISSION 03 VOICE ROUND] Attempt lookup failed:',
        attemptError
      );

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

    const followUpCorrect = followUpAnswerId === round.followUp.correctOptionId;

    const points = computeExecutiveVoiceRoundPoints({
      round,
      trustAction: trustOption.id as ExecutiveVoiceTrustAction,
      followUpCorrect,
      hintUsed,
    });

    const roundResult = {
      trustAction: trustOption.id,
      outcome: trustOption.outcome,
      followUpAnswerId,
      followUpCorrect,
      hintUsed,
      points,
    };

    const { data: progress, error: rpcError } = await supabase.rpc(
      'save_mission_three_voice_round',
      {
        p_attempt_id: attempt.id,
        p_round_key: round.id,
        p_round_result: roundResult,
      }
    );

    if (rpcError) {
      console.error(
        '[MISSION 03 VOICE ROUND] save_mission_three_voice_round failed:',
        rpcError
      );

      await writeErrorAuditLog({
        actorId: user.id,
        actorRole: 'player',
        action: 'MISSION_VOICE_ROUND_SAVE_FAILED',
        targetType: 'mission',
        targetId: '3',
        description: `Unable to save Mission 03 voice round ${round.id}.`,
        error: rpcError,
        context: { round: round.id },
      });

      return NextResponse.json(
        { message: 'Unable to save your answer.' },
        { status: 500 }
      );
    }

    const savedRounds = (
      progress as Record<string, Record<string, typeof roundResult>> | null
    )?.voice_rounds;

    const saved = savedRounds?.[round.id];

    // The RPC returned without error, but didn't actually confirm this
    // round was saved -- treat that as a failure rather than silently
    // falling back to the locally computed result, which previously
    // made a real persistence bug (migration 011's jsonb_set path
    // limitation, fixed in migration 019) invisible to every player.
    if (!saved) {
      console.error(
        '[MISSION 03 VOICE ROUND] RPC succeeded but did not confirm the save for',
        round.id
      );

      await writeErrorAuditLog({
        actorId: user.id,
        actorRole: 'player',
        action: 'MISSION_VOICE_ROUND_SAVE_FAILED',
        targetType: 'mission',
        targetId: '3',
        description: `Mission 03 voice round ${round.id} was not confirmed as saved.`,
        error: new Error('RPC returned no matching saved round data.'),
        context: { round: round.id, progress },
      });

      return NextResponse.json(
        { message: 'Unable to save your answer.' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        roundKey: round.id,
        outcome: saved.outcome,
        points: saved.points,
        followUpCorrect: saved.followUpCorrect,
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    console.error('[MISSION 03 VOICE ROUND]', error);

    await writeErrorAuditLog({
      actorId: authedUserId,
      actorRole: authedUserId ? 'player' : null,
      action: 'MISSION_VOICE_ROUND_SAVE_FAILED',
      targetType: 'mission',
      targetId: '3',
      description: 'Unexpected error submitting a Mission 03 voice round.',
      error,
    });

    return NextResponse.json(
      { message: 'Unable to save your answer.' },
      { status: 500 }
    );
  }
}
