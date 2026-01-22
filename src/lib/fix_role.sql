-- Replace 'YOUR_EMAIL_HERE' with your actual email
update public.profiles
set role = 'business'
where email = 'YOUR_EMAIL_HERE';

-- Verification
select * from public.profiles where email = 'YOUR_EMAIL_HERE';
