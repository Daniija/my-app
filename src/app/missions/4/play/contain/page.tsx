import { requireMissionFourStage } from '@/lib/missions/mission-four-stage-page';
import MissionFourStageShell from '@/components/mission-four/MissionFourStageShell';

export default async function MissionFourContainPage() {
  const { supabase, attempt, timer } = await requireMissionFourStage('contain');

  const { data: progressRow } = await supabase
    .from('mission_progress')
    .select('progress')
    .eq('attempt_id', attempt.id)
    .maybeSingle();

  const progress = (progressRow?.progress as Record<string, { points?: number }>) ?? {};

  const initialCompletedChallenges =
    (progress.contain_challenges as unknown as Record<
      string,
      { points: number; outcome: string; timeDeltaSeconds?: number }
    >) ?? {};

  const priorStagesScore = (progress.triage?.points ?? 0) + (progress.trace?.points ?? 0);

  return (
    <MissionFourStageShell
      stage="contain"
      previewMode={false}
      timerStartedAt={timer.startedAt}
      netAdjustmentSeconds={timer.netAdjustmentSeconds}
      initialCompletedChallenges={initialCompletedChallenges}
      priorStagesScore={priorStagesScore}
    />
  );
}
