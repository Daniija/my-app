import { requireMissionFourStage } from '@/lib/missions/mission-four-stage-page';
import MissionFourStageShell from '@/components/mission-four/MissionFourStageShell';

export default async function MissionFourDisarmPage() {
  const { supabase, attempt, timer } = await requireMissionFourStage('disarm');

  const { data: progressRow } = await supabase
    .from('mission_progress')
    .select('progress')
    .eq('attempt_id', attempt.id)
    .maybeSingle();

  const progress = (progressRow?.progress as Record<string, { points?: number }>) ?? {};

  const initialCompletedChallenges =
    (progress.disarm_challenges as unknown as Record<
      string,
      { points: number; outcome: string; timeDeltaSeconds?: number }
    >) ?? {};

  const priorStagesScore =
    (progress.triage?.points ?? 0) + (progress.trace?.points ?? 0) + (progress.contain?.points ?? 0);

  return (
    <MissionFourStageShell
      stage="disarm"
      previewMode={false}
      timerStartedAt={timer.startedAt}
      netAdjustmentSeconds={timer.netAdjustmentSeconds}
      initialCompletedChallenges={initialCompletedChallenges}
      priorStagesScore={priorStagesScore}
      seed={attempt.id}
    />
  );
}
