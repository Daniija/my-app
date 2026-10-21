'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import { createClient } from '@/lib/supabase/browser';

type Row = {
  player_id: string;
  alias: string;
  mission_1_score: number;
  mission_2_score: number;
  mission_3_score: number;
  mission_4_score: number;
  total_score: number;
  completed_count: number;
  total_time_seconds?: number;
};

// Formats a total number of seconds into a compact clock-style duration.
// Returns an em dash when a player has not completed any mission yet.
function formatDuration(totalSeconds?: number) {
  if (!totalSeconds || totalSeconds <= 0) {
    return '—';
  }

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  if (minutes > 0) {
    return `${minutes}m ${String(seconds).padStart(2, '0')}s`;
  }

  return `${seconds}s`;
}

export default function LeaderboardLive({
  initial,
}: {
  initial: Row[];
}) {
  const [rows, setRows] =
    useState<Row[]>(initial);

  const [status, setStatus] =
    useState('LIVE');

  const refreshingRef =
    useRef(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentionally re-syncs state when the server-provided rows prop changes
    setRows(initial);
  }, [initial]);

  const refresh =
    useCallback(async () => {
      if (
        refreshingRef.current
      ) {
        return;
      }

      refreshingRef.current =
        true;

      try {
        const response =
          await fetch(
            '/api/leaderboard',
            {
              method: 'GET',
              cache: 'no-store',
            }
          );

        if (!response.ok) {
          throw new Error(
            `Leaderboard refresh failed (${response.status})`
          );
        }

        const payload =
          (await response.json()) as {
            rows?: Row[];
          };

        setRows(
          Array.isArray(
            payload.rows
          )
            ? payload.rows
            : []
        );

        setStatus('LIVE');
      } catch (error) {
        console.error(
          '[LEADERBOARD] Refresh failed:',
          error
        );

        setStatus(
          'RECONNECTING'
        );
      } finally {
        refreshingRef.current =
          false;
      }
    }, []);

  useEffect(() => {
    const supabase =
      createClient();

    const leaderboardChannel =
      supabase
        .channel(
          'leaderboard-live'
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema:
              'public',
            table:
              'leaderboard_entries',
          },
          () => {
            void refresh();
          }
        )
        .subscribe(
          (
            subscriptionStatus
          ) => {
            if (
              subscriptionStatus ===
              'SUBSCRIBED'
            ) {
              setStatus(
                'LIVE'
              );
            } else if (
              subscriptionStatus ===
                'CHANNEL_ERROR' ||
              subscriptionStatus ===
                'TIMED_OUT' ||
              subscriptionStatus ===
                'CLOSED'
            ) {
              setStatus(
                'RECONNECTING'
              );
            }
          }
        );

    // Even if Realtime is limited
    // by RLS, every player receives
    // the full board within 10 sec.
    const fallback =
      window.setInterval(
        () => {
          void refresh();
        },
        10000
      );

    return () => {
      window.clearInterval(
        fallback
      );

      void supabase.removeChannel(
        leaderboardChannel
      );
    };
  }, [refresh]);

  const activeAgents =
    rows.filter(
      (row) =>
        row.completed_count >
        0
    ).length;

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <p className="badge">
          {status === 'LIVE'
            ? '● LIVE'
            : '○ RECONNECTING'}
        </p>

        <p className="muted text-sm">
          {activeAgents}{' '}
          {activeAgents === 1
            ? 'agent'
            : 'agents'}{' '}
          on the board
        </p>
      </div>

      <div className="mt-5 space-y-2">
        {rows.length > 0 ? (
          rows.map(
            (
              row,
              index
            ) => (
              <div
                key={
                  row.player_id
                }
                className={`card grid grid-cols-[3rem_1fr_auto_auto] items-center gap-3 p-4 ${
                  index < 3
                    ? 'border-[var(--accent)]'
                    : ''
                }`}
              >
                <div className="text-2xl font-black">
                  {index === 0
                    ? '🥇'
                    : index ===
                        1
                      ? '🥈'
                      : index ===
                          2
                        ? '🥉'
                        : `#${index + 1}`}
                </div>

                <div>
                  <p className="text-lg font-black">
                    {row.alias}
                  </p>

                  <p className="muted text-xs">
                    W1{' '}
                    {row.mission_1_score ||
                      '—'}
                    {' · '}
                    W2{' '}
                    {row.mission_2_score ||
                      '—'}
                    {' · '}
                    W3{' '}
                    {row.mission_3_score ||
                      '—'}
                    {' · '}
                    Finale{' '}
                    {row.mission_4_score ||
                      '—'}
                  </p>
                </div>

                <div className="text-right">
                  <p className="muted text-[0.6rem] uppercase tracking-wide">
                    Time
                  </p>

                  <p className="tabular-nums text-sm font-bold">
                    {formatDuration(
                      row.total_time_seconds
                    )}
                  </p>
                </div>

                <p className="tabular-nums text-2xl font-black">
                  {
                    row.total_score
                  }
                </p>
              </div>
            )
          )
        ) : (
          <div className="card p-6 text-center">
            <p className="muted">
              No players are on
              the leaderboard yet.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}