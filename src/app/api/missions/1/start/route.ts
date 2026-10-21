import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { writeErrorAuditLog } from '@/lib/audit';

export async function POST() {
  let authedUserId: string | null = null;

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

    authedUserId = user.id;

    const {
      data: profile,
      error: profileError,
    } = await supabase
      .from('profiles')
      .select(`
        id,
        role,
        is_active,
        onboarding_complete,
        work_location_type
      `)
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error(
        '[MISSION 01] Profile error:',
        profileError
      );

      await writeErrorAuditLog({
        actorId: user.id,
        actorRole: 'player',
        action: 'MISSION_START_FAILED',
        targetType: 'mission',
        targetId: '1',
        description: 'Unable to load profile while starting Mission 01.',
        error: profileError,
        context: { stage: 'load_profile' },
      });

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

    if (!profile.work_location_type) {
      return NextResponse.json(
        {
          code: 'WORKGROUP_REQUIRED',
          message:
            'Choose your department or branch before starting the mission.',
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

      await writeErrorAuditLog({
        actorId: user.id,
        actorRole: 'player',
        action: 'MISSION_START_FAILED',
        targetType: 'mission',
        targetId: '1',
        description: 'Unable to load Mission 01 data while starting it.',
        error: missionError,
        context: { stage: 'load_mission' },
      });

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
      mission.status === 'live' ||
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

      await writeErrorAuditLog({
        actorId: user.id,
        actorRole: 'player',
        action: 'MISSION_START_FAILED',
        targetType: 'mission',
        targetId: '1',
        description: 'Unable to check existing Mission 01 progress.',
        error: attemptLookupError,
        context: { stage: 'attempt_lookup' },
      });

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

          await writeErrorAuditLog({
            actorId: user.id,
            actorRole: 'player',
            action: 'MISSION_START_FAILED',
            targetType: 'mission',
            targetId: '1',
            description: 'Mission 01 attempt exists but could not be reloaded after a duplicate-insert conflict.',
            error: existingAttemptError ?? new Error('Duplicate attempt lookup returned no row.'),
            context: { stage: 'duplicate_attempt_lookup' },
          });

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

      await writeErrorAuditLog({
        actorId: user.id,
        actorRole: 'player',
        action: 'MISSION_START_FAILED',
        targetType: 'mission',
        targetId: '1',
        description: 'Unable to create a Mission 01 attempt.',
        error: createError,
        context: { stage: 'create_attempt' },
      });

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

    await writeErrorAuditLog({
      actorId: authedUserId,
      actorRole: authedUserId ? 'player' : null,
      action: 'MISSION_START_FAILED',
      targetType: 'mission',
      targetId: '1',
      description: 'Unexpected error while starting Mission 01.',
      error,
      context: { stage: 'unexpected' },
    });

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
