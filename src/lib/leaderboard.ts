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

// Same underlying mission_attempts timestamps as getCompletionTimes(),
// but scoped to a single mission_id and not summed across missions --
// this is what the weekly winner leaderboard needs to tie-break
// players who finished a given week with the same score: whoever
// completed *that specific mission* faster ranks higher.
export async function getMissionCompletionTimes(
  admin: AdminClient,
  playerIds: string[],
  missionId: number
): Promise<Map<string, number>> {
  const times = new Map<string, number>();

  if (playerIds.length === 0) {
    return times;
  }

  const { data, error } = await admin
    .from('mission_attempts')
    .select('player_id, started_at, completed_at')
    .eq('mission_id', missionId)
    .in('player_id', playerIds)
    .not('completed_at', 'is', null);

  if (error) {
    console.error(
      '[LEADERBOARD] Unable to load mission completion times:',
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

    // One attempt per player per mission is expected; if somehow more
    // than one exists, keep the fastest rather than summing them --
    // summing would misrepresent a single week's completion time.
    const existing = times.get(attempt.player_id);

    if (existing === undefined || seconds < existing) {
      times.set(attempt.player_id, seconds);
    }
  }

  return times;
}
