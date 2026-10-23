// Reusable trust-status badge used across Mission 03.
//
// Deliberately NOT a confidence percentage ("98% fake") -- Mission 03's
// whole lesson is that appearance isn't evidence. A status here only
// ever changes in response to a verification step the player actually
// took (an independent channel check, a metadata review, etc.), never
// from "this looks unusual."

export type TrustStatusLevel =
  | 'unverified'
  | 'questionable'
  | 'suspicious'
  | 'verified';

const STYLES: Record<
  TrustStatusLevel,
  { label: string; className: string }
> = {
  unverified: {
    label: 'Unverified',
    className: 'border-slate-600 bg-slate-900/60 text-slate-300',
  },
  questionable: {
    label: 'Questionable',
    className: 'border-amber-700 bg-amber-950/40 text-amber-300',
  },
  suspicious: {
    label: 'Suspicious',
    className: 'border-red-700 bg-red-950/40 text-red-300',
  },
  verified: {
    label: 'Verified',
    className: 'border-emerald-700 bg-emerald-950/40 text-emerald-300',
  },
};

export default function TrustStatus({
  level,
  size = 'md',
}: {
  level: TrustStatusLevel;
  size?: 'sm' | 'md';
}) {
  const style = STYLES[level];

  const sizeClass =
    size === 'sm' ? 'px-2 py-1 text-[10px]' : 'px-3 py-1.5 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-lg border font-black uppercase tracking-[0.14em] ${sizeClass} ${style.className}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {style.label}
    </span>
  );
}
