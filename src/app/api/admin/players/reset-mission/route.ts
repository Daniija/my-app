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

// Resets a single player's attempt at a single mission -- the
// per-player counterpart to /api/admin/missions/reset-all. Same
// safety rule: a player who already has a mission_scores row for
// this mission (a real finalized result) is never touched, no
// matter what their mission_attempts row says.
export async function POST(request: Request) {
  const guard = await requireAdminApi();
  if (!guard.ok) return guard.response;

  const { profile: adminProfile } = guard;
  const actorAlias = adminProfile.alias ?? adminProfile.username;

  let attemptedPlayerId: string | null = null;

  try {
    const body = await request.json().catch(() => null);

    const playerId =
      typeof body?.playerId === 'string' ? body.playerId : '';

    attemptedPlayerId = playerId || null;

    const missionId = parseMissionId(body?.missionId);

    if (!playerId || !missionId) {
      return NextResponse.json(
        { error: 'playerId and a valid missionId are required.' },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    const { data: target, error: targetError } = await admin
      .from('profiles')
      .select('id, alias, username')
      .eq('id', playerId)
      .single();

    if (targetError || !target) {
      return NextResponse.json(
        { error: 'Player account could not be found.' },
        { status: 404 }
      );
    }

    const { data: existingScore, error: scoreCheckError } = await admin
      .from('mission_scores')
      .select('id')
      .eq('player_id', playerId)
      .eq('mission_id', missionId)
      .maybeSingle();

    if (scoreCheckError) {
      console.error('[ADMIN RESET MISSION] Score check failed:', scoreCheckError);

      return NextResponse.json(
        { error: 'Unable to check this player\'s mission status.' },
        { status: 500 }
      );
    }

    if (existingScore) {
      return NextResponse.json({
        ok: true,
        reset: false,
        reason: 'already_completed',
      });
    }

    const { data: attempt, error: attemptError } = await admin
      .from('mission_attempts')
      .select('id')
      .eq('player_id', playerId)
      .eq('mission_id', missionId)
      .maybeSingle();

    if (attemptError) {
      console.error('[ADMIN RESET MISSION] Attempt lookup failed:', attemptError);

      return NextResponse.json(
        { error: 'Unable to load this player\'s attempt.' },
        { status: 500 }
      );
    }

    if (!attempt) {
      return NextResponse.json({
        ok: true,
        reset: false,
        reason: 'no_attempt',
      });
    }

    const { error: deleteError } = await admin
      .from('mission_attempts')
      .delete()
      .eq('id', attempt.id);

    if (deleteError) {
      console.error('[ADMIN RESET MISSION] Delete failed:', deleteError);

      await writeErrorAuditLog({
        actorId: adminProfile.id,
        actorAlias,
        actorRole: 'admin',
        action: 'PLAYER_MISSION_RESET_FAILED',
        targetType: 'player',
        targetId: playerId,
        description: `Unable to reset mission ${missionId} for ${target.alias ?? target.username}.`,
        error: deleteError,
        context: { missionId },
      });

      return NextResponse.json(
        { error: 'Unable to reset this player\'s attempt.' },
        { status: 500 }
      );
    }

    // Defensive leaderboard cleanup -- a no-op in practice since this
    // player was just confirmed to have no mission_scores row.
    const scoreColumn = MISSION_SCORE_COLUMNS[missionId];

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
      console.warn('[ADMIN RESET MISSION] Leaderboard cleanup warning:', leaderboardError);
    }

    await writeAuditLog({
      actorId: adminProfile.id,
      actorAlias,
      actorRole: 'admin',
      action: 'PLAYER_MISSION_RESET',
      targetType: 'player',
      targetId: playerId,
      description: `Reset mission ${missionId} for ${target.alias ?? target.username ?? 'a player'}.`,
      metadata: { missionId },
    });

    return NextResponse.json({ ok: true, reset: true });
  } catch (error) {
    console.error('[ADMIN RESET MISSION] Unexpected error:', error);

    await writeErrorAuditLog({
      actorId: adminProfile.id,
      actorAlias,
      actorRole: 'admin',
      action: 'PLAYER_MISSION_RESET_FAILED',
      targetType: 'player',
      targetId: attemptedPlayerId,
      description: 'Unexpected error resetting a player\'s mission attempt.',
      error,
      context: { stage: 'unexpected' },
    });

    return NextResponse.json(
      { error: 'Unable to reset this player\'s attempt.' },
      { status: 500 }
    );
  }
}
