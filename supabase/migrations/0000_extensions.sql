-- =============================================================
-- 0000_extensions.sql
-- Enable required Postgres extensions for the sync pipeline.
--   pg_cron  — scheduled job runner for nightly calendar sync (0004)
--   pg_net   — HTTP POST from the cron job to the sync Edge Function (0004)
--   pgsodium — backing store for vault.create_secret() / vault.decrypted_secrets
--   supabase_vault — vault.secrets / vault.decrypted_secrets views used by 0004 cron job
--
-- Must run before 0004_cron_schedule.sql since that migration references
-- cron.schedule(), net.http_post(), and vault.decrypted_secrets.
-- =============================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pgsodium;
CREATE EXTENSION IF NOT EXISTS supabase_vault;
