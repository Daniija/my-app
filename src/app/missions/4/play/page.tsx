import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import MissionFourBriefing from '@/components/mission-four/MissionFourBriefing';

// Mirrors src/app/missions/3/play/page.tsx exactly (mission_id=4):
// auth -> profile -> onboarding/workgroup checks -> load existing
// attempt -> redirect to the report if already finished -> render
// the briefing (which itself handles create/resume).
export default async function MissionFourPlayPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, alias, role, is_active, onboarding_complete, work_location_type')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    console.error('[MISSION 04 PLAY] Unable to load profile:', profileError);
    redirect('/login');
  }

  if (!profile.is_active) {
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

  const { data: attempt, error: attemptError } = await supabase
    .from('mission_attempts')
    .select('id, status, current_stage, started_at, completed_at')
    .eq('player_id', user.id)
    .eq('mission_id', 4)
    .maybeSingle();

  if (attemptError) {
    console.error('[MISSION 04 PLAY] Unable to load attempt:', attemptError);
  }

  if (attempt?.status === 'submitted' || attempt?.current_stage === 'report') {
    redirect('/missions/4/play/report');
  }

  return <MissionFourBriefing initialAttempt={attempt ?? null} />;
}
