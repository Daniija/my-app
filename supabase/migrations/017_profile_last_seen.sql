-- Backs the admin "online now" indicator on /admin/players. A client-side
-- heartbeat (see src/components/PresenceHeartbeat.tsx) pings
-- /api/profile/heartbeat every 30s while a signed-in user has the app
-- open, which stamps this column via the service-role client (same
-- pattern as /api/profile's own writes) -- no RLS/column-grant changes
-- needed since the write never goes through the user's own grants.
alter table public.profiles
  add column if not exists last_seen_at timestamptz null;

comment on column public.profiles.last_seen_at is
  'Last heartbeat timestamp from this user''s client (see /api/profile/heartbeat). Null means they have never sent one. Used only to derive an "online now" indicator -- not a precise presence system.';
