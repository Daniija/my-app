-- =========================================================
-- Close anti-cheat hole in public.mission_attempts.
--
-- The existing RLS policies only check row ownership
-- (player_id = auth.uid()) and explicit grants give
-- `authenticated` insert/update on this table. Neither
-- restricts WHICH values a player may write to
-- `current_stage` / `status`.
--
-- Mission progression (Mission 01's briefing/incident/
-- evidence/theory/containment/report flow and Mission 02's
-- briefing/incident/map/room-1..room-10/report flow) is
-- gated entirely by this column in application code. Because
-- the column is directly writable by the same player it's
-- supposed to gate, a signed-in player could call the
-- Supabase REST API directly (bypassing the Next.js app
-- entirely) and PATCH their own mission_attempts row to e.g.
-- current_stage = 'room-10', then submit that room's answer
-- (every room's correct answer is a fixed, global constant,
-- not derived per-player) to collect full mission credit
-- without solving the earlier rooms. This directly undermines
-- leaderboard integrity in a live scored contest.
--
-- Fix: a BEFORE INSERT/UPDATE trigger that allows only the
-- exact set of transitions the application already performs,
-- enumerated below (verified against the current application
-- code), for the `authenticated` role only. Writes made
-- through the service-role admin client (used by
-- /api/missions/1/progress, /complete, and admin tooling) set
-- `auth.role() = 'service_role'` and are already validated
-- server-side, so they bypass this check entirely.
--
-- This migration changes no application code and does not
-- alter any existing row. It only rejects writes that no
-- legitimate app code path ever attempts.
-- =========================================================

create or replace function public.guard_mission_attempt_transition()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Only constrain writes made as a logged-in player. Writes
  -- from the service-role admin client, or run directly in
  -- the SQL editor / migrations, are left untouched.
  if auth.role() is distinct from 'authenticated' then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.status <> 'active'
       or new.current_stage is distinct from 'briefing' then
      raise exception 'INVALID_ATTEMPT_INIT';
    end if;

    return new;
  end if;

  -- tg_op = 'UPDATE'

  if new.player_id is distinct from old.player_id
     or new.mission_id is distinct from old.mission_id then
    raise exception 'INVALID_ATTEMPT_MUTATION';
  end if;

  if old.status <> 'active' then
    raise exception 'ATTEMPT_NOT_ACTIVE';
  end if;

  -- ----------------------------------
  -- MISSION 01 TRANSITIONS
  -- briefing -> incident -> theory -> containment -> report
  -- ----------------------------------
  if old.mission_id = 1 then
    if (old.current_stage is null or old.current_stage = 'briefing')
       and new.current_stage = 'incident'
       and new.status = 'active' then
      return new;
    end if;

    if old.current_stage = 'incident'
       and new.current_stage = 'theory'
       and new.status = 'active' then
      return new;
    end if;

    if old.current_stage = 'theory'
       and new.current_stage = 'containment'
       and new.status = 'active' then
      return new;
    end if;

    if old.current_stage = 'containment'
       and new.current_stage = 'report'
       and new.status = 'active' then
      return new;
    end if;

    raise exception 'INVALID_STAGE_TRANSITION';
  end if;

  -- ----------------------------------
  -- MISSION 02 TRANSITIONS
  -- briefing -> incident -> map -> room-1 .. room-10 -> report
  -- ----------------------------------
  if old.mission_id = 2 then
    if (old.current_stage is null or old.current_stage = 'briefing')
       and new.current_stage = 'incident'
       and new.status = 'active' then
      return new;
    end if;

    if (old.current_stage is null
        or old.current_stage in ('briefing', 'incident'))
       and new.current_stage = 'map'
       and new.status = 'active' then
      return new;
    end if;

    if old.current_stage in ('map', 'room-1')
       and new.current_stage = 'room-2'
       and new.status = 'active' then
      return new;
    end if;

    if old.current_stage ~ '^room-[2-9]$'
       and new.current_stage =
         'room-' || (substring(old.current_stage from 6)::int + 1)
       and new.status = 'active' then
      return new;
    end if;

    if old.current_stage = 'room-10'
       and new.current_stage = 'report'
       and new.status = 'submitted' then
      return new;
    end if;

    raise exception 'INVALID_STAGE_TRANSITION';
  end if;

  -- Any other mission_id (missions 03/04 are not live yet):
  -- no player-driven transitions are recognized until a
  -- future migration extends this function alongside their
  -- gameplay routes.
  raise exception 'INVALID_STAGE_TRANSITION';
end;
$$;


drop trigger if exists guard_mission_attempt_transition on public.mission_attempts;

create trigger guard_mission_attempt_transition
before insert or update on public.mission_attempts
for each row
execute function public.guard_mission_attempt_transition();
