import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { writeErrorAuditLog } from '@/lib/audit';

export async function POST() {
  let authedUserId: string | null = null;

  try {
    const supabase =
      await createClient();

    // ----------------------------------
    // AUTHENTICATION
    // ----------------------------------

    const {
      data: { user },
      error: authError,
    } =
      await supabase.auth.getUser();

    if (
      authError ||
      !user
    ) {
      return NextResponse.json(
        {
          code: 'AUTH_REQUIRED',
          message:
            'You must be signed in.',
        },
        {
          status: 401,
        }
      );
    }

    authedUserId = user.id;

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
        role,
        is_active,
        is_tester,
        onboarding_complete,
        work_location_type
      `)
      .eq('id', user.id)
      .single();

    if (
      profileError ||
      !profile
    ) {
      console.error(
        '[MISSION 02] Profile error:',
        profileError
      );

      await writeErrorAuditLog({
        actorId: user.id,
        actorRole: 'player',
        action: 'MISSION_START_FAILED',
        targetType: 'mission',
        targetId: '2',
        description: 'Unable to load profile while starting Mission 02.',
        error: profileError ?? new Error('Profile not found.'),
        context: { stage: 'load_profile' },
      });

      return NextResponse.json(
        {
          code: 'PROFILE_ERROR',
          message:
            'Unable to load your player profile.',
        },
        {
          status: 500,
        }
      );
    }

    if (
      !profile.is_active
    ) {
      return NextResponse.json(
        {
          code: 'PROFILE_INACTIVE',
          message:
            'Your player account is unavailable.',
        },
        {
          status: 403,
        }
      );
    }

    if (
      profile.role ===
      'admin'
    ) {
      return NextResponse.json(
        {
          code: 'ADMIN_NOT_ALLOWED',
          message:
            'Administrator accounts cannot play missions.',
        },
        {
          status: 403,
        }
      );
    }

    if (
      !profile.onboarding_complete
    ) {
      return NextResponse.json(
        {
          code: 'ONBOARDING_REQUIRED',
          message:
            'Complete onboarding before starting the mission.',
        },
        {
          status: 403,
        }
      );
    }

    if (
      !profile.work_location_type
    ) {
      return NextResponse.json(
        {
          code: 'WORKGROUP_REQUIRED',
          message:
            'Choose your department or branch before starting the mission.',
        },
        {
          status: 403,
        }
      );
    }

    // ----------------------------------
    // LOAD MISSION 02
    // ----------------------------------

    const {
      data: mission,
      error: missionError,
    } = await supabase
      .from('missions')
      .select(`
        id,
        status,
        unlock_at
      `)
      .eq('id', 2)
      .single();

    if (
      missionError ||
      !mission
    ) {
      console.error(
        '[MISSION 02] Mission error:',
        missionError
      );

      await writeErrorAuditLog({
        actorId: user.id,
        actorRole: 'player',
        action: 'MISSION_START_FAILED',
        targetType: 'mission',
        targetId: '2',
        description: 'Unable to load Mission 02 data while starting it.',
        error: missionError ?? new Error('Mission not found.'),
        context: { stage: 'load_mission' },
      });

      return NextResponse.json(
        {
          code: 'MISSION_NOT_FOUND',
          message:
            'Mission 02 could not be found.',
        },
        {
          status: 404,
        }
      );
    }

    // ----------------------------------
    // CHECK AVAILABILITY
    // ----------------------------------

    const now =
      new Date();

    const unlockDate =
      mission.unlock_at
        ? new Date(
            mission.unlock_at
          )
        : null;

    const forcedOpen =
      mission.status ===
        'forced_open' ||
      mission.status ===
        'live' ||
      mission.status ===
        'open';

    const scheduledOpen =
      mission.status ===
        'scheduled' &&
      unlockDate !== null &&
      now >= unlockDate;

    const unavailable =
      mission.status ===
        'closed' ||
      mission.status ===
        'emergency_locked';

    const available =
      !unavailable &&
      (forcedOpen ||
        scheduledOpen ||
        profile.is_tester);

    if (!available) {
      return NextResponse.json(
        {
          code: 'MISSION_LOCKED',
          message:
            'Mission 02 is currently locked.',
        },
        {
          status: 403,
        }
      );
    }

    // ----------------------------------
    // CHECK FOR EXISTING ATTEMPT
    // ----------------------------------

    const {
      data: existingAttempt,
      error:
        attemptLookupError,
    } = await supabase
      .from('mission_attempts')
      .select(`
        id,
        player_id,
        mission_id,
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
        mission.id
      )
      .maybeSingle();

    if (
      attemptLookupError
    ) {
      console.error(
        '[MISSION 02] Attempt lookup error:',
        attemptLookupError
      );

      await writeErrorAuditLog({
        actorId: user.id,
        actorRole: 'player',
        action: 'MISSION_START_FAILED',
        targetType: 'mission',
        targetId: '2',
        description: 'Unable to check existing Mission 02 progress.',
        error: attemptLookupError,
        context: { stage: 'attempt_lookup' },
      });

      return NextResponse.json(
        {
          code:
            'ATTEMPT_LOOKUP_FAILED',
          message:
            'Unable to check your mission progress.',
        },
        {
          status: 500,
        }
      );
    }

    // Resume existing attempt.
    if (
      existingAttempt
    ) {
      return NextResponse.json(
        {
          ok: true,
          resumed: true,
          attempt:
            existingAttempt,
        },
        {
          status: 200,
          headers: {
            'Cache-Control':
              'no-store',
          },
        }
      );
    }

    // ----------------------------------
    // CREATE NEW ATTEMPT
    // ----------------------------------

    const {
      data: attempt,
      error: createError,
    } = await supabase
      .from('mission_attempts')
      .insert({
        player_id:
          user.id,

        mission_id:
          mission.id,

        status:
          'active',

        current_stage:
          'briefing',

        started_at:
          new Date()
            .toISOString(),
      })
      .select(`
        id,
        player_id,
        mission_id,
        status,
        current_stage,
        started_at,
        completed_at
      `)
      .single();

    if (
      createError ||
      !attempt
    ) {
      console.error(
        '[MISSION 02] Attempt creation error:',
        createError
      );

      await writeErrorAuditLog({
        actorId: user.id,
        actorRole: 'player',
        action: 'MISSION_START_FAILED',
        targetType: 'mission',
        targetId: '2',
        description: 'Unable to create a Mission 02 attempt.',
        error: createError ?? new Error('Attempt creation returned no row.'),
        context: { stage: 'create_attempt' },
      });

      return NextResponse.json(
        {
          code:
            'ATTEMPT_CREATE_FAILED',
          message:
            'Unable to begin Mission 02.',
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        resumed: false,
        attempt,
      },
      {
        status: 201,
        headers: {
          'Cache-Control':
            'no-store',
        },
      }
    );
  } catch (error) {
    console.error(
      '[MISSION 02 START]',
      error
    );

    await writeErrorAuditLog({
      actorId: authedUserId,
      actorRole: authedUserId ? 'player' : null,
      action: 'MISSION_START_FAILED',
      targetType: 'mission',
      targetId: '2',
      description: 'Unexpected error while starting Mission 02.',
      error,
      context: { stage: 'unexpected' },
    });

    return NextResponse.json(
      {
        code:
          'MISSION_START_ERROR',

        message:
          'Unable to establish the Mission 02 secure channel.',
      },
      {
        status: 500,
      }
    );
  }
}