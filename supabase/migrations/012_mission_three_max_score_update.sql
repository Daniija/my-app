-- =========================================================
-- Data-only fix: missions.max_score for Mission 03 ("Trust No
-- One") was set to 2,700 by 010_mission_three_max_score.sql
-- (already applied). It has since dropped to 1,750 -- the CEO
-- and IT Manager rounds were removed from the Executive Voice
-- Verification section (leaving 3 rounds: HR, Food Safety,
-- Operations Director), and the "social" (Stage 4, The
-- Doppelgänger) and "forensics" (Stage 5, Synthetic Media
-- Forensics Lab) stages were removed from Mission 03 entirely.
-- The actual breakdown (src/lib/missions/mission-three-scoring.ts)
-- is now:
-- 800 (voice) + 250 (email) + 300 (verification) + 400 (final)
-- = 1,750.
--
-- This does not change any player's recorded score -- Mission
-- 03's scoring code clamps against its own TypeScript constant,
-- not this column. It only fixes the number shown on the admin
-- and player dashboards (src/app/dashboard/page.tsx,
-- src/app/admin/page.tsx), which both read missions.max_score
-- directly.
-- =========================================================

update public.missions
set max_score = 1750
where id = 3;
