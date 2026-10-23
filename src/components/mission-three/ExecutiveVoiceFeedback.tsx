export type ExecutiveVoiceOutcome = 'correct' | 'partial' | 'incorrect';

const OUTCOME_COPY: Record<
  ExecutiveVoiceOutcome,
  { heading: string; className: string }
> = {
  correct: {
    heading: 'IDENTITY DECISION: CORRECT',
    className: 'border-emerald-700 bg-emerald-950/30 text-emerald-200',
  },
  partial: {
    heading: 'SAFE, BUT INCOMPLETE',
    className: 'border-amber-700 bg-amber-950/30 text-amber-200',
  },
  incorrect: {
    heading: 'TRUST FAILURE',
    className: 'border-red-700 bg-red-950/30 text-red-200',
  },
};

// Unlike StageResult.tsx (which always prepends "+" since every
// other Mission 03 stage only ever scores 0 or positive), Executive
// Voice Verification rounds can score negative -- this renders the
// real sign instead of assuming one.
function formatSignedPoints(points: number) {
  return points > 0 ? `+${points}` : `${points}`;
}

export default function ExecutiveVoiceFeedback({
  outcome,
  points,
  previewMode,
  explanation,
  breakdown,
  onContinue,
  continueLabel,
}: {
  outcome: ExecutiveVoiceOutcome;
  points: number;
  previewMode: boolean;
  explanation: string;
  breakdown?: { label: string; value: number }[];
  onContinue: () => void;
  continueLabel: string;
}) {
  const copy = OUTCOME_COPY[outcome];

  return (
    <div className={`rounded-xl border p-5 ${copy.className}`}>
      <p className="font-black uppercase tracking-[0.1em]">{copy.heading}</p>

      {!previewMode && (
        <p className="mt-2 font-mono text-lg font-black">
          {formatSignedPoints(points)} POINTS
        </p>
      )}

      {previewMode && (
        <p className="mt-2 text-xs font-bold uppercase tracking-[0.14em] text-amber-300">
          Preview — no score recorded
        </p>
      )}

      <p className="mt-3 text-sm leading-6 opacity-90">{explanation}</p>

      {!previewMode && breakdown && breakdown.length > 0 && (
        <ul className="mt-4 space-y-1 border-t border-white/10 pt-3 font-mono text-xs opacity-80">
          {breakdown.map((row) => (
            <li key={row.label} className="flex justify-between gap-4">
              <span>{row.label}</span>
              <span>{formatSignedPoints(row.value)}</span>
            </li>
          ))}
        </ul>
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
