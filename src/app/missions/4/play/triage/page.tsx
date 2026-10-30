import { requireMissionFourStage } from '@/lib/missions/mission-four-stage-page';
import MissionFourStageShell from '@/components/mission-four/MissionFourStageShell';

export default async function MissionFourTriagePage() {
  const { supabase, attempt, timer } = await requireMissionFourStage('triage');

  const { data: progressRow } = await supabase
    .from('mission_progress')
    .select('progress')
    .eq('attempt_id', attempt.id)
    .maybeSingle();

  const progress = (progressRow?.progress as Record<string, unknown>) ?? {};

  const initialCompletedChallenges =
    (progress.triage_challenges as Record<
      string,
      { points: number; outcome: string; timeDeltaSeconds?: number }
    >) ?? {};

  // No earlier stages exist before TRIAGE, so prior score is always 0.
  const priorStagesScore = 0;

  return (
    <MissionFourStageShell
      stage="triage"
      previewMode={false}
      timerStartedAt={timer.startedAt}
      netAdjustmentSeconds={timer.netAdjustmentSeconds}
      initialCompletedChallenges={initialCompletedChallenges}
      priorStagesScore={priorStagesScore}
      seed={attempt.id}
    />
  );
}
