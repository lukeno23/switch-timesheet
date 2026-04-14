# Architecture Research

**Domain:** Automated calendar-to-timesheet analytics pipeline with LLM classification
**Researched:** 2026-04-14
**Confidence:** HIGH (core patterns verified via official Supabase docs and Google API documentation)

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        EXTERNAL SERVICES                            │
│  ┌──────────────────┐              ┌─────────────────────────────┐  │
│  │  Google Calendar │              │  Gemini API                 │  │
│  │  (15 calendars,  │              │  (gemini-2.5-pro,           │  │
│  │  service account │              │   batched classification)   │  │
│  │  + DWD)          │              └─────────────┬───────────────┘  │
│  └────────┬─────────┘                            │                  │
└───────────│──────────────────────────────────────│──────────────────┘
            │ calendar.events.list                 │ JSON
            │ (per-user impersonation)             │ batch response
┌───────────▼──────────────────────────────────────▼──────────────────┐
│                        SUPABASE BACKEND                              │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  pg_cron job (nightly 2 AM Malta time)                      │    │
│  │  → HTTP POST → sync-calendar Edge Function                  │    │
│  └──────────────────────────┬──────────────────────────────────┘    │
│                             │ triggers                               │
│  ┌──────────────────────────▼──────────────────────────────────┐    │
│  │  sync-calendar Edge Function (Deno/TypeScript)              │    │
│  │  1. Fetch events from Google Calendar (all 15 users)        │    │
│  │  2. Pre-filter (personal, all-day, zero-duration)           │    │
│  │  3. Run deterministic classifier (JS port of process_export)│    │
│  │  4. Collect ambiguous entries (result = "Misc")             │    │
│  │  5. POST ambiguous batch to Gemini                          │    │
│  │  6. Merge rule + LLM results                                │    │
│  │  7. Upsert classified rows → calendar_events table          │    │
│  │  8. Write sync_log entry                                     │    │
│  └──────────────────────────┬──────────────────────────────────┘    │
│                             │ reads/writes                           │
│  ┌──────────────────────────▼──────────────────────────────────┐    │
│  │  PostgreSQL Database (Supabase)                             │    │
│  │  ┌────────────────┐  ┌──────────────┐  ┌────────────────┐  │    │
│  │  │ calendar_events│  │  switchers   │  │    clients     │  │    │
│  │  │ (classified    │  │  (roster,    │  │  (names,       │  │    │
│  │  │  timesheet     │  │   dept,      │  │   aliases)     │  │    │
│  │  │  rows)         │  │   mgmt flag) │  │                │  │    │
│  │  └────────────────┘  └──────────────┘  └────────────────┘  │    │
│  │  ┌────────────────┐  ┌──────────────┐                       │    │
│  │  │  categories    │  │  sync_log    │                       │    │
│  │  │  (task cats,   │  │  (run        │                       │    │
│  │  │   LLM hints)   │  │   history)   │                       │    │
│  │  └────────────────┘  └──────────────┘                       │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  PostgREST API (auto-generated from schema)                 │    │
│  │  → Read-only for dashboard, read-write for admin            │    │
│  └─────────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────────┘
            │ HTTPS (anon key / service_role key)
┌───────────▼──────────────────────────────────────────────────────────┐
│                        VERCEL FRONTEND (React 18 SPA)                │
│                                                                      │
│  ┌─────────────────────────┐    ┌────────────────────────────────┐  │
│  │  Dashboard (read-only)  │    │  Admin UI (CRUD)               │  │
│  │  - Overview             │    │  - Switcher roster             │  │
│  │  - Switcher views       │    │  - Client aliases              │  │
│  │  - Team/dept views      │    │  - Task categories             │  │
│  │  - Client/category      │    │  - Manual sync trigger         │  │
│  │  - AI reports           │    │  - Sync log viewer             │  │
│  │  - Date range filter    │    │                                │  │
│  └─────────────────────────┘    └────────────────────────────────┘  │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  Password Gate (simple shared secret, env var)              │    │
│  └─────────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Implementation |
|-----------|----------------|----------------|
| pg_cron job | Nightly trigger at 2 AM Malta time (UTC+1/+2) | Supabase Cron module, HTTP to Edge Function |
| sync-calendar Edge Function | Orchestrates full data pipeline: fetch → classify → store | Deno/TypeScript, ~400 line function |
| Google Calendar client | Impersonates each Switcher via service account + DWD, fetches events | Manual JWT construction or googleapis npm (Deno 2.2+ required) |
| Rule-based classifier | Deterministic JS port of process_export.py — handles clear cases | Pure functions, no I/O, runs inline within Edge Function |
| LLM classifier | Sends ambiguous entries (~15-20% of events) to Gemini in batches of 80 | REST call to generativelanguage.googleapis.com |
| PostgreSQL (Supabase) | Stores all classified events plus reference data (switchers, clients, categories) | 5 core tables, PostgREST auto-API |
| PostgREST API | Auto-generated REST API for React to query aggregated data | Supabase anon/service_role keys |
| React SPA | Dashboard visualisations + admin CRUD, refactored from monolith | React 18, Vite, Tailwind, Recharts, Supabase JS client |
| Password Gate | Simple shared-secret check in React before showing any content | Env var VITE_DASHBOARD_PASSWORD, checked in App state |

## Recommended Project Structure

```
src/
├── components/
│   ├── auth/
│   │   └── PasswordGate.jsx         # simple password check
│   ├── dashboard/
│   │   ├── OverviewTab.jsx
│   │   ├── SwitchersTab.jsx
│   │   ├── TeamsTab.jsx
│   │   ├── ClientsTab.jsx
│   │   ├── CategoriesTab.jsx
│   │   └── AIReportPanel.jsx        # sanitised Gemini output
│   ├── admin/
│   │   ├── SwitcherAdmin.jsx
│   │   ├── ClientAdmin.jsx
│   │   ├── CategoryAdmin.jsx
│   │   └── SyncLog.jsx
│   └── shared/
│       ├── DateRangePicker.jsx
│       ├── ErrorBoundary.jsx        # prevents white-screen
│       └── LoadingSpinner.jsx
├── hooks/
│   ├── useTimesheetData.js          # main data query + aggregation
│   ├── useAdminData.js              # CRUD for reference tables
│   └── useSyncTrigger.js           # manual sync invocation
├── lib/
│   ├── supabase.js                  # client initialisation
│   └── aggregations.js             # data transforms (moved from App.jsx)
├── App.jsx                          # routing, layout, auth gate
├── main.jsx
└── index.css

supabase/
├── functions/
│   └── sync-calendar/
│       ├── index.ts                 # main handler + EdgeRuntime.waitUntil
│       ├── calendar-client.ts       # Google Calendar API calls
│       ├── classifier.ts            # deterministic rule engine (JS port)
│       ├── llm-classifier.ts        # Gemini batch classification
│       └── types.ts                 # shared TypeScript interfaces
├── migrations/
│   ├── 001_initial_schema.sql
│   └── 002_rls_policies.sql
└── config.toml
```

### Structure Rationale

- **supabase/functions/sync-calendar/**: Co-located with Supabase config so `supabase functions deploy` works out of the box. Split into 4 focused modules rather than one large file.
- **src/components/admin/ vs dashboard/**: Separated because they have different access patterns — dashboard is read-heavy with aggregation, admin is CRUD with direct table access.
- **src/lib/aggregations.js**: Extracted from the monolithic App.jsx. Pure functions that transform flat event rows into the grouped structures Recharts needs. Easily testable.
- **src/hooks/**: Wraps Supabase JS client queries and provides React-friendly loading/error state. Keeps components free of direct data-fetching logic.

## Architectural Patterns

### Pattern 1: EdgeRuntime.waitUntil for Long-Running Sync

**What:** Respond to the cron trigger immediately (HTTP 200) then continue the full sync pipeline as a background task using `EdgeRuntime.waitUntil(promise)`.

**When to use:** The nightly sync will pull ~200 events across 15 people, run rule classification, make 3-4 Gemini API calls (80 events per batch), and upsert results. On the free tier (150s wall-clock limit), this could exceed the response timeout. waitUntil allows the cron scheduler to receive a success response while the work continues.

**Trade-offs:** If the function instance is killed before completing, the sync_log will show an incomplete run. Mitigation: write a `started_at` row at the beginning, update with `completed_at` and row counts at the end. A missing `completed_at` signals failure.

**Example:**
```typescript
// sync-calendar/index.ts
Deno.serve(async (req) => {
  // Return immediately so cron scheduler doesn't time out
  EdgeRuntime.waitUntil(runFullSync())
  return new Response(JSON.stringify({ status: 'sync_started' }), {
    headers: { 'Content-Type': 'application/json' }
  })
})

async function runFullSync() {
  const logId = await startSyncLog()
  try {
    const events = await fetchAllCalendars()
    const classified = await classifyEvents(events)
    await upsertEvents(classified)
    await completeSyncLog(logId, classified.length)
  } catch (err) {
    await failSyncLog(logId, err.message)
  }
}
```

### Pattern 2: Hybrid Classifier — Rules First, LLM Fallback

**What:** Run the deterministic rule engine first. Collect entries where the rule engine returns "Misc" (ambiguous). Send only those to Gemini in batches. Merge results.

**When to use:** This is the core classification strategy. The existing process_export.py produces ~82 "Misc" entries in a ~4000-row two-month dataset — roughly 2%. The LLM cost for ~2% of entries is negligible (~10 Gemini calls per nightly sync).

**Trade-offs:** The rule engine must be ported from Python to TypeScript/JavaScript. This is mechanical work but ensures the ~98% of clear cases are handled consistently and cheaply. The LLM handles genuine ambiguity without inflating cost.

**Example:**
```typescript
// classifier.ts
export function classifyDeterministic(event: CalendarEvent, refData: ReferenceData): ClassificationResult {
  const result = runRules(event, refData)
  return {
    ...result,
    isAmbiguous: result.category === 'Misc'
  }
}

// index.ts (orchestrator)
const ruleResults = events.map(e => classifyDeterministic(e, refData))
const ambiguous = ruleResults.filter(r => r.isAmbiguous)

if (ambiguous.length > 0) {
  const llmResults = await classifyWithLLM(ambiguous)
  mergeClassifications(ruleResults, llmResults)
}
```

### Pattern 3: Reference Data Driven by Admin UI

**What:** Switchers, clients (with aliases), and task categories live in Supabase tables, not hardcoded in the Edge Function. The classifier queries these tables at sync time and builds its lookup maps dynamically.

**When to use:** Always — this is how the system stays maintainable when a new client is onboarded, a Switcher changes departments, or a new task category is added without a code deployment.

**Trade-offs:** The Edge Function must query 3 reference tables before classifying. At ~200 events/day this is trivially fast. The query result should be passed through as a single `ReferenceData` object to all classifier calls rather than re-queried per event.

**Example:**
```typescript
// classifier.ts
export interface ReferenceData {
  switchers: Map<string, SwitcherConfig>    // name → { dept, isManagement }
  clientAliases: Map<string, string>         // alias → canonical name
  categories: CategoryConfig[]               // includes LLM hints
}

export async function loadReferenceData(supabase: SupabaseClient): Promise<ReferenceData> {
  const [switchers, clients, categories] = await Promise.all([
    supabase.from('switchers').select('*'),
    supabase.from('clients').select('*'),
    supabase.from('categories').select('*'),
  ])
  return buildMaps(switchers.data, clients.data, categories.data)
}
```

### Pattern 4: Upsert with Stable Event IDs

**What:** Use a composite key of (switcher_id, google_event_id) as the conflict target for upsert operations. This allows the nightly sync to re-process overlapping date windows without creating duplicate rows.

**When to use:** The cron job should sync the last 7 days rather than just yesterday. This catches events added late, modified after they happened, or time zone edge cases near midnight. Upsert semantics mean re-running is safe.

**Trade-offs:** Need to store the Google Calendar event ID for each row. This is available from the API response as `event.id`. The `google_event_id` column should be indexed.

## Data Flow

### Nightly Sync Flow

```
pg_cron (2 AM)
    → HTTP POST /functions/v1/sync-calendar
        → Respond 200 immediately
        → EdgeRuntime.waitUntil(runFullSync())
            → supabase.from('switchers').select()      [load reference data]
            → supabase.from('clients').select()
            → supabase.from('categories').select()
            → For each Switcher (15 parallel fetch calls):
                → Google Calendar API
                  (service account JWT + impersonate user@switch.com.mt)
                → calendar.events.list(timeMin, timeMax)
                → Pre-filter (personal, all-day, zero-duration)
            → classifyDeterministic(events, refData)    [~98% resolved]
            → filter ambiguous (category === 'Misc')
            → Gemini API: batch POST (80 events per call)
            → merge rule + LLM results
            → supabase.from('calendar_events').upsert()
              ON CONFLICT (switcher_id, google_event_id) DO UPDATE
            → supabase.from('sync_log').update({ completed_at, rows_synced })
```

### Dashboard Read Flow

```
React component mounts
    → useTimesheetData(dateRange)
        → supabase.from('calendar_events')
            .select('switcher, date, client, category, department, duration_min')
            .gte('date', startDate)
            .lte('date', endDate)
        → Returns flat rows
    → aggregations.groupByClient(rows)    [in-memory, pure JS]
    → aggregations.groupByDept(rows)
    → aggregations.groupBySwitcher(rows)
    → Recharts components render
```

### Admin CRUD Flow

```
Admin opens Client list
    → useAdminData('clients')
        → supabase.from('clients').select('id, canonical_name, aliases, active')
Admin adds alias "FYO" to Fyorin
    → supabase.from('clients')
        .update({ aliases: [...existing, 'FYO'] })
        .eq('id', fyorinId)
    → React Query invalidates clients cache
    → List re-renders with new alias shown
Next nightly sync picks up updated alias automatically
```

### Key Data Flows Summary

1. **Sync pipeline:** External (Google Calendar) → Edge Function (classify) → Supabase DB. Runs nightly without user involvement.
2. **Dashboard read:** Supabase DB → Supabase JS client → React state → Recharts. Read-only, date-range filtered.
3. **Admin writes:** React form → Supabase JS client → Supabase DB. Affects next sync run, not historical data.
4. **Reference data propagation:** Admin DB change → picked up at next sync automatically (reference data loaded fresh each run).

## Database Schema

```sql
-- Reference tables (admin-managed)
switchers (
  id uuid PK,
  name text UNIQUE,           -- "Luke", "Laura C"
  email text UNIQUE,          -- "luke@switch.com.mt"
  primary_department text,    -- "Marketing"
  is_management boolean,      -- true for 6 management members
  active boolean DEFAULT true
)

clients (
  id uuid PK,
  canonical_name text UNIQUE, -- "Levaris", "Palazzo Parisio"
  aliases text[],             -- ["WRH", "Levaris Ltd"]
  active boolean DEFAULT true
)

categories (
  id uuid PK,
  name text UNIQUE,           -- "CC Management"
  department_override text,   -- NULL = use Switcher's dept
  llm_hint text,              -- fed to Gemini system prompt
  active boolean DEFAULT true
)

-- Event data (sync-populated)
calendar_events (
  id uuid PK DEFAULT gen_random_uuid(),
  switcher_id uuid FK → switchers.id,
  google_event_id text,       -- stable Google Calendar event ID
  date date NOT NULL,
  client_name text,           -- canonical, post-normalisation
  task_details text,
  duration_min integer,
  category text,              -- validated against categories.name
  department text,            -- validated against enum
  rsvp_status text,
  attendee_count integer,
  classified_by text,         -- 'rules' | 'llm' | 'manual'
  sync_run_id uuid FK → sync_log.id,
  UNIQUE(switcher_id, google_event_id)
)

-- Observability
sync_log (
  id uuid PK DEFAULT gen_random_uuid(),
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  rows_synced integer,
  rows_llm integer,           -- how many went to LLM
  error_message text,
  date_range_start date,
  date_range_end date
)
```

## Scaling Considerations

This system serves 6 management users querying ~4000 rows per two-month period. These are the scaling characteristics at that size.

| Concern | At current scale (6 users, 4k rows/2mo) | If scale grew |
|---------|------------------------------------------|---------------|
| DB reads | Trivially fast — all rows fit in Postgres buffer cache | Add materialised views for slow aggregations |
| Sync throughput | ~200 events/day, 15 parallel Calendar API calls, completes in <60s | No changes needed below 1000 events/day |
| LLM cost | ~2-4 Gemini calls/night (80 rows/batch, ~5% ambiguous) | Cost still negligible below 10x volume |
| API rate limits | Google Calendar: 1M queries/day free — 15 calls/night is noise | No concern |
| Gemini rate limits | Free tier allows 1500 requests/day — 4 calls/night is noise | No concern |
| Frontend bundle | Vite code-split by route — admin/dashboard separate chunks | Already sufficient |

### Scaling Priorities

1. **First potential issue:** Edge Function wall-clock time (150s free tier). Mitigated by `EdgeRuntime.waitUntil`. If sync ever exceeds 400s, break into two cron jobs: one for calendar fetch, one for classification.
2. **Second potential issue:** Supabase free tier row limit (500MB). At ~4000 rows per 2 months, this allows ~125 years of data before hitting limits. Not a concern.

## Anti-Patterns

### Anti-Pattern 1: Calling Gemini for Every Event

**What people do:** Route 100% of events through the LLM for consistency.
**Why it's wrong:** Inflates cost, introduces latency, makes the nightly sync dependent on LLM availability, and produces less reliable results for cases the rule engine handles perfectly.
**Do this instead:** Rules first. LLM only for genuine ambiguity (category = "Misc" from rules). Current data shows ~2% ambiguity rate.

### Anti-Pattern 2: Hardcoding Classification Rules in the Edge Function

**What people do:** Port the Python rules directly into a static TypeScript file, treat it as immutable.
**Why it's wrong:** When Switch onboards a new client or renames a task category, a developer must edit code and redeploy. For a management team tool this is an unacceptable friction.
**Do this instead:** Store canonical clients, aliases, and categories in Supabase. Load them fresh at each sync run. Admin UI edits these. Zero deployment required.

### Anti-Pattern 3: Syncing Only Yesterday's Events

**What people do:** Set the cron to fetch exactly the previous day's events.
**Why it's wrong:** Events are frequently added to Google Calendar after the fact, edited, or span midnight. A one-day window misses these.
**Do this instead:** Sync the last 7 days every night. Upsert on (switcher_id, google_event_id) makes this idempotent — re-processing already-seen events costs one SQL upsert per row, which is negligible.

### Anti-Pattern 4: Storing Raw Calendar Text in the Dashboard Query Path

**What people do:** SELECT * and do all aggregation in React.
**Why it's wrong:** Even at 4000 rows it creates unnecessary data transfer. More importantly, it exposes raw event titles (potentially private task details) to anyone who opens Network tab.
**Do this instead:** Query with aggregation at the SQL level when possible (sum(duration_min), count(*) GROUP BY client). For detailed drill-downs, add a separate query scoped to the selected client/date range.

### Anti-Pattern 5: Using the service_role Key in the React Frontend

**What people do:** Use the all-powerful service_role key in the browser to bypass RLS and simplify data fetching.
**Why it's wrong:** Exposes full database write access to anyone who views page source or opens DevTools.
**Do this instead:** Use the anon key in the browser. Set RLS policies that allow SELECT on calendar_events for authenticated (or anon with a known header). The admin UI can use Supabase Auth with a single shared user account for the management team.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Google Calendar API | Service account JSON key stored as Supabase secret. Edge Function constructs JWT, impersonates each Switcher via DWD, calls calendar.events.list | Scope: calendar.readonly. As of early 2025, requires Deno 2.2+ when using google-auth-library npm package. Manual JWT via fetch also works and avoids the dependency. |
| Gemini API | Direct REST POST to generativelanguage.googleapis.com from Edge Function. API key stored as Supabase secret. | Same pattern as existing classify_with_ai.py. 80 events per batch, temperature 0.1, structured JSON output. |
| Supabase JS Client (frontend) | @supabase/supabase-js with anon key. Env vars VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY. | Never use service_role key in browser. |
| Vercel | Zero-config deploy from git. VITE_* env vars set in Vercel project settings. | Build command: `vite build`. Output: `dist/`. |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| pg_cron → Edge Function | HTTP POST with Authorization: Bearer (service_role key) | Cron job makes the HTTP call; Edge Function verifies the key |
| Edge Function → Supabase DB | Supabase JS client using service_role key (server-side only) | Bypasses RLS, which is correct for the sync writer |
| React → Supabase DB | Supabase JS client using anon key | RLS policies enforce read-only access to calendar_events |
| React → Edge Function (manual sync) | HTTP POST with Authorization header from admin UI | Admin triggers ad-hoc sync outside the cron schedule |
| classifier.ts → llm-classifier.ts | Direct function call within the same Edge Function process | Not an HTTP boundary — same process, shared memory |

## Build Order Implications

The component dependencies impose this build order:

1. **Database schema + migrations** — Everything depends on the tables existing first.
2. **Reference data seeding** — Switchers, clients, and categories must be seeded before the classifier can run. Port existing Python reference data to SQL seed files.
3. **Rule-based classifier (TypeScript port)** — Must work standalone before adding LLM fallback. Port process_export.py to classifier.ts, verify against known CSV outputs.
4. **Google Calendar client** — Isolated module that can be developed and tested independently with a single Switcher before wiring into the full sync.
5. **Sync Edge Function** — Assembles calendar client + classifier + DB write. Integration point. Requires items 1-4 to be working.
6. **Cron job** — Trivial to add once sync function works. Wire last.
7. **React refactor + Supabase data layer** — Frontend can be refactored in parallel with backend work (items 3-6). Use a read-only Supabase client against the seeded database.
8. **Admin UI** — Depends on tables existing (item 1) and React being wired to Supabase (item 7). Can be built last.
9. **Password gate** — Five-line component. Add at any point during React work.

## Sources

- [Supabase Edge Functions Limits](https://supabase.com/docs/guides/functions/limits) — 150s wall-clock free tier, 256MB memory
- [Supabase Background Tasks](https://supabase.com/docs/guides/functions/background-tasks) — EdgeRuntime.waitUntil pattern
- [Supabase Cron](https://supabase.com/docs/guides/cron) — pg_cron based scheduling, HTTP invocation of Edge Functions
- [Supabase Edge Functions Architecture](https://supabase.com/docs/guides/functions/architecture) — Deno V8 isolate, stateless, ephemeral
- [Google Domain-Wide Delegation](https://support.google.com/a/answer/162106) — Service account setup for Workspace impersonation
- [Google OAuth2 Server-to-Server](https://developers.google.com/identity/protocols/oauth2/service-account) — JWT construction for service account auth
- [Hybrid LLM/Rule-based Approaches](https://arxiv.org/pdf/2404.15604) — Progressive fallback pattern (rules → LLM)

---
*Architecture research for: Switch Timesheet — Google Calendar → Classification → Supabase pipeline*
*Researched: 2026-04-14*
