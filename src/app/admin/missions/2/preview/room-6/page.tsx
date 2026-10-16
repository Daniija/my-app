import { requireAdmin } from '@/lib/admin';
import MissionTwoRoomSix from '@/components/mission-two/MissionTwoRoomSix';

export const dynamic =
  'force-dynamic';

export default async function MissionTwoAdminPreviewRoomSixPage() {
  const { profile } =
    await requireAdmin();

  return (
    <MissionTwoRoomSix
      playerAlias={
        profile.alias ?? 'Administrator'
      }
      previewMode
    />
  );
}
