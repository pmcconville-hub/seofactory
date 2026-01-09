-- supabase/migrations/20260110500000_enable_multi_tenancy_flag.sql
-- Enable multi-tenancy feature flag

INSERT INTO feature_flags (flag_key, is_enabled, description)
VALUES ('multi_tenancy_enabled', true, 'Enable multi-tenancy features')
ON CONFLICT (flag_key) DO UPDATE
SET is_enabled = true,
    updated_at = NOW();
