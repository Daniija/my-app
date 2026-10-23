import AdminLeaderboardTimeEditor from '@/components/AdminLeaderboardTimeEditor';
import { requireAdmin } from '@/lib/admin';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  getCompletionTimes,
  getMissionCompletionTimes,
} from '@/lib/leaderboard';

const WEEKS = [1, 2, 3, 4] as const;

export default async function AdminLeaderboardPage() {
  await requireAdmin();

  const admin = createAdminClient();

  const { data: entries } = await admin
    .from('leaderboard_entries')
    .select(`
      player_id,
      alias,
      total_score,
      total_time_override_seconds,
      mission_1_score,
      mission_2_score,
      mission_3_score,
      mission_4_score,
      mission_1_time_override_seconds,
      mission_2_time_override_seconds,
      mission_3_time_override_seconds,
      mission_4_time_override_seconds
    `)
    .order('alias', { ascending: true });

  const playerIds = (entries ?? []).map((entry) => entry.player_id);

  const [totalCompletionTimes, ...weeklyCompletionTimes] = await Promise.all([
    getCompletionTimes(admin, playerIds),
    ...WEEKS.map((week) => getMissionCompletionTimes(admin, playerIds, week)),
  ]);

  const rows = (entries ?? []).map((entry) => ({
    player_id: entry.player_id,
    alias: entry.alias,
    total: {
      score: entry.total_score,
      computed_seconds:
        totalCompletionTimes.get(entry.player_id)?.totalSeconds ?? 0,
      override_seconds: entry.total_time_override_seconds,
    },
    weeks: WEEKS.reduce(
      (acc, week, index) => {
        acc[week] = {
          score: entry[`mission_${week}_score` as const] ?? 0,
          computed_seconds:
            weeklyCompletionTimes[index].get(entry.player_id) ?? 0,
          override_seconds:
            entry[`mission_${week}_time_override_seconds` as const],
        };
        return acc;
      },
      {} as Record<
        (typeof WEEKS)[number],
        { score: number; computed_seconds: number; override_seconds: number | null }
      >
    ),
  }));

  return (
    <main className="mx-auto max-w-6xl p-6">
      <span className="badge">LEADERBOARD</span>

      <h1 className="mt-3 text-4xl font-black">Leaderboard Times</h1>

      <p className="muted mt-2">
        Set a time override for the Individual leaderboard, or for a
        specific week&apos;s tie-break on the Weekly Winner leaderboard.
        These are independent -- a week override only re-ranks that week&apos;s
        tab, and the Individual override only changes the Individual total
        time shown.
      </p>

      <div className="mt-6">
        <AdminLeaderboardTimeEditor rows={rows} />
      </div>
    </main>
  );
}
