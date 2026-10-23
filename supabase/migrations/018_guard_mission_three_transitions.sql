-- =========================================================
-- Extend guard_mission_attempt_transition() (migration 008) to
-- recognize Mission 03's player-driven stage transitions.
--
-- Migration 008 predates Mission 03's stage machine (migration 009)
-- and its own comment says so explicitly: "Any other mission_id
-- (missions 03/04 are not live yet): no player-driven transitions
-- are recognized". Nobody came back to extend it when Mission 03
-- was built, so every transition a real player makes in Mission 03
-- -- starting with the very first one, briefing -> transmission,
-- self-advanced by src/app/missions/3/play/transmission/page.tsx
-- using the player's own client -- has been unconditionally
-- rejected by this trigger (falling through to its final
-- `raise exception 'INVALID_STAGE_TRANSITION'`). The failure is
-- caught and only logged server-side (never shown to the player),
-- so current_stage silently never leaves 'briefing', and every
-- later Mission 03 stage gate/submit route then rejects the player
-- as being at the wrong stage -- this is the "stuck after the video
-- plays" bug.
--
-- This adds the exact sequence Mission 03's application code
-- already performs (verified against src/app/api/missions/3/*):
--   briefing/null -> transmission (active)   [self-advance, player client]
--   transmission  -> voice        (active)   [advance_mission_three_stage]
--   voice         -> email        (active)   [advance_mission_three_stage]
--   email         -> verification (active)   [advance_mission_three_stage]
--   verification  -> final        (active)   [advance_mission_three_stage]
--   final         -> report       (submitted)[advance_mission_three_stage]
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
  -- -> final -> report
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

  -- Any other mission_id (mission 04 is not live yet): no
  -- player-driven transitions are recognized until a future
  -- migration extends this function alongside its gameplay routes.
  raise exception 'INVALID_STAGE_TRANSITION';
end;
$$;
