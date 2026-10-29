'use client';

import { useState } from 'react';

import { MISSION_FOUR_DURATION_SECONDS, type MissionFourStageName } from '@/lib/missions/mission-four-scoring';
import MissionFourDevControls from './MissionFourDevControls';
import MissionFourStageShell from '../MissionFourStageShell';

// Holds the dev-control-only state (pause, fast-forward, reset) that
// has no server-side equivalent, since admin preview never persists
// anything -- see MissionFourDevControls.tsx for why this is safe.
export default function MissionFourPreviewStageWrapper({
  stage,
  devControlsEnabled,
}: {
  stage: MissionFourStageName;
  devControlsEnabled: boolean;
}) {
  const [paused, setPaused] = useState(false);
  const [startedAt, setStartedAt] = useState(() => new Date().toISOString());
  const [resetKey, setResetKey] = useState(0);

  function handleFastForward() {
    // Rewind startedAt so remaining time lands inside ZERO HOUR
    // (~50s left) without needing a separate "remaining override" path.
    const target = new Date(
      Date.now() - (MISSION_FOUR_DURATION_SECONDS - 50) * 1000
    ).toISOString();

    setStartedAt(target);
  }

  function handleReset() {
    setStartedAt(new Date().toISOString());
    setPaused(false);
    setResetKey((key) => key + 1);
  }

  return (
    <div>
      {devControlsEnabled && (
        <MissionFourDevControls
          currentStage={stage}
          paused={paused}
          onTogglePause={() => setPaused((current) => !current)}
          onFastForward={handleFastForward}
          onReset={handleReset}
        />
      )}

      <MissionFourStageShell
        key={resetKey}
        stage={stage}
        previewMode
        timerStartedAt={startedAt}
        netAdjustmentSeconds={0}
        initialCompletedChallenges={{}}
        priorStagesScore={0}
        devPaused={paused}
      />
    </div>
  );
}
