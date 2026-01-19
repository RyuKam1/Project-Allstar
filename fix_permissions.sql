-- Allow location owners to update the status of edits (Approve/Reject)
-- This was missing, preventing any action on pending edits.

CREATE POLICY "Location owners can process edits" 
ON public.location_edits 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.community_locations
    WHERE id = location_edits.location_id
    AND created_by = auth.uid()
  )
);
