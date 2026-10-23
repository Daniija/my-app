// Shared constants between the client heartbeat (PresenceHeartbeat.tsx,
// /api/profile/heartbeat) and anything deriving an "online now" status
// from profiles.last_seen_at (the admin players dashboard). The online
// threshold is kept wider than the heartbeat interval so one missed
// beat (a backgrounded tab, a slow network blip) doesn't flicker a
// player to "offline" between beats.

export const PRESENCE_HEARTBEAT_INTERVAL_MS = 30_000;
export const PRESENCE_ONLINE_THRESHOLD_SECONDS = 90;

export function isOnline(lastSeenAt: string | null | undefined): boolean {
  if (!lastSeenAt) {
    return false;
  }

  const lastSeenMs = new Date(lastSeenAt).getTime();

  if (Number.isNaN(lastSeenMs)) {
    return false;
  }

  return Date.now() - lastSeenMs <= PRESENCE_ONLINE_THRESHOLD_SECONDS * 1000;
}
