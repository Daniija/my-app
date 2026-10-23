'use client';

import { useEffect, useState } from 'react';

import MissionThreeReport from './MissionThreeReport';
import { getPreviewStageScores } from '@/lib/missions/mission-three-preview-score';
import {
  MISSION_THREE_STAGE_POINTS,
  type MissionThreeStage,
} from '@/lib/missions/mission-three-scoring';

// The admin preview report has no real attempt/mission_progress row
// to read from -- each preview stage is an independent page
// navigation. If the admin actually played through preview (scores
// recorded via mission-three-preview-score.ts as they went), this
// shows exactly what they earned. If they jumped straight to the
// report with nothing recorded, it falls back to the full-marks
// sample view, so "what does a perfect run look like" still works.
export default function MissionThreeReportPreviewClient() {
  const [stageEarned, setStageEarned] = useState<
    Partial<Record<MissionThreeStage, number>> | null
  >(null);

  useEffect(() => {
    const recorded = getPreviewStageScores();

    // eslint-disable-next-line react-hooks/set-state-in-effect -- sessionStorage is browser-only and can't be read during render
    setStageEarned(
      Object.keys(recorded).length > 0 ? recorded : MISSION_THREE_STAGE_POINTS
    );
  }, []);

  if (!stageEarned) {
    return null;
  }

  const totalScore = Object.values(stageEarned).reduce(
    (sum, points) => sum + (points ?? 0),
    0
  );

  return (
    <MissionThreeReport
      previewMode
      stageEarned={stageEarned}
      totalScore={totalScore}
    />
  );
}
