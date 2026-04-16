---
phase: 03-dashboard-admin
plan: 01
subsystem: backend
tags: [supabase, migrations, edge-functions, rls, admin-api, backfill]

# Dependency graph
requires:
  - phase: 02-data-pipeline
    provides: Supabase schema (events, switchers, clients, categories, sync_runs, audit_log), RLS policies, sync Edge Function with manual trigger support
provides:
  - client_billing table with currency, FX rate, billing_type constraints (supabase/migrations/0006_client_billing.sql)
  - active column on categories, target_hourly_rate on clients (supabase/migrations/0007_admin_columns.sql)
  - anon SELECT policies on client_billing and audit_log (supabase/migrations/0008_anon_read_policies.sql)
  - Shared auth verifier module for x-switch-auth header (supabase/functions/_shared/authVerifier.ts)
  - Multiplexed admin Edge Function with 11 CRUD actions + trigger-sync (supabase/functions/admin/index.ts)
  - Jan 4-31 2026 historical backfill — 2,179 events imported
affects: [03-02, 03-03, 03-04, 03-05, 03-06, 03-07]

# Tech tracking
tech-stack:
  added: []
  patterns: [multiplexed-edge-function, shared-auth-verifier, server-side-validation, cors-preflight]

key-files:
  created:
    - supabase/migrations/0006_client_billing.sql
    - supabase/migrations/0007_admin_columns.sql
    - supabase/migrations/0008_anon_read_policies.sql
    - supabase/functions/_shared/authVerifier.ts
    - supabase/functions/admin/index.ts
    - supabase/functions/admin/deno.json
  modified: []

key-decisions:
  - "Multiplexed admin Edge Function handles all 11 CRUD actions via action routing — single deployment unit"
  - "Auth verifier exports corsHeaders with x-switch-auth in allowed headers — avoids dependency on @supabase/supabase-js/cors"
  - "Server-side EUR equivalent computation: if currency=EUR then amount, else amount * fx_rate_to_eur"
  - "Backfill via manual sync trigger with backfill_start/backfill_end params — reuses Phase 2 sync pipeline"

patterns-established:
  - "Admin Edge Function pattern: Deno.serve → OPTIONS preflight → verifyAuthHash → parse { action, ...payload } → switch(action) → jsonResponse"
  - "Shared auth module: import { verifyAuthHash, corsHeaders } from '../_shared/authVerifier.ts'"
  - "Plain-English validation errors per D-11: 'A Switcher with that email already exists.'"

requirements-completed: [ADMN-01, ADMN-02, ADMN-03, BILL-01, DASH-01]

# Metrics
duration: 10min
completed: 2026-04-16
---

# Phase 3 Plan 01: Backend Foundation Summary

**Three database migrations, multiplexed admin Edge Function with auth verifier for 11 CRUD operations, and Jan 4-31 2026 historical backfill**

## Performance

- **Duration:** ~10 min (code) + ~3 min (backfill sync)
- **Tasks:** 3 (2 auto + 1 human-action checkpoint)
- **Files modified:** 6 created

## Accomplishments
- client_billing table with UNIQUE(client_id, year_month), CHECK constraints for currency (EUR/USD), FX rate requirement for non-EUR, and billing_type enum
- categories.active boolean column (default true) for soft-delete support
- clients.target_hourly_rate nullable column for billing analytics
- anon SELECT RLS policies on client_billing and audit_log (completing D-04 coverage)
- Shared authVerifier.ts module exporting verifyAuthHash and corsHeaders
- Admin Edge Function handling: create/update-switcher, create/update-client, create/delete-alias, create/update-category, create/update/delete-billing, trigger-sync
- Email and alias uniqueness validation with plain-English error messages
- Switcher deactivation warning when upcoming events exist
- Server-side EUR equivalent computation for billing entries
- Jan 4-31 2026 backfill: 2,179 events imported, closing the gap between D-19 anchor date and Phase 2's Feb backfill

## Task Commits

1. **Task 1: Create database migrations (0006, 0007, 0008)** - `1b449e0` (feat)
2. **Task 2: Create admin Edge Function with auth verifier** - `34bea9b` (feat)
3. **Task 3: Run D-20 Jan 4-31 2026 backfill** - manual checkpoint (curl trigger, verified 2,179 events)

## Deployed Artifacts
- Migrations applied via `supabase db push` (0006, 0007, 0008)
- Admin Edge Function deployed via `supabase functions deploy admin`
- SWITCH_AUTH_HASH secret set in Supabase Edge Function secrets

## Deviations from Plan
None — plan executed as written. Backfill hit the known free-tier 150s timeout but events wrote successfully.

## Self-Check: PASSED

All 6 files verified on disk. Both commits (1b449e0, 34bea9b) verified in git log. Backfill verified: 2,179 events for Jan 4-31 2026.

---
*Phase: 03-dashboard-admin*
*Completed: 2026-04-16*
