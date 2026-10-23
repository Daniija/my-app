import { NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';
import { writeErrorAuditLog } from '@/lib/audit';

import {
  FINAL_CHALLENGE_ITEMS,
  FINAL_DECISIONS,
  MISSION_THREE_STAGE_POINTS,
  clampStageScore,
} from '@/lib/missions/mission-three-scoring';

import {
  finalizeMissionThreeScore,
  type MissionThreeProgress,
} from '@/lib/missions/mission-three-finalize';

type FinalStageResult = {
  items: Record<
    string,
    { decision: string; outcome: string; points: number }
  >;
  outcome: 'correct' | 'partial' | 'incorrect';
  points: number;
};

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

    const { data: progressRow } = await supabase
      .from('mission_progress')
      .select('progress')
      .eq('attempt_id', attempt.id)
      .maybeSingle();

    const existingProgress =
      (progressRow?.progress as MissionThreeProgress | null) ?? {};

    // Already completed -- a retried/duplicate request. Return the
    // previously recorded result instead of re-scoring.
    if (attempt.status === 'submitted' || attempt.current_stage === 'report') {
      const savedFinal = existingProgress.final as
        | FinalStageResult
        | undefined;

      return NextResponse.json(
        {
          ok: true,
          outcome: savedFinal?.outcome ?? 'correct',
          points: savedFinal?.points ?? 0,
          nextStage: 'report',
        },
        { headers: { 'Cache-Control': 'no-store' } }
      );
    }

    if (attempt.status !== 'active' || attempt.current_stage !== 'final') {
      return NextResponse.json(
        {
          message: 'This stage is not currently active for your attempt.',
        },
        { status: 409 }
      );
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('alias')
      .eq('id', user.id)
      .single();

    const body = await request.json().catch(() => ({}));

    const submittedDecisions: Record<string, unknown> =
      body?.decisions && typeof body.decisions === 'object'
        ? body.decisions
        : {};

    // ----------------------------------
    // SCORE THE FINAL CHALLENGE
    // ----------------------------------

    const items: FinalStageResult['items'] = {};

    let correctCount = 0;
    let rawTotal = 0;

    for (const item of FINAL_CHALLENGE_ITEMS) {
      const decisionId = submittedDecisions[item.id];

      const option =
        typeof decisionId === 'string'
          ? FINAL_DECISIONS[decisionId]
          : undefined;

      // Anything missing or invalid defaults to the safe-but-
      // incomplete response, matching the auto-submit-on-timeout
      // behaviour in FinalChallenge.tsx.
      const resolved = option ?? FINAL_DECISIONS.ignore_and_escalate;

      items[item.id] = {
        decision: resolved.id,
        outcome: resolved.outcome,
        points: resolved.points,
      };

      rawTotal += resolved.points;

      if (resolved.outcome === 'correct') {
        correctCount++;
      }
    }

    const finalPoints = clampStageScore('final', rawTotal);

    const finalOutcome: FinalStageResult['outcome'] =
      correctCount === FINAL_CHALLENGE_ITEMS.length
        ? 'correct'
        : finalPoints >= MISSION_THREE_STAGE_POINTS.final / 2
          ? 'partial'
          : 'incorrect';

    const finalStageResult: FinalStageResult = {
      items,
      outcome: finalOutcome,
      points: finalPoints,
    };

    // ----------------------------------
    // FINALIZE THE MISSION SCORE FIRST.
    //
    // If this throws, the attempt below is never advanced, so the
    // player stays at the "final" stage and can safely retry rather
    // than being stuck "submitted" with no recorded score.
    // ----------------------------------

    try {
      await finalizeMissionThreeScore({
        playerId: user.id,
        playerAlias: profile?.alias ?? null,
        attemptId: attempt.id,
        progress: { ...existingProgress, final: finalStageResult },
      });
    } catch (finalizeError) {
      console.error(
        '[MISSION 03 FINAL SUBMIT] Finalize failed:',
        finalizeError
      );

      await writeErrorAuditLog({
        actorId: user.id,
        actorRole: 'player',
        action: 'MISSION_COMPLETE_FAILED',
        targetType: 'mission',
        targetId: '3',
        description: 'Unable to finalize the Mission 03 score.',
        error: finalizeError,
        context: { stage: 'finalize' },
      });

      return NextResponse.json(
        { message: 'Unable to save your mission score.' },
        { status: 500 }
      );
    }

    // ----------------------------------
    // ADVANCE THE ATTEMPT
    // ----------------------------------

    const { error: rpcError } = await supabase.rpc(
      'advance_mission_three_stage',
      {
        p_attempt_id: attempt.id,
        p_from_stage: 'final',
        p_to_stage: 'report',
        p_to_status: 'submitted',
        p_stage_key: 'final',
        p_stage_result: finalStageResult,
      }
    );

    if (rpcError) {
      console.error(
        '[MISSION 03 FINAL SUBMIT] advance_mission_three_stage failed:',
        rpcError
      );

      await writeErrorAuditLog({
        actorId: user.id,
        actorRole: 'player',
        action: 'MISSION_STAGE_SUBMIT_FAILED',
        targetType: 'mission',
        targetId: '3',
        description:
          'Mission 03 score was saved, but the attempt could not be marked complete.',
        error: rpcError,
        context: { stage: 'final' },
      });

      return NextResponse.json(
        {
          message:
            'Your score was saved, but the mission status could not be updated.',
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        outcome: finalStageResult.outcome,
        points: finalStageResult.points,
        nextStage: 'report',
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    console.error('[MISSION 03 FINAL SUBMIT]', error);

    await writeErrorAuditLog({
      actorId: authedUserId,
      actorRole: authedUserId ? 'player' : null,
      action: 'MISSION_STAGE_SUBMIT_FAILED',
      targetType: 'mission',
      targetId: '3',
      description: 'Unexpected error submitting Mission 03 final stage.',
      error,
      context: { stage: 'final' },
    });

    return NextResponse.json(
      { message: 'Unable to save your decisions.' },
      { status: 500 }
    );
  }
}
