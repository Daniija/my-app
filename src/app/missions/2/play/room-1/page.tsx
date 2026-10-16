import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import MissionTwoRoomOne from '@/components/mission-two/MissionTwoRoomOne';

export const dynamic =
  'force-dynamic';

export default async function MissionTwoRoomOnePage() {
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

  if (
    profile.role ===
    'admin'
  ) {
    redirect('/admin');
  }

  if (
    !profile.onboarding_complete
  ) {
    redirect('/onboarding');
  }

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

  if (
    attemptError ||
    !attempt
  ) {
    redirect(
      '/missions/2/play'
    );
  }

  if (
    attempt.status ===
      'submitted' ||
    attempt.current_stage ===
      'report'
  ) {
    redirect(
      '/missions/2/play/report'
    );
  }

  const laterRoom =
    attempt.current_stage
      ?.startsWith('room-') &&
    Number(
      attempt.current_stage.replace(
        'room-',
        ''
      )
    ) > 1;

  if (laterRoom) {
    redirect(
      '/missions/2/play/escape-room'
    );
  }

  if (
    attempt.current_stage ===
      'incident' ||
    attempt.current_stage ===
      'map' ||
    !attempt.current_stage
  ) {
    const {
      error: stageError,
    } = await supabase
      .from(
        'mission_attempts'
      )
      .update({
        current_stage:
          'room-1',
      })
      .eq(
        'id',
        attempt.id
      )
      .eq(
        'player_id',
        user.id
      )
      .eq(
        'mission_id',
        2
      );

    if (stageError) {
      console.error(
        '[MISSION 02 ROOM 01] Unable to save room stage:',
        stageError
      );
    }
  }

  return (
    <MissionTwoRoomOne
      playerAlias={
        profile.alias ??
        'Agent'
      }
    />
  );
}
