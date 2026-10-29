import MissionFourBriefing from '@/components/mission-four/MissionFourBriefing';
import { requireAdmin } from '@/lib/admin';

export const dynamic = 'force-dynamic';

// Replaces the previous MissionPreviewComingSoon placeholder now that
// Mission 04's infrastructure exists. Mirrors
// src/app/admin/missions/3/preview/page.tsx exactly.
export default async function MissionFourAdminPreviewPage() {
  await requireAdmin();

  return <MissionFourBriefing initialAttempt={null} previewMode />;
}
