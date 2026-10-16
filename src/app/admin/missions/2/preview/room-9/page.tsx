import { requireAdmin } from '@/lib/admin';
import MissionTwoRoomNine from '@/components/mission-two/MissionTwoRoomNine';

export const dynamic =
  'force-dynamic';

export default async function MissionTwoAdminPreviewRoomNinePage() {
  const { profile } =
    await requireAdmin();

  return (
    <MissionTwoRoomNine
      playerAlias={
        profile.alias ?? 'Administrator'
      }
      previewMode
    />
  );
}
