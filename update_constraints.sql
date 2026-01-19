-- Drop the old constraint
ALTER TABLE public.location_edits DROP CONSTRAINT IF EXISTS location_edits_edit_type_check;

-- Add the new constraint with banner_image_url and card_image_url allowed
ALTER TABLE public.location_edits ADD CONSTRAINT location_edits_edit_type_check 
  CHECK (edit_type IN ('name', 'description', 'sports', 'coordinates', 'banner_image_url', 'card_image_url'));
