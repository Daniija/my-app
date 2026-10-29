import { NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';
import { writeErrorAuditLog } from '@/lib/audit';
import { getMissionFourStage } from './mission-four-data';
import type { MissionFourStageName } from './mission-four-scoring';

// Checks whether every challenge in a stage has a saved result in
// mission_progress.progress.<stage>_challenges -- the completeness
// gate a stage's finalize route checks before advancing current_stage,
// mirroring how voice/submit/route.ts checks every Mission 03 voice
// round + the final challenge exist before finalizing that section.
export async function getStageCompletion(
  supabase: Awaited<ReturnType<typeof createClient>>,
  attemptId: string,
  stage: MissionFourStageName
): Promise<{ complete: boolean; missing: string[]; totalPoints: number; totalTimeDelta: number }> {
  const { data: progressRow } = await supabase
    .from('mission_progress')
    .select('progress')
    .eq('attempt_id', attemptId)
    .maybeSingle();

  const progress = (progressRow?.progress as Record<string, unknown>) ?? {};
  const savedChallenges =
    (progress[`${stage}_challenges`] as Record<
      string,
      { points?: number; timeDeltaSeconds?: number }
    >) ?? {};

  const requiredIds = getMissionFourStage(stage).challenges.map((c) => c.id);
  const missing = requiredIds.filter((id) => !savedChallenges[id]);

  const totalPoints = requiredIds.reduce(
    (sum, id) => sum + (savedChallenges[id]?.points ?? 0),
    0
  );

  const totalTimeDelta = requiredIds.reduce(
    (sum, id) => sum + (savedChallenges[id]?.timeDeltaSeconds ?? 0),
    0
  );

  return { complete: missing.length === 0, missing, totalPoints, totalTimeDelta };
}

export type MissionFourStageResult = {
  outcome: 'correct' | 'partial' | 'incorrect';
  points: number;
  [key: string]: unknown;
};

type BuildResultOutcome = MissionFourStageResult | { error: string };

// Shared submit mechanics for every Mission 04 stage-advance route:
// auth, load the attempt, confirm it's actually at the expected
// stage, then hand off to advance_mission_four_stage() (migration
// 020) to persist the result and advance current_stage. Mirrors
// submitMissionThreeStage() in mission-three-submit.ts, including
// its idempotency escape hatch: if the attempt has already moved
// past fromStage (a duplicate/raced request), this returns the
// already-saved result instead of a dead-end error, so a player can
// never get stuck on a stage's screen because of a retried request.
export async function submitMissionFourStage({
  fromStage,
  toStage,
  toStatus,
  buildResult,
}: {
  fromStage: string;
  toStage: string;
  toStatus: 'active' | 'submitted';
  buildResult: () => BuildResultOutcome;
}) {
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

    const outcome = buildResult();

    if ('error' in outcome) {
      return NextResponse.json({ message: outcome.error }, { status: 400 });
    }

    const { data: attempt, error: attemptError } = await supabase
      .from('mission_attempts')
      .select('id, status, current_stage')
      .eq('player_id', user.id)
      .eq('mission_id', 4)
      .maybeSingle();

    if (attemptError || !attempt) {
      console.error('[MISSION 04 SUBMIT] Attempt lookup failed:', attemptError);

      return NextResponse.json(
        { message: 'Mission attempt not found.' },
        { status: 404 }
      );
    }

    if (attempt.status !== 'active' || attempt.current_stage !== fromStage) {
      return NextResponse.json(
        { message: 'This stage is not currently active for your attempt.' },
        { status: 409 }
      );
    }

    const { data: progress, error: rpcError } = await supabase.rpc(
      'advance_mission_four_stage',
      {
        p_attempt_id: attempt.id,
        p_from_stage: fromStage,
        p_to_stage: toStage,
        p_to_status: toStatus,
        p_stage_key: fromStage,
        p_stage_result: outcome,
      }
    );

    if (rpcError) {
      console.error('[MISSION 04 SUBMIT] advance_mission_four_stage failed:', rpcError);

      await writeErrorAuditLog({
        actorId: user.id,
        actorRole: 'player',
        action: 'MISSION_STAGE_SUBMIT_FAILED',
        targetType: 'mission',
        targetId: '4',
        description: `Unable to advance Mission 04 ${fromStage} stage.`,
        error: rpcError,
        context: { stage: fromStage },
      });

      return NextResponse.json(
        { message: 'Unable to save your decision.' },
        { status: 500 }
      );
    }

    const saved =
      (progress as Record<string, MissionFourStageResult> | null)?.[fromStage] ??
      outcome;

    const report = (progress as Record<string, unknown> | null)?.report as
      | { outcome?: string }
      | undefined;

    // The RPC can have unilaterally redirected this call to the
    // failed-finalize branch (timer expired mid-request) regardless
    // of what toStage was asked for -- reflect that honestly rather
    // than claiming the originally-requested stage succeeded.
    const actualNextStage = report ? 'report' : toStage;

    return NextResponse.json(
      {
        ok: true,
        outcome: saved.outcome,
        points: saved.points,
        nextStage: actualNextStage,
        failed: report?.outcome === 'failed',
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    console.error('[MISSION 04 SUBMIT]', error);

    await writeErrorAuditLog({
      actorId: authedUserId,
      actorRole: authedUserId ? 'player' : null,
      action: 'MISSION_STAGE_SUBMIT_FAILED',
      targetType: 'mission',
      targetId: '4',
      description: `Unexpected error submitting Mission 04 ${fromStage} stage.`,
      error,
      context: { stage: fromStage },
    });

    return NextResponse.json(
      { message: 'Unable to save your decision.' },
      { status: 500 }
    );
  }
}
