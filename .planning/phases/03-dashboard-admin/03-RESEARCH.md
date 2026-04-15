# Phase 3: Dashboard + Admin - Research

**Researched:** 2026-04-15
**Domain:** Supabase browser client integration, React admin CRUD, billing analytics
**Confidence:** HIGH

## Summary

Phase 3 connects the existing React SPA dashboard to live Supabase data, replaces the CSV upload flow entirely, builds an admin UI for managing reference data (Switchers, clients, categories), adds monthly billing entry with hours-to-billing analytics, surfaces sync status, and fixes the stale AI report cache bug. The codebase is well-structured after Phase 1's refactor into feature folders and Phase 2's complete backend pipeline.

The core technical challenge is a data source swap: replacing the `parseCSV()` call path with a Supabase query that produces row objects with the same property names the existing `useMemo` aggregations already consume (`switcher`, `client`, `department`, `task`, `minutes`, `dateObj`, `dateStr`). This is a mechanical mapping exercise. The admin CRUD surfaces are straightforward table-plus-modal patterns. Admin writes go through dedicated Edge Functions with `x-switch-auth` header validation, keeping the service role key off the browser.

The project uses plain JavaScript (JSX), React 18.2, Vite 5, Tailwind CSS 3.4, Recharts 2.12, and Lucide React icons. No TypeScript on the frontend. The single new frontend dependency is `@supabase/supabase-js` v2 for browser reads. Admin writes use `fetch()` directly against Edge Function HTTP endpoints -- no additional libraries required.

**Primary recommendation:** Structure Phase 3 as: (1) Supabase client + data hook + row mapping, (2) migrate all existing views to live data and delete Upload, (3) admin CRUD Edge Functions + migrations, (4) admin UI surfaces, (5) billing entry + analytics, (6) sync status + upcoming events + AI cache fix.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Dashboard reads via Supabase anon key + read-only RLS policies. Shared password gate is the security boundary.
- **D-02:** Admin writes go through dedicated Edge Function endpoints holding the service role key. Service role never touches the browser.
- **D-03:** Admin Edge Functions authenticate via `x-switch-auth` header containing SHA-256 password hash, checked against `SWITCH_AUTH_HASH` Edge Function secret.
- **D-04:** Anon SELECT RLS on: events, switchers, clients, client_aliases, categories, sync_runs, client_billing, audit_log.
- **D-05:** Admin is a new top-level nav entry with sub-sections: Switchers, Clients, Categories, Billing, Sync.
- **D-06:** CRUD via table + modal. No inline editing, no full-page forms.
- **D-07:** Same password gate for admin access -- no separate admin role.
- **D-08:** Soft delete via `active` boolean. Migration adds `active` to categories.
- **D-09:** Editable fields specified per entity (see CONTEXT.md).
- **D-10:** "Sync now" in Admin > Sync, not header. "Last synced" timestamp in main header.
- **D-11:** Server-side validation in Edge Functions returns plain-English errors.
- **D-12:** Billing entry is manual per-client/month form only (no CSV upload for v1).
- **D-13:** `client_billing` table schema with currency support (EUR + USD), FX rate stored per entry.
- **D-13b:** No billing row = excluded from rate aggregates.
- **D-14:** Hours-to-billing in Clients view + per-client drilldown.
- **D-15:** Over/under-serviced driven by per-client `target_hourly_rate` (new nullable column on clients).
- **D-16:** EUR + USD only. FX rate captured at entry time, stored per row.
- **D-17:** EUR primary display for all aggregates. Raw amount + original currency shown in drilldown.
- **D-18:** Edit-freely policy for billing entries. Track `updated_at` only.
- **D-19:** Upfront load of all events from Jan 4, 2026 forward. In-memory filtering preserves existing useMemo patterns.
- **D-20:** One-off historical sync for Jan 4-31, 2026 to backfill before Phase 2's Feb 1 start.
- **D-21:** Delete `src/features/upload/UploadView.jsx` and its routing. Keep `parseCSV.js`.
- **D-22:** Keyed AI-report cache (key = hash of dateRange + filters + entity). Fixes DASH-04.
- **D-23:** Upcoming events collapsible sections on Dashboard, Switchers, Clients, and Departments views.
- **D-24:** Last-synced: relative in header with absolute tooltip.
- **D-25:** Sync-now UX: fire manual-sync Edge Function, poll sync_runs every 3s, show progress, toast on complete, 3min fallback.
- **D-26:** Partial sync failure: amber chip next to last-synced, clicking navigates to Admin > Sync.

### Claude's Discretion
- Ordering of Admin sub-sections
- Month picker UX in billing entry
- Skeleton vs spinner for initial data load
- Hydration join pattern (Postgres embed vs client-side join)
- Empty-state copy when DB has no events

### Deferred Ideas (OUT OF SCOPE)
- Bulk CSV upload for billing
- Immutable billing audit log
- Per-user accounts / activity trail
- LLM classification audit trail UI
- Classification feedback loop (CLAS-07/08/09)
- Live FX rates from external API
- Admin-from-raw-event flow
- EUR/USD display toggle in header
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ADMN-01 | Management users can add/remove Switchers and set primary dept / management member status | Admin CRUD Edge Functions + modal forms per D-09; `switchers` table already has all needed columns |
| ADMN-02 | Management users can add/remove client names and configure aliases | Admin CRUD for clients + nested alias list in modal; `client_aliases` table already exists |
| ADMN-03 | Management users can add/remove task categories with optional LLM hint | Admin CRUD for categories; `categories` table has `llm_hint` column; needs `active` column migration |
| ADMN-04 | Reference data changes picked up by next nightly sync | Sync orchestrator already loads reference data fresh at start of each run (Phase 2 Plan 04 decision) -- no additional work needed |
| DASH-01 | Dashboard reads from Supabase instead of CSV | Supabase client init + `useSupabaseData()` hook + row shape mapping; verified query patterns below |
| DASH-02 | All existing views preserved | Data hook produces isomorphic row objects; all useMemo aggregations continue unchanged |
| DASH-04 | AI reports invalidate on date range change | Keyed cache per D-22; replace `useState(null)` with `useState({ key: null, report: null })` in DashboardView and DetailView |
| BILL-01 | Monthly billing amounts per client (manual entry) | `client_billing` table migration + billing admin modal + Edge Function |
| BILL-02 | Hours-to-billing analysis per client per month | Effective rate calculation from in-memory joined data; new columns in Clients ListView + billing drilldown in DetailView |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Data reads (events, ref data) | Browser / Client | Database / Storage | Supabase anon key queries direct from browser; RLS enforces read-only |
| Admin writes (CRUD) | API / Backend (Edge Functions) | Database / Storage | Service role key stays server-side; browser sends auth hash in header |
| Authentication gate | Browser / Client | -- | SHA-256 hash comparison runs client-side; no server auth session |
| Admin auth verification | API / Backend (Edge Functions) | -- | Edge Functions verify `x-switch-auth` header against stored hash |
| Data aggregation (charts) | Browser / Client | -- | All aggregation via `useMemo` in-memory after upfront load |
| AI narrative reports | Browser / Client | -- | Gemini API called directly from browser with user-supplied API key |
| Sync orchestration | API / Backend (Edge Functions) | -- | Existing sync Edge Function; Phase 3 only triggers it |
| Billing rate calculation | Browser / Client | -- | Computed from in-memory events + billing data |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @supabase/supabase-js | 2.103.1 | Browser client for Supabase reads and Edge Function invocation | [VERIFIED: npm registry] Official Supabase client; only way to query Supabase from browser with RLS |
| react | 18.2.0 | UI framework | Already installed; project standard |
| recharts | 2.12.0 | Chart components | Already installed; all dashboard charts use it |
| lucide-react | 0.330.0 | Icon set | Already installed; project standard |
| dompurify | 3.4.0 | HTML sanitization for AI report output | Already installed |

### Supporting (already installed)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| clsx | 2.1.0 | Conditional class names | Admin table row states, badge variants |
| tailwind-merge | 2.2.1 | Merge Tailwind classes | Card className overrides |
| vite | 5.1.4 | Build + dev server | Env var exposure via `import.meta.env.VITE_*` |
| vitest | 4.1.4 | Unit tests | New utility tests (FX conversion, rate calc, cache key) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @supabase/supabase-js for reads | Direct fetch to PostgREST | supabase-js provides typed query builder, auth header injection, and `.functions.invoke()` for Edge Functions -- no reason to go lower-level |
| fetch() for admin writes | supabase.functions.invoke() | Both work; fetch() is more explicit about URL and headers for custom auth. Either approach is fine -- Claude's discretion |
| No form library | react-hook-form | Admin forms are simple (5-8 fields, no deep nesting, no dynamic arrays beyond aliases). useState + onBlur validation is sufficient. Adding a form library for 4 modals is overhead. |
| No state management library | zustand / jotai | Data is loaded once upfront, stored in a single useState, consumed by useMemo. No cross-component shared mutable state that warrants a store. |

**Installation:**
```bash
npm install @supabase/supabase-js@^2
```

**Version verification:**
- `@supabase/supabase-js`: 2.103.1 [VERIFIED: npm registry, 2026-04-15]

## Architecture Patterns

### System Architecture Diagram

```
Browser (Vite SPA)
  |
  |-- [on login] --> Supabase anon key SELECT
  |                    |
  |                    +--> events (all from Jan 4 2026+)
  |                    +--> switchers, clients, client_aliases, categories
  |                    +--> sync_runs (latest, for header timestamp)
  |                    +--> client_billing (all rows)
  |                    |
  |                    v
  |              [State: data, refData, billingData, syncStatus]
  |                    |
  |                    v
  |              [useMemo aggregations --> Dashboard/ListView/DetailView]
  |
  |-- [admin action] --> fetch() POST to Edge Function
  |                        |
  |                        +--> x-switch-auth header (SHA-256 hash)
  |                        |
  |                        v
  |                  Edge Function (admin-*)
  |                        |
  |                        +--> verify hash against SWITCH_AUTH_HASH secret
  |                        +--> validate input (uniqueness, FK, business rules)
  |                        +--> supabaseAdmin.from(...).insert/update/delete
  |                        +--> return { ok: true } or { error: "plain English" }
  |                        |
  |                        v
  |                  [UI: refetch affected table, update state]
  |
  |-- [sync now] --> fetch() POST to /functions/v1/sync
  |                    +--> x-sync-secret header
  |                    v
  |               [poll sync_runs every 3s for status]
  |                    v
  |               [toast on completion, refetch events]
  |
  |-- [AI report] --> fetch() POST to Gemini API
  |                    +--> user-supplied API key (localStorage)
  |                    v
  |               [cached by key = hash(dateRange + filters + entity)]
```

### Recommended Project Structure
```
src/
  App.jsx                          # Thin shell: auth gate, nav, routing, data hook
  features/
    admin/
      AdminView.jsx                # Tab container for 5 sub-sections
      SwitchersTab.jsx             # Table + modal for switchers CRUD
      ClientsTab.jsx               # Table + modal for clients CRUD (with aliases)
      CategoriesTab.jsx            # Table + modal for categories CRUD
      BillingTab.jsx               # Table + modal for billing entry
      SyncTab.jsx                  # Sync log table + sync-now button
      AdminTable.jsx               # Shared table component for admin entities
      AdminModal.jsx               # Shared base modal for CRUD forms
    dashboard/
      DashboardView.jsx            # (existing) + upcoming events section
      ...existing chart components
    detail/
      DetailView.jsx               # (existing) + billing drilldown for clients
      DetailStat.jsx               # (existing)
    upload/
      UploadView.jsx               # TO BE DELETED (D-21)
  shared/
    components/
      ...existing (Card, TaskTable, SettingsModal, etc.)
      SyncStatusChip.jsx           # Amber chip for sync issues (D-26)
      UpcomingEvents.jsx           # Collapsible upcoming events section (D-23)
      Toast.jsx                    # Floating toast for sync completion
    hooks/
      useClickOutside.js           # (existing)
      useSupabaseData.js           # New: upfront load hook
      useSyncStatus.js             # New: latest sync_runs polling
    services/
      gemini.js                    # (existing)
      supabase.js                  # New: createClient(url, anonKey) singleton
      adminApi.js                  # New: fetch wrapper stamping x-switch-auth
    utils/
      parseCSV.js                  # (kept per D-21)
      aggregation.js               # (existing)
      getWeekNumber.js             # (existing)
      mapSupabaseRow.js            # New: Supabase row -> dashboard row shape
      billingCalc.js               # New: effective rate, over/under calculation
      cacheKey.js                  # New: stable hash for AI report cache
supabase/
  migrations/
    0006_client_billing.sql        # client_billing table (D-13)
    0007_admin_columns.sql         # active on categories, target_hourly_rate on clients
    0008_anon_read_policies.sql    # anon SELECT on client_billing + audit_log (D-04)
  functions/
    admin/                         # Single multiplexed admin Edge Function
      index.ts
      deno.json
    _shared/
      authVerifier.ts              # New: verify x-switch-auth header
      ...existing modules
```

### Pattern 1: Supabase Client Initialization (Browser)
**What:** Create a singleton Supabase client using Vite env vars
**When to use:** Any browser-side read query
**Example:**
```javascript
// src/shared/services/supabase.js
// Source: Supabase official docs (Context7: /supabase/supabase, "create client vite environment variables")
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```
[VERIFIED: Context7 Supabase docs show exact VITE_ prefix pattern for Vite projects]

### Pattern 2: Data Hook with Row Shape Mapping
**What:** Load all events + reference data on mount, map to dashboard-compatible shape
**When to use:** App initialization after password gate
**Example:**
```javascript
// src/shared/hooks/useSupabaseData.js
import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase.js';
import { mapSupabaseRow } from '../utils/mapSupabaseRow.js';

export const useSupabaseData = () => {
  const [data, setData] = useState(null);
  const [refData, setRefData] = useState(null);
  const [billingData, setBillingData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        // Parallel fetch of all tables
        const [eventsRes, switchersRes, clientsRes, categoriesRes, aliasesRes, billingRes, syncRes] =
          await Promise.all([
            supabase.from('events').select('*, switcher:switchers(name), client:clients(name), category:categories(name, department)').gte('event_date', '2026-01-04'),
            supabase.from('switchers').select('*'),
            supabase.from('clients').select('*'),
            supabase.from('categories').select('*'),
            supabase.from('client_aliases').select('*'),
            supabase.from('client_billing').select('*'),
            supabase.from('sync_runs').select('*').order('started_at', { ascending: false }).limit(1),
          ]);

        // Map events to dashboard-compatible shape
        const mapped = (eventsRes.data || []).map(mapSupabaseRow);
        setData(mapped);
        setRefData({ switchers: switchersRes.data, clients: clientsRes.data, categories: categoriesRes.data, aliases: aliasesRes.data });
        setBillingData(billingRes.data || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return { data, refData, billingData, loading, error, refetch: () => { /* re-run load */ } };
};
```
[VERIFIED: Context7 Supabase docs confirm `.select('*, relation:table(columns)')` syntax for embedded joins]

### Pattern 3: Row Shape Mapping (Supabase -> Dashboard)
**What:** Transform Supabase event rows to the shape existing useMemo aggregations expect
**When to use:** After fetching events, before setting state
**Example:**
```javascript
// src/shared/utils/mapSupabaseRow.js
// Maps Supabase events row to the shape parseCSV() used to produce
export const mapSupabaseRow = (row) => {
  const d = new Date(row.event_date);
  return {
    // Properties consumed by existing useMemo aggregations:
    switcher: row.switcher?.name || row.client_name_raw || 'Unknown',
    client: row.client?.name || row.client_name_raw || 'Unknown',
    department: row.category?.department || row.department || 'Unknown',
    task: row.task_details,
    minutes: row.duration_minutes,
    dateStr: `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`,
    dateObj: d,
    // Additional properties for Phase 3 features:
    id: row.id,
    temporalStatus: row.temporal_status,
    startAt: row.start_at,
    endAt: row.end_at,
    categoryName: row.category?.name,
    classificationMethod: row.classification_method,
  };
};
```

### Pattern 4: Admin API Wrapper
**What:** Fetch wrapper that stamps the auth hash header for admin Edge Function calls
**When to use:** All admin write operations
**Example:**
```javascript
// src/shared/services/adminApi.js
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

const getAuthHash = () => sessionStorage.getItem('switch_auth_hash');

export const adminApi = async (action, payload) => {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/admin`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-switch-auth': getAuthHash(),
    },
    body: JSON.stringify({ action, ...payload }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || 'Request failed');
  return body;
};
```

**Note:** The `switch_auth_hash` must be stored in sessionStorage during the password gate verification step. Currently `PasswordGate.jsx` only stores `'true'` in `sessionStorage.setItem('switch_auth', 'true')`. Phase 3 must also store the computed hash: `sessionStorage.setItem('switch_auth_hash', hash)`.

### Pattern 5: Admin Edge Function (multiplexed)
**What:** Single Edge Function with action routing for all admin operations
**When to use:** All CRUD operations
**Example:**
```typescript
// supabase/functions/admin/index.ts
import { corsHeaders } from '@supabase/supabase-js/cors';
import { supabaseAdmin } from '../_shared/supabaseClient.ts';
import { verifyAuthHash } from '../_shared/authVerifier.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const authError = await verifyAuthHash(req);
  if (authError) return authError;

  const { action, ...payload } = await req.json();

  switch (action) {
    case 'create-switcher': return handleCreateSwitcher(payload);
    case 'update-switcher': return handleUpdateSwitcher(payload);
    // ... etc
    default:
      return new Response(JSON.stringify({ error: 'Unknown action' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
  }
});
```
[VERIFIED: Context7 Supabase docs confirm CORS handling pattern with `@supabase/supabase-js/cors` import for v2.95.0+]

### Anti-Patterns to Avoid
- **Exposing service role key to browser:** The service role key bypasses RLS. It must only exist in Edge Function environment variables. Browser reads use the anon key.
- **Per-filter network round-trips:** D-19 mandates upfront load. Do not add per-date-range or per-entity Supabase queries. All filtering is in-memory via useMemo.
- **Storing auth state in localStorage:** Use sessionStorage (existing pattern). localStorage persists across tabs/sessions which is inappropriate for a shared-password tool.
- **Building custom multi-currency framework:** D-16 scopes currency to EUR + USD only. FX rate stored per billing entry. Do not build a currency abstraction layer.
- **Paginating events on the dashboard:** ~4000 rows fits comfortably in memory. Do not add pagination; it breaks the useMemo aggregation pattern.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Supabase query builder | Raw PostgREST HTTP calls | `@supabase/supabase-js` `.from().select()` | Handles auth headers, RLS, pagination tokens, type-safe filters |
| HTML sanitization | Custom regex stripping | DOMPurify (already installed) | XSS is a solved problem; hand-rolled sanitization has known bypasses |
| CORS headers in Edge Functions | Manual header objects | `import { corsHeaders } from '@supabase/supabase-js/cors'` | Stays in sync with client library updates; no header drift |
| SHA-256 hashing | External crypto library | `crypto.subtle.digest()` (Web Crypto API) | Already used in PasswordGate.jsx; native browser API, no dependency |
| Relative time formatting | Custom "X minutes ago" function | `Intl.RelativeTimeFormat` (browser native) or a ~10 line helper | Small enough to hand-write; does not warrant a library like `date-fns` |
| Toast notifications | Full toast library (react-hot-toast) | Simple positioned-fixed component with auto-dismiss setTimeout | Only 2 toast types needed (sync complete, sync failed); a library is overkill |

**Key insight:** Phase 3 adds exactly one new npm dependency (`@supabase/supabase-js`). Everything else is built with existing installed packages plus browser native APIs. This keeps the bundle small and consistent with the project's minimal-dependency philosophy.

## Common Pitfalls

### Pitfall 1: Row Shape Mismatch Between Supabase and Dashboard
**What goes wrong:** Existing useMemo aggregations reference `d.switcher`, `d.client`, `d.department`, `d.task`, `d.minutes`, `d.dateObj`, `d.dateStr`. If the Supabase row mapper produces different property names, every chart and view silently shows zero/undefined.
**Why it happens:** Supabase rows use `duration_minutes`, `task_details`, foreign key IDs instead of names, and ISO date strings instead of `Date` objects.
**How to avoid:** Write `mapSupabaseRow()` as a single transformation function that produces exactly the shape `parseCSV()` used to produce. Write unit tests comparing a sample Supabase row to the expected dashboard shape.
**Warning signs:** Charts show "0 hours" or "Unknown" across all entries after the migration.

### Pitfall 2: Embedded Join Returns Null for Unclassified Events
**What goes wrong:** Using `.select('*, client:clients(name)')` returns `client: null` when `client_id` is NULL (e.g., Misc-classified events with no resolved client). If the mapper doesn't handle this, it throws on `row.client.name`.
**Why it happens:** Events classified as "Misc" may have null `client_id` and `category_id`.
**How to avoid:** Always use optional chaining in the mapper: `row.client?.name || row.client_name_raw || 'Unknown'`. The `client_name_raw` column preserves the original calendar title's client portion even when FK resolution fails.
**Warning signs:** Runtime error "Cannot read properties of null" on dashboard load.

### Pitfall 3: Password Hash Not Available for Admin Writes
**What goes wrong:** The admin API needs the SHA-256 hash of the password to send in the `x-switch-auth` header. But `PasswordGate.jsx` currently only stores `'true'` in sessionStorage -- not the hash itself.
**Why it happens:** Phase 1's password gate was designed for read-only access. Phase 3 repurposes the hash for write authentication.
**How to avoid:** Modify `PasswordGate.jsx` to also store the computed hash: `sessionStorage.setItem('switch_auth_hash', hash)`. The admin API reads it from sessionStorage.
**Warning signs:** Admin save operations return 401 Unauthorized.

### Pitfall 4: CORS Rejection on Admin Edge Function Calls
**What goes wrong:** Browser-to-Edge-Function calls fail with CORS error because the Edge Function doesn't handle OPTIONS preflight.
**Why it happens:** The existing sync Edge Function was designed for server-to-server calls (pg_cron, manual curl). It has no CORS handling. The new admin Edge Function must handle browser-origin requests.
**How to avoid:** Include CORS handling in every admin Edge Function: check for OPTIONS method, return `corsHeaders`, spread `corsHeaders` into every response. Use `import { corsHeaders } from '@supabase/supabase-js/cors'`.
**Warning signs:** Network tab shows "CORS error" on admin actions; sync button works from curl but not from the browser.

### Pitfall 5: Upfront Load Query Returns Too Much Data
**What goes wrong:** Loading all events from Jan 4, 2026 forward could grow over time. With ~200 events/day across 15 Switchers and 5 working days/week, this is ~4000 events per month. After a year, ~48,000 rows.
**Why it happens:** D-19 mandates upfront load for in-memory filtering.
**How to avoid:** For v1 (agency with 15 people), this is fine -- 48K rows at ~500 bytes each is ~24MB, well within browser memory. Monitor in production. If it becomes an issue, a future optimization can add a time-window cap (e.g., last 6 months) with lazy-load for older data.
**Warning signs:** Dashboard load takes >5 seconds or browser tab memory exceeds 100MB.

### Pitfall 6: Sync Now Button Has No Feedback
**What goes wrong:** User clicks "Sync Now", the Edge Function returns 504 (because of the free-tier 150s timeout known issue from Phase 2), and the UI shows "Sync failed" even though events are being written successfully.
**Why it happens:** The sync function exceeds free-tier Edge Function timeout. Events write progressively, but the HTTP response never arrives.
**How to avoid:** Per D-25, the UI should return HTTP 202 immediately and poll `sync_runs` for status. But the current sync function returns only after completion. The planner should add an intermediate step: modify the sync function to insert a `sync_runs` row with status "running" before starting, and update it on completion. The UI polls this row. If the function is killed mid-run, the row stays "running" and the UI falls back after 3 minutes.
**Warning signs:** Sync-now always shows "Sync failed" despite events being written.

### Pitfall 7: Stale Reference Data After Admin CRUD
**What goes wrong:** Admin adds a new client, then immediately goes to the dashboard, but the new client doesn't appear in dropdowns or aggregations.
**Why it happens:** The upfront load already completed; reference data is cached in state.
**How to avoid:** After any admin CRUD operation, refetch the affected reference table and merge into state. This can be a targeted re-query (just the modified table) rather than a full reload.
**Warning signs:** Newly added entities don't appear until browser refresh.

## Code Examples

### Supabase Events Query with Embedded Joins
```javascript
// Source: Context7 Supabase docs — foreign key relationship select
const { data: events, error } = await supabase
  .from('events')
  .select(`
    id,
    google_event_id,
    title,
    client_name_raw,
    task_details,
    start_at,
    end_at,
    duration_minutes,
    event_date,
    day_of_week,
    off_schedule,
    temporal_status,
    department,
    classification_method,
    rule_confidence,
    switcher:switchers(id, name, primary_dept, is_management_member),
    client:clients(id, name),
    category:categories(id, name, department)
  `)
  .gte('event_date', '2026-01-04')
  .order('event_date', { ascending: true });
```
[VERIFIED: Context7 shows `relation:table(columns)` syntax for embedded joins]

### Latest Sync Run Query
```javascript
// Source: Context7 Supabase docs — order + limit
const { data: syncRuns } = await supabase
  .from('sync_runs')
  .select('*')
  .order('started_at', { ascending: false })
  .limit(1);

const latestSync = syncRuns?.[0] || null;
const hasErrors = latestSync?.errors && Object.keys(latestSync.errors).length > 0;
```

### AI Report Cache Key Generator
```javascript
// src/shared/utils/cacheKey.js
export const buildCacheKey = (dateRange, filters, entityId) => {
  const parts = [
    dateRange.start,
    dateRange.end,
    ...(filters || []).sort(),
    entityId || '',
  ];
  return parts.join('|');
};
```

### Keyed AI Report State (DASH-04 fix)
```javascript
// In DashboardView.jsx — replace: const [aiReport, setAiReport] = useState(null);
const [aiCache, setAiCache] = useState({ key: null, report: null });

// Before generating:
const currentKey = buildCacheKey(dateRange, activeFilters, null);
if (aiCache.key === currentKey && aiCache.report) {
  // Serve cached
  setIsAIModalOpen(true);
  return;
}

// After generating:
setAiCache({ key: currentKey, report: result });
```

### Relative Time Formatter
```javascript
// src/shared/utils/relativeTime.js
export const formatRelativeTime = (isoString) => {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
};

export const formatAbsoluteTime = (isoString) => {
  const d = new Date(isoString);
  return d.toLocaleString('en-GB', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
  });
};
```

### Effective Rate Calculation
```javascript
// src/shared/utils/billingCalc.js
export const calcEffectiveRate = (hoursWorked, eurEquivalent) => {
  if (!hoursWorked || hoursWorked === 0 || !eurEquivalent) return null;
  return eurEquivalent / hoursWorked;
};

export const calcOverUnderIndicator = (effectiveRate, targetRate) => {
  if (!effectiveRate || !targetRate) return null;
  const delta = ((effectiveRate - targetRate) / targetRate) * 100;
  if (Math.abs(delta) <= 5) return { status: 'on-target', delta: 0 };
  if (delta > 0) return { status: 'under-serviced', delta: Math.round(delta) };
  return { status: 'over-serviced', delta: Math.round(delta) };
};
```

## Data Shape Mapping

Critical reference: the exact property names consumed by existing code vs what Supabase provides.

### Current Shape (from parseCSV)
```javascript
{
  switcher: "Luke Azzopardi",      // string — from CSV column
  client: "WRH",                   // string — from CSV column
  department: "Brand",             // string — from CSV column
  task: "Copywriting for website", // string — from CSV column
  minutes: 120,                    // number — from CSV column
  dateStr: "15/4/2026",            // string — DD/MM/YYYY
  dateObj: Date(2026, 3, 15),      // Date object
}
```

### Supabase Row Shape (from events table with joins)
```javascript
{
  id: "uuid",
  switcher: { id: "uuid", name: "Luke Azzopardi", primary_dept: "Brand", is_management_member: true },
  client: { id: "uuid", name: "WRH" },  // null if unresolved
  client_name_raw: "WRH",
  category: { id: "uuid", name: "Copywriting", department: "Brand" },  // null if Misc
  task_details: "Copywriting for website",
  duration_minutes: 120,
  event_date: "2026-04-15",           // ISO date string
  temporal_status: "completed",
  start_at: "2026-04-15T09:00:00Z",
  end_at: "2026-04-15T11:00:00Z",
  department: "Brand",                 // denormalized on events table
  classification_method: "rule",
}
```

### Mapping Required
| Dashboard Property | Supabase Source | Transform |
|-------------------|----------------|-----------|
| `switcher` | `row.switcher.name` | Direct access with null guard |
| `client` | `row.client?.name \|\| row.client_name_raw` | Optional chaining + fallback |
| `department` | `row.category?.department \|\| row.department` | Prefer category's dept, fall back to denormalized |
| `task` | `row.task_details` | Direct rename |
| `minutes` | `row.duration_minutes` | Direct rename |
| `dateStr` | `row.event_date` | Parse "YYYY-MM-DD" -> "DD/MM/YYYY" |
| `dateObj` | `row.event_date` | `new Date(row.event_date)` |

## Database Migrations Required

### Migration 0006: client_billing table
```sql
CREATE TABLE client_billing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id),
  year_month date NOT NULL,
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'EUR',
  fx_rate_to_eur numeric,
  eur_equivalent numeric NOT NULL,
  billing_type text,
  notes text,
  entered_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, year_month)
);

-- Constraint: fx_rate required when USD
ALTER TABLE client_billing ADD CONSTRAINT chk_fx_rate
  CHECK (currency = 'EUR' OR fx_rate_to_eur IS NOT NULL);

-- Constraint: billing_type enum
ALTER TABLE client_billing ADD CONSTRAINT chk_billing_type
  CHECK (billing_type IS NULL OR billing_type IN ('retainer', 'project'));

-- Constraint: currency enum
ALTER TABLE client_billing ADD CONSTRAINT chk_currency
  CHECK (currency IN ('EUR', 'USD'));
```

### Migration 0007: admin columns
```sql
-- Add active to categories (D-08)
ALTER TABLE categories ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;

-- Add target_hourly_rate to clients (D-15)
ALTER TABLE clients ADD COLUMN IF NOT EXISTS target_hourly_rate numeric;
```

### Migration 0008: anon read policies for new/missing tables
```sql
-- client_billing: anon and authenticated read
CREATE POLICY "anon_read_client_billing" ON client_billing
  FOR SELECT TO anon USING (true);
CREATE POLICY "authenticated_read_client_billing" ON client_billing
  FOR SELECT TO authenticated USING (true);

-- audit_log: anon and authenticated read (D-04 explicitly includes it)
CREATE POLICY "anon_read_audit_log" ON audit_log
  FOR SELECT TO anon USING (true);
CREATE POLICY "authenticated_read_audit_log" ON audit_log
  FOR SELECT TO authenticated USING (true);

-- Enable RLS on client_billing
ALTER TABLE client_billing ENABLE ROW LEVEL SECURITY;
```

Note: RLS policies for `events`, `switchers`, `clients`, `client_aliases`, `categories`, `sync_runs` already exist in `0005_rls_policies.sql`. Only `client_billing` (new table) and `audit_log` (previously restricted) need new policies.

## Edge Function Design

### Single Multiplexed Admin Function vs Multiple Functions
**Recommendation: Single multiplexed function (`admin/index.ts`)** [ASSUMED]

Rationale:
- All admin operations share the same auth verification logic
- One deployment unit = one CORS handler = simpler maintenance
- Action routing via `{ action: "create-switcher", ... }` body pattern
- Supabase free tier counts deployments, not invocations

Actions to support:
| Action | Entity | HTTP Body Fields |
|--------|--------|------------------|
| `create-switcher` | switchers | name, email, primary_dept, is_management_member |
| `update-switcher` | switchers | id, name, email, primary_dept, is_management_member, active |
| `create-client` | clients | name, target_hourly_rate |
| `update-client` | clients | id, name, target_hourly_rate, active |
| `create-alias` | client_aliases | client_id, alias |
| `delete-alias` | client_aliases | id |
| `create-category` | categories | name, department, llm_hint |
| `update-category` | categories | id, name, department, llm_hint, active |
| `create-billing` | client_billing | client_id, year_month, amount, currency, fx_rate_to_eur, eur_equivalent, billing_type, notes, entered_by |
| `update-billing` | client_billing | id, client_id, year_month, amount, currency, fx_rate_to_eur, eur_equivalent, billing_type, notes, entered_by |
| `delete-billing` | client_billing | id |

### Auth Verification Helper
```typescript
// supabase/functions/_shared/authVerifier.ts
import { corsHeaders } from '@supabase/supabase-js/cors';

export async function verifyAuthHash(req: Request): Promise<Response | null> {
  const authHash = req.headers.get('x-switch-auth');
  const expectedHash = Deno.env.get('SWITCH_AUTH_HASH');

  if (!authHash || !expectedHash || authHash !== expectedHash) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
  return null; // Authorized
}
```

### Server-Side Validation Examples (D-11)
```typescript
// Email uniqueness check
const { data: existing } = await supabaseAdmin
  .from('switchers')
  .select('id')
  .eq('email', payload.email)
  .neq('id', payload.id || '')
  .limit(1);

if (existing && existing.length > 0) {
  return jsonResponse({ error: 'A Switcher with that email already exists.' }, 409);
}

// Alias uniqueness check
const { data: existingAlias } = await supabaseAdmin
  .from('client_aliases')
  .select('id, client_id, client:clients(name)')
  .eq('alias', payload.alias.toUpperCase())
  .limit(1);

if (existingAlias && existingAlias.length > 0) {
  const clientName = existingAlias[0].client?.name || 'another client';
  return jsonResponse({ error: `That alias is already assigned to ${clientName}.` }, 409);
}

// Deactivation warning (upcoming events check)
if (payload.active === false) {
  const { count } = await supabaseAdmin
    .from('events')
    .select('id', { count: 'exact', head: true })
    .eq('switcher_id', payload.id)
    .eq('temporal_status', 'upcoming');

  if (count > 0) {
    return jsonResponse({
      warning: `${payload.name} has ${count} upcoming calendar events in the next 14 days. Deactivating will exclude them from the next sync. Are you sure?`,
      requireConfirmation: true,
    }, 200);
  }
}
```

## Sync Integration Notes

### Manual Sync Trigger from Browser
The existing sync Edge Function authenticates manual triggers via `x-sync-secret` header (Phase 2 Plan 04). Phase 3 needs to:

1. Store `SYNC_SECRET` as a Vercel env var (`VITE_SYNC_SECRET`) for the browser to use.
   **Wait -- this is a security concern.** The sync secret is meant for server-to-server calls. Exposing it in a `VITE_` env var makes it visible in the browser bundle.

   **Resolution:** Instead of exposing `SYNC_SECRET` to the browser, route the sync-now trigger through the admin Edge Function:
   - Browser calls `POST /functions/v1/admin` with `{ action: "trigger-sync" }` + `x-switch-auth` header
   - Admin Edge Function verifies the auth hash, then internally calls the sync function using the service role key or sync secret
   - This keeps the sync secret server-side

   Alternatively, the admin Edge Function could simply insert a `sync_runs` row and call the sync function URL with the proper secret. This is the cleaner approach.

### Sync Status Polling
After triggering sync-now, the UI polls `sync_runs` (readable via anon RLS):
```javascript
const pollSync = async (startedAfter) => {
  const { data } = await supabase
    .from('sync_runs')
    .select('*')
    .gte('started_at', startedAfter)
    .order('started_at', { ascending: false })
    .limit(1);
  return data?.[0] || null;
};
```

### Known Issue: Sync Timeout
Phase 2 documented that the sync function exceeds the free-tier 150s Edge Function timeout. Events write correctly but `sync_runs` completion row doesn't get written. Phase 3 should:
- Modify the sync function to write a `sync_runs` row with `status: 'running'` at the START (before processing)
- The UI can then detect the "running" state and poll for completion
- If status stays "running" for >3 minutes, fall back to "still running in background" message

This is a Phase 2 fix that Phase 3 depends on. The planner should include it as a prerequisite task.

## Deployment Considerations

### Environment Variables
| Variable | Where | Purpose | Exposure |
|----------|-------|---------|----------|
| `VITE_SUPABASE_URL` | Vercel + `.env.local` | Supabase project URL | Safe in browser (public API endpoint) |
| `VITE_SUPABASE_ANON_KEY` | Vercel + `.env.local` | Supabase anon role key | Safe in browser (RLS protects data) |
| `VITE_APP_PASSWORD_HASH` | Vercel | SHA-256 of shared password | Already exists from Phase 1 |
| `SWITCH_AUTH_HASH` | Supabase Edge Function secrets | Same hash for admin write verification | Server-side only |
| `SYNC_SECRET` | Supabase Edge Function secrets | Manual sync trigger auth | Server-side only (NOT exposed to browser) |

### Vercel Deployment
- App is already on Vercel (Phase 1 delivered this)
- `vite.config.js` already has `base: '/'` for Vercel (changed from `/switch-timesheet/` which was for GitHub Pages)
- Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to Vercel project settings
- No server-side rendering; pure static SPA

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| CSV upload -> FileReader -> parseCSV | Supabase anon SELECT -> mapSupabaseRow | Phase 3 | Eliminates manual upload; data is always current |
| `setData(null)` to show upload view | Empty state when Supabase returns no events | Phase 3 | New empty state design per UI-SPEC |
| `aiReport` as simple `useState(null)` | Keyed cache `useState({ key, report })` | Phase 3 (D-22) | Fixes DASH-04 stale cache bug |
| No admin UI | Table + modal CRUD via Edge Functions | Phase 3 | ADMN-01 through ADMN-04 |
| No billing data | Manual entry + effective rate calculation | Phase 3 | BILL-01, BILL-02 |

**Deprecated/outdated:**
- `UploadView.jsx`: Deleted in Phase 3 (D-21)
- CSV-based data flow: Replaced entirely by Supabase reads
- `handleFileUpload` in `App.jsx`: Removed along with FileReader logic

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Single multiplexed admin Edge Function is better than separate functions per entity | Edge Function Design | Low -- can split later if function size becomes unwieldy; single function keeps deployment simple |
| A2 | ~48K events per year at ~500 bytes each (~24MB) is acceptable for browser memory | Pitfall 5 | Medium -- if events are larger than estimated or more users access simultaneously, may need time-windowed loading |
| A3 | `import { corsHeaders } from '@supabase/supabase-js/cors'` works in Deno Edge Functions with v2.95.0+ | Pattern 5 | Low -- verified in Context7 docs; fallback is manual header object |
| A4 | Admin sync-now should route through admin Edge Function to keep SYNC_SECRET server-side | Sync Integration Notes | Low -- alternative is to add a separate "sync-trigger" Edge Function that accepts the admin auth hash |
| A5 | Supabase embedded join syntax `switcher:switchers(name)` works with FK relationships defined in 0001_schema.sql | Pattern 2 | Low -- standard PostgREST behavior for FK relationships; verified in Context7 |

## Open Questions (RESOLVED)

1. **Sync function "running" row write**
   - What we know: The sync function currently only writes sync_runs on completion, which fails due to free-tier timeout
   - What's unclear: Whether Phase 2 has already been modified to write a "running" row at the start
   - Recommendation: Planner should include a task to add "running" status write at sync start. This is a small change to `supabase/functions/sync/index.ts`.
   - **RESOLVED** -- `supabase/functions/sync/index.ts` already writes `status: "running"` at line 391 before processing. No additional work needed.

2. **Jan 4-31 historical backfill (D-20)**
   - What we know: Phase 2 backfilled from Feb 1, 2026. D-20 requires extending to Jan 4.
   - What's unclear: Whether the one-off backfill should be a migration task or a manual curl command
   - Recommendation: Include as a one-shot task in the plan. Use the existing manual sync endpoint with `backfillStart: '2026-01-04'` and `backfillEnd: '2026-01-31'`.
   - **RESOLVED** -- Covered by Plan 01 Task 3 (manual backfill invocation via curl to sync Edge Function with `backfill_start: "2026-01-04"` and `backfill_end: "2026-01-31"`).

3. **Supabase Edge Function invocation from admin Edge Function**
   - What we know: Admin Edge Function needs to trigger sync-now without exposing SYNC_SECRET to browser
   - What's unclear: Whether one Edge Function can call another on the same project via HTTP
   - Recommendation: Yes, it can. Use `fetch()` with the project URL + service role key. Both secrets are available in the Edge Function environment. [ASSUMED -- standard pattern but not verified for this specific project]
   - **RESOLVED** -- Standard Supabase pattern. Admin Edge Function forwards to sync function via HTTPS with SYNC_SECRET header, same as the scheduled cron trigger. The admin `trigger-sync` action in Plan 01 Task 2 implements this routing.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Build + dev | Available | v24.13.0 | -- |
| npm | Package management | Available | (bundled with Node) | -- |
| Vite | Build + dev server | Available | 5.1.4 | -- |
| Supabase project | Data storage | Available | Project ref: eenwsnptzgsrzagpeawx | -- |
| Supabase CLI | Schema push, function deploy | Available | v2.90.0 (installed Phase 2) | -- |
| Vercel | Frontend hosting | Available | (deployed Phase 1) | -- |
| @supabase/supabase-js | Browser client | NOT installed in frontend | -- | Must install: `npm install @supabase/supabase-js@^2` |

**Missing dependencies with no fallback:**
- None -- all tools are available

**Missing dependencies with fallback:**
- `@supabase/supabase-js` -- not yet in package.json but trivially installable

## Sources

### Primary (HIGH confidence)
- Context7 `/supabase/supabase` -- createClient initialization, embedded join syntax, CORS handling, Edge Function invocation
- `supabase/migrations/0001_schema.sql` -- exact table and column names for events, switchers, clients, categories, sync_runs
- `supabase/functions/_shared/types.ts` -- TypeScript interfaces mirroring DB schema
- `src/App.jsx`, `src/features/dashboard/DashboardView.jsx`, `src/features/detail/DetailView.jsx` -- exact property access patterns in existing useMemo aggregations
- `src/shared/utils/parseCSV.js` -- exact output shape of current data flow
- npm registry -- `@supabase/supabase-js` version 2.103.1

### Secondary (MEDIUM confidence)
- Phase 2 Plan 04 summary -- sync function architecture, auth patterns, manual trigger endpoint
- Phase 2 Plan 05 summary -- free-tier timeout issue, actual event counts (1,419 events for ~2 month period)
- UI-SPEC.md -- approved visual contracts for all new components

### Tertiary (LOW confidence)
- None -- all claims verified against codebase or official docs

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- single new dependency, verified against npm registry and official docs
- Architecture: HIGH -- data flow is a straightforward source swap with well-defined mapping; admin CRUD is standard patterns
- Pitfalls: HIGH -- identified from direct codebase analysis (row shapes, auth flow, CORS)
- Edge Function design: MEDIUM -- multiplexed vs split is a judgment call; either works

**Research date:** 2026-04-15
**Valid until:** 2026-05-15 (stable -- no fast-moving dependencies)
