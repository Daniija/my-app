import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import MissionOneBriefing from '@/components/mission-one/MissionOneBriefing';

export default async function MissionOnePlayPage() {
  const supabase = await createClient();

  // ----------------------------------
  // AUTHENTICATION
  // ----------------------------------

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // ----------------------------------
  // PLAYER PROFILE
  // ----------------------------------

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

  if (profileError || !profile) {
    console.error(
      '[MISSION 01 PLAY] Unable to load profile:',
      profileError
    );

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

  // ----------------------------------
  // LOAD EXISTING ATTEMPT
  // ----------------------------------

  const { data: attempt, error: attemptError } =
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

  if (attemptError) {
    console.error(
      '[MISSION 01 PLAY] Unable to load attempt:',
      attemptError
    );
  }

  // Completed players should always see
  // their final breach report.
  if (
    attempt?.status === 'submitted' ||
    attempt?.current_stage === 'report'
  ) {
    redirect('/missions/1/play/report');
  }

  /*
   * IMPORTANT:
   * Do not redirect "briefing" attempts here.
   *
   * MissionOneBriefing is responsible for:
   * - creating the attempt when none exists
   * - showing the briefing when current_stage = briefing
   * - resuming later stages when current_stage has advanced
   *
   * This means a player who leaves the briefing and presses
   * Resume Mission will return to the briefing instead of
   * being skipped ahead.
   */
  return (
    <MissionOneBriefing
      initialAttempt={attempt}
      playerAlias={profile.alias ?? 'Agent'}
    />
  );
}
