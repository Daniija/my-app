'use client';

import { useEffect, useState } from 'react';

import {
  scoreChallenge,
  type ChallengeScoreResult,
  type MissionFourAnswer,
  type MissionFourChallenge,
} from './mission-four-challenge-engine';
import { recordPreviewStageScore } from './mission-four-preview-score';

// Per-challenge submit flow -- Mission 4's challenges are individual
// items within a stage (like Mission 03's voice rounds), not a
// single whole-stage decision, so this hook submits one challenge at
// a time rather than mirroring use-mission-three-submit.ts's
// whole-stage shape directly. In admin preview mode it never calls
// the real API -- it scores locally via scoreChallenge() (the exact
// same function the real route uses server-side), so a preview
// answer that's actually wrong never shows as correct, and records
// the running stage score into sessionStorage for the preview report.
export function useMissionFourChallengeSubmit({
  challenge,
  previewMode,
}: {
  challenge: MissionFourChallenge;
  previewMode: boolean;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ChallengeScoreResult | null>(null);
  const [error, setError] = useState('');
  // Set when the server reports the countdown hit zero while this
  // submission was in flight (save_mission_four_challenge_progress's
  // time-expired branch, migration 020) -- the caller must treat this
  // as "mission failed," not as a normal scored result, since the
  // server deliberately did NOT save this answer or its points.
  const [failed, setFailed] = useState(false);

  // This hook is called once per render of MissionFourStageShell
  // with whatever the current challenge is -- the component itself
  // never remounts between questions, so without this reset, a
  // previous question's `result` would stay truthy and the reveal
  // panel (with its "Continue" button) would show immediately for
  // every later question instead of the actual question UI, letting
  // a player click straight through the rest of the stage.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- resetting per-question state when the challenge identity changes is the whole point of this effect
    setResult(null);
    setError('');
    setSubmitting(false);
    setFailed(false);
  }, [challenge.id]);

  async function submit(answer: MissionFourAnswer) {
    if (submitting || result) {
      return;
    }

    setSubmitting(true);
    setError('');

    if (previewMode) {
      await new Promise((resolve) => window.setTimeout(resolve, 300));

      const scored = scoreChallenge(challenge, answer);
      setResult(scored);
      recordPreviewStageScore(challenge.stage, scored.points);
      setSubmitting(false);
      return;
    }

    try {
      const response = await fetch('/api/missions/4/challenge/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stage: challenge.stage,
          challengeKey: challenge.id,
          answer,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.message ?? 'Submission failed.');
      }

      if (data.failed) {
        setFailed(true);
        return;
      }

      setResult({
        outcome: data.outcome,
        points: data.points,
        timeDeltaSeconds: data.timeDeltaSeconds ?? 0,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submission failed.');
    } finally {
      setSubmitting(false);
    }
  }

  return { submitting, result, error, failed, submit };
}
