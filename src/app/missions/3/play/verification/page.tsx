import VerificationChecklist from '@/components/mission-three/VerificationChecklist';
import {
  requireMissionThreeStage,
} from '@/lib/missions/mission-three-stage-page';
import {
  computeOrganizationRisk,
  extractStageOutcomes,
} from '@/lib/missions/mission-three-scoring';

export default async function MissionThreeVerificationPage() {
  const { supabase, attempt } = await requireMissionThreeStage(
    'verification'
  );

  const { data: progressRow } = await supabase
    .from('mission_progress')
    .select('progress')
    .eq('attempt_id', attempt.id)
    .maybeSingle();

  const riskPercent = computeOrganizationRisk(
    extractStageOutcomes(progressRow?.progress ?? null)
  );

  return (
    <main className="min-h-screen bg-[#060205] px-4 py-8 text-white sm:px-6">
      <div className="mx-auto max-w-5xl">
        <VerificationChecklist previewMode={false} riskPercent={riskPercent} />
      </div>
    </main>
  );
}
