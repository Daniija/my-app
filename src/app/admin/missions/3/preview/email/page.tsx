import { requireAdmin } from '@/lib/admin';
import EmailEvidence from '@/components/mission-three/EmailEvidence';

export const dynamic = 'force-dynamic';

export default async function MissionThreeAdminPreviewEmailPage() {
  await requireAdmin();

  return (
    <main className="min-h-screen bg-[#060205] px-4 py-8 text-white sm:px-6">
      <div className="mx-auto max-w-5xl">
        <EmailEvidence previewMode />
      </div>
    </main>
  );
}
