-- =============================================================
-- 0013_cron_chunking_and_reaper.sql
--
-- Two problems this addresses:
--
-- 1. The nightly cron fired a single 21-day sync call (today-7 to
--    today+14) across all 15 Switchers, which routinely exceeded the
--    Supabase free-tier 150s Edge Function cap. Events were written
--    but sync_runs rows were left in 'running' forever, misleading
--    the admin dashboard.
--
-- 2. Any interrupted sync (timeout, crash, network drop) leaves a
--    sync_runs row stuck in 'running' status. The dashboard's
--    "Last synced" badge and log both show this as if work were
--    ongoing indefinitely.
--
-- Fixes:
--
--  A. Reap already-stuck rows immediately, and schedule a reaper
--     cron that marks any sync_runs 'running' for >15 min as
--     'failed' with an explanatory errors entry.
--
--  B. Replace the single nightly-calendar-sync job with 8 staggered
--     cron jobs, each firing one 3-day chunk via x-sync-secret auth.
--     Staggered 10 min apart starting 04:00 UTC Mon-Thu so each
--     sync has the function instance to itself and the whole span
--     fits comfortably before the workday starts in Malta.
--
--     Date range per run is computed from CURRENT_DATE at fire time,
--     so the covered window stays today-7..today+14 continuously.
--
--  Requires vault entries 'project_url' and 'sync_secret' (both
--  present from migration 0012 / the ad-hoc vault.create_secret call).
-- =============================================================

-- --- A.1: Immediate reap of existing stuck running rows -----------

UPDATE sync_runs
SET status = 'failed',
    completed_at = now(),
    errors = COALESCE(errors, '{}'::jsonb)
             || jsonb_build_object(
                  'reaper', 'Marked failed by 0013 reaper: sync_runs row was stuck in running status'
                )
WHERE status = 'running'
  AND started_at < now() - INTERVAL '15 minutes';

-- --- A.2: Ongoing reaper cron (every 10 min) ----------------------

SELECT cron.unschedule('sync-runs-reaper') FROM cron.job WHERE jobname = 'sync-runs-reaper';

SELECT cron.schedule(
  'sync-runs-reaper',
  '*/10 * * * *',
  $$
  UPDATE sync_runs
  SET status = 'failed',
      completed_at = now(),
      errors = COALESCE(errors, '{}'::jsonb)
               || jsonb_build_object(
                    'reaper', 'Marked failed by reaper cron: sync_runs row exceeded 15 min in running status'
                  )
  WHERE status = 'running'
    AND started_at < now() - INTERVAL '15 minutes';
  $$
);

-- --- B.1: Remove the single-call nightly cron ---------------------

SELECT cron.unschedule('nightly-calendar-sync') FROM cron.job WHERE jobname = 'nightly-calendar-sync';

-- --- B.2: Helper to build a cron command for a given chunk --------
-- (No DDL -- we inline the 8 SELECT cron.schedule calls below so
--  each scheduled command is a pure string pg_cron can hash.)
--
-- Chunk offsets (inclusive) relative to CURRENT_DATE at fire time:
--   01:  -7 .. -5
--   02:  -4 .. -2
--   03:  -1 .. +1
--   04:  +2 .. +4
--   05:  +5 .. +7
--   06:  +8 .. +10
--   07:  +11 .. +13
--   08:  +14 .. +14
--
-- Schedules (Mon-Thu, 10 min stagger starting 04:00 UTC):
--   01: 04:00   05: 04:40
--   02: 04:10   06: 04:50
--   03: 04:20   07: 05:00
--   04: 04:30   08: 05:10

-- --- B.3: The 8 chunk jobs -----------------------------------------

SELECT cron.schedule(
  'nightly-sync-chunk-01',
  '0 4 * * 1-4',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url' LIMIT 1)
           || '/functions/v1/sync',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-sync-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'sync_secret' LIMIT 1)
    ),
    body := jsonb_build_object(
      'trigger', 'cron',
      'backfill_start', to_char(CURRENT_DATE - 7, 'YYYY-MM-DD'),
      'backfill_end',   to_char(CURRENT_DATE - 5, 'YYYY-MM-DD')
    )
  );
  $$
);

SELECT cron.schedule(
  'nightly-sync-chunk-02',
  '10 4 * * 1-4',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url' LIMIT 1)
           || '/functions/v1/sync',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-sync-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'sync_secret' LIMIT 1)
    ),
    body := jsonb_build_object(
      'trigger', 'cron',
      'backfill_start', to_char(CURRENT_DATE - 4, 'YYYY-MM-DD'),
      'backfill_end',   to_char(CURRENT_DATE - 2, 'YYYY-MM-DD')
    )
  );
  $$
);

SELECT cron.schedule(
  'nightly-sync-chunk-03',
  '20 4 * * 1-4',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url' LIMIT 1)
           || '/functions/v1/sync',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-sync-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'sync_secret' LIMIT 1)
    ),
    body := jsonb_build_object(
      'trigger', 'cron',
      'backfill_start', to_char(CURRENT_DATE - 1, 'YYYY-MM-DD'),
      'backfill_end',   to_char(CURRENT_DATE + 1, 'YYYY-MM-DD')
    )
  );
  $$
);

SELECT cron.schedule(
  'nightly-sync-chunk-04',
  '30 4 * * 1-4',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url' LIMIT 1)
           || '/functions/v1/sync',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-sync-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'sync_secret' LIMIT 1)
    ),
    body := jsonb_build_object(
      'trigger', 'cron',
      'backfill_start', to_char(CURRENT_DATE + 2, 'YYYY-MM-DD'),
      'backfill_end',   to_char(CURRENT_DATE + 4, 'YYYY-MM-DD')
    )
  );
  $$
);

SELECT cron.schedule(
  'nightly-sync-chunk-05',
  '40 4 * * 1-4',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url' LIMIT 1)
           || '/functions/v1/sync',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-sync-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'sync_secret' LIMIT 1)
    ),
    body := jsonb_build_object(
      'trigger', 'cron',
      'backfill_start', to_char(CURRENT_DATE + 5, 'YYYY-MM-DD'),
      'backfill_end',   to_char(CURRENT_DATE + 7, 'YYYY-MM-DD')
    )
  );
  $$
);

SELECT cron.schedule(
  'nightly-sync-chunk-06',
  '50 4 * * 1-4',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url' LIMIT 1)
           || '/functions/v1/sync',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-sync-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'sync_secret' LIMIT 1)
    ),
    body := jsonb_build_object(
      'trigger', 'cron',
      'backfill_start', to_char(CURRENT_DATE + 8, 'YYYY-MM-DD'),
      'backfill_end',   to_char(CURRENT_DATE + 10, 'YYYY-MM-DD')
    )
  );
  $$
);

SELECT cron.schedule(
  'nightly-sync-chunk-07',
  '0 5 * * 1-4',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url' LIMIT 1)
           || '/functions/v1/sync',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-sync-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'sync_secret' LIMIT 1)
    ),
    body := jsonb_build_object(
      'trigger', 'cron',
      'backfill_start', to_char(CURRENT_DATE + 11, 'YYYY-MM-DD'),
      'backfill_end',   to_char(CURRENT_DATE + 13, 'YYYY-MM-DD')
    )
  );
  $$
);

SELECT cron.schedule(
  'nightly-sync-chunk-08',
  '10 5 * * 1-4',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url' LIMIT 1)
           || '/functions/v1/sync',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-sync-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'sync_secret' LIMIT 1)
    ),
    body := jsonb_build_object(
      'trigger', 'cron',
      'backfill_start', to_char(CURRENT_DATE + 14, 'YYYY-MM-DD'),
      'backfill_end',   to_char(CURRENT_DATE + 14, 'YYYY-MM-DD')
    )
  );
  $$
);
