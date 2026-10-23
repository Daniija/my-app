import { NextResponse } from 'next/server';

import { requireAdminApi } from '@/lib/admin';
import { createAdminClient } from '@/lib/supabase/admin';
import { writeAuditLog, writeErrorAuditLog } from '@/lib/audit';

const MISSION_SCORE_COLUMNS: Record<number, string> = {
  1: 'mission_1_score',
  2: 'mission_2_score',
  3: 'mission_3_score',
  4: 'mission_4_score',
};

function parseMissionId(value: unknown): number | null {
  const missionId = Number(value);

  if (!Number.isInteger(missionId) || !MISSION_SCORE_COLUMNS[missionId]) {
    return null;
  }

  return missionId;
}

// A player "has completed" a mission once mission_scores holds a row
// for (player_id, mission_id) -- that row is only ever written once,
// at full finalization (see finalizeMissionThreeScore /
// finalizeMissionTwoScore), and is the real leaderboard result. Both
// GET and POST below exclude those players unconditionally, no
// matter what stage their mission_attempts row claims to be at --
// this button resets in-progress attempts, it never touches a real
// completed result.
async function findResetEligibleAttempts(
  admin: ReturnType<typeof createAdminClient>,
  missionId: number
) {
  const [{ data: attempts, error: attemptsError }, { data: scored, error: scoredError }] =
    await Promise.all([
      admin
        .from('mission_attempts')
        .select('id, player_id, profiles(alias, username)')
        .eq('mission_id', missionId),
      admin.from('mission_scores').select('player_id').eq('mission_id', missionId),
    ]);

  if (attemptsError || scoredError) {
    return { error: attemptsError ?? scoredError };
  }

  const scoredPlayerIds = new Set((scored ?? []).map((row) => row.player_id));

  const eligible = (
    attempts as unknown as Array<{
      id: string;
      player_id: string;
      profiles: { alias: string | null; username: string | null } | null;
    }>
  ).filter((attempt) => !scoredPlayerIds.has(attempt.player_id));

  return { eligible };
}

// GET: counts in-progress (not-yet-completed) attempts for a mission
// -- used to populate the admin confirmation dialog before resetting.
export async function GET(request: Request) {
  const guard = await requireAdminApi();
  if (!guard.ok) return guard.response;

  const missionId = parseMissionId(
    new URL(request.url).searchParams.get('missionId')
  );

  if (!missionId) {
    return NextResponse.json(
      { error: 'missionId must be 1, 2, 3, or 4.' },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const { eligible, error } = await findResetEligibleAttempts(admin, missionId);

  if (error) {
    console.error('[ADMIN RESET ALL] Lookup failed:', error);

    return NextResponse.json(
      { error: 'Unable to load in-progress attempts.' },
      { status: 500 }
    );
  }

  const players = (eligible ?? []).map((attempt) => ({
    id: attempt.player_id,
    alias:
      attempt.profiles?.alias ?? attempt.profiles?.username ?? 'Unknown player',
  }));

  return NextResponse.json(
    { players, count: players.length },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}

// POST: deletes every in-progress (not-yet-completed) attempt for a
// mission, so those players start over. Deleting mission_attempts
// cascades to mission_progress and mission_scores for that attempt
// (both "on delete cascade" on attempt_id -- see migration 001), but
// completed players are excluded before this ever runs, so no real
// mission_scores row is ever at risk here.
export async function POST(request: Request) {
  const guard = await requireAdminApi();
  if (!guard.ok) return guard.response;

  const { profile: adminProfile } = guard;
  const actorAlias = adminProfile.alias ?? adminProfile.username;

  try {
    const body = await request.json().catch(() => null);
    const missionId = parseMissionId(body?.missionId);

    if (!missionId) {
      return NextResponse.json(
        { error: 'missionId must be 1, 2, 3, or 4.' },
        { status: 400 }
      );
    }

    const admin = createAdminClient();
    const scoreColumn = MISSION_SCORE_COLUMNS[missionId];

    const { eligible, error: lookupError } = await findResetEligibleAttempts(
      admin,
      missionId
    );

    if (lookupError) {
      console.error('[ADMIN RESET ALL] Lookup failed:', lookupError);

      return NextResponse.json(
        { error: 'Unable to load in-progress attempts.' },
        { status: 500 }
      );
    }

    const attemptIds = (eligible ?? []).map((row) => row.id);
    const playerIds = (eligible ?? []).map((row) => row.player_id);

    if (attemptIds.length === 0) {
      return NextResponse.json({ ok: true, resetCount: 0 });
    }

    const { error: deleteError } = await admin
      .from('mission_attempts')
      .delete()
      .in('id', attemptIds);

    if (deleteError) {
      console.error('[ADMIN RESET ALL] Delete failed:', deleteError);

      await writeErrorAuditLog({
        actorId: adminProfile.id,
        actorAlias,
        actorRole: 'admin',
        action: 'MISSION_RESET_ALL_FAILED',
        targetType: 'mission',
        targetId: String(missionId),
        description: `Unable to reset in-progress attempts for mission ${missionId}.`,
        error: deleteError,
        context: { missionId, attemptCount: attemptIds.length },
      });

      return NextResponse.json(
        { error: 'Unable to reset attempts.' },
        { status: 500 }
      );
    }

    // Defensive leaderboard cleanup -- every player here was excluded
    // from having a mission_scores row, so this should be a no-op in
    // practice, same reasoning as reset-stuck/route.ts.
    for (const playerId of playerIds) {
      const { data: officialScores } = await admin
        .from('mission_scores')
        .select('mission_id, total_score')
        .eq('player_id', playerId);

      const scoreMap = new Map<number, number>(
        (officialScores ?? []).map((score) => [
          Number(score.mission_id),
          Number(score.total_score ?? 0),
        ])
      );

      const missionScores = [1, 2, 3, 4].map(
        (id) => (id === missionId ? 0 : scoreMap.get(id) ?? 0)
      );

      const { error: leaderboardError } = await admin
        .from('leaderboard_entries')
        .update({
          [scoreColumn]: 0,
          total_score: missionScores.reduce((sum, s) => sum + s, 0),
          completed_count: missionScores.filter((s) => s > 0).length,
          updated_at: new Date().toISOString(),
        })
        .eq('player_id', playerId);

      if (leaderboardError) {
        console.warn(
          '[ADMIN RESET ALL] Leaderboard cleanup warning:',
          leaderboardError
        );
      }
    }

    await writeAuditLog({
      actorId: adminProfile.id,
      actorAlias,
      actorRole: 'admin',
      action: 'MISSION_RESET_ALL',
      targetType: 'mission',
      targetId: String(missionId),
      description: `Reset ${attemptIds.length} in-progress attempt(s) for mission ${missionId} (players who had already completed it were excluded).`,
      metadata: { missionId, playerIds, attemptCount: attemptIds.length },
    });

    return NextResponse.json({ ok: true, resetCount: attemptIds.length });
  } catch (error) {
    console.error('[ADMIN RESET ALL] Unexpected error:', error);

    await writeErrorAuditLog({
      actorId: adminProfile.id,
      actorAlias,
      actorRole: 'admin',
      action: 'MISSION_RESET_ALL_FAILED',
      description: 'Unexpected error resetting in-progress mission attempts.',
      error,
      context: { stage: 'unexpected' },
    });

    return NextResponse.json(
      { error: 'Unable to reset attempts.' },
      { status: 500 }
    );
  }
}
