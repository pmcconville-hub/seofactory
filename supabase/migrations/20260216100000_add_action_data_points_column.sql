-- Add missing action_data_points JSONB column to site_inventory
-- This column stores the detailed signal data points from the migration plan engine
-- (content health, traffic opportunity, technical health, linking strength, etc.)

ALTER TABLE public.site_inventory
  ADD COLUMN IF NOT EXISTS action_data_points jsonb;

NOTIFY pgrst, 'reload schema';
