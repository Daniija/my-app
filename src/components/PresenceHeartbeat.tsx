'use client';

import { useEffect } from 'react';

import { createClient } from '@/lib/supabase/browser';
import { PRESENCE_HEARTBEAT_INTERVAL_MS } from '@/lib/presence';

// Mounted once in the root layout so every page (player or admin)
// keeps profiles.last_seen_at fresh while the app is open. Silently
// does nothing when signed out -- the heartbeat endpoint itself
// requires auth, so a logged-out ping would just 401 harmlessly, but
// checking here avoids firing it at all on public pages like /login.
export default function PresenceHeartbeat() {
  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    let intervalId: number | undefined;

    async function sendHeartbeat() {
      try {
        await fetch('/api/profile/heartbeat', { method: 'POST' });
      } catch {
        // Best-effort -- a missed heartbeat just means this user
        // looks briefly offline until the next successful one.
      }
    }

    async function start() {
      const { data: { user } } = await supabase.auth.getUser();

      if (cancelled || !user) {
        return;
      }

      void sendHeartbeat();
      intervalId = window.setInterval(
        sendHeartbeat,
        PRESENCE_HEARTBEAT_INTERVAL_MS
      );
    }

    void start();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event) => {
        if (event === 'SIGNED_IN') {
          void sendHeartbeat();

          if (!intervalId) {
            intervalId = window.setInterval(
              sendHeartbeat,
              PRESENCE_HEARTBEAT_INTERVAL_MS
            );
          }
        }

        if (event === 'SIGNED_OUT' && intervalId) {
          window.clearInterval(intervalId);
          intervalId = undefined;
        }
      }
    );

    return () => {
      cancelled = true;

      if (intervalId) {
        window.clearInterval(intervalId);
      }

      authListener.subscription.unsubscribe();
    };
  }, []);

  return null;
}
