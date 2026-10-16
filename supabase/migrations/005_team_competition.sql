-- =====================================================
-- TEAM COMPETITION
-- HQ DEPARTMENTS + STORE BRANCHES
-- =====================================================

alter table public.profiles
add column if not exists work_location_type text;

alter table public.profiles
add column if not exists branch text;

alter table public.profiles
drop constraint if exists profiles_work_location_type_check;

alter table public.profiles
add constraint profiles_work_location_type_check
check (
  work_location_type is null
  or work_location_type in ('hq', 'branch')
);


-- -----------------------------------------------------
-- DEPARTMENT MISSION RESULTS
-- -----------------------------------------------------

create table if not exists public.department_mission_scores (
  id uuid primary key default gen_random_uuid(),

  mission_id bigint not null
    references public.missions(id)
    on delete cascade,

  department text not null,

  participant_count integer
    not null default 0,

  average_player_score numeric(10, 2)
    not null default 0,

  mission_max_score integer
    not null default 0,

  team_score numeric(6, 2)
    not null default 0,

  calculated_at timestamptz
    not null default now(),

  unique (
    mission_id,
    department
  )
);


-- -----------------------------------------------------
-- BRANCH MISSION RESULTS
-- -----------------------------------------------------

create table if not exists public.branch_mission_scores (
  id uuid primary key default gen_random_uuid(),

  mission_id bigint not null
    references public.missions(id)
    on delete cascade,

  branch text not null,

  participant_count integer
    not null default 0,

  average_player_score numeric(10, 2)
    not null default 0,

  mission_max_score integer
    not null default 0,

  team_score numeric(6, 2)
    not null default 0,

  calculated_at timestamptz
    not null default now(),

  unique (
    mission_id,
    branch
  )
);


create index if not exists
department_mission_scores_mission_idx
on public.department_mission_scores(
  mission_id
);


create index if not exists
branch_mission_scores_mission_idx
on public.branch_mission_scores(
  mission_id
);


alter table
public.department_mission_scores
enable row level security;

alter table
public.branch_mission_scores
enable row level security;