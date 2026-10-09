import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import MissionOneContainment from '@/components/mission-one/MissionOneContainment';

export default async function ContainmentPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id,alias,role,is_active')
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

  const { data: theory } = await supabase
    .from('mission_theories')
    .select('id')
    .eq('player_id', user.id)
    .eq('mission_id', 1)
    .maybeSingle();

  if (!theory) {
    redirect('/missions/1/play/theory');
  }

  const { data: containment } =
    await supabase
      .from('mission_containment')
      .select(`
        actions,
        explanation
      `)
      .eq('player_id', user.id)
      .eq('mission_id', 1)
      .maybeSingle();

  return (
    <MissionOneContainment
      playerId={user.id}
      playerAlias={
        profile.alias ?? 'Agent'
      }
      initialContainment={containment}
    />
  );
}