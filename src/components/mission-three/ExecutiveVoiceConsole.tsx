'use client';

import { useState } from 'react';

import ExecutiveVoiceRound, {
  type ExecutiveVoiceRoundRecord,
} from './ExecutiveVoiceRound';
import ExecutiveVoiceFinalChallenge, {
  type ExecutiveVoiceFinalChallengeRecord,
} from './ExecutiveVoiceFinalChallenge';
import VoiceAnalysisSummary from './VoiceAnalysisSummary';

import {
  EXECUTIVE_VOICE_ROUNDS,
  RISK_DELTA_BY_OUTCOME,
  type DecisionOutcome,
} from '@/lib/missions/mission-three-scoring';

type CompletedRound = { outcome: DecisionOutcome; points: number };

const SEQUENCE = [...EXECUTIVE_VOICE_ROUNDS.map((round) => round.id), 'final_challenge'];

// Orchestrates the Executive Voice Verification section: each round
// in EXECUTIVE_VOICE_ROUNDS, then a final multi-clip challenge, then
// a summary before handing
// off to the "voice -> email" finalize call. current_stage stays
// "voice" the whole time -- navigation between rounds is just local
// component state, not routing, so a refresh re-enters this
// component from the server-supplied initialCompletedRounds (read
// from mission_progress.progress.voice_rounds by the page wrapper)
// rather than losing progress.
export default function ExecutiveVoiceConsole({
  previewMode,
  initialCompletedRounds,
  initialRiskPercent,
}: {
  previewMode: boolean;
  initialCompletedRounds: Record<string, CompletedRound>;
  initialRiskPercent: number;
}) {
  const [completed, setCompleted] = useState(initialCompletedRounds);

  function recordCompletion(
    roundKey: string,
    record: ExecutiveVoiceRoundRecord | ExecutiveVoiceFinalChallengeRecord
  ) {
    setCompleted((current) => ({
      ...current,
      [roundKey]: { outcome: record.outcome, points: record.points },
    }));
  }

  const riskPercent = Math.max(
    0,
    Math.min(
      100,
      initialRiskPercent +
        Object.values(completed).reduce(
          (delta, round) => delta + RISK_DELTA_BY_OUTCOME[round.outcome],
          0
        ) -
        Object.values(initialCompletedRounds).reduce(
          (delta, round) => delta + RISK_DELTA_BY_OUTCOME[round.outcome],
          0
        )
    )
  );

  const nextKey = SEQUENCE.find((key) => !completed[key]);

  if (!nextKey) {
    return (
      <VoiceAnalysisSummary previewMode={previewMode} completed={completed} />
    );
  }

  if (nextKey === 'final_challenge') {
    return (
      <ExecutiveVoiceFinalChallenge
        previewMode={previewMode}
        riskPercent={riskPercent}
        onComplete={(record) => recordCompletion('final_challenge', record)}
      />
    );
  }

  const round = EXECUTIVE_VOICE_ROUNDS.find((candidate) => candidate.id === nextKey);

  if (!round) {
    return null;
  }

  const roundNumber = EXECUTIVE_VOICE_ROUNDS.findIndex(
    (candidate) => candidate.id === nextKey
  ) + 1;

  return (
    <ExecutiveVoiceRound
      // Without a per-round key, React reuses the same component
      // instance across rounds (same position, same component type)
      // and keeps its old state -- the previous round's `result`
      // stays set, so the input form never re-renders and "Continue"
      // just immediately completes the next round with stale data.
      // The key forces a full remount on every round change.
      key={round.id}
      round={round}
      previewMode={previewMode}
      riskPercent={riskPercent}
      roundNumber={roundNumber}
      totalRounds={EXECUTIVE_VOICE_ROUNDS.length}
      onComplete={(record) => recordCompletion(round.id, record)}
    />
  );
}
