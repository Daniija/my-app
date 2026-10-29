import { submitMissionFourStage } from '@/lib/missions/mission-four-submit';

// The one call that actually starts the countdown: advances
// briefing -> triage, which is also the first time
// advance_mission_four_stage() ever sees current_stage='briefing'
// for this attempt, so it stamps progress.timer.startedAt = now()
// (server clock). Awards no points -- this is a pure gate, mirroring
// transmission/complete/route.ts's role for Mission 03.
export async function POST() {
  return submitMissionFourStage({
    fromStage: 'briefing',
    toStage: 'triage',
    toStatus: 'active',
    buildResult: () => ({
      outcome: 'correct',
      points: 0,
      completed: true,
    }),
  });
}
