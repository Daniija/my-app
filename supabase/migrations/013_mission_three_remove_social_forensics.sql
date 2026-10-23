-- =========================================================
-- Removes the "social" (Stage 4, The Doppelgänger) and
-- "forensics" (Stage 5, Synthetic Media Forensics Lab) stages
-- from Mission 03 entirely. The chain becomes:
--   briefing -> transmission -> voice -> email -> verification
--            -> final -> report
--
-- 009_mission_three_stage_machine.sql (already applied) cannot be
-- edited retroactively, so this migration re-replaces
-- guard_mission_attempt_transition() wholesale (functions are
-- replaced in full, not patched) with only the Mission 03 branch
-- changed: "email" now transitions directly to "verification".
-- Mission 01/02 branches and advance_mission_three_stage() are
-- reproduced unchanged.
-- =========================================================

create or replace function public.guard_mission_attempt_transition()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
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

  -- ----------------------------------
  -- MISSION 03 TRANSITIONS
  -- briefing -> transmission -> voice -> email -> verification
  --          -> final -> report
  --
  -- "transmission" is the unskippable hacker-interruption cinematic
  -- shown immediately after the briefing countdown. It awards no
  -- points; it only gates entry into the "voice" investigation stage
  -- until the player has genuinely watched it through
  -- (/api/missions/3/transmission/complete).
  --
  -- "video" (Stage 1), "social" (Stage 4) and "forensics" (Stage 5)
  -- have all been removed from Mission 03 entirely.
  -- ----------------------------------
  if old.mission_id = 3 then
    if (old.current_stage is null or old.current_stage = 'briefing')
       and new.current_stage = 'transmission'
       and new.status = 'active' then
      return new;
    end if;

    if old.current_stage = 'transmission'
       and new.current_stage = 'voice'
       and new.status = 'active' then
      return new;
    end if;

    if old.current_stage = 'voice'
       and new.current_stage = 'email'
       and new.status = 'active' then
      return new;
    end if;

    if old.current_stage = 'email'
       and new.current_stage = 'verification'
       and new.status = 'active' then
      return new;
    end if;

    if old.current_stage = 'verification'
       and new.current_stage = 'final'
       and new.status = 'active' then
      return new;
    end if;

    if old.current_stage = 'final'
       and new.current_stage = 'report'
       and new.status = 'submitted' then
      return new;
    end if;

    raise exception 'INVALID_STAGE_TRANSITION';
  end if;

  -- Mission 04 is not live yet.
  raise exception 'INVALID_STAGE_TRANSITION';
end;
$$;

drop trigger if exists guard_mission_attempt_transition on public.mission_attempts;

create trigger guard_mission_attempt_transition
before insert or update on public.mission_attempts
for each row
execute function public.guard_mission_attempt_transition();
