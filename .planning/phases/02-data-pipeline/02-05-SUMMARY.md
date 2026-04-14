---
phase: 02-data-pipeline
plan: 05
subsystem: deployment-and-scheduling
tags: [pg_cron, ci, deployment, supabase, deno]
dependency_graph:
  requires: [02-04]
  provides: [nightly-sync-schedule, ci-deno-check]
  affects: [supabase/migrations, .github/workflows/ci.yml]
tech_stack:
  added: [pg_cron, pg_net, supabase-vault]
  patterns: [vault-secured-cron-trigger, deno-type-check-ci]
key_files:
  created:
    - supabase/migrations/0004_cron_schedule.sql
  modified:
    - .github/workflows/ci.yml
decisions:
  - "pg_cron schedule set to 04:00 UTC (05:00 CET / 06:00 CEST) -- 1hr summer drift accepted per Research Open Question #1"
  - "Vault secrets used for cron HTTP auth -- no hardcoded credentials in SQL migration (T-02-14 mitigated)"
  - "Deno type-check added to existing CI job rather than creating a separate job"
metrics:
  duration: "~80s (code artifacts only; schema push and verification require human action)"
  completed: "2026-04-14 (partial -- awaiting human setup for schema push and E2E verification)"
  tasks_completed: "1 of 2 (Task 1 code artifacts complete; Task 1 Step 3 and Task 2 blocked on human setup)"
---

# Phase 02 Plan 05: Deployment, Scheduling & E2E Verification Summary

pg_cron nightly schedule migration and CI Deno type-checking created; schema push and E2E verification blocked on Supabase project setup and credential configuration.

## What Was Done

### Task 1: Create pg_cron migration, update CI (PARTIAL -- code artifacts complete)

**Commit:** `41a24b1`

**Step 1 -- pg_cron migration (COMPLETE):**
Created `supabase/migrations/0004_cron_schedule.sql` with:
- Job name: `nightly-calendar-sync`
- Schedule: `0 4 * * *` (04:00 UTC = 05:00 CET)
- Uses `net.http_post` to call `/functions/v1/sync`
- Reads `project_url` and `service_role_key` from `vault.decrypted_secrets` (T-02-14 mitigated)
- Sends body `{"trigger": "cron"}`

**Step 2 -- CI update (COMPLETE):**
Updated `.github/workflows/ci.yml`:
- Added `denoland/setup-deno@v2` action with `deno-version: v2.x`
- Added `deno check supabase/functions/sync/index.ts` step
- Existing `npm ci`, `npm test`, `npm run build` steps preserved

**Step 3 -- Schema push (BLOCKED):**
Supabase CLI is installed but no project is linked. Schema push requires:
1. Supabase project created
2. `supabase link --project-ref YOUR_PROJECT_REF`
3. pg_cron and pg_net extensions enabled in Dashboard
4. `supabase db push`

### Task 2: Verify pipeline end-to-end (NOT STARTED)

Checkpoint type: `human-verify`. Requires all setup from Task 1 Step 3 plus:
- Vault secrets created (project_url, service_role_key)
- Edge Function deployed (`supabase functions deploy sync`)
- Edge Function secrets set (GOOGLE_SERVICE_ACCOUNT_JSON, GEMINI_API_KEY, SYNC_SECRET)
- Google service account with domain-wide delegation configured

## Automated Verification Results

All 11 automated checks passed:

| Check | Result |
|-------|--------|
| cron.schedule in migration | PASS |
| Job name 'nightly-calendar-sync' | PASS |
| Schedule '0 4 * * *' | PASS |
| URL '/functions/v1/sync' | PASS |
| vault.decrypted_secrets usage | PASS |
| 'deno check' in CI | PASS |
| 'setup-deno' action in CI | PASS |
| npm ci preserved | PASS |
| npm test preserved | PASS |
| npm run build preserved | PASS |
| Body '{"trigger": "cron"}' | PASS |

## Deviations from Plan

None -- plan executed exactly as written for the code artifact portion. The schema push (Task 1 Step 3) and E2E verification (Task 2) are documented human-action gates.

## Threat Surface Scan

No new threat surface introduced beyond what is documented in the plan's threat model:
- T-02-14 (Information Disclosure): Mitigated -- credentials read from Vault, not hardcoded
- T-02-15 (Elevation of Privilege): Accepted -- CI runs type check only, no secrets needed

## Known Stubs

None -- both files created are complete production artifacts.

## Blocked Items (Require Human Action)

1. **Supabase project setup:** Create project, link locally, enable pg_cron + pg_net extensions
2. **Schema push:** Run `supabase db push` after project is linked
3. **Vault secrets:** Create project_url and service_role_key secrets via SQL Editor
4. **Edge Function deployment:** Deploy sync function and set secrets
5. **Google Workspace:** Service account with domain-wide delegation for Calendar API
6. **E2E verification:** Manual sync trigger and result inspection

## Self-Check: PASSED

- FOUND: supabase/migrations/0004_cron_schedule.sql
- FOUND: .github/workflows/ci.yml
- FOUND: .planning/phases/02-data-pipeline/02-05-SUMMARY.md
- FOUND: commit 41a24b1
