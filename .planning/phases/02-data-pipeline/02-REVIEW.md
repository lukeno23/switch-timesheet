---
phase: 02-data-pipeline
reviewed: 2026-04-15T10:15:00Z
depth: standard
files_reviewed: 24
files_reviewed_list:
  - .github/workflows/ci.yml
  - supabase/config.toml
  - supabase/functions/_shared/aliasResolver.ts
  - supabase/functions/_shared/calendarFetcher.ts
  - supabase/functions/_shared/eventFilter.ts
  - supabase/functions/_shared/googleAuth.ts
  - supabase/functions/_shared/llmAuditPass.ts
  - supabase/functions/_shared/llmClassifier.ts
  - supabase/functions/_shared/outputValidator.ts
  - supabase/functions/_shared/ruleEngine.ts
  - supabase/functions/_shared/supabaseClient.ts
  - supabase/functions/_shared/titleParser.ts
  - supabase/functions/_shared/types.ts
  - supabase/functions/sync/deno.json
  - supabase/functions/sync/index.ts
  - supabase/functions/tests/eventFilter-test.ts
  - supabase/functions/tests/fixtures/calendarEvents.json
  - supabase/functions/tests/fixtures/sampleEvents.ts
  - supabase/functions/tests/ruleEngine-test.ts
  - supabase/migrations/0000_extensions.sql
  - supabase/migrations/0001_schema.sql
  - supabase/migrations/0002_seed.sql
  - supabase/migrations/0003_rls.sql
  - supabase/migrations/0004_cron_schedule.sql
findings:
  critical: 3
  warning: 9
  info: 5
  total: 17
status: issues_found
---

# Phase 02: Code Review Report

**Reviewed:** 2026-04-15T10:15:00Z
**Depth:** standard
**Files Reviewed:** 24
**Status:** issues_found

## Summary

The Phase 02 data pipeline implements a calendar-sync Edge Function with rule-based + LLM classification, Supabase storage, and cron scheduling. The architecture is well-structured with clear module separation (fetcher, filter, parser, classifier, validator, audit). The rule engine is thoroughly tested and the code quality is generally high.

Key concerns center on: (1) a timing-based authentication vulnerability that enables bypass via empty secrets, (2) a data-corruption bug in the LLM audit pass where row indexing can map corrections to wrong events, and (3) missing RLS policies that leave tables open to anon reads if any API exposure is configured. There are also several robustness issues around LLM response handling and error propagation.

## Critical Issues

### CR-01: Authentication Bypass via Empty SYNC_SECRET

**File:** `supabase/functions/sync/index.ts:55`
**Issue:** When `SYNC_SECRET` environment variable is not set (or is empty string), the authentication check still passes if the request sends an empty `x-sync-secret` header. The code compares `syncSecret && expectedSecret && syncSecret === expectedSecret` but `expectedSecret` defaults to `""` via `?? ""`. If the env var is unset, `expectedSecret` is `""`. An attacker sending `x-sync-secret: ""` would have `syncSecret = ""` which is falsy, so the `&&` short-circuits. However, the _real_ danger is the service role key path: if `SUPABASE_SERVICE_ROLE_KEY` is unset, `serviceRoleKey` defaults to `""`, and `authHeader === "Bearer "` would match any request with that exact header value. A request with `Authorization: Bearer ` (trailing space) would be authorized.

**Fix:**
```typescript
function authenticateRequest(req: Request): Response | null {
  // Check for cron trigger: Authorization Bearer with service role key
  const authHeader = req.headers.get("authorization");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (authHeader && serviceRoleKey && authHeader === `Bearer ${serviceRoleKey}`) {
    return null; // Authorized
  }

  // Check for manual trigger: x-sync-secret header
  const syncSecret = req.headers.get("x-sync-secret");
  const expectedSecret = Deno.env.get("SYNC_SECRET");
  if (syncSecret && expectedSecret && syncSecret === expectedSecret) {
    return null; // Authorized
  }

  return new Response(JSON.stringify({ error: "Unauthorized" }), {
    status: 401,
    headers: { "Content-Type": "application/json" },
  });
}
```
Remove the `?? ""` fallbacks and use truthiness checks on the env vars directly. If the env var is not set, authentication via that path should always fail.

### CR-02: LLM Audit Row-Index Mismatch Causes Wrong-Event Corrections

**File:** `supabase/functions/_shared/llmAuditPass.ts:260-264`
**Issue:** The audit result processing uses a confusing double-index scheme that can assign corrections to the wrong events. The code iterates `rawResults` by index `i`, but then also reads `r.row` from the LLM response to find the event. The line `const event = batch[i] ?? batch[0]` is a fallback that silently maps any overflow to the first event. Then `rowIdx = r.row ?? start + i` and `eventRef = rowIdx < batch.length ? batch[rowIdx - start] : event` introduces another path where `rowIdx - start` could be negative or out of bounds if the LLM returns unexpected row numbers.

If the LLM returns fewer results than the batch size, or returns rows out of order, corrections get applied to wrong events in the database -- silently corrupting classifications.

**Fix:**
```typescript
// Build a lookup from the batch for safe access
const eventLookup = new Map<number, AuditInput>();
for (let i = 0; i < batch.length; i++) {
  eventLookup.set(start + i, batch[i]);
}

for (const r of rawResults) {
  const rowIdx = r.row ?? -1;
  const eventRef = eventLookup.get(rowIdx);
  if (!eventRef) {
    // LLM returned an unrecognized row index -- skip this result
    continue;
  }
  // ... process with eventRef
}
```
Use a Map keyed by expected row numbers. Skip any LLM result that references an unrecognized row. Never silently fall back to `batch[0]`.

### CR-03: RLS Enabled But No Policies Defined -- Tables Locked to Everyone Including Dashboard

**File:** `supabase/migrations/0003_rls.sql:1-14`
**Issue:** RLS is enabled on all 7 tables but no SELECT policies are created for any role. While the service role key bypasses RLS (correct for Edge Functions), this means the dashboard frontend has no way to read data through the Supabase client unless it also uses the service role key (which would be a security anti-pattern -- exposing the service role key to the browser). There are no `authenticated` role policies for dashboard users (the 6 management users mentioned in CLAUDE.md).

This is either: (a) a missing implementation that will block the dashboard from reading any data, or (b) an intentional deferral. If (b), it should be documented. If (a), it needs policies before the dashboard can function.

**Fix:** Add read policies for authenticated users. Example:
```sql
-- Allow authenticated users to read events, switchers, clients, categories
CREATE POLICY "authenticated_read_events" ON events
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_read_switchers" ON switchers
  FOR SELECT TO authenticated USING (true);

-- Similar for clients, client_aliases, categories, sync_runs
-- audit_log may need restricted access
```

## Warnings

### WR-01: LLM Classifier Missing Switcher Name in Prompt Context

**File:** `supabase/functions/sync/index.ts:571-575` and `supabase/functions/_shared/llmClassifier.ts:284-289`
**Issue:** The LLM classifier builds user messages with `Title`, `Task`, and `Client field` but does NOT include the Switcher name for each event, even though the system prompt includes Switcher-specific department assignment rules (Ed, Lisa, Designers). The `switcherContext` Map is passed to `buildSystemPrompt` but never used per-event in the user message. This means the LLM cannot correctly apply Rules 4-7 (Ed/Lisa/Designer special handling) for unresolved events.

**Fix:** Include the Switcher name in each event line:
```typescript
const lines = batch.map((event, i) => {
  const rowNum = start + i;
  const switcherName = eventSwitcherNames.get(rowNum) ?? "Unknown";
  return `Row ${rowNum}: Switcher: "${switcherName}", Title: "${event.title}", Task: "${event.task_details}", Client field: "${event.client_name_raw}"`;
});
```
This requires passing Switcher name mappings through to the classifier (the orchestrator already has this data in `unresolvedEvents[].switcherName`).

### WR-02: Gemini API Key Passed as URL Query Parameter

**File:** `supabase/functions/_shared/llmClassifier.ts:162` and `supabase/functions/_shared/llmAuditPass.ts:135`
**Issue:** The Gemini API key is passed as a URL query parameter (`?key=${apiKey}`). While this is how the Gemini API works, query parameters appear in HTTP access logs, CDN logs, and can leak through Referer headers. This is the standard Gemini pattern so it may be unavoidable, but it is worth noting as a security consideration. If Gemini supports Authorization header-based auth, that would be preferable.

**Fix:** Check if Gemini API supports `Authorization: Bearer <key>` header authentication as an alternative. If not, accept this as a known limitation and ensure logs are not exposed.

### WR-03: base64urlEncodeBytes Will Fail on Large Signatures (Stack Overflow)

**File:** `supabase/functions/_shared/googleAuth.ts:20`
**Issue:** `String.fromCharCode(...bytes)` uses the spread operator on a `Uint8Array`. For RSA-256 signatures (256 bytes), this creates a 256-argument function call. While 256 arguments is within limits, this pattern is known to fail at larger sizes and is a fragile idiom. If the key type ever changes to RSA-4096 (512 bytes), this could hit engine-specific argument limits.

**Fix:** Use a loop-based approach:
```typescript
function base64urlEncodeBytes(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}
```

### WR-04: misc_count Can Go Negative

**File:** `supabase/functions/sync/index.ts:612`
**Issue:** When the LLM successfully classifies an event, `metrics.misc_count--` decrements the counter. But `misc_count` was incremented per-Switcher in the rule classification loop, and `llmResults.length` may exceed `unresolvedEvents.length` if the LLM returns extra rows, or the iteration logic could decrement more than was incremented. While unlikely, a negative misc_count in the sync_runs record would be confusing. More importantly, if a Gemini call fails for one batch but succeeds for another, the math could be inconsistent since the catch block in section G does not adjust metrics.

**Fix:** Track with a separate counter:
```typescript
let llmResolved = 0;
// ... in loop:
if (result.valid) {
  llmResolved++;
  // ...
}
// After loop:
metrics.llm_classified = llmResolved;
metrics.misc_count = unresolvedEvents.length - llmResolved;
```

### WR-05: Zero-Duration Check Uses String Equality Instead of Timestamp Comparison

**File:** `supabase/functions/_shared/eventFilter.ts:124-126` and `supabase/functions/sync/index.ts:217`
**Issue:** `isZeroDuration` compares `startAt === endAt` as string equality. Two timestamps representing the same instant can have different string representations (e.g., `"2026-02-23T09:00:00+01:00"` vs `"2026-02-23T08:00:00Z"`). The Google Calendar API likely returns consistent formatting for a single event, but this is an implicit assumption. If Google ever normalizes differently, zero-duration events would slip through.

**Fix:** Compare parsed timestamps:
```typescript
export function isZeroDuration(startAt: string, endAt: string): boolean {
  return new Date(startAt).getTime() === new Date(endAt).getTime();
}
```

### WR-06: LLM JSON Parse Without Try-Catch

**File:** `supabase/functions/_shared/llmClassifier.ts:197` and `supabase/functions/_shared/llmAuditPass.ts:170`
**Issue:** `JSON.parse(text)` is called on the LLM response text without a try-catch. While Gemini's `responseMimeType: "application/json"` should guarantee valid JSON, LLM outputs can still be malformed (truncated responses, content filtering, etc.). A `SyntaxError` here would bubble up and be caught by the outer catch in the batch loop, which would mark the entire batch as failed/agreed rather than isolating the parse failure.

**Fix:** Wrap in try-catch with a descriptive error:
```typescript
try {
  return JSON.parse(text);
} catch {
  throw new Error(`Gemini returned invalid JSON: ${text.slice(0, 200)}`);
}
```

### WR-07: Audit Update Uses event_id as Primary Key but eventId May Be google_event_id

**File:** `supabase/functions/sync/index.ts:665-668`
**Issue:** The audit correction update uses `.eq("id", result.event_id)` where `result.event_id` comes from `e.eventId` which is set as `eventId ?? parsed.google_event_id` (line 520-522). The `eventId` is the return value of `upsertClassifiedEvent` which returns the DB UUID. But if the upsert returns `null`, the fallback is `parsed.google_event_id` (a Google Calendar ID string, not a UUID). Updating `.eq("id", result.event_id)` with a Google Calendar ID instead of a UUID would silently match zero rows, losing the audit correction.

**Fix:** Ensure the event_id used for audit is always the DB UUID:
```typescript
const eventId = await upsertClassifiedEvent(/* ... */);
if (!eventId) {
  metrics.errors[switcher.name + "_upsert"] = `Upsert returned null for ${parsed.google_event_id}`;
  continue;
}
// Use only eventId (UUID) for audit tracking
```

### WR-08: Missing Input Validation on Backfill Parameters

**File:** `supabase/functions/sync/index.ts:352-356`
**Issue:** The `backfill_start` and `backfill_end` parameters from the request body are passed directly to `calculateSyncWindow` and then into SQL queries via `window.start`/`window.end` without format validation. While these are used as date parameters in Supabase RPC calls (which use parameterized queries, preventing SQL injection), invalid date strings could cause runtime errors or unexpected behavior (e.g., `backfill_start: "not-a-date"` would produce `"not-a-dateT00:00:00Z"` as the RFC3339 string, which would fail at the Google Calendar API).

**Fix:** Validate date format before use:
```typescript
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
if (backfillStart && !DATE_REGEX.test(backfillStart)) {
  return new Response(JSON.stringify({ error: "Invalid backfill_start format. Expected YYYY-MM-DD." }), {
    status: 400, headers: { "Content-Type": "application/json" },
  });
}
```

### WR-09: Supabase Client Module-Level Initialization Throws on Missing Env

**File:** `supabase/functions/_shared/supabaseClient.ts:9-10`
**Issue:** `Deno.env.get("SUPABASE_URL")!` and `Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!` use the non-null assertion operator. If these env vars are missing, the values will be `undefined` (Deno.env.get returns `string | undefined`), and the non-null assertion does not prevent runtime errors -- it only suppresses TypeScript compiler warnings. The `createClient` call on line 12 would receive `undefined` as URL and key, likely throwing a confusing error deep in the Supabase client library rather than at the point of misconfiguration.

**Fix:** Add explicit checks:
```typescript
const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error("Missing required environment variables: SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY");
}
```

## Info

### IN-01: Unused Import `isNonClientName` in Sync Orchestrator

**File:** `supabase/functions/sync/index.ts:20`
**Issue:** `isNonClientName` is imported from `aliasResolver.ts` but never used in `index.ts`. The non-client name check is presumably handled elsewhere in the pipeline (perhaps implicitly by the rule engine or LLM), but the unused import adds dead code.

**Fix:** Remove the unused import:
```typescript
import { buildAliasMap, resolveClientAlias } from "../_shared/aliasResolver.ts";
```

### IN-02: Unused Import `resolveClientAlias` in Sync Orchestrator

**File:** `supabase/functions/sync/index.ts:20`
**Issue:** `resolveClientAlias` is imported but never called directly in `index.ts`. The alias resolution is done inside `classifyEvent` in the rule engine when the `aliasMap` is passed. The direct import is unnecessary.

**Fix:** Remove from the import line.

### IN-03: `isZeroDuration` and `isPersonalEvent` Imported But Redundantly Applied

**File:** `supabase/functions/sync/index.ts:18`
**Issue:** `isZeroDuration` is imported but only used indirectly -- the `parseCalendarEvent` function on line 217 performs `startAt === endAt` directly rather than calling the imported helper. The function `isPersonalEvent` is imported and used in `parseCalendarEvent` (line 233), which is correct. `isWeekendEvent` is imported and used (line 225). But `isZeroDuration` itself from the import is never called. The inline check on line 217 duplicates the logic.

**Fix:** Either use the imported function or remove the import:
```typescript
if (isZeroDuration(startAt, endAt)) {
  return null;
}
```

### IN-04: `_dbEventId` Mutates ParsedEvent With Undeclared Property

**File:** `supabase/functions/sync/index.ts:546-548`
**Issue:** The code uses `(parsed as ParsedEvent & { _dbEventId?: string })._dbEventId = eventId` to attach a DB event ID to the parsed event for later LLM update. But this property is never read -- the LLM update section (lines 596-608) uses `eventInfo.switcherId` and `eventInfo.parsed.google_event_id` directly. The `_dbEventId` mutation is dead code.

**Fix:** Remove the dead code block (lines 544-548).

### IN-05: CI Pipeline Missing Deno Test Execution

**File:** `.github/workflows/ci.yml:27-28`
**Issue:** The CI pipeline runs `deno check` (type-checking) on the Edge Function entry point but does not run the Deno test suite (`supabase/functions/tests/`). The existing test files (`eventFilter-test.ts`, `ruleEngine-test.ts`) use `Deno.test` and `assertEquals` but are never executed in CI.

**Fix:** Add a Deno test step:
```yaml
      - name: Run Deno Edge Function tests
        run: deno test supabase/functions/tests/ --allow-read
```

---

_Reviewed: 2026-04-15T10:15:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
