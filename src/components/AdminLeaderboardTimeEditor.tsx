'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type WeekData = {
  score: number;
  computed_seconds: number;
  override_seconds: number | null;
};

type Row = {
  player_id: string;
  alias: string;
  total: WeekData;
  weeks: Record<1 | 2 | 3 | 4, WeekData>;
};

type Scope = 'total' | 1 | 2 | 3 | 4;

const WEEK_TABS: { scope: Scope; label: string }[] = [
  { scope: 'total', label: 'Individual Total' },
  { scope: 1, label: 'Week 1' },
  { scope: 2, label: 'Week 2' },
  { scope: 3, label: 'Week 3' },
  { scope: 4, label: 'Week 4 (Finale)' },
];

function toParts(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return { hours, minutes, seconds };
}

function toSeconds(hours: number, minutes: number, seconds: number) {
  return (
    Math.max(0, hours | 0) * 3600 +
    Math.max(0, minutes | 0) * 60 +
    Math.max(0, seconds | 0)
  );
}

function formatDuration(totalSeconds: number) {
  if (!totalSeconds || totalSeconds <= 0) return '—';
  const { hours, minutes, seconds } = toParts(totalSeconds);
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${String(seconds).padStart(2, '0')}s`;
  return `${seconds}s`;
}

function EditableRow({
  playerId,
  alias,
  data,
  scope,
}: {
  playerId: string;
  alias: string;
  data: WeekData;
  scope: Scope;
}) {
  const active = data.override_seconds ?? data.computed_seconds;
  const initial = toParts(active);

  const [hours, setHours] = useState(initial.hours);
  const [minutes, setMinutes] = useState(initial.minutes);
  const [seconds, setSeconds] = useState(initial.seconds);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();

  const hasOverride = data.override_seconds !== null;

  async function submit(nextSeconds: number | null) {
    setSaving(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/leaderboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId,
          seconds: nextSeconds,
          ...(scope === 'total' ? {} : { week: scope }),
        }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload.error || `Request failed (${response.status}).`);
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save.');
    } finally {
      setSaving(false);
    }
  }

  async function save() {
    await submit(toSeconds(hours, minutes, seconds));
  }

  async function clearOverride() {
    await submit(null);

    const reset = toParts(data.computed_seconds);
    setHours(reset.hours);
    setMinutes(reset.minutes);
    setSeconds(reset.seconds);
  }

  return (
    <tr className="border-t border-[var(--line)] align-top">
      <td className="p-3 font-bold">{alias}</td>

      <td className="p-3 tabular-nums">{data.score}</td>

      <td className="p-3 tabular-nums">{formatDuration(data.computed_seconds)}</td>

      <td className="p-3">
        <div className="flex items-center gap-1">
          <input
            type="number"
            min={0}
            value={hours}
            disabled={saving}
            onChange={(e) => setHours(Number(e.target.value) || 0)}
            className="w-14 rounded-lg border border-[var(--line)] bg-[#07141d] p-1 text-center"
            aria-label={`${alias} hours`}
          />
          <span className="muted text-xs">h</span>

          <input
            type="number"
            min={0}
            max={59}
            value={minutes}
            disabled={saving}
            onChange={(e) => setMinutes(Number(e.target.value) || 0)}
            className="w-14 rounded-lg border border-[var(--line)] bg-[#07141d] p-1 text-center"
            aria-label={`${alias} minutes`}
          />
          <span className="muted text-xs">m</span>

          <input
            type="number"
            min={0}
            max={59}
            value={seconds}
            disabled={saving}
            onChange={(e) => setSeconds(Number(e.target.value) || 0)}
            className="w-14 rounded-lg border border-[var(--line)] bg-[#07141d] p-1 text-center"
            aria-label={`${alias} seconds`}
          />
          <span className="muted text-xs">s</span>
        </div>

        {error && <p className="mt-1 text-xs text-[#ffd2d2]">{error}</p>}
      </td>

      <td className="p-3">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-secondary"
            disabled={saving}
            onClick={save}
          >
            {saving ? 'Saving...' : 'Save'}
          </button>

          {hasOverride && (
            <button
              type="button"
              className="btn btn-secondary"
              disabled={saving}
              onClick={clearOverride}
            >
              Clear
            </button>
          )}
        </div>

        {hasOverride && <p className="muted mt-1 text-xs">Override active</p>}
      </td>
    </tr>
  );
}

export default function AdminLeaderboardTimeEditor({ rows }: { rows: Row[] }) {
  const [scope, setScope] = useState<Scope>('total');

  if (rows.length === 0) {
    return (
      <div className="card p-6 text-center">
        <p className="muted">No leaderboard entries yet.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {WEEK_TABS.map((tab) => (
          <button
            key={tab.scope}
            type="button"
            onClick={() => setScope(tab.scope)}
            className={
              scope === tab.scope ? 'btn btn-primary' : 'btn btn-secondary'
            }
          >
            {tab.label}
          </button>
        ))}
      </div>

      <p className="muted mt-3 text-sm">
        {scope === 'total'
          ? 'Changes here only affect the time shown on the Individual leaderboard.'
          : `Changes here only affect Week ${scope}'s tie-break time on the Weekly Winner leaderboard.`}
      </p>

      <div className="mt-4 overflow-x-auto rounded-2xl border border-[var(--line)]">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-[#07141d] text-[var(--muted)]">
            <tr>
              <th className="p-3">Player</th>
              <th className="p-3">Score</th>
              <th className="p-3">Computed time</th>
              <th className="p-3">Override time</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((row) => (
              <EditableRow
                // Remount on scope change so each tab's input state
                // initializes from that scope's own data, not a stale
                // value carried over from a previously selected tab.
                key={`${row.player_id}-${scope}`}
                playerId={row.player_id}
                alias={row.alias}
                scope={scope}
                data={scope === 'total' ? row.total : row.weeks[scope]}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
