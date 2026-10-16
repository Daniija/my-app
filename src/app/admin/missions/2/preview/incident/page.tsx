import MissionTwoPreviewIncident from '@/components/mission-two/MissionTwoPreviewIncident';
import { requireAdmin } from '@/lib/admin';

export const dynamic =
  'force-dynamic';

export default async function MissionTwoAdminPreviewIncidentPage() {
  const {
    profile,
  } = await requireAdmin();

  return (
    <MissionTwoPreviewIncident
      playerAlias={
        profile.alias ??
        'Administrator'
      }
    />
  );
}