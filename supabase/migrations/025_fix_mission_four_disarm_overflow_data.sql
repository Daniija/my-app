-- =========================================================
-- One-off DATA repair for Mission 04's DISARM stage overflow bug.
--
-- Before this session's application-code fix (disarm/finalize/
-- route.ts), a player who finished DISARM with time left on the
-- clock had the mission-wide "finished with time to spare" bonus
-- (remainingSeconds * MISSION_COMPLETION_TIME_BONUS_PER_SECOND)
-- folded directly into progress.disarm.points -- a field that's
-- supposed to be capped at DISARM's own 800-point budget. That's why
-- the report's Stage Breakdown showed e.g. "886 / 800" instead of
-- "800 / 800" for anyone who completed DISARM early.
--
-- The fix only corrects the computation for FUTURE completions --
-- every player who already finished Mission 04 before this migration
-- still has that inflated number sitting in mission_progress.progress.
-- This migration rewrites those existing rows to match what the
-- corrected code would have written: progress.disarm.points clamped
-- to 800, and the overflow moved into a new
-- progress.disarm.missionCompletionBonus field (so the report page's
-- separate "Time Bonus" line picks it up automatically).
--
-- Deliberately NOT touched: mission_scores.total_score and
-- leaderboard_entries.mission_4_score. Both already summed the FULL
-- (inflated) disarm.points into the player's grand total, which was
-- then clamped to MISSION_FOUR_MAX_SCORE (3000) -- the same number
-- this migration's split produces (800 + bonus, just moved to a
-- different field), so the player's overall score is unaffected
-- either way. This migration only corrects the per-stage breakdown
-- display, which is the actual complaint.
--
-- Uses a "||" merge on the existing disarm object rather than
-- jsonb_set on a multi-segment path -- the "disarm" key is guaranteed
-- to exist on every row this WHERE clause matches (we're reading
-- disarm.points out of it to filter), but "||" is this project's
-- settled-on safe pattern for nested JSON writes regardless (see
-- migration 019's writeup), so it's used here too for consistency.
-- Safe to re-run: once a row's disarm.points is clamped to 800, the
-- WHERE clause's "> 800" check no longer matches it.
-- =========================================================

update public.mission_progress
set
  progress = progress || jsonb_build_object(
    'disarm',
    (progress -> 'disarm') || jsonb_build_object(
      'points', 800,
      'missionCompletionBonus', (progress -> 'disarm' ->> 'points')::numeric - 800
    )
  ),
  updated_at = now()
where mission_id = 4
  and progress -> 'disarm' ->> 'points' ~ '^[0-9]+(\.[0-9]+)?$'
  and (progress -> 'disarm' ->> 'points')::numeric > 800;
