import { requireAdmin } from '@/lib/admin';
import VerificationChecklist from '@/components/mission-three/VerificationChecklist';

export const dynamic = 'force-dynamic';

export default async function MissionThreeAdminPreviewVerificationPage() {
  await requireAdmin();

  return (
    <main className="min-h-screen bg-[#060205] px-4 py-8 text-white sm:px-6">
      <div className="mx-auto max-w-5xl">
        <VerificationChecklist previewMode riskPercent={50} />
      </div>
    </main>
  );
}
