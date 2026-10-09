-- Username + password self-registration migration.
-- Run after 001_initial.sql and 002_agent_id_auth.sql if upgrading the Agent ID build.

alter table public.profiles add column if not exists username text;

-- Convert any existing Agent-ID profiles to a private username so no account is orphaned.
update public.profiles
set username = lower(coalesce(username, agent_id, split_part(email,'@',1)))
where username is null;

-- Normalize existing usernames and protect uniqueness.
update public.profiles set username = lower(trim(username)) where username is not null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname='profiles_username_key') then
    alter table public.profiles add constraint profiles_username_key unique(username);
  end if;
end $$;

alter table public.profiles alter column username set not null;

-- Agent IDs are no longer used by the application.
drop function if exists public.my_agent_id();
alter table public.profiles drop column if exists agent_id;

-- Profiles are created only by trusted server-side registration using the service role.
revoke insert, update on public.profiles from authenticated;

-- Keep controlled alias onboarding for ordinary players.
create or replace function public.complete_agent_profile(p_alias text, p_department text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_alias text := regexp_replace(trim(p_alias), '[[:space:]]+', ' ', 'g');
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if char_length(v_alias) < 3 or char_length(v_alias) > 24 then raise exception 'INVALID_ALIAS'; end if;
  if exists(select 1 from public.profiles where lower(alias)=lower(v_alias) and id<>v_uid) then
    raise exception 'ALIAS_TAKEN';
  end if;

  update public.profiles
     set alias=v_alias,
         department=nullif(trim(p_department),''),
         onboarding_complete=true,
         updated_at=now()
   where id=v_uid and is_active=true;

  if not found then raise exception 'PROFILE_REQUIRED'; end if;
end;
$$;

grant execute on function public.complete_agent_profile(text,text) to authenticated;

-- A public leaderboard entry exists only after the player has chosen a cyber alias.
create or replace function public.sync_profile_leaderboard()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.onboarding_complete = true and new.alias is not null then
    insert into public.leaderboard_entries(player_id,alias)
    values(new.id,new.alias)
    on conflict(player_id) do update set alias=excluded.alias, updated_at=now();
  else
    delete from public.leaderboard_entries where player_id=new.id;
  end if;
  return new;
end; $$;

drop trigger if exists trg_profile_leaderboard on public.profiles;
create trigger trg_profile_leaderboard after insert or update of alias, onboarding_complete on public.profiles for each row execute function public.sync_profile_leaderboard();
