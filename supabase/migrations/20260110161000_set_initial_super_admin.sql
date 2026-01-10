-- supabase/migrations/20260110161000_set_initial_super_admin.sql
-- Set initial super admin user

-- Set richard@kjenmarks.nl as super admin
UPDATE public.user_settings
SET is_super_admin = TRUE
WHERE user_id = (
  SELECT id FROM auth.users
  WHERE email = 'richard@kjenmarks.nl'
);

-- If no user_settings row exists, create one
INSERT INTO public.user_settings (user_id, is_super_admin)
SELECT id, TRUE FROM auth.users WHERE email = 'richard@kjenmarks.nl'
ON CONFLICT (user_id) DO UPDATE SET is_super_admin = TRUE;
