import { NextResponse } from 'next/server';

import {
  createClient,
} from '@/lib/supabase/server';

import {
  getMissionTwoFragment,
  getMissionTwoPreviewFragment,
} from '@/lib/missions/mission-two-fragments';


const CORRECT_IDS =
  new Set([
    'badge',
    'project',
    'travel',
    'buddy',
    'house',
  ]);


function isExactAnswer(
  selectedIds: string[]
) {
  const unique =
    new Set(
      selectedIds
    );

  if (
    unique.size !==
    CORRECT_IDS.size
  ) {
    return false;
  }

  for (
    const id of
    CORRECT_IDS
  ) {
    if (
      !unique.has(id)
    ) {
      return false;
    }
  }

  return true;
}


export async function POST(
  request: Request
) {
  try {
    const supabase =
      await createClient();


    // ----------------------------------
    // AUTHENTICATION
    // ----------------------------------

    const {
      data: {
        user,
      },
    } =
      await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        {
          message:
            'You must be signed in.',
        },
        {
          status: 401,
        }
      );
    }


    // ----------------------------------
    // REQUEST
    // ----------------------------------

    const body =
      await request.json();

    const selectedIds =
      Array.isArray(
        body?.selectedIds
      )
        ? body.selectedIds.filter(
            (
              value: unknown
            ): value is string =>
              typeof value ===
              'string'
          )
        : [];

    const previewMode =
      body?.previewMode ===
      true;


    // ----------------------------------
    // PROFILE
    // ----------------------------------

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
      !profile ||
      !profile.is_active
    ) {
      return NextResponse.json(
        {
          message:
            'Unable to verify your account.',
        },
        {
          status: 403,
        }
      );
    }


    // ----------------------------------
    // CHECK ANSWER
    // ----------------------------------

    const correct =
      isExactAnswer(
        selectedIds
      );


    // ----------------------------------
    // DETERMINE ROOM 01 FRAGMENT
    //
    // PLAYER:
    // deterministic fragment based on
    // Supabase user ID.
    //
    // ADMIN:
    // fixed preview fragment.
    // ----------------------------------

    const awardedFragment =
      correct
        ? previewMode
          ? getMissionTwoPreviewFragment(
              1
            )
          : getMissionTwoFragment(
              user.id,
              1
            )
        : null;


    // ----------------------------------
    // ADMIN PREVIEW
    //
    // IMPORTANT:
    // This does not write player
    // progress, scores or leaderboard
    // information.
    // ----------------------------------

    if (
      previewMode
    ) {
      if (
        profile.role !==
        'admin'
      ) {
        return NextResponse.json(
          {
            message:
              'Admin preview is not available for this account.',
          },
          {
            status: 403,
          }
        );
      }

      return NextResponse.json({
        ok:
          true,

        preview:
          true,

        correct,

        score:
          correct
            ? 200
            : 0,

        clue:
          awardedFragment,

        message:
          correct
            ? 'Excellent work. You identified the public details an attacker could realistically use.'
            : 'Not quite. One harmless post is mixed into the trail. Review the workplace, project, travel, personal and location details.',
      });
    }


    // ----------------------------------
    // BLOCK ADMIN FROM PLAYER ROUTE
    // ----------------------------------

    if (
      profile.role ===
      'admin'
    ) {
      return NextResponse.json(
        {
          message:
            'Use the admin preview route to test Mission 02.',
        },
        {
          status: 403,
        }
      );
    }


    // ----------------------------------
    // ONBOARDING CHECK
    // ----------------------------------

    if (
      !profile.onboarding_complete
    ) {
      return NextResponse.json(
        {
          message:
            'Complete onboarding before playing Mission 02.',
        },
        {
          status: 403,
        }
      );
    }


    // ----------------------------------
    // LOAD MISSION ATTEMPT
    // ----------------------------------

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
          current_stage
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
        '[MISSION 02 ROOM 01] Attempt load failed:',
        attemptError
      );

      return NextResponse.json(
        {
          message:
            'Mission 02 attempt could not be loaded.',
        },
        {
          status: 400,
        }
      );
    }


    // ----------------------------------
    // VERIFY ACTIVE MISSION
    // ----------------------------------

    if (
      attempt.status !==
      'active'
    ) {
      return NextResponse.json(
        {
          message:
            'Mission 02 is not active.',
        },
        {
          status: 409,
        }
      );
    }


    // ----------------------------------
    // VERIFY CURRENT ROOM
    // ----------------------------------

    if (
      attempt.current_stage !==
        'room-1' &&
      attempt.current_stage !==
        'map'
    ) {
      return NextResponse.json(
        {
          message:
            `Room 01 is not your current mission stage. Current stage: ${attempt.current_stage}`,
        },
        {
          status: 409,
        }
      );
    }


    // ----------------------------------
    // WRONG ANSWER
    // ----------------------------------

    if (
      !correct
    ) {
      return NextResponse.json({
        ok:
          true,

        correct:
          false,

        score:
          0,

        clue:
          null,

        message:
          'Not quite. One harmless post is mixed into the trail. Review the workplace, project, travel, personal and location details.',
      });
    }


    // ----------------------------------
    // CORRECT ANSWER
    //
    // UPDATE AND RETURN THE UPDATED ROW.
    // THIS CONFIRMS THAT ROOM 02 WAS
    // ACTUALLY SAVED IN SUPABASE.
    // ----------------------------------

    const {
      data:
        updatedAttempt,

      error:
        updateError,
    } =
      await supabase
        .from(
          'mission_attempts'
        )
        .update({
          current_stage:
            'room-2',
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
          id,
          current_stage
        `)
        .single();

    if (
      updateError ||
      !updatedAttempt
    ) {
      console.error(
        '[MISSION 02 ROOM 01] Unable to advance stage:',
        updateError
      );

      return NextResponse.json(
        {
          message:
            'Your answer was correct, but your progress could not be saved. Please try again.',
        },
        {
          status: 500,
        }
      );
    }


    // ----------------------------------
    // VERIFY ROOM 02 REALLY UNLOCKED
    // ----------------------------------

    if (
      updatedAttempt
        .current_stage !==
      'room-2'
    ) {
      console.error(
        '[MISSION 02 ROOM 01] Stage verification failed:',
        updatedAttempt
      );

      return NextResponse.json(
        {
          message:
            'Room 01 was solved, but Room 02 could not be unlocked.',
        },
        {
          status: 500,
        }
      );
    }


    // ----------------------------------
    // SUCCESS
    // ----------------------------------

    return NextResponse.json({
      ok:
        true,

      correct:
        true,

      score:
        200,

      /*
        This is no longer a fixed P.

        The player receives whichever
        character belongs to Room 01
        in their personal 4PRIVACY
        scramble.
      */
      clue:
        awardedFragment,

      nextStage:
        'room-2',

      currentStage:
        updatedAttempt
          .current_stage,

      message:
        'Excellent work. You identified the public details an attacker could realistically use.',
    });
  } catch (
    error
  ) {
    console.error(
      '[MISSION 02 ROOM 01] Submit failed:',
      error
    );

    return NextResponse.json(
      {
        message:
          'Unable to submit Room 01.',
      },
      {
        status: 500,
      }
    );
  }
}