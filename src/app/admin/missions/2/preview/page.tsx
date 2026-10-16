import MissionTwoBriefing from '@/components/mission-two/MissionTwoBriefing';
import { requireAdmin } from '@/lib/admin';

export const dynamic =
  'force-dynamic';

export default async function MissionTwoAdminPreviewPage() {
  const {
    profile,
  } = await requireAdmin();

  return (
    <MissionTwoBriefing
      initialAttempt={null}
      playerAlias={
        profile.alias ??
        'Administrator'
      }
      previewMode
    />
  );
}