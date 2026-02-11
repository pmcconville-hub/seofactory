-- Force PostgREST to reload its schema cache
-- This resolves 406 (Not Acceptable) errors for newly created tables
NOTIFY pgrst, 'reload schema';
