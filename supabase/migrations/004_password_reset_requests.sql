alter table public.profiles
add column if not exists must_change_password boolean
not null default false;


create table if not exists public.password_reset_requests (
  id uuid primary key default gen_random_uuid(),

  player_id uuid not null
    references public.profiles(id)
    on delete cascade,

  status text not null default 'pending'
    check (
      status in (
        'pending',
        'resolved',
        'cancelled'
      )
    ),

  requested_at timestamptz
    not null default now(),

  resolved_at timestamptz,

  resolved_by uuid
    references public.profiles(id)
    on delete set null
);


create index if not exists
password_reset_requests_player_idx
on public.password_reset_requests(player_id);


create index if not exists
password_reset_requests_status_idx
on public.password_reset_requests(
  status,
  requested_at desc
);


create unique index if not exists
password_reset_requests_one_pending
on public.password_reset_requests(player_id)
where status = 'pending';


alter table
public.password_reset_requests
enable row level security;