import MissionOneTheory from '@/components/mission-one/MissionOneTheory';
import { requireAdmin } from '@/lib/admin';

export const dynamic = 'force-dynamic';

export default async function MissionOneAdminPreviewTheoryPage() {
  const { profile } = await requireAdmin();

  return (
    <MissionOneTheory
      playerAlias={profile.alias ?? 'Administrator'}
      playerId={profile.id}
      initialTheory={null}
      previewMode
    />
  );
}
