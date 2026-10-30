-- =========================================================
-- Mission 04 ("Zero Hour") stage machine.
--
-- guard_mission_attempt_transition() (migration 008) only ever had
-- branches for mission_id 1 and 2, and its own comment said "mission
-- 04 is not live yet" -- meaning every player-driven write to a
-- Mission 04 attempt would be unconditionally rejected, exactly the
-- mechanism that caused the "stuck at briefing forever" bug this
-- session found and fixed for Mission 03 (migration 018). This
-- migration adds the missing mission_id = 4 branch, plus two new,
-- purely additive functions mirroring Mission 03's
-- advance_mission_three_stage / save_mission_three_voice_round.
-- Nothing here touches Mission 01, 02, or 03's existing functions,
-- trigger branches, or call sites.
--
-- Deliberately NOT generalizing the Mission 03 RPCs to take a
-- mission_id parameter: that would require touching 3 live Mission
-- 03 routes in lockstep with this migration during a live contest.
-- A parallel, additive function touches zero existing call sites --
-- the same reason Missions 01/02/03 already each hardcode their own
-- mission_id check rather than sharing one function.
--
-- Mission 04 stage order: briefing -> triage -> trace -> contain ->
-- disarm -> report. Unlike earlier missions, the countdown timer can
-- fail the mission from ANY stage once it reaches zero, so the
-- transition table allows "current stage -> report (submitted)" from
-- every one of triage/trace/contain/disarm, not only from the last.
-- =========================================================

create or replace function public.guard_mission_attempt_transition()
returns trigger
language plpgsql
security definer
set search_path = public
as $guard_mission_attempt_transition$
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

  -- ----------------------------------
  -- MISSION 04 TRANSITIONS
  -- briefing -> triage -> trace -> contain -> disarm -> report
  -- "-> report (submitted)" is allowed from every one of
  -- triage/trace/contain/disarm, not only the last, because the
  -- countdown timer can fail the mission from any stage once it
  -- reaches zero.
  -- ----------------------------------
  if old.mission_id = 4 then
    if (old.current_stage is null or old.current_stage = 'briefing')
       and new.current_stage = 'triage'
       and new.status = 'active' then
      return new;
    end if;

    if old.current_stage = 'triage'
       and new.current_stage = 'trace'
       and new.status = 'active' then
      return new;
    end if;

    if old.current_stage = 'triage'
       and new.current_stage = 'report'
       and new.status = 'submitted' then
      return new;
    end if;

    if old.current_stage = 'trace'
       and new.current_stage = 'contain'
       and new.status = 'active' then
      return new;
    end if;

    if old.current_stage = 'trace'
       and new.current_stage = 'report'
       and new.status = 'submitted' then
      return new;
    end if;

    if old.current_stage = 'contain'
       and new.current_stage = 'disarm'
       and new.status = 'active' then
      return new;
    end if;

    if old.current_stage = 'contain'
       and new.current_stage = 'report'
       and new.status = 'submitted' then
      return new;
    end if;

    if old.current_stage = 'disarm'
       and new.current_stage = 'report'
       and new.status = 'submitted' then
      return new;
    end if;

    raise exception 'INVALID_STAGE_TRANSITION';
  end if;

  -- Any other mission_id: no player-driven transitions are
  -- recognized until a future migration extends this function
  -- alongside its gameplay routes.
  raise exception 'INVALID_STAGE_TRANSITION';
end;
$guard_mission_attempt_transition$;

-- =========================================================
-- advance_mission_four_stage(): atomic, row-locked stage advance.
-- Mirrors advance_mission_three_stage() exactly, plus a
-- self-defending expiry check: if the countdown has already run out
-- by the time this call takes its row lock, it forces the failed
-- finalize branch regardless of what the caller asked for, so a
-- player can never "beat the clock" by racing a stage-advance call
-- against an already-expired timer. The 720-second duration here
-- must be kept in sync with MISSION_FOUR_DURATION_SECONDS in
-- src/lib/missions/mission-four-scoring.ts.
--
-- Builds every nested JSON update with "||" merges, never jsonb_set
-- on a multi-segment path -- jsonb_set cannot create a missing
-- intermediate object, which is exactly the bug fixed in migration
-- 019 for Mission 03's voice-round saves.
-- =========================================================

create or replace function public.advance_mission_four_stage(
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
as $advance_mission_four_stage$
declare
  v_uid uuid := auth.uid();
  v_attempt public.mission_attempts%rowtype;
  v_progress jsonb;
  v_timer_init jsonb;
  v_started_at text;
  v_net_adjustment integer;
  v_remaining integer;
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
     or v_attempt.mission_id <> 4 then
    raise exception 'INVALID_ATTEMPT';
  end if;

  -- Idempotency: a duplicate/retried request after the stage has
  -- already advanced just returns the existing progress rather than
  -- re-scoring or erroring.
  if v_attempt.status <> 'active'
     or v_attempt.current_stage is distinct from p_from_stage then
    select progress into v_progress
    from public.mission_progress
    where attempt_id = p_attempt_id;

    return coalesce(v_progress, '{}'::jsonb);
  end if;

  select progress into v_progress
  from public.mission_progress
  where attempt_id = p_attempt_id;

  v_progress := coalesce(v_progress, '{}'::jsonb);
  v_started_at := v_progress -> 'timer' ->> 'startedAt';

  if v_started_at is not null and p_to_stage <> 'report' then
    v_net_adjustment := coalesce((v_progress -> 'timer' ->> 'netAdjustmentSeconds')::integer, 0);
    v_remaining := 720 + v_net_adjustment
      - floor(extract(epoch from (now() - v_started_at::timestamptz)));

    if v_remaining <= 0 then
      v_progress := v_progress || jsonb_build_object(
        'report', jsonb_build_object('outcome', 'failed', 'reason', 'time_expired')
      );

      insert into public.mission_progress (attempt_id, player_id, mission_id, progress)
      values (p_attempt_id, v_uid, 4, v_progress)
      on conflict (attempt_id) do update
      set progress = excluded.progress, updated_at = now()
      returning progress into v_progress;

      update public.mission_attempts
      set current_stage = 'report', status = 'submitted'
      where id = p_attempt_id;

      return v_progress;
    end if;
  end if;

  -- Stamp the timer's t=0 the one time the mission truly starts
  -- (briefing -> triage). Every later call leaves it untouched.
  if p_from_stage = 'briefing' and v_started_at is null then
    v_timer_init := jsonb_build_object(
      'timer', jsonb_build_object(
        'startedAt', to_jsonb(now()::text),
        'netAdjustmentSeconds', 0,
        'events', '[]'::jsonb
      )
    );
  else
    v_timer_init := '{}'::jsonb;
  end if;

  v_progress := v_progress || v_timer_init || jsonb_build_object(p_stage_key, p_stage_result);

  insert into public.mission_progress (attempt_id, player_id, mission_id, progress)
  values (p_attempt_id, v_uid, 4, v_progress)
  on conflict (attempt_id) do update
  set progress = excluded.progress, updated_at = now()
  returning progress into v_progress;

  update public.mission_attempts
  set current_stage = p_to_stage, status = p_to_status
  where id = p_attempt_id;

  return v_progress;
end;
$advance_mission_four_stage$;

-- =========================================================
-- save_mission_four_challenge_progress(): saves one challenge's
-- answer/outcome within a stage, and applies that challenge's time
-- penalty/bonus to the running timer total in the same statement.
-- Mirrors save_mission_three_voice_round()'s idempotency guarantee
-- (a challenge key that already has a saved result is never
-- re-scored, and its time delta is never re-applied, by a
-- duplicate/retried request) and its lesson about nested JSON
-- writes: every level here is built with "||" merges, never
-- jsonb_set on a multi-segment path.
-- =========================================================

create or replace function public.save_mission_four_challenge_progress(
  p_attempt_id uuid,
  p_stage text,
  p_challenge_key text,
  p_challenge_result jsonb,
  p_time_delta_seconds integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $save_mission_four_challenge_progress$
declare
  v_uid uuid := auth.uid();
  v_attempt public.mission_attempts%rowtype;
  v_progress jsonb;
  v_existing jsonb;
  v_stage_key text;
  v_started_at text;
  v_net_adjustment integer;
  v_remaining integer;
  v_events jsonb;
  v_new_event jsonb;
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
     or v_attempt.mission_id <> 4 then
    raise exception 'INVALID_ATTEMPT';
  end if;

  if v_attempt.status <> 'active' or v_attempt.current_stage <> p_stage then
    raise exception 'INVALID_STAGE';
  end if;

  v_stage_key := p_stage || '_challenges';

  select progress into v_progress
  from public.mission_progress
  where attempt_id = p_attempt_id;

  v_progress := coalesce(v_progress, '{}'::jsonb);

  v_existing := v_progress -> v_stage_key -> p_challenge_key;

  if v_existing is not null then
    return v_progress;
  end if;

  v_started_at := v_progress -> 'timer' ->> 'startedAt';

  if v_started_at is not null then
    v_net_adjustment := coalesce((v_progress -> 'timer' ->> 'netAdjustmentSeconds')::integer, 0);
    v_remaining := 720 + v_net_adjustment
      - floor(extract(epoch from (now() - v_started_at::timestamptz)));

    if v_remaining <= 0 then
      v_progress := v_progress || jsonb_build_object(
        'report', jsonb_build_object('outcome', 'failed', 'reason', 'time_expired')
      );

      update public.mission_progress
      set progress = v_progress, updated_at = now()
      where attempt_id = p_attempt_id;

      update public.mission_attempts
      set current_stage = 'report', status = 'submitted'
      where id = p_attempt_id;

      return v_progress;
    end if;
  end if;

  v_events := coalesce(v_progress -> 'timer' -> 'events', '[]'::jsonb);
  v_new_event := jsonb_build_object(
    'type', case when p_time_delta_seconds < 0 then 'penalty'
                 when p_time_delta_seconds > 0 then 'bonus'
                 else 'neutral' end,
    'seconds', p_time_delta_seconds,
    'challengeKey', p_challenge_key,
    'at', to_jsonb(now()::text)
  );

  v_progress := v_progress
    || jsonb_build_object(
      v_stage_key,
      coalesce(v_progress -> v_stage_key, '{}'::jsonb)
        || jsonb_build_object(p_challenge_key, p_challenge_result)
    )
    || jsonb_build_object(
      'timer',
      coalesce(v_progress -> 'timer', '{}'::jsonb)
        || jsonb_build_object(
          'netAdjustmentSeconds',
          coalesce((v_progress -> 'timer' ->> 'netAdjustmentSeconds')::integer, 0) + p_time_delta_seconds,
          'events', v_events || jsonb_build_array(v_new_event)
        )
    );

  update public.mission_progress
  set progress = v_progress, updated_at = now()
  where attempt_id = p_attempt_id;

  return v_progress;
end;
$save_mission_four_challenge_progress$;

grant execute
on function public.advance_mission_four_stage(uuid, text, text, text, text, jsonb)
to authenticated;

grant execute
on function public.save_mission_four_challenge_progress(uuid, text, text, jsonb, integer)
to authenticated;
