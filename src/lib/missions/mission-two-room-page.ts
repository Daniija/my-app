import 'server-only';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export async function requireMissionTwoPlayerRoom(
  roomNumber: number
) {
  const supabase =
    await createClient();

  const {
    data: { user },
  } =
    await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

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
      onboarding_complete
    `)
    .eq('id', user.id)
    .single();

  if (
    profileError ||
    !profile
  ) {
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

  const {
    data: attempt,
    error: attemptError,
  } = await supabase
    .from('mission_attempts')
    .select(`
      id,
      status,
      current_stage,
      started_at,
      completed_at
    `)
    .eq('player_id', user.id)
    .eq('mission_id', 2)
    .maybeSingle();

  if (
    attemptError ||
    !attempt
  ) {
    redirect('/missions/2/play');
  }

  if (
    attempt.status === 'submitted' ||
    attempt.current_stage === 'report'
  ) {
    redirect('/missions/2/play/report');
  }

  const expectedStage =
    `room-${roomNumber}`;

  if (
    attempt.current_stage !==
    expectedStage
  ) {
    redirect('/missions/2/play/escape-room');
  }

  return {
    profile,
    attempt,
  };
}
