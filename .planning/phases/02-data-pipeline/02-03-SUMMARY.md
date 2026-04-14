---
phase: 02-data-pipeline
plan: 03
subsystem: external-api-integration
tags: [google-calendar, gemini, llm, jwt, deno-web-crypto, structured-output, classification]

# Dependency graph
requires:
  - phase: 02-data-pipeline plan 01
    provides: types.ts interfaces (GoogleCalendarEvent, ParsedEvent, ClassificationResult)
  - phase: 02-data-pipeline plan 02
    provides: ruleEngine.ts (classifyEvent), aliasResolver.ts (resolveClientAlias)
provides:
  - "Google Calendar service account JWT auth (getGoogleAccessToken)"
  - "Paginated calendar event fetcher (fetchCalendarEvents)"
  - "Gemini 2.5 Flash batch LLM classifier with structured output (classifyWithLLM)"
  - "Gemini 2.5 Flash audit pass for rule classifications (auditRuleClassifications)"
  - "Output validator for canonical list enforcement (validateClassifications)"
affects: [02-data-pipeline plan 04 (sync orchestrator)]

# Tech tracking
tech-stack:
  added: [deno-web-crypto-jwt, gemini-structured-output]
  patterns: [manual-jwt-signing, structured-output-with-enum, batch-rate-limiting, output-validation]

key-files:
  created:
    - supabase/functions/_shared/googleAuth.ts
    - supabase/functions/_shared/calendarFetcher.ts
    - supabase/functions/_shared/outputValidator.ts
    - supabase/functions/_shared/llmClassifier.ts
    - supabase/functions/_shared/llmAuditPass.ts
  modified: []

key-decisions:
  - "Manual JWT signing with crypto.subtle instead of google-auth-library (avoids Deno npm compat issues per Research Pitfall 1)"
  - "Gemini structured output with responseSchema enum fields eliminates JSON parse-and-retry loop from classify_with_ai.py"
  - "6-second delay between LLM batches respects Gemini free tier 10 RPM limit"
  - "Invalid LLM audit corrections are silently rejected (treated as agreement) to prevent bad data propagation"
  - "Secrets (service account JSON, Gemini API key) are parameters -- never accessed directly from Deno.env in these modules"

patterns-established:
  - "base64url encoding for JWT components (not standard base64)"
  - "PKCS8 PEM to CryptoKey pipeline: strip headers, decode base64, importKey"
  - "Gemini responseSchema with ARRAY/OBJECT/enum for guaranteed-valid JSON"
  - "Post-LLM validation via canonical set membership check"
  - "Batch processing with configurable delay for API rate limits"

requirements-completed: [PIPE-01, PIPE-02, CLAS-02, CLAS-03, CLAS-06]

# Metrics
duration: 4min
completed: 2026-04-14
---

# Phase 02 Plan 03: Google Calendar API + LLM Classification Modules Summary

**Google Calendar JWT auth with Deno Web Crypto, paginated event fetcher, Gemini 2.5 Flash batch classifier with structured output enum validation, audit pass for rule-classified events, and canonical output validator**

## Performance

- **Duration:** 4 min
- **Started:** 2026-04-14T18:39:42Z
- **Completed:** 2026-04-14T18:44:06Z
- **Tasks:** 2
- **Files created:** 5

## Accomplishments
- Google service account JWT signing using Deno Web Crypto API (RSA-SHA256 PKCS8) with domain-wide delegation via sub claim for any Switcher's calendar
- Paginated Google Calendar Events.list fetch with singleEvents=true (expands recurring events), requests only needed fields (no location per D-20)
- Gemini 2.5 Flash batch LLM classifier: structured output with responseSchema enum fields, temperature 0.1, 80 events per batch, 6s inter-batch delay
- LLM audit pass reviews borderline + sampled confident rule classifications, validates corrections before acceptance
- Output validator performs case-insensitive membership checks against canonical client/category/department sets

## Task Commits

Each task was committed atomically:

1. **Task 1: Google Calendar API auth and event fetcher** - `06d8766` (feat)
2. **Task 2: LLM classifier, audit pass, and output validator** - `f88c9ee` (feat)

## Files Created/Modified
- `supabase/functions/_shared/googleAuth.ts` - 122 lines: JWT header/claims construction, PKCS8 key import, RSA-SHA256 signing, token exchange at oauth2.googleapis.com
- `supabase/functions/_shared/calendarFetcher.ts` - 69 lines: Paginated Events.list with singleEvents=true, field selection, nextPageToken loop
- `supabase/functions/_shared/outputValidator.ts` - 90 lines: Case-insensitive validation of LLM output against canonical client/category/department sets
- `supabase/functions/_shared/llmClassifier.ts` - 345 lines: Full system prompt with category descriptions, client list, Switcher context, department rules; Gemini structured output; batch processing with rate limiting; validation integration
- `supabase/functions/_shared/llmAuditPass.ts` - 348 lines: Audit-focused prompt; structured output with agrees boolean; correction validation; graceful error handling

## Decisions Made
- **Manual JWT over google-auth-library:** Implemented ~120 lines of JWT signing using crypto.subtle rather than importing google-auth-library, per Research Pitfall 1 (gcp-metadata Deno compat issues)
- **Structured output eliminates retry loops:** Used responseMimeType + responseSchema with enum fields, eliminating the JSON parse-and-retry loop from the Python classify_with_ai.py reference
- **6-second batch delay:** Matches Gemini free tier 10 RPM constraint (T-02-10); sufficient for nightly batch of ~200 events
- **Rejected corrections treated as agreement:** When the LLM audit provides corrections that fail canonical validation, the original rule classification is retained rather than flagging for manual review
- **Secrets as parameters:** googleAuth receives serviceAccountJson as a string parameter; llmClassifier and llmAuditPass receive geminiApiKey as parameters. The caller (sync orchestrator in Plan 04) reads these from Deno.env.get

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
- Google service account with domain-wide delegation must be created by Luke (Google Workspace admin) before calendar fetch can work in production
- Gemini API key must be set as Supabase Edge Function secret (GEMINI_API_KEY)
- Google service account JSON must be set as Supabase Edge Function secret (GOOGLE_SERVICE_ACCOUNT_JSON)

## Next Phase Readiness
- All 5 modules ready for integration by sync orchestrator (Plan 04):
  - `getGoogleAccessToken(serviceAccountJson, userEmail)` -> Bearer token
  - `fetchCalendarEvents(accessToken, calendarId, timeMin, timeMax)` -> GoogleCalendarEvent[]
  - `classifyWithLLM(events, apiKey, categories, clients, depts, switcherCtx)` -> classified results
  - `auditRuleClassifications(events, apiKey, categories, clients, depts)` -> AuditResult[]
  - `validateClassifications(results, clients, categories, depts)` -> ValidationResult[]
- Import paths follow established pattern: `import { fn } from "./_shared/module.ts"`

## Self-Check: PASSED

All 5 created files verified on disk. Both task commits (06d8766, f88c9ee) verified in git log.

---
*Phase: 02-data-pipeline*
*Completed: 2026-04-14*
