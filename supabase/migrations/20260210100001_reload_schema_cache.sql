-- Reload PostgREST schema cache after product catalog tables were created
NOTIFY pgrst, 'reload schema';
