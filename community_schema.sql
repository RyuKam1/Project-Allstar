-- 1. POSTS TABLE
create table if not exists public.community_posts (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  content text not null,
  type text default 'General', -- 'General', 'Win', 'Recruitment'
  likes_count integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. LIKES TABLE (Prevent double likes)
create table if not exists public.post_likes (
  post_id uuid references public.community_posts(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  primary key (post_id, user_id)
);

-- 3. ENABLE REALTIME
-- Needed for the frontend to "smoothly update"
alter publication supabase_realtime add table community_posts;

-- 4. RLS POLICIES
alter table public.community_posts enable row level security;
alter table public.post_likes enable row level security;

-- Posts: Public Read, Auth Insert
create policy "Anyone can read posts" on public.community_posts for select using (true);
create policy "Auth users can post" on public.community_posts for insert with check (auth.uid() = user_id);
create policy "Users can delete own posts" on public.community_posts for delete using (auth.uid() = user_id);

-- Likes: Public Read, Auth Insert/Delete
create policy "Anyone can read likes" on public.post_likes for select using (true);
create policy "Auth users can like" on public.post_likes for insert with check (auth.uid() = user_id);
create policy "Auth users can unlike" on public.post_likes for delete using (auth.uid() = user_id);

-- 5. RATE LIMITING TRIGGER
-- Function to check last post time
create or replace function public.check_post_rate_limit()
returns trigger as $$
declare
  last_post_time timestamp;
begin
  select created_at into last_post_time
  from public.community_posts
  where user_id = new.user_id
  order by created_at desc
  limit 1;

  if last_post_time is not null and (extract(epoch from (now() - last_post_time)) < 15) then
    raise exception 'You are posting too fast. Please wait 15 seconds.';
  end if;

  return new;
end;
$$ language plpgsql;

-- Trigger
drop trigger if exists enforce_rate_limit on public.community_posts;
create trigger enforce_rate_limit
  before insert on public.community_posts
  for each row execute procedure public.check_post_rate_limit();
