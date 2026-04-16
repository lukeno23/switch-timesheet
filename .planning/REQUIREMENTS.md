# Requirements: Switch Timesheet

**Defined:** 2026-04-14
**Core Value:** Accurate, automated visibility into how Switch's time is allocated across clients, tasks, and departments — without manual intervention.

## v1 Requirements

Requirements for milestone v1: retire the manual CSV workflow and deliver an automated, self-maintaining timesheet analytics system.

### Data Pipeline

- [ ] **PIPE-01**: System syncs all 15 Switcher calendars nightly via Google Calendar API with service account + domain-wide delegation
- [ ] **PIPE-02**: Sync covers a rolling 7-day window to catch late-added or edited events
- [ ] **PIPE-03**: Events are stored in Supabase with upsert on (switcher_id, google_event_id)
- [ ] **PIPE-04**: Personal events, all-day events, and zero-duration events are filtered automatically
- [ ] **PIPE-05**: Sync job runs via pg_cron trigger on Supabase Edge Function
- [ ] **PIPE-06**: Dashboard shows "Last synced" timestamp

### Classification

- [ ] **CLAS-01**: Deterministic rule engine (TypeScript port of process_export.py) classifies ~98% of events
- [ ] **CLAS-02**: Gemini LLM fallback classifies events that rules cannot resolve (targeting <2% Misc rate)
- [ ] **CLAS-03**: LLM output is validated against canonical client/category lists before database write
- [ ] **CLAS-04**: Client name aliases and typos are resolved automatically (~35 known clients with aliases)
- [ ] **CLAS-05**: Per-Switcher department assignment logic is preserved (Ed, Lisa, designers, management members — all special handling)
- [ ] **CLAS-06**: Each classified event records its classification method (rule/llm/misc)

### Admin

- [ ] **ADMN-01**: Management users can add/remove Switchers and set their primary department and management member status
- [ ] **ADMN-02**: Management users can add/remove client names and configure aliases
- [ ] **ADMN-03**: Management users can add/remove task categories with optional LLM hint text
- [ ] **ADMN-04**: Reference data changes are picked up by the next nightly classification run

### Dashboard

- [ ] **DASH-01**: Dashboard reads timesheet data from Supabase instead of CSV upload
- [x] **DASH-02**: All existing views preserved (dashboard, switchers, teams, clients, categories, detail drilldowns)
- [ ] **DASH-03**: Simple password protection gates access to the dashboard
- [ ] **DASH-04**: AI narrative reports (Gemini) invalidate correctly when date range changes
- [ ] **DASH-05**: Frontend deployed to Vercel (replaces GitHub Pages)

### Billing

- [ ] **BILL-01**: Management users can input monthly billing amounts per client (manual entry per client/month or bulk CSV upload)
- [x] **BILL-02**: Dashboard shows hours-to-billing analysis per client per month (hours spent, amount billed, effective hourly rate, over/under-serviced indicators)

### Code Quality

- [ ] **QUAL-01**: App.jsx refactored into modular component architecture (components, hooks, utils, services)
- [ ] **QUAL-02**: XSS vulnerability fixed — Gemini HTML output sanitized with DOMPurify before rendering
- [ ] **QUAL-03**: Hardcoded hex colors extracted into Tailwind theme tokens
- [ ] **QUAL-04**: Error boundaries prevent white-screen crashes on runtime errors
- [ ] **QUAL-05**: Performance fixes — Math.min/max spread replaced with reduce, calendar filtering optimized with pre-grouped Map
- [ ] **QUAL-06**: Repo artifacts cleaned up (app.jsx.scpt, vite.config backup files, .DS_Store in gitignore)
- [ ] **QUAL-07**: Test coverage for classification logic and CSV/data parsing

## v2 Requirements

Deferred to future iteration. Tracked but not in current roadmap.

### Classification Enhancements

- **CLAS-07**: Classification confidence score displayed in event drilldowns
- **CLAS-08**: Classification audit trail viewable in admin panel (classified_at, method, confidence)
- **CLAS-09**: Bulk review workflow for events classified as Misc (only if Misc rate >5%)

### Dashboard Enhancements

- **DASH-06**: Cross-department visibility scoping (management members see all; others see own department)

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Full authentication / RBAC | Deferred to ERP integration project |
| Real-time calendar sync | Nightly batch sufficient for planning/review tool; avoids quota issues |
| Per-entry manual correction UI | Creates dual source of truth with Google Calendar; improve classifier instead |
| Employee self-service (Switchers view own hours) | Management-only tool; requires per-user auth |
| Invoice generation from hours | Complex billing logic (rates, terms, periods) out of scope for analytics tool |
| Predictive scheduling / forecasting | Requires forward-looking data model; future ERP feature |
| Mobile native app | Dashboard already responsive via Tailwind; PWA on Vercel if needed |
| ERP integration | Separate project; not factored into this milestone |
| Tailwind v4 / Recharts v3 upgrades | Breaking changes; risky mid-milestone. Defer to dedicated cleanup |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| PIPE-01 | Phase 2 | Pending |
| PIPE-02 | Phase 2 | Pending |
| PIPE-03 | Phase 2 | Pending |
| PIPE-04 | Phase 2 | Pending |
| PIPE-05 | Phase 2 | Pending |
| PIPE-06 | Phase 2 | Pending |
| CLAS-01 | Phase 2 | Pending |
| CLAS-02 | Phase 2 | Pending |
| CLAS-03 | Phase 2 | Pending |
| CLAS-04 | Phase 2 | Pending |
| CLAS-05 | Phase 2 | Pending |
| CLAS-06 | Phase 2 | Pending |
| ADMN-01 | Phase 3 | Pending |
| ADMN-02 | Phase 3 | Pending |
| ADMN-03 | Phase 3 | Pending |
| ADMN-04 | Phase 3 | Pending |
| DASH-01 | Phase 3 | Pending |
| DASH-02 | Phase 3 | Complete |
| DASH-03 | Phase 1 | Pending |
| DASH-04 | Phase 3 | Pending |
| DASH-05 | Phase 1 | Pending |
| QUAL-01 | Phase 1 | Pending |
| QUAL-02 | Phase 1 | Pending |
| QUAL-03 | Phase 1 | Pending |
| QUAL-04 | Phase 1 | Pending |
| QUAL-05 | Phase 1 | Pending |
| QUAL-06 | Phase 1 | Pending |
| QUAL-07 | Phase 1 | Pending |
| BILL-01 | Phase 3 | Pending |
| BILL-02 | Phase 3 | Complete |

**Coverage:**
- v1 requirements: 30 total
- Mapped to phases: 30
- Unmapped: 0 ✓

---
*Requirements defined: 2026-04-14*
*Last updated: 2026-04-14 after roadmap creation*
