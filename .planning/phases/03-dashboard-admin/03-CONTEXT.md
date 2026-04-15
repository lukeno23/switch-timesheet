# Phase 3: Dashboard + Admin - Context

**Gathered:** 2026-04-15
**Status:** Ready for planning

<domain>
## Phase Boundary

Connect the dashboard to live Supabase data (retiring the CSV upload flow), build an admin UI for reference data (Switchers, clients, categories), surface sync status and upcoming events, and add client monthly billing data entry + hours-to-billing analytics. Also fix DASH-04 — the stale AI-report cache bug that survives date-range changes.

Requirements covered: ADMN-01, ADMN-02, ADMN-03, ADMN-04, DASH-01, DASH-02, DASH-04, BILL-01, BILL-02.

</domain>

<decisions>
## Implementation Decisions

### Supabase Data Access
- **D-01:** Dashboard reads live data via Supabase **anon key + read-only RLS policies**. The shared password gate (Phase 1 D-03/D-04) is the security boundary — anyone past the gate can read, no one past the gate can write. Fastest path; no extra API layer.
- **D-02:** Admin writes (create/update/soft-delete of switchers, clients, categories, billing) go through **dedicated Edge Function endpoints** that hold the service role key. The service role never touches the browser.
- **D-03:** Admin Edge Functions authenticate callers by reading an `x-switch-auth` header containing the **same SHA-256 password hash** from Phase 1 D-04. Hash stored as a Supabase Edge Function secret (`SWITCH_AUTH_HASH`) and as a Vercel env var (`VITE_APP_PASSWORD_HASH`). Rotating the password rotates both in lockstep.
- **D-04:** Anon `SELECT` RLS policies on a **broad set of tables**: `events`, `switchers`, `clients`, `client_aliases`, `categories`, `sync_runs`, `client_billing`, `audit_log`. No anon `INSERT/UPDATE/DELETE` anywhere. Keeps reads simple; `audit_log` readable so a v2 admin audit surface is easy.

### Admin UI
- **D-05:** Admin lives as a **new top-level nav entry** alongside Dashboard / Switchers / Teams / Clients / Categories. The Admin page has sub-sections for Switchers, Clients, Categories, Billing, and Sync.
- **D-06:** CRUD style is **table + modal**. Each entity renders as a table; "Add" and row-click open modal forms with validation. No inline cell editing, no full-page forms. Reuses the existing `SettingsModal.jsx` / `TaskDrilldownModal.jsx` patterns.
- **D-07:** **Same password gate** — all ~6 management users who are past the shared password see Admin. No separate admin role, no per-user accounts (consistent with Phase 1 D-03).
- **D-08:** **Soft delete** via an `active` boolean. `switchers` and `clients` already have it; a migration adds `active` to `categories`. Soft-deleted rows are hidden from pickers and skipped by sync but still referenced by historical events. Each admin table has a "Show deactivated" toggle for reactivation.
- **D-09:** Editable fields per entity:
  - **Switcher:** name, email, `primary_dept`, `is_management_member`, `active`
  - **Client:** name, `active`, `target_hourly_rate` (new nullable column — see D-15), add/remove aliases (nested list)
  - **Category:** name, `department`, `llm_hint`, `active`
- **D-10:** "Sync now" button lives in the Admin > Sync sub-section (not in the main header — avoids accidental triggers during a presentation). "Last synced" timestamp is shown in the **main header**, visible across every view.
- **D-11:** **Server-side validation** in the admin Edge Functions returns friendly plain-English errors (alias uniqueness, email uniqueness, allowed department values, warning before deactivating a switcher with upcoming events). UI surfaces errors as toasts or inline form messages. No raw Postgres error strings in the UI.

### Billing Feature
- **D-12:** Billing entry is **manual per-client/month form only** for v1. Bulk CSV upload is explicitly deferred to v2 (BILL-01 allows either). Keeps Phase 3 scope tight.
- **D-13:** New `client_billing` table — **one row per client per month**:
  ```
  id uuid PK
  client_id uuid FK -> clients(id)
  year_month date           -- first of month
  amount numeric            -- raw amount in `currency`
  currency text NOT NULL    -- 'EUR' | 'USD'
  fx_rate_to_eur numeric    -- nullable; required when currency = 'USD' (see D-16)
  eur_equivalent numeric    -- stored; = amount when EUR, = amount * fx_rate_to_eur when USD
  billing_type text         -- nullable; 'retainer' | 'project' | null (see D-13b)
  notes text                -- nullable
  entered_by text           -- free-text label (no user accounts)
  created_at timestamptz
  updated_at timestamptz
  UNIQUE (client_id, year_month)
  ```
- **D-13b:** A month with no `client_billing` row = "no billing entered" — excluded from effective-rate aggregates. `billing_type` is optional metadata to distinguish retainers from project work; no behavioral consequence in v1.
- **D-14:** Hours-to-billing analytics surface in the **existing Clients view + per-client drilldown**. Clients list gets an extra column showing the current-month effective hourly rate. The drilldown shows a monthly time series (hours worked, amount billed, effective €/hour, over/under delta).
- **D-15:** Over/under-serviced indicator is driven by a per-client configurable **`target_hourly_rate`** (new nullable column on `clients`). Admin sets targets where they apply; unset = no indicator. Delta shown as %.
- **D-16:** Currency support = **EUR + USD**. USD is the only non-EUR currency actually billed (some US-based clients). FX rate is captured at entry time and **stored per billing entry** (`fx_rate_to_eur` + `eur_equivalent` columns). No live FX API, no per-display conversion; the row remembers the rate it was booked at.
- **D-17:** Display = **EUR primary** for all agency-wide aggregates and charts. Per-client drilldown additionally shows the raw amount + original currency + captured FX rate alongside the EUR equivalent (e.g. "$10,000 USD @ 0.92 = €9,200").
- **D-18:** **Edit-freely** policy — any admin can edit or delete any billing entry. Track `updated_at`; no immutable audit log. The 6-person management team trusts each other and numbers get corrected frequently.

### Dashboard Migration
- **D-19:** **Upfront load** strategy — on login, fetch all events from **Jan 4, 2026 forward** plus all upcoming events in a single query. Store in state. Date-range and entity filters operate in-memory, preserving the existing useMemo patterns from Phase 1. Full historical comparison available without per-filter network round-trips.
- **D-20:** **Backfill reconciliation** — Phase 2 D-15 backfilled from Feb 1, 2026. Phase 3 triggers a one-off historical sync for Jan 4–31, 2026 so the baseline matches D-19. Planner should include a one-shot migration step that hits the manual-sync endpoint with this window.
- **D-21:** **Delete `src/features/upload/UploadView.jsx` entirely** (plus its routing wiring in `App.jsx`). The `parseCSV` utility in `src/shared/utils/parseCSV.js` stays — its tests are still meaningful and it may serve a future bulk-import feature.
- **D-22:** **Keyed AI-report cache** fixes DASH-04. Replace `useState(null)` for `aiReport` in both `DashboardView.jsx` (line ~181) and `DetailView.jsx` (line ~128) with `useState({ key: null, report: null })`. Key = stable hash of (dateRange + active filters + selected entity). Reopening with the same filters reuses the cached report; any change invalidates. Saves Gemini quota on repeat views.
- **D-23:** **Upcoming events surface** = lightweight collapsible section on the main Dashboard showing the next 14 days, plus **equivalent surfaces in the Switchers, Clients, and Departments views** (Luke explicitly called out that all three perspectives matter for capacity planning). Uses `temporal_status = 'upcoming'` from Phase 2 D-24. Clear visual separator ("Not yet happened — will update after sync").
- **D-24:** **Last-synced timestamp** = relative ("3 hours ago") in the header with absolute timestamp ("Apr 15 2026, 05:12 CET") in a tooltip on hover.
- **D-25:** **Sync-now UX** — admin clicks button, UI fires the manual-sync Edge Function (Phase 2 D-18), then polls `sync_runs` every 3s for the new run's status. Shows live progress ("N of 15 switchers done") when per-switcher counts are available; otherwise a generic spinner. On completion, toast "Sync complete — N events updated" and refresh dashboard data. After ~3 minutes of polling, falls back to "still running in background".
- **D-26:** **Partial sync failure** surface — when the latest `sync_runs` row has non-empty `errors`, show an amber "⚠ Sync issues" chip next to the Last-synced timestamp in the header. Clicking the chip opens the Admin > Sync log with per-switcher error detail. Non-intrusive but always visible.

### Claude's Discretion
- Ordering of Admin sub-sections (Switchers / Clients / Categories / Billing / Sync)
- Month picker UX in billing entry (native `<input type="month">` vs custom dropdown)
- Skeleton vs spinner for initial data load, and exact loading copy
- Hydration join pattern — Postgres embed via `supabase-js .select('*, switcher:switchers(*), client:clients(*), category:categories(*)')` vs client-side join from cached reference tables. Whichever is simpler and performs well.
- Empty-state copy when the DB has no events yet (pre-first-sync scenario)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Prior Phase Context
- `.planning/phases/01-foundation/01-CONTEXT.md` — Module structure (`src/features/`, `src/shared/`), password gate decisions (D-03/D-04), color tokens, Vitest setup
- `.planning/phases/02-data-pipeline/02-CONTEXT.md` — Supabase schema, RLS posture, sync orchestration, manual-sync endpoint design, classification pipeline, `temporal_status` column, backfill decisions

### Requirements & Roadmap
- `.planning/REQUIREMENTS.md` — Full definitions of ADMN-01..04, DASH-01/02/04, BILL-01/02
- `.planning/ROADMAP.md` § "Phase 3: Dashboard + Admin" — Five success criteria to satisfy

### Existing Database
- `supabase/migrations/0001_schema.sql` — Existing schema (switchers, clients, client_aliases, categories, events, sync_runs, audit_log). Phase 3 adds: `client_billing` table, `active` column on categories, `target_hourly_rate` column on clients.
- `supabase/migrations/0003_rls.sql` and `supabase/migrations/0005_rls_policies.sql` — Existing RLS. Phase 3 adds anon `SELECT` policies per D-04.

### Existing Edge Function Pattern
- `supabase/functions/sync/` — Pattern for Edge Function structure, secret handling, and manual-trigger endpoint. Follow this structure for new admin endpoints.
- `supabase/functions/_shared/` — Shared helpers (types, Supabase client factory). Extend with auth-hash verifier for admin endpoints.

### Existing Frontend
- `src/App.jsx` — Thin routing shell; will get a new Admin view added and the Upload view removed. Header region gets Last-synced timestamp + sync-issues chip.
- `src/features/dashboard/DashboardView.jsx` line ~181 — `aiReport` state to replace with keyed cache (D-22)
- `src/features/detail/DetailView.jsx` line ~128 — same fix
- `src/features/upload/UploadView.jsx` — TO BE DELETED (D-21)
- `src/shared/components/PasswordGate.jsx` — Source of the verified password hash; admin writes reuse this hash via the request header (D-03)
- `src/shared/components/SettingsModal.jsx` — Pattern to follow for admin modal forms
- `src/shared/components/TaskDrilldownModal.jsx` — Pattern for row-click drilldowns
- `src/shared/services/gemini.js` — Gemini caller; D-22 cache lives in the caller, not in this module (service stays pure)

### Business / Classification Reference
- `Other files/Legend.pdf` — Authoritative reference for category + department definitions. Admin UI validation (department values, category structure) must agree with this.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Modal patterns:** `SettingsModal.jsx` (single-purpose settings) and `TaskDrilldownModal.jsx` (data drilldown) are both reusable skeletons for admin CRUD modals.
- **Password hash:** already verified by `PasswordGate.jsx` and kept in sessionStorage per Phase 1 D-04. Admin write wrapper just pulls it and stamps the `x-switch-auth` header.
- **`useMemo` aggregations:** All the dashboard charts (Recharts) already consume pre-aggregated arrays derived from `data` state via `useMemo`. Swapping `data` from "parsed CSV" to "Supabase rows" is mechanical once the row shape is isomorphic.
- **Lucide icons:** Already used across nav — pick `Settings` / `ShieldCheck` for the Admin entry, `RefreshCw` for Sync now, `AlertTriangle` for the sync-issues chip.
- **`clsx` + `tailwind-merge`:** Already installed (Phase 1) — use for admin table/chip conditional classes.
- **Vitest + GitHub Actions CI:** Already wired from Phase 1 — add new utility tests (FX conversion, effective-rate calculator, sync-status chip state) without new setup.

### Established Patterns
- Feature folders: `src/features/{feature}/`. Phase 3 adds `src/features/admin/` (with sub-folders per entity if the tree gets big) and `src/features/billing/` (charts + drilldown).
- Services: `src/shared/services/`. Phase 3 adds `supabase.js` (anon-client factory) and `adminApi.js` (fetch wrapper that auto-stamps the auth hash).
- Hooks: arrow functions, `useState` for UI state, `useMemo` for derived data, `useEffect` for side-effects. Add a new `useSupabaseEvents()` hook to own the upfront load.
- Arrow-function components, props destructuring, default-prop via JS defaults.
- Early-return pattern for loading/empty/error states on views.

### Integration Points
- **Vercel env vars:** add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. These are safe to expose to the browser.
- **Supabase Edge Function secrets:** add `SWITCH_AUTH_HASH` (same value as Vercel's `VITE_APP_PASSWORD_HASH`). Rotate in lockstep.
- **New migrations:**
  - `0006_client_billing.sql` — new `client_billing` table per D-13
  - `0007_admin_columns.sql` — add `active` to categories, `target_hourly_rate` to clients
  - `0008_anon_read_policies.sql` — SELECT policies for anon per D-04
- **New Edge Functions:** `supabase/functions/admin-switchers/`, `admin-clients/`, `admin-categories/`, `admin-billing/` (or a single multiplexed `admin/` function with action routing — planner's call). All share an auth-hash check in `_shared/`.
- **Nav shell (App.jsx):** replace the Upload-view gate with a "no data yet" empty state driven by Supabase fetch result. Add Admin entry to the nav array.
- **Existing dependencies:** `@supabase/supabase-js` is NOT yet installed frontend-side (Phase 2 only used it server-side in Edge Functions). Planner adds it as a frontend dep.

</code_context>

<specifics>
## Specific Ideas

- **Jan 4, 2026 is the anchor date for historical data** — earlier than Phase 2's Feb 1 backfill. A one-off sync extends coverage; classification is a one-time per-event cost so there's no recurring LLM spend.
- **Full historical visibility matters for comparisons** — upfront load strategy is deliberate; don't paginate or date-window in a way that hides older data.
- **USD is the only non-EUR currency that actually gets billed** — scope FX handling narrowly to EUR + USD, not "international multi-currency".
- **FX rate stored per entry, not fetched at display** — historical accuracy + no live API dependency.
- **All three upcoming-events angles matter** — by switcher (capacity), by client (servicing), by department (team load). Build all three; they're cheap once the data is loaded.
- **Management team trusts each other** — no per-user audit for billing edits. This is deliberate.
- **Sync now button lives in Admin, not header** — deliberate UX choice to prevent accidental triggers during presentations.
- **CSV upload UI deletion is a hard break** — success criterion #1 explicitly requires it gone.

</specifics>

<deferred>
## Deferred Ideas

- **Bulk CSV upload for billing** — v2. Manual entry covers the MVP workflow.
- **Immutable billing audit log** — v2. `updated_at` is sufficient while the team is small and trusted.
- **Per-user accounts / per-user activity trail** — waiting on ERP integration.
- **LLM classification audit trail UI** — already in Phase 2's deferred list; could surface as an Admin read-only view in v2.
- **Classification feedback loop** (CLAS-07/08/09) — v2 per Phase 2 deferred list.
- **Live FX rates from an external API** — deliberately rejected in favor of stored-per-entry rate.
- **Admin-from-raw-event flow** (one-click "add this as a client" from a sync review queue) — not required by ADMN-01..04. Candidate for v2.
- **EUR/USD display toggle in header** — deferred in favor of EUR-primary + raw-shown-in-drilldown.

</deferred>

---

*Phase: 03-dashboard-admin*
*Context gathered: 2026-04-15*
