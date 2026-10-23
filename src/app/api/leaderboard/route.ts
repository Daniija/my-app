import {
  NextResponse,
} from 'next/server';

import {
  createClient,
} from '@/lib/supabase/server';

import {
  createAdminClient,
} from '@/lib/supabase/admin';

import {
  getCompletionTimes,
} from '@/lib/leaderboard';

import {
  writeErrorAuditLog,
} from '@/lib/audit';

export const dynamic =
  'force-dynamic';

export async function GET() {
  let authedUserId: string | null = null;

  try {
    const supabase =
      await createClient();

    const {
      data: { user },
    } =
      await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        {
          error:
            'Authentication required.',
        },
        {
          status: 401,
        }
      );
    }

    authedUserId = user.id;

    const admin =
      createAdminClient();

    const {
      data: playerProfiles,
      error: profileError,
    } = await admin
      .from('profiles')
      .select('id')
      .eq(
        'role',
        'player'
      )
      .eq(
        'is_active',
        true
      );

    if (profileError) {
      console.error(
        '[LEADERBOARD API] Player lookup failed:',
        profileError
      );

      await writeErrorAuditLog({
        actorId: user.id,
        actorRole: 'player',
        action: 'LEADERBOARD_LOAD_FAILED',
        description: 'Unable to load players for the leaderboard.',
        error: profileError,
        context: { stage: 'load_players' },
      });

      return NextResponse.json(
        {
          error:
            'Unable to load players.',
        },
        {
          status: 500,
        }
      );
    }

    const playerIds =
      (
        playerProfiles ??
        []
      ).map(
        (profile) =>
          profile.id
      );

    if (
      playerIds.length ===
      0
    ) {
      return NextResponse.json(
        {
          rows: [],
        },
        {
          headers: {
            'Cache-Control':
              'no-store',
          },
        }
      );
    }

    const {
      data,
      error,
    } = await admin
      .from(
        'leaderboard_entries'
      )
      .select(`
        player_id,
        alias,
        mission_1_score,
        mission_2_score,
        mission_3_score,
        mission_4_score,
        total_score,
        completed_count,
        total_time_override_seconds
      `)
      .in(
        'player_id',
        playerIds
      )
      .order(
        'total_score',
        {
          ascending:
            false,
        }
      )
      .order(
        'mission_4_score',
        {
          ascending:
            false,
        }
      )
      .order(
        'alias',
        {
          ascending:
            true,
        }
      );

    if (error) {
      console.error(
        '[LEADERBOARD API] Leaderboard query failed:',
        error
      );

      await writeErrorAuditLog({
        actorId: user.id,
        actorRole: 'player',
        action: 'LEADERBOARD_LOAD_FAILED',
        description: 'Unable to load the leaderboard entries.',
        error,
        context: { stage: 'load_entries' },
      });

      return NextResponse.json(
        {
          error:
            'Unable to load leaderboard.',
        },
        {
          status: 500,
        }
      );
    }

    const completionTimes =
      await getCompletionTimes(
        admin,
        playerIds
      );

    const rows =
      (data ?? []).map(
        (row) => ({
          ...row,
          // An admin-set override takes precedence over the computed
          // sum of mission_attempts durations -- see migration 014.
          total_time_seconds:
            row.total_time_override_seconds ??
            completionTimes.get(
              row.player_id
            )?.totalSeconds ??
            0,
        })
      );

    return NextResponse.json(
      {
        rows,
      },
      {
        headers: {
          'Cache-Control':
            'no-store',
        },
      }
    );
  } catch (error) {
    console.error(
      '[LEADERBOARD API]',
      error
    );

    await writeErrorAuditLog({
      actorId: authedUserId,
      actorRole: authedUserId ? 'player' : null,
      action: 'LEADERBOARD_LOAD_FAILED',
      description: 'Unexpected error loading the leaderboard.',
      error,
      context: { stage: 'unexpected' },
    });

    return NextResponse.json(
      {
        error:
          'Unable to load leaderboard.',
      },
      {
        status: 500,
      }
    );
  }
}