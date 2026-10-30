-- =========================================================
-- Mission testers.
--
-- Lets an admin flag an existing player account as a tester so it
-- can play any mission's real flow (real API routes, real DB
-- writes) before the mission's public unlock_at, without that
-- play ever appearing on the real leaderboard.
--
-- 1. profiles.is_tester -- the flag an admin toggles from
--    /admin/players (see src/app/api/admin/players/route.ts's
--    make_tester/remove_tester actions). Read by every mission's
--    start route (src/app/api/missions/{1,2,3,4}/start/route.ts)
--    and src/app/dashboard/page.tsx to bypass the unlock-date gate
--    (NOT the explicit admin closed/emergency_locked override --
--    those still block testers too). The unlock-gate bypass itself
--    lives entirely in TypeScript; this migration only adds the
--    column those routes already read.
--
-- 2. A single BEFORE INSERT OR UPDATE trigger on
--    leaderboard_entries that silently cancels (returns null) any
--    write for a tester's row. A generic table-level trigger is
--    used -- rather than teaching every mission's finalize path an
--    "is_test" branch -- because several missions (3, 4) write to
--    leaderboard_entries directly from application code in
--    addition to the existing DB trigger chain
--    (sync_profile_leaderboard/refresh_leaderboard_for_player), so
--    a trigger on the table itself is the only point that catches
--    every current and future writer uniformly.
-- =========================================================

alter table public.profiles
  add column if not exists is_tester boolean not null default false;

create or replace function public.block_tester_leaderboard_write()
returns trigger
language plpgsql
security definer
set search_path = public
as $block_tester_leaderboard_write$
begin
  if exists (
    select 1 from public.profiles
    where id = new.player_id and is_tester = true
  ) then
    return null;
  end if;

  return new;
end;
$block_tester_leaderboard_write$;

drop trigger if exists trg_block_tester_leaderboard on public.leaderboard_entries;

create trigger trg_block_tester_leaderboard
before insert or update on public.leaderboard_entries
for each row execute function public.block_tester_leaderboard_write();

-- Called from src/app/api/admin/players/route.ts's remove_tester
-- action (via supabase.rpc) to restore a former tester's real
-- leaderboard row once they're no longer excluded.
grant execute on function public.refresh_leaderboard_for_player(uuid) to service_role;
