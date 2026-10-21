import Link from 'next/link';

import LeaderboardTabs from '@/components/LeaderboardTabs';
import { requireUser } from '@/lib/auth';
import { getCompletionTimes } from '@/lib/leaderboard';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export default async function Leaderboard() {
  // ----------------------------------
  // REQUIRE LOGIN
  // ----------------------------------

  await requireUser();

  // ----------------------------------
  // SERVER-ONLY ADMIN CLIENT
  // ----------------------------------
  // This is important because normal
  // player RLS may only allow players
  // to see their own profile/score.
  // ----------------------------------

  const admin =
    createAdminClient();

  // ----------------------------------
  // LOAD ACTIVE PLAYER ACCOUNTS
  // ----------------------------------

  const {
    data: playerProfiles,
    error: profileError,
  } = await admin
    .from('profiles')
    .select('id')
    .eq('role', 'player')
    .eq('is_active', true);

  if (profileError) {
    console.error(
      '[LEADERBOARD] Unable to load player profiles:',
      profileError
    );
  }

  const playerIds =
    (playerProfiles ?? []).map(
      (profile) =>
        profile.id
    );

  // ----------------------------------
  // LOAD FULL LEADERBOARD
  // ----------------------------------

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- leaderboard rows are returned untyped from Supabase
  let data: any[] = [];

  if (
    playerIds.length > 0
  ) {
    const {
      data: leaderboardData,
      error: leaderboardError,
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
          ascending: false,
        }
      )
      .order(
        'mission_4_score',
        {
          ascending: false,
        }
      )
      .order(
        'alias',
        {
          ascending: true,
        }
      );

    if (
      leaderboardError
    ) {
      console.error(
        '[LEADERBOARD] Unable to load leaderboard:',
        leaderboardError
      );
    }

    data =
      leaderboardData ?? [];
  }

  // ----------------------------------
  // ATTACH TIME TAKEN
  // ----------------------------------
  // Derived live from mission_attempts
  // timestamps — no new columns, so
  // the database is left untouched.
  // ----------------------------------

  const completionTimes =
    await getCompletionTimes(
      admin,
      playerIds
    );

  data = data.map((row) => ({
    ...row,
    total_time_seconds:
      completionTimes.get(row.player_id)
        ?.totalSeconds ?? 0,
  }));

  // ----------------------------------
  // PAGE
  // ----------------------------------

  return (
    <main className="mx-auto max-w-4xl px-5 py-8">
      <header className="text-center">
        <span className="badge">
          CYBER DEFENCE UNIT
        </span>

        <h1 className="mt-3 text-4xl font-black md:text-5xl">
          LIVE LEADERBOARD
        </h1>

        <p className="muted mt-2">
          Cumulative scores remain active through
          the final Friday.
        </p>
      </header>

      <section className="mt-7">
        <LeaderboardTabs
          initial={data}
        />
      </section>

      <div className="mt-8 flex justify-center">
        <Link
          href="/dashboard"
          className="btn btn-secondary"
        >
          ← Return to Dashboard
        </Link>
      </div>
    </main>
  );
}