import { requireAdmin } from '@/lib/admin';
import MissionFourPreviewStageWrapper from '@/components/mission-four/admin/MissionFourPreviewStageWrapper';

export const dynamic = 'force-dynamic';

export default async function MissionFourPreviewTracePage() {
  await requireAdmin();

  return (
    <MissionFourPreviewStageWrapper
      stage="trace"
      devControlsEnabled={process.env.NODE_ENV !== 'production'}
    />
  );
}
