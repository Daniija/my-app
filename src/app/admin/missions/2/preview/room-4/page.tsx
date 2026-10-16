import { requireAdmin } from '@/lib/admin';
import MissionTwoRoomFour from '@/components/mission-two/MissionTwoRoomFour';

export const dynamic =
  'force-dynamic';

export default async function MissionTwoAdminPreviewRoomFourPage() {
  const { profile } =
    await requireAdmin();

  return (
    <MissionTwoRoomFour
      playerAlias={
        profile.alias ?? 'Administrator'
      }
      previewMode
    />
  );
}
