import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        {
          code: 'AUTH_REQUIRED',
          message: 'You must be signed in.',
        },
        { status: 401 }
      );
    }

    const {
      data: profile,
      error: profileError,
    } = await supabase
      .from('profiles')
      .select(`
        id,
        role,
        is_active,
        onboarding_complete
      `)
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error(
        '[MISSION 01] Profile error:',
        profileError
      );

      return NextResponse.json(
        {
          code: 'PROFILE_ERROR',
          message:
            'Unable to load your player profile.',
        },
        { status: 500 }
      );
    }

    if (!profile || !profile.is_active) {
      return NextResponse.json(
        {
          code: 'PROFILE_INACTIVE',
          message:
            'Your player account is unavailable.',
        },
        { status: 403 }
      );
    }

    if (profile.role === 'admin') {
      return NextResponse.json(
        {
          code: 'ADMIN_NOT_ALLOWED',
          message:
            'Administrator accounts cannot play missions.',
        },
        { status: 403 }
      );
    }

    if (!profile.onboarding_complete) {
      return NextResponse.json(
        {
          code: 'ONBOARDING_REQUIRED',
          message:
            'Complete onboarding before starting the mission.',
        },
        { status: 403 }
      );
    }

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
      .eq('id', 1)
      .single();

    if (missionError) {
      console.error(
        '[MISSION 01] Mission error:',
        missionError
      );

      return NextResponse.json(
        {
          code: 'MISSION_ERROR',
          message:
            'Unable to load Mission 01.',
        },
        { status: 500 }
      );
    }

    if (!mission) {
      return NextResponse.json(
        {
          code: 'MISSION_NOT_FOUND',
          message:
            'Mission 01 could not be found.',
        },
        { status: 404 }
      );
    }

    const now = new Date();

    const unlockDate =
      mission.unlock_at
        ? new Date(mission.unlock_at)
        : null;

    const forcedOpen =
      mission.status === 'forced_open' ||
      mission.status === 'open';

    const scheduledOpen =
      mission.status === 'scheduled' &&
      unlockDate !== null &&
      now >= unlockDate;

    const unavailable =
      mission.status === 'closed' ||
      mission.status === 'emergency_locked';

    const available =
      !unavailable &&
      (forcedOpen || scheduledOpen);

    if (!available) {
      return NextResponse.json(
        {
          code: 'MISSION_LOCKED',
          message:
            'Mission 01 is currently locked.',
        },
        { status: 403 }
      );
    }

    const {
      data: existingAttempt,
      error: attemptLookupError,
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
      .eq('player_id', user.id)
      .eq('mission_id', mission.id)
      .maybeSingle();

    if (attemptLookupError) {
      console.error(
        '[MISSION 01] Attempt lookup error:',
        attemptLookupError
      );

      return NextResponse.json(
        {
          code: 'ATTEMPT_LOOKUP_FAILED',
          message:
            'Unable to check your mission progress.',
        },
        { status: 500 }
      );
    }

    if (existingAttempt) {
      return NextResponse.json(
        {
          ok: true,
          resumed: true,
          attempt: existingAttempt,
        },
        {
          status: 200,
          headers: {
            'Cache-Control': 'no-store',
          },
        }
      );
    }

    const {
      data: attempt,
      error: createError,
    } = await supabase
      .from('mission_attempts')
      .insert({
        player_id: user.id,
        mission_id: mission.id,
        status: 'active',
        current_stage: 'briefing',
        started_at:
          new Date().toISOString(),
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

    if (createError) {
      console.error(
        '[MISSION 01] Attempt creation error:',
        createError
      );

      if (createError.code === '23505') {
        const {
          data: duplicateAttempt,
          error: existingAttemptError,
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
          .eq('player_id', user.id)
          .eq('mission_id', mission.id)
          .single();

        if (
          existingAttemptError ||
          !duplicateAttempt
        ) {
          console.error(
            '[MISSION 01] Duplicate attempt lookup failed:',
            existingAttemptError
          );

          return NextResponse.json(
            {
              code:
                'ATTEMPT_LOOKUP_FAILED',
              message:
                'Your mission attempt exists but could not be loaded.',
            },
            { status: 500 }
          );
        }

        return NextResponse.json(
          {
            ok: true,
            resumed: true,
            attempt: duplicateAttempt,
          },
          {
            status: 200,
            headers: {
              'Cache-Control': 'no-store',
            },
          }
        );
      }

      return NextResponse.json(
        {
          code:
            'ATTEMPT_CREATION_FAILED',
          message:
            createError.message ??
            'Unable to create Mission 01 attempt.',
        },
        { status: 500 }
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
          'Cache-Control': 'no-store',
        },
      }
    );
  } catch (error) {
    console.error(
      '[MISSION 01] Unexpected startup error:',
      error
    );

    return NextResponse.json(
      {
        code: 'MISSION_START_FAILED',
        message:
          error instanceof Error
            ? error.message
            : 'Unable to start Mission 01.',
      },
      { status: 500 }
    );
  }
}
