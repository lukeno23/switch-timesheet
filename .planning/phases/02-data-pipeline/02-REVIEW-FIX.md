---
phase: 02-data-pipeline
fixed_at: 2026-04-14T23:45:00Z
review_path: .planning/phases/02-data-pipeline/02-REVIEW.md
iteration: 1
findings_in_scope: 12
fixed: 11
skipped: 1
status: partial
---

# Phase 02: Code Review Fix Report

**Fixed at:** 2026-04-14T23:45:00Z
**Source review:** .planning/phases/02-data-pipeline/02-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 12 (3 critical + 9 warning)
- Fixed: 11
- Skipped: 1

## Fixed Issues

### CR-01: Authentication Bypass via Empty SYNC_SECRET

**Files modified:** `supabase/functions/sync/index.ts`
**Commit:** 04172e6
**Applied fix:** Removed `?? ""` fallbacks from both `SUPABASE_SERVICE_ROLE_KEY` and `SYNC_SECRET` env var reads. Both paths now use truthiness checks (`authHeader && serviceRoleKey && ...` and `syncSecret && expectedSecret && ...`) so unset env vars cause authentication to always fail for that path.

### CR-02: LLM Audit Row-Index Mismatch Causes Wrong-Event Corrections

**Files modified:** `supabase/functions/_shared/llmAuditPass.ts`
**Commit:** e792a7c
**Applied fix:** Replaced the fragile double-index scheme with a `Map<number, AuditInput>` keyed by expected row numbers (`start + i`). LLM results referencing unrecognized row indices are now skipped via `continue` instead of silently falling back to `batch[0]`.

### CR-03: RLS Enabled But No Policies Defined

**Files modified:** `supabase/migrations/0005_rls_policies.sql` (new file)
**Commit:** 9c89169
**Applied fix:** Created new migration file with `anon` + `authenticated` SELECT policies for `clients`, `client_aliases`, `categories`, `switchers`, `events`, and `sync_runs`. `audit_log` remains restricted to service_role only (sensitive audit data). Existing `0003_rls.sql` was not modified since it has already been applied to production.

### WR-01: LLM Classifier Missing Switcher Name in Prompt Context

**Files modified:** `supabase/functions/_shared/llmClassifier.ts`, `supabase/functions/sync/index.ts`
**Commit:** 8c7cd9c
**Applied fix:** Added optional `eventSwitcherNames` parameter (`Map<number, string>`) to `classifyWithLLM`. Each event line in the user message now includes `Switcher: "{name}"`. The sync orchestrator builds this map from `unresolvedEvents[].switcherName` and passes it to the classifier.

### WR-03: base64urlEncodeBytes Will Fail on Large Signatures

**Files modified:** `supabase/functions/_shared/googleAuth.ts`
**Commit:** d2c6c21
**Applied fix:** Replaced `String.fromCharCode(...bytes)` spread with a loop-based approach that builds the binary string one character at a time, eliminating the argument-count limit risk.

### WR-04: misc_count Can Go Negative

**Files modified:** `supabase/functions/sync/index.ts`
**Commit:** 37f1743
**Applied fix:** Replaced per-event `metrics.misc_count--` decrement with a separate `llmResolved` counter. After the LLM results loop, `metrics.llm_classified` and `metrics.misc_count` are recomputed from `unresolvedEvents.length - llmResolved`, ensuring consistency and preventing negative values.

### WR-05: Zero-Duration Check Uses String Equality Instead of Timestamp Comparison

**Files modified:** `supabase/functions/_shared/eventFilter.ts`, `supabase/functions/sync/index.ts`
**Commit:** aa794bf
**Applied fix:** Changed `isZeroDuration` to compare `new Date(startAt).getTime() === new Date(endAt).getTime()` instead of string equality. Also replaced the inline `startAt === endAt` check in `index.ts` `parseCalendarEvent` with a call to the imported `isZeroDuration` helper.

### WR-06: LLM JSON Parse Without Try-Catch

**Files modified:** `supabase/functions/_shared/llmClassifier.ts`, `supabase/functions/_shared/llmAuditPass.ts`
**Commit:** 469d4e0
**Applied fix:** Wrapped `JSON.parse(text)` in both `callGemini` and `callGeminiAudit` with try-catch blocks that throw descriptive errors including the first 200 characters of the malformed response text.

### WR-07: Audit Update Uses event_id as Primary Key but eventId May Be google_event_id

**Files modified:** `supabase/functions/sync/index.ts`
**Commit:** 5b7a9d6
**Applied fix:** When `upsertClassifiedEvent` returns null, the event is now logged as an error and skipped for audit tracking entirely. The `eventId ?? parsed.google_event_id` fallback (which could pass a Google Calendar ID where a UUID is expected) has been removed.

### WR-08: Missing Input Validation on Backfill Parameters

**Files modified:** `supabase/functions/sync/index.ts`
**Commit:** 1fb43d9
**Applied fix:** Added `YYYY-MM-DD` regex validation for `backfill_start` and `backfill_end` request parameters. Invalid formats now return a 400 response with a clear error message before the sync window is calculated.

### WR-09: Supabase Client Module-Level Initialization Throws on Missing Env

**Files modified:** `supabase/functions/_shared/supabaseClient.ts`
**Commit:** 553d5f6
**Applied fix:** Replaced TypeScript non-null assertion operators (`!`) with explicit runtime checks. If `SUPABASE_URL` or `SUPABASE_SERVICE_ROLE_KEY` is missing, a clear `Error` is thrown at module initialization instead of passing `undefined` into the Supabase client constructor.

## Skipped Issues

### WR-02: Gemini API Key Passed as URL Query Parameter

**File:** `supabase/functions/_shared/llmClassifier.ts:162` and `supabase/functions/_shared/llmAuditPass.ts:135`
**Reason:** The Gemini REST API (`generativelanguage.googleapis.com`) only supports API key authentication via the `?key=` query parameter. There is no `Authorization: Bearer` header alternative for API keys (Bearer auth is only available with OAuth2 access tokens, which require a different auth flow). The review itself notes "this is the standard Gemini pattern so it may be unavoidable." Accepted as a known limitation of the Gemini API.
**Original issue:** API key appears in URL query parameters which can leak through HTTP access logs, CDN logs, and Referer headers.

---

_Fixed: 2026-04-14T23:45:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
