-- =============================================================
-- 0011_weekday_cron.sql
-- Update nightly sync schedule to Mon-Thu mornings only.
-- Switch has a 4-day work week (Mon-Thu), so no syncs needed
-- on Friday, Saturday, or Sunday.
-- Schedule: 04:00 UTC (= 05:00 CET / 06:00 CEST) Mon-Thu
-- =============================================================

-- Remove existing daily schedule
SELECT cron.unschedule('nightly-calendar-sync');

-- Re-create with Mon-Thu only (cron day-of-week: 1=Mon, 4=Thu)
SELECT cron.schedule(
  'nightly-calendar-sync',
  '0 4 * * 1-4',
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
