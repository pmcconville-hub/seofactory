ALTER TABLE topical_maps ADD COLUMN IF NOT EXISTS confirmed_services JSONB DEFAULT NULL;
COMMENT ON COLUMN topical_maps.confirmed_services IS 'User-confirmed business services for map generation. Persists manual edits to EAV-extracted services.';
