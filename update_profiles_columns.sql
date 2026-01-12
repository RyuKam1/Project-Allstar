-- Add 'positions' column which was missing
alter table public.profiles 
add column if not exists positions text;

-- Ensure other stats columns exist (in case previous migrations weren't run)
alter table public.profiles 
add column if not exists height text,
add column if not exists weight text,
add column if not exists speed text,
add column if not exists vertical text;

-- Update the Supabase Schema Cache (sometimes needed)
notify pgrst, 'reload config';
