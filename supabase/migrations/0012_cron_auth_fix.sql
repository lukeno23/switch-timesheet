-- =============================================================
-- 0012_cron_auth_fix.sql
-- Switch nightly-calendar-sync cron from Bearer service_role auth
-- to x-sync-secret auth.
--
-- Why: The sync Edge Function's Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
-- no longer equals the legacy JWT stored in vault (Supabase now injects
-- the new sb_secret_* format key into functions), so cron POSTs were
-- getting 401 Unauthorized from authenticateRequest().
--
-- The x-sync-secret path in authenticateRequest() is the same fallback
-- admin->sync already uses for manual backfills, so reusing it keeps
-- the cron working regardless of service_role_key rotation.
--
-- Requires a `sync_secret` entry in Vault whose value matches the
-- SYNC_SECRET function secret. Set once outside migrations:
--   select vault.create_secret('<SYNC_SECRET>', 'sync_secret');
-- =============================================================

SELECT cron.unschedule('nightly-calendar-sync');

SELECT cron.schedule(
  'nightly-calendar-sync',
  '0 4 * * 1-4',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url' LIMIT 1)
           || '/functions/v1/sync',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-sync-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'sync_secret' LIMIT 1)
    ),
    body := '{"trigger": "cron"}'::jsonb
  );
  $$
);
