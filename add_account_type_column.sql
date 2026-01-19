-- 1. Add account_type column
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS account_type text DEFAULT 'player' CHECK (account_type IN ('player', 'business'));

-- 2. Update the handle_new_user function to read from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, avatar, bio, sport, account_type)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'name', 'New User'),
    'https://ui-avatars.com/api/?name=' || COALESCE(new.raw_user_meta_data->>'name', 'New+User') || '&background=6366f1&color=fff',
    'Ready to play!',
    'Any',
    COALESCE(new.raw_user_meta_data->>'account_type', 'player') -- Read from metadata
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Backfill existing nulls (just in case)
UPDATE public.profiles SET account_type = 'player' WHERE account_type IS NULL;
