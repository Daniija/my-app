-- Lets an admin manually set a player's completion time for a specific
-- week's mission, used only to break score ties on that week's Weekly
-- Winner leaderboard tab. Independent of total_time_override_seconds
-- (migration 014), which only affects the Individual leaderboard's
-- displayed total time. Null means fall back to the live computed time
-- from mission_attempts for that mission.
alter table public.leaderboard_entries
  add column if not exists mission_1_time_override_seconds integer null,
  add column if not exists mission_2_time_override_seconds integer null,
  add column if not exists mission_3_time_override_seconds integer null,
  add column if not exists mission_4_time_override_seconds integer null;

comment on column public.leaderboard_entries.mission_1_time_override_seconds is
  'Admin override (seconds) for Week 1''s tie-break time on the Weekly Winner leaderboard. Null means use the computed time from mission_attempts. Does not affect the Individual leaderboard.';
comment on column public.leaderboard_entries.mission_2_time_override_seconds is
  'Admin override (seconds) for Week 2''s tie-break time on the Weekly Winner leaderboard. Null means use the computed time from mission_attempts. Does not affect the Individual leaderboard.';
comment on column public.leaderboard_entries.mission_3_time_override_seconds is
  'Admin override (seconds) for Week 3''s tie-break time on the Weekly Winner leaderboard. Null means use the computed time from mission_attempts. Does not affect the Individual leaderboard.';
comment on column public.leaderboard_entries.mission_4_time_override_seconds is
  'Admin override (seconds) for Week 4''s tie-break time on the Weekly Winner leaderboard. Null means use the computed time from mission_attempts. Does not affect the Individual leaderboard.';
