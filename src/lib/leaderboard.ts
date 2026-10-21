import { createAdminClient } from '@/lib/supabase/admin';

type AdminClient = ReturnType<typeof createAdminClient>;

export type CompletionTime = {
  totalSeconds: number;
  completedMissions: number;
};

// Sums (completed_at - started_at) across each player's completed mission
// attempts, keyed by player_id. Reads the timestamps that mission_attempts
// already records, so it needs no schema change. A mission counts as
// completed once completed_at is set (status is 'submitted' at that point,
// not 'completed'), so we filter on completed_at rather than status.
export async function getCompletionTimes(
  admin: AdminClient,
  playerIds: string[]
): Promise<Map<string, CompletionTime>> {
  const times = new Map<string, CompletionTime>();

  if (playerIds.length === 0) {
    return times;
  }

  const { data, error } = await admin
    .from('mission_attempts')
    .select('player_id, started_at, completed_at')
    .in('player_id', playerIds)
    .not('completed_at', 'is', null);

  if (error) {
    console.error(
      '[LEADERBOARD] Unable to load completion times:',
      error
    );

    return times;
  }

  for (const attempt of data ?? []) {
    if (!attempt.started_at || !attempt.completed_at) {
      continue;
    }

    const started = new Date(attempt.started_at).getTime();
    const completed = new Date(attempt.completed_at).getTime();

    if (Number.isNaN(started) || Number.isNaN(completed)) {
      continue;
    }

    const seconds = Math.max(0, Math.round((completed - started) / 1000));

    const existing =
      times.get(attempt.player_id) ??
      { totalSeconds: 0, completedMissions: 0 };

    times.set(attempt.player_id, {
      totalSeconds: existing.totalSeconds + seconds,
      completedMissions: existing.completedMissions + 1,
    });
  }

  return times;
}
