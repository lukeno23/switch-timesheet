---
phase: 02-data-pipeline
plan: 04
subsystem: sync-orchestrator
tags: [supabase-edge-function, deno, sync-pipeline, google-calendar, gemini, classification, test-fixtures]

# Dependency graph
requires:
  - phase: 02-data-pipeline plan 01
    provides: "Supabase schema, types.ts, supabaseClient.ts, upsert_event/delete_missing_events functions"
  - phase: 02-data-pipeline plan 02
    provides: "ruleEngine.ts (classifyEvent), eventFilter.ts (filterEvents), titleParser.ts (parseTitle), aliasResolver.ts (buildAliasMap, resolveClientAlias, isNonClientName)"
  - phase: 02-data-pipeline plan 03
    provides: "googleAuth.ts (getGoogleAccessToken), calendarFetcher.ts (fetchCalendarEvents), llmClassifier.ts (classifyWithLLM), llmAuditPass.ts (auditRuleClassifications), outputValidator.ts (validateClassifications)"
provides:
  - "Sync Edge Function orchestrating full pipeline: fetch -> filter -> parse -> classify -> upsert -> delete stale -> record metrics"
  - "Per-Switcher error isolation preventing cascade failures"
  - "Manual and cron trigger authentication"
  - "Backfill mode for historical data import from Feb 1, 2026"
  - "25 mock Google Calendar API events for integration testing"
  - "25 ground-truth classification test cases derived from instructions.md rules"
affects: [02-data-pipeline plan 05 (pg_cron scheduling)]

# Tech tracking
tech-stack:
  added: []
  patterns: [pipeline-orchestrator, per-switcher-error-isolation, three-stage-classification, backfill-mode]

key-files:
  created:
    - supabase/functions/sync/index.ts
    - supabase/functions/sync/deno.json
    - supabase/functions/tests/fixtures/calendarEvents.json
    - supabase/functions/tests/fixtures/sampleEvents.ts
  modified: []

key-decisions:
  - "All fetched Google event IDs (including filtered ones) passed to delete_missing_events to avoid accidentally deleting filtered-but-existing events"
  - "Misc events upserted immediately with misc classification, then updated in-place if LLM resolves them"
  - "LLM fallback and audit pass failures are non-fatal (console.error + continue) to prevent sync failure from API issues"
  - "Reference data loaded fresh at start of each sync to pick up admin changes (D-04 / ADMN-04)"

patterns-established:
  - "Edge Function auth: dual-path (Bearer service role key for cron, x-sync-secret for manual)"
  - "Pipeline stages: sync window -> reference data -> per-Switcher fetch/filter/parse/classify -> batch LLM fallback -> batch LLM audit -> metrics"
  - "Error isolation: try/catch per Switcher with error accumulation in metrics.errors map"

requirements-completed: [PIPE-05, PIPE-06, PIPE-04, PIPE-02, CLAS-06]

# Metrics
duration: 4min
completed: 2026-04-14
---

# Phase 02 Plan 04: Sync Edge Function Orchestrator Summary

**756-line Deno.serve Edge Function orchestrating the full three-stage classification pipeline with per-Switcher error isolation, dual authentication, backfill mode, and 50 test fixtures**

## Performance

- **Duration:** 4 min
- **Started:** 2026-04-14T18:47:46Z
- **Completed:** 2026-04-14T18:52:12Z
- **Tasks:** 2
- **Files created:** 4

## Accomplishments
- Complete sync orchestrator tying together all 10 shared modules from Plans 01-03
- Full pipeline: fetch calendar events -> filterEvents -> parseCalendarEvent -> classifyEvent (rule) -> classifyWithLLM (fallback) -> auditRuleClassifications (audit) -> upsert_event -> delete_missing_events -> sync_runs metrics
- Dual authentication: Bearer token for pg_cron triggers, x-sync-secret header for manual triggers (T-02-11)
- Per-Switcher error isolation: one failing calendar does not block the other 14 (D-16)
- Backfill mode: custom date range via body params for historical import from Feb 1, 2026 (D-15)
- Hard delete of events removed from calendar within sync window (D-17)
- Complete sync_runs metrics recording with events_processed, rule_classified, llm_classified, llm_corrected, misc_count, borderline_count, errors, duration_ms (D-28, PIPE-06)
- 25 mock Google Calendar API events covering all filter/parse scenarios
- 25 ground-truth classification test cases covering all major categories and routing rules

## Task Commits

Each task was committed atomically:

1. **Task 1: Create the sync Edge Function orchestrator** - `0e5662e` (feat)
2. **Task 2: Create test fixtures for local development** - `d1116b8` (feat)

## Files Created/Modified
- `supabase/functions/sync/index.ts` - 756-line sync orchestrator: authentication, window calculation, reference data loading, per-Switcher pipeline, LLM fallback, LLM audit, upsert, hard delete, metrics recording
- `supabase/functions/sync/deno.json` - Deno configuration with @supabase/supabase-js ESM import
- `supabase/functions/tests/fixtures/calendarEvents.json` - 25 mock Google Calendar events: pipe-delimited titles, personal events, all-day events, zero-duration, weekend/Friday, aliases (PP, WRH, ELCOL), non-client names, recurring events, CET/CEST timezones
- `supabase/functions/tests/fixtures/sampleEvents.ts` - 25 ground-truth classification test cases: Accounts, Operations, BD, HR, Brand Writing, Meetings, Emails, Production, Copywriting, CC Management, Strategy, Paid Management, QA, Configuring LLM, Brief writing, Web Management, Misc; Ed/Lisa/designer routing; alias and non-client cases

## Decisions Made
- **Delete-safe event ID tracking:** All fetched Google event IDs (not just parsed/filtered ones) are passed to delete_missing_events to avoid accidentally hard-deleting events that exist in the calendar but were filtered out by the personal/weekend/all-day filter
- **Immediate misc upsert then LLM update:** Misc events are upserted to DB immediately during per-Switcher processing, then updated in-place if the LLM fallback resolves them; this ensures all events are persisted even if LLM fails
- **Non-fatal LLM stages:** Both LLM fallback and audit pass are wrapped in try/catch with console.error logging; failures don't prevent sync completion or metrics recording
- **Fresh reference data per sync:** switchers, clients, aliases, and categories are loaded from DB at the start of each sync to pick up any admin changes since last sync

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
- Google service account with domain-wide delegation must be configured (GOOGLE_SERVICE_ACCOUNT_JSON env var)
- Gemini API key must be set (GEMINI_API_KEY env var)
- SYNC_SECRET env var must be set for manual trigger authentication
- Supabase project must be running with schema applied (migrations from Plan 01)

## Threat Surface Coverage

All threats from the plan's threat model are mitigated:
- **T-02-11 (Spoofing):** Manual trigger requires x-sync-secret header check; cron trigger requires Authorization Bearer with service role key. Both checked before pipeline executes.
- **T-02-12 (Denial of Service):** Backfill mode only callable with secret key. Per-Switcher error isolation prevents cascade.
- **T-02-13 (Tampering):** LLM results validated via outputValidator.ts before DB write. Rule classifications use fixed keyword sets.

## Next Phase Readiness
- Sync Edge Function ready for pg_cron scheduling (Plan 05)
- Manual trigger endpoint ready for testing: `POST /functions/v1/sync` with `x-sync-secret` header
- Test fixtures available for integration testing against the pipeline

## Self-Check: PASSED
