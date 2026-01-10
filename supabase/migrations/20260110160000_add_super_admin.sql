-- supabase/migrations/20260110160000_add_super_admin.sql
-- Add super admin flag for platform-level administration

-- Add is_super_admin column to user_settings
ALTER TABLE public.user_settings
ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN DEFAULT FALSE;

-- Create index for quick super admin lookups
CREATE INDEX IF NOT EXISTS idx_user_settings_super_admin
ON public.user_settings(user_id)
WHERE is_super_admin = TRUE;

-- Add comment
COMMENT ON COLUMN public.user_settings.is_super_admin IS
'Platform-level super admin flag. Super admins can manage all organizations, users, and system settings.';

-- Create a function to check if current user is super admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_settings
    WHERE user_id = auth.uid()
    AND is_super_admin = TRUE
  );
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;

-- Create RLS policy allowing super admins to view all organizations
CREATE POLICY "Super admins can view all organizations"
ON public.organizations
FOR SELECT
USING (public.is_super_admin());

-- Create RLS policy allowing super admins to view all organization members
CREATE POLICY "Super admins can view all organization members"
ON public.organization_members
FOR SELECT
USING (public.is_super_admin());

-- Create RLS policy allowing super admins to manage organization members
CREATE POLICY "Super admins can manage all organization members"
ON public.organization_members
FOR ALL
USING (public.is_super_admin());

-- Create RLS policy allowing super admins to view all users via user_profiles view
-- (Already a view, no RLS needed)

-- Create RLS policy for super admins to view all projects
CREATE POLICY "Super admins can view all projects"
ON public.projects
FOR SELECT
USING (public.is_super_admin());
