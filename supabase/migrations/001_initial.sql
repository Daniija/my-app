-- Cyber Defence Unit — initial database, Week 1 game, RLS, leaderboard and scoring.
-- Run this entire file in the Supabase SQL Editor on a NEW project.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  alias text not null unique check (char_length(alias) between 3 and 24),
  department text,
  role text not null default 'player' check (role in ('player','admin')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.missions (
  id integer primary key,
  slug text not null unique,
  title text not null,
  sequence integer not null unique,
  max_score integer not null,
  unlock_at timestamptz not null,
  close_at timestamptz,
  status text not null default 'scheduled' check (status in ('draft','scheduled','live','forced_open','closed','emergency_locked')),
  duration_target_minutes integer not null default 20,
  finale boolean not null default false
);

create table if not exists public.mission_attempts (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.profiles(id) on delete cascade,
  mission_id integer not null references public.missions(id) on delete cascade,
  status text not null default 'active' check (status in ('active','submitting','completed','suspended')),
  current_stage text not null default 'briefing',
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  hints_used integer not null default 0,
  last_saved_at timestamptz not null default now(),
  unique(player_id, mission_id)
);

create table if not exists public.mission_progress (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null unique references public.mission_attempts(id) on delete cascade,
  player_id uuid not null references public.profiles(id) on delete cascade,
  mission_id integer not null references public.missions(id) on delete cascade,
  progress jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.mission_scores (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null unique references public.mission_attempts(id) on delete cascade,
  player_id uuid not null references public.profiles(id) on delete cascade,
  mission_id integer not null references public.missions(id) on delete cascade,
  breakdown jsonb not null,
  base_score integer not null default 0,
  bonus_score integer not null default 0,
  total_score integer not null default 0,
  accuracy_points integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(player_id, mission_id)
);

create table if not exists public.leaderboard_entries (
  player_id uuid primary key references public.profiles(id) on delete cascade,
  alias text not null,
  mission_1_score integer not null default 0,
  mission_2_score integer not null default 0,
  mission_3_score integer not null default 0,
  mission_4_score integer not null default 0,
  total_score integer not null default 0,
  completed_count integer not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.bonus_codes (
  id uuid primary key default gen_random_uuid(),
  mission_id integer not null references public.missions(id) on delete cascade,
  code text not null unique,
  points integer not null check(points > 0),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.bonus_redemptions (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.profiles(id) on delete cascade,
  bonus_code_id uuid not null references public.bonus_codes(id) on delete cascade,
  points integer not null,
  redeemed_at timestamptz not null default now(),
  unique(player_id, bonus_code_id)
);

create table if not exists public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid,
  action text not null,
  entity_type text,
  entity_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Mission schedule: all timestamps are explicit Jamaica UTC-05:00.
insert into public.missions (id,slug,title,sequence,max_score,unlock_at,status,duration_target_minutes,finale)
values
  (1,'the-breach','The Breach',1,1500,'2026-10-09 09:00:00-05','scheduled',20,false),
  (2,'the-digital-footprint','The Digital Footprint',2,1500,'2026-10-16 09:00:00-05','scheduled',20,false),
  (3,'trust-no-one','Trust No One',3,1500,'2026-10-23 09:00:00-05','scheduled',20,false),
  (4,'zero-hour','Zero Hour',4,3000,'2026-10-30 09:00:00-05','scheduled',40,true)
on conflict (id) do update set title=excluded.title, unlock_at=excluded.unlock_at, max_score=excluded.max_score;

insert into public.bonus_codes (mission_id,code,points)
values (1,'HORIZON-47',50)
on conflict (code) do nothing;

-- RLS helper. SECURITY DEFINER avoids recursive profile policy checks.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(select 1 from public.profiles where id = auth.uid() and role = 'admin' and is_active = true);
$$;

alter table public.profiles enable row level security;
alter table public.missions enable row level security;
alter table public.mission_attempts enable row level security;
alter table public.mission_progress enable row level security;
alter table public.mission_scores enable row level security;
alter table public.leaderboard_entries enable row level security;
alter table public.bonus_codes enable row level security;
alter table public.bonus_redemptions enable row level security;
alter table public.audit_logs enable row level security;

-- Profiles
create policy "profiles read own or admin" on public.profiles for select to authenticated using (id=auth.uid() or public.is_admin());
create policy "profiles insert own" on public.profiles for insert to authenticated with check (id=auth.uid() and role='player');
create policy "profiles update own basic" on public.profiles for update to authenticated using (id=auth.uid()) with check (id=auth.uid());

-- Missions: schedule metadata can be seen by authenticated players.
create policy "missions authenticated read" on public.missions for select to authenticated using (true);
create policy "missions admin manage" on public.missions for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Attempts
create policy "attempts read own or admin" on public.mission_attempts for select to authenticated using (player_id=auth.uid() or public.is_admin());

-- Progress
create policy "progress read own or admin" on public.mission_progress for select to authenticated using (player_id=auth.uid() or public.is_admin());
create policy "progress insert own" on public.mission_progress for insert to authenticated with check (player_id=auth.uid());
create policy "progress update own" on public.mission_progress for update to authenticated using (player_id=auth.uid()) with check (player_id=auth.uid());

-- Scores: players can read their detailed scores; leaderboard has safe public columns separately.
create policy "scores read own or admin" on public.mission_scores for select to authenticated using (player_id=auth.uid() or public.is_admin());

-- Leaderboard safe public data for authenticated employees.
create policy "leaderboard authenticated read" on public.leaderboard_entries for select to authenticated using (true);

-- Bonus redemption visibility
create policy "redemptions read own or admin" on public.bonus_redemptions for select to authenticated using (player_id=auth.uid() or public.is_admin());

-- Admin audit visibility
create policy "audit admin read" on public.audit_logs for select to authenticated using (public.is_admin());

-- Keep leaderboard alias row in sync with profile creation/alias changes.
create or replace function public.sync_profile_leaderboard()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.leaderboard_entries(player_id,alias)
  values(new.id,new.alias)
  on conflict(player_id) do update set alias=excluded.alias, updated_at=now();
  return new;
end; $$;

drop trigger if exists trg_profile_leaderboard on public.profiles;
create trigger trg_profile_leaderboard after insert or update of alias on public.profiles for each row execute function public.sync_profile_leaderboard();

-- Recalculate a player's public leaderboard row whenever an official score changes.
create or replace function public.refresh_leaderboard_for_player(p_player uuid)
returns void language plpgsql security definer set search_path=public as $$
declare v_alias text;
begin
  select alias into v_alias from public.profiles where id=p_player;
  insert into public.leaderboard_entries(player_id,alias,mission_1_score,mission_2_score,mission_3_score,mission_4_score,total_score,completed_count,updated_at)
  select p_player, v_alias,
    coalesce(max(total_score) filter(where mission_id=1),0),
    coalesce(max(total_score) filter(where mission_id=2),0),
    coalesce(max(total_score) filter(where mission_id=3),0),
    coalesce(max(total_score) filter(where mission_id=4),0),
    coalesce(sum(total_score),0),
    count(*)::int,
    now()
  from public.mission_scores where player_id=p_player
  on conflict(player_id) do update set
    alias=excluded.alias,
    mission_1_score=excluded.mission_1_score,
    mission_2_score=excluded.mission_2_score,
    mission_3_score=excluded.mission_3_score,
    mission_4_score=excluded.mission_4_score,
    total_score=excluded.total_score,
    completed_count=excluded.completed_count,
    updated_at=now();
end; $$;

create or replace function public.score_changed_refresh_leaderboard()
returns trigger language plpgsql security definer set search_path=public as $$
begin perform public.refresh_leaderboard_for_player(coalesce(new.player_id,old.player_id)); return coalesce(new,old); end; $$;

drop trigger if exists trg_score_leaderboard on public.mission_scores;
create trigger trg_score_leaderboard after insert or update or delete on public.mission_scores for each row execute function public.score_changed_refresh_leaderboard();

-- Mission availability is server/database authoritative.
create or replace function public.mission_is_available(p_mission_id integer)
returns boolean language sql stable security definer set search_path=public as $$
  select exists(
    select 1 from public.missions m
    where m.id=p_mission_id
      and m.status <> 'emergency_locked'
      and m.status <> 'closed'
      and (m.status in ('live','forced_open') or (m.status='scheduled' and now() >= m.unlock_at))
      and (m.close_at is null or now() < m.close_at)
  );
$$;

-- Atomic start/resume. Returns same attempt if called twice or from multiple tabs.
create or replace function public.start_mission(p_mission_id integer)
returns table(id uuid, player_id uuid, mission_id integer, status text, current_stage text, started_at timestamptz, completed_at timestamptz)
language plpgsql security definer set search_path=public as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if not exists(select 1 from public.profiles where profiles.id=v_uid and is_active=true) then raise exception 'PROFILE_REQUIRED'; end if;
  if not public.mission_is_available(p_mission_id) then
    if exists(select 1 from public.mission_attempts a where a.player_id=v_uid and a.mission_id=p_mission_id and a.status in ('active','completed')) then
      -- Existing attempts remain retrievable, including completed attempts.
      null;
    else
      raise exception 'MISSION_LOCKED';
    end if;
  end if;

  insert into public.mission_attempts(player_id,mission_id)
  values(v_uid,p_mission_id)
  on conflict(player_id,mission_id) do nothing;

  return query select a.id,a.player_id,a.mission_id,a.status,a.current_stage,a.started_at,a.completed_at
    from public.mission_attempts a where a.player_id=v_uid and a.mission_id=p_mission_id;
end; $$;

grant execute on function public.start_mission(integer) to authenticated;
grant execute on function public.mission_is_available(integer) to authenticated;

-- Week 1 atomic scoring. Correct answers never need to be sent to the browser.
create or replace function public.submit_week1_attempt(p_attempt_id uuid, p_submission jsonb)
returns table(total_score integer, breakdown jsonb)
language plpgsql security definer set search_path=public as $$
declare
  v_uid uuid := auth.uid();
  v_attempt public.mission_attempts%rowtype;
  v_existing public.mission_scores%rowtype;
  v_attack integer := 0;
  v_entry integer := 0;
  v_sequence integer := 0;
  v_evidence integer := 0;
  v_reasoning integer := 0;
  v_containment integer := 0;
  v_efficiency integer := 0;
  v_bonus integer := 0;
  v_base integer := 0;
  v_total integer := 0;
  v_accuracy integer := 0;
  v_elapsed_seconds numeric;
  v_hints integer := greatest(0, least(3, coalesce((p_submission->>'hints')::integer,0)));
  v_count integer;
  v_bad integer;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v_attempt from public.mission_attempts where id=p_attempt_id for update;
  if not found or v_attempt.player_id<>v_uid or v_attempt.mission_id<>1 then raise exception 'INVALID_ATTEMPT'; end if;

  select * into v_existing from public.mission_scores where attempt_id=p_attempt_id;
  if found then return query select v_existing.total_score,v_existing.breakdown; return; end if;

  if p_submission->>'attackMethod'='phishing' then v_attack:=300; end if;
  if p_submission->>'entryPoint'='fake_login_page' then v_entry:=250; end if;
  if p_submission->'sequence'='["email","link","credentials","mfa","account_access"]'::jsonb then v_sequence:=200; end if;

  select count(*) into v_count from jsonb_array_elements_text(coalesce(p_submission->'strongest','[]'::jsonb)) x where x.value in ('E02','E03','E04');
  v_evidence := least(300,v_count*100);

  select count(*) into v_count from jsonb_array_elements_text(coalesce(p_submission->'reasoning','[]'::jsonb)) x where x.value in ('mfa_after_link','new_device_after_mfa');
  v_reasoning := least(100,v_count*50);

  select count(*) into v_count from jsonb_array_elements_text(coalesce(p_submission->'containment','[]'::jsonb)) x where x.value in ('revoke_sessions','reset_credentials','preserve_logs','disable_account');
  select count(*) into v_bad from jsonb_array_elements_text(coalesce(p_submission->'containment','[]'::jsonb)) x where x.value in ('accuse_maya','wait');
  v_containment := greatest(0,least(200,(v_count*50)-(v_bad*50)));

  v_elapsed_seconds := extract(epoch from (now()-v_attempt.started_at));
  v_efficiency := case when v_elapsed_seconds < 720 then 100 when v_elapsed_seconds < 900 then 75 when v_elapsed_seconds < 1080 then 50 when v_elapsed_seconds < 1200 then 25 else 0 end;
  -- Hint penalties: 25, 25, then 50 points, capped at the available efficiency bonus.
  v_efficiency := greatest(0,v_efficiency - case v_hints when 1 then 25 when 2 then 50 when 3 then 100 else 0 end);

  select coalesce(sum(br.points),0)::int into v_bonus
  from public.bonus_redemptions br where br.player_id=v_uid and br.bonus_code_id in (select id from public.bonus_codes where mission_id=1);

  v_base := v_attack+v_entry+v_sequence+v_evidence+v_reasoning+v_containment+v_efficiency;
  v_total := least(1500,v_base+v_bonus);
  v_accuracy := v_attack+v_entry+v_sequence+v_evidence+v_reasoning+v_containment;

  insert into public.mission_scores(attempt_id,player_id,mission_id,breakdown,base_score,bonus_score,total_score,accuracy_points)
  values(p_attempt_id,v_uid,1,jsonb_build_object(
    'attack_method',v_attack,'entry_point',v_entry,'sequence',v_sequence,'evidence',v_evidence,
    'reasoning',v_reasoning,'containment',v_containment,'efficiency',v_efficiency,'bonus',v_bonus
  ),v_base,v_bonus,v_total,v_accuracy);

  update public.mission_attempts set status='completed',current_stage='result',completed_at=now(),hints_used=v_hints,last_saved_at=now() where id=p_attempt_id;
  update public.mission_progress set progress=jsonb_set(coalesce(progress,'{}'::jsonb),'{stage}','"result"'::jsonb,true),updated_at=now() where attempt_id=p_attempt_id;
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,details) values(v_uid,'mission_submitted','mission_attempt',p_attempt_id::text,jsonb_build_object('mission_id',1,'score',v_total));

  return query select v_total,jsonb_build_object(
    'attack_method',v_attack,'entry_point',v_entry,'sequence',v_sequence,'evidence',v_evidence,
    'reasoning',v_reasoning,'containment',v_containment,'efficiency',v_efficiency,'bonus',v_bonus
  );
end; $$;

grant execute on function public.submit_week1_attempt(uuid,jsonb) to authenticated;

-- Hidden-intelligence code redemption. If Week 1 is already scored, update it atomically.
create or replace function public.redeem_bonus_code(p_code text)
returns table(points integer, message text)
language plpgsql security definer set search_path=public as $$
declare v_uid uuid:=auth.uid(); v_code public.bonus_codes%rowtype; v_score public.mission_scores%rowtype;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v_code from public.bonus_codes where upper(code)=upper(trim(p_code)) and active=true;
  if not found then raise exception 'INVALID_CODE'; end if;
  insert into public.bonus_redemptions(player_id,bonus_code_id,points) values(v_uid,v_code.id,v_code.points) on conflict(player_id,bonus_code_id) do nothing;
  if not found then return query select 0,'Code already redeemed'::text; return; end if;

  select * into v_score from public.mission_scores where player_id=v_uid and mission_id=v_code.mission_id for update;
  if found then
    update public.mission_scores set bonus_score=least(50,bonus_score+v_code.points),total_score=least((select max_score from public.missions where id=v_code.mission_id),base_score+least(50,bonus_score+v_code.points)),
      breakdown=jsonb_set(breakdown,'{bonus}',to_jsonb(least(50,bonus_score+v_code.points)),true),updated_at=now() where id=v_score.id;
  end if;
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,details) values(v_uid,'bonus_redeemed','bonus_code',v_code.id::text,jsonb_build_object('points',v_code.points));
  return query select v_code.points,'Intelligence verified'::text;
end; $$;

grant execute on function public.redeem_bonus_code(text) to authenticated;

-- Realtime publication for the safe leaderboard table. Idempotent check.
do $$ begin
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='leaderboard_entries') then
    alter publication supabase_realtime add table public.leaderboard_entries;
  end if;
end $$;

-- Explicit API privileges. RLS still decides which rows are allowed.
revoke all on table public.profiles, public.missions, public.mission_attempts, public.mission_progress, public.mission_scores, public.leaderboard_entries, public.bonus_codes, public.bonus_redemptions, public.audit_logs from anon;
revoke all on table public.profiles, public.missions, public.mission_attempts, public.mission_progress, public.mission_scores, public.leaderboard_entries, public.bonus_codes, public.bonus_redemptions, public.audit_logs from authenticated;

grant select on public.profiles, public.missions, public.mission_attempts, public.mission_progress, public.mission_scores, public.leaderboard_entries, public.bonus_redemptions, public.audit_logs to authenticated;
grant insert (id,email,alias,department) on public.profiles to authenticated;
grant update (alias,department,updated_at) on public.profiles to authenticated;
grant insert (attempt_id,player_id,mission_id,progress,updated_at) on public.mission_progress to authenticated;
grant update (progress,updated_at) on public.mission_progress to authenticated;
-- Admin mission changes are restricted by the admin-only RLS policy above.
grant insert, update, delete on public.missions to authenticated;
