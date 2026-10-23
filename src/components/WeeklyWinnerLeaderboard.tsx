'use client';

import { useEffect, useState } from 'react';

type WeekRow = {
  player_id: string;
  alias: string;
  score: number;
  time_seconds: number | null;
};

const WEEKS = [1, 2, 3, 4] as const;

const WEEK_LABEL: Record<(typeof WEEKS)[number], string> = {
  1: 'Week 1',
  2: 'Week 2',
  3: 'Week 3',
  4: 'Week 4 (Finale)',
};

export default function WeeklyWinnerLeaderboard() {
  const [week, setWeek] = useState<(typeof WEEKS)[number]>(1);
  const [rows, setRows] = useState<WeekRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch(
          `/api/leaderboard/weekly?week=${week}`,
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
  }, [week]);

  return (
    <div>
      <div className="flex flex-wrap justify-center gap-2">
        {WEEKS.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setWeek(item)}
            className={week === item ? 'btn btn-primary' : 'btn btn-secondary'}
          >
            {WEEK_LABEL[item]}
          </button>
        ))}
      </div>

      <p className="muted mt-4 text-center text-sm">
        Ranked by that week&apos;s mission score. Tied scores are ranked by
        who completed the mission faster.
      </p>

      <div className="mt-5 space-y-2">
        {loading && (
          <div className="card p-6 text-center">
            <p className="muted">Loading leaderboard…</p>
          </div>
        )}

        {!loading && error && (
          <div className="card p-6 text-center">
            <p className="text-[#ffd2d2]">{error}</p>
          </div>
        )}

        {!loading && !error && rows.length === 0 && (
          <div className="card p-6 text-center">
            <p className="muted">
              No one has completed {WEEK_LABEL[week]} yet.
            </p>
          </div>
        )}

        {!loading &&
          !error &&
          rows.map((row, index) => (
            <div
              key={row.player_id}
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

              <p className="text-lg font-black">{row.alias}</p>

              <p className="tabular-nums text-2xl font-black">{row.score}</p>
            </div>
          ))}
      </div>
    </div>
  );
}
