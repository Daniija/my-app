import MissionOneBriefing from '@/components/mission-one/MissionOneBriefing';
import { requireAdmin } from '@/lib/admin';

export const dynamic = 'force-dynamic';

export default async function MissionOneAdminPreviewPage() {
  const { profile } = await requireAdmin();

  return (
    <MissionOneBriefing
      initialAttempt={null}
      playerAlias={profile.alias ?? 'Administrator'}
      previewMode
    />
  );
}
