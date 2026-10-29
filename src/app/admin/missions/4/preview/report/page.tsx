import { Suspense } from 'react';

import { requireAdmin } from '@/lib/admin';
import MissionFourReportPreviewClient from '@/components/mission-four/MissionFourReportPreviewClient';

export const dynamic = 'force-dynamic';

export default async function MissionFourPreviewReportPage() {
  await requireAdmin();

  return (
    <main className="min-h-screen bg-[#02050a] px-4 py-8 text-white sm:px-6">
      <div className="mx-auto max-w-4xl">
        <Suspense fallback={null}>
          <MissionFourReportPreviewClient />
        </Suspense>
      </div>
    </main>
  );
}
