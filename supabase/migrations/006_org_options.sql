-- =====================================================
-- ORG OPTIONS
-- Admin-managed department & branch name lists, used to
-- populate the workgroup selection dropdowns and to group
-- the "Top Department" / "Top Branch" leaderboards.
-- Additive only: no existing table is altered.
-- =====================================================

create table if not exists public.org_departments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create unique index if not exists org_departments_name_idx
  on public.org_departments (lower(name));

create table if not exists public.org_branches (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create unique index if not exists org_branches_name_idx
  on public.org_branches (lower(name));

alter table public.org_departments enable row level security;
alter table public.org_branches enable row level security;

create policy "org_departments authenticated read"
  on public.org_departments for select to authenticated using (true);

create policy "org_departments admin manage"
  on public.org_departments for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "org_branches authenticated read"
  on public.org_branches for select to authenticated using (true);

create policy "org_branches admin manage"
  on public.org_branches for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

grant select on public.org_departments, public.org_branches to authenticated;
grant insert, update, delete on public.org_departments, public.org_branches to authenticated;
