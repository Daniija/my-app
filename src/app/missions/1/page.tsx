import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import MissionOneBriefing from '@/components/mission-one/MissionOneBriefing';

export default async function MissionOnePlayPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile, error: profileError } =
    await supabase
      .from('profiles')
      .select(`
        id,
        alias,
        role,
        is_active,
        onboarding_complete,
        work_location_type
      `)
      .eq('id', user.id)
      .single();

  if (
    profileError ||
    !profile ||
    !profile.is_active
  ) {
    redirect('/login');
  }

  if (profile.role === 'admin') {
    redirect('/admin');
  }

  if (!profile.onboarding_complete) {
    redirect('/onboarding');
  }

  if (!profile.work_location_type) {
    redirect('/select-workgroup');
  }

  const { data: attempt } =
    await supabase
      .from('mission_attempts')
      .select(`
        id,
        status,
        current_stage,
        started_at,
        completed_at
      `)
      .eq('player_id', user.id)
      .eq('mission_id', 1)
      .maybeSingle();

  return (
    <MissionOneBriefing
      initialAttempt={attempt}
      playerAlias={profile.alias ?? 'Agent'}
    />
  );
}