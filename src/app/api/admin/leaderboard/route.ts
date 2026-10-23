import { NextResponse } from 'next/server';

import { requireAdminApi } from '@/lib/admin';
import { createAdminClient } from '@/lib/supabase/admin';
import { writeAuditLog, writeErrorAuditLog } from '@/lib/audit';

// Sets or clears an admin time override for a player. With no `week` in
// the request body, this targets leaderboard_entries.total_time_override_seconds
// (read by GET /api/leaderboard, Individual leaderboard only). With a
// `week` (1-4), it instead targets that week's
// mission_{week}_time_override_seconds (read by GET /api/leaderboard/weekly,
// Weekly Winner tab only). The two are independent -- a per-week override
// never changes the Individual leaderboard, and the total override never
// changes a Weekly Winner tab.
const WEEK_COLUMNS: Record<number, string> = {
  1: 'mission_1_time_override_seconds',
  2: 'mission_2_time_override_seconds',
  3: 'mission_3_time_override_seconds',
  4: 'mission_4_time_override_seconds',
};

export async function POST(request: Request) {
  let actorId: string | null = null;
  let actorAlias: string | null = null;
  let attemptedPlayerId: string | null = null;

  try {
    const guard = await requireAdminApi();
    if (!guard.ok) return guard.response;

    const { profile: adminProfile } = guard;
    actorId = adminProfile.id;
    actorAlias = adminProfile.alias ?? adminProfile.username;

    const body = await request.json().catch(() => null);

    const playerId =
      typeof body?.playerId === 'string' ? body.playerId : '';

    attemptedPlayerId = playerId || null;

    const rawWeek = body?.week;
    const hasWeek = rawWeek !== undefined && rawWeek !== null;

    if (hasWeek && !WEEK_COLUMNS[rawWeek]) {
      return NextResponse.json(
        { error: 'week must be 1, 2, 3, or 4.' },
        { status: 400 }
      );
    }

    const column = hasWeek
      ? WEEK_COLUMNS[rawWeek]
      : 'total_time_override_seconds';

    // null clears the override and falls back to the computed time.
    const rawSeconds = body?.seconds;
    const clearing = rawSeconds === null;

    if (!playerId) {
      return NextResponse.json(
        { error: 'playerId is required.' },
        { status: 400 }
      );
    }

    if (
      !clearing &&
      (
        typeof rawSeconds !== 'number' ||
        !Number.isFinite(rawSeconds) ||
        rawSeconds < 0 ||
        !Number.isInteger(rawSeconds)
      )
    ) {
      return NextResponse.json(
        { error: 'seconds must be a non-negative whole number, or null to clear.' },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    const { data: target, error: targetError } = await admin
      .from('leaderboard_entries')
      .select('player_id, alias')
      .eq('player_id', playerId)
      .single();

    if (targetError || !target) {
      return NextResponse.json(
        { error: 'Leaderboard entry could not be found for this player.' },
        { status: 404 }
      );
    }

    const seconds = clearing ? null : rawSeconds;

    const { error: updateError } = await admin
      .from('leaderboard_entries')
      .update({ [column]: seconds })
      .eq('player_id', playerId);

    const scopeLabel = hasWeek
      ? `Week ${rawWeek} leaderboard`
      : 'individual leaderboard';

    if (updateError) {
      console.error(
        '[ADMIN LEADERBOARD] Time override update failed:',
        updateError
      );

      await writeErrorAuditLog({
        actorId: adminProfile.id,
        actorAlias,
        actorRole: 'admin',
        action: 'LEADERBOARD_TIME_OVERRIDE_FAILED',
        targetType: 'player',
        targetId: playerId,
        description: `Unable to update the ${scopeLabel} time for ${target.alias}.`,
        error: updateError,
        context: { stage: 'update_override', seconds, week: hasWeek ? rawWeek : null },
      });

      return NextResponse.json(
        { error: updateError.message || 'Unable to update the leaderboard time.' },
        { status: 500 }
      );
    }

    await writeAuditLog({
      actorId: adminProfile.id,
      actorAlias,
      actorRole: 'admin',
      action: clearing
        ? 'LEADERBOARD_TIME_OVERRIDE_CLEARED'
        : 'LEADERBOARD_TIME_OVERRIDE_SET',
      targetType: 'player',
      targetId: playerId,
      description: clearing
        ? `Cleared the ${scopeLabel} time override for ${target.alias}.`
        : `Set the ${scopeLabel} time for ${target.alias} to ${seconds} seconds.`,
      metadata: { seconds, week: hasWeek ? rawWeek : null },
    });

    return NextResponse.json({
      ok: true,
      playerId,
      week: hasWeek ? rawWeek : null,
      [column]: seconds,
    });
  } catch (error) {
    console.error('[ADMIN LEADERBOARD] Unexpected error:', error);

    await writeErrorAuditLog({
      actorId,
      actorAlias,
      actorRole: actorId ? 'admin' : null,
      action: 'LEADERBOARD_TIME_OVERRIDE_FAILED',
      targetType: 'player',
      targetId: attemptedPlayerId,
      description: 'Unexpected error updating a leaderboard time override.',
      error,
      context: { stage: 'unexpected' },
    });

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Unable to update the leaderboard time.',
      },
      { status: 500 }
    );
  }
}
