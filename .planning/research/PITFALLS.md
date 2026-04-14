# Pitfalls Research

**Domain:** Automated timesheet analytics — Google Calendar integration, LLM classification pipeline, Supabase backend, React dashboard
**Researched:** 2026-04-14
**Confidence:** HIGH (Google Calendar API, Supabase limits — official docs); MEDIUM (LLM classification patterns — multiple sources); HIGH (React refactoring — well-established patterns)

---

## Critical Pitfalls

### Pitfall 1: Service Account Quota Charged to Service Account, Not Impersonated User

**What goes wrong:**
When using domain-wide delegation, the Google Calendar API charges all requests against the service account's "per minute per project per user" quota — not against the individual Switchers being impersonated. Fetching 15 calendars in a loop will exhaust the per-user quota as if one user made all 15 × N requests. You get `403 rateLimitExceeded` or `429` mid-sync without any obvious cause.

**Why it happens:**
Developers follow the happy-path OAuth2 impersonation setup, get it working in testing with a small date range, then hit quota in production when running across 15 users or a longer lookback window.

**How to avoid:**
Pass the `quotaUser` parameter (or `x-goog-quota-user` HTTP header) on every Calendar API request, set to the email of the impersonated user. This correctly attributes quota usage per-user rather than concentrating it on the service account. Also implement exponential backoff on 403/429 responses — the Google Calendar API returns both codes for rate limiting and they should be handled identically.

**Warning signs:**
- Sync succeeds for first 2-3 Switchers then starts failing
- Errors reference "calendar usage limits exceeded" even though total request count looks fine
- The issue only appears when processing multiple users sequentially

**Phase to address:** Calendar integration / backend sync setup phase

---

### Pitfall 2: Missing `subject` Claim Causes Silent Auth Failure

**What goes wrong:**
Service account JWTs for domain-wide delegation require a `sub` claim set to the email address of the user being impersonated. Omitting it causes the API to return the service account's own (empty) calendar or throw a `401 Unauthorized` / `403 Access Denied` — not an obvious "missing subject" error.

**Why it happens:**
Documentation for domain-wide delegation emphasizes setting up the service account and granting scopes in Google Workspace Admin. The `subject`/`sub` claim requirement is buried in a separate section. Developers who've used service accounts for GCS or BigQuery (where no impersonation is needed) are especially likely to miss it.

**How to avoid:**
When constructing the Google Auth client, always pass the `subject` option set to the Switcher's email. In the Node.js `google-auth-library`:
```js
const auth = new google.auth.GoogleAuth({
  credentials: serviceAccountJson,
  scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
  clientOptions: { subject: 'switcher@switchmalta.com' }
});
```
Write a small standalone test that impersonates one Switcher and lists their events before building the full sync loop.

**Warning signs:**
- API returns an empty events list (not an error) for the first sync run
- Works fine for the service account's own calendar in a test but not for Switcher calendars
- Auth setup with a non-domain-wide account works, but domain account doesn't

**Phase to address:** Calendar integration / backend sync setup phase

---

### Pitfall 3: Sync Token Expiry Causes 410 Errors with No Recovery Logic

**What goes wrong:**
Google Calendar sync tokens (used for incremental sync) expire and are invalidated by the server for reasons including token age, ACL changes, and large batch updates. If the Edge Function doesn't handle `410 Gone` responses, the nightly sync silently fails or crashes, leaving data stale for an unknown period. Worse, the code may keep retrying with the dead token.

**Why it happens:**
The sync token strategy is well-documented for "happy path" incremental syncs. The 410 edge case is mentioned but easy to skip when shipping an MVP. The failure may not appear for weeks or months of stable usage.

**How to avoid:**
Store sync tokens per Switcher in a Supabase table. On any 410 response, delete that Switcher's sync token and trigger a full re-sync for their calendar only. Full re-sync should upsert (not insert) events so it doesn't duplicate data. Implement this before the nightly sync goes live — it is not an edge case to defer.

**Warning signs:**
- Dashboard data stops updating but no error is surfaced in logs
- A sync run that previously took 30 seconds suddenly takes much longer (full re-sync occurring)
- Database shows a `410` error in a sync log table (if you have one) but no automated recovery

**Phase to address:** Calendar integration / backend sync setup phase

---

### Pitfall 4: Edge Function 150-Second Wall-Clock Timeout on Free Tier

**What goes wrong:**
Supabase Edge Functions on the free plan have a hard 150-second wall-clock timeout. A nightly sync that fetches 15 Switcher calendars, then runs classification on all new events, then calls Gemini for ambiguous ones, can easily exceed this. The function gets killed mid-run, leaving some Switchers synced and others not. There is no automatic resume.

**Why it happens:**
Developers scope the work as "one nightly function" because that's the simplest mental model. The 150-second limit is not immediately visible — it only bites when processing takes longer than a test run with a small dataset.

**How to avoid:**
Split the pipeline into two separate scheduled functions that run at different times:
1. **Sync function** — fetches calendar events and writes raw events to a `calendar_events_raw` table (fast, ~30-60 seconds for 15 users)
2. **Classification function** — reads unclassified events from the staging table, applies rules + LLM, writes to the final table (can process in batches, restartable)

Use a `classification_status` column (`pending`, `processing`, `classified`, `failed`) on the events table. If the classification function times out, it picks up `pending` events on the next run. This makes both functions restartable and independently observable.

**Warning signs:**
- Sync runs fine for small date ranges but fails for larger ones
- Some Switchers' data updates but others don't, with no error logged
- Function invocation logs show a wall-clock-time-limit-reached shutdown reason

**Phase to address:** Backend architecture / sync pipeline design phase

---

### Pitfall 5: LLM Returns Plausible-But-Wrong Classifications with No Validation

**What goes wrong:**
Gemini will confidently return a client name or task category that sounds reasonable but doesn't match the canonical list. For example, it might return `"Palazzo"` instead of `"Palazzo Parisio"`, or invent a category like `"Social Strategy"` instead of mapping to `"Social Media"`. These pass JSON parsing but silently corrupt your analytics. With ~200 events/day this adds up quickly.

**Why it happens:**
LLM structured output enforces JSON format but not semantic validity against your specific reference data. The prompt says "choose from this list" but the model may paraphrase or hallucinate variants, especially for client names with many aliases.

**How to avoid:**
After every LLM response, validate the returned `client_name` and `task_category` against the canonical lists from your Supabase `clients` and `task_categories` tables before writing to the database. If the validation fails, mark the event `classification_status = 'llm_invalid'` and log it — do not silently fall back to a default. Periodically review the `llm_invalid` queue and use those failures to improve the prompt's list or add client aliases. Use Gemini's `responseSchema` with `enum` types for constrained fields where possible.

**Warning signs:**
- Client totals in the dashboard don't match management's rough mental model
- A new alias for a client (`FYO` → Fyorin) is added, but old LLM-classified events still show the alias
- Query for `DISTINCT client_name` returns variants not in the canonical list

**Phase to address:** Classification pipeline design phase

---

### Pitfall 6: No Idempotency on the Sync — Duplicate Events on Retry

**What goes wrong:**
If the sync function fails partway through and is retried (or manually rerun), events already written to the database get inserted again, creating duplicate rows. Analytics then double-count time for affected Switchers.

**Why it happens:**
Developers use `INSERT` rather than `UPSERT`. The first run works. A retry scenario doesn't surface in development or early testing because failures are rare.

**How to avoid:**
Use the Google Calendar event ID (returned in every `events.list` response as `event.id`) as the primary key or a unique constraint on the `calendar_events` table. All writes to the database must use upsert (`INSERT ... ON CONFLICT (google_event_id) DO UPDATE`). This makes every sync run idempotent: re-running produces no duplicates, only updates.

**Warning signs:**
- Total hours for a period suddenly doubles after a sync failure and retry
- The same event appears multiple times in the detail view
- Database row counts grow faster than expected relative to calendar activity

**Phase to address:** Database schema design phase (must be in place before first sync run)

---

### Pitfall 7: Refactoring App.jsx Breaks Working Features

**What goes wrong:**
Extracting components from a 2150-line monolithic file is straightforward to plan but easy to break. Shared state — especially the filtered dataset, date range, and AI report cache — gets duplicated, split incorrectly, or loses reactivity when moved to context or props. The existing app works; a bad refactor ships a regression.

**Why it happens:**
The monolith works because all state is co-located. When you split it, you must identify the correct ownership for each piece of state. Developers often move component markup without moving the correct state slice, or they create a new context but forget to thread it through all consuming components.

**How to avoid:**
Use the strangler pattern: extract one self-contained view (e.g., the `SwitchersView`) into its own file first, keep the same props interface, verify it renders identically, then continue. Do not refactor and add new features simultaneously. Establish a snapshot test or visual comparison baseline before any refactoring begins. The AI report caching bug (stale reports on date range change) should be fixed in the same pass, not deferred.

**Warning signs:**
- A chart that worked before refactoring now shows no data
- The date range filter affects some views but not others
- Console shows re-render cycles that didn't exist before

**Phase to address:** Codebase refactor phase (must precede feature additions that depend on the new component boundaries)

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Hardcode Switcher list in Edge Function config | Avoids building admin UI | Management can't update roster without a code deploy | Never — admin UI is in scope |
| Store service account JSON as a single env variable | Simple setup | JSON is large, env vars have size limits; secrets rotation is painful | MVP only if there are fewer than 5 secrets |
| Skip classification_status column, classify synchronously in sync function | Simpler pipeline | Any timeout kills the whole pipeline; no recovery | Never — free tier timeout makes this a guaranteed future failure |
| Run LLM on every event regardless of rule confidence | Simpler code | Cost accumulates; slow; rate limits hit faster | Never — hybrid routing is cheap to implement |
| Use `dangerouslySetInnerHTML` without DOMPurify for Gemini output | Gemini HTML renders correctly | XSS vector from any prompt injection or malicious calendar event title that reaches the AI | Never — DOMPurify install is two minutes |
| Keep App.jsx as monolith and add new Supabase data fetching inside it | Faster first iteration | State management becomes unworkable; impossible to test data fetching in isolation | Never — this is explicitly a blocking tech debt item |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|-----------------|
| Google Calendar API (domain-wide delegation) | Authenticating without `subject` claim returns service account's calendar | Always set `subject` to the impersonated user's email on every request |
| Google Calendar API (domain-wide delegation) | Quota charged to service account, hitting per-user limits | Pass `quotaUser` header set to impersonated user email |
| Google Calendar API (incremental sync) | Ignoring `410 Gone` and retrying with expired sync token | Catch 410, delete token, trigger full re-sync for that user only |
| Supabase Edge Functions | Treating 150s wall-clock limit as a soft suggestion | Design pipeline so each function completes well under 100s; use status columns for restartability |
| Supabase (free tier) | Project pauses after 7 days inactivity | The nightly cron job itself prevents pausing; verify the cron is actually firing, not just scheduled |
| Supabase (service role key) | Using service role key in client-side code | Service role key only in Edge Functions; anon key in browser |
| Gemini API (classification) | Prompting with "choose from this list" without validating output against that list | Post-process LLM output with strict enum validation before database write |
| Gemini API (structured output) | SDK-level schema validation rejecting `additionalProperties` (SDK bug as of Nov 2025) | Use `responseSchema` with simple enum types; avoid `additionalProperties` in schema definition |
| Vercel (SPA routing) | Forgetting `vercel.json` SPA fallback rewrite after migration from GitHub Pages | Add `{"rewrites": [{"source": "/(.*)", "destination": "/index.html"}]}` in vercel.json |
| Vercel (environment variables) | Moving from GitHub Secrets at build time to Vercel without re-setting env vars | Set all environment variables in Vercel dashboard; prefix with `VITE_` for client-side access |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| `Math.min/max(...largeArray)` spread | Stack overflow, silent wrong values | Replace with `array.reduce()` or `Math.min.apply(null, arr)` | ~100k array elements; existing code already has this |
| Fetching all calendar events on every dashboard load | Slow initial load, Supabase read quota consumed | Paginate queries; use React Query with stale-while-revalidate; filter at database level | 5000+ rows in the events table |
| Classifying every event with LLM synchronously in the Edge Function | Function timeout, sequential Gemini calls take ~1s each | Batch LLM calls; run rules first, LLM only on `needs_review` events; async classification pipeline | More than ~100 events needing LLM classification in one run (~100s just for LLM calls) |
| Full calendar re-sync every night instead of incremental | Supabase row write quota consumed; slow sync | Store sync tokens per Switcher; use incremental sync once initial data exists | Any period with >500 events/night total |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Rendering unsanitized Gemini HTML with `dangerouslySetInnerHTML` | XSS: malicious calendar event title reaches Gemini prompt, response contains script injection | Install DOMPurify; wrap every `dangerouslySetInnerHTML` usage: `{ __html: DOMPurify.sanitize(html) }` |
| Exposing Supabase service role key in frontend bundle | Any user can bypass RLS and read/modify all data | Service role key only in Edge Functions via Supabase secrets; frontend uses anon key only |
| Exposing Google service account JSON in frontend or version control | Full impersonation access to all 15 Switcher calendars | Store as Supabase secret or Vercel environment variable; add to .gitignore; audit existing commits |
| Simple password stored in `localStorage` | Password extractable by any script on the page; no expiry | Use a short-lived JWT or session cookie; even for a simple internal tool, don't store raw passwords client-side |
| No RLS on Supabase tables | Any anon key holder can read all timesheet data | Enable RLS on every table; use service role only in Edge Functions; verify with anon key in testing |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| No sync status visibility | Management sees stale data and doesn't know why; trust in the tool erodes | Add a "last synced" timestamp to the dashboard header; surface any sync errors prominently |
| Classification failures silently discarded | Events disappear from totals; "hours don't add up" complaints | Show a count of `unclassified` or `needs_review` events somewhere accessible; don't hide data quality issues |
| Admin changes (new client alias) don't retroactively reclassify | Adding `FYO` as a Fyorin alias fixes future syncs but not the last 3 months | When an alias is added, trigger a re-classification pass on historical events matching that alias |
| Date range change doesn't invalidate AI report | Management sees a report for the wrong period without realising | AI report generation must be keyed on date range; stale report bug is already known — fix it in the refactor phase |
| Password prompt appears on every page refresh | Frustrating for daily users | Use a session cookie or `sessionStorage` with a reasonable TTL (e.g., 8 hours) |

---

## "Looks Done But Isn't" Checklist

- [ ] **Calendar sync:** Verify sync handles 15 Switchers, not just the test account — run with all 15 emails and confirm events appear for each
- [ ] **Sync token recovery:** Manually delete a sync token from the database and verify the next sync run recovers with a full re-sync rather than erroring
- [ ] **Classification idempotency:** Run the sync function twice for the same date range — confirm event count in the database doesn't change on the second run
- [ ] **LLM output validation:** Deliberately prompt Gemini with an ambiguous event title and verify the validation layer rejects any output not in the canonical client/category lists
- [ ] **Edge Function timeout:** Run a sync covering a 60-day range and monitor wall-clock execution time — confirm it completes under 100 seconds
- [ ] **Vercel deployment:** Test all dashboard routes by navigating directly to them (not via the app) — confirm no 404s from missing SPA fallback
- [ ] **XSS fix:** Inspect `dangerouslySetInnerHTML` usage after the DOMPurify fix — confirm all usages are wrapped, not just the first one found
- [ ] **Free tier pausing:** Verify the nightly cron is actually executing by checking Supabase cron logs, not just that it was scheduled

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Quota exhaustion mid-sync | LOW | Add exponential backoff + `quotaUser` param; re-run sync for affected Switchers |
| Sync token 410 with no recovery logic | MEDIUM | Add 410 handler; manually delete stale tokens; run full re-sync; verify idempotency before re-sync |
| Duplicate events from non-idempotent inserts | HIGH | Add unique constraint on `google_event_id`; write deduplication query to remove existing duplicates; test upsert on clean state |
| LLM hallucinated classifications in database | MEDIUM | Query for client_name values not in canonical list; re-classify affected events; add validation layer going forward |
| Edge Function timeout killing pipeline | MEDIUM | Split into two functions (sync + classify); add status column; process events in batches of 50 |
| Broken dashboard after App.jsx refactor | MEDIUM | Git revert to last working state; re-extract components one at a time with visual verification between each |
| Service account JSON committed to git | HIGH | Rotate credentials immediately in Google Cloud Console; remove from git history with `git filter-repo`; audit access logs |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Service account quota / `quotaUser` missing | Calendar integration setup | Integration test: sync all 15 Switchers, confirm no 403/429 errors |
| Missing `subject` claim | Calendar integration setup | Unit test: impersonate one Switcher, verify events returned are theirs |
| Sync token 410 recovery | Calendar integration setup | Manual test: delete token, verify next run recovers gracefully |
| Edge Function 150s timeout | Backend architecture design | Load test: run sync over 60-day range, confirm completion under 100s |
| Duplicate events | Database schema design | Run sync twice, assert row count unchanged on second run |
| LLM output not validated | Classification pipeline design | Inject a bad LLM response in tests; assert validation catches it |
| LLM hallucinations in production | Classification pipeline design | Weekly query: `SELECT DISTINCT client_name FROM events WHERE source = 'llm'` — diff against canonical list |
| App.jsx refactor regressions | Codebase refactor phase | Snapshot test each view before and after extraction; visual review required |
| XSS from Gemini HTML | Codebase refactor phase | Code search for `dangerouslySetInnerHTML` after fix — zero unguarded usages allowed |
| Service account key in repo | Initial setup / secrets management | `git log --all -p -- '*.json'` to confirm no service account JSON in history |
| Free tier project pausing | Backend deployment | Check Supabase cron execution log 7 days after deployment |

---

## Sources

- Google Calendar API quota documentation: https://developers.google.com/workspace/calendar/api/guides/quota
- Google Calendar API sync tokens: https://developers.google.com/workspace/calendar/api/guides/sync
- Google Calendar API error handling: https://developers.google.com/workspace/calendar/api/guides/errors
- Domain-wide delegation best practices: https://support.google.com/a/answer/14437356
- Supabase Edge Function limits: https://supabase.com/docs/guides/functions/limits
- Supabase Edge Function scheduling: https://supabase.com/docs/guides/functions/schedule-functions
- Supabase large job processing pattern: https://supabase.com/blog/processing-large-jobs-with-edge-functions
- Supabase free tier pausing: https://dev.to/jps27cse/how-to-prevent-your-supabase-project-database-from-being-paused-using-github-actions-3hel
- Supabase RLS documentation: https://supabase.com/docs/guides/database/postgres/row-level-security
- Gemini structured output: https://ai.google.dev/gemini-api/docs/structured-output
- React XSS / dangerouslySetInnerHTML: https://pragmaticwebsecurity.com/articles/spasecurity/react-xss-part2.html
- React monolith refactoring (strangler pattern): https://blog.logrocket.com/taming-the-front-end-monolith-dbaede402c39/
- LLM production reliability patterns: https://shiftasia.com/community/8-llm-production-challenges-problems-solutions/
- Vercel SPA routing: https://amitgajare.hashnode.dev/how-to-configure-spa-routing-for-netlify-firebase-vercel-render-and-github-pages

---
*Pitfalls research for: automated timesheet analytics (Google Calendar + Supabase + Gemini + React)*
*Researched: 2026-04-14*
