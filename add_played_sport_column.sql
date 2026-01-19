-- Add played_sport column to venue_reviews
ALTER TABLE public.venue_reviews 
ADD COLUMN IF NOT EXISTS played_sport text;

-- No check constraint needed as sports can vary, but UI will restrict loop values
