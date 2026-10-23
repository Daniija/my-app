'use client';

import { useState } from 'react';

import OrganizationRiskMeter from './OrganizationRiskMeter';
import ExecutiveVoiceFeedback, {
  type ExecutiveVoiceOutcome,
} from './ExecutiveVoiceFeedback';

import {
  EXECUTIVE_VOICE_FINAL_ITEMS,
  EXECUTIVE_VOICE_FINAL_DECISIONS,
  deriveExecutiveVoiceFinalOutcome,
  type ExecutiveVoiceFinalAction,
} from '@/lib/missions/mission-three-scoring';

const ACTIONS: { id: ExecutiveVoiceFinalAction; label: string }[] = [
  { id: 'verify_first', label: 'Verify through a trusted channel first' },
  { id: 'escalate_only', label: 'Escalate to security without acting yet' },
  { id: 'act_now', label: 'Act on the request immediately' },
];

export type ExecutiveVoiceFinalChallengeRecord = {
  outcome: ExecutiveVoiceOutcome;
  points: number;
  followUpCorrect: boolean;
};

// Closes the Executive Voice Verification section: several short
// communications presented at once. At least one of them is a
// genuinely verified caller still making a sensitive request --
// reinforcing that a real person can still trigger a security
// procedure.
export default function ExecutiveVoiceFinalChallenge({
  previewMode,
  riskPercent,
  onComplete,
}: {
  previewMode: boolean;
  riskPercent: number;
  onComplete: (record: ExecutiveVoiceFinalChallengeRecord) => void;
}) {
  const [actions, setActions] = useState<
    Partial<Record<string, ExecutiveVoiceFinalAction>>
  >({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<
    | (ExecutiveVoiceFinalChallengeRecord & {
        breakdown: { label: string; value: number }[];
      })
    | null
  >(null);

  const allAnswered = EXECUTIVE_VOICE_FINAL_ITEMS.every(
    (item) => actions[item.id]
  );

  async function submitChallenge() {
    if (!allAnswered || submitting || result) {
      return;
    }

    setSubmitting(true);
    setError('');

    if (previewMode) {
      await new Promise((resolve) => window.setTimeout(resolve, 400));

      // Score exactly like the real route, so a preview answer that
      // is actually wrong doesn't show as "correct".
      let rawTotal = 0;
      let correctCount = 0;

      const breakdown = EXECUTIVE_VOICE_FINAL_ITEMS.map((item) => {
        const option = EXECUTIVE_VOICE_FINAL_DECISIONS[actions[item.id]!];
        rawTotal += option.points;

        if (option.outcome === 'correct') {
          correctCount++;
        }

        return { label: item.label, value: option.points };
      });

      const outcome = deriveExecutiveVoiceFinalOutcome(correctCount, rawTotal);

      setResult({ outcome, points: rawTotal, followUpCorrect: true, breakdown });
      setSubmitting(false);

      return;
    }

    try {
      const response = await fetch(
        '/api/missions/3/voice/final-challenge/submit',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ actions }),
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.message ?? 'Submission failed.');
      }

      const breakdown = EXECUTIVE_VOICE_FINAL_ITEMS.map((item) => ({
        label: item.label,
        value: data.items?.[item.id]?.points ?? 0,
      }));

      setResult({
        outcome: data.outcome,
        points: data.points,
        followUpCorrect: true,
        breakdown,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submission failed.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <OrganizationRiskMeter riskPercent={riskPercent} />

      <div className="overflow-hidden rounded-2xl border border-red-950 bg-[#0b0407]">
        <div className="border-b border-red-950 bg-[#140a0d] px-6 py-5">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-red-400">
            Final Voice Challenge
          </p>
          <h3 className="mt-2 text-xl font-black">
            Multiple communications, almost simultaneously.
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Decide which requests can be acted upon immediately and which
            require verification. A genuine, familiar voice is not the same
            thing as a safe request.
          </p>
        </div>

        {!result && (
          <div className="grid gap-4 p-6 sm:grid-cols-2 sm:p-8">
            {EXECUTIVE_VOICE_FINAL_ITEMS.map((item) => (
              <div
                key={item.id}
                className="rounded-xl border border-slate-800 bg-[#0a0608] p-4"
              >
                <p className="text-xs font-black uppercase tracking-[0.14em] text-red-400">
                  {item.role}
                </p>
                <p className="mt-1 text-sm font-bold text-slate-200">
                  {item.label}
                </p>

                <div className="mt-3 space-y-2">
                  {ACTIONS.map((option) => (
                    <label
                      key={option.id}
                      className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-xs font-bold transition ${
                        actions[item.id] === option.id
                          ? 'border-red-500 bg-red-950/30'
                          : 'border-slate-800 bg-[#07050a] hover:border-slate-600'
                      }`}
                    >
                      <input
                        type="radio"
                        name={item.id}
                        checked={actions[item.id] === option.id}
                        onChange={() =>
                          setActions((current) => ({
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
              onClick={submitChallenge}
              className="rounded-lg bg-red-500 px-6 py-3 font-black text-black transition disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
            >
              {submitting ? 'Submitting...' : 'Lock In Decisions'}
            </button>

            {error && (
              <p className="mt-2 text-sm font-bold text-red-400">{error}</p>
            )}
          </div>
        )}

        {result && (
          <div className="border-t border-red-950 bg-[#0d0609] p-6 sm:p-8">
            <ExecutiveVoiceFeedback
              outcome={result.outcome}
              points={result.points}
              previewMode={previewMode}
              explanation="Authenticity and trustworthiness are not the same thing. Every request here still needed independent verification, regardless of how familiar the voice sounded."
              breakdown={result.breakdown}
              onContinue={() => onComplete(result)}
              continueLabel="View Voice Analysis Summary →"
            />
          </div>
        )}
      </div>
    </div>
  );
}
