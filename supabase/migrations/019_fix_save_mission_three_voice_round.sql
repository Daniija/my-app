-- =========================================================
-- Fix save_mission_three_voice_round() (migration 011): it never
-- actually saved anything.
--
-- Its UPDATE clause used:
--   jsonb_set(coalesce(progress, '{}'), array['voice_rounds', p_round_key], p_round_result, true)
--
-- jsonb_set() can only create the FINAL segment of a path -- it does
-- not create a missing INTERMEDIATE object. Every real attempt's
-- progress already exists as {"transmission": {...}} (written by
-- advance_mission_three_stage()'s "||" merge, which has no such
-- limitation) with no "voice_rounds" key yet, so this jsonb_set call
-- silently returned the input completely unchanged -- no error, no
-- exception, nothing saved. Confirmed against live data: every
-- in-progress Mission 03 attempt has progress = {"transmission": {...}}
-- with zero voice_rounds entries, despite players completing rounds
-- with no save errors logged.
--
-- This was invisible to players because round/submit's route.ts (and
-- final-challenge/submit's route.ts) each fall back to the locally
-- computed result when the RPC's returned progress doesn't contain
-- the just-saved round, so every round looked successful while
-- nothing was ever actually persisted -- hence finalize later
-- reporting every round as missing, every time, no matter how many
-- times a player replayed the section.
--
-- Fix: build the nested object with "||" merges instead of
-- jsonb_set's path-based approach, which has no intermediate-level
-- limitation.
-- =========================================================

create or replace function public.save_mission_three_voice_round(
  p_attempt_id uuid,
  p_round_key text,
  p_round_result jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_attempt public.mission_attempts%rowtype;
  v_existing jsonb;
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

  if v_attempt.status <> 'active' or v_attempt.current_stage <> 'voice' then
    raise exception 'INVALID_STAGE';
  end if;

  select progress -> 'voice_rounds' -> p_round_key into v_existing
  from public.mission_progress
  where attempt_id = p_attempt_id;

  if v_existing is not null then
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
    jsonb_build_object(
      'voice_rounds',
      jsonb_build_object(p_round_key, p_round_result)
    )
  )
  on conflict (attempt_id) do update
  set
    progress = coalesce(mission_progress.progress, '{}'::jsonb) || jsonb_build_object(
      'voice_rounds',
      coalesce(mission_progress.progress -> 'voice_rounds', '{}'::jsonb)
        || jsonb_build_object(p_round_key, p_round_result)
    ),
    updated_at = now()
  returning progress into v_progress;

  return v_progress;
end;
$$;
