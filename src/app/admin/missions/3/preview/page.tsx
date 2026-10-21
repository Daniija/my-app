import MissionPreviewComingSoon from '@/components/admin/MissionPreviewComingSoon';
import { requireAdmin } from '@/lib/admin';

export const dynamic = 'force-dynamic';

export default async function MissionThreeAdminPreviewPage() {
  const { supabase, profile } = await requireAdmin();

  const { data: mission } = await supabase
    .from('missions')
    .select('sequence,title')
    .eq('id', 3)
    .single();

  return (
    <MissionPreviewComingSoon
      playerAlias={profile.alias ?? 'Administrator'}
      missionSequence={mission?.sequence ?? 3}
      missionTitle={mission?.title ?? 'Trust No One'}
    />
  );
}
