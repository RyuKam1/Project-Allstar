-- Fix RLS policies for business_venues to allow creation and deletion
-- This fixes the "new row violates row-level security policy" error

-- 1. Allow authenticated users to INSERT if they are the owner
CREATE POLICY "Owners can create business venues" 
ON business_venues FOR INSERT 
WITH CHECK (auth.uid() = business_owner_id);

-- 2. Allow authenticated users to DELETE if they are the owner (needed for rollback)
CREATE POLICY "Owners can delete their own venue" 
ON business_venues FOR DELETE 
USING (auth.uid() = business_owner_id);

-- (Optional) Ensure Select is working (already exists but good to be safe)
-- CREATE POLICY "Public venues are viewable by everyone" ON business_venues FOR SELECT USING (true);
