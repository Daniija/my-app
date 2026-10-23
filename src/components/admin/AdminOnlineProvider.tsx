'use client';

import { createContext, useContext, useEffect, useState } from 'react';

const POLL_INTERVAL_MS = 15_000;

const OnlineContext = createContext<Set<string>>(new Set());

// Wraps the /admin/players table. Polls who's online every 15s so the
// green dots stay current without the admin needing to refresh the
// page -- mirrors the polling pattern LeaderboardLive already uses for
// the public leaderboard.
export function AdminOnlineProvider({
  initialOnlineIds,
  children,
}: {
  initialOnlineIds: string[];
  children: React.ReactNode;
}) {
  const [onlineIds, setOnlineIds] = useState(new Set(initialOnlineIds));

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const response = await fetch('/api/admin/players/online', {
          cache: 'no-store',
        });

        if (!response.ok) {
          return;
        }

        const data = await response.json().catch(() => ({}));

        if (!cancelled && Array.isArray(data.onlineIds)) {
          setOnlineIds(new Set(data.onlineIds));
        }
      } catch {
        // Best-effort -- dots just keep their last known state.
      }
    }

    const interval = window.setInterval(poll, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  return (
    <OnlineContext.Provider value={onlineIds}>
      {children}
    </OnlineContext.Provider>
  );
}

export function OnlineDot({ playerId }: { playerId: string }) {
  const onlineIds = useContext(OnlineContext);
  const online = onlineIds.has(playerId);

  return (
    <span
      className={`inline-block h-2.5 w-2.5 rounded-full ${
        online ? 'bg-emerald-400' : 'bg-slate-600'
      }`}
      title={online ? 'Online now' : 'Offline'}
      aria-label={online ? 'Online now' : 'Offline'}
    />
  );
}
