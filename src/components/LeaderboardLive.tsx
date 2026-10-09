'use client';

import {
  useEffect,
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
};

export default function LeaderboardLive({
  initial,
}: {
  initial: Row[];
}) {
  const [rows, setRows] =
    useState<Row[]>(initial);

  const [status, setStatus] =
    useState('LIVE');

  async function refresh() {
    const supabase =
      createClient();

    // -----------------------------------------
    // GET ONLY REAL PLAYER ACCOUNTS
    // -----------------------------------------

    const {
      data: playerProfiles,
      error: profileError,
    } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'player')
      .eq('is_active', true);

    if (profileError) {
      console.error(
        '[LEADERBOARD] Unable to load player profiles:',
        profileError
      );

      return;
    }

    const playerIds =
      (playerProfiles ?? []).map(
        (profile) =>
          profile.id
      );

    // No players = empty board
    if (
      playerIds.length === 0
    ) {
      setRows([]);
      return;
    }

    // -----------------------------------------
    // LOAD LEADERBOARD FOR PLAYERS ONLY
    // -----------------------------------------

    const {
      data,
      error,
    } = await supabase
      .from(
        'leaderboard_entries'
      )
      .select('*')
      .in(
        'player_id',
        playerIds
      )
      .order(
        'total_score',
        {
          ascending: false,
        }
      )
      .order(
        'mission_4_score',
        {
          ascending: false,
        }
      )
      .order(
        'alias',
        {
          ascending: true,
        }
      );

    if (error) {
      console.error(
        '[LEADERBOARD] Unable to refresh leaderboard:',
        error
      );

      return;
    }

    setRows(
      (data ?? []) as Row[]
    );
  }

  useEffect(() => {
    const supabase =
      createClient();

    // -----------------------------------------
    // WATCH SCORE CHANGES
    // -----------------------------------------

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
          (subscriptionStatus) => {
            setStatus(
              subscriptionStatus ===
                'SUBSCRIBED'
                ? 'LIVE'
                : 'RECONNECTING'
            );
          }
        );

    // -----------------------------------------
    // WATCH PROFILE ROLE CHANGES
    // -----------------------------------------
    // This is important when a player is
    // promoted to admin or changed back
    // to player.
    // -----------------------------------------

    const profileChannel =
      supabase
        .channel(
          'leaderboard-profiles'
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema:
              'public',
            table:
              'profiles',
          },
          () => {
            void refresh();
          }
        )
        .subscribe();

    // -----------------------------------------
    // FALLBACK REFRESH
    // -----------------------------------------

    const fallback =
      window.setInterval(
        () => {
          void refresh();
        },
        30000
      );

    return () => {
      window.clearInterval(
        fallback
      );

      void supabase.removeChannel(
        leaderboardChannel
      );

      void supabase.removeChannel(
        profileChannel
      );
    };
  }, []);

  const activeAgents =
    rows.filter(
      (row) =>
        row.completed_count > 0
    ).length;

  return (
    <div>
      {/* LIVE STATUS */}
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

      {/* LEADERBOARD */}
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
                className={`card grid grid-cols-[3rem_1fr_auto] items-center gap-3 p-4 ${
                  index < 3
                    ? 'border-[var(--accent)]'
                    : ''
                }`}
              >
                {/* RANK */}
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

                {/* PLAYER */}
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

                {/* TOTAL */}
                <p className="tabular-nums text-2xl font-black">
                  {row.total_score}
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