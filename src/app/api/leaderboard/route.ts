import {
  NextResponse,
} from 'next/server';

import {
  createClient,
} from '@/lib/supabase/server';

import {
  createAdminClient,
} from '@/lib/supabase/admin';

export const dynamic =
  'force-dynamic';

export async function GET() {
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
        completed_count
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

    return NextResponse.json(
      {
        rows:
          data ?? [],
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