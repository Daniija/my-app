import { requireAdmin } from '@/lib/admin';
import MissionTwoRoomEight from '@/components/mission-two/MissionTwoRoomEight';

export const dynamic =
  'force-dynamic';

export default async function MissionTwoAdminPreviewRoomEightPage() {
  const { profile } =
    await requireAdmin();

  return (
    <MissionTwoRoomEight
      playerAlias={
        profile.alias ?? 'Administrator'
      }
      previewMode
    />
  );
}
