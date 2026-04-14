-- =============================================================
-- 0004_cron_schedule.sql
-- Schedule nightly calendar sync at 04:00 UTC (= 05:00 CET / 06:00 CEST)
-- Per D-13: ~5 AM CET. Using fixed UTC offset.
-- Open Question #1 resolved: 1hr CEST drift acceptable.
--
-- Requires pg_cron and pg_net extensions to be enabled in
-- Supabase Dashboard before this migration runs.
--
-- Vault secrets (project_url, service_role_key) must be created
-- manually in SQL Editor before this cron job can execute
-- successfully. See plan 02-05 user_setup for instructions.
-- =============================================================

SELECT cron.schedule(
  'nightly-calendar-sync',
  '0 4 * * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url' LIMIT 1)
           || '/functions/v1/sync',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1)
    ),
    body := '{"trigger": "cron"}'::jsonb
  );
  $$
);
