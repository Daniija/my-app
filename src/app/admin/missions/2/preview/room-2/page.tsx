import { requireAdmin } from '@/lib/admin';
import MissionTwoRoomTwo from '@/components/mission-two/MissionTwoRoomTwo';

export const dynamic =
  'force-dynamic';

export default async function MissionTwoAdminPreviewRoomTwoPage() {
  const { profile } =
    await requireAdmin();

  return (
    <MissionTwoRoomTwo
      playerAlias={
        profile.alias ?? 'Administrator'
      }
      previewMode
    />
  );
}
