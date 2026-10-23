import Link from 'next/link';

import {
  MISSION_THREE_MAX_SCORE,
  MISSION_THREE_STAGE_POINTS,
  type MissionThreeStage,
} from '@/lib/missions/mission-three-scoring';

const STAGE_LABELS: Record<MissionThreeStage, string> = {
  voice: 'Executive Voice Verification',
  email: 'Executive Impersonation Email',
  verification: 'Verification Protocol',
  final: 'The AI Deepfake Threat',
};

const STAGE_ORDER: MissionThreeStage[] = [
  'voice',
  'email',
  'verification',
  'final',
];

export default function MissionThreeReport({
  stageEarned,
  totalScore,
  previewMode,
}: {
  stageEarned: Partial<Record<MissionThreeStage, number>>;
  totalScore: number;
  previewMode?: boolean;
}) {
  return (
    <div className="space-y-6">
      {previewMode && (
        <div className="rounded-xl border border-amber-600/60 bg-amber-950/20 px-5 py-4">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-300">
            Admin Preview Mode
          </p>
          <p className="mt-1 text-sm text-slate-300">
            This report shows sample data. Nothing was saved.
          </p>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-red-950 bg-[#0b0407]">
        <div className="border-b border-red-950 bg-[#140a0d] px-6 py-6 text-center sm:px-8">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-emerald-400">
            Mission Complete
          </p>

          <h1 className="mt-3 text-3xl font-black">Mission 03 — Trust No One</h1>

          <div className="mx-auto mt-5 max-w-lg space-y-1 text-sm text-slate-300">
            <p>Synthetic communications identified.</p>
            <p>Verification protocol established.</p>
            <p>Identity-based attack contained.</p>
          </div>

          <p className="mt-6 font-mono text-3xl font-black text-emerald-300">
            {totalScore} / {MISSION_THREE_MAX_SCORE}
          </p>
        </div>

        <div className="p-6 sm:p-8">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">
            Stage Breakdown
          </p>

          <div className="mt-4 space-y-2">
            {STAGE_ORDER.map((stage) => {
              const earned = stageEarned[stage] ?? 0;
              const max = MISSION_THREE_STAGE_POINTS[stage];

              return (
                <div
                  key={stage}
                  className="flex items-center justify-between gap-3 rounded-lg border border-slate-800 bg-[#0a0608] px-4 py-3 text-sm"
                >
                  <span className="font-bold text-slate-300">
                    {STAGE_LABELS[stage]}
                  </span>
                  <span className="font-mono font-black text-slate-200">
                    {earned} / {max}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* CLIFFHANGER */}
        <div className="border-t border-red-950 bg-[#120609] p-6 sm:p-8">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-red-400">
            Threat Escalation Detected
          </p>

          <div className="mt-4 space-y-3 text-sm leading-6 text-slate-300">
            <p>The synthetic media campaign was not the final attack.</p>
            <p className="font-bold text-white">It was a test.</p>
            <p>
              While employees were focused on identifying fraudulent
              communications, additional unauthorized activity was
              detected across multiple systems.
            </p>
            <p className="font-bold text-red-300">
              The attacker has entered the final phase.
            </p>
          </div>

          <p className="mt-6 font-black uppercase tracking-[0.1em] text-red-400">
            Final Operation Incoming.
          </p>

          <p className="mt-2 text-lg font-black">
            Trust No One. Verify Everything.
          </p>
        </div>

        <div className="border-t border-red-950 bg-[#0d0609] p-6 sm:p-8">
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
