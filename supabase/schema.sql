-- Tables

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text,
  level int default 1,
  total_xp int default 0,
  best_streak int default 0,
  created_at timestamptz default now()
);

create table if not exists public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  category text not null,
  difficulty text not null,
  xp_value int not null,
  streak_count int default 0,
  best_streak int default 0,
  total_completions int default 0,
  last_completed date,
  status text default 'Active',
  created_at timestamptz default now()
);

create table if not exists public.daily_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  date date not null,
  habit_ids uuid[] default '{}',
  total_xp int default 0,
  perfect_bonus_applied boolean default false,
  created_at timestamptz default now(),
  unique(user_id, date)
);

create table if not exists public.achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  key text not null,
  name text not null,
  xp int not null,
  unlocked_at timestamptz default now(),
  unique(user_id, key)
);

-- Policies
alter table public.profiles enable row level security;
alter table public.habits enable row level security;
alter table public.daily_logs enable row level security;
alter table public.achievements enable row level security;

create policy "Profiles are viewable by owner" on public.profiles
  for select using ( auth.uid() = id );
create policy "Profiles are updatable by owner" on public.profiles
  for all using ( auth.uid() = id ) with check ( auth.uid() = id );

create policy "Habits by owner" on public.habits
  for all using ( auth.uid() = user_id ) with check ( auth.uid() = user_id );

create policy "Daily logs by owner" on public.daily_logs
  for all using ( auth.uid() = user_id ) with check ( auth.uid() = user_id );

create policy "Achievements by owner" on public.achievements
  for all using ( auth.uid() = user_id ) with check ( auth.uid() = user_id );

-- Weekly challenges
create table if not exists public.weekly_challenges (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  kind text not null check (kind in ('completions','perfect_days')),
  target_count int not null,
  reward_xp int not null default 100,
  start_date date not null,
  end_date date not null,
  created_at timestamptz default now()
);

create table if not exists public.user_challenge_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  challenge_id uuid not null references public.weekly_challenges(id) on delete cascade,
  progress int not null default 0,
  completed_at timestamptz,
  unique(user_id, challenge_id)
);

alter table public.weekly_challenges enable row level security;
alter table public.user_challenge_progress enable row level security;

-- Allow everyone to read available challenges
create policy "Challenges are readable by all" on public.weekly_challenges
  for select using ( true );
-- Only admins (or none) can modify challenges; keep it closed for now
create policy "User challenge progress by owner" on public.user_challenge_progress
  for all using ( auth.uid() = user_id ) with check ( auth.uid() = user_id );

-- Leaderboard RPC for weekly totals
create or replace function public.get_weekly_leaderboard(start_date date, end_date date)
returns table(user_id uuid, total_xp bigint)
language sql
security definer
set search_path = public
as $$
  select user_id, sum(total_xp)::bigint as total_xp
  from public.daily_logs
  where date between start_date and end_date
  group by user_id
  order by total_xp desc
  limit 100;
$$;

revoke all on function public.get_weekly_leaderboard(date, date) from public;
grant execute on function public.get_weekly_leaderboard(date, date) to anon, authenticated;

