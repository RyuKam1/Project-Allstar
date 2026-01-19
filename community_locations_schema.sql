-- =====================================================
-- COMMUNITY LOCATIONS & PLAY INTENT SYSTEM
-- =====================================================
-- This migration creates tables for:
-- 1. Community-added locations (user-driven, reputation-based)
-- 2. Business venue extensions (verified, configurable)
-- 3. Play intent system (social momentum, not bookings)
-- 4. Weighted interaction tracking
-- 5. Community edit history

-- =====================================================
-- 1. COMMUNITY LOCATIONS TABLE
-- =====================================================
create table if not exists public.community_locations (
  id uuid default uuid_generate_v4() primary key,
  name text not null check (char_length(name) >= 3 and char_length(name) <= 100),
  description text check (char_length(description) <= 500),
  lat numeric(10, 7) not null,
  lng numeric(10, 7) not null,
  sports text[] not null default '{}', -- Array of sport types
  created_by uuid references public.profiles(id) on delete set null,
  status text default 'active' check (status in ('active', 'flagged', 'removed')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Add spatial index for location queries
create index if not exists idx_community_locations_coords on public.community_locations(lat, lng);
create index if not exists idx_community_locations_created_by on public.community_locations(created_by);
create index if not exists idx_community_locations_status on public.community_locations(status);

-- =====================================================
-- 2. LOCATION IMAGES TABLE (for community locations)
-- =====================================================
create table if not exists public.location_images (
  id uuid default uuid_generate_v4() primary key,
  location_id uuid references public.community_locations(id) on delete cascade not null,
  image_url text not null,
  uploaded_by uuid references public.profiles(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_location_images_location on public.location_images(location_id);

-- =====================================================
-- 3. BUSINESS VENUES TABLE (extends existing venues)
-- =====================================================
create table if not exists public.business_venues (
  id uuid default uuid_generate_v4() primary key,
  venue_id integer not null unique, -- References static venues.id
  business_id uuid references public.profiles(id) on delete cascade,
  claimed_at timestamp with time zone,
  verified boolean default false,
  operating_hours jsonb, -- {monday: {open: "09:00", close: "21:00"}, ...}
  booking_config jsonb, -- {method: "external|internal|contact|disabled", url: "...", phone: "..."}
  custom_rules text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_business_venues_venue_id on public.business_venues(venue_id);
create index if not exists idx_business_venues_business_id on public.business_venues(business_id);

-- =====================================================
-- 4. PLAY INTENTS TABLE (Core social momentum feature)
-- =====================================================
create table if not exists public.play_intents (
  id uuid default uuid_generate_v4() primary key,
  location_id text not null, -- Can be community UUID or venue integer (stored as text)
  location_type text not null check (location_type in ('community', 'business')),
  user_id uuid references public.profiles(id) on delete cascade not null,
  intent_time timestamp with time zone not null,
  sport text,
  skill_level text check (skill_level in ('beginner', 'intermediate', 'advanced', 'any')),
  note text check (char_length(note) <= 200),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  expires_at timestamp with time zone not null -- Auto-set to intent_time + 2 hours
);

-- Indexes for fast queries
create index if not exists idx_play_intents_location on public.play_intents(location_id, location_type);
create index if not exists idx_play_intents_user on public.play_intents(user_id);
create index if not exists idx_play_intents_time on public.play_intents(intent_time);
create index if not exists idx_play_intents_expires on public.play_intents(expires_at);

-- =====================================================
-- 5. LOCATION INTERACTIONS TABLE (Weighted tracking)
-- =====================================================
create table if not exists public.location_interactions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  location_id text not null,
  location_type text not null check (location_type in ('community', 'business')),
  interaction_type text not null check (interaction_type in ('visit', 'play_intent', 'image_upload', 'edit', 'review')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_location_interactions_user_location on public.location_interactions(user_id, location_id, location_type);
create index if not exists idx_location_interactions_type on public.location_interactions(interaction_type);

-- =====================================================
-- 6. LOCATION EDITS TABLE (Community edit history)
-- =====================================================
create table if not exists public.location_edits (
  id uuid default uuid_generate_v4() primary key,
  location_id uuid references public.community_locations(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  edit_type text not null check (edit_type in ('name', 'description', 'sports', 'coordinates')),
  old_value text,
  new_value text not null,
  weight numeric default 1.0, -- User's credibility weight at time of edit
  status text default 'pending' check (status in ('pending', 'applied', 'rejected')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  applied_at timestamp with time zone
);

create index if not exists idx_location_edits_location on public.location_edits(location_id);
create index if not exists idx_location_edits_status on public.location_edits(status);

-- =====================================================
-- 7. ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Community Locations
alter table public.community_locations enable row level security;

create policy "Anyone can read active community locations" 
  on public.community_locations 
  for select 
  using (status = 'active');

create policy "Authenticated users can create community locations" 
  on public.community_locations 
  for insert 
  with check (auth.uid() = created_by);

create policy "Creators can update their own locations" 
  on public.community_locations 
  for update 
  using (auth.uid() = created_by);

-- Location Images
alter table public.location_images enable row level security;

create policy "Anyone can read location images" 
  on public.location_images 
  for select 
  using (true);

create policy "Authenticated users can upload images" 
  on public.location_images 
  for insert 
  with check (auth.uid() = uploaded_by);

-- Business Venues
alter table public.business_venues enable row level security;

create policy "Anyone can read business venues" 
  on public.business_venues 
  for select 
  using (true);

create policy "Business owners can manage their venues" 
  on public.business_venues 
  for all 
  using (auth.uid() = business_id);

-- Play Intents
alter table public.play_intents enable row level security;

create policy "Anyone can read non-expired play intents" 
  on public.play_intents 
  for select 
  using (expires_at > now());

create policy "Authenticated users can create play intents" 
  on public.play_intents 
  for insert 
  with check (auth.uid() = user_id);

create policy "Users can delete their own play intents" 
  on public.play_intents 
  for delete 
  using (auth.uid() = user_id);

-- Location Interactions
alter table public.location_interactions enable row level security;

create policy "Anyone can read interactions" 
  on public.location_interactions 
  for select 
  using (true);

create policy "Authenticated users can create interactions" 
  on public.location_interactions 
  for insert 
  with check (auth.uid() = user_id);

-- Location Edits
alter table public.location_edits enable row level security;

create policy "Anyone can read location edits" 
  on public.location_edits 
  for select 
  using (true);

create policy "Authenticated users can submit edits" 
  on public.location_edits 
  for insert 
  with check (auth.uid() = user_id);

-- =====================================================
-- 8. HELPER FUNCTIONS
-- =====================================================

-- Calculate user's credibility weight for a specific location
create or replace function public.calculate_user_location_weight(
  p_user_id uuid,
  p_location_id text,
  p_location_type text
)
returns numeric as $$
declare
  v_weight numeric := 1.0;
  v_play_intent_count integer;
  v_visit_count integer;
  v_image_count integer;
  v_days_since_first integer;
begin
  -- Count play intents (shows actual presence)
  select count(*) into v_play_intent_count
  from public.location_interactions
  where user_id = p_user_id 
    and location_id = p_location_id 
    and location_type = p_location_type
    and interaction_type = 'play_intent';
  
  if v_play_intent_count >= 5 then
    v_weight := v_weight * 2.0;
  elsif v_play_intent_count >= 2 then
    v_weight := v_weight * 1.5;
  end if;

  -- Count visits (engagement)
  select count(*) into v_visit_count
  from public.location_interactions
  where user_id = p_user_id 
    and location_id = p_location_id 
    and location_type = p_location_type
    and interaction_type = 'visit';
  
  if v_visit_count >= 10 then
    v_weight := v_weight * 1.5;
  end if;

  -- Count image uploads (contribution)
  select count(*) into v_image_count
  from public.location_interactions
  where user_id = p_user_id 
    and location_id = p_location_id 
    and location_type = p_location_type
    and interaction_type = 'image_upload';
  
  if v_image_count >= 3 then
    v_weight := v_weight * 1.8;
  end if;

  -- Time consistency (regular visitor)
  select extract(day from now() - min(created_at))::integer into v_days_since_first
  from public.location_interactions
  where user_id = p_user_id 
    and location_id = p_location_id 
    and location_type = p_location_type;
  
  if v_days_since_first >= 30 then
    v_weight := v_weight * 1.3;
  end if;

  return v_weight;
end;
$$ language plpgsql security definer;

-- Get active (non-expired) play intents for a location
create or replace function public.get_active_play_intents(
  p_location_id text,
  p_location_type text
)
returns table (
  id uuid,
  user_id uuid,
  intent_time timestamp with time zone,
  sport text,
  skill_level text,
  note text,
  user_name text,
  user_avatar text
) as $$
begin
  return query
  select 
    pi.id,
    pi.user_id,
    pi.intent_time,
    pi.sport,
    pi.skill_level,
    pi.note,
    p.name as user_name,
    p.avatar as user_avatar
  from public.play_intents pi
  join public.profiles p on pi.user_id = p.id
  where pi.location_id = p_location_id
    and pi.location_type = p_location_type
    and pi.expires_at > now()
  order by pi.intent_time asc;
end;
$$ language plpgsql security definer;

-- Auto-cleanup expired play intents (run via cron or trigger)
create or replace function public.cleanup_expired_play_intents()
returns void as $$
begin
  delete from public.play_intents
  where expires_at < now();
end;
$$ language plpgsql security definer;

-- Trigger to auto-set expires_at when creating play intent
create or replace function public.set_play_intent_expiry()
returns trigger as $$
begin
  new.expires_at := new.intent_time + interval '2 hours';
  return new;
end;
$$ language plpgsql;

create trigger set_play_intent_expiry_trigger
  before insert on public.play_intents
  for each row
  execute function public.set_play_intent_expiry();

-- =====================================================
-- 9. ENABLE REALTIME SUBSCRIPTIONS
-- =====================================================
alter publication supabase_realtime add table community_locations;
alter publication supabase_realtime add table play_intents;
alter publication supabase_realtime add table location_images;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- To apply this migration:
-- 1. Copy this SQL
-- 2. Go to Supabase Dashboard > SQL Editor
-- 3. Paste and run the query
-- 4. Verify tables exist in Table Editor
