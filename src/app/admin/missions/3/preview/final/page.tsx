import { requireAdmin } from '@/lib/admin';
import FinalChallenge from '@/components/mission-three/FinalChallenge';

export const dynamic = 'force-dynamic';

export default async function MissionThreeAdminPreviewFinalPage() {
  await requireAdmin();

  return (
    <main className="min-h-screen bg-[#060205] px-4 py-8 text-white sm:px-6">
      <div className="mx-auto max-w-5xl">
        <FinalChallenge previewMode riskPercent={50} />
      </div>
    </main>
  );
}
