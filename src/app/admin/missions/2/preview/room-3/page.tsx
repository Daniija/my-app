import { requireAdmin } from '@/lib/admin';
import MissionTwoRoomThree from '@/components/mission-two/MissionTwoRoomThree';

export const dynamic =
  'force-dynamic';

export default async function MissionTwoAdminPreviewRoomThreePage() {
  const { profile } =
    await requireAdmin();

  return (
    <MissionTwoRoomThree
      playerAlias={
        profile.alias ?? 'Administrator'
      }
      previewMode
    />
  );
}
