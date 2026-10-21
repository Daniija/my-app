'use client';

import { useEffect, useState } from 'react';

type GroupRow = {
  name: string;
  participantCount: number;
  averageScore: number;
};

export default function GroupLeaderboard({
  type,
}: {
  type: 'department' | 'branch';
}) {
  const [rows, setRows] = useState<GroupRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch(
          `/api/leaderboard/groups?type=${type}`,
          { cache: 'no-store' }
        );

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(data.error || 'Unable to load leaderboard.');
        }

        if (!cancelled) {
          setRows(Array.isArray(data.rows) ? data.rows : []);
          setError('');
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'Unable to load leaderboard.'
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();

    const interval = window.setInterval(() => void load(), 10000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [type]);

  if (loading) {
    return (
      <div className="card p-6 text-center">
        <p className="muted">Loading leaderboard…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card p-6 text-center">
        <p className="text-[#ffd2d2]">{error}</p>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="card p-6 text-center">
        <p className="muted">
          No {type === 'department' ? 'departments' : 'branches'} have scores
          on the board yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {rows.map((row, index) => (
        <div
          key={row.name}
          className={`card grid grid-cols-[3rem_1fr_auto] items-center gap-3 p-4 ${
            index < 3 ? 'border-[var(--accent)]' : ''
          }`}
        >
          <div className="text-2xl font-black">
            {index === 0
              ? '🥇'
              : index === 1
                ? '🥈'
                : index === 2
                  ? '🥉'
                  : `#${index + 1}`}
          </div>

          <div>
            <p className="text-lg font-black">{row.name}</p>

            <p className="muted text-xs">
              {row.participantCount}{' '}
              {row.participantCount === 1 ? 'player' : 'players'}
            </p>
          </div>

          <div className="text-right">
            <p className="muted text-[0.6rem] uppercase tracking-wide">
              Avg score
            </p>

            <p className="tabular-nums text-2xl font-black">
              {row.averageScore}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
