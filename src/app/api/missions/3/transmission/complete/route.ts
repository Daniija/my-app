import { submitMissionThreeStage } from '@/lib/missions/mission-three-submit';

// The hacker-transmission stage awards no points -- it exists purely
// to gate progression into the Executive Voice Verification
// ("voice") section until the player has genuinely watched the
// transmission through (enforced client-side by the video's own
// "ended" event in HackerTransmission, and server-side by this
// route, and every later Mission 03 route, only accepting/allowing
// the next stage once current_stage has actually been advanced
// here). submitMissionThreeStage() already guarantees a
// double-click/retry cannot award or advance twice.
export async function POST() {
  return submitMissionThreeStage({
    fromStage: 'transmission',
    toStage: 'voice',
    toStatus: 'active',
    buildResult: () => ({
      outcome: 'correct',
      points: 0,
      completed: true,
    }),
  });
}
