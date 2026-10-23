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

// GET: counts players currently stuck at the very first stage of a
// mission with zero progress (status='active', current_stage='briefing')
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

  const { data, error } = await admin
    .from('mission_attempts')
    .select('player_id, profiles(alias, username)')
    .eq('mission_id', missionId)
    .eq('status', 'active')
    .eq('current_stage', 'briefing');

  if (error) {
    console.error('[ADMIN RESET STUCK] Lookup failed:', error);

    return NextResponse.json(
      { error: 'Unable to load stuck attempts.' },
      { status: 500 }
    );
  }

  const players = (
    data as unknown as Array<{
      player_id: string;
      profiles: { alias: string | null; username: string | null } | null;
    }>
  ).map((row) => ({
    id: row.player_id,
    alias: row.profiles?.alias ?? row.profiles?.username ?? 'Unknown player',
  }));

  return NextResponse.json(
    { players, count: players.length },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}

// POST: deletes every attempt stuck at the very first stage (briefing,
// zero progress) for a mission, so those players can start fresh.
// Deleting mission_attempts cascades to mission_progress and
// mission_scores for that attempt (both reference attempt_id
// "on delete cascade" -- see migration 001). A player stuck at
// "briefing" has never had a mission_scores row written (that only
// happens at full completion, see finalizeMissionThreeScore /
// finalizeMissionTwoScore), so this never removes a real score --
// the leaderboard zero-out below is a defensive no-op for the normal
// case, not the primary mechanism.
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

    const { data: stuckAttempts, error: lookupError } = await admin
      .from('mission_attempts')
      .select('id, player_id')
      .eq('mission_id', missionId)
      .eq('status', 'active')
      .eq('current_stage', 'briefing');

    if (lookupError) {
      console.error('[ADMIN RESET STUCK] Lookup failed:', lookupError);

      return NextResponse.json(
        { error: 'Unable to load stuck attempts.' },
        { status: 500 }
      );
    }

    const attemptIds = (stuckAttempts ?? []).map((row) => row.id);
    const playerIds = (stuckAttempts ?? []).map((row) => row.player_id);

    if (attemptIds.length === 0) {
      return NextResponse.json({ ok: true, resetCount: 0 });
    }

    const { error: deleteError } = await admin
      .from('mission_attempts')
      .delete()
      .in('id', attemptIds);

    if (deleteError) {
      console.error('[ADMIN RESET STUCK] Delete failed:', deleteError);

      await writeErrorAuditLog({
        actorId: adminProfile.id,
        actorAlias,
        actorRole: 'admin',
        action: 'MISSION_RESET_STUCK_FAILED',
        targetType: 'mission',
        targetId: String(missionId),
        description: `Unable to reset stuck attempts for mission ${missionId}.`,
        error: deleteError,
        context: { missionId, attemptCount: attemptIds.length },
      });

      return NextResponse.json(
        { error: 'Unable to reset stuck attempts.' },
        { status: 500 }
      );
    }

    // Defensive leaderboard cleanup -- see function comment above for
    // why this should normally be a no-op.
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
          '[ADMIN RESET STUCK] Leaderboard cleanup warning:',
          leaderboardError
        );
      }
    }

    await writeAuditLog({
      actorId: adminProfile.id,
      actorAlias,
      actorRole: 'admin',
      action: 'MISSION_RESET_STUCK',
      targetType: 'mission',
      targetId: String(missionId),
      description: `Reset ${attemptIds.length} stuck attempt(s) for mission ${missionId}, allowing those players to start over.`,
      metadata: { missionId, playerIds, attemptCount: attemptIds.length },
    });

    return NextResponse.json({ ok: true, resetCount: attemptIds.length });
  } catch (error) {
    console.error('[ADMIN RESET STUCK] Unexpected error:', error);

    await writeErrorAuditLog({
      actorId: adminProfile.id,
      actorAlias,
      actorRole: 'admin',
      action: 'MISSION_RESET_STUCK_FAILED',
      description: 'Unexpected error resetting stuck mission attempts.',
      error,
      context: { stage: 'unexpected' },
    });

    return NextResponse.json(
      { error: 'Unable to reset stuck attempts.' },
      { status: 500 }
    );
  }
}
