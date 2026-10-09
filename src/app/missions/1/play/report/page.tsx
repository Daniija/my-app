import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import MissionOneReport from '@/components/mission-one/MissionOneReport';

export default async function ReportPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } =
    await supabase
      .from('profiles')
      .select('alias,role,is_active')
      .eq('id', user.id)
      .single();

  if (
    !profile ||
    !profile.is_active
  ) {
    redirect('/login');
  }

  if (profile.role === 'admin') {
    redirect('/admin');
  }

  const { data: containment } =
    await supabase
      .from('mission_containment')
      .select('id')
      .eq('player_id', user.id)
      .eq('mission_id', 1)
      .maybeSingle();

  if (!containment) {
    redirect(
      '/missions/1/play/containment'
    );
  }

  const { data: report } =
    await supabase
      .from('mission_breach_reports')
      .select(`
        evidence_score,
        theory_score,
        containment_score,
        bonus_score,
        total_score
      `)
      .eq('player_id', user.id)
      .eq('mission_id', 1)
      .maybeSingle();

  return (
    <MissionOneReport
      playerAlias={
        profile.alias ?? 'Agent'
      }
      initialReport={report}
    />
  );
}