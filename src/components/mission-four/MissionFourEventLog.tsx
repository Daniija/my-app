'use client';

export type MissionFourLogEntry = {
  id: string;
  at: string; // ISO timestamp
  message: string;
  tone?: 'default' | 'bad' | 'good';
};

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return '--:--:--';
  }
}

// Atmospheric terminal log, purely derived from real game events
// (timer penalties/bonuses, challenge outcomes, stage clears) passed
// in by the caller -- never a second source of truth, and capped at
// 50 entries so it stays cheap to render during a long session.
export default function MissionFourEventLog({ entries }: { entries: MissionFourLogEntry[] }) {
  const visible = entries.slice(-50);

  return (
    <div
      className="max-h-48 overflow-y-auto rounded-xl border border-slate-800 bg-[#05080b] p-3 font-mono text-xs"
      role="log"
      aria-label="Mission event log"
    >
      {visible.length === 0 && <p className="text-slate-600">No events yet.</p>}

      {visible.map((entry) => (
        <p
          key={entry.id}
          className={
            entry.tone === 'bad'
              ? 'text-red-400'
              : entry.tone === 'good'
                ? 'text-emerald-400'
                : 'text-slate-400'
          }
        >
          [{formatTime(entry.at)}] {entry.message}
        </p>
      ))}
    </div>
  );
}
