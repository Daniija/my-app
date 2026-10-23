-- =========================================================
-- Mission 03 ("Trust No One") stage machine + atomic
-- stage-advance RPC.
--
-- PART 1: extends the guard_mission_attempt_transition()
-- trigger (added in 008_guard_mission_attempts.sql) with the
-- Mission 03 chain. Without this, the trigger's catch-all
-- "any other mission_id" branch rejects every Mission 03
-- stage advance past the initial briefing insert.
--
-- PART 2: adds advance_mission_three_stage(), a narrow
-- security-definer RPC that atomically (a) row-locks the
-- attempt, (b) checks it is still at the expected stage,
-- (c) merges this stage's already-computed result into
-- mission_progress, and (d) advances current_stage/status.
-- If the attempt has already moved past the expected stage
-- (e.g. a duplicate request from a double-click), it returns
-- the existing progress instead of re-scoring — this is the
-- "do not award points twice" guarantee. All answer
-- validation and point computation stays in TypeScript
-- (src/lib/missions/mission-three-scoring.ts); this function
-- only does the mechanical, stage-agnostic bookkeeping.
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
  -- briefing -> transmission -> voice -> email -> social
  --          -> forensics -> verification -> final -> report
  --
  -- "transmission" is the unskippable hacker-interruption cinematic
  -- shown immediately after the briefing countdown. It awards no
  -- points; it only gates entry into the "voice" investigation stage
  -- until the player has genuinely watched it through
  -- (/api/missions/3/transmission/complete).
  --
  -- The original "video" investigation stage (Stage 1, "The
  -- Emergency Video") that used to sit between "transmission" and
  -- "voice" has been removed from Mission 03 entirely.
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
       and new.current_stage = 'social'
       and new.status = 'active' then
      return new;
    end if;

    if old.current_stage = 'social'
       and new.current_stage = 'forensics'
       and new.status = 'active' then
      return new;
    end if;

    if old.current_stage = 'forensics'
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

-- =========================================================
-- Atomic Mission 03 stage-advance RPC.
-- =========================================================

create or replace function public.advance_mission_three_stage(
  p_attempt_id uuid,
  p_from_stage text,
  p_to_stage text,
  p_to_status text,
  p_stage_key text,
  p_stage_result jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_attempt public.mission_attempts%rowtype;
  v_progress jsonb;
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select * into v_attempt
  from public.mission_attempts
  where id = p_attempt_id
  for update;

  if not found
     or v_attempt.player_id <> v_uid
     or v_attempt.mission_id <> 3 then
    raise exception 'INVALID_ATTEMPT';
  end if;

  -- Idempotency: if a duplicate/retried request arrives after
  -- the stage has already advanced, don't re-score. Return
  -- whatever progress already exists so the caller can render
  -- the same result instead of erroring.
  if v_attempt.status <> 'active'
     or v_attempt.current_stage is distinct from p_from_stage then
    select progress into v_progress
    from public.mission_progress
    where attempt_id = p_attempt_id;

    return coalesce(v_progress, '{}'::jsonb);
  end if;

  insert into public.mission_progress (attempt_id, player_id, mission_id, progress)
  values (
    p_attempt_id,
    v_uid,
    3,
    jsonb_build_object(p_stage_key, p_stage_result)
  )
  on conflict (attempt_id) do update
  set
    progress = mission_progress.progress || jsonb_build_object(p_stage_key, p_stage_result),
    updated_at = now()
  returning progress into v_progress;

  update public.mission_attempts
  set
    current_stage = p_to_stage,
    status = p_to_status
  where id = p_attempt_id;

  return v_progress;
end;
$$;

grant execute
on function public.advance_mission_three_stage(uuid, text, text, text, text, jsonb)
to authenticated;
