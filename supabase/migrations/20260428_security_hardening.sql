-- Project AllStar security hardening baseline
-- Apply in Supabase SQL editor or migration runner.

-- 1) Helper function: trusted admin check from profiles table
create or replace function public.is_admin(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = p_user_id
      and p.role = 'admin'
  );
$$;

revoke all on function public.is_admin(uuid) from public;
grant execute on function public.is_admin(uuid) to authenticated;

-- 2) Ensure RLS is enabled on critical tables
create table if not exists public.admin_audit_logs (
  id bigint generated always as identity primary key,
  action text not null,
  actor_id uuid not null,
  target_type text,
  target_id text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_admin_audit_logs_actor_id on public.admin_audit_logs(actor_id);
create index if not exists idx_admin_audit_logs_created_at on public.admin_audit_logs(created_at desc);

alter table if exists public.profiles enable row level security;
alter table if exists public.venues enable row level security;
alter table if exists public.community_locations enable row level security;
alter table if exists public.claim_requests enable row level security;
alter table if exists public.location_edits enable row level security;
alter table if exists public.location_images enable row level security;
alter table if exists public.teams enable row level security;
alter table if exists public.team_members enable row level security;
alter table if exists public.team_requests enable row level security;
alter table if exists public.tournaments enable row level security;
alter table if exists public.matches enable row level security;
alter table if exists public.venue_reviews enable row level security;
alter table if exists public.play_intents enable row level security;
alter table if exists public.community_posts enable row level security;
alter table if exists public.community_comments enable row level security;
alter table if exists public.post_likes enable row level security;
alter table if exists public.admin_audit_logs enable row level security;

-- 3) Drop conflicting broad policies (safe if they do not exist)
drop policy if exists "profiles_public_read" on public.profiles;
drop policy if exists "profiles_self_update" on public.profiles;
drop policy if exists "profiles_admin_manage" on public.profiles;

drop policy if exists "venues_public_read" on public.venues;
drop policy if exists "venues_owner_write" on public.venues;
drop policy if exists "venues_admin_manage" on public.venues;

drop policy if exists "community_locations_public_read" on public.community_locations;
drop policy if exists "community_locations_owner_write" on public.community_locations;
drop policy if exists "community_locations_admin_manage" on public.community_locations;

drop policy if exists "claim_requests_owner_read" on public.claim_requests;
drop policy if exists "claim_requests_owner_create" on public.claim_requests;
drop policy if exists "claim_requests_admin_manage" on public.claim_requests;

drop policy if exists "location_edits_read" on public.location_edits;
drop policy if exists "location_edits_create" on public.location_edits;
drop policy if exists "location_edits_owner_manage" on public.location_edits;
drop policy if exists "location_edits_admin_manage" on public.location_edits;

drop policy if exists "location_images_read" on public.location_images;
drop policy if exists "location_images_owner_create" on public.location_images;
drop policy if exists "location_images_owner_delete" on public.location_images;
drop policy if exists "location_images_admin_manage" on public.location_images;

drop policy if exists "teams_public_read" on public.teams;
drop policy if exists "teams_owner_write" on public.teams;
drop policy if exists "teams_admin_manage" on public.teams;

drop policy if exists "team_members_read" on public.team_members;
drop policy if exists "team_members_team_owner_manage" on public.team_members;
drop policy if exists "team_members_self_join" on public.team_members;
drop policy if exists "team_members_self_leave" on public.team_members;
drop policy if exists "team_members_admin_manage" on public.team_members;

drop policy if exists "team_requests_read" on public.team_requests;
drop policy if exists "team_requests_self_create" on public.team_requests;
drop policy if exists "team_requests_team_owner_manage" on public.team_requests;
drop policy if exists "team_requests_admin_manage" on public.team_requests;

drop policy if exists "tournaments_public_read" on public.tournaments;
drop policy if exists "tournaments_creator_write" on public.tournaments;
drop policy if exists "tournaments_admin_manage" on public.tournaments;

drop policy if exists "matches_public_read" on public.matches;
drop policy if exists "matches_tournament_creator_write" on public.matches;
drop policy if exists "matches_admin_manage" on public.matches;

drop policy if exists "venue_reviews_public_read" on public.venue_reviews;
drop policy if exists "venue_reviews_self_write" on public.venue_reviews;
drop policy if exists "venue_reviews_admin_manage" on public.venue_reviews;

drop policy if exists "play_intents_public_read_active" on public.play_intents;
drop policy if exists "play_intents_self_write" on public.play_intents;
drop policy if exists "play_intents_admin_manage" on public.play_intents;

drop policy if exists "community_posts_public_read" on public.community_posts;
drop policy if exists "community_posts_self_write" on public.community_posts;
drop policy if exists "community_posts_admin_manage" on public.community_posts;

drop policy if exists "community_comments_public_read" on public.community_comments;
drop policy if exists "community_comments_self_write" on public.community_comments;
drop policy if exists "community_comments_admin_manage" on public.community_comments;

drop policy if exists "post_likes_public_read" on public.post_likes;
drop policy if exists "post_likes_self_write" on public.post_likes;
drop policy if exists "post_likes_admin_manage" on public.post_likes;
drop policy if exists "admin_audit_logs_admin_only" on public.admin_audit_logs;

-- 4) Profiles
create policy "profiles_public_read"
on public.profiles for select
to anon, authenticated
using (true);

create policy "profiles_self_update"
on public.profiles for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid() and role = (select p.role from public.profiles p where p.id = auth.uid()));

create policy "profiles_admin_manage"
on public.profiles for all
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

-- 5) Venues
create policy "venues_public_read"
on public.venues for select
to anon, authenticated
using (true);

create policy "venues_owner_write"
on public.venues for all
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

create policy "venues_admin_manage"
on public.venues for all
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

-- 6) Community locations
create policy "community_locations_public_read"
on public.community_locations for select
to anon, authenticated
using (status = 'active' or public.is_admin(auth.uid()) or created_by = auth.uid());

create policy "community_locations_owner_write"
on public.community_locations for all
to authenticated
using (created_by = auth.uid())
with check (created_by = auth.uid());

create policy "community_locations_admin_manage"
on public.community_locations for all
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

-- 7) Claim requests
create policy "claim_requests_owner_read"
on public.claim_requests for select
to authenticated
using (requester_id = auth.uid() or public.is_admin(auth.uid()));

create policy "claim_requests_owner_create"
on public.claim_requests for insert
to authenticated
with check (requester_id = auth.uid() and status = 'pending');

create policy "claim_requests_admin_manage"
on public.claim_requests for update
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

-- 8) Location edits and images
create policy "location_edits_read"
on public.location_edits for select
to authenticated
using (
  user_id = auth.uid()
  or public.is_admin(auth.uid())
  or exists (
    select 1 from public.community_locations c
    where c.id = location_edits.location_id
      and c.created_by = auth.uid()
  )
);

create policy "location_edits_create"
on public.location_edits for insert
to authenticated
with check (user_id = auth.uid());

create policy "location_edits_owner_manage"
on public.location_edits for update
to authenticated
using (
  exists (
    select 1 from public.community_locations c
    where c.id = location_edits.location_id
      and c.created_by = auth.uid()
  )
)
with check (true);

create policy "location_edits_admin_manage"
on public.location_edits for all
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

create policy "location_images_read"
on public.location_images for select
to anon, authenticated
using (true);

create policy "location_images_owner_create"
on public.location_images for insert
to authenticated
with check (uploaded_by = auth.uid());

create policy "location_images_owner_delete"
on public.location_images for delete
to authenticated
using (uploaded_by = auth.uid() or public.is_admin(auth.uid()));

-- 9) Teams and tournaments ecosystem
create policy "teams_public_read"
on public.teams for select
to anon, authenticated
using (true);

create policy "teams_owner_write"
on public.teams for all
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

create policy "teams_admin_manage"
on public.teams for all
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

create policy "team_members_read"
on public.team_members for select
to anon, authenticated
using (true);

create policy "team_members_self_join"
on public.team_members for insert
to authenticated
with check (user_id = auth.uid());

create policy "team_members_self_leave"
on public.team_members for delete
to authenticated
using (user_id = auth.uid() or public.is_admin(auth.uid()));

create policy "team_members_team_owner_manage"
on public.team_members for all
to authenticated
using (
  exists (
    select 1 from public.teams t
    where t.id = team_members.team_id
      and t.owner_id = auth.uid()
  ) or public.is_admin(auth.uid())
)
with check (true);

create policy "team_requests_read"
on public.team_requests for select
to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1 from public.teams t
    where t.id = team_requests.team_id
      and t.owner_id = auth.uid()
  ) or public.is_admin(auth.uid())
);

create policy "team_requests_self_create"
on public.team_requests for insert
to authenticated
with check (user_id = auth.uid());

create policy "team_requests_team_owner_manage"
on public.team_requests for all
to authenticated
using (
  exists (
    select 1 from public.teams t
    where t.id = team_requests.team_id
      and t.owner_id = auth.uid()
  ) or public.is_admin(auth.uid())
)
with check (true);

create policy "tournaments_public_read"
on public.tournaments for select
to anon, authenticated
using (true);

create policy "tournaments_creator_write"
on public.tournaments for all
to authenticated
using (creator_id = auth.uid())
with check (creator_id = auth.uid());

create policy "tournaments_admin_manage"
on public.tournaments for all
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

create policy "matches_public_read"
on public.matches for select
to anon, authenticated
using (true);

create policy "matches_tournament_creator_write"
on public.matches for all
to authenticated
using (
  exists (
    select 1 from public.tournaments t
    where t.id = matches.tournament_id
      and t.creator_id = auth.uid()
  ) or public.is_admin(auth.uid())
)
with check (true);

-- 10) Social/reviews/intents
create policy "venue_reviews_public_read"
on public.venue_reviews for select
to anon, authenticated
using (true);

create policy "venue_reviews_self_write"
on public.venue_reviews for all
to authenticated
using (user_id = auth.uid() or public.is_admin(auth.uid()))
with check (user_id = auth.uid() or public.is_admin(auth.uid()));

create policy "play_intents_public_read_active"
on public.play_intents for select
to anon, authenticated
using (expires_at > now() or user_id = auth.uid() or public.is_admin(auth.uid()));

create policy "play_intents_self_write"
on public.play_intents for all
to authenticated
using (user_id = auth.uid() or public.is_admin(auth.uid()))
with check (user_id = auth.uid() or public.is_admin(auth.uid()));

create policy "community_posts_public_read"
on public.community_posts for select
to anon, authenticated
using (true);

create policy "community_posts_self_write"
on public.community_posts for all
to authenticated
using (user_id = auth.uid() or public.is_admin(auth.uid()))
with check (user_id = auth.uid() or public.is_admin(auth.uid()));

create policy "community_comments_public_read"
on public.community_comments for select
to anon, authenticated
using (true);

create policy "community_comments_self_write"
on public.community_comments for all
to authenticated
using (user_id = auth.uid() or public.is_admin(auth.uid()))
with check (user_id = auth.uid() or public.is_admin(auth.uid()));

create policy "post_likes_public_read"
on public.post_likes for select
to anon, authenticated
using (true);

create policy "post_likes_self_write"
on public.post_likes for all
to authenticated
using (user_id = auth.uid() or public.is_admin(auth.uid()))
with check (user_id = auth.uid() or public.is_admin(auth.uid()));

create policy "admin_audit_logs_admin_only"
on public.admin_audit_logs for all
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));
