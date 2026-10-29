import { requireAdmin } from '@/lib/admin';
import MissionFourPreviewStageWrapper from '@/components/mission-four/admin/MissionFourPreviewStageWrapper';

export const dynamic = 'force-dynamic';

export default async function MissionFourPreviewTriagePage() {
  await requireAdmin();

  return (
    <MissionFourPreviewStageWrapper
      stage="triage"
      devControlsEnabled={process.env.NODE_ENV !== 'production'}
    />
  );
}
