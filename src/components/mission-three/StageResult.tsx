import type { MissionThreeSubmitResult } from '@/lib/missions/use-mission-three-submit';

const OUTCOME_COPY: Record<
  MissionThreeSubmitResult['outcome'],
  { title: string; className: string }
> = {
  correct: {
    title: 'Verified response logged.',
    className: 'border-emerald-700 bg-emerald-950/30 text-emerald-200',
  },
  partial: {
    title: 'Safe, but incomplete.',
    className: 'border-amber-700 bg-amber-950/30 text-amber-200',
  },
  incorrect: {
    title: 'This response exposed the organisation.',
    className: 'border-red-700 bg-red-950/30 text-red-200',
  },
};

export default function StageResult({
  result,
  explanation,
  previewMode,
  onContinue,
  continueLabel,
}: {
  result: MissionThreeSubmitResult;
  explanation: string;
  previewMode: boolean;
  onContinue: () => void;
  continueLabel: string;
}) {
  const copy = OUTCOME_COPY[result.outcome];

  return (
    <div className={`rounded-xl border p-5 ${copy.className}`}>
      <p className="font-black uppercase tracking-[0.1em]">{copy.title}</p>

      <p className="mt-2 text-sm leading-6 opacity-90">{explanation}</p>

      {!previewMode && (
        <p className="mt-3 font-mono text-sm font-bold">
          +{result.points} points
        </p>
      )}

      {previewMode && (
        <p className="mt-3 text-xs font-bold uppercase tracking-[0.14em] text-amber-300">
          Preview — no score recorded
        </p>
      )}

      <button
        type="button"
        onClick={onContinue}
        className="mt-5 rounded-lg bg-white px-5 py-2.5 font-black text-black transition hover:bg-slate-200"
      >
        {continueLabel}
      </button>
    </div>
  );
}
