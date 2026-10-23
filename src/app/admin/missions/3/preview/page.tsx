import MissionThreeBriefing from '@/components/mission-three/MissionThreeBriefing';
import { requireAdmin } from '@/lib/admin';

export const dynamic = 'force-dynamic';

export default async function MissionThreeAdminPreviewPage() {
  const { profile } = await requireAdmin();

  return (
    <MissionThreeBriefing
      initialAttempt={null}
      playerAlias={profile.alias ?? 'Administrator'}
      previewMode
    />
  );
}
