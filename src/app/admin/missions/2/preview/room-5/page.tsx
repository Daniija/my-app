import { requireAdmin } from '@/lib/admin';
import MissionTwoRoomFive from '@/components/mission-two/MissionTwoRoomFive';

export const dynamic =
  'force-dynamic';

export default async function MissionTwoAdminPreviewRoomFivePage() {
  const { profile } =
    await requireAdmin();

  return (
    <MissionTwoRoomFive
      playerAlias={
        profile.alias ?? 'Administrator'
      }
      previewMode
    />
  );
}
