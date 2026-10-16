import { redirect } from 'next/navigation';

import MissionTwoCommandCentre from '@/components/mission-two/MissionTwoCommandCentre';
import { createClient } from '@/lib/supabase/server';

export const dynamic =
  'force-dynamic';

export default async function MissionTwoEscapeRoomPage() {
  const supabase =
    await createClient();

  // ==================================
  // AUTH
  // ==================================

  const {
    data: { user },
  } =
    await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // ==================================
  // PROFILE
  // ==================================

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
      '[MISSION 02 COMMAND CENTRE] Unable to load profile:',
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
    redirect('/onboarding');
  }

  // ==================================
  // LOAD MISSION 02 ATTEMPT
  // ==================================

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
    attemptError
  ) {
    console.error(
      '[MISSION 02 COMMAND CENTRE] Unable to load attempt:',
      attemptError
    );

    redirect(
      '/missions/2/play'
    );
  }

  if (!attempt) {
    redirect(
      '/missions/2/play'
    );
  }

  // ==================================
  // COMPLETED MISSION
  // ==================================

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

  // ==================================
  // DETERMINE CURRENT STAGE
  // ==================================

  let currentStage =
    attempt.current_stage;

  /*
   * When the player first reaches the
   * Command Centre after the incident,
   * convert the stage to "map".
   *
   * After that, room submit routes should
   * save:
   *
   * room-1 -> room-2
   * room-2 -> room-3
   * room-3 -> room-4
   * etc.
   *
   * We must preserve those room stages.
   */

  if (
    !currentStage ||
    currentStage ===
      'briefing' ||
    currentStage ===
      'incident'
  ) {
    const {
      data: updatedAttempt,
      error: stageError,
    } = await supabase
      .from(
        'mission_attempts'
      )
      .update({
        current_stage:
          'map',
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
      )
      .select(`
        current_stage
      `)
      .single();

    if (
      stageError ||
      !updatedAttempt
    ) {
      console.error(
        '[MISSION 02 COMMAND CENTRE] Unable to save map stage:',
        stageError
      );

      redirect(
        '/missions/2/play'
      );
    }

    currentStage =
      updatedAttempt.current_stage;
  }

  // ==================================
  // VALID STAGES
  // ==================================

  const allowedStages =
    new Set([
      'map',
      'room-1',
      'room-2',
      'room-3',
      'room-4',
      'room-5',
      'room-6',
      'room-7',
      'room-8',
      'room-9',
      'room-10',
    ]);

  if (
    !allowedStages.has(
      currentStage
    )
  ) {
    console.error(
      '[MISSION 02 COMMAND CENTRE] Invalid current stage:',
      currentStage
    );

    redirect(
      '/missions/2/play'
    );
  }

  // ==================================
  // COMMAND CENTRE
  // ==================================

  return (
    <MissionTwoCommandCentre
      playerAlias={
        profile.alias ??
        'Agent'
      }
      currentStage={
        currentStage
      }
      previewMode={
        false
      }
    />
  );
}