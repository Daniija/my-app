'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

import MissionFourReport from './MissionFourReport';
import { getPreviewStageScores } from '@/lib/missions/mission-four-preview-score';
import {
  MISSION_FOUR_DURATION_SECONDS,
  MISSION_FOUR_STAGE_POINTS,
  type MissionFourStageName,
} from '@/lib/missions/mission-four-scoring';

// The admin preview report has no real attempt/mission_progress row
// to read from -- each preview stage is an independent page
// navigation. If the admin actually played through preview (scores
// recorded via mission-four-preview-score.ts as they went), this
// shows exactly what they earned. If they jumped straight here via
// the "Force Success/Failure" dev control with nothing recorded, it
// falls back to the full-marks sample view -- mirrors
// MissionThreeReportPreviewClient.tsx's exact convention.
export default function MissionFourReportPreviewClient() {
  const searchParams = useSearchParams();
  const forcedOutcome = searchParams.get('outcome');

  const [stageEarned, setStageEarned] = useState<
    Partial<Record<MissionFourStageName, number>> | null
  >(null);

  useEffect(() => {
    const recorded = getPreviewStageScores();

    // eslint-disable-next-line react-hooks/set-state-in-effect -- sessionStorage is browser-only and can't be read during render
    setStageEarned(
      Object.keys(recorded).length > 0 ? recorded : MISSION_FOUR_STAGE_POINTS
    );
  }, []);

  if (!stageEarned) {
    return null;
  }

  const totalScore = Object.values(stageEarned).reduce(
    (sum, points) => sum + (points ?? 0),
    0
  );

  const outcome: 'success' | 'failed' = forcedOutcome === 'failed' ? 'failed' : 'success';

  return (
    <MissionFourReport
      previewMode
      outcome={outcome}
      stageEarned={stageEarned}
      totalScore={totalScore}
      remainingSeconds={outcome === 'success' ? MISSION_FOUR_DURATION_SECONDS : 0}
    />
  );
}
