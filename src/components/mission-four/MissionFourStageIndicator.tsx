'use client';

import { MISSION_FOUR_STAGE_ORDER } from '@/lib/missions/mission-four-scoring';
import type { MissionFourStageName } from '@/lib/missions/mission-four-scoring';

type StageState = 'locked' | 'active' | 'cleared';

const STAGE_LABELS: Record<MissionFourStageName, string> = {
  triage: 'Triage',
  trace: 'Trace',
  contain: 'Contain',
  disarm: 'Disarm',
};

// 4-stage LOCKED/ACTIVE/CLEARED indicator. Styling approach
// referenced from MissionTwoCommandCentre.tsx's state->class mapping
// for its room cards (not reused code, that component is specific to
// 10 Mission 02 rooms) -- same 3-state visual language, adapted.
export default function MissionFourStageIndicator({
  currentStage,
}: {
  currentStage: MissionFourStageName;
}) {
  const currentIndex = MISSION_FOUR_STAGE_ORDER.indexOf(currentStage);

  return (
    <div
      className="grid grid-cols-2 gap-2 sm:grid-cols-4"
      role="list"
      aria-label="Mission stage progress"
    >
      {MISSION_FOUR_STAGE_ORDER.map((stage, index) => {
        const state: StageState =
          index < currentIndex ? 'cleared' : index === currentIndex ? 'active' : 'locked';

        const styles =
          state === 'cleared'
            ? 'border-emerald-800 bg-emerald-950/15 text-emerald-300'
            : state === 'active'
              ? 'border-red-600 bg-red-950/20 text-red-200'
              : 'border-slate-800 bg-[#050d13] text-slate-600';

        return (
          <div
            key={stage}
            role="listitem"
            className={`relative overflow-hidden rounded-xl border p-3 text-center ${styles}`}
          >
            {state === 'active' && (
              <span className="absolute inset-x-0 top-0 h-1 bg-red-500" aria-hidden="true" />
            )}

            <p className="font-mono text-xs opacity-70">
              {String(index + 1).padStart(2, '0')}
            </p>
            <p className="mt-1 text-sm font-black uppercase tracking-[0.1em]">
              {STAGE_LABELS[stage]}
            </p>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.15em] opacity-80">
              {state === 'cleared' ? '✓ Cleared' : state === 'active' ? 'Active' : '🔒 Locked'}
            </p>
          </div>
        );
      })}
    </div>
  );
}
