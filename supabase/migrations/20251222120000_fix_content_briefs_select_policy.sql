-- Fix content_briefs SELECT policy to be consistent with UPDATE policy
-- The UPDATE policy allows access if content_briefs.user_id = auth.uid()
-- But the SELECT policy didn't have this fallback, causing verification to fail
-- after successful updates

-- Drop existing select policy
DROP POLICY IF EXISTS "Users can view own briefs" ON public.content_briefs;

-- Create consistent select policy with user_id fallback
CREATE POLICY "Users can view own briefs" ON public.content_briefs
  FOR SELECT USING (
    -- Either the topic belongs to a map owned by the user
    EXISTS (
      SELECT 1 FROM public.topics t
      JOIN public.topical_maps tm ON tm.id = t.map_id
      WHERE t.id = content_briefs.topic_id
      AND tm.user_id = auth.uid()
    )
    -- Or the user_id on the brief matches the authenticated user
    OR content_briefs.user_id = auth.uid()
  );

-- Also update DELETE policy for consistency
DROP POLICY IF EXISTS "Users can delete own briefs" ON public.content_briefs;

CREATE POLICY "Users can delete own briefs" ON public.content_briefs
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.topics t
      JOIN public.topical_maps tm ON tm.id = t.map_id
      WHERE t.id = content_briefs.topic_id
      AND tm.user_id = auth.uid()
    )
    OR content_briefs.user_id = auth.uid()
  );

-- Add comment for documentation
COMMENT ON POLICY "Users can view own briefs" ON public.content_briefs IS
'Allows viewing briefs if user owns the topic''s map OR if user_id on brief matches authenticated user';
