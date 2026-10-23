import { requireAdmin } from '@/lib/admin';
import HackerTransmission from '@/components/mission-three/HackerTransmission';

export const dynamic = 'force-dynamic';

export default async function MissionThreeAdminPreviewTransmissionPage() {
  await requireAdmin();

  return <HackerTransmission previewMode />;
}
