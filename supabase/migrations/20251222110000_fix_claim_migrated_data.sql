-- Fix the claim_migrated_data function
-- The original function had a bug: it would claim ALL data where user_id != current_user_id
-- This caused the last user to log in to own all data
--
-- The fix: Only claim data where user_id IS NULL (truly orphaned/migrated data)
-- Data that already has a user_id should not be re-assigned

-- Drop the old function and recreate with the fix
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

    -- FIXED: Only claim data where user_id IS NULL (orphaned/migrated data)
    -- Do NOT claim data that already belongs to another user

    -- Update user_settings - only where user_id is NULL
    UPDATE public.user_settings
    SET user_id = current_user_id
    WHERE user_id IS NULL;
    GET DIAGNOSTICS settings_updated = ROW_COUNT;

    -- Update projects - only where user_id is NULL
    UPDATE public.projects
    SET user_id = current_user_id
    WHERE user_id IS NULL;
    GET DIAGNOSTICS projects_updated = ROW_COUNT;

    -- Update topical_maps - only where user_id is NULL
    UPDATE public.topical_maps
    SET user_id = current_user_id
    WHERE user_id IS NULL;
    GET DIAGNOSTICS maps_updated = ROW_COUNT;

    -- Update topics - only where user_id is NULL (if column exists)
    BEGIN
        UPDATE public.topics
        SET user_id = current_user_id
        WHERE user_id IS NULL;
        GET DIAGNOSTICS topics_updated = ROW_COUNT;
    EXCEPTION WHEN undefined_column THEN
        topics_updated := 0;
    END;

    -- Update content_briefs - only where user_id is NULL (if column exists)
    BEGIN
        UPDATE public.content_briefs
        SET user_id = current_user_id
        WHERE user_id IS NULL;
        GET DIAGNOSTICS briefs_updated = ROW_COUNT;
    EXCEPTION WHEN undefined_column THEN
        briefs_updated := 0;
    END;

    -- Update content_generation_jobs - only where user_id is NULL (if column exists)
    BEGIN
        UPDATE public.content_generation_jobs
        SET user_id = current_user_id
        WHERE user_id IS NULL;
        GET DIAGNOSTICS jobs_updated = ROW_COUNT;
    EXCEPTION WHEN undefined_column THEN
        jobs_updated := 0;
    END;

    -- Update linking_audit_results - only where user_id is NULL (if table/column exists)
    BEGIN
        UPDATE public.linking_audit_results
        SET user_id = current_user_id
        WHERE user_id IS NULL;
        GET DIAGNOSTICS audit_results_updated = ROW_COUNT;
    EXCEPTION WHEN undefined_table OR undefined_column THEN
        audit_results_updated := 0;
    END;

    -- Update foundation_pages - only where user_id is NULL (if table/column exists)
    BEGIN
        UPDATE public.foundation_pages
        SET user_id = current_user_id
        WHERE user_id IS NULL;
        GET DIAGNOSTICS foundation_pages_updated = ROW_COUNT;
    EXCEPTION WHEN undefined_table OR undefined_column THEN
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

-- Update the comment
COMMENT ON FUNCTION public.claim_migrated_data() IS
'Call this function after database migration to claim orphaned data (data with NULL user_id).
Only claims data that has no owner - will NOT reassign data from other users.
Usage: SELECT public.claim_migrated_data();';
