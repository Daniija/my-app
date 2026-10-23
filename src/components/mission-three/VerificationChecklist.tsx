'use client';

import { useState } from 'react';

import StageResult from './StageResult';
import OrganizationRiskMeter from './OrganizationRiskMeter';
import { useMissionThreeSubmit } from '@/lib/missions/use-mission-three-submit';
import {
  VERIFICATION_STEPS,
  VERIFICATION_POSITION_POINTS,
  VERIFICATION_POSITION_PENALTY,
  clampStageScore,
  deriveVerificationOutcome,
  scoreVerificationPositions,
} from '@/lib/missions/mission-three-scoring';

// A fixed (not random) starting order so server-rendered and
// client-hydrated markup always match -- it's deliberately out of
// sequence so the exercise is meaningful, without relying on
// client-only randomness that would cause a hydration mismatch.
const START_ORDER = [
  'notify_security',
  'record_incident',
  'do_not_act',
  'check_other_employees',
  'verify_trusted_channel',
  'preserve_communication',
];

const STEP_LABEL = Object.fromEntries(
  VERIFICATION_STEPS.map((step) => [step.id, step.label])
);

export default function VerificationChecklist({
  previewMode,
  riskPercent,
}: {
  previewMode: boolean;
  riskPercent: number;
}) {
  const [order, setOrder] = useState<string[]>(START_ORDER);

  const { submitting, result, error, submit, continueToNext } =
    useMissionThreeSubmit({
      endpoint: '/api/missions/3/verification/submit',
      previewMode,
      previewNextPath: '/admin/missions/3/preview/final',
      nextPathFor: () => '/missions/3/play/final',
      previewStage: 'verification',
      previewScore: (payload) => {
        const submittedOrder = Array.isArray(payload.order)
          ? (payload.order as string[])
          : [];
        const { correctCount, rawPoints } =
          scoreVerificationPositions(submittedOrder);
        return {
          outcome: deriveVerificationOutcome(correctCount),
          points: clampStageScore('verification', rawPoints),
        };
      },
    });

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;

    if (target < 0 || target >= order.length) {
      return;
    }

    setOrder((current) => {
      const next = [...current];
      const [moved] = next.splice(index, 1);
      next.splice(target, 0, moved);
      return next;
    });
  }

  // Recomputed client-side from the submitted order purely for
  // display -- the authoritative score always comes from `result`
  // (server-computed in real play, locally scored the same way in
  // preview), never from this.
  const { correctCount, wrongCount } = scoreVerificationPositions(order);

  const explanation = result
    ? `${correctCount} of ${VERIFICATION_STEPS.length} steps were in the correct position (+${VERIFICATION_POSITION_POINTS} each). ${wrongCount} were not (−${VERIFICATION_POSITION_PENALTY} each). Contain first, preserve the evidence before anything changes, verify through a separate trusted channel, escalate, scope the incident, then document — that order protects both the evidence and the people who might also have received it.`
    : '';

  return (
    <div className="space-y-6">
      <OrganizationRiskMeter riskPercent={riskPercent} />

      <div className="overflow-hidden rounded-2xl border border-red-950 bg-[#0b0407]">
        <div className="border-b border-red-950 bg-[#140a0d] px-6 py-4">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-red-400">
            Stage 6 — Verification Protocol
          </p>
          <p className="mt-2 text-sm text-slate-400">
            Put the organisation&apos;s response in the correct order. Use
            Move Up / Move Down to reorder each step. You earn{' '}
            {VERIFICATION_POSITION_POINTS} points for every step in its
            correct position, and lose {VERIFICATION_POSITION_PENALTY} points
            for every step that isn&apos;t.
          </p>
        </div>

        <ol className="space-y-2 p-6 sm:p-8">
          {order.map((stepId, index) => (
            <li
              key={stepId}
              className="flex items-center gap-3 rounded-lg border border-slate-800 bg-[#0a0608] px-4 py-3"
            >
              <span className="w-6 text-center font-mono text-sm font-black text-slate-500">
                {index + 1}
              </span>

              <span className="flex-1 text-sm font-bold text-slate-200">
                {STEP_LABEL[stepId]}
              </span>

              {!result && (
                <div className="flex gap-1">
                  <button
                    type="button"
                    aria-label={`Move "${STEP_LABEL[stepId]}" up`}
                    disabled={index === 0}
                    onClick={() => move(index, -1)}
                    className="rounded-md border border-slate-700 px-2 py-1 text-xs font-black text-slate-300 transition disabled:cursor-not-allowed disabled:opacity-30 hover:border-red-600"
                  >
                    ↑
                  </button>

                  <button
                    type="button"
                    aria-label={`Move "${STEP_LABEL[stepId]}" down`}
                    disabled={index === order.length - 1}
                    onClick={() => move(index, 1)}
                    className="rounded-md border border-slate-700 px-2 py-1 text-xs font-black text-slate-300 transition disabled:cursor-not-allowed disabled:opacity-30 hover:border-red-600"
                  >
                    ↓
                  </button>
                </div>
              )}
            </li>
          ))}
        </ol>

        <div className="border-t border-red-950 bg-[#0d0609] p-6 sm:p-8">
          {!result && (
            <>
              <button
                type="button"
                disabled={submitting}
                onClick={() => submit({ order })}
                className="rounded-lg bg-red-500 px-6 py-3 font-black text-black transition disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
              >
                {submitting ? 'Submitting...' : 'Submit Protocol Order'}
              </button>

              {error && (
                <p className="mt-2 text-sm font-bold text-red-400">
                  {error}
                </p>
              )}
            </>
          )}

          {result && (
            <StageResult
              result={result}
              explanation={explanation}
              previewMode={previewMode}
              onContinue={continueToNext}
              continueLabel="Continue to Final Challenge →"
            />
          )}
        </div>
      </div>
    </div>
  );
}
