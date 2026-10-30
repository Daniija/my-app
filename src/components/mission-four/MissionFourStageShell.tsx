'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import { getMissionFourStage, type MissionFourStageDefinition } from '@/lib/missions/mission-four-data';
import type { MissionFourStageName } from '@/lib/missions/mission-four-scoring';
import { useMissionFourTimer } from '@/lib/missions/use-mission-four-timer';
import { useMissionFourChallengeSubmit } from '@/lib/missions/use-mission-four-submit';
import { useMissionFourSound } from '@/lib/missions/mission-four-sound';
import type { ChallengeScoreResult } from '@/lib/missions/mission-four-challenge-engine';

import MissionFourHud from './MissionFourHud';
import MissionFourStageIndicator from './MissionFourStageIndicator';
import MissionFourEventLog, { type MissionFourLogEntry } from './MissionFourEventLog';
import ChallengeRenderer from './ChallengeRenderer';

const STAGE_ENDPOINT: Record<MissionFourStageName, string> = {
  triage: '/api/missions/4/triage/finalize',
  trace: '/api/missions/4/trace/finalize',
  contain: '/api/missions/4/contain/finalize',
  disarm: '/api/missions/4/disarm/finalize',
};

const NEXT_STAGE_LABEL: Record<MissionFourStageName, string> = {
  triage: 'Trace',
  trace: 'Contain',
  contain: 'Disarm',
  disarm: 'Report',
};

let logIdCounter = 0;
function nextLogId() {
  logIdCounter += 1;
  return `log-${logIdCounter}`;
}

// Deterministic per-player shuffle so two players never see the same
// question/answer order within a stage, while the SAME player sees
// a stable order for the life of their attempt (refresh-safe, since
// `seed` is that player's attempt id). Hashes `seed` into a 32-bit
// int and drives a small xorshift PRNG from it -- no crypto needed,
// this only governs display order, never scoring. Always returns
// new arrays; never mutates the shared module-level challenge/option
// objects from mission-four-data.ts, which are reused across every
// request in this Node process.
function hashSeed(seed: string): number {
  let hash = 0;

  for (let i = 0; i < seed.length; i++) {
    hash = (Math.imul(31, hash) + seed.charCodeAt(i)) | 0;
  }

  return hash || 1;
}

function seededShuffle<T>(items: T[], seed: string): T[] {
  let state = hashSeed(seed);
  const result = items.slice();

  for (let i = result.length - 1; i > 0; i--) {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;

    const random = (state >>> 0) / 4294967296;
    const j = Math.floor(random * (i + 1));

    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}

// Reorders a stage's challenge list, and each multiple-choice
// challenge's option list, for one player's seed. Every challenge
// keeps its own stable id/points/correctOptionId -- only display
// order changes, so scoring, completion checks, and point totals
// (all keyed by id, never by position) are completely unaffected.
// `title` is renumbered to the challenge's new 1-based position in
// THIS player's shuffled order, so "Question 1" is always whatever
// they see first, never the question's original global id (9-16 for
// TRACE, say) -- the only thing that changes is this display label.
function shuffledStageForPlayer(
  stage: MissionFourStageDefinition,
  seed: string
): MissionFourStageDefinition {
  return {
    ...stage,
    challenges: seededShuffle(stage.challenges, `${seed}:${stage.id}:questions`).map(
      (challenge, index) => {
        const numbered = { ...challenge, title: `Question ${index + 1}` };

        return numbered.type === 'multiple_choice'
          ? {
              ...numbered,
              options: seededShuffle(numbered.options, `${seed}:${challenge.id}:options`),
            }
          : numbered;
      }
    ),
  };
}

export default function MissionFourStageShell({
  stage,
  previewMode,
  timerStartedAt,
  netAdjustmentSeconds,
  initialCompletedChallenges,
  priorStagesScore,
  devPaused = false,
  seed,
}: {
  stage: MissionFourStageName;
  previewMode: boolean;
  timerStartedAt: string | null;
  netAdjustmentSeconds: number;
  initialCompletedChallenges: Record<
    string,
    { points: number; outcome: string; timeDeltaSeconds?: number }
  >;
  priorStagesScore: number;
  devPaused?: boolean;
  // The real stage pages pass this player's attempt id, so the
  // shuffle below is stable for that player but differs across
  // players. Admin preview has no real attempt, so it falls back to
  // the stage name (still deterministic, just shared by every
  // preview session).
  seed?: string;
}) {
  const router = useRouter();
  const baseStageDefinition = getMissionFourStage(stage);

  const stageDefinition = useMemo(
    () => shuffledStageForPlayer(baseStageDefinition, seed ?? stage),
    [baseStageDefinition, seed, stage]
  );

  const [completed, setCompleted] = useState(initialCompletedChallenges);
  const [netAdjustment, setNetAdjustment] = useState(netAdjustmentSeconds);
  const [finalizing, setFinalizing] = useState(false);
  const [finalizeError, setFinalizeError] = useState('');
  const [stageCleared, setStageCleared] = useState(false);
  const [missionFailed, setMissionFailed] = useState(false);
  const expireRequestedRef = useRef(false);

  const [logEntries, setLogEntries] = useState<MissionFourLogEntry[]>(() => [
    { id: nextLogId(), at: new Date().toISOString(), message: `${stageDefinition.codename} stage active.` },
  ]);

  const { play, muted, toggleMuted } = useMissionFourSound();

  function logEvent(message: string, tone?: MissionFourLogEntry['tone']) {
    setLogEntries((current) => [
      ...current,
      { id: nextLogId(), at: new Date().toISOString(), message, tone },
    ]);
  }

  async function handleExpire() {
    if (missionFailed) return;

    setMissionFailed(true);
    play('failed');
    logEvent('Countdown reached zero. Payload executed.', 'bad');

    if (previewMode) {
      return;
    }

    if (expireRequestedRef.current) return;
    expireRequestedRef.current = true;

    try {
      await fetch('/api/missions/4/expire', { method: 'POST' });
    } finally {
      router.push('/missions/4/play/report');
    }
  }

  const timer = useMissionFourTimer({
    startedAt: timerStartedAt,
    netAdjustmentSeconds: netAdjustment,
    paused: devPaused,
    onExpire: handleExpire,
  });

  const currentChallenge = useMemo(
    () => stageDefinition.challenges.find((c) => !completed[c.id]),
    [stageDefinition.challenges, completed]
  );

  const challengeSubmit = useMissionFourChallengeSubmit({
    challenge: currentChallenge ?? stageDefinition.challenges[0],
    previewMode,
  });

  // The countdown can hit zero while a challenge-submit request for
  // THIS stage is in flight -- the server (migration 020's
  // save_mission_four_challenge_progress) already recorded the
  // mission as failed in that case without saving the in-flight
  // answer, by design. Mirror handleExpire()'s UI/redirect, but don't
  // call /api/missions/4/expire again: the server-side failure is
  // already persisted, so a second expire call would be redundant.
  useEffect(() => {
    if (!challengeSubmit.failed || missionFailed) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing local UI state to a server-confirmed failure signal is the whole point of this effect, mirroring handleExpire() above
    setMissionFailed(true);
    play('failed');
    logEvent('Countdown reached zero. Payload executed.', 'bad');

    if (!previewMode) {
      router.push('/missions/4/play/report');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- play/logEvent/router are stable for this component's lifetime; re-running on their identity would be spurious
  }, [challengeSubmit.failed, missionFailed, previewMode]);

  const stagePoints = stageDefinition.challenges.reduce(
    (sum, c) => sum + (completed[c.id]?.points ?? 0),
    0
  );

  function handleChallengeResult(challengeId: string, result: ChallengeScoreResult) {
    setCompleted((current) => ({
      ...current,
      [challengeId]: {
        points: result.points,
        outcome: result.outcome,
        timeDeltaSeconds: result.timeDeltaSeconds,
      },
    }));

    setNetAdjustment((current) => current + result.timeDeltaSeconds);

    play(result.outcome === 'correct' ? 'correct' : 'incorrect');

    logEvent(
      `${result.outcome === 'correct' ? 'Correct response' : result.outcome === 'partial' ? 'Partial response' : 'Incorrect response'}. ` +
        `${result.timeDeltaSeconds > 0 ? `Time bonus: +${result.timeDeltaSeconds}s` : result.timeDeltaSeconds < 0 ? `Time penalty: ${result.timeDeltaSeconds}s` : ''}`,
      result.outcome === 'incorrect' ? 'bad' : 'good'
    );
  }

  async function handleFinalizeStage() {
    if (finalizing) return;

    setFinalizing(true);
    setFinalizeError('');

    if (previewMode) {
      await new Promise((resolve) => window.setTimeout(resolve, 300));

      play('stage_complete');
      logEvent(`${stageDefinition.codename} cleared.`, 'good');
      setStageCleared(true);

      window.setTimeout(() => {
        const nextPath =
          stage === 'disarm'
            ? '/admin/missions/4/preview/report'
            : `/admin/missions/4/preview/${
                stage === 'triage' ? 'trace' : stage === 'trace' ? 'contain' : 'disarm'
              }`;

        router.push(nextPath);
      }, 1600);

      return;
    }

    try {
      const response = await fetch(STAGE_ENDPOINT[stage], { method: 'POST' });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.message ?? 'Unable to complete this stage.');
      }

      if (data.failed) {
        setMissionFailed(true);
        play('failed');
        logEvent('Countdown reached zero. Payload executed.', 'bad');
        router.push('/missions/4/play/report');
        return;
      }

      play(stage === 'disarm' ? 'success' : 'stage_complete');
      logEvent(`${stageDefinition.codename} cleared.`, 'good');
      setStageCleared(true);

      window.setTimeout(() => {
        const nextPath =
          stage === 'disarm'
            ? '/missions/4/play/report'
            : `/missions/4/play/${
                stage === 'triage' ? 'trace' : stage === 'trace' ? 'contain' : 'disarm'
              }`;

        router.push(nextPath);
      }, 1600);
    } catch (err) {
      setFinalizeError(err instanceof Error ? err.message : 'Unable to complete this stage.');
      setFinalizing(false);
    }
  }

  const totalScore = priorStagesScore + stagePoints;

  if (missionFailed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0203] px-6 text-center text-white">
        <div>
          <p className="font-mono text-6xl font-black text-red-500">00:00</p>
          <p className="mt-4 text-2xl font-black uppercase tracking-[0.2em] text-red-400">
            Payload Executed
          </p>
          <p className="mt-2 text-lg font-bold uppercase tracking-[0.15em] text-slate-300">
            Mission Failed
          </p>
        </div>
      </div>
    );
  }

  if (stageCleared) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#02050a] px-6 text-center text-white">
        <div>
          <p className="text-2xl font-black uppercase tracking-[0.2em] text-emerald-400">
            Stage {stageDefinition.number.toString().padStart(2, '0')} Cleared
          </p>
          <p className="mt-2 text-sm font-bold uppercase tracking-[0.2em] text-slate-400">
            Access Granted
          </p>
          <p className="mt-4 text-lg font-bold text-white">
            Proceeding to {NEXT_STAGE_LABEL[stage]}...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen bg-[#02050a] text-white ${
        timer.intensity === 'zero_hour' ? 'mission4-zero-hour-pulse' : ''
      }`}
    >
      <MissionFourHud
        stage={stage}
        score={totalScore}
        timer={timer}
        soundEnabled={!muted}
        onToggleSound={toggleMuted}
      />

      {timer.intensity === 'zero_hour' && (
        <div
          role="alert"
          className="border-b border-red-700 bg-red-950/60 px-4 py-2 text-center text-xs font-black uppercase tracking-[0.2em] text-red-200"
        >
          Final 60 Seconds — Act Now
        </div>
      )}

      <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
        {previewMode && (
          <div className="mb-5 rounded-xl border border-amber-600/60 bg-amber-950/20 px-5 py-3 text-xs font-black uppercase tracking-[0.18em] text-amber-300">
            Admin Preview — Nothing Saved
          </div>
        )}

        <div className="mb-6">
          <MissionFourStageIndicator currentStage={stage} />
        </div>

        <div className="overflow-hidden rounded-2xl border border-red-950 bg-[#0a0407]">
          <div className="border-b border-red-950 bg-[#140a0d] px-6 py-4">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-red-400">
              {stageDefinition.codename} — Stage {stageDefinition.number.toString().padStart(2, '0')}
            </p>
            <p className="mt-1 text-sm text-slate-400">{stageDefinition.description}</p>
          </div>

          <div className="p-6 sm:p-8">
            {currentChallenge ? (
              <>
                <h2 className="text-lg font-black">{currentChallenge.title}</h2>
                {currentChallenge.briefing && (
                  <p className="mt-1 text-sm text-slate-400">{currentChallenge.briefing}</p>
                )}
                <p className="mt-4 text-sm font-bold text-slate-200">{currentChallenge.prompt}</p>

                <div className="mt-5">
                  {!challengeSubmit.result ? (
                    <ChallengeRenderer
                      challenge={currentChallenge}
                      disabled={challengeSubmit.submitting}
                      onSubmit={challengeSubmit.submit}
                    />
                  ) : (
                    <div
                      className={`rounded-xl border p-5 ${
                        challengeSubmit.result.outcome === 'correct'
                          ? 'border-emerald-700 bg-emerald-950/30 text-emerald-200'
                          : challengeSubmit.result.outcome === 'partial'
                            ? 'border-amber-700 bg-amber-950/30 text-amber-200'
                            : 'border-red-700 bg-red-950/30 text-red-200'
                      }`}
                    >
                      <p className="font-black uppercase tracking-[0.1em]">
                        {challengeSubmit.result.outcome === 'correct'
                          ? 'Correct Response'
                          : challengeSubmit.result.outcome === 'partial'
                            ? 'Partial Response'
                            : 'Security Error'}
                      </p>

                      {currentChallenge.explanation && (
                        <p className="mt-2 text-sm leading-6 opacity-90">
                          {currentChallenge.explanation}
                        </p>
                      )}

                      <p className="mt-3 font-mono text-sm font-bold">
                        {challengeSubmit.result.points >= 0 ? '+' : ''}
                        {challengeSubmit.result.points} points
                        {challengeSubmit.result.timeDeltaSeconds !== 0 && (
                          <>
                            {' · '}
                            {challengeSubmit.result.timeDeltaSeconds > 0 ? 'Time Bonus' : 'Time Penalty'}{' '}
                            {challengeSubmit.result.timeDeltaSeconds > 0 ? '+' : ''}
                            {challengeSubmit.result.timeDeltaSeconds}s
                          </>
                        )}
                      </p>

                      <button
                        type="button"
                        onClick={() =>
                          challengeSubmit.result &&
                          handleChallengeResult(currentChallenge.id, challengeSubmit.result)
                        }
                        className="mt-5 rounded-lg bg-white px-5 py-2.5 font-black text-black transition hover:bg-slate-200"
                      >
                        Continue
                      </button>
                    </div>
                  )}

                  {challengeSubmit.error && (
                    <p className="mt-3 text-sm font-bold text-red-400">{challengeSubmit.error}</p>
                  )}
                </div>
              </>
            ) : (
              <div className="text-center">
                <p className="text-lg font-black text-emerald-300">
                  All {stageDefinition.codename} challenges complete.
                </p>
                <p className="mt-2 text-sm text-slate-400">
                  Stage points earned: {stagePoints} + {stageDefinition.completionBonus} completion bonus
                </p>

                <button
                  type="button"
                  disabled={finalizing}
                  onClick={handleFinalizeStage}
                  className="mt-5 rounded-lg bg-red-500 px-8 py-3 font-black text-black transition disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
                >
                  {finalizing ? 'Processing...' : `Proceed to ${NEXT_STAGE_LABEL[stage]}`}
                </button>

                {finalizeError && (
                  <p className="mt-3 text-sm font-bold text-red-400">{finalizeError}</p>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="mt-6">
          <p className="mb-2 text-xs font-black uppercase tracking-[0.2em] text-slate-500">
            Event Log
          </p>
          <MissionFourEventLog entries={logEntries} />
        </div>
      </main>
    </div>
  );
}
