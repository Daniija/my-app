import { NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { writeErrorAuditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';

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

    const workLocationType = type === 'department' ? 'hq' : 'branch';
    const groupColumn = type === 'department' ? 'department' : 'branch';

    const admin = createAdminClient();

    const { data: playerProfiles, error: profileError } = await admin
      .from('profiles')
      .select(`id, ${groupColumn}`)
      .eq('role', 'player')
      .eq('is_active', true)
      .eq('work_location_type', workLocationType)
      .not(groupColumn, 'is', null);

    if (profileError) {
      console.error(
        '[LEADERBOARD GROUPS API] Player lookup failed:',
        profileError
      );

      await writeErrorAuditLog({
        actorId: user.id,
        actorRole: 'player',
        action: 'LEADERBOARD_LOAD_FAILED',
        description: `Unable to load players for the ${type} leaderboard.`,
        error: profileError,
        context: { stage: 'load_players', type },
      });

      return NextResponse.json(
        { error: 'Unable to load players.' },
        { status: 500 }
      );
    }

    const players = (playerProfiles ?? []) as Array<
      Record<string, string | null>
    >;

    const playerIds = players.map((player) => player.id as string);

    if (playerIds.length === 0) {
      return NextResponse.json(
        { rows: [] },
        { headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const { data: scores, error: scoreError } = await admin
      .from('leaderboard_entries')
      .select('player_id, total_score')
      .in('player_id', playerIds);

    if (scoreError) {
      console.error(
        '[LEADERBOARD GROUPS API] Score lookup failed:',
        scoreError
      );

      await writeErrorAuditLog({
        actorId: user.id,
        actorRole: 'player',
        action: 'LEADERBOARD_LOAD_FAILED',
        description: `Unable to load scores for the ${type} leaderboard.`,
        error: scoreError,
        context: { stage: 'load_scores', type },
      });

      return NextResponse.json(
        { error: 'Unable to load scores.' },
        { status: 500 }
      );
    }

    const scoreByPlayer = new Map(
      (scores ?? []).map((entry) => [entry.player_id, entry.total_score])
    );

    const groups = new Map<
      string,
      { participantCount: number; totalScore: number }
    >();

    for (const player of players) {
      const groupName = player[groupColumn];
      if (!groupName) continue;

      const totalScore = scoreByPlayer.get(player.id as string) ?? 0;
      const current = groups.get(groupName) ?? {
        participantCount: 0,
        totalScore: 0,
      };

      current.participantCount += 1;
      current.totalScore += totalScore;

      groups.set(groupName, current);
    }

    const rows = Array.from(groups.entries())
      .map(([name, stats]) => ({
        name,
        participantCount: stats.participantCount,
        averageScore: Math.round(stats.totalScore / stats.participantCount),
      }))
      .sort((a, b) => {
        if (b.averageScore !== a.averageScore) {
          return b.averageScore - a.averageScore;
        }

        return a.name.localeCompare(b.name);
      });

    return NextResponse.json(
      { rows },
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
