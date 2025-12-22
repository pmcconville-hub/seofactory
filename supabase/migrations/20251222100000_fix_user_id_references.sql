-- Fix user_id references after database migration
-- When data is migrated between Supabase projects, user IDs change
-- This migration updates all user_id columns to match the current authenticated user

-- Create a function that can be called by authenticated users to claim their data
-- This is a one-time operation for migrated users

-- First, let's create a function to update user_id references
CREATE OR REPLACE FUNCTION public.claim_migrated_data()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_user_id UUID;
    projects_updated INT := 0;
    maps_updated INT := 0;
    topics_updated INT := 0;
    settings_updated INT := 0;
    briefs_updated INT := 0;
    jobs_updated INT := 0;
    audit_results_updated INT := 0;
    foundation_pages_updated INT := 0;
BEGIN
    -- Get the current authenticated user
    current_user_id := auth.uid();

    IF current_user_id IS NULL THEN
        RETURN json_build_object('error', 'Not authenticated');
    END IF;

    -- Update user_settings
    UPDATE public.user_settings
    SET user_id = current_user_id
    WHERE user_id IS NULL OR user_id != current_user_id;
    GET DIAGNOSTICS settings_updated = ROW_COUNT;

    -- Update projects
    UPDATE public.projects
    SET user_id = current_user_id
    WHERE user_id IS NULL OR user_id != current_user_id;
    GET DIAGNOSTICS projects_updated = ROW_COUNT;

    -- Update topical_maps
    UPDATE public.topical_maps
    SET user_id = current_user_id
    WHERE user_id IS NULL OR user_id != current_user_id;
    GET DIAGNOSTICS maps_updated = ROW_COUNT;

    -- Update topics (if they have user_id column)
    UPDATE public.topics
    SET user_id = current_user_id
    WHERE user_id IS NULL OR user_id != current_user_id;
    GET DIAGNOSTICS topics_updated = ROW_COUNT;

    -- Update content_briefs (if they have user_id column)
    UPDATE public.content_briefs
    SET user_id = current_user_id
    WHERE user_id IS NULL OR user_id != current_user_id;
    GET DIAGNOSTICS briefs_updated = ROW_COUNT;

    -- Update content_generation_jobs (if they have user_id column)
    BEGIN
        UPDATE public.content_generation_jobs
        SET user_id = current_user_id
        WHERE user_id IS NULL OR user_id != current_user_id;
        GET DIAGNOSTICS jobs_updated = ROW_COUNT;
    EXCEPTION WHEN undefined_column THEN
        jobs_updated := 0;
    END;

    -- Update linking_audit_results (if table exists)
    BEGIN
        UPDATE public.linking_audit_results
        SET user_id = current_user_id
        WHERE user_id IS NULL OR user_id != current_user_id;
        GET DIAGNOSTICS audit_results_updated = ROW_COUNT;
    EXCEPTION WHEN undefined_table THEN
        audit_results_updated := 0;
    END;

    -- Update foundation_pages (if table exists)
    BEGIN
        UPDATE public.foundation_pages
        SET user_id = current_user_id
        WHERE user_id IS NULL OR user_id != current_user_id;
        GET DIAGNOSTICS foundation_pages_updated = ROW_COUNT;
    EXCEPTION WHEN undefined_table THEN
        foundation_pages_updated := 0;
    END;

    RETURN json_build_object(
        'success', true,
        'user_id', current_user_id,
        'settings_updated', settings_updated,
        'projects_updated', projects_updated,
        'maps_updated', maps_updated,
        'topics_updated', topics_updated,
        'briefs_updated', briefs_updated,
        'jobs_updated', jobs_updated,
        'audit_results_updated', audit_results_updated,
        'foundation_pages_updated', foundation_pages_updated
    );
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.claim_migrated_data() TO authenticated;

-- Also add a more permissive RLS policy for content_briefs
-- This allows users to insert briefs if they own the topic OR if the topic has no map association
-- (which shouldn't happen but provides a fallback)

-- Drop existing insert policy
DROP POLICY IF EXISTS "Users can insert own briefs" ON public.content_briefs;

-- Create a more robust insert policy
CREATE POLICY "Users can insert own briefs" ON public.content_briefs
  FOR INSERT WITH CHECK (
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

-- Also update the update policy
DROP POLICY IF EXISTS "Users can update own briefs" ON public.content_briefs;

CREATE POLICY "Users can update own briefs" ON public.content_briefs
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.topics t
      JOIN public.topical_maps tm ON tm.id = t.map_id
      WHERE t.id = content_briefs.topic_id
      AND tm.user_id = auth.uid()
    )
    OR content_briefs.user_id = auth.uid()
  );

-- Add comment for documentation
COMMENT ON FUNCTION public.claim_migrated_data() IS
'Call this function after database migration to update user_id references.
Usage: SELECT public.claim_migrated_data();';
