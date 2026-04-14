# Switch Timesheet

## What This Is

An automated timesheet analytics tool for Switch, a creative agency in Malta with 15 team members ("Switchers"). The system pulls Google Calendar data nightly, classifies each event into the correct client, task category, and department using a hybrid rule-based + LLM approach, stores results in Supabase, and presents an interactive dashboard for the management team to see where agency time is being spent.

## Core Value

Accurate, automated visibility into how Switch's time is allocated across clients, tasks, and departments — without manual intervention.

## Requirements

### Validated

- ✓ Interactive data visualization dashboard with multiple views (dashboard, switchers, teams, clients, categories, detail drilldowns) — existing
- ✓ Date range filtering — existing
- ✓ CSV-based data ingestion and parsing — existing
- ✓ AI-powered analysis reports via Gemini — existing
- ✓ Google Calendar data extraction via Apps Script — existing (CalendarExtractor.gs)
- ✓ Rule-based task classification (client, category, department) — existing (process_export.py)
- ✓ LLM-based classification script — existing but untested (classify_with_ai.py)
- ✓ Deployed to GitHub Pages — existing (being replaced)

### Active

- [ ] Direct Google Calendar API integration with service account + domain-wide delegation (replaces manual Apps Script workflow)
- [ ] Nightly automated sync of calendar data for all Switchers
- [ ] Hybrid classification pipeline: deterministic rules for clear cases, LLM for ambiguous entries
- [ ] Supabase backend for persistent data storage (separate project, free tier)
- [ ] Dashboard reads from Supabase instead of CSV upload
- [ ] Admin: manage Switcher roster (add/remove, set department, mark as management member)
- [ ] Admin: manage client names (add/remove, set aliases)
- [ ] Admin: manage task categories (add/remove, configure classification hints for LLM)
- [ ] Simple password protection for dashboard access
- [ ] Refactor monolithic App.jsx (~2150 lines) into modular component architecture
- [ ] Fix XSS vulnerability: sanitize Gemini HTML output before rendering
- [ ] Fix stale AI report caching (reports don't invalidate when date range changes)
- [ ] Extract hardcoded colors into Tailwind theme tokens
- [ ] Add error boundaries to prevent white-screen crashes
- [ ] Fix performance issues (Math.min/max spread on large arrays, unoptimized calendar filtering)
- [ ] Add test coverage (prioritize parseCSV, classification logic, data aggregation)
- [ ] Clean up repo artifacts (app.jsx.scpt, vite.config backup files, .DS_Store)
- [ ] Deploy frontend to Vercel (replace GitHub Pages)
- [ ] File validation on data ingestion (size, format)

### Out of Scope

- Full authentication system — deferred to ERP integration
- ERP integration — separate project, not factored into this work
- Mobile app — web-first
- Real-time sync — overnight sync is sufficient
- Individual record editing by management users — system should be accurate enough to not need this
- Video/rich media in dashboard
- Multi-tenant support — Switch only

## Context

### The Business
Switch is a creative agency in Malta. The 15 Switchers span 5 departments: Design, Marketing, PM, Brand, and Management. Some Switchers (Richard, Melissa, Ed, Lisa, Luke, Andrea) are management members with cross-department visibility. The management team uses this tool for time allocation analysis.

### The Data Pipeline (Current — Being Replaced)
1. Google Apps Script (`CalendarExtractor.gs`) runs manually from script.google.com, pulls events from all 15 calendars for a date range
2. User downloads the Google Sheet as CSV
3. Python script (`process_export.py`) classifies each event: client name (from ~35 known clients with aliases), task category (from ~35 categories across 5 departments), and department (complex rules per Switcher)
4. User uploads the classified CSV into the React dashboard

### Classification Complexity
The classification rules are substantial (~500 lines of Python). Key challenges:
- Event titles follow a `Client | Task Details` convention, but not consistently
- Client names have many aliases and typos (WRH→Levaris, PP→Palazzo Parisio, FYO→Fyorin, etc.)
- Department assignment depends on BOTH the task category AND the specific Switcher (e.g., Ed doing Copywriting→Marketing, but Ed doing Strategy→Brand)
- Cross-department categories (Emails, QA, Meetings, etc.) map to the Switcher's primary department
- ~82 entries currently fall to "Misc" with the rule-based system

### Existing Dashboard
React 18 SPA built with Vite, Tailwind CSS, Recharts, and Lucide icons. Functional and deployed to GitHub Pages. Major tech debt: entire app is one 2150-line file (App.jsx), zero test coverage, hardcoded colors, XSS risk from unsanitized AI output, inline style tags, performance issues with large datasets.

### Reference Data (in `Other files/`)
- `instructions.md` — comprehensive classification rules and business logic
- `Legend.pdf` — authoritative reference for task categories and departments
- `CalendarExtractor.gs` — current Google Apps Script
- `process_export.py` — rule-based classifier
- `classify_with_ai.py` — LLM-based classifier (untested)
- `compare_outputs.py` — comparison tool for rule vs AI output
- Multiple CSV files — raw exports and classified outputs for Jan-Feb 2026

## Constraints

- **Hosting**: Frontend on Vercel free tier, backend on Supabase free tier (separate project from ERP)
- **Google Workspace**: Service account with domain-wide delegation for calendar access (Luke has admin access)
- **LLM Provider**: Gemini already in use for dashboard AI insights; continue with Gemini for classification pipeline
- **Budget**: Free tiers where possible; LLM API costs should be minimal (~200 events/day across 15 people)
- **Sync**: Nightly batch sync, not real-time
- **Team size**: 15 Switchers, ~6 management users for the dashboard
- **Data volume**: ~4000 rows per 2-month period — well within free tier limits

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Direct Google Calendar API over Apps Script | Enables full automation; Apps Script requires manual runs and date range updates | — Pending |
| Supabase as separate project from ERP | Keeps free tier limits independent; integration deferred to ERP project | — Pending |
| Hybrid classification (rules + LLM) | Rules provide consistency for clear cases; LLM handles ambiguous entries and adapts to new patterns | — Pending |
| Vercel for frontend hosting | Free tier, zero-config Vite/React deployment, replaces GitHub Pages | — Pending |
| Admin-managed reference data over hardcoded config | Switchers, clients, and categories change over time; management should update without code changes | — Pending |
| Password protection over full auth | Sufficient for internal management tool; full auth comes with ERP integration | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-14 after initialization*
