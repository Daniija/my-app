import {
  EMAIL_DECISIONS,
  EMAIL_FOLLOWUP,
  clampStageScore,
  computeEmailStagePoints,
} from '@/lib/missions/mission-three-scoring';
import { submitMissionThreeStage } from '@/lib/missions/mission-three-submit';

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));

  const decision =
    typeof body?.decision === 'string' ? body.decision : null;

  const followUpAnswerId =
    typeof body?.followUpAnswerId === 'string' ? body.followUpAnswerId : null;

  return submitMissionThreeStage({
    fromStage: 'email',
    toStage: 'verification',
    toStatus: 'active',
    buildResult: () => {
      const option = decision ? EMAIL_DECISIONS[decision] : undefined;

      const followUpOption = followUpAnswerId
        ? EMAIL_FOLLOWUP.options.find((o) => o.id === followUpAnswerId)
        : undefined;

      if (!option || !followUpOption) {
        return {
          error: 'Answer both the trust decision and the follow-up question.',
        };
      }

      const followUpCorrect =
        followUpAnswerId === EMAIL_FOLLOWUP.correctOptionId;

      const points = clampStageScore(
        'email',
        computeEmailStagePoints({ decisionOption: option, followUpCorrect })
      );

      return {
        decision: option.id,
        followUpAnswerId,
        followUpCorrect,
        outcome: option.outcome,
        points,
      };
    },
  });
}
