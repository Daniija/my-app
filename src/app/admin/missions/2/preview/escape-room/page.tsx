import MissionTwoCommandCentre from '@/components/mission-two/MissionTwoCommandCentre';
import { requireAdmin } from '@/lib/admin';

export const dynamic =
  'force-dynamic';

export default async function MissionTwoAdminPreviewEscapeRoomPage() {
  const {
    profile,
  } = await requireAdmin();

  return (
    <MissionTwoCommandCentre
      playerAlias={
        profile.alias ??
        'Administrator'
      }
      currentStage="map"
      previewMode
    />
  );
}