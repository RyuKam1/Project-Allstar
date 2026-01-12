-- 1. BACKFILL MISSING PROFILES
-- This will create a profile for any user that signed up but failed to get a profile row
insert into public.profiles (id, email, name, avatar, bio, sport)
select 
  id, 
  email, 
  coalesce(raw_user_meta_data->>'name', 'User'), -- Fallback name
  'https://ui-avatars.com/api/?name=' || coalesce(raw_user_meta_data->>'name', 'User') || '&background=random',
  'Ready to play!', 
  'Any'
from auth.users
where id not in (select id from public.profiles);

-- 2. ENSURE TRIGGER IS ACTIVE (Re-run of previous instruction)
-- Function
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, name, avatar, bio, sport)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', 'New User'),
    'https://ui-avatars.com/api/?name=' || coalesce(new.raw_user_meta_data->>'name', 'New+User') || '&background=6366f1&color=fff',
    'Ready to play!',
    'Any'
  )
  on conflict (id) do nothing; -- Prevent error if profile exists
  return new;
end;
$$ language plpgsql security definer;

-- Trigger
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
