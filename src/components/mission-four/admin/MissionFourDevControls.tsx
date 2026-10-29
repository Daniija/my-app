'use client';

import Link from 'next/link';

import type { MissionFourStageName } from '@/lib/missions/mission-four-scoring';

const STAGES: MissionFourStageName[] = ['triage', 'trace', 'contain', 'disarm'];

// Dev-only test panel -- rendered ONLY from the admin preview tree
// (never imported anywhere under src/app/missions/4/play/**) and
// gated at the page level by both requireAdmin() and
// process.env.NODE_ENV !== 'production' (Next.js inlines and
// tree-shakes that check at build time). Preview mode never writes
// to the DB, so every control here only ever mutates local React
// state in the preview page -- there is no backing API route, and
// no real mission_attempts row these controls could ever touch even
// if someone bypassed the UI gating (admin-role profiles are already
// redirected away from creating a real attempt at every mission's
// start route).
export default function MissionFourDevControls({
  currentStage,
  paused,
  onTogglePause,
  onFastForward,
  onReset,
}: {
  currentStage: MissionFourStageName;
  paused: boolean;
  onTogglePause: () => void;
  onFastForward: () => void;
  onReset: () => void;
}) {
  return (
    <div className="border-b border-amber-700 bg-amber-950/20 px-4 py-3 sm:px-6">
      <p className="mb-2 text-[10px] font-black uppercase tracking-[0.25em] text-amber-300">
        Dev Controls (preview only — never shown to players)
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={onTogglePause} className="btn btn-secondary px-3 py-1.5 text-xs">
          {paused ? 'Resume' : 'Pause'}
        </button>

        <button type="button" onClick={onFastForward} className="btn btn-secondary px-3 py-1.5 text-xs">
          Fast-forward to Zero Hour
        </button>

        <button type="button" onClick={onReset} className="btn btn-secondary px-3 py-1.5 text-xs">
          Reset
        </button>

        <span className="mx-1 hidden h-6 w-px bg-amber-800 sm:block" />

        {STAGES.map((stage) => (
          <Link
            key={stage}
            href={`/admin/missions/4/preview/${stage}`}
            className={`btn px-3 py-1.5 text-xs ${
              stage === currentStage ? 'btn-primary' : 'btn-secondary'
            }`}
          >
            Jump: {stage}
          </Link>
        ))}

        <span className="mx-1 hidden h-6 w-px bg-amber-800 sm:block" />

        <Link
          href="/admin/missions/4/preview/report?outcome=success"
          className="btn btn-secondary px-3 py-1.5 text-xs"
        >
          Force Success
        </Link>

        <Link
          href="/admin/missions/4/preview/report?outcome=failed"
          className="btn btn-secondary px-3 py-1.5 text-xs"
        >
          Force Failure
        </Link>
      </div>
    </div>
  );
}
