-- =====================================================
-- UPDATE REVIEWS TABLE FOR UNIFIED SYSTEM
-- =====================================================

-- 1. Add new columns to support UUIDs and types
ALTER TABLE public.venue_reviews 
ADD COLUMN IF NOT EXISTS location_id text,
ADD COLUMN IF NOT EXISTS location_type text CHECK (location_type IN ('community', 'business'));

-- 2. Migrate existing data (Legacy Business Venues)
UPDATE public.venue_reviews 
SET location_id = venue_id::text, 
    location_type = 'business' 
WHERE location_id IS NULL;

-- 3. Make old column nullable (and ensure new ones are required for new rows)
ALTER TABLE public.venue_reviews ALTER COLUMN venue_id DROP NOT NULL;
ALTER TABLE public.venue_reviews ALTER COLUMN location_id SET NOT NULL;
ALTER TABLE public.venue_reviews ALTER COLUMN location_type SET NOT NULL;

-- 4. Update Indexes
DROP INDEX IF EXISTS idx_venue_reviews_venue_id;
CREATE INDEX IF NOT EXISTS idx_reviews_location ON public.venue_reviews(location_id, location_type);

-- 5. Update RLS Policies to use new columns
-- We need to drop and recreate policies that might rely on venue_id if they existed, 
-- but the generic "select" policy was "using (true)" so it is fine.
-- The insert/update policies checked "user_id" so they are also fine.

-- 6. Update Functions
-- We will deprecate `calculate_review_weight` in favor of `calculate_user_location_weight` 
-- which is already defined in the community migration.

-- However, we need a new way to get weighted average that works for both
CREATE OR REPLACE FUNCTION public.get_location_average_rating(
  p_location_id text,
  p_location_type text
)
RETURNS numeric AS $$
DECLARE
  v_weighted_sum numeric := 0;
  v_total_weight numeric := 0;
  v_review record;
  v_weight numeric;
BEGIN
  FOR v_review IN 
    SELECT rating, user_id, char_length(comment) AS comment_length
    FROM public.venue_reviews
    WHERE location_id = p_location_id AND location_type = p_location_type
  LOOP
    -- Calculate weight using the centralized interaction service logic
    -- (We assume calculate_user_location_weight exists from previous migration)
    v_weight := calculate_user_location_weight(
      v_review.user_id, 
      p_location_id, 
      p_location_type
    );
    
    -- Bonus for detailed reviews
    IF v_review.comment_length > 100 THEN
      v_weight := v_weight * 1.3;
    END IF;
    
    v_weighted_sum := v_weighted_sum + (v_review.rating * v_weight);
    v_total_weight := v_total_weight + v_weight;
  END LOOP;

  IF v_total_weight = 0 THEN
    RETURN 0;
  END IF;

  RETURN round(v_weighted_sum / v_total_weight, 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
