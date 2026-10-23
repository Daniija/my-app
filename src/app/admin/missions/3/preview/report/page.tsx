import { requireAdmin } from '@/lib/admin';
import MissionThreeReportPreviewClient from '@/components/mission-three/MissionThreeReportPreviewClient';

export const dynamic = 'force-dynamic';

export default async function MissionThreeAdminPreviewReportPage() {
  await requireAdmin();

  return (
    <main className="min-h-screen bg-[#060205] px-4 py-8 text-white sm:px-6">
      <div className="mx-auto max-w-4xl">
        <MissionThreeReportPreviewClient />
      </div>
    </main>
  );
}
