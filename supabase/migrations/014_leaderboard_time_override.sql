-- Lets an admin manually set a player's displayed completion time on the
-- individual leaderboard, independent of the computed sum of
-- mission_attempts durations. When set, the individual leaderboard API
-- uses this value instead of the computed total. The weekly winner
-- leaderboard is untouched by this column -- it always reads live
-- per-mission times from mission_attempts for its tie-breaking.
alter table public.leaderboard_entries
  add column if not exists total_time_override_seconds integer null;

comment on column public.leaderboard_entries.total_time_override_seconds is
  'Admin override for the individual leaderboard completion time (seconds). Null means use the computed total from mission_attempts. Does not affect the weekly winner leaderboard.';
