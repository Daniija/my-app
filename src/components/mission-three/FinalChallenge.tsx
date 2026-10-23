'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import OrganizationRiskMeter from './OrganizationRiskMeter';
import {
  FINAL_CHALLENGE_INTRO,
  FINAL_CHALLENGE_ITEMS,
  FINAL_DECISIONS,
  MISSION_THREE_STAGE_POINTS,
  clampStageScore,
  type FinalChallengeItemId,
} from '@/lib/missions/mission-three-scoring';
import { recordPreviewStageScore } from '@/lib/missions/mission-three-preview-score';

// Started when this component actually mounts -- never derived from
// attempt.started_at -- so every player sees the same countdown
// length regardless of how long they spent on earlier stages. This
// is the exact fix for the Mission 02 bug where the visible
// countdown was computed from an old attempt timestamp.
const FINAL_COUNTDOWN_SECONDS = 90;

const DECISION_OPTIONS = [
  { id: 'verify_independent', label: 'Check this a different way before doing anything' },
  { id: 'ignore_and_escalate', label: "Don't act, but tell security about it" },
  { id: 'act_immediately', label: 'Do what it asks right away' },
];

type SubmitResponse = {
  ok: boolean;
  outcome: 'correct' | 'partial' | 'incorrect';
  points: number;
  nextStage: string;
};

export default function FinalChallenge({
  previewMode,
  riskPercent,
}: {
  previewMode: boolean;
  riskPercent: number;
}) {
  const router = useRouter();

  const [secondsRemaining, setSecondsRemaining] = useState(
    FINAL_COUNTDOWN_SECONDS
  );

  const [decisions, setDecisions] = useState<
    Partial<Record<FinalChallengeItemId, string>>
  >({});

  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SubmitResponse | null>(null);
  const [showTwist, setShowTwist] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (result) {
      return;
    }

    const interval = window.setInterval(() => {
      setSecondsRemaining((current) => {
        if (current <= 1) {
          window.clearInterval(interval);
          return 0;
        }
        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [result]);

  async function submitAll(finalDecisions: Partial<Record<string, string>>) {
    if (submitting || result) {
      return;
    }

    setSubmitting(true);
    setError('');

    // Anything left unanswered when time runs out defaults to
    // "ignore and escalate" -- the safe-but-incomplete response --
    // rather than being scored as a worst-case compliance failure.
    const completed: Record<string, string> = {};

    for (const item of FINAL_CHALLENGE_ITEMS) {
      completed[item.id] = finalDecisions[item.id] ?? 'ignore_and_escalate';
    }

    if (previewMode) {
      await new Promise((resolve) => window.setTimeout(resolve, 400));

      // Score exactly like the real route, so a preview answer that
      // is actually wrong doesn't show as "correct".
      let rawTotal = 0;
      let correctCount = 0;

      for (const item of FINAL_CHALLENGE_ITEMS) {
        const option =
          FINAL_DECISIONS[completed[item.id]] ??
          FINAL_DECISIONS.ignore_and_escalate;

        rawTotal += option.points;

        if (option.outcome === 'correct') {
          correctCount++;
        }
      }

      const finalPoints = clampStageScore('final', rawTotal);

      const finalOutcome: SubmitResponse['outcome'] =
        correctCount === FINAL_CHALLENGE_ITEMS.length
          ? 'correct'
          : finalPoints >= MISSION_THREE_STAGE_POINTS.final / 2
            ? 'partial'
            : 'incorrect';

      recordPreviewStageScore('final', finalPoints);

      setResult({
        ok: true,
        outcome: finalOutcome,
        points: finalPoints,
        nextStage: 'preview',
      });
      setSubmitting(false);

      return;
    }

    try {
      const response = await fetch('/api/missions/3/final/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decisions: completed }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.message ?? 'Submission failed.');
      }

      setResult(data as SubmitResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submission failed.');
    } finally {
      setSubmitting(false);
    }
  }

  // Auto-submit once the countdown reaches zero, using whatever was
  // selected so far.
  useEffect(() => {
    if (secondsRemaining === 0 && !result && !submitting) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- auto-submits once the shared countdown reaches zero
      void submitAll(decisions);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: only fires on the 0 transition
  }, [secondsRemaining]);

  const allAnswered = FINAL_CHALLENGE_ITEMS.every(
    (item) => decisions[item.id]
  );

  const countdownMinutes = Math.floor(secondsRemaining / 60);
  const countdownSeconds = secondsRemaining % 60;
  const countdownDisplay = `${String(countdownMinutes).padStart(2, '0')}:${String(
    countdownSeconds
  ).padStart(2, '0')}`;

  function continueToReport() {
    if (previewMode) {
      router.push('/admin/missions/3/preview/report');
      return;
    }

    router.push('/missions/3/play/report');
  }

  return (
    <div className="space-y-6">
      <OrganizationRiskMeter riskPercent={riskPercent} />

      <div className="overflow-hidden rounded-2xl border border-red-950 bg-[#0b0407]">
        <div className="border-b border-red-950 bg-[#140a0d] px-6 py-4">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-red-400">
            Stage 7 — The AI Deepfake Threat
          </p>
        </div>

        {/* PLAIN-LANGUAGE EXPLAINER */}
        {!result && (
          <div className="border-b border-red-950 bg-[#0d0609] p-6 sm:p-8">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-cyan-300">
              {FINAL_CHALLENGE_INTRO.heading}
            </p>

            <div className="mt-3 space-y-3 text-sm leading-6 text-slate-300">
              {FINAL_CHALLENGE_INTRO.paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-red-950 bg-[#140a0d] px-6 py-4">
          <p className="text-sm text-slate-400">
            Four messages arrive almost at once. Some might be genuine. Some
            might not be. Decide what to do about each one.
          </p>

          <div
            className={`rounded-lg border px-4 py-2 text-center ${
              secondsRemaining <= 20
                ? 'border-red-700 bg-red-950/30'
                : 'border-red-900 bg-[#0b0407]'
            }`}
          >
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
              Time Remaining
            </p>
            <p className="font-mono text-xl font-black text-red-300">
              {countdownDisplay}
            </p>
          </div>
        </div>

        {!result && (
          <div className="grid gap-4 p-6 sm:grid-cols-2 sm:p-8">
            {FINAL_CHALLENGE_ITEMS.map((item) => (
              <div
                key={item.id}
                className="rounded-xl border border-slate-800 bg-[#0a0608] p-4"
              >
                <p className="text-sm font-black text-slate-200">
                  {item.label}
                </p>

                <div className="mt-3 space-y-2">
                  {DECISION_OPTIONS.map((option) => (
                    <label
                      key={option.id}
                      className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-xs font-bold transition ${
                        decisions[item.id] === option.id
                          ? 'border-red-500 bg-red-950/30'
                          : 'border-slate-800 bg-[#07050a] hover:border-slate-600'
                      }`}
                    >
                      <input
                        type="radio"
                        name={item.id}
                        checked={decisions[item.id] === option.id}
                        onChange={() =>
                          setDecisions((current) => ({
                            ...current,
                            [item.id]: option.id,
                          }))
                        }
                        className="h-3.5 w-3.5"
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {!result && (
          <div className="border-t border-red-950 bg-[#0d0609] p-6 sm:p-8">
            <button
              type="button"
              disabled={!allAnswered || submitting}
              onClick={() => submitAll(decisions)}
              className="rounded-lg bg-red-500 px-6 py-3 font-black text-black transition disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
            >
              {submitting ? 'Submitting...' : 'Lock In Decisions'}
            </button>

            {error && (
              <p className="mt-2 text-sm font-bold text-red-400">{error}</p>
            )}
          </div>
        )}

        {result && !showTwist && (
          <div className="border-t border-red-950 bg-[#0d0609] p-6 sm:p-8">
            <p className="font-black uppercase tracking-[0.1em] text-emerald-300">
              Decisions logged.
            </p>

            {!previewMode && (
              <p className="mt-2 font-mono text-sm font-bold text-slate-300">
                +{result.points} points
              </p>
            )}

            {previewMode && (
              <p className="mt-2 text-xs font-bold uppercase tracking-[0.14em] text-amber-300">
                Preview — no score recorded
              </p>
            )}

            <button
              type="button"
              onClick={() => setShowTwist(true)}
              className="mt-5 rounded-lg bg-white px-5 py-2.5 font-black text-black transition hover:bg-slate-200"
            >
              Open Final Transmission →
            </button>
          </div>
        )}

        {result && showTwist && (
          <div className="border-t border-red-950 bg-[#120609] p-6 sm:p-8">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-red-400">
              Incoming Transmission — Command Authority
            </p>

            <div className="mt-4 rounded-xl border border-red-800 bg-black/40 p-5 font-mono text-sm">
              <p className="font-black text-red-300">
                WHO REALLY SENT THIS: NOT CONFIRMED
              </p>

              <div className="mt-3 space-y-1 text-slate-300">
                <p>SENDER&apos;S IDENTITY: <span className="text-amber-300">UNCONFIRMED</span></p>
                <p>VOICE / FACE MATCH: <span className="text-amber-300">LOOKS REAL</span></p>
                <p>IS IT ACTUALLY THEM: <span className="text-amber-300">UNKNOWN</span></p>
              </div>

              <p className="mt-4 font-black text-red-400">
                WARNING: SOUNDING OR LOOKING REAL DOES NOT MEAN IT IS REAL.
              </p>
            </div>

            <p className="mt-6 text-lg font-bold text-white">
              Agent, you have been evaluating everyone else.
            </p>
            <p className="mt-1 text-lg font-bold text-red-300">
              Now verify us.
            </p>

            <p className="mt-6 text-sm leading-6 text-slate-400">
              Trust the verified process, not the appearance.
            </p>

            <button
              type="button"
              onClick={continueToReport}
              className="mt-6 rounded-lg bg-red-500 px-6 py-3 font-black text-black transition hover:bg-red-400"
            >
              Continue to Mission Report →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
