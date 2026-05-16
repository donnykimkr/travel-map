create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key,
  username text unique,
  avatar_url text,
  is_admin boolean default false,
  language text default 'en',
  friend_code text not null unique,
  constraint profiles_id_fkey foreign key (id) references auth.users(id) on delete cascade
);

create table if not exists public.visited_countries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  country_code text not null,
  created_at timestamptz not null default now(),
  unique (user_id, country_code),
  constraint visited_countries_user_id_fkey foreign key (user_id) references public.profiles(id) on delete cascade
);

create table if not exists public.friends (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  friend_id uuid not null,
  created_at timestamptz not null default now(),
  unique (user_id, friend_id),
  check (user_id <> friend_id),
  constraint friends_user_id_fkey foreign key (user_id) references public.profiles(id) on delete cascade,
  constraint friends_friend_id_fkey foreign key (friend_id) references public.profiles(id) on delete cascade
);

create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  country_code text not null,
  created_at timestamptz not null default now(),
  constraint activities_user_id_fkey foreign key (user_id) references public.profiles(id) on delete cascade
);

create table if not exists public.landmark_visits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  landmark_id text not null,
  created_at timestamptz not null default now(),
  unique (user_id, landmark_id),
  constraint landmark_visits_user_id_fkey foreign key (user_id) references public.profiles(id) on delete cascade
);

alter table public.profiles enable row level security;
alter table public.visited_countries enable row level security;
alter table public.friends enable row level security;
alter table public.activities enable row level security;
alter table public.landmark_visits enable row level security;

create policy "Authenticated users can read profiles"
  on public.profiles for select
  to authenticated
  using (true);

create policy "Users can create their profile"
  on public.profiles for insert
  to authenticated
  with check (id = auth.uid());

create policy "Users can update their profile"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "Authenticated users can read visits"
  on public.visited_countries for select
  to authenticated
  using (true);

create policy "Users can insert own visits"
  on public.visited_countries for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "Users can delete own visits"
  on public.visited_countries for delete
  to authenticated
  using (user_id = auth.uid());

create policy "Users can read own friend links"
  on public.friends for select
  to authenticated
  using (user_id = auth.uid());

create policy "Users can add own friend links"
  on public.friends for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "Users can remove own friend links"
  on public.friends for delete
  to authenticated
  using (user_id = auth.uid());

create policy "Authenticated users can read activities"
  on public.activities for select
  to authenticated
  using (true);

create policy "Users can insert own activities"
  on public.activities for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "Authenticated users can read landmark visits"
  on public.landmark_visits for select
  to authenticated
  using (true);

create policy "Users can insert own landmark visits"
  on public.landmark_visits for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "Users can delete own landmark visits"
  on public.landmark_visits for delete
  to authenticated
  using (user_id = auth.uid());
