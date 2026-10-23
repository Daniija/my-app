import {
  VERIFICATION_STEPS,
  clampStageScore,
  deriveVerificationOutcome,
  scoreVerificationPositions,
} from '@/lib/missions/mission-three-scoring';

import { submitMissionThreeStage } from '@/lib/missions/mission-three-submit';

const VALID_STEP_IDS: Set<string> = new Set(
  VERIFICATION_STEPS.map((step) => step.id)
);

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));

  const submittedOrder: unknown[] = Array.isArray(body?.order)
    ? body.order
    : [];

  return submitMissionThreeStage({
    fromStage: 'verification',
    toStage: 'final',
    toStatus: 'active',
    buildResult: () => {
      const order = submittedOrder.filter(
        (step): step is string =>
          typeof step === 'string' && VALID_STEP_IDS.has(step)
      );

      if (
        order.length !== VERIFICATION_STEPS.length ||
        new Set(order).size !== VERIFICATION_STEPS.length
      ) {
        return { error: 'Invalid step order.' };
      }

      const { correctCount, wrongCount, rawPoints } =
        scoreVerificationPositions(order);

      return {
        order,
        correctCount,
        wrongCount,
        outcome: deriveVerificationOutcome(correctCount),
        points: clampStageScore('verification', rawPoints),
      };
    },
  });
}
