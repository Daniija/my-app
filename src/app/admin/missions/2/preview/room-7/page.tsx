import { requireAdmin } from '@/lib/admin';
import MissionTwoRoomSeven from '@/components/mission-two/MissionTwoRoomSeven';

export const dynamic =
  'force-dynamic';

export default async function MissionTwoAdminPreviewRoomSevenPage() {
  const { profile } =
    await requireAdmin();

  return (
    <MissionTwoRoomSeven
      playerAlias={
        profile.alias ?? 'Administrator'
      }
      previewMode
    />
  );
}
