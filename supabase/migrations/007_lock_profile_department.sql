-- =========================================================
-- Close loophole: complete_agent_profile() could silently
-- overwrite a player's verified `department` with arbitrary
-- free text, bypassing /select-workgroup entirely and
-- undermining the org_departments-backed leaderboard feature.
--
-- The client (src/app/dashboard/ProfileSetup.tsx) no longer
-- sends p_department at all. This migration keeps the function
-- signature unchanged (so the existing `grant execute ... (text, text)`
-- stays valid) but stops the function from ever writing to
-- `department`, regardless of what a caller passes.
-- =========================================================

create or replace function public.complete_agent_profile(
  p_alias text,
  p_department text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();

  v_alias text :=
    regexp_replace(
      trim(p_alias),
      '[[:space:]]+',
      ' ',
      'g'
    );
begin

  if v_uid is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if char_length(v_alias) < 3
     or char_length(v_alias) > 24 then
    raise exception 'INVALID_ALIAS';
  end if;

  if exists (
    select 1
    from public.profiles
    where lower(alias) = lower(v_alias)
      and id <> v_uid
  ) then
    raise exception 'ALIAS_TAKEN';
  end if;

  -- NOTE: department is intentionally never written here.
  -- It is set only via /api/workgroup, which validates the
  -- value against the admin-managed org_departments/org_branches
  -- lists. p_department is accepted (for signature compatibility)
  -- but ignored.
  update public.profiles
  set
    alias = v_alias,
    onboarding_complete = true,
    updated_at = now()
  where id = v_uid
    and is_active = true;

  if not found then
    raise exception 'PROFILE_REQUIRED';
  end if;

end;
$$;


grant execute
on function public.complete_agent_profile(text, text)
to authenticated;
