-- supabase/migrations/20260123100001_alter_quotation_ids_to_text.sql
-- Alter quotation tables to use TEXT IDs for human-readable identifiers

-- Drop foreign key constraints first
ALTER TABLE quotes DROP CONSTRAINT IF EXISTS quotes_selected_package_id_fkey;

-- Alter quotation_service_modules id from UUID to TEXT
ALTER TABLE quotation_service_modules
  ALTER COLUMN id DROP DEFAULT,
  ALTER COLUMN id TYPE TEXT USING id::TEXT;

-- Alter quotation_packages id from UUID to TEXT
ALTER TABLE quotation_packages
  ALTER COLUMN id DROP DEFAULT,
  ALTER COLUMN id TYPE TEXT USING id::TEXT;

-- Alter quotes.selected_package_id from UUID to TEXT
ALTER TABLE quotes
  ALTER COLUMN selected_package_id TYPE TEXT USING selected_package_id::TEXT;

-- Re-add the foreign key constraint
ALTER TABLE quotes
  ADD CONSTRAINT quotes_selected_package_id_fkey
  FOREIGN KEY (selected_package_id) REFERENCES quotation_packages(id);
