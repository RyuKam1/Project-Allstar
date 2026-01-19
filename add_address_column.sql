-- Add address column to community_locations
ALTER TABLE public.community_locations 
ADD COLUMN IF NOT EXISTS address text;

-- Drop verify constraint on location_edits (edit_type)
ALTER TABLE public.location_edits DROP CONSTRAINT IF EXISTS location_edits_edit_type_check;

-- Re-add constraint with 'address' allowed
ALTER TABLE public.location_edits ADD CONSTRAINT location_edits_edit_type_check 
  CHECK (edit_type IN ('name', 'description', 'sports', 'coordinates', 'banner_image_url', 'card_image_url', 'address'));
