import { NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';
import { writeErrorAuditLog } from '@/lib/audit';

import {
  EXECUTIVE_VOICE_ROUNDS,
  clampStageScore,
  deriveExecutiveVoiceOutcome,
} from '@/lib/missions/mission-three-scoring';

type VoiceStageResult = {
  rounds: Record<string, unknown>;
  outcome: 'correct' | 'partial' | 'incorrect';
  points: number;
};

const REQUIRED_ROUND_KEYS = [
  ...EXECUTIVE_VOICE_ROUNDS.map((round) => round.id),
  'final_challenge',
];

// Finalizes the whole Executive Voice Verification section once
// every round + the final challenge have been individually saved (see
// voice/round/submit and voice/final-challenge/submit). This is the
// one call that actually advances current_stage, via the same
// advance_mission_three_stage() RPC every other Mission 03 stage
// uses -- voice -> email, unchanged from before this section existed.
export async function POST() {
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

    const { data: progressRow } = await supabase
      .from('mission_progress')
      .select('progress')
      .eq('attempt_id', attempt.id)
      .maybeSingle();

    const existingProgress =
      (progressRow?.progress as Record<string, unknown> | null) ?? {};

    // Already finalized -- a retried/duplicate request. Return the
    // previously recorded result instead of re-scoring.
    if (attempt.status === 'active' && attempt.current_stage !== 'voice') {
      const savedVoice = existingProgress.voice as
        | VoiceStageResult
        | undefined;

      return NextResponse.json(
        {
          ok: true,
          outcome: savedVoice?.outcome ?? 'correct',
          points: savedVoice?.points ?? 0,
          nextStage: 'email',
        },
        { headers: { 'Cache-Control': 'no-store' } }
      );
    }

    if (attempt.status !== 'active' || attempt.current_stage !== 'voice') {
      return NextResponse.json(
        {
          message: 'This stage is not currently active for your attempt.',
        },
        { status: 409 }
      );
    }

    const voiceRounds =
      (existingProgress.voice_rounds as
        | Record<string, { points?: number }>
        | undefined) ?? {};

    const missing = REQUIRED_ROUND_KEYS.filter((key) => !voiceRounds[key]);

    if (missing.length > 0) {
      return NextResponse.json(
        { message: 'Complete every round before continuing.', missing },
        { status: 400 }
      );
    }

    const rawTotal = REQUIRED_ROUND_KEYS.reduce(
      (sum, key) => sum + (voiceRounds[key]?.points ?? 0),
      0
    );

    const points = clampStageScore('voice', rawTotal);
    const outcome = deriveExecutiveVoiceOutcome(points);

    const voiceStageResult: VoiceStageResult = {
      rounds: voiceRounds,
      outcome,
      points,
    };

    const { error: rpcError } = await supabase.rpc(
      'advance_mission_three_stage',
      {
        p_attempt_id: attempt.id,
        p_from_stage: 'voice',
        p_to_stage: 'email',
        p_to_status: 'active',
        p_stage_key: 'voice',
        p_stage_result: voiceStageResult,
      }
    );

    if (rpcError) {
      console.error(
        '[MISSION 03 VOICE SUBMIT] advance_mission_three_stage failed:',
        rpcError
      );

      await writeErrorAuditLog({
        actorId: user.id,
        actorRole: 'player',
        action: 'MISSION_STAGE_SUBMIT_FAILED',
        targetType: 'mission',
        targetId: '3',
        description: 'Unable to advance Mission 03 voice stage.',
        error: rpcError,
        context: { stage: 'voice' },
      });

      return NextResponse.json(
        { message: 'Unable to save your decision.' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { ok: true, outcome, points, nextStage: 'email' },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    console.error('[MISSION 03 VOICE SUBMIT]', error);

    await writeErrorAuditLog({
      actorId: authedUserId,
      actorRole: authedUserId ? 'player' : null,
      action: 'MISSION_STAGE_SUBMIT_FAILED',
      targetType: 'mission',
      targetId: '3',
      description: 'Unexpected error finalizing the Mission 03 voice stage.',
      error,
      context: { stage: 'voice' },
    });

    return NextResponse.json(
      { message: 'Unable to save your decision.' },
      { status: 500 }
    );
  }
}
