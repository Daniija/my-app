'use client';

import { useEffect, useRef, useState } from 'react';

import {
  computeIntensity,
  computeRemainingSeconds,
  isExpired,
  MISSION_FOUR_DURATION_SECONDS,
  type MissionFourIntensity,
} from './mission-four-scoring';

export type MissionFourTimerState = {
  remainingSeconds: number;
  intensity: MissionFourIntensity;
  expired: boolean;
  formatted: string; // MM:SS
};

// Drift-resistant countdown: every tick recomputes remaining time
// from Date.now() minus the server-stamped startedAt timestamp, it
// never decrements a local counter (the exact drift bug already
// present -- and deliberately not reused -- in Mission 1/2's
// briefing-screen countdowns). Refresh survival is automatic:
// startedAt/netAdjustmentSeconds are loaded fresh from the server on
// every page mount, so the first tick after a refresh is already
// correct.
//
// `paused` must only ever be driven by admin-preview dev controls --
// the real player route tree never passes true. Pausing freezes the
// displayed value by accumulating a "paused offset" that's
// subtracted from elapsed time, so resuming doesn't fast-forward.
export function useMissionFourTimer({
  startedAt,
  netAdjustmentSeconds,
  durationSeconds = MISSION_FOUR_DURATION_SECONDS,
  paused = false,
  onExpire,
}: {
  startedAt: string | null;
  netAdjustmentSeconds: number;
  durationSeconds?: number;
  paused?: boolean;
  onExpire?: () => void;
}): MissionFourTimerState {
  const startedAtMs = startedAt ? new Date(startedAt).getTime() : null;

  const pausedAtRef = useRef<number | null>(null);
  const pausedOffsetRef = useRef(0);
  const hasFiredExpireRef = useRef(false);
  const onExpireRef = useRef(onExpire);

  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  const [remainingSeconds, setRemainingSeconds] = useState(() => {
    if (startedAtMs === null) return durationSeconds;

    return computeRemainingSeconds({
      startedAtMs,
      netAdjustmentSeconds,
      nowMs: Date.now(),
      durationSeconds,
    });
  });

  useEffect(() => {
    // startedAtMs === null means the countdown hasn't begun -- the
    // useState initializer above already set remainingSeconds to
    // durationSeconds for this case, so there's nothing to do here.
    if (startedAtMs === null) {
      return;
    }

    function tick() {
      if (paused) {
        if (pausedAtRef.current === null) {
          pausedAtRef.current = Date.now();
        }
        return;
      }

      if (pausedAtRef.current !== null) {
        pausedOffsetRef.current += Date.now() - pausedAtRef.current;
        pausedAtRef.current = null;
      }

      const effectiveNow = Date.now() - pausedOffsetRef.current;

      const next = computeRemainingSeconds({
        startedAtMs: startedAtMs as number,
        netAdjustmentSeconds,
        nowMs: effectiveNow,
        durationSeconds,
      });

      setRemainingSeconds(next);

      if (isExpired(next) && !hasFiredExpireRef.current) {
        hasFiredExpireRef.current = true;
        onExpireRef.current?.();
      }
    }

    tick();
    const interval = window.setInterval(tick, 250);

    return () => window.clearInterval(interval);
  }, [startedAtMs, netAdjustmentSeconds, durationSeconds, paused]);

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const formatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return {
    remainingSeconds,
    intensity: computeIntensity(remainingSeconds),
    expired: isExpired(remainingSeconds),
    formatted,
  };
}
