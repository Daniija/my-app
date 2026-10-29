import { NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { writeErrorAuditLog } from '@/lib/audit';
import { getMissionCompletionTimes } from '@/lib/leaderboard';

export const dynamic = 'force-dynamic';

type AdminClient = ReturnType<typeof createAdminClient>;

const WEEKS = [1, 2, 3, 4] as const;

// Points a player earns for a given rank (0-indexed) on a single
// week's Weekly Winner leaderboard. 1st = 5, 2nd = 3, 3rd = 2,
// everyone else who actually scored that week = 1. A player who
// didn't score at all that week never enters this ranking, so they
// earn 0 for it.
function pointsForRank(rank: number): number {
  if (rank === 0) return 5;
  if (rank === 1) return 3;
  if (rank === 2) return 2;
  return 1;
}

type LeaderboardEntryRow = {
  player_id: string;
  alias: string;
  mission_1_score: number | null;
  mission_2_score: number | null;
  mission_3_score: number | null;
  mission_4_score: number | null;
  mission_1_time_override_seconds: number | null;
  mission_2_time_override_seconds: number | null;
  mission_3_time_override_seconds: number | null;
  mission_4_time_override_seconds: number | null;
};

type GroupRow = { name: string; participantCount: number; averageScore: number };

// Shared by both department and branch: position-based points. Each
// week's rank is derived with the exact same ordering
// /api/leaderboard/weekly uses (score desc, then that week's
// completion time -- admin override if set, else computed -- asc,
// then alias asc), so a group's total always matches what players
// see on the public Weekly Winner leaderboard. A group's score is
// the SUM of every member's earned points across weeks 1-4 (not
// averaged) -- a player who never scored in a given week contributes
// 0 for it.
async function computeGroupPoints(
  admin: AdminClient,
  groupColumn: 'department' | 'branch',
  workLocationType: 'hq' | 'branch'
): Promise<{ rows?: GroupRow[]; errorStage?: string; error?: unknown }> {
  const { data: playerProfiles, error: profileError } = await admin
    .from('profiles')
    .select(`id, ${groupColumn}`)
    .eq('role', 'player')
    .eq('is_active', true)
    .eq('work_location_type', workLocationType)
    .not(groupColumn, 'is', null);

  if (profileError) {
    return { errorStage: 'load_players', error: profileError };
  }

  const players = (playerProfiles ?? []) as Array<Record<string, string | null>>;
  const playerIds = players.map((player) => player.id as string);

  if (playerIds.length === 0) {
    return { rows: [] };
  }

  const { data: entries, error: entriesError } = await admin
    .from('leaderboard_entries')
    .select(`
      player_id,
      alias,
      mission_1_score,
      mission_2_score,
      mission_3_score,
      mission_4_score,
      mission_1_time_override_seconds,
      mission_2_time_override_seconds,
      mission_3_time_override_seconds,
      mission_4_time_override_seconds
    `)
    .in('player_id', playerIds);

  if (entriesError) {
    return { errorStage: 'load_entries', error: entriesError };
  }

  const entryByPlayer = new Map(
    (entries as unknown as LeaderboardEntryRow[] | null ?? []).map(
      (entry) => [entry.player_id, entry]
    )
  );

  const pointsByPlayer = new Map<string, number>();

  for (const week of WEEKS) {
    const scoreColumn = `mission_${week}_score` as const;
    const timeOverrideColumn = `mission_${week}_time_override_seconds` as const;

    const completionTimes = await getMissionCompletionTimes(admin, playerIds, week);

    const ranked = playerIds
      .map((playerId) => {
        const entry = entryByPlayer.get(playerId);

        if (!entry) {
          return null;
        }

        return {
          playerId,
          alias: entry.alias,
          score: Number(entry[scoreColumn] ?? 0),
          time:
            entry[timeOverrideColumn] ??
            completionTimes.get(playerId) ??
            null,
        };
      })
      .filter(
        (row): row is NonNullable<typeof row> => row !== null && row.score > 0
      )
      .sort((a, b) => {
        if (b.score !== a.score) {
          return b.score - a.score;
        }

        const aTime = a.time ?? Infinity;
        const bTime = b.time ?? Infinity;

        if (aTime !== bTime) {
          return aTime - bTime;
        }

        return a.alias.localeCompare(b.alias);
      });

    ranked.forEach((row, index) => {
      const points = pointsForRank(index);

      pointsByPlayer.set(
        row.playerId,
        (pointsByPlayer.get(row.playerId) ?? 0) + points
      );
    });
  }

  const groups = new Map<string, { participantCount: number; totalPoints: number }>();

  for (const player of players) {
    const groupName = player[groupColumn];
    if (!groupName) continue;

    const current = groups.get(groupName) ?? {
      participantCount: 0,
      totalPoints: 0,
    };

    current.participantCount += 1;
    current.totalPoints += pointsByPlayer.get(player.id as string) ?? 0;

    groups.set(groupName, current);
  }

  const rows = Array.from(groups.entries())
    .map(([name, stats]) => ({
      name,
      participantCount: stats.participantCount,
      averageScore: stats.totalPoints,
    }))
    .sort((a, b) => {
      if (b.averageScore !== a.averageScore) {
        return b.averageScore - a.averageScore;
      }

      return a.name.localeCompare(b.name);
    });

  return { rows };
}

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
    const type = searchParams.get('type');

    if (type !== 'department' && type !== 'branch') {
      return NextResponse.json(
        { error: "type must be 'department' or 'branch'." },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    const groupColumn = type === 'department' ? 'department' : 'branch';
    const workLocationType = type === 'department' ? 'hq' : 'branch';

    const result = await computeGroupPoints(admin, groupColumn, workLocationType);

    if (result.error) {
      console.error(
        `[LEADERBOARD GROUPS API] ${result.errorStage} failed:`,
        result.error
      );

      await writeErrorAuditLog({
        actorId: user.id,
        actorRole: 'player',
        action: 'LEADERBOARD_LOAD_FAILED',
        description: `Unable to load the ${type} leaderboard.`,
        error: result.error,
        context: { stage: result.errorStage, type },
      });

      return NextResponse.json(
        { error: 'Unable to load leaderboard.' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { rows: result.rows ?? [] },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    console.error('[LEADERBOARD GROUPS API] Unexpected error:', error);

    await writeErrorAuditLog({
      actorId: authedUserId,
      actorRole: authedUserId ? 'player' : null,
      action: 'LEADERBOARD_LOAD_FAILED',
      description: 'Unexpected error loading a group leaderboard.',
      error,
      context: { stage: 'unexpected' },
    });

    return NextResponse.json(
      { error: 'Unable to load leaderboard.' },
      { status: 500 }
    );
  }
}
