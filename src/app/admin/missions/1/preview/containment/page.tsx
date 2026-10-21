import MissionOneContainment from '@/components/mission-one/MissionOneContainment';
import { requireAdmin } from '@/lib/admin';

export const dynamic = 'force-dynamic';

export default async function MissionOneAdminPreviewContainmentPage() {
  const { profile } = await requireAdmin();

  return (
    <MissionOneContainment
      playerAlias={profile.alias ?? 'Administrator'}
      playerId={profile.id}
      initialContainment={null}
      previewMode
    />
  );
}
