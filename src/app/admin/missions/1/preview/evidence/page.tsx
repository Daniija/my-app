import MissionOneEvidenceRoom from '@/components/mission-one/MissionOneEvidenceRoom';
import { requireAdmin } from '@/lib/admin';

export const dynamic = 'force-dynamic';

export default async function MissionOneAdminPreviewEvidencePage() {
  const { profile } = await requireAdmin();

  return (
    <MissionOneEvidenceRoom
      playerAlias={profile.alias ?? 'Administrator'}
      playerId={profile.id}
      initialReviews={[]}
      previewMode
    />
  );
}
