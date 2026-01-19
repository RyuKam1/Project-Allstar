-- 1. Add image_url to posts
alter table public.community_posts
add column if not exists image_url text;

-- 2. Create Comments Table
create table if not exists public.community_comments (
  id uuid default uuid_generate_v4() primary key,
  post_id uuid references public.community_posts(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Enable RLS for Comments
alter table public.community_comments enable row level security;

create policy "Anyone can read comments" on public.community_comments for select using (true);
create policy "Auth users can comment" on public.community_comments for insert with check (auth.uid() = user_id);
create policy "Users can delete own comments" on public.community_comments for delete using (auth.uid() = user_id);

-- 4. Enable Realtime
-- Ensure the tables are in the publication
alter publication supabase_realtime add table community_comments;
-- We also want to track changes on post_likes for realtime counts
alter publication supabase_realtime add table post_likes;
