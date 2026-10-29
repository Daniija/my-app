import { randomUUID } from 'crypto';

import { createAdminClient } from '@/lib/supabase/admin';
import { clampMissionScore } from './mission-four-scoring';

// Writes the final, server-computed Mission 04 total into
// mission_scores and recomputes leaderboard_entries -- mirrors
// finalizeMissionThreeScore() in mission-three-finalize.ts exactly:
// admin client only (players never write their own score row
// directly), and missions with no mission_scores row of their own
// fall back to whatever is already on the leaderboard rather than
// being blindly zeroed.
//
// Idempotent: if a mission_scores row for mission_id=4 already
// exists for this player, nothing is recomputed or re-written --
// this is what keeps a retried/duplicate final submission from
// awarding the mission score twice.
export async function finalizeMissionFourScore({
  playerId,
  playerAlias,
  attemptId,
  rawTotal,
}: {
  playerId: string;
  playerAlias: string | null;
  attemptId: string;
  rawTotal: number;
}): Promise<{ missionFourScore: number; alreadyFinalized: boolean }> {
  const admin = createAdminClient();

  const { data: existingScore, error: existingScoreError } = await admin
    .from('mission_scores')
    .select('id, total_score')
    .eq('player_id', playerId)
    .eq('mission_id', 4)
    .maybeSingle();

  if (existingScoreError) {
    throw new Error(
      `Unable to check the existing Mission 04 score: ${existingScoreError.message}`
    );
  }

  if (existingScore) {
    return {
      missionFourScore: Number(existingScore.total_score ?? 0),
      alreadyFinalized: true,
    };
  }

  const missionFourScore = clampMissionScore(rawTotal);
  const now = new Date().toISOString();

  const { error: scoreInsertError } = await admin.from('mission_scores').insert({
    id: randomUUID(),
    attempt_id: attemptId,
    player_id: playerId,
    mission_id: 4,
    breakdown: { total: missionFourScore },
    base_score: missionFourScore,
    bonus_score: 0,
    total_score: missionFourScore,
    accuracy_points: missionFourScore,
    created_at: now,
    updated_at: now,
  });

  if (scoreInsertError) {
    throw new Error(`Unable to save the Mission 04 score: ${scoreInsertError.message}`);
  }

  const { data: officialScores, error: officialScoresError } = await admin
    .from('mission_scores')
    .select('mission_id, total_score')
    .eq('player_id', playerId);

  if (officialScoresError) {
    throw new Error(
      `Unable to load cumulative scores: ${officialScoresError.message}`
    );
  }

  const { data: currentLeaderboard, error: leaderboardLookupError } = await admin
    .from('leaderboard_entries')
    .select('player_id, alias, mission_1_score, mission_2_score, mission_3_score, mission_4_score')
    .eq('player_id', playerId)
    .maybeSingle();

  if (leaderboardLookupError) {
    throw new Error(
      `Unable to load the leaderboard entry: ${leaderboardLookupError.message}`
    );
  }

  const scoreMap = new Map<number, number>(
    (officialScores ?? []).map((score) => [
      Number(score.mission_id),
      Number(score.total_score ?? 0),
    ])
  );

  const mission1Score = scoreMap.get(1) ?? Number(currentLeaderboard?.mission_1_score ?? 0);
  const mission2Score = scoreMap.get(2) ?? Number(currentLeaderboard?.mission_2_score ?? 0);
  const mission3Score = scoreMap.get(3) ?? Number(currentLeaderboard?.mission_3_score ?? 0);
  const mission4Score = scoreMap.get(4) ?? missionFourScore;

  const totalScore = mission1Score + mission2Score + mission3Score + mission4Score;

  const completedCount = [mission1Score, mission2Score, mission3Score, mission4Score].filter(
    (score) => score > 0
  ).length;

  const leaderboardPayload = {
    alias: playerAlias?.trim() || currentLeaderboard?.alias || 'Agent',
    mission_1_score: mission1Score,
    mission_2_score: mission2Score,
    mission_3_score: mission3Score,
    mission_4_score: mission4Score,
    total_score: totalScore,
    completed_count: completedCount,
    updated_at: now,
  };

  if (currentLeaderboard) {
    const { error: leaderboardUpdateError } = await admin
      .from('leaderboard_entries')
      .update(leaderboardPayload)
      .eq('player_id', playerId);

    if (leaderboardUpdateError) {
      throw new Error(`Unable to update the leaderboard: ${leaderboardUpdateError.message}`);
    }
  } else {
    const { error: leaderboardInsertError } = await admin
      .from('leaderboard_entries')
      .insert({ player_id: playerId, ...leaderboardPayload });

    if (leaderboardInsertError) {
      throw new Error(
        `Unable to create the leaderboard entry: ${leaderboardInsertError.message}`
      );
    }
  }

  return { missionFourScore, alreadyFinalized: false };
}
