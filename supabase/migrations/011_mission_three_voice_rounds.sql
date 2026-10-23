-- =========================================================
-- Mission 03 Executive Voice Verification: intra-stage round
-- progress.
--
-- The "voice" stage is now a 5-round section (plus a final
-- multi-clip challenge) instead of a single decision, but it is
-- still exactly one entry in the Mission 03 stage machine --
-- current_stage stays 'voice' for the whole section. This function
-- is the ONLY new database object this feature needs: it lets each
-- round's already-computed (server-side, in the API route) result
-- be saved into mission_progress.progress.voice_rounds without
-- touching mission_attempts.current_stage at all. No changes to
-- guard_mission_attempt_transition() or advance_mission_three_stage()
-- are required -- once every round + the final challenge exist,
-- the section is finalized through that existing, unmodified RPC
-- (fromStage: 'voice', toStage: 'email'), exactly like every other
-- Mission 03 stage.
--
-- Idempotent by design: if a round key already has a saved result,
-- this returns the existing progress unchanged instead of
-- overwriting it -- the same "don't award twice" guarantee
-- advance_mission_three_stage() already provides for whole-stage
-- submissions, applied here at the round level so a completed round
-- can't be replayed to farm points.
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
    progress = jsonb_set(
      coalesce(mission_progress.progress, '{}'::jsonb),
      array['voice_rounds', p_round_key],
      p_round_result,
      true
    ),
    updated_at = now()
  returning progress into v_progress;

  return v_progress;
end;
$$;

grant execute
on function public.save_mission_three_voice_round(uuid, text, jsonb)
to authenticated;
