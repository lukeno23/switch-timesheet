-- =============================================================
-- 0009_override_columns.sql
-- Add classification override columns for user override system (D-22, D-23):
--   - override_client_id: nullable FK to clients
--   - override_category_id: nullable FK to categories
--   - override_department: nullable text
-- Also extend classification_method check constraint with 'user_override'.
-- =============================================================

-- Override columns
ALTER TABLE events ADD COLUMN IF NOT EXISTS override_client_id uuid REFERENCES clients(id);
ALTER TABLE events ADD COLUMN IF NOT EXISTS override_category_id uuid REFERENCES categories(id);
ALTER TABLE events ADD COLUMN IF NOT EXISTS override_department text;

-- Extend classification_method constraint to allow 'user_override'
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_classification_method_check;
ALTER TABLE events ADD CONSTRAINT events_classification_method_check
  CHECK (classification_method IN ('rule', 'llm', 'llm_corrected', 'misc', 'user_override'));
