# Roadmap: Switch Timesheet

## Overview

Four phases retire the manual CSV workflow and deliver a fully automated timesheet analytics system. Phase 1 cleans the codebase and deploys to Vercel. Phase 2 builds the data pipeline — Supabase, Google Calendar API, and the hybrid classification engine. Phase 3 connects the dashboard to live data and gives management the admin controls to maintain reference data without code changes. Phase 4 polishes the analytics experience with richer drilldowns, interactive charts, calendar views, and pipeline classification improvements.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Foundation** - Refactor, fix critical bugs, and deploy the frontend to Vercel with password protection
- [ ] **Phase 2: Data Pipeline** - Supabase schema, Google Calendar API sync, and hybrid classification engine
- [ ] **Phase 3: Dashboard + Admin** - Connect dashboard to live Supabase data, build admin UI for reference data management, and add client billing analytics
- [ ] **Phase 4: Polish & Interactivity** - Richer drilldowns, interactive charts, calendar views, task table filtering, and classification pipeline improvements

## Phase Details

### Phase 1: Foundation
**Goal**: A clean, secure, deployed frontend ready to connect to a real backend
**Depends on**: Nothing (first phase)
**Requirements**: QUAL-01, QUAL-02, QUAL-03, QUAL-04, QUAL-05, QUAL-06, QUAL-07, DASH-03, DASH-05
**Success Criteria** (what must be TRUE):
  1. App is live on Vercel and loading correctly (GitHub Pages deployment retired)
  2. Dashboard is behind a password gate — unauthenticated requests see a login screen, not data
  3. Visiting the app with a dev tools console shows zero XSS warnings and no unsafe HTML rendering
  4. App.jsx no longer exists as a monolith — components, hooks, utils, and services are in separate files
  5. Core logic (classification, CSV parsing, data aggregation) has test coverage that passes in CI
**Plans:** 4 plans

Plans:
- [x] 01-01-PLAN.md — Config, tooling, cleanup: Tailwind tokens, Vitest, dependencies, repo cleanup
- [x] 01-02-PLAN.md — Extract shared layer: constants, utils, services, hooks, shared components, ErrorBoundary, PasswordGate
- [x] 01-03-PLAN.md — Extract feature views, rewrite App.jsx as thin shell, wire auth and error boundaries
- [x] 01-04-PLAN.md — Unit tests for core utils, GitHub Actions CI, Vercel deployment prep
**UI hint**: yes

### Phase 2: Data Pipeline
**Goal**: Calendar events for all 15 Switchers are automatically fetched, classified, and stored in Supabase every night
**Depends on**: Phase 1
**Requirements**: PIPE-01, PIPE-02, PIPE-03, PIPE-04, PIPE-05, PIPE-06, CLAS-01, CLAS-02, CLAS-03, CLAS-04, CLAS-05, CLAS-06
**Success Criteria** (what must be TRUE):
  1. A nightly pg_cron job runs without manual intervention and the dashboard shows an updated "Last synced" timestamp each morning
  2. Personal, all-day, and zero-duration calendar events do not appear in timesheet data
  3. Each stored event has a classification_method field populated as "rule", "llm", or "misc"
  4. The Misc rate for a representative two-month dataset is below 2% (down from the current ~82 rule-unresolved entries)
  5. Client name aliases and typos (e.g. WRH, PP, FYO) resolve to canonical names in stored data
**Plans:** 5 plans

Plans:
- [x] 02-01-PLAN.md — Supabase schema, seed data, RLS, shared TypeScript types
- [x] 02-02-PLAN.md — Rule engine port (process_export.py), event filter, title parser, alias resolver
- [x] 02-03-PLAN.md — Google Calendar API auth, calendar fetcher, LLM classifier, audit pass, output validator
- [x] 02-04-PLAN.md — Sync Edge Function orchestrator and test fixtures
- [x] 02-05-PLAN.md — pg_cron schedule, CI update, schema push, end-to-end verification

### Phase 3: Dashboard + Admin
**Goal**: Management can view live timesheet analytics and maintain reference data without touching code
**Depends on**: Phase 2
**Requirements**: ADMN-01, ADMN-02, ADMN-03, ADMN-04, DASH-01, DASH-02, DASH-04, BILL-01, BILL-02
**Success Criteria** (what must be TRUE):
  1. Dashboard displays data from Supabase — CSV upload UI is gone
  2. All existing views (dashboard, switchers, teams, clients, categories, detail drilldowns) work with live data
  3. Changing the date range filter triggers a fresh AI narrative report — stale cached reports are no longer served
  4. A management user can add a new Switcher, client, or task category in the admin UI and the next nightly sync picks it up without a code deployment
  5. A management user can enter monthly billing data for a client and the dashboard shows hours-to-billing ratio for that client
**Plans:** 7 plans

Plans:
- [x] 03-01-PLAN.md — DB migrations (client_billing, admin columns, anon RLS) + admin Edge Function with auth verifier
- [x] 03-02-PLAN.md — Supabase client, data hooks, row mapper, admin API wrapper, utility modules, PasswordGate hash store
- [x] 03-03-PLAN.md — Dashboard data source swap (CSV to Supabase), delete UploadView, Admin nav, last-synced footer, sync chip
- [x] 03-04-PLAN.md — Admin UI: AdminView tabs, AdminTable, AdminModal, all 5 entity tabs (Switchers/Clients/Categories/Billing/Sync)
- [x] 03-05-PLAN.md — AI report keyed cache fix (DASH-04) + unit tests for mapSupabaseRow, billingCalc, cacheKey, relativeTime
- [x] 03-06-PLAN.md — Billing analytics: EUR/hr column in Clients list, monthly billing series in client drilldown
- [x] 03-07-PLAN.md — Upcoming events collapsible sections (Dashboard/Switchers/Clients/Departments) + final Phase 3 UAT
**UI hint**: yes

### Phase 4: Polish & Interactivity
**Goal**: A more interactive, analytically rich dashboard with deeper drilldowns, clickable charts, calendar views, and improved classification accuracy
**Depends on**: Phase 3
**Requirements**: SC-04-01, SC-04-02, SC-04-03, SC-04-04, SC-04-05, SC-04-06, SC-04-07
**Success Criteria** (what must be TRUE):
  1. Category drilldowns show switcher breakdown, client distribution, and trend charts — not just an event table
  2. A Task Explorer flat table is available alongside the Categories tab for quick event search/filtering
  3. All task/event tables support column sorting and filtering
  4. Clicking any chart bar, slice, or segment opens a floating modal showing the underlying events
  5. Each Switcher has a calendar view showing their schedule in a Google Calendar-style layout
  6. Switcher detail pages show category breakdown with per-client distribution
  7. Additional data processing/classification rules from the user are applied to the sync pipeline
**Plans:** 7 plans

Plans:
- [x] 04-01-PLAN.md — Classification pipeline fixes: Internal catch-all rules, personal/internal boundary, declined meeting filter, Management dept restriction
- [x] 04-02-PLAN.md — Override schema + backend: DB migration, admin Edge Function save-override action, mapSupabaseRow override fields, adminApi wrapper
- [x] 04-03-PLAN.md — Schema push + shared UI components: ChartDrilldownModal, HistoricalUpcomingToggle, FilterDropdown, ClassificationOverridePanel, TaskDrilldownModal update
- [x] 04-04-PLAN.md — TaskTable column filtering upgrade + Task Explorer view
- [ ] 04-05-PLAN.md — WeeklyCalendar 4-day upgrade + category drilldown analytics + Switcher calendar and per-client breakdown
- [ ] 04-06-PLAN.md — App.jsx wiring: toggle state, Task Explorer nav, chart click handlers, UpcomingEvents removal
- [ ] 04-07-PLAN.md — LLM override learning loop, sync override persistence guard, final Phase 4 verification checkpoint
**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 4/4 | Complete | - |
| 2. Data Pipeline | 5/5 | Complete | - |
| 3. Dashboard + Admin | 7/7 | Complete | - |
| 4. Polish & Interactivity | 0/7 | Planning complete | - |
