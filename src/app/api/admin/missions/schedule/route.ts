import { NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { writeErrorAuditLog } from '@/lib/audit';

export async function POST(
  request: Request
) {
  let authedUserId: string | null = null;

  try {
    const supabase =
      await createClient();

    // ----------------------------------
    // VERIFY SIGNED-IN USER
    // ----------------------------------

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        {
          error:
            'Authentication required.',
        },
        { status: 401 }
      );
    }

    authedUserId = user.id;

    // ----------------------------------
    // VERIFY ADMIN PROFILE
    // ----------------------------------

    const {
      data: profile,
      error: profileError,
    } = await supabase
      .from('profiles')
      .select(`
        id,
        username,
        alias,
        role,
        is_active
      `)
      .eq('id', user.id)
      .single();

    if (
      profileError ||
      !profile ||
      !profile.is_active ||
      profile.role !== 'admin'
    ) {
      return NextResponse.json(
        {
          error:
            'Administrator access required.',
        },
        { status: 403 }
      );
    }

    // ----------------------------------
    // READ REQUEST
    // ----------------------------------

    const body = await request
      .json()
      .catch(() => null);

    const missionId =
      Number(body?.missionId);

    const date =
      typeof body?.date === 'string'
        ? body.date
        : '';

    const time =
      typeof body?.time === 'string'
        ? body.time
        : '';

    // ----------------------------------
    // VALIDATE INPUT
    // ----------------------------------

    if (
      !Number.isInteger(missionId) ||
      missionId < 1
    ) {
      return NextResponse.json(
        {
          error:
            'Invalid mission.',
        },
        { status: 400 }
      );
    }

    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(
        date
      )
    ) {
      return NextResponse.json(
        {
          error:
            'Invalid release date.',
        },
        { status: 400 }
      );
    }

    if (
      !/^\d{2}:\d{2}$/.test(
        time
      )
    ) {
      return NextResponse.json(
        {
          error:
            'Invalid release time.',
        },
        { status: 400 }
      );
    }

    // ----------------------------------
    // CONVERT JAMAICA TIME
    // ----------------------------------

    /*
     * Jamaica is UTC-05:00 year-round.
     *
     * Building the timestamp this way prevents
     * the administrator's browser timezone from
     * changing the intended release time.
     */
    const jamaicaTimestamp =
      `${date}T${time}:00-05:00`;

    const scheduledDate =
      new Date(jamaicaTimestamp);

    if (
      Number.isNaN(
        scheduledDate.getTime()
      )
    ) {
      return NextResponse.json(
        {
          error:
            'The selected schedule is invalid.',
        },
        { status: 400 }
      );
    }

    const admin =
      createAdminClient();

    // ----------------------------------
    // LOAD CURRENT MISSION
    // ----------------------------------

    const {
      data: mission,
      error: missionError,
    } = await admin
      .from('missions')
      .select(`
        id,
        title,
        status,
        unlock_at
      `)
      .eq('id', missionId)
      .single();

    if (
      missionError ||
      !mission
    ) {
      return NextResponse.json(
        {
          error:
            'Mission could not be found.',
        },
        { status: 404 }
      );
    }

    const previousSchedule =
      mission.unlock_at;

    const previousStatus =
      mission.status;

    // ----------------------------------
    // UPDATE MISSION SCHEDULE
    // ----------------------------------

    const {
      data: updatedMission,
      error: updateError,
    } = await admin
      .from('missions')
      .update({
        unlock_at:
          scheduledDate.toISOString(),

        status:
          'scheduled',
      })
      .eq('id', missionId)
      .select(`
        id,
        title,
        status,
        unlock_at
      `)
      .single();

    if (
      updateError ||
      !updatedMission
    ) {
      console.error(
        '[ADMIN SCHEDULE] Update failed:',
        updateError
      );

      await writeErrorAuditLog({
        actorId: profile.id,
        actorAlias: profile.alias ?? profile.username,
        actorRole: 'admin',
        action: 'MISSION_SCHEDULE_CHANGE_FAILED',
        targetType: 'mission',
        targetId: String(missionId),
        description: `Unable to update the schedule for mission ${missionId}.`,
        error: updateError ?? new Error('Mission update returned no row.'),
        context: { stage: 'update_mission' },
      });

      return NextResponse.json(
        {
          error:
            updateError?.message ||
            'Unable to update the mission schedule.',
        },
        { status: 500 }
      );
    }

    // ----------------------------------
    // WRITE AUDIT RECORD
    // ----------------------------------

    const {
      error: auditError,
    } = await admin
      .from('audit_logs')
      .insert({
        actor_id:
          profile.id,

        actor_alias:
          profile.alias ??
          profile.username ??
          'Admin',

        actor_role:
          'admin',

        action:
          'MISSION_SCHEDULE_CHANGED',

        target_type:
          'mission',

        target_id:
          String(missionId),

        description:
          `Mission ${String(
            missionId
          ).padStart(
            2,
            '0'
          )} schedule was changed by an administrator.`,

        metadata: {
          mission_title:
            mission.title,

          previous_unlock_at:
            previousSchedule,

          new_unlock_at:
            updatedMission.unlock_at,

          previous_status:
            previousStatus,

          new_status:
            updatedMission.status,

          timezone:
            'America/Jamaica',
        },
      });

    if (auditError) {
      console.warn(
        '[ADMIN SCHEDULE] Audit log warning:',
        auditError
      );
    }

    // ----------------------------------
    // SUCCESS
    // ----------------------------------

    return NextResponse.json({
      ok: true,

      mission: {
        id:
          updatedMission.id,

        title:
          updatedMission.title,

        status:
          updatedMission.status,

        unlock_at:
          updatedMission.unlock_at,
      },
    });
  } catch (error) {
    console.error(
      '[ADMIN SCHEDULE] Unexpected error:',
      error
    );

    await writeErrorAuditLog({
      actorId: authedUserId,
      actorRole: authedUserId ? 'admin' : null,
      action: 'MISSION_SCHEDULE_CHANGE_FAILED',
      targetType: 'mission',
      description: 'Unexpected error while updating a mission schedule.',
      error,
      context: { stage: 'unexpected' },
    });

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Unable to update the mission schedule.',
      },
      { status: 500 }
    );
  }
}