'use client';

import { useState } from 'react';

import TrustStatus from './TrustStatus';
import StageResult from './StageResult';
import { useMissionThreeSubmit } from '@/lib/missions/use-mission-three-submit';
import {
  EMAIL_DECISIONS,
  EMAIL_FOLLOWUP,
  clampStageScore,
  computeEmailStagePoints,
} from '@/lib/missions/mission-three-scoring';

const HEADER_DETAILS = [
  { label: 'Sender Domain', value: 'maya.bennett@cdu-internai.com' },
  {
    label: 'Reply-To Mismatch',
    value: 'Reply-To routes to an external, unregistered domain.',
  },
  { label: 'SPF', value: 'FAIL' },
  { label: 'DKIM', value: 'FAIL' },
  { label: 'DMARC', value: 'FAIL — policy reject, delivered anyway' },
  {
    label: 'Return Path',
    value: 'Does not match the display sender address.',
  },
  { label: 'Originating Source', value: 'Unrecognised mail relay' },
];

// The link's displayed text and its real destination deliberately
// don't match -- the whole point is that this is only visible by
// hovering, never shown up front, mirroring how a real phishing link
// works. There is no separate honest link anywhere for comparison.
const LINK_DISPLAY_TEXT = 'cdu-portal.com/reset';
const LINK_REAL_URL = 'https://secure-reset-cdu.verify-account-portal.net/x7f2';

const DECISIONS = [
  {
    id: 'verify_independent',
    label: 'Verify the request through a trusted independent channel',
  },
  { id: 'report_suspicious', label: 'Report the message as suspicious' },
  { id: 'reply_or_click', label: 'Reply to the sender or follow the link' },
];

const EXPLANATIONS: Record<string, string> = {
  verify_independent:
    'Confirming the request through a known channel — not the one the message itself provides — is the correct response.',
  report_suspicious:
    'Reporting is the right instinct, but the request still needs independent confirmation before anyone acts on it.',
  reply_or_click:
    'Replying to, or clicking a link inside, the suspicious message itself only engages further with the attacker.',
};

export default function EmailEvidence({
  previewMode,
}: {
  previewMode: boolean;
}) {
  const [inspected, setInspected] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [followUpAnswerId, setFollowUpAnswerId] = useState<string | null>(
    null
  );
  const [linkHovered, setLinkHovered] = useState(false);

  const { submitting, result, error, submit, continueToNext } =
    useMissionThreeSubmit({
      endpoint: '/api/missions/3/email/submit',
      previewMode,
      previewNextPath: '/admin/missions/3/preview/verification',
      nextPathFor: () => '/missions/3/play/verification',
      previewStage: 'email',
      previewScore: (payload) => {
        const option = EMAIL_DECISIONS[payload.decision as string];

        if (!option) {
          return { outcome: 'incorrect', points: 0 };
        }

        const followUpCorrect =
          payload.followUpAnswerId === EMAIL_FOLLOWUP.correctOptionId;

        return {
          outcome: option.outcome,
          points: clampStageScore(
            'email',
            computeEmailStagePoints({ decisionOption: option, followUpCorrect })
          ),
        };
      },
    });

  const canSubmit = selected !== null && followUpAnswerId !== null;

  return (
    <div className="overflow-hidden rounded-2xl border border-red-950 bg-[#0b0407]">
      <div className="border-b border-red-950 bg-[#140a0d] px-6 py-4">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-red-400">
          Stage 3 — Executive Impersonation Email
        </p>
      </div>

      {/* GMAIL-STYLE EMAIL CLIENT */}
      <div className="p-6 sm:p-8">
        <div className="relative overflow-hidden rounded-xl border border-slate-300 bg-white text-slate-900 shadow-lg">
          {/* Gmail toolbar */}
          <div className="flex items-center gap-4 border-b border-slate-200 bg-[#f6f8fc] px-4 py-2">
            <span className="text-sm text-slate-500">←</span>
            <span className="text-sm text-slate-500">🗑</span>
            <span className="text-sm text-slate-500">✉</span>
            <span className="ml-auto text-xs text-slate-400">1 of 247</span>
          </div>

          <div className="px-5 py-4">
            <h2 className="text-xl font-normal text-slate-900">
              URGENT: Password Expiry — Action Required Today
            </h2>

            <div className="mt-4 flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500 text-sm font-bold text-white">
                IT
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-sm font-bold text-slate-800">
                    CDU IT Support{' '}
                    <span className="font-normal text-slate-500">
                      &lt;it-support@cdu-internai.com&gt;
                    </span>
                  </p>
                  <p className="text-xs text-slate-400">06:58 (3 hours ago)</p>
                </div>

                <p className="text-xs text-slate-500">to me</p>
              </div>

              <div className="flex shrink-0 gap-2 text-slate-400">
                <span>☆</span>
                <span>↩</span>
                <span>⋮</span>
              </div>
            </div>

            <div className="mt-5 border-t border-slate-100 pt-5 text-sm leading-6 text-slate-700">
              <p>Hi,</p>
              <p className="mt-3">
                Your credentials will expire in 2 hours. Click the secure
                link below immediately to avoid account lockout and confirm
                your identity.
              </p>

              <p className="mt-4">
                <span
                  className="relative cursor-pointer text-[#1a73e8] underline"
                  onMouseEnter={() => setLinkHovered(true)}
                  onMouseLeave={() => setLinkHovered(false)}
                  onClick={(event) => event.preventDefault()}
                >
                  {LINK_DISPLAY_TEXT}
                </span>
              </p>

              <p className="mt-4">
                Thanks,
                <br />
                CDU IT Support
              </p>
            </div>
          </div>

          {/* Fake browser status-bar link preview -- only ever shown
              on hover, exactly like a real browser, never revealed
              up front. */}
          {linkHovered && (
            <div className="absolute bottom-0 left-0 max-w-[80%] truncate border border-slate-300 bg-white px-2 py-1 font-mono text-xs text-slate-700 shadow-md">
              {LINK_REAL_URL}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => setInspected((v) => !v)}
          className="mt-4 rounded-lg border border-amber-700 bg-amber-950/20 px-4 py-2 text-sm font-black text-amber-200 transition hover:bg-amber-950/40"
        >
          {inspected ? 'Hide Message Inspection' : 'Inspect Message'}
        </button>

        {inspected && (
          <div className="mt-4 overflow-hidden rounded-xl border border-slate-800">
            {HEADER_DETAILS.map((row, index) => (
              <div
                key={row.label}
                className={`flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm ${
                  index % 2 === 0 ? 'bg-[#0a0608]' : 'bg-[#0d0a0c]'
                }`}
              >
                <span className="font-bold text-slate-400">
                  {row.label}
                </span>
                <span className="font-mono text-red-300">{row.value}</span>
              </div>
            ))}

            <div className="flex items-center justify-between gap-2 bg-[#120d06] px-4 py-3 text-sm">
              <span className="font-bold text-amber-300">
                Authentication Status
              </span>
              <TrustStatus level="suspicious" size="sm" />
            </div>
          </div>
        )}
      </div>

      {/* DECISION */}
      <div className="border-t border-red-950 bg-[#0d0609] p-6 sm:p-8">
        {!result && (
          <div className="space-y-6">
            <div className="space-y-3">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">
                How do you respond?
              </p>

              {DECISIONS.map((option) => (
                <label
                  key={option.id}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-sm font-bold transition ${
                    selected === option.id
                      ? 'border-red-500 bg-red-950/30'
                      : 'border-slate-800 bg-[#0a0608] hover:border-slate-600'
                  }`}
                >
                  <input
                    type="radio"
                    name="email-decision"
                    value={option.id}
                    checked={selected === option.id}
                    onChange={() => setSelected(option.id)}
                    className="h-4 w-4"
                  />
                  {option.label}
                </label>
              ))}
            </div>

            <div className="rounded-xl border border-slate-800 bg-[#0a0608] p-5">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">
                Verification Reasoning
              </p>

              <p className="mt-2 text-sm font-bold text-slate-200">
                {EMAIL_FOLLOWUP.question}
              </p>

              <div className="mt-3 space-y-2">
                {EMAIL_FOLLOWUP.options.map((option) => (
                  <label
                    key={option.id}
                    className={`flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-sm font-bold transition ${
                      followUpAnswerId === option.id
                        ? 'border-cyan-500 bg-cyan-950/20'
                        : 'border-slate-800 bg-[#070508] hover:border-slate-600'
                    }`}
                  >
                    <input
                      type="radio"
                      name="email-followup"
                      value={option.id}
                      checked={followUpAnswerId === option.id}
                      onChange={() => setFollowUpAnswerId(option.id)}
                      className="h-4 w-4"
                    />
                    {option.label}
                  </label>
                ))}
              </div>
            </div>

            <button
              type="button"
              disabled={!canSubmit || submitting}
              onClick={() =>
                canSubmit &&
                submit({ decision: selected, followUpAnswerId })
              }
              className="rounded-lg bg-red-500 px-6 py-3 font-black text-black transition disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
            >
              {submitting ? 'Submitting...' : 'Submit Decision'}
            </button>

            {error && (
              <p className="text-sm font-bold text-red-400">{error}</p>
            )}
          </div>
        )}

        {result && selected && (
          <StageResult
            result={result}
            explanation={EXPLANATIONS[selected]}
            previewMode={previewMode}
            onContinue={continueToNext}
            continueLabel="Continue to Verification Protocol →"
          />
        )}
      </div>
    </div>
  );
}
