'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import { clearPreviewStageScores } from '@/lib/missions/mission-four-preview-score';

type Attempt = {
  id: string;
  status: string;
  current_stage: string | null;
  started_at: string | null;
  completed_at: string | null;
};

function getMissionStagePath(stage: string | null | undefined, previewMode: boolean) {
  const base = previewMode ? '/admin/missions/4/preview' : '/missions/4/play';

  switch (stage) {
    case 'triage':
      return `${base}/triage`;
    case 'trace':
      return `${base}/trace`;
    case 'contain':
      return `${base}/contain`;
    case 'disarm':
      return `${base}/disarm`;
    case 'report':
      return `${base}/report`;
    case 'briefing':
    default:
      return null;
  }
}

export default function MissionFourBriefing({
  initialAttempt,
  previewMode = false,
}: {
  initialAttempt: Attempt | null;
  previewMode?: boolean;
}) {
  const router = useRouter();
  const startRequested = useRef(false);

  const [attempt, setAttempt] = useState<Attempt | null>(initialAttempt);
  const [loading, setLoading] = useState(!initialAttempt);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (previewMode) {
      clearPreviewStageScores();

      const previewAttempt: Attempt = {
        id: 'admin-preview',
        status: 'active',
        current_stage: 'briefing',
        started_at: new Date().toISOString(),
        completed_at: null,
      };

      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot preview attempt initialization
      setAttempt(previewAttempt);
      setLoading(false);
      return;
    }

    if (initialAttempt) {
      setAttempt(initialAttempt);
      setLoading(false);

      const resumePath = getMissionStagePath(initialAttempt.current_stage, false);

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
        const response = await fetch('/api/missions/4/start', {
          method: 'POST',
          headers: { Accept: 'application/json' },
          cache: 'no-store',
        });

        const body = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(body?.message ?? 'Unable to start Mission 04.');
        }

        if (!body?.attempt) {
          throw new Error('Mission attempt was not returned by the server.');
        }

        const loadedAttempt = body.attempt as Attempt;
        setAttempt(loadedAttempt);
        setError('');

        const resumePath = getMissionStagePath(loadedAttempt.current_stage, false);

        if (resumePath) {
          router.replace(resumePath);
        }
      } catch (err) {
        console.error('[MISSION 04] Start failed:', err);
        setError(err instanceof Error ? err.message : 'Mission startup failed.');
        startRequested.current = false;
      } finally {
        setLoading(false);
      }
    }

    void startMission();
  }, [initialAttempt, previewMode, router]);

  async function handleStartMission() {
    if (!attempt || starting) return;

    setStarting(true);
    setError('');

    if (previewMode) {
      router.push('/admin/missions/4/preview/triage');
      return;
    }

    try {
      const response = await fetch('/api/missions/4/triage/begin', { method: 'POST' });
      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(body?.message ?? 'Unable to start the countdown.');
      }

      router.push('/missions/4/play/triage');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to start the countdown.');
      setStarting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#02050a] px-4 py-10 text-white sm:px-6">
      <div className="mx-auto max-w-3xl">
        <div className="overflow-hidden rounded-2xl border border-red-950 bg-[#0a0407]">
          <div className="border-b border-red-950 bg-[#140a0d] px-6 py-6 text-center sm:px-8">
            <p className="text-xs font-black uppercase tracking-[0.35em] text-red-500">
              Mission 04
            </p>
            <h1 className="mt-3 text-4xl font-black tracking-wide sm:text-5xl">
              ZERO HOUR
            </h1>
            <p className="mt-2 text-sm font-bold uppercase tracking-[0.3em] text-slate-400">
              Final Operation
            </p>
          </div>

          <div className="p-6 sm:p-8">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-red-800 bg-red-950/30 px-4 py-1.5">
              <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
              <span className="text-xs font-black uppercase tracking-[0.2em] text-red-300">
                Threat Level: Critical
              </span>
            </div>

            <div className="space-y-3 text-sm leading-7 text-slate-300 sm:text-base">
              <p>Payload detected.</p>
              <p>Detonation sequence armed.</p>
              <p className="font-bold text-white">
                Your team must identify the threat, trace the intrusion, contain the
                attack and disarm the payload before time expires.
              </p>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-4">
              {[
                { n: '01', label: 'Triage' },
                { n: '02', label: 'Trace' },
                { n: '03', label: 'Contain' },
                { n: '04', label: 'Disarm' },
              ].map((stage) => (
                <div
                  key={stage.n}
                  className="rounded-xl border border-slate-800 bg-[#0a0608] p-3 text-center"
                >
                  <p className="font-mono text-xs text-slate-500">{stage.n}</p>
                  <p className="mt-1 text-sm font-black uppercase tracking-[0.1em]">
                    {stage.label}
                  </p>
                </div>
              ))}
            </div>

            {error && (
              <p className="mt-6 text-sm font-bold text-red-400">{error}</p>
            )}

            <button
              type="button"
              disabled={loading || starting || !attempt}
              onClick={handleStartMission}
              className="mt-8 w-full rounded-lg bg-red-500 px-6 py-4 text-lg font-black uppercase tracking-[0.15em] text-black transition hover:bg-red-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
            >
              {loading
                ? 'Establishing Secure Channel...'
                : starting
                  ? 'Arming Countdown...'
                  : 'Start Mission'}
            </button>

            <p className="mt-3 text-center text-xs text-slate-500">
              The countdown begins the moment you start the mission -- not before.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
