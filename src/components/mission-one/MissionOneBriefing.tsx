'use client';

import Link from 'next/link';

import {
  useEffect,
  useRef,
  useState,
} from 'react';

import { useRouter } from 'next/navigation';

type Attempt = {
  id: string;
  status: string;
  current_stage: string | null;
  started_at: string | null;
  completed_at: string | null;
};

function getMissionStagePath(
  stage: string | null | undefined,
  previewMode = false
) {
  const base = previewMode
    ? '/admin/missions/1/preview'
    : '/missions/1/play';

  switch (stage) {
    case 'incident':
      return `${base}/incident`;

    case 'evidence':
      return `${base}/evidence`;

    case 'theory':
      return `${base}/theory`;

    case 'containment':
      return `${base}/containment`;

    case 'report':
      return `${base}/report`;

    case 'briefing':
    default:
      return null;
  }
}

export default function MissionOneBriefing({
  initialAttempt,
  playerAlias,
  previewMode = false,
}: {
  initialAttempt: Attempt | null;
  playerAlias: string;
  previewMode?: boolean;
}) {
  const router = useRouter();

  const startRequested =
    useRef(false);

  const [attempt, setAttempt] =
    useState<Attempt | null>(
      initialAttempt
    );

  const [starting, setStarting] =
    useState(!initialAttempt);

  const [error, setError] =
    useState('');

  const [canContinue, setCanContinue] =
    useState(false);

  const [secondsLeft, setSecondsLeft] =
    useState(10);

  // ---------------------------------------
  // START / RESUME MISSION
  // ---------------------------------------

  useEffect(() => {
    // ==================================
    // ADMIN PREVIEW MODE
    //
    // Do NOT:
    // - call /api/missions/1/start
    // - create mission_attempts
    // - require Mission 01 to be open
    //
    // We still show the secure-channel
    // animation so the admin sees the
    // same experience as a player.
    // ==================================

    if (previewMode) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- preview animation resets state before the scheduled timeout
      setStarting(true);
      setError('');

      const timer = window.setTimeout(() => {
        const previewAttempt: Attempt = {
          id: 'admin-preview',
          status: 'active',
          current_stage: 'briefing',
          started_at: new Date().toISOString(),
          completed_at: null,
        };

        setAttempt(previewAttempt);
        setStarting(false);
      }, 1200);

      return () => {
        window.clearTimeout(timer);
      };
    }

    if (initialAttempt) {
      setAttempt(initialAttempt);
      setStarting(false);

      const resumePath =
        getMissionStagePath(
          initialAttempt.current_stage
        );

      if (resumePath) {
        router.replace(
          resumePath
        );
      }

      return;
    }

    if (
      startRequested.current
    ) {
      return;
    }

    startRequested.current = true;

    async function startMission() {
      try {
        const response =
          await fetch(
            '/api/missions/1/start',
            {
              method: 'POST',

              headers: {
                Accept:
                  'application/json',
              },

              cache: 'no-store',
            }
          );

        const contentType =
          response.headers.get(
            'content-type'
          );

        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- parsed JSON/text response of unknown shape
        let body: any = null;

        if (
          contentType?.includes(
            'application/json'
          )
        ) {
          body =
            await response.json();
        } else {
          const text =
            await response.text();

          console.error(
            '[MISSION 01] Start returned non-JSON:',
            {
              status:
                response.status,
              contentType,
              text,
            }
          );

          throw new Error(
            `Mission start failed with HTTP ${response.status}.`
          );
        }

        if (!response.ok) {
          throw new Error(
            body?.message ??
              'Unable to start Mission 01.'
          );
        }

        if (!body?.attempt) {
          throw new Error(
            'Mission attempt was not returned by the server.'
          );
        }

        const loadedAttempt =
          body.attempt as Attempt;

        setAttempt(
          loadedAttempt
        );

        setError('');

        const resumePath =
          getMissionStagePath(
            loadedAttempt.current_stage
          );

        if (resumePath) {
          router.replace(
            resumePath
          );
        }
      } catch (err) {
        console.error(
          '[MISSION 01] Start failed:',
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : 'Mission startup failed.'
        );

        startRequested.current =
          false;
      } finally {
        setStarting(false);
      }
    }

    void startMission();
  }, [
    initialAttempt,
    previewMode,
    router,
  ]);

  // ---------------------------------------
  // 10 SECOND READING TIMER
  // ---------------------------------------

  useEffect(() => {
    if (
      starting ||
      error ||
      !attempt ||
      canContinue
    ) {
      return;
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect -- resets the countdown when a new attempt timer starts
    setSecondsLeft(10);

    const interval =
      window.setInterval(() => {
        setSecondsLeft(
          (current) => {
            if (
              current <= 1
            ) {
              window.clearInterval(
                interval
              );

              setCanContinue(
                true
              );

              return 0;
            }

            return (
              current - 1
            );
          }
        );
      }, 1000);

    return () => {
      window.clearInterval(
        interval
      );
    };
  }, [
    starting,
    error,
    attempt,
    canContinue,
  ]);

  // ---------------------------------------
  // CONTINUE
  // ---------------------------------------

  function continueMission() {
    if (
      !attempt ||
      !canContinue
    ) {
      return;
    }

    if (previewMode) {
      router.push(
        '/admin/missions/1/preview/incident'
      );

      return;
    }

    router.push(
      '/missions/1/play/incident'
    );
  }

  function retryConnection() {
    startRequested.current =
      false;

    setError('');
    setStarting(true);

    window.location.reload();
  }

  // ---------------------------------------
  // LOADING
  // ---------------------------------------

  if (starting) {
    return (
      <main className="min-h-screen bg-[#02080d] px-4 py-10 text-white">
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

          <section className="rounded-2xl border border-cyan-900 bg-[#07141d] p-10 text-center">
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-cyan-400">
              Cyber Defence Unit
            </p>

            <h1 className="mt-4 text-3xl font-black">
              Establishing Secure
              Channel
            </h1>

            <p className="mt-3 text-slate-400">
              Preparing Mission
              01...
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

  // ---------------------------------------
  // ERROR
  // ---------------------------------------

  if (
    error ||
    !attempt
  ) {
    return (
      <main className="min-h-screen bg-[#02080d] px-4 py-10 text-white">
        <div className="mx-auto max-w-4xl">
          <section className="rounded-2xl border border-red-900 bg-[#120809] p-8">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-red-400">
              Secure Channel
              Error
            </p>

            <h1 className="mt-3 text-3xl font-black">
              Mission connection
              failed
            </h1>

            <p className="mt-4 text-slate-400">
              {error ||
                'Mission attempt could not be loaded.'}
            </p>

            <button
              type="button"
              onClick={
                retryConnection
              }
              className="mt-6 rounded-lg bg-cyan-400 px-5 py-3 font-bold text-black"
            >
              Retry Connection
            </button>
          </section>
        </div>
      </main>
    );
  }

  // ---------------------------------------
  // BRIEFING PAGE
  // ---------------------------------------

  return (
    <main className="min-h-screen bg-[#02080d] px-4 py-8 text-white sm:px-6">
      <div className="mx-auto max-w-6xl">
        {previewMode && (
          <div className="mb-5 rounded-xl border border-amber-600/60 bg-amber-950/20 px-5 py-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-300">
                  Admin Preview Mode
                </p>

                <p className="mt-1 text-sm text-slate-300">
                  You are viewing Mission 01 without releasing it to players.
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

        {/* TOP BAR */}
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-cyan-950 bg-[#07141d] px-5 py-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.28em] text-cyan-400">
              Cyber Defence Unit
            </p>

            <p className="mt-1 text-sm text-slate-400">
              Secure Operations
              Network
            </p>
          </div>

          <div className="text-right">
            <p className="text-xs uppercase tracking-widest text-slate-500">
              {previewMode ? 'Administrator' : 'Operative'}
            </p>

            <p className="font-bold">
              {playerAlias}
            </p>
          </div>
        </header>

        <section className="overflow-hidden rounded-2xl border border-cyan-950 bg-[#061019]">
          {/* MISSION HEADER */}
          <div className="border-b border-cyan-950 bg-[#081822] px-6 py-5">
            <p className="text-xs font-black uppercase tracking-[0.3em] text-red-400">
              Priority
              Transmission
            </p>

            <h1 className="mt-3 text-4xl font-black">
              Mission 01
            </h1>

            <h2 className="mt-1 text-2xl font-bold text-cyan-300">
              THE BREACH
            </h2>
          </div>

          <div className="grid lg:grid-cols-[1.25fr_.75fr]">
            {/* TRANSMISSION */}
            <div className="p-6 sm:p-8">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
                Security Operations
                Centre
              </p>

              <h3 className="mt-2 text-2xl font-black">
                Secure Mission
                Briefing
              </h3>

              <p className="mt-3 leading-7 text-slate-400">
                Read the secure
                transmission carefully
                before beginning the
                investigation.
              </p>

              <div className="mt-8 overflow-hidden rounded-2xl border border-cyan-900 bg-[#020b11]">
                {/* TRANSMISSION HEADER */}
                <div className="border-b border-cyan-950 bg-[#04141e] px-6 py-5">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-400">
                        Secure
                        Transmission
                      </p>

                      <p className="mt-1 font-bold">
                        Incident
                        Briefing
                      </p>

                      <p className="text-sm text-slate-500">
                        Finance
                        Department
                      </p>
                    </div>

                    <div className="rounded-full border border-emerald-800 bg-emerald-950/30 px-3 py-1">
                      <p className="text-xs font-bold text-emerald-400">
                        ● RECEIVED
                      </p>
                    </div>
                  </div>
                </div>

                {/* TRANSMISSION BODY */}
                <div className="p-6 leading-7 text-slate-300">
                  <p>
                    Good morning,
                    Agent.
                  </p>

                  <p className="mt-4">
                    At 09:17 this
                    morning, our
                    security monitoring
                    system detected
                    unusual activity
                    involving an
                    employee account in
                    the Finance
                    Department.
                  </p>

                  <p className="mt-4">
                    A restricted folder
                    was accessed using
                    the credentials of
                    Maya Bennett.
                  </p>

                  <p className="mt-4">
                    Maya has confirmed
                    that she did not
                    access the folder
                    and has not signed
                    in from another
                    device.
                  </p>

                  <p className="mt-4">
                    Your assignment is
                    to determine how the
                    account was
                    compromised.
                  </p>

                  <p className="mt-4">
                    Review the digital
                    evidence,
                    reconstruct the
                    attack, and
                    recommend the
                    correct containment
                    response.
                  </p>

                  <p className="mt-5 font-bold text-cyan-300">
                    Trust the evidence.
                    Question
                    assumptions.
                    Mission One begins
                    now.
                  </p>
                </div>
              </div>
            </div>

            {/* MISSION FILE */}
            <aside className="border-t border-cyan-950 bg-[#041018] p-6 lg:border-l lg:border-t-0 sm:p-8">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-400">
                Mission File
              </p>

              <dl className="mt-6 space-y-5">
                <div>
                  <dt className="text-xs uppercase text-slate-500">
                    Incident
                  </dt>

                  <dd className="mt-1 font-bold">
                    Unauthorized
                    Account Access
                  </dd>
                </div>

                <div>
                  <dt className="text-xs uppercase text-slate-500">
                    Department
                  </dt>

                  <dd className="mt-1 font-bold">
                    Finance
                  </dd>
                </div>

                <div>
                  <dt className="text-xs uppercase text-slate-500">
                    Subject
                  </dt>

                  <dd className="mt-1 font-bold">
                    Maya Bennett
                  </dd>
                </div>

                <div>
                  <dt className="text-xs uppercase text-slate-500">
                    Alert Time
                  </dt>

                  <dd className="mt-1 font-bold">
                    09:17
                  </dd>
                </div>

                <div>
                  <dt className="text-xs uppercase text-slate-500">
                    Evidence Files
                  </dt>

                  <dd className="mt-1 font-bold">
                    10
                  </dd>
                </div>

                <div>
                  <dt className="text-xs uppercase text-slate-500">
                    Maximum Score
                  </dt>

                  <dd className="mt-1 font-bold">
                    1,500
                  </dd>
                </div>
              </dl>
            </aside>
          </div>

          {/* CONTINUE AREA */}
          <div className="border-t border-cyan-950 bg-[#07141d] px-6 py-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                {canContinue ? (
                  <>
                    <p className="text-sm font-bold text-emerald-400">
                      ✓ Investigation
                      access authorised.
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      Proceed when
                      ready.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-slate-400">
                      Read the
                      transmission before
                      continuing.
                    </p>

                    <p className="mt-1 text-xs font-bold text-amber-300">
                      Access unlocks in{' '}
                      {secondsLeft}{' '}
                      {secondsLeft === 1
                        ? 'second'
                        : 'seconds'}
                    </p>
                  </>
                )}

                {previewMode && (
                  <p className="mt-1 text-xs font-bold text-amber-400">
                    Preview progress will not affect the live mission.
                  </p>
                )}
              </div>

              <button
                type="button"
                disabled={
                  !canContinue
                }
                onClick={
                  continueMission
                }
                className="rounded-lg bg-cyan-400 px-6 py-3 font-black text-black disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
              >
                {canContinue
                  ? 'Continue to Incident Briefing'
                  : `Locked (${secondsLeft}s)`}
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}