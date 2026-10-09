import Link from 'next/link';

import LeaderboardLive from '@/components/LeaderboardLive';
import { requireUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function Leaderboard() {
  const { supabase } =
    await requireUser();

  const {
    data: playerProfiles,
    error: profileError,
  } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'player');

  if (profileError) {
    console.error(
      '[LEADERBOARD] Unable to load player profiles:',
      profileError
    );
  }

  const playerIds =
    (playerProfiles ?? []).map(
      (profile) => profile.id
    );

  let data: any[] = [];

  if (playerIds.length > 0) {
    const {
      data: leaderboardData,
      error: leaderboardError,
    } = await supabase
      .from('leaderboard_entries')
      .select('*')
      .in('player_id', playerIds)
      .order('total_score', {
        ascending: false,
      })
      .order('mission_4_score', {
        ascending: false,
      })
      .order('alias');

    if (leaderboardError) {
      console.error(
        '[LEADERBOARD] Unable to load leaderboard:',
        leaderboardError
      );
    }

    data =
      leaderboardData ?? [];
  }

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
        <LeaderboardLive
          initial={data as any}
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