-- =========================================================
-- Mission 04 duration change: 12 minutes (720s) -> 1 minute 30
-- seconds (90s).
--
-- The mission duration is hardcoded as a literal inside
-- advance_mission_four_stage() and save_mission_four_challenge_progress()
-- (migration 020), per that migration's own comment: these two
-- literals must be kept in sync with MISSION_FOUR_DURATION_SECONDS
-- in src/lib/missions/mission-four-scoring.ts (also being updated to
-- 90 in this same change). This migration only replaces those two
-- function bodies with the corrected duration -- same signatures,
-- same logic, same idempotency/expiry-check behaviour as migration
-- 020. "create or replace" works whether migration 020 has already
-- run or not, so this is safe to apply in either order.
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
    v_remaining := 90 + v_net_adjustment
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
    v_remaining := 90 + v_net_adjustment
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
