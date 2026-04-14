# Phase 2: Data Pipeline - Context

**Gathered:** 2026-04-14
**Status:** Ready for planning

<domain>
## Phase Boundary

Build the automated data pipeline: Supabase schema with normalized reference data, Google Calendar API sync via service account with domain-wide delegation, and a three-stage hybrid classification engine (rule engine + LLM fallback + LLM audit pass). The result is calendar events for all 15 Switchers automatically fetched, classified, and stored in Supabase every night, with an audit trail of LLM corrections and per-sync classification metrics.

Requirements covered: PIPE-01, PIPE-02, PIPE-03, PIPE-04, PIPE-05, PIPE-06, CLAS-01, CLAS-02, CLAS-03, CLAS-04, CLAS-05, CLAS-06

</domain>

<decisions>
## Implementation Decisions

### Supabase Schema
- **D-01:** Normalized tables for reference data. Separate tables for switchers, clients (with aliases), and categories. Events reference them via foreign keys. Clean foundation for Phase 3 admin UI — management edits reference tables, classification picks up changes automatically.
- **D-02:** Client alias storage is Claude's discretion — choose between alias column on clients table vs separate lookup table based on what works best with Supabase queries and the Phase 3 admin UI.
- **D-03:** Basic RLS enabled from the start. Service role for Edge Functions (full access), anon role blocked. Prevents accidental public data exposure. Phase 3 adds password-gated read access for dashboard users.
- **D-04:** SQL migration seed file for initial reference data. All 15 switchers, ~35 clients with aliases, and ~35 categories seeded from process_export.py and CalendarExtractor.gs. Reproducible and version-controlled.

### Three-Stage Classification Pipeline
- **D-05:** Stage 1 — **Rule engine** (direct TypeScript port of process_export.py). Runs inside the Edge Function as an imported module. Same keyword lists, conditionals, and department routing as the Python original. Rules live in code, not DB.
- **D-06:** Stage 2 — **LLM fallback** (Gemini 2.5 Flash). Classifies events the rule engine couldn't resolve. Events sent in batches with rich context: full category definitions from Legend, client list with aliases, Switcher department mappings, and classification rules/heuristics. Not just pattern recognition — the LLM gets the full context it needs to make informed decisions.
- **D-07:** Stage 3 — **LLM audit pass** (Gemini 2.5 Flash). Reviews rule-classified events flagged as borderline plus a random sample of confident classifications. When the LLM disagrees with a rule classification, it overrides and logs the correction. classification_method changes from "rule" to "llm_corrected". Corrections stored in audit_log table with original value, new value, and reasoning.
- **D-08:** Rule engine stores a confidence signal — events tagged as "confident" or "borderline" based on match quality. The LLM audit pass uses this to focus review on borderline events, keeping API costs manageable.
- **D-09:** Expand rule engine coverage before relying on LLM. Analyze the ~82 current Misc entries, identify patterns, add keywords/rules. Goal: rules handle ~98%, LLM handles ~2%. Reduces ongoing Gemini costs.
- **D-10:** LLM output validated against canonical client/category lists before writing to DB (CLAS-03). Invalid classifications rejected and flagged for review.

### Work Week & Event Filtering
- **D-11:** Switch works Monday-Thursday. Friday events are classified normally but flagged with `off_schedule: true`. Saturday and Sunday events are filtered out entirely during sync.
- **D-12:** Personal events, all-day events, and zero-duration events filtered automatically (PIPE-04). Personal event detection ported from process_export.py keyword lists.

### Sync Orchestration
- **D-13:** Nightly sync at ~5 AM CET via pg_cron trigger on Supabase Edge Function.
- **D-14:** Sync window: 7 days back (catch edits/late additions) + 2 weeks forward (capture upcoming scheduled events).
- **D-15:** First sync does a historical backfill from February 1, 2026 onward. Batched into separate sync calls if needed to stay within Edge Function timeout limits. Subsequent syncs use the standard rolling window.
- **D-16:** Per-Switcher error isolation — if one calendar fails, log the error, skip that Switcher, continue syncing the other 14. Partial sync status stored.
- **D-17:** Hard delete for events that disappear from the calendar during the re-sync window. No soft delete.
- **D-18:** Manual sync via HTTP endpoint with secret key authentication. Phase 3 admin UI can add a "Sync now" button. Also useful for development testing.
- **D-19:** "Last synced" timestamp updated per successful sync (PIPE-06).

### Google Calendar API
- **D-20:** Fields extracted per event: title, start/end time, description/notes, attendees list, recurring event info. Location not extracted.
- **D-21:** Title parsing approach (pipe-delimited "Client | Task Details" convention) is Claude's discretion — parse on ingest or during classification, whichever simplifies the pipeline.

### Event Data Model
- **D-22:** Recurring events stored as series + instances. Track both the recurring series (pattern, original title) and individual instances. Enables bulk reclassification of entire series and identification of standing meetings.
- **D-23:** Duration stored as calculated field (duration_minutes) from start/end time at ingest. The dashboard heavily uses duration for time allocation charts.
- **D-24:** Temporal status field on events ("upcoming" vs "completed") based on whether event date is in the future. Updated on each sync. Supports the upcoming events section in Phase 3 dashboard.

### Testing & Quality
- **D-25:** Classification engine tested with unit tests for rule logic (keyword matching, department routing, alias resolution) via Vitest. Existing CSV data used as reference but NOT as golden datasets — known to have issues.
- **D-26:** Human review is the real quality threshold. The pipeline generates a classification summary report after each sync: events processed, rule/LLM/misc/corrected counts, and flagged borderline items for human review. During development, exportable as CSV for manual review.
- **D-27:** Edge Function tested locally using Supabase CLI against local Postgres. Google Calendar API responses mocked with fixture data.

### Monitoring & Observability
- **D-28:** sync_runs table records each sync: timestamp, events processed, events per Switcher, rule/LLM/misc/corrected/borderline counts, errors, duration.
- **D-29:** Per-sync classification metrics tracked over time: total events, rule_classified_count, llm_classified_count, llm_corrected_count, misc_count, borderline_count. Enables trend tracking of Misc rate and LLM correction frequency.

### API Key Management
- **D-30:** Gemini API key stored as Supabase Edge Function secret (environment variable). Google service account credentials also in Edge Function secrets. Never exposed to client.

### Claude's Discretion
- Client alias storage approach (D-02)
- Title parsing strategy — ingest-time vs classification-time (D-21)
- Batch size for LLM classification calls
- Random sample percentage for LLM audit pass on confident rule classifications

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Classification & Business Logic
- `Other files/process_export.py` — Python rule-based classifier (~500 lines). Source of truth for TypeScript port. Contains personal event filters, client aliases, category keywords, per-Switcher department routing.
- `Other files/classify_with_ai.py` — Existing LLM classifier using Gemini 2.5 Pro. Reference for prompt design, batch processing approach, and system prompt structure.
- `Other files/instructions.md` — Comprehensive classification rules and business logic (source of truth for rule engine)
- `Other files/Legend.pdf` — Authoritative reference for task categories and departments. Must be embedded in LLM classification prompts.
- `Other files/CalendarExtractor.gs` — Current Google Apps Script. Reference for Switcher email addresses, calendar field extraction, and personal event filtering.

### Sample Data
- `Other files/Switch Calendar Export - Jan 04 - Feb 26 2026 - Calendar Data.csv` — Raw calendar export (reference for event structure, NOT golden dataset)
- `Other files/Timesheet Output - Jan 5 - Feb 26 2026.csv` — Rule-classified output (reference, known to have issues)
- `Other files/Timesheet Output - AI Classified - Jan 5 - Feb 26 2026.csv` — LLM-classified output (reference)

### Project Context
- `.planning/REQUIREMENTS.md` — Full requirement definitions (PIPE-01 through PIPE-06, CLAS-01 through CLAS-06)
- `.planning/ROADMAP.md` — Phase success criteria
- `.planning/phases/01-foundation/01-CONTEXT.md` — Phase 1 decisions (modular structure, Vitest, Vercel deployment)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- Phase 1 established modular structure (`src/features/`, `src/shared/`) — pipeline code should follow the same organization
- Vitest already configured — use for rule engine unit tests
- GitHub Actions CI already set up — pipeline tests integrate into existing workflow

### Established Patterns
- Arrow function components, useMemo for derived data, useState for UI state (from Phase 1)
- Gemini API already used for dashboard AI insights — same provider for classification pipeline

### Integration Points
- Supabase client library will be a new dependency (not yet installed)
- Edge Functions deploy separately from the Vite frontend — `supabase/functions/` directory
- The frontend currently reads CSV data — Phase 3 will switch to Supabase queries
- Google Calendar API requires `googleapis` package or direct REST calls from Edge Function (Deno compatible)

</code_context>

<specifics>
## Specific Ideas

- **Three-stage pipeline is the core architecture**: Rule engine first, LLM fallback second, LLM audit pass third. This is not a simple rule-or-LLM fallback — the audit pass reviews and corrects rule classifications.
- **Rich LLM context**: The LLM prompts must include the full Legend category definitions, client list with aliases, Switcher department mappings, and classification rules. Don't rely on pattern recognition alone.
- **Historical backfill**: First sync goes back to Feb 1, 2026. This is the initial data load.
- **Human review is the quality gate**: CSV data has known issues. Iterative testing and tuning of rules/prompts will be needed. Build the pipeline to support this iteration cycle (summary reports, flagged items, audit trail).
- **Upcoming events support**: The pipeline captures 2 weeks of future events with a temporal status marker. The dashboard "upcoming" section (Phase 3) will use this data.

</specifics>

<deferred>
## Deferred Ideas

- **Upcoming events dashboard section** (Phase 3) — visually separate section showing future/scheduled events with clear indicator they haven't happened yet. Should eventually have helpful features built on top of it.
- **Classification feedback loop** (v2 — CLAS-07/08/09) — use audit log corrections to systematically improve rule engine over time. Feed patterns back into the rules.
- **Audit trail UI** (Phase 3) — management views LLM corrections, classification methods, and flagged items through the dashboard admin panel.
- **Iterative rule tuning process** — structured workflow for reviewing classification output, identifying issues, and updating rules. Could be part of Phase 3 admin or a separate process.

</deferred>

---

*Phase: 02-data-pipeline*
*Context gathered: 2026-04-14*
