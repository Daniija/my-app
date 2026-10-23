'use client';

import { useState } from 'react';

import TrustStatus from './TrustStatus';
import VoiceWaveform from './VoiceWaveform';
import OrganizationRiskMeter from './OrganizationRiskMeter';
import ExecutiveVoiceFeedback, {
  type ExecutiveVoiceOutcome,
} from './ExecutiveVoiceFeedback';

import {
  EXECUTIVE_VOICE_HINT_PENALTY,
  EXECUTIVE_VOICE_FOLLOWUP_BONUS,
  getExecutiveVoiceTrustDecisions,
  computeExecutiveVoiceRoundPoints,
  type ExecutiveVoiceRound as ExecutiveVoiceRoundData,
  type ExecutiveVoiceTrustAction,
} from '@/lib/missions/mission-three-scoring';

const TRUST_ACTIONS: { id: ExecutiveVoiceTrustAction; label: string }[] = [
  { id: 'trust', label: 'VERIFIED / TRUST' },
  { id: 'investigate', label: 'UNVERIFIED / INVESTIGATE' },
  { id: 'reject', label: 'SUSPICIOUS / REJECT' },
];

const TRUST_LABELS: Record<ExecutiveVoiceTrustAction, string> = {
  trust: 'VERIFIED / TRUST',
  investigate: 'UNVERIFIED / INVESTIGATE',
  reject: 'SUSPICIOUS / REJECT',
};

export type ExecutiveVoiceRoundRecord = {
  outcome: ExecutiveVoiceOutcome;
  points: number;
  followUpCorrect: boolean;
};

function explanationFor(
  round: ExecutiveVoiceRoundData,
  trustAction: ExecutiveVoiceTrustAction,
  followUpCorrect: boolean
) {
  const trustLine =
    trustAction === round.correctTrustAction
      ? `${TRUST_LABELS[trustAction]} was the right call for this request.`
      : `The right call here was ${TRUST_LABELS[round.correctTrustAction]} — review why before the next round.`;

  const followUpLine = followUpCorrect
    ? 'Your reasoning correctly identified the real verification gap.'
    : 'Your reasoning missed the strongest verification gap here — review the case details above before the next round.';

  return `${trustLine} ${followUpLine}`;
}

export default function ExecutiveVoiceRound({
  round,
  previewMode,
  riskPercent,
  roundNumber,
  totalRounds,
  onComplete,
}: {
  round: ExecutiveVoiceRoundData;
  previewMode: boolean;
  riskPercent: number;
  roundNumber: number;
  totalRounds: number;
  onComplete: (record: ExecutiveVoiceRoundRecord) => void;
}) {
  const [trustAction, setTrustAction] =
    useState<ExecutiveVoiceTrustAction | null>(null);
  const [followUpAnswerId, setFollowUpAnswerId] = useState<string | null>(
    null
  );
  const [hintUsed, setHintUsed] = useState(false);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<
    (ExecutiveVoiceRoundRecord & { breakdown: { label: string; value: number }[] }) | null
  >(null);

  const canSubmit = trustAction !== null && followUpAnswerId !== null;

  async function submitRound() {
    if (!canSubmit || submitting || result) {
      return;
    }

    setSubmitting(true);
    setError('');

    if (previewMode) {
      await new Promise((resolve) => window.setTimeout(resolve, 400));

      // Score exactly like the real route, so a preview answer that
      // is actually wrong doesn't show as "correct".
      const trustDecisions = getExecutiveVoiceTrustDecisions(round);
      const trustOption = trustDecisions[trustAction!];
      const followUpCorrect =
        followUpAnswerId === round.followUp.correctOptionId;

      const points = computeExecutiveVoiceRoundPoints({
        round,
        trustAction: trustOption.id as ExecutiveVoiceTrustAction,
        followUpCorrect,
        hintUsed,
      });

      setResult({
        outcome: trustOption.outcome,
        points,
        followUpCorrect,
        breakdown: [
          { label: 'Trust decision', value: trustOption.points },
          {
            label: 'Reasoning bonus',
            value: followUpCorrect ? EXECUTIVE_VOICE_FOLLOWUP_BONUS : 0,
          },
          ...(hintUsed
            ? [{ label: 'Hint used', value: -EXECUTIVE_VOICE_HINT_PENALTY }]
            : []),
        ],
      });

      setSubmitting(false);

      return;
    }

    try {
      const response = await fetch('/api/missions/3/voice/round/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roundKey: round.id,
          trustAction,
          followUpAnswerId,
          hintUsed,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.message ?? 'Submission failed.');
      }

      const trustPoints = trustAction
        ? getExecutiveVoiceTrustDecisions(round)[trustAction].points
        : 0;

      setResult({
        outcome: data.outcome,
        points: data.points,
        followUpCorrect: data.followUpCorrect,
        breakdown: [
          { label: 'Trust decision', value: trustPoints },
          {
            label: 'Reasoning bonus',
            value: data.followUpCorrect ? EXECUTIVE_VOICE_FOLLOWUP_BONUS : 0,
          },
          ...(hintUsed
            ? [{ label: 'Hint used', value: -EXECUTIVE_VOICE_HINT_PENALTY }]
            : []),
        ],
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
        {/* CASE HEADER */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-red-950 bg-[#140a0d] px-6 py-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
              Case ID
            </p>
            <p className="font-mono text-sm font-bold text-red-300">
              {round.caseId}
            </p>
          </div>

          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
              Received
            </p>
            <p className="font-mono text-sm font-bold">{round.timestamp}</p>
          </div>

          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
              Channel
            </p>
            <p className="text-sm font-bold">{round.channel}</p>
          </div>

          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
              Verification
            </p>
            <TrustStatus level="unverified" size="sm" />
          </div>
        </div>

        <div className="p-6 sm:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
            Executive Voice Verification — Round {roundNumber} of{' '}
            {totalRounds}
          </p>

          <h3 className="mt-2 text-xl font-black">{round.role}</h3>
          <p className="text-sm font-bold text-red-300">{round.senderLabel}</p>

          <p className="mt-4 leading-6 text-slate-300">
            Listen to the audio and answer the questions. Are they real or
            fake?
          </p>

          {/* AUDIO CONSOLE */}
          <div className="mt-6 rounded-xl border border-slate-800 bg-[#0a0608] p-4">
            <audio
              controls
              preload="none"
              className="w-full"
              onPlay={() => setAudioPlaying(true)}
              onPause={() => setAudioPlaying(false)}
              onEnded={() => setAudioPlaying(false)}
            >
              <source src={round.audioSrc} />
            </audio>

            <div className="mt-3">
              <VoiceWaveform playing={audioPlaying} />
            </div>
          </div>

          {/* HINT */}
          <div className="mt-6 rounded-xl border border-amber-900/60 bg-[#120d06] p-5">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-400">
              Hint
            </p>

            {hintUsed ? (
              <p className="mt-3 flex items-start gap-2 text-sm text-cyan-300">
                <span className="mt-0.5">★</span>
                <span>{round.hiddenHint}</span>
              </p>
            ) : (
              !result && (
                <button
                  type="button"
                  onClick={() => setHintUsed(true)}
                  className="mt-3 rounded-lg border border-cyan-800 bg-cyan-950/20 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-cyan-300 transition hover:bg-cyan-950/40"
                >
                  Use Hint (−{EXECUTIVE_VOICE_HINT_PENALTY} points)
                </button>
              )
            )}
          </div>

          {!result && (
            <>
              {/* TRUST DECISION */}
              <div className="mt-6">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">
                  Should this communication be trusted?
                </p>

                <div className="mt-3 space-y-2">
                  {TRUST_ACTIONS.map((option) => (
                    <label
                      key={option.id}
                      className={`flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-sm font-bold transition ${
                        trustAction === option.id
                          ? 'border-red-500 bg-red-950/30'
                          : 'border-slate-800 bg-[#0a0608] hover:border-slate-600'
                      }`}
                    >
                      <input
                        type="radio"
                        name="trust-action"
                        value={option.id}
                        checked={trustAction === option.id}
                        onChange={() => setTrustAction(option.id)}
                        className="h-4 w-4"
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
              </div>

              {/* FOLLOW-UP QUESTION */}
              <div className="mt-6 rounded-xl border border-slate-800 bg-[#0a0608] p-5">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">
                  Verification Reasoning
                </p>

                <p className="mt-2 text-sm font-bold text-slate-200">
                  {round.followUp.question}
                </p>

                <div className="mt-3 space-y-2">
                  {round.followUp.options.map((option) => (
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
                        name="followup-answer"
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
                onClick={submitRound}
                className="mt-6 rounded-lg bg-red-500 px-6 py-3 font-black text-black transition disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
              >
                {submitting ? 'Submitting...' : 'Submit Round'}
              </button>

              {error && (
                <p className="mt-2 text-sm font-bold text-red-400">{error}</p>
              )}
            </>
          )}

          {result && trustAction && (
            <div className="mt-6">
              <ExecutiveVoiceFeedback
                outcome={result.outcome}
                points={result.points}
                previewMode={previewMode}
                explanation={explanationFor(round, trustAction, result.followUpCorrect)}
                breakdown={result.breakdown}
                onContinue={() => onComplete(result)}
                continueLabel={
                  roundNumber < totalRounds
                    ? 'Continue to Next Round →'
                    : 'Continue to Final Voice Challenge →'
                }
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
