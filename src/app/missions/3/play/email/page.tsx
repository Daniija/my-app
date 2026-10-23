import EmailEvidence from '@/components/mission-three/EmailEvidence';
import {
  requireMissionThreeStage,
} from '@/lib/missions/mission-three-stage-page';

export default async function MissionThreeEmailPage() {
  await requireMissionThreeStage('email');

  return (
    <main className="min-h-screen bg-[#060205] px-4 py-8 text-white sm:px-6">
      <div className="mx-auto max-w-5xl">
        <EmailEvidence previewMode={false} />
      </div>
    </main>
  );
}
