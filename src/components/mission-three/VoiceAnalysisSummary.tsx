'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import {
  EXECUTIVE_VOICE_ROUNDS,
  EXECUTIVE_VOICE_FINAL_ITEMS,
  MISSION_THREE_STAGE_POINTS,
} from '@/lib/missions/mission-three-scoring';
import { recordPreviewStageScore } from '@/lib/missions/mission-three-preview-score';

type CompletedRound = { outcome: string; points: number };

const SUMMARY_ROWS = [
  ...EXECUTIVE_VOICE_ROUNDS.map((round) => ({ key: round.id, label: round.role })),
  { key: 'final_challenge', label: 'Final Voice Challenge' },
];

// Shown once every round + the final challenge are answered.
// Finalizing here calls /api/missions/3/voice/submit, which is the
// one call that actually advances current_stage (voice -> email) --
// everything up to this point has only saved into
// mission_progress.progress.voice_rounds.
export default function VoiceAnalysisSummary({
  previewMode,
  completed,
}: {
  previewMode: boolean;
  completed: Record<string, CompletedRound>;
}) {
  const router = useRouter();
  const [finalizing, setFinalizing] = useState(false);
  const [error, setError] = useState('');

  const rawTotal = Object.values(completed).reduce(
    (sum, round) => sum + round.points,
    0
  );

  const clampedTotal = Math.max(
    0,
    Math.min(MISSION_THREE_STAGE_POINTS.voice, rawTotal)
  );

  async function continueToEmail() {
    if (finalizing) {
      return;
    }

    if (previewMode) {
      // The rounds + final challenge only ever lived in this
      // component's in-memory `completed` map (no attempt row to read
      // back from in preview mode) -- record the real total the admin
      // actually earned now, before it's lost to the next navigation.
      recordPreviewStageScore('voice', clampedTotal);
      router.push('/admin/missions/3/preview/email');
      return;
    }

    setFinalizing(true);
    setError('');

    try {
      const response = await fetch('/api/missions/3/voice/submit', {
        method: 'POST',
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        // The player may have finished the section before a round was
        // added to it (e.g. a mid-event content update) -- naming the
        // specific missing round(s) here, rather than a generic
        // message, makes that recoverable instead of confusing: they
        // just need to reload this page to be routed into it.
        const missingLabels = Array.isArray(data?.missing)
          ? data.missing
              .map(
                (key: string) =>
                  SUMMARY_ROWS.find((row) => row.key === key)?.label ?? key
              )
              .join(', ')
          : '';

        throw new Error(
          missingLabels
            ? `Missing: ${missingLabels}. Reload this page to complete the remaining round(s).`
            : data?.message ?? 'Unable to finalize this section.'
        );
      }

      router.push('/missions/3/play/email');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unable to finalize this section.'
      );
      setFinalizing(false);
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-red-950 bg-[#0b0407]">
      <div className="border-b border-red-950 bg-[#140a0d] px-6 py-6 text-center sm:px-8">
        <p className="text-xs font-black uppercase tracking-[0.3em] text-emerald-400">
          Section Complete
        </p>
        <h1 className="mt-3 text-2xl font-black">Voice Analysis Summary</h1>
        <p className="mx-auto mt-3 max-w-lg text-sm text-slate-300">
          Seeing is no longer believing. Hearing is no longer believing.
          Verify everything.
        </p>

        {!previewMode && (
          <p className="mt-6 font-mono text-3xl font-black text-emerald-300">
            {clampedTotal} / {MISSION_THREE_STAGE_POINTS.voice}
          </p>
        )}

        {previewMode && (
          <p className="mt-4 text-xs font-bold uppercase tracking-[0.14em] text-amber-300">
            Preview — no score recorded
          </p>
        )}
      </div>

      <div className="p-6 sm:p-8">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">
          Round Breakdown
        </p>

        <div className="mt-4 space-y-2">
          {SUMMARY_ROWS.map((row) => {
            const round = completed[row.key];

            return (
              <div
                key={row.key}
                className="flex items-center justify-between gap-3 rounded-lg border border-slate-800 bg-[#0a0608] px-4 py-3 text-sm"
              >
                <span className="font-bold text-slate-300">{row.label}</span>
                <span className="font-mono font-black text-slate-200">
                  {round ? (round.points > 0 ? `+${round.points}` : round.points) : '—'}
                </span>
              </div>
            );
          })}
        </div>

        {EXECUTIVE_VOICE_FINAL_ITEMS.length > 0 && (
          <p className="mt-4 text-xs leading-5 text-slate-500">
            Even a verified, familiar voice can still make a request that
            requires security procedure. Authenticity of voice and
            trustworthiness of a request are not the same thing.
          </p>
        )}
      </div>

      <div className="border-t border-red-950 bg-[#0d0609] p-6 sm:p-8">
        <button
          type="button"
          onClick={continueToEmail}
          disabled={finalizing}
          className="rounded-lg bg-red-500 px-6 py-3 font-black text-black transition disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
        >
          {finalizing ? 'Saving...' : 'Continue to Email Evidence →'}
        </button>

        {error && <p className="mt-2 text-sm font-bold text-red-400">{error}</p>}
      </div>
    </div>
  );
}
