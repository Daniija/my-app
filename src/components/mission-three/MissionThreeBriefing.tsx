'use client';

import Link from 'next/link';

import { useEffect, useRef, useState } from 'react';

import { useRouter } from 'next/navigation';

import { MISSION_THREE_MAX_SCORE } from '@/lib/missions/mission-three-scoring';
import { clearPreviewStageScores } from '@/lib/missions/mission-three-preview-score';

type Attempt = {
  id: string;

  status: string;

  current_stage: string | null;

  started_at: string | null;

  completed_at: string | null;
};

type MissionThreeBriefingProps = {
  initialAttempt: Attempt | null;

  playerAlias: string;

  previewMode?: boolean;
};

// Stage pages are built out across Phase 2/3. Returns null (stay on
// the briefing) for any stage this component doesn't yet know how to
// resume into, instead of guessing a path that doesn't exist.
function getMissionStagePath(
  stage: string | null | undefined,

  previewMode: boolean,
) {
  const base = previewMode ? '/admin/missions/3/preview' : '/missions/3/play';

  switch (stage) {
    case 'transmission':
      return `${base}/transmission`;

    case 'voice':
      return `${base}/voice`;

    case 'email':
      return `${base}/email`;

    case 'verification':
      return `${base}/verification`;

    case 'final':
      return `${base}/final`;

    case 'report':
      return `${base}/report`;

    case 'briefing':

    default:
      return null;
  }
}

export default function MissionThreeBriefing({
  initialAttempt,

  playerAlias,

  previewMode = false,
}: MissionThreeBriefingProps) {
  const router = useRouter();

  const startRequested = useRef(false);

  const [attempt, setAttempt] = useState<Attempt | null>(initialAttempt);

  const [starting, setStarting] = useState(!initialAttempt);

  const [error, setError] = useState('');

  const MISSION_DURATION_SECONDS = 10;

  const [secondsRemaining, setSecondsRemaining] = useState(
    MISSION_DURATION_SECONDS,
  );

  // ----------------------------------

  // START / RESUME MISSION

  // ----------------------------------

  useEffect(() => {
    // ==================================

    // ADMIN PREVIEW MODE

    //

    // Do NOT:

    // - call /api/missions/3/start

    // - create mission_attempts

    // - require Mission 03 to be open

    //

    // We still show the lab-initializing animation so the
    // admin sees the same experience as a player.

    // ==================================

    if (previewMode) {
      // A fresh preview run starting over shouldn't carry forward
      // scores recorded during a previous preview run in this tab.
      clearPreviewStageScores();

      // eslint-disable-next-line react-hooks/set-state-in-effect -- preview animation resets state before the scheduled timeout
      setStarting(true);

      setError('');

      const timer = window.setTimeout(
        () => {
          const previewAttempt: Attempt = {
            id: 'admin-preview',

            status: 'active',

            current_stage: 'briefing',

            started_at: new Date().toISOString(),

            completed_at: null,
          };

          setAttempt(previewAttempt);

          setStarting(false);
        },

        1200,
      );

      return () => {
        window.clearTimeout(timer);
      };
    }

    // ==================================

    // NORMAL PLAYER MODE

    // ==================================

    if (initialAttempt) {
      setAttempt(initialAttempt);

      setStarting(false);

      const resumePath = getMissionStagePath(
        initialAttempt.current_stage,

        false,
      );

      if (resumePath) {
        router.replace(resumePath);
      }

      return;
    }

    if (startRequested.current) {
      return;
    }

    startRequested.current = true;

    async function startMission() {
      try {
        const response = await fetch(
          '/api/missions/3/start',

          {
            method: 'POST',

            headers: {
              Accept: 'application/json',
            },

            cache: 'no-store',
          },
        );

        const contentType = response.headers.get('content-type');

        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- parsed JSON/text response of unknown shape
        let body: any = null;

        if (contentType?.includes('application/json')) {
          body = await response.json();
        } else {
          const text = await response.text();

          console.error(
            '[MISSION 03] Start returned non-JSON:',

            {
              status: response.status,

              contentType,

              text,
            },
          );

          throw new Error(`Mission start failed with HTTP ${response.status}.`);
        }

        if (!response.ok) {
          throw new Error(body?.message ?? 'Unable to start Mission 03.');
        }

        if (!body?.attempt) {
          throw new Error('Mission attempt was not returned by the server.');
        }

        const loadedAttempt = body.attempt as Attempt;

        setAttempt(loadedAttempt);

        setError('');

        const resumePath = getMissionStagePath(
          loadedAttempt.current_stage,

          false,
        );

        if (resumePath) {
          router.replace(resumePath);
        }
      } catch (err) {
        console.error(
          '[MISSION 03] Start failed:',

          err,
        );

        setError(
          err instanceof Error ? err.message : 'Mission startup failed.',
        );

        startRequested.current = false;
      } finally {
        setStarting(false);
      }
    }

    void startMission();
  }, [initialAttempt, previewMode, router]);

  // ----------------------------------
  // BRIEFING CONTINUE COUNTDOWN
  // ----------------------------------
  //
  // Every player gets a fresh 10-second countdown once the
  // briefing is visible, matching Mission 01 and Mission 02's
  // existing behaviour. This intentionally does NOT use
  // attempt.started_at, since that timestamp may be created
  // before the briefing finishes loading for a particular player.
  // ----------------------------------

  useEffect(() => {
    if (starting || !attempt) {
      return;
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect -- resets the countdown when a new attempt timer starts
    setSecondsRemaining(MISSION_DURATION_SECONDS);

    const interval = window.setInterval(() => {
      setSecondsRemaining((current) => {
        if (current <= 1) {
          window.clearInterval(interval);

          return 0;
        }

        return current - 1;
      });
    }, 1000);

    return () => {
      window.clearInterval(interval);
    };
  }, [starting, attempt?.id]);

  const countdownMinutes = Math.floor(secondsRemaining / 60);

  const countdownSeconds = secondsRemaining % 60;

  const countdownDisplay = `${String(countdownMinutes).padStart(
    2,
    '0',
  )}:${String(countdownSeconds).padStart(2, '0')}`;

  const countdownCritical = secondsRemaining <= 60;

  // ----------------------------------

  // CONTINUE

  // ----------------------------------

  function continueMission() {
    if (!attempt) {
      return;
    }

    if (previewMode) {
      router.push('/admin/missions/3/preview/transmission');

      return;
    }

    router.push('/missions/3/play/transmission');
  }

  function retryConnection() {
    startRequested.current = false;

    setError('');

    setStarting(true);

    window.location.reload();
  }

  // ==================================

  // INITIALIZING VERIFICATION LAB

  // ==================================

  if (starting) {
    return (
      <main className="min-h-screen bg-[#060205] px-4 py-10 text-white">
        <div className="mx-auto max-w-5xl">
          {previewMode && (
            <div className="mb-5 rounded-xl border border-amber-600/50 bg-amber-950/20 px-5 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-300">
                    Admin Preview
                  </p>

                  <p className="mt-1 text-sm text-slate-400">
                    Mission status, player progress and scores will not be
                    changed.
                  </p>
                </div>

                <Link
                  href="/admin"

                  className="rounded-lg border border-amber-700 px-4 py-2 text-sm font-bold text-amber-200 hover:bg-amber-950/40"
                >
                  Exit Preview
                </Link>
              </div>
            </div>
          )}

          <section className="rounded-2xl border border-red-900/60 bg-[#0d0609] p-10 text-center">
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-red-400">
              Cyber Defence Unit
            </p>

            <div className="mx-auto mt-8 flex h-20 w-20 items-center justify-center rounded-full border border-red-600">
              <div className="h-10 w-10 animate-pulse rounded-full bg-red-500/20" />
            </div>

            <h1 className="mt-6 text-3xl font-black">
              Initializing Verification Lab
            </h1>

            <p className="mt-3 text-slate-400">Preparing Mission 03...</p>

            <p className="mt-2 text-sm font-bold uppercase tracking-[0.18em] text-red-400">
              Scanning Intercepted Communications
            </p>

            {previewMode && (
              <p className="mt-5 text-xs font-bold uppercase tracking-[0.18em] text-amber-300">
                Preview Session
              </p>
            )}
          </section>
        </div>
      </main>
    );
  }

  // ==================================

  // CONNECTION ERROR

  // ==================================

  if (error || !attempt) {
    return (
      <main className="min-h-screen bg-[#060205] px-4 py-10 text-white">
        <div className="mx-auto max-w-4xl">
          <section className="rounded-2xl border border-red-900 bg-[#120809] p-8">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-red-400">
              Verification Lab Error
            </p>

            <h1 className="mt-3 text-3xl font-black">
              Mission connection failed
            </h1>

            <p className="mt-4 text-slate-400">
              {error || 'Mission attempt could not be loaded.'}
            </p>

            <button
              type="button"

              onClick={retryConnection}

              className="mt-6 rounded-lg bg-red-500 px-5 py-3 font-bold text-black"
            >
              Retry Connection
            </button>
          </section>
        </div>
      </main>
    );
  }

  // ==================================

  // MISSION BRIEFING

  // ==================================

  return (
    <main className="min-h-screen bg-[#060205] px-4 py-8 text-white sm:px-6">
      <div className="mx-auto max-w-6xl">
        {/* ADMIN PREVIEW BANNER */}

        {previewMode && (
          <div className="mb-5 rounded-xl border border-amber-600/60 bg-amber-950/20 px-5 py-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-300">
                  Admin Preview Mode
                </p>

                <p className="mt-1 text-sm text-slate-300">
                  You are viewing Mission 03 without releasing it to players.
                  Progress, attempts and scores will not be saved.
                </p>
              </div>

              <Link
                href="/admin"

                className="rounded-lg border border-amber-700 px-4 py-2 text-sm font-black text-amber-200 transition hover:bg-amber-950/40"
              >
                Exit Preview
              </Link>
            </div>
          </div>
        )}

        {/* HEADER */}

        <header className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-red-950 bg-[#0d0609] px-5 py-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.28em] text-red-400">
              Cyber Defence Unit
            </p>

            <p className="mt-1 text-sm text-slate-400">
              Synthetic Media Verification Lab
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div
              className={`rounded-lg border px-4 py-2 text-center ${
                countdownCritical
                  ? 'border-red-700 bg-red-950/30'
                  : 'border-red-900 bg-[#0b0407]'
              }`}
            >
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                Time Remaining
              </p>

              <p
                className={`mt-1 font-mono text-xl font-black ${
                  countdownCritical ? 'text-red-300' : 'text-amber-300'
                }`}
              >
                {countdownDisplay}
              </p>
            </div>

            <div className="text-right">
              <p className="text-xs uppercase tracking-widest text-slate-500">
                {previewMode ? 'Administrator' : 'Operative'}
              </p>

              <p className="font-bold">{playerAlias}</p>
            </div>
          </div>
        </header>

        <section className="overflow-hidden rounded-2xl border border-red-950 bg-[#0b0407]">
          {/* MISSION TITLE */}

          <div className="border-b border-red-950 bg-[#140a0d] px-6 py-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.3em] text-red-400">
                  Classified // CDU Internal
                </p>

                <h1 className="mt-3 text-4xl font-black">Mission 03</h1>

                <h2 className="mt-1 text-2xl font-bold text-red-300">
                  TRUST NO ONE
                </h2>

                <p className="mt-1 text-sm font-bold uppercase tracking-[0.2em] text-amber-400">
                  Synthetic Deception
                </p>

                <div className="mt-4 inline-flex items-center gap-2 rounded-lg border border-red-900 bg-black/20 px-3 py-2">
                  <span className="text-sm">⏱</span>

                  <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                    Mission Countdown
                  </span>

                  <span
                    className={`font-mono text-sm font-black ${
                      countdownCritical ? 'text-red-300' : 'text-amber-300'
                    }`}
                  >
                    {countdownDisplay}
                  </span>
                </div>
              </div>

              {previewMode && (
                <div className="rounded-lg border border-amber-700 bg-amber-950/20 px-4 py-2 text-center">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-400">
                    Mode
                  </p>

                  <p className="mt-1 text-sm font-black text-amber-200">
                    PREVIEW
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="grid lg:grid-cols-[1.25fr_.75fr]">
            {/* BRIEFING */}

            <div className="p-6 sm:p-8">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
                Incident 03-AI
              </p>

              <h3 className="mt-2 text-2xl font-black">
                Secure Mission Briefing
              </h3>

              {/* WRITTEN BRIEFING */}

              <div className="mt-8 rounded-2xl border border-red-900 bg-[#0d0507] p-6">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-red-400">
                  Mission Briefing
                </p>

                <div className="mt-5 leading-7 text-slate-300">
                  <p>
                    At 08:42 this morning, multiple employees received
                    communications appearing to originate from Maya Bennett.
                  </p>

                  <p className="mt-4">Maya denies sending them.</p>

                  <p className="mt-4">
                    Analysis of the information uncovered during Mission 02
                    indicates that the attacker obtained enough publicly
                    available material to reproduce Maya&apos;s appearance,
                    voice, communication patterns and professional
                    relationships.
                  </p>

                  <p className="mt-4 font-bold text-white">
                    The attacker has changed tactics.
                  </p>

                  <p className="mt-4">
                    They are no longer stealing Maya&apos;s identity.
                  </p>

                  <p className="mt-4 font-bold text-red-300">
                    They are using it.
                  </p>
                </div>
              </div>

              {/* OBJECTIVE */}

              <div className="mt-6 rounded-2xl border border-amber-900/60 bg-[#120d06] p-6">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-400">
                  Objective
                </p>

                <ul className="mt-4 space-y-3 leading-6 text-slate-300">
                  <li>Determine which communications are authentic.</li>

                  <li>
                    Identify how the synthetic content is being used.
                  </li>

                  <li>
                    Prevent employees from acting on fraudulent instructions.
                  </li>

                  <li>
                    Establish a verification protocol before the attacker
                    escalates the operation.
                  </li>
                </ul>
              </div>

              <div className="mt-6 rounded-2xl border border-cyan-900/60 bg-[#060d11] p-5">
                <p className="text-sm font-bold text-cyan-300">
                  Seeing is no longer believing. Hearing is no longer
                  believing.
                </p>

                <p className="mt-2 text-sm text-slate-400">
                  Trust the verified process, not the appearance.
                </p>
              </div>
            </div>

            {/* MISSION FILE */}

            <aside className="border-t border-red-950 bg-[#0a0406] p-6 lg:border-l lg:border-t-0 sm:p-8">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-red-400">
                Mission File
              </p>

              <dl className="mt-6 space-y-5">
                <div>
                  <dt className="text-xs uppercase text-slate-500">
                    Investigation
                  </dt>

                  <dd className="mt-1 font-bold">Synthetic Identity Operation</dd>
                </div>

                <div>
                  <dt className="text-xs uppercase text-slate-500">Subject</dt>

                  <dd className="mt-1 font-bold">Maya Bennett</dd>
                </div>

                <div>
                  <dt className="text-xs uppercase text-slate-500">
                    Previous Incident
                  </dt>

                  <dd className="mt-1 font-bold">
                    Mission 02 — The Digital Footprint
                  </dd>
                </div>

                <div>
                  <dt className="text-xs uppercase text-slate-500">
                    Investigation Type
                  </dt>

                  <dd className="mt-1 font-bold">
                    Deepfake &amp; Impersonation Verification
                  </dd>
                </div>

                <div>
                  <dt className="text-xs uppercase text-slate-500">
                    Investigation Stages
                  </dt>

                  <dd className="mt-1 font-bold">4</dd>
                </div>

                <div>
                  <dt className="text-xs uppercase text-slate-500">
                    Maximum Score
                  </dt>

                  <dd className="mt-1 font-bold">
                    {MISSION_THREE_MAX_SCORE.toLocaleString()}
                  </dd>
                </div>

                <div>
                  <dt className="text-xs uppercase text-slate-500">
                    Mission 02 Connection
                  </dt>

                  <dd className="mt-1 font-bold text-amber-300">
                    Digital footprint data reused
                  </dd>
                </div>

                {previewMode && (
                  <div>
                    <dt className="text-xs uppercase text-slate-500">
                      Preview Status
                    </dt>

                    <dd className="mt-1 font-bold text-amber-300">
                      No data will be saved
                    </dd>
                  </div>
                )}
              </dl>
            </aside>
          </div>

          {/* CONTINUE */}

          <div className="border-t border-red-950 bg-[#0d0609] px-6 py-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm text-slate-400">
                  {secondsRemaining > 0
                    ? `Review the briefing. Continue unlocks in ${secondsRemaining} second${secondsRemaining === 1 ? '' : 's'}.`
                    : '✓ Verification lab access authorised.'}
                </p>

                {previewMode && (
                  <p className="mt-1 text-xs font-bold text-amber-400">
                    Preview progress will not affect the live mission.
                  </p>
                )}
              </div>

              <button
                type="button"

                disabled={secondsRemaining > 0}

                onClick={continueMission}

                className="rounded-lg bg-red-500 px-6 py-3 font-black text-black transition disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
              >
                {secondsRemaining > 0
                  ? `Enter Verification Lab (${countdownDisplay})`
                  : 'Enter Verification Lab →'}
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
