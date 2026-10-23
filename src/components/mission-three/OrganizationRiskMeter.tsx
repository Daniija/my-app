// Visible risk meter: starts at the baseline and moves only in
// response to the player's own verified-process decisions so far
// (see computeOrganizationRisk in mission-three-scoring.ts) --
// never from "this looked suspicious."

export default function OrganizationRiskMeter({
  riskPercent,
}: {
  riskPercent: number;
}) {
  const level =
    riskPercent >= 70
      ? 'critical'
      : riskPercent >= 45
        ? 'elevated'
        : 'contained';

  const barColor =
    level === 'critical'
      ? 'bg-red-500'
      : level === 'elevated'
        ? 'bg-amber-500'
        : 'bg-emerald-500';

  const labelColor =
    level === 'critical'
      ? 'text-red-300'
      : level === 'elevated'
        ? 'text-amber-300'
        : 'text-emerald-300';

  return (
    <div className="rounded-xl border border-red-950 bg-[#0b0407] px-5 py-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
          Organization Risk
        </p>

        <p className={`font-mono text-lg font-black ${labelColor}`}>
          {riskPercent}%
        </p>
      </div>

      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-900">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${riskPercent}%` }}
        />
      </div>
    </div>
  );
}
