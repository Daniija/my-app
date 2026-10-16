import { requireAdmin } from '@/lib/admin';
import MissionTwoRoomOne from '@/components/mission-two/MissionTwoRoomOne';

export const dynamic =
  'force-dynamic';

export default async function MissionTwoAdminPreviewRoomOnePage() {
  const {
    profile,
  } = await requireAdmin();

  return (
    <MissionTwoRoomOne
      playerAlias={
        profile.alias ??
        'Administrator'
      }
      previewMode
    />
  );
}
