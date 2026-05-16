alter table public.profiles add column if not exists is_admin boolean default false;
alter table public.profiles add column if not exists language text default 'en';

create table if not exists public.landmark_visits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  landmark_id text not null,
  created_at timestamptz not null default now(),
  unique (user_id, landmark_id),
  constraint landmark_visits_user_id_fkey foreign key (user_id) references public.profiles(id) on delete cascade
);

alter table public.landmark_visits enable row level security;

drop policy if exists "Authenticated users can read landmark visits" on public.landmark_visits;
create policy "Authenticated users can read landmark visits"
  on public.landmark_visits for select
  to authenticated
  using (true);

drop policy if exists "Users can insert own landmark visits" on public.landmark_visits;
create policy "Users can insert own landmark visits"
  on public.landmark_visits for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "Users can delete own landmark visits" on public.landmark_visits;
create policy "Users can delete own landmark visits"
  on public.landmark_visits for delete
  to authenticated
  using (user_id = auth.uid());

update public.profiles
set is_admin = true
where id in (
  select id
  from auth.users
  where email = 'donnykimkr@gmail.com'
);
