-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- PROFILES (Public user data)
create table public.profiles (
  id uuid references auth.users not null primary key,
  email text,
  name text,
  avatar text,
  bio text,
  sport text default 'Any',
  height text,
  weight text,
  speed text,
  vertical text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- TEAMS
create table public.teams (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  sport text not null,
  description text,
  logo text,
  owner_id uuid references public.profiles(id) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- TEAM MEMBERS
create table public.team_members (
  id uuid default uuid_generate_v4() primary key,
  team_id uuid references public.teams(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  role text default 'Member', -- 'Owner', 'Member', 'Guest'
  position text default 'Bench',
  joined_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(team_id, user_id)
);

-- TEAM REQUESTS
create table public.team_requests (
  id uuid default uuid_generate_v4() primary key,
  team_id uuid references public.teams(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  status text default 'pending',
  requested_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(team_id, user_id)
);

-- TEAM WINS (History)
create table public.team_wins (
  id uuid default uuid_generate_v4() primary key,
  team_id uuid references public.teams(id) on delete cascade not null,
  category text, -- 'Tournament', 'Match'
  description text,
  date timestamp with time zone default timezone('utc'::text, now()) not null
);

-- TOURNAMENTS
create table public.tournaments (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  sport text not null,
  creator_id uuid references public.profiles(id),
  status text default 'Active',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- TOURNAMENT TEAMS (Join Table)
create table public.tournament_teams (
  tournament_id uuid references public.tournaments(id) on delete cascade not null,
  team_id uuid references public.teams(id) on delete cascade not null,
  primary key (tournament_id, team_id)
);

-- MATCHES
create table public.matches (
  id uuid default uuid_generate_v4() primary key,
  tournament_id uuid references public.tournaments(id) on delete cascade not null,
  round integer not null,
  match_identifier text, -- e.g. 'm_1_0'
  team1_id uuid references public.teams(id),
  team2_id uuid references public.teams(id),
  winner_id uuid references public.teams(id),
  score1 integer default 0,
  score2 integer default 0
);

-- EVENTS
create table public.events (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  type text,
  sport text,
  date text,
  time text,
  location text,
  description text,
  cost text,
  reward text,
  max_spots integer,
  image text,
  image_gradient text,
  creator_id uuid references public.profiles(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- EVENT ATTENDEES
create table public.event_attendees (
  event_id uuid references public.events(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  joined_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (event_id, user_id)
);

-- RLS POLICIES (Simple for now: Public Read, Auth Write)
alter table public.profiles enable row level security;
create policy "Public profiles are viewable by everyone." on public.profiles for select using (true);
create policy "Users can insert their own profile." on public.profiles for insert with check (auth.uid() = id);
create policy "Users can update own profile." on public.profiles for update using (auth.uid() = id);

alter table public.teams enable row level security;
create policy "Teams are viewable by everyone." on public.teams for select using (true);
create policy "Authenticated users can create teams." on public.teams for insert with check (auth.role() = 'authenticated');
create policy "Owners can update teams." on public.teams for update using (auth.uid() = owner_id);

-- (Repeat similar simple policies for others or leave off RLS for verify phase)
