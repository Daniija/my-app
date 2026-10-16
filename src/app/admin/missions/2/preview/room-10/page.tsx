import { requireAdmin } from '@/lib/admin';
import MissionTwoRoomTen from '@/components/mission-two/MissionTwoRoomTen';

export const dynamic =
  'force-dynamic';

export default async function MissionTwoAdminPreviewRoomTenPage() {
  const { profile } =
    await requireAdmin();

  return (
    <MissionTwoRoomTen
      playerAlias={
        profile.alias ?? 'Administrator'
      }
      previewMode
    />
  );
}
