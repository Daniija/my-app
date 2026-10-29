import Link from 'next/link';

import {
  MISSION_FOUR_MAX_SCORE,
  MISSION_FOUR_STAGE_POINTS,
  MISSION_FOUR_STAGE_ORDER,
  type MissionFourStageName,
} from '@/lib/missions/mission-four-scoring';

const STAGE_LABELS: Record<MissionFourStageName, string> = {
  triage: 'Triage',
  trace: 'Trace',
  contain: 'Contain',
  disarm: 'Disarm',
};

// One component, two states (success/failed) -- mirrors
// MissionThreeReport.tsx's convention. Only ever shown real game
// state: totalScore/stageEarned/remainingSeconds come from the
// actual mission_scores/mission_progress rows (or, in preview mode,
// the admin's own real preview answers), never fabricated sample data.
export default function MissionFourReport({
  outcome,
  stageEarned,
  totalScore,
  remainingSeconds,
  previewMode,
}: {
  outcome: 'success' | 'failed';
  stageEarned: Partial<Record<MissionFourStageName, number>>;
  totalScore: number;
  remainingSeconds: number | null;
  previewMode?: boolean;
}) {
  const minutes = remainingSeconds !== null ? Math.floor(remainingSeconds / 60) : null;
  const seconds = remainingSeconds !== null ? remainingSeconds % 60 : null;

  return (
    <div className="space-y-6">
      {previewMode && (
        <div className="rounded-xl border border-amber-600/60 bg-amber-950/20 px-5 py-4">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-300">
            Admin Preview Mode
          </p>
          <p className="mt-1 text-sm text-slate-300">
            This report shows your real preview answers. Nothing was saved.
          </p>
        </div>
      )}

      <div
        className={`overflow-hidden rounded-2xl border bg-[#0a0407] ${
          outcome === 'success' ? 'border-emerald-900' : 'border-red-950'
        }`}
      >
        <div
          className={`border-b px-6 py-8 text-center sm:px-8 ${
            outcome === 'success'
              ? 'border-emerald-900 bg-[#06160f]'
              : 'border-red-950 bg-[#140a0d]'
          }`}
        >
          {outcome === 'success' ? (
            <>
              <p className="text-xs font-black uppercase tracking-[0.3em] text-emerald-400">
                Payload Neutralized
              </p>
              <h1 className="mt-3 text-3xl font-black">Detonation Sequence Terminated</h1>
              <p className="mt-2 text-lg font-bold text-emerald-300">Mission 04 Complete</p>
              <p className="mt-4 text-sm font-bold uppercase tracking-[0.2em] text-slate-400">
                Cyber Defence Unit — Mission Accomplished
              </p>
            </>
          ) : (
            <>
              <p className="font-mono text-5xl font-black text-red-500">00:00</p>
              <h1 className="mt-4 text-2xl font-black uppercase tracking-[0.15em] text-red-400">
                Payload Executed
              </h1>
              <p className="mt-2 text-lg font-bold uppercase tracking-[0.1em] text-slate-300">
                Mission Failed
              </p>
            </>
          )}

          <p
            className={`mt-6 font-mono text-3xl font-black ${
              outcome === 'success' ? 'text-emerald-300' : 'text-red-300'
            }`}
          >
            {totalScore} / {MISSION_FOUR_MAX_SCORE}
          </p>

          {remainingSeconds !== null && (
            <p className="mt-2 text-sm font-bold text-slate-400">
              Remaining time: {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
            </p>
          )}
        </div>

        <div className="p-6 sm:p-8">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">
            Stage Breakdown
          </p>

          <div className="mt-4 space-y-2">
            {MISSION_FOUR_STAGE_ORDER.map((stage) => {
              const earned = stageEarned[stage] ?? 0;
              const max = MISSION_FOUR_STAGE_POINTS[stage];

              return (
                <div
                  key={stage}
                  className="flex items-center justify-between gap-3 rounded-lg border border-slate-800 bg-[#0a0608] px-4 py-3 text-sm"
                >
                  <span className="font-bold text-slate-300">{STAGE_LABELS[stage]}</span>
                  <span className="font-mono font-black text-slate-200">
                    {earned} / {max}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="border-t border-slate-900 bg-[#0d0609] p-6 sm:p-8">
          <Link
            href={previewMode ? '/admin' : '/dashboard'}
            className="rounded-lg bg-white px-5 py-2.5 font-black text-black transition hover:bg-slate-200"
          >
            {previewMode ? 'Exit Preview' : 'Return to Dashboard'}
          </Link>
        </div>
      </div>
    </div>
  );
}
