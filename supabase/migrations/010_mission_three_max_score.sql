-- =========================================================
-- Data-only fix: missions.max_score for Mission 03 ("Trust No
-- One") was still the original placeholder value (1,500) from
-- 001_initial.sql. The actual Mission 03 scoring breakdown
-- (src/lib/missions/mission-three-scoring.ts) totals 2,700 --
-- 1,500 across email/social/forensics/verification/final, plus
-- 1,200 for the Executive Voice Verification section. (The
-- original "video" investigation stage, Stage 1 "The Emergency
-- Video", was removed from Mission 03 entirely.)
--
-- This does not change any player's recorded score -- Mission
-- 03's scoring code clamps against its own TypeScript constant,
-- not this column. It only fixes the number shown on the admin
-- and player dashboards (src/app/dashboard/page.tsx,
-- src/app/admin/page.tsx), which both read missions.max_score
-- directly.
-- =========================================================

update public.missions
set max_score = 2700
where id = 3;
