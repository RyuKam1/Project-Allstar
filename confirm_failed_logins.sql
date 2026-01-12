-- CRITICAL: This script manually confirms ALL users.
-- Use this if you have disabled "Confirm Email" in settings but existing users are still stuck.

update auth.users
set email_confirmed_at = now()
where email_confirmed_at is null;

-- NOTE: This requires appropriate permissions. 
-- In the Supabase SQL Editor, this usually runs as the project owner (postgres) and will succeed.
