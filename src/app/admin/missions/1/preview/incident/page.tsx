import MissionOnePreviewIncident from '@/components/mission-one/MissionOnePreviewIncident';
import { requireAdmin } from '@/lib/admin';

export const dynamic = 'force-dynamic';

export default async function MissionOneAdminPreviewIncidentPage() {
  const { profile } = await requireAdmin();

  return (
    <MissionOnePreviewIncident
      playerAlias={profile.alias ?? 'Administrator'}
    />
  );
}
