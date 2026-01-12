-- FUNCTION: Handle New User
-- This function runs automatically whenever a new user signs up in auth.users
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
  );
  return new;
end;
$$ language plpgsql security definer;

-- TRIGGER: Connect the function to the event
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
