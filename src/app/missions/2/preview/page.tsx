import { requireAdmin } from '@/lib/admin';
import MissionTwoBriefing from '@/components/mission-two/MissionTwoBriefing';

export default async function MissionTwoAdminPreviewPage() {
  const { profile } =
    await requireAdmin();

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