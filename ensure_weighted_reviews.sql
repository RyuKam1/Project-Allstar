-- Ensure the weighted average function exists
-- This function calculates rating based on user reputation weight

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
