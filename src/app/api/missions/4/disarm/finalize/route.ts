import { NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';
import { getStageCompletion, submitMissionFourStage } from '@/lib/missions/mission-four-submit';
import { getMissionFourStage } from '@/lib/missions/mission-four-data';
import { finalizeMissionFourScore } from '@/lib/missions/mission-four-finalize';
import {
  clampStageScore,
  computeRemainingSeconds,
  MISSION_COMPLETION_TIME_BONUS_PER_SECOND,
  MISSION_FOUR_STAGE_ORDER,
} from '@/lib/missions/mission-four-scoring';

// Finalizes DISARM -- the last stage. Unlike the other three
// finalize routes, this one also closes out the whole mission:
// advances current_stage: disarm -> report (status: submitted),
// adds a remaining-time completion bonus, sums every stage's points,
// and calls finalizeMissionFourScore() to write mission_scores and
// update leaderboard_entries, mirroring how Mission 03's
// voice/submit/route.ts finalizes its own stage machine and how
// finalizeMissionThreeScore() is invoked at that mission's true end.
export async function POST() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { code: 'AUTH_REQUIRED', message: 'You must be signed in.' },
      { status: 401 }
    );
  }

  const { data: attempt } = await supabase
    .from('mission_attempts')
    .select('id, status, current_stage')
    .eq('player_id', user.id)
    .eq('mission_id', 4)
    .maybeSingle();

  if (!attempt) {
    return NextResponse.json({ message: 'Mission attempt not found.' }, { status: 404 });
  }

  // Already finalized -- a retried/duplicate request. Return the
  // previously recorded result instead of re-scoring.
  if (attempt.status === 'submitted' || attempt.current_stage === 'report') {
    const { data: progressRow } = await supabase
      .from('mission_progress')
      .select('progress')
      .eq('attempt_id', attempt.id)
      .maybeSingle();

    const progress = (progressRow?.progress as Record<string, unknown>) ?? {};
    const report = progress.report as { outcome?: string } | undefined;

    const { data: scoreRow } = await supabase
      .from('mission_scores')
      .select('total_score')
      .eq('player_id', user.id)
      .eq('mission_id', 4)
      .maybeSingle();

    return NextResponse.json(
      {
        ok: true,
        outcome: report?.outcome === 'failed' ? 'failed' : 'success',
        points: scoreRow?.total_score ?? 0,
        nextStage: 'report',
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  }

  const completion = await getStageCompletion(supabase, attempt.id, 'disarm');

  if (!completion.complete) {
    return NextResponse.json(
      { message: 'Complete every challenge before continuing.', missing: completion.missing },
      { status: 400 }
    );
  }

  const stageDefinition = getMissionFourStage('disarm');

  const { data: progressRow } = await supabase
    .from('mission_progress')
    .select('progress')
    .eq('attempt_id', attempt.id)
    .maybeSingle();

  const progress = (progressRow?.progress as Record<string, unknown>) ?? {};
  const timer = (progress.timer as { startedAt?: string; netAdjustmentSeconds?: number }) ?? {};

  const remainingSeconds = timer.startedAt
    ? computeRemainingSeconds({
        startedAtMs: new Date(timer.startedAt).getTime(),
        netAdjustmentSeconds: timer.netAdjustmentSeconds ?? 0,
        nowMs: Date.now(),
      })
    : 0;

  const missionCompletionBonus = remainingSeconds * MISSION_COMPLETION_TIME_BONUS_PER_SECOND;

  // Keep this stage's own points within its own 800-point budget --
  // the mission-wide "finished with time to spare" bonus below is a
  // separate reward, not part of DISARM's own challenge score, and
  // folding it directly into `points` here is what made the report's
  // Stage Breakdown show e.g. "886 / 800" for DISARM. The bonus still
  // counts toward the player's total via rawTotal below, just under
  // its own key instead of inflating this stage's number past its cap.
  const disarmPoints = clampStageScore(
    'disarm',
    completion.totalPoints + stageDefinition.completionBonus
  );

  const submitResponse = await submitMissionFourStage({
    fromStage: 'disarm',
    toStage: 'report',
    toStatus: 'submitted',
    buildResult: () => ({
      outcome: 'correct',
      points: disarmPoints,
      completed: true,
      remainingSecondsAtCompletion: remainingSeconds,
      missionCompletionBonus,
    }),
  });

  const submitData = await submitResponse.clone().json().catch(() => ({}));

  if (!submitResponse.ok || submitData.failed) {
    // Either the advance failed outright, or advance_mission_four_stage
    // itself detected the timer had already expired and forced a
    // FAILED finalize instead -- either way, skip success scoring.
    return submitResponse;
  }

  const { data: finalProgressRow } = await supabase
    .from('mission_progress')
    .select('progress')
    .eq('attempt_id', attempt.id)
    .maybeSingle();

  const finalProgress =
    (finalProgressRow?.progress as Record<
      string,
      { points?: number; missionCompletionBonus?: number }
    >) ?? {};

  const rawTotal =
    MISSION_FOUR_STAGE_ORDER.reduce(
      (sum, stage) => sum + (finalProgress[stage]?.points ?? 0),
      0
    ) + (finalProgress.disarm?.missionCompletionBonus ?? 0);

  const { data: profile } = await supabase
    .from('profiles')
    .select('alias')
    .eq('id', user.id)
    .single();

  try {
    await finalizeMissionFourScore({
      playerId: user.id,
      playerAlias: profile?.alias ?? null,
      attemptId: attempt.id,
      rawTotal,
    });
  } catch (error) {
    console.error('[MISSION 04 DISARM FINALIZE] Score finalize failed:', error);
    // The stage already advanced successfully -- surface the submit
    // response regardless so the player isn't stuck, but log loudly
    // so a failed leaderboard write doesn't go unnoticed.
  }

  return submitResponse;
}
