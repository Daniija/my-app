import {
  redirect,
} from 'next/navigation';

import {
  createClient,
} from '@/lib/supabase/server';

import MissionTwoBriefing from '@/components/mission-two/MissionTwoBriefing';

export default async function MissionTwoPlayPage() {
  const supabase =
    await createClient();

  // ----------------------------------
  // AUTHENTICATION
  // ----------------------------------

  const {
    data: { user },
  } =
    await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // ----------------------------------
  // PLAYER PROFILE
  // ----------------------------------

  const {
    data: profile,
    error: profileError,
  } = await supabase
    .from('profiles')
    .select(`
      id,
      alias,
      role,
      is_active,
      onboarding_complete,
      work_location_type
    `)
    .eq(
      'id',
      user.id
    )
    .single();

  if (
    profileError ||
    !profile
  ) {
    console.error(
      '[MISSION 02 PLAY] Unable to load profile:',
      profileError
    );

    redirect('/login');
  }

  if (
    !profile.is_active
  ) {
    redirect('/login');
  }

  if (
    profile.role ===
    'admin'
  ) {
    redirect('/admin');
  }

  if (
    !profile.onboarding_complete
  ) {
    redirect(
      '/onboarding'
    );
  }

  if (
    !profile.work_location_type
  ) {
    redirect(
      '/select-workgroup'
    );
  }

  // ----------------------------------
  // LOAD EXISTING ATTEMPT
  // ----------------------------------

  const {
    data: attempt,
    error: attemptError,
  } = await supabase
    .from(
      'mission_attempts'
    )
    .select(`
      id,
      status,
      current_stage,
      started_at,
      completed_at
    `)
    .eq(
      'player_id',
      user.id
    )
    .eq(
      'mission_id',
      2
    )
    .maybeSingle();

  if (attemptError) {
    console.error(
      '[MISSION 02 PLAY] Unable to load attempt:',
      attemptError
    );
  }

  // Final report later.
  if (
    attempt?.status ===
      'submitted' ||
    attempt?.current_stage ===
      'report'
  ) {
    redirect(
      '/missions/2/play/report'
    );
  }

  return (
    <MissionTwoBriefing
      initialAttempt={
        attempt
      }
      playerAlias={
        profile.alias ??
        'Agent'
      }
    />
  );
}