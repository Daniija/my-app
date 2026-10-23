'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import type {
  DecisionOutcome,
  MissionThreeStage,
} from './mission-three-scoring';
import { recordPreviewStageScore } from './mission-three-preview-score';

export type MissionThreeSubmitResult = {
  ok: boolean;
  outcome: 'correct' | 'partial' | 'incorrect';
  points: number;
  nextStage: string;
};

// Shared submit/result/continue flow for every Mission 03 single-shot
// decision stage (email/social/forensics/verification). In admin
// preview mode it never calls the real API or writes any data -- but
// it must still score whatever the admin actually picked using the
// same scoring logic the real route uses (via `previewScore`),
// otherwise every preview answer -- right or wrong -- looks
// "correct". `previewStage` records that real preview score into
// sessionStorage (see mission-three-preview-score.ts) so the final
// admin preview report can reflect it instead of showing a fixed
// full-marks sample.
export function useMissionThreeSubmit({
  endpoint,
  previewMode,
  previewNextPath,
  nextPathFor,
  previewStage,
  previewScore,
}: {
  endpoint: string;
  previewMode: boolean;
  previewNextPath: string;
  nextPathFor: (nextStage: string) => string;
  previewStage?: MissionThreeStage;
  previewScore?: (
    payload: Record<string, unknown>
  ) => { outcome: DecisionOutcome; points: number };
}) {
  const router = useRouter();

  const [submitting, setSubmitting] = useState(false);

  const [result, setResult] = useState<MissionThreeSubmitResult | null>(
    null
  );

  const [error, setError] = useState('');

  async function submit(payload: Record<string, unknown>) {
    if (submitting || result) {
      return;
    }

    setSubmitting(true);
    setError('');

    if (previewMode) {
      await new Promise((resolve) => window.setTimeout(resolve, 400));

      const scored = previewScore?.(payload) ?? {
        outcome: 'correct' as DecisionOutcome,
        points: 0,
      };

      if (previewStage) {
        recordPreviewStageScore(previewStage, scored.points);
      }

      setResult({
        ok: true,
        outcome: scored.outcome,
        points: scored.points,
        nextStage: 'preview',
      });

      setSubmitting(false);

      return;
    }

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.message ?? 'Submission failed.');
      }

      setResult(data as MissionThreeSubmitResult);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Submission failed.'
      );
    } finally {
      setSubmitting(false);
    }
  }

  function continueToNext() {
    if (previewMode) {
      router.push(previewNextPath);

      return;
    }

    if (result) {
      router.push(nextPathFor(result.nextStage));
    }
  }

  return { submitting, result, error, submit, continueToNext };
}
