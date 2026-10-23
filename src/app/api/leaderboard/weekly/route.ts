import { NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getMissionCompletionTimes } from '@/lib/leaderboard';
import { writeErrorAuditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';

const VALID_WEEKS = new Set([1, 2, 3, 4]);

// Ranks players for a single week (mission_id). Score comes straight
// from leaderboard_entries.mission_{week}_score -- the same
// server-computed, trigger-synced number the main leaderboard already
// uses, so there's no second scoring path to drift out of sync.
// Ties are broken by that week's own completion time (faster wins),
// read fresh from mission_attempts, then by alias.
export async function GET(request: Request) {
  let authedUserId: string | null = null;

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required.' },
        { status: 401 }
      );
    }

    authedUserId = user.id;

    const { searchParams } = new URL(request.url);
    const week = Number(searchParams.get('week'));

    if (!VALID_WEEKS.has(week)) {
      return NextResponse.json(
        { error: 'week must be 1, 2, 3, or 4.' },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    const { data: playerProfiles, error: profileError } = await admin
      .from('profiles')
      .select('id')
      .eq('role', 'player')
      .eq('is_active', true);

    if (profileError) {
      console.error(
        '[LEADERBOARD WEEKLY API] Player lookup failed:',
        profileError
      );

      await writeErrorAuditLog({
        actorId: user.id,
        actorRole: 'player',
        action: 'LEADERBOARD_LOAD_FAILED',
        description: `Unable to load players for the week ${week} leaderboard.`,
        error: profileError,
        context: { stage: 'load_players', week },
      });

      return NextResponse.json(
        { error: 'Unable to load players.' },
        { status: 500 }
      );
    }

    const playerIds = (playerProfiles ?? []).map((profile) => profile.id);

    if (playerIds.length === 0) {
      return NextResponse.json(
        { rows: [] },
        { headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const scoreColumn = `mission_${week}_score` as const;
    const timeOverrideColumn = `mission_${week}_time_override_seconds` as const;

    const { data: entries, error: scoreError } = await admin
      .from('leaderboard_entries')
      .select(`player_id, alias, ${scoreColumn}, ${timeOverrideColumn}`)
      .in('player_id', playerIds);

    if (scoreError) {
      console.error(
        '[LEADERBOARD WEEKLY API] Score lookup failed:',
        scoreError
      );

      await writeErrorAuditLog({
        actorId: user.id,
        actorRole: 'player',
        action: 'LEADERBOARD_LOAD_FAILED',
        description: `Unable to load scores for the week ${week} leaderboard.`,
        error: scoreError,
        context: { stage: 'load_scores', week },
      });

      return NextResponse.json(
        { error: 'Unable to load scores.' },
        { status: 500 }
      );
    }

    const completionTimes = await getMissionCompletionTimes(
      admin,
      playerIds,
      week
    );

    const rows = (
      entries as unknown as Array<{
        player_id: string;
        alias: string;
        [key: string]: unknown;
      }>
    )
      .map((entry) => ({
        player_id: entry.player_id,
        alias: entry.alias,
        score: Number(entry[scoreColumn] ?? 0),
        // An admin-set override for this week takes precedence over the
        // live computed time -- see migration 015. It only affects this
        // week's tie-break, never the Individual leaderboard.
        time_seconds:
          (entry[timeOverrideColumn] as number | null) ??
          completionTimes.get(entry.player_id) ??
          null,
      }))
      // Only players who actually scored on this week's mission count
      // as contenders for that week's leaderboard.
      .filter((row) => row.score > 0)
      .sort((a, b) => {
        if (b.score !== a.score) {
          return b.score - a.score;
        }

        const aTime = a.time_seconds ?? Infinity;
        const bTime = b.time_seconds ?? Infinity;

        if (aTime !== bTime) {
          return aTime - bTime;
        }

        return a.alias.localeCompare(b.alias);
      });

    return NextResponse.json(
      { rows },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    console.error('[LEADERBOARD WEEKLY API] Unexpected error:', error);

    await writeErrorAuditLog({
      actorId: authedUserId,
      actorRole: authedUserId ? 'player' : null,
      action: 'LEADERBOARD_LOAD_FAILED',
      description: 'Unexpected error loading a weekly leaderboard.',
      error,
    });

    return NextResponse.json(
      { error: 'Unable to load leaderboard.' },
      { status: 500 }
    );
  }
}
