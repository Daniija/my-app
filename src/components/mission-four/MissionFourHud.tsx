'use client';

import type { MissionFourTimerState } from '@/lib/missions/use-mission-four-timer';
import type { MissionFourStageName } from '@/lib/missions/mission-four-scoring';
import MissionFourSoundToggle from './MissionFourSoundToggle';

const INTENSITY_STYLES: Record<
  MissionFourTimerState['intensity'],
  { border: string; text: string; bg: string; label: string }
> = {
  normal: {
    border: 'border-cyan-900',
    text: 'text-cyan-300',
    bg: 'bg-[#07141d]',
    label: 'Normal',
  },
  warning: {
    border: 'border-amber-700',
    text: 'text-amber-300',
    bg: 'bg-amber-950/20',
    label: 'Warning',
  },
  critical: {
    border: 'border-orange-700',
    text: 'text-orange-300',
    bg: 'bg-orange-950/25',
    label: 'Critical',
  },
  zero_hour: {
    border: 'border-red-600',
    text: 'text-red-300',
    bg: 'bg-red-950/35',
    label: 'Zero Hour',
  },
};

const STAGE_LABELS: Record<MissionFourStageName, string> = {
  triage: 'Triage',
  trace: 'Trace',
  contain: 'Contain',
  disarm: 'Disarm',
};

// Persistent command-centre header: countdown, current stage, score,
// threat level, sound control. Reduced-motion respected via the
// "animate-pulse" utility being disabled globally for
// prefers-reduced-motion in globals.css's MISSION 04 block.
export default function MissionFourHud({
  stage,
  score,
  timer,
  soundEnabled,
  onToggleSound,
}: {
  stage: MissionFourStageName;
  score: number;
  timer: MissionFourTimerState;
  soundEnabled: boolean;
  onToggleSound: () => void;
}) {
  const style = INTENSITY_STYLES[timer.intensity];

  return (
    <header
      className={`sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3 backdrop-blur sm:px-6 ${style.border} ${style.bg}`}
      role="banner"
      aria-live="polite"
    >
      <div className="flex items-center gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">
            Mission 04
          </p>
          <p className="text-sm font-black uppercase tracking-[0.1em]">Zero Hour</p>
        </div>

        <span className="hidden h-8 w-px bg-slate-800 sm:block" />

        <div className="hidden sm:block">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">
            Stage
          </p>
          <p className="text-sm font-bold">{STAGE_LABELS[stage]}</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">
            Score
          </p>
          <p className="font-mono text-lg font-black tabular-nums">{score}</p>
        </div>

        <div
          className={`rounded-lg border px-3 py-1.5 text-center ${style.border} ${style.bg}`}
        >
          <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${style.text}`}>
            {style.label}
          </p>
          <p
            className={`font-mono text-2xl font-black tabular-nums ${style.text} ${
              timer.intensity === 'zero_hour' ? 'mission4-timer-pulse' : ''
            }`}
          >
            {timer.formatted}
          </p>
        </div>

        <MissionFourSoundToggle enabled={soundEnabled} onToggle={onToggleSound} />
      </div>
    </header>
  );
}
