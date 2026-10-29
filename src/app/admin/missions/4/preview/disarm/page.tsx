import { requireAdmin } from '@/lib/admin';
import MissionFourPreviewStageWrapper from '@/components/mission-four/admin/MissionFourPreviewStageWrapper';

export const dynamic = 'force-dynamic';

export default async function MissionFourPreviewDisarmPage() {
  await requireAdmin();

  return (
    <MissionFourPreviewStageWrapper
      stage="disarm"
      devControlsEnabled={process.env.NODE_ENV !== 'production'}
    />
  );
}
