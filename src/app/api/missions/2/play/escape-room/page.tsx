import {
  redirect,
} from 'next/navigation';

import {
  createClient,
} from '@/lib/supabase/server';

import {
  getMissionTwoFragment,
} from '@/lib/missions/mission-two-fragments';

import MissionTwoCommandCentre from '@/components/mission-two/MissionTwoCommandCentre';


export const dynamic =
  'force-dynamic';


function getRoomNumber(
  stage: string
) {
  if (
    !stage.startsWith(
      'room-'
    )
  ) {
    return 0;
  }

  const roomNumber =
    Number(
      stage.replace(
        'room-',
        ''
      )
    );

  return Number.isInteger(
    roomNumber
  )
    ? roomNumber
    : 0;
}


export default async function MissionTwoEscapeRoomPage() {
  const supabase =
    await createClient();


  // ==================================
  // AUTHENTICATION
  // ==================================

  const {
    data: {
      user,
    },
  } =
    await supabase.auth.getUser();


  if (
    !user
  ) {
    redirect(
      '/login'
    );
  }


  // ==================================
  // PLAYER PROFILE
  // ==================================

  const {
    data:
      profile,

    error:
      profileError,
  } =
    await supabase
      .from(
        'profiles'
      )
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
      '[MISSION 02 MAP] Unable to load profile:',
      profileError
    );

    redirect(
      '/login'
    );
  }


  if (
    !profile.is_active
  ) {
    redirect(
      '/login'
    );
  }


  if (
    profile.role ===
    'admin'
  ) {
    redirect(
      '/admin'
    );
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


  // ==================================
  // MISSION ATTEMPT
  // ==================================

  const {
    data:
      attempt,

    error:
      attemptError,
  } =
    await supabase
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
    console.error(
      '[MISSION 02 MAP] Unable to load mission attempt:',
      attemptError
    );

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
  // CURRENT STAGE
  // ==================================

  let currentStage =
    attempt.current_stage ??
    'map';


  // ----------------------------------
  // MOVE BRIEFING / INCIDENT TO MAP
  // ----------------------------------

  if (
    !attempt.current_stage ||
    attempt.current_stage ===
      'briefing' ||
    attempt.current_stage ===
      'incident'
  ) {
    const {
      error:
        stageError,
    } =
      await supabase
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
        );


    if (
      stageError
    ) {
      console.error(
        '[MISSION 02 MAP] Unable to save map stage:',
        stageError
      );
    } else {
      currentStage =
        'map';
    }
  }


  // ==================================
  // CALCULATE ROOMS CLEARED
  // ==================================

  const activeRoom =
    getRoomNumber(
      currentStage
    );


  /*
   * Example:
   *
   * currentStage = room-1
   * roomsCleared = 0
   *
   * currentStage = room-2
   * roomsCleared = 1
   *
   * currentStage = room-6
   * roomsCleared = 5
   *
   * currentStage = room-9
   * roomsCleared = 8
   */

  const roomsCleared =
    activeRoom > 0
      ? Math.max(
          0,
          activeRoom - 1
        )
      : 0;


  // ==================================
  // RANDOMIZED ESCAPE-CODE FRAGMENTS
  //
  // Only Rooms 01–08 award fragments.
  //
  // IMPORTANT:
  // We only derive fragments the player
  // has already earned. Future fragments
  // are never sent to the browser.
  // ==================================

  const fragmentCount =
    Math.min(
      roomsCleared,
      8
    );


  const collectedFragments =
    Array.from(
      {
        length:
          fragmentCount,
      },
      (
        _,
        index
      ) =>
        getMissionTwoFragment(
          user.id,
          index + 1
        )
    ).filter(
      (
        fragment
      ): fragment is string =>
        typeof fragment ===
          'string' &&
        fragment.length >
          0
    );


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
      collectedFragments={
        collectedFragments
      }
    />
  );
}