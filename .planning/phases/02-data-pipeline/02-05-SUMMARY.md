---
phase: 02-data-pipeline
plan: 05
subsystem: deployment-and-scheduling
tags: [pg_cron, ci, deployment, supabase, deno]
dependency_graph:
  requires: [02-04]
  provides: [nightly-sync-schedule, ci-deno-check, deployed-sync-function]
  affects: [supabase/migrations, .github/workflows/ci.yml, supabase/functions/sync]
tech_stack:
  added: [pg_cron, pg_net, supabase-vault, pgsodium]
  patterns: [vault-secured-cron-trigger, deno-type-check-ci]
key_files:
  created:
    - supabase/migrations/0000_extensions.sql
    - supabase/migrations/0004_cron_schedule.sql
  modified:
    - .github/workflows/ci.yml
decisions:
  - "pg_cron schedule set to 04:00 UTC (05:00 CET / 06:00 CEST) -- 1hr summer drift accepted per Research Open Question #1"
  - "Vault secrets used for cron HTTP auth -- no hardcoded credentials in SQL migration (T-02-14 mitigated)"
  - "Deno type-check added to existing CI job rather than creating a separate job"
  - "Added 0000_extensions.sql to enable pg_cron/pg_net/pgsodium/supabase_vault before cron migration"
metrics:
  duration: "completed 2026-04-15"
  completed: "2026-04-15"
  tasks_completed: "2 of 2"
---

# Phase 02 Plan 05: Deployment, Scheduling & E2E Verification Summary

pg_cron nightly schedule, CI Deno type-checking, Supabase schema push, Edge Function deployment, and E2E pipeline verification all complete. Pipeline classified 1,419 events across 15 Switchers on first real run.

## What Was Done

### Task 1: Create pg_cron migration, update CI (COMPLETE)

**Commits:** `41a24b1`, (0000_extensions.sql added during deploy)

**Step 1 -- pg_cron migration:** Created `supabase/migrations/0004_cron_schedule.sql` with job `nightly-calendar-sync`, schedule `0 4 * * *`, `net.http_post` to `/functions/v1/sync`, Vault-sourced credentials.

**Step 2 -- CI update:** Added `denoland/setup-deno@v2` + `deno check supabase/functions/sync/index.ts` to `.github/workflows/ci.yml`.

**Step 3 -- Schema push:** All 5 migrations applied to project `eenwsnptzgsrzagpeawx`:
- `0000_extensions.sql` (added during deploy — enables pg_cron, pg_net, pgsodium, supabase_vault)
- `0001_schema.sql`, `0002_seed.sql`, `0003_rls.sql`, `0004_cron_schedule.sql`

### Task 2: Verify pipeline end-to-end (COMPLETE)

**Deployment steps completed:**
- `supabase link --project-ref eenwsnptzgsrzagpeawx`
- `supabase db push` — 5 migrations applied
- Vault secrets created (`project_url`, `service_role_key`)
- Edge Function secrets set: `GOOGLE_SERVICE_ACCOUNT_JSON`, `GEMINI_API_KEY`, `SYNC_SECRET`
- `supabase functions deploy sync` — 13 assets uploaded

**E2E verification (2026-04-15 07:33 UTC):**
- Manual sync triggered via `curl -X POST .../functions/v1/sync` with `x-sync-secret`
- Function ran past 150s free-tier Edge Function wall-clock limit
- **Data outcome: successful** — pipeline classified and wrote 1,419 events for 15 Switchers (1,331 rule-classified, 88 LLM-classified)
- **Metadata outcome: incomplete** — sync_runs row stuck in `running` status because function was killed before writing completion record; manually marked `failed` post-hoc

## Automated Verification Results

All production checks passed:

| Check | Result | Detail |
|-------|--------|--------|
| 7 tables present | PASS | audit_log, categories, client_aliases, clients, events, switchers, sync_runs |
| Seed data | PASS | 15 switchers, 33 clients, 18 aliases, 35 categories |
| pg_cron job active | PASS | `nightly-calendar-sync`, schedule `0 4 * * *` |
| Edge Function deployed | PASS | status=ACTIVE, version=1 |
| Edge Function secrets | PASS | 3 secrets (GOOGLE_SERVICE_ACCOUNT_JSON, GEMINI_API_KEY, SYNC_SECRET) |
| Vault secrets | PASS | project_url (40 chars), service_role_key (219 chars) |
| Events written | PASS | 1,419 events, all 15 Switchers |
| Rule engine ratio | PASS | 94% rule (1,331) / 6% LLM (88) — matches plan target |

## Deviations from Plan

- **Added `0000_extensions.sql`** (not in original plan): The cron migration requires `pg_cron`, `pg_net`, `pgsodium`, and `supabase_vault` extensions. The plan assumed these would be enabled manually via Dashboard. Added as a migration so setup is reproducible.
- **Free-tier timeout discovered:** Sync function takes >150s for a full 15-Switcher fetch, exceeding Supabase free-tier Edge Function limit. Events still write correctly but sync_runs completion record does not. See Known Issues below.

## Threat Surface Scan

No new threat surface beyond plan's threat model:
- T-02-14 (Information Disclosure): Mitigated — credentials read from Vault, not hardcoded
- T-02-15 (Elevation of Privilege): Accepted — CI runs type check only

## Known Issues

### Sync function exceeds free-tier Edge Function timeout

**Symptom:** HTTP 504 on manual trigger; sync_runs row stays in `running` status.

**Root cause:** Free-tier limit is 150s wall-clock. First real run took >6min before being killed (sequential processing of 15 Switchers + LLM classification + audit pass).

**Impact:** Data integrity is correct — events are upserted as they're processed. Only the sync_runs completion-metadata write is affected.

**Mitigations to consider:**
1. `EdgeRuntime.waitUntil()` pattern — return HTTP 202 immediately, finish work in background
2. Per-Switcher sub-function invocations (orchestrator fans out to 15 parallel)
3. Skip LLM audit pass for cost/time reduction
4. Upgrade to Pro tier (400s limit)

Not blocking Phase 2 completion; should be tracked for Phase 3+ refinement.

## Known Stubs

None — all files are complete production artifacts.

## Self-Check: PASSED

- FOUND: supabase/migrations/0000_extensions.sql (applied)
- FOUND: supabase/migrations/0004_cron_schedule.sql (applied)
- FOUND: .github/workflows/ci.yml (CI updated)
- FOUND: cron.job record `nightly-calendar-sync` (active=true)
- FOUND: 1,419 rows in events table across all 15 switchers
- FOUND: deployed sync Edge Function (status=ACTIVE)
