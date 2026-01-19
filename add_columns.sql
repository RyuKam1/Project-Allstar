-- Add the missing image columns to community_locations
ALTER TABLE public.community_locations ADD COLUMN IF NOT EXISTS banner_image_url text;
ALTER TABLE public.community_locations ADD COLUMN IF NOT EXISTS card_image_url text;

-- Ensure the constraint on location_edits covers these new types (safety check)
ALTER TABLE public.location_edits DROP CONSTRAINT IF EXISTS location_edits_edit_type_check;
ALTER TABLE public.location_edits ADD CONSTRAINT location_edits_edit_type_check 
  CHECK (edit_type IN ('name', 'description', 'sports', 'coordinates', 'banner_image_url', 'card_image_url'));
