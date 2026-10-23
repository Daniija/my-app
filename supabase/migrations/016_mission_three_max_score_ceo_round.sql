-- =========================================================
-- Data-only fix: missions.max_score for Mission 03 ("Trust No
-- One") was set to 1,750 by 012_mission_three_max_score_update.sql
-- (already applied). It has now risen to 1,950 -- a 4th
-- Executive Voice Verification round (CEO) was added, raising
-- the "voice" stage from 800 to 1,000 points.
-- The actual breakdown (src/lib/missions/mission-three-scoring.ts)
-- is now:
-- 1,000 (voice) + 250 (email) + 300 (verification) + 400 (final)
-- = 1,950.
--
-- This does not change any player's recorded score -- Mission
-- 03's scoring code clamps against its own TypeScript constant,
-- not this column. It only fixes the number shown on the admin
-- and player dashboards (src/app/dashboard/page.tsx,
-- src/app/admin/page.tsx), which both read missions.max_score
-- directly.
-- =========================================================

update public.missions
set max_score = 1950
where id = 3;
