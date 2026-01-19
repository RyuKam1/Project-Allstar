-- =====================================================
-- VENUE REVIEW SYSTEM DATABASE SCHEMA
-- =====================================================
-- This migration creates tables for:
-- 1. venue_reviews - Store user reviews with ratings, comments, and images
-- 2. user_venue_interactions - Track user engagement for weighting algorithm
-- 3. RLS policies for secure access
-- 4. Indexes for performance
-- 5. Realtime subscriptions

-- =====================================================
-- 1. VENUE REVIEWS TABLE
-- =====================================================
create table if not exists public.venue_reviews (
  id uuid default uuid_generate_v4() primary key,
  venue_id integer not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  rating integer not null check (rating >= 1 and rating <= 5),
  comment text not null check (char_length(comment) >= 10),
  images text[], -- Array of image URLs/base64 strings
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Add index for fast venue lookups
create index if not exists idx_venue_reviews_venue_id on public.venue_reviews(venue_id);
create index if not exists idx_venue_reviews_user_id on public.venue_reviews(user_id);
create index if not exists idx_venue_reviews_created_at on public.venue_reviews(created_at desc);

-- =====================================================
-- 2. USER VENUE INTERACTIONS TABLE
-- =====================================================
-- Tracks user engagement for weighting algorithm
create table if not exists public.user_venue_interactions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  venue_id integer not null,
  interaction_type text not null check (interaction_type in ('page_view', 'booking', 'image_upload')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Add indexes for weight calculation queries
create index if not exists idx_interactions_user_venue on public.user_venue_interactions(user_id, venue_id);
create index if not exists idx_interactions_type on public.user_venue_interactions(interaction_type);

-- =====================================================
-- 3. ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on venue_reviews
alter table public.venue_reviews enable row level security;

-- Anyone can read reviews
create policy "Anyone can read venue reviews" 
  on public.venue_reviews 
  for select 
  using (true);

-- Authenticated users can create reviews
create policy "Authenticated users can create reviews" 
  on public.venue_reviews 
  for insert 
  with check (auth.uid() = user_id);

-- Users can update their own reviews
create policy "Users can update own reviews" 
  on public.venue_reviews 
  for update 
  using (auth.uid() = user_id);

-- Users can delete their own reviews
create policy "Users can delete own reviews" 
  on public.venue_reviews 
  for delete 
  using (auth.uid() = user_id);

-- Enable RLS on user_venue_interactions
alter table public.user_venue_interactions enable row level security;

-- Anyone can read interactions (needed for weight calculation)
create policy "Anyone can read interactions" 
  on public.user_venue_interactions 
  for select 
  using (true);

-- Authenticated users can create their own interactions
create policy "Users can create own interactions" 
  on public.user_venue_interactions 
  for insert 
  with check (auth.uid() = user_id);

-- =====================================================
-- 4. REVIEW REPORTS TABLE (for moderation)
-- =====================================================
create table if not exists public.review_reports (
  id uuid default uuid_generate_v4() primary key,
  review_id uuid references public.venue_reviews(id) on delete cascade not null,
  reporter_id uuid references public.profiles(id) on delete cascade not null,
  reason text not null,
  status text default 'pending' check (status in ('pending', 'reviewed', 'dismissed')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on review_reports
alter table public.review_reports enable row level security;

-- Authenticated users can report reviews
create policy "Authenticated users can report reviews" 
  on public.review_reports 
  for insert 
  with check (auth.uid() = reporter_id);

-- Only admins can read reports (we'll handle this in the API layer)
create policy "Anyone can read their own reports" 
  on public.review_reports 
  for select 
  using (auth.uid() = reporter_id);

-- =====================================================
-- 5. ENABLE REALTIME SUBSCRIPTIONS
-- =====================================================
-- Enable realtime updates for reviews
alter publication supabase_realtime add table venue_reviews;
alter publication supabase_realtime add table user_venue_interactions;

-- =====================================================
-- 6. HELPER FUNCTION: Calculate Review Weight
-- =====================================================
-- This function calculates the weight multiplier for a review
-- based on user's interaction history with the venue
create or replace function public.calculate_review_weight(
  p_user_id uuid,
  p_venue_id integer,
  p_comment_length integer
)
returns numeric as $$
declare
  v_weight numeric := 1.0;
  v_booking_count integer;
  v_page_view_count integer;
  v_image_upload_count integer;
begin
  -- Count bookings (weight: 3x)
  select count(*) into v_booking_count
  from public.user_venue_interactions
  where user_id = p_user_id 
    and venue_id = p_venue_id 
    and interaction_type = 'booking';
  
  if v_booking_count > 0 then
    v_weight := v_weight * 3.0;
  end if;

  -- Count page views (weight: 1.5x if 3+ visits)
  select count(*) into v_page_view_count
  from public.user_venue_interactions
  where user_id = p_user_id 
    and venue_id = p_venue_id 
    and interaction_type = 'page_view';
  
  if v_page_view_count >= 3 then
    v_weight := v_weight * 1.5;
  end if;

  -- Count image uploads (weight: 2x)
  select count(*) into v_image_upload_count
  from public.user_venue_interactions
  where user_id = p_user_id 
    and venue_id = p_venue_id 
    and interaction_type = 'image_upload';
  
  if v_image_upload_count > 0 then
    v_weight := v_weight * 2.0;
  end if;

  -- Detailed review bonus (weight: 1.3x if >100 characters)
  if p_comment_length > 100 then
    v_weight := v_weight * 1.3;
  end if;

  return v_weight;
end;
$$ language plpgsql security definer;

-- =====================================================
-- 7. HELPER FUNCTION: Get Weighted Average Rating
-- =====================================================
-- Calculates the weighted average rating for a venue
create or replace function public.get_weighted_average_rating(p_venue_id integer)
returns numeric as $$
declare
  v_weighted_sum numeric := 0;
  v_total_weight numeric := 0;
  v_review record;
  v_weight numeric;
begin
  for v_review in 
    select rating, user_id, char_length(comment) as comment_length
    from public.venue_reviews
    where venue_id = p_venue_id
  loop
    v_weight := calculate_review_weight(
      v_review.user_id, 
      p_venue_id, 
      v_review.comment_length
    );
    
    v_weighted_sum := v_weighted_sum + (v_review.rating * v_weight);
    v_total_weight := v_total_weight + v_weight;
  end loop;

  if v_total_weight = 0 then
    return 0;
  end if;

  return round(v_weighted_sum / v_total_weight, 1);
end;
$$ language plpgsql security definer;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- To apply this migration:
-- 1. Copy this SQL
-- 2. Go to Supabase Dashboard > SQL Editor
-- 3. Paste and run the query
-- 4. Verify tables exist in Table Editor
