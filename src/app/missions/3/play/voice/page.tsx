import ExecutiveVoiceConsole from '@/components/mission-three/ExecutiveVoiceConsole';
import { requireMissionThreeStage } from '@/lib/missions/mission-three-stage-page';
import {
  computeOrganizationRisk,
  extractStageOutcomes,
  type DecisionOutcome,
} from '@/lib/missions/mission-three-scoring';

export default async function MissionThreeVoicePage() {
  const { supabase, attempt } = await requireMissionThreeStage('voice');

  const { data: progressRow } = await supabase
    .from('mission_progress')
    .select('progress')
    .eq('attempt_id', attempt.id)
    .maybeSingle();

  const progress = (progressRow?.progress as Record<string, unknown>) ?? {};

  const voiceRounds =
    (progress.voice_rounds as
      | Record<string, { outcome: DecisionOutcome; points: number }>
      | undefined) ?? {};

  const riskPercent = computeOrganizationRisk(extractStageOutcomes(progress));

  return (
    <main className="min-h-screen bg-[#060205] px-4 py-8 text-white sm:px-6">
      <div className="mx-auto max-w-5xl">
        <ExecutiveVoiceConsole
          previewMode={false}
          initialCompletedRounds={voiceRounds}
          initialRiskPercent={riskPercent}
        />
      </div>
    </main>
  );
}
