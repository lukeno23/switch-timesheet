-- =============================================================
-- 0007_admin_columns.sql
-- Add columns required by Phase 3 admin features:
--   - active boolean on categories for soft delete (D-08)
--   - target_hourly_rate on clients for billing analytics (D-15)
-- =============================================================

-- Add active to categories (D-08)
ALTER TABLE categories ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;

-- Add target_hourly_rate to clients (D-15)
ALTER TABLE clients ADD COLUMN IF NOT EXISTS target_hourly_rate numeric;
