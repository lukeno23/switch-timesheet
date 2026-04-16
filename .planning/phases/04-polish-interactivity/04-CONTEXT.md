# Phase 4: Polish & Interactivity - Context

**Gathered:** 2026-04-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Upgrade the dashboard with interactive charts (clickable elements → floating event modals), a weekly calendar view for Switchers, full column sorting/filtering on all task tables, a Task Explorer flat table alongside Categories, a global Historical/Upcoming toggle replacing the collapsible UpcomingEvents sections, richer category drilldowns with switcher/client breakdowns, and classification pipeline improvements (Unknown→Internal reclassification, declined meeting filtering, Management department restriction, user override system with LLM learning).

</domain>

<decisions>
## Implementation Decisions

### Interactive Charts
- **D-01:** Clicking any chart element (bar, pie slice, area segment, line point) opens a **floating modal** showing the underlying events. Reuses the existing `TaskDrilldownModal` pattern. Modal shows entity name, total hours, and event table.
- **D-02:** **All charts** across all views get clickable behavior — bars, pies, areas, line points. Consistent interaction pattern everywhere.
- **D-03:** Modal header shows entity name as a **clickable link** to the full detail view. Chart → modal → deep dive navigation path.

### Calendar View
- **D-04:** **Weekly view** as the default layout — Mon–Thu columns (Switch work week) with time slots and event blocks. Users navigate between weeks with prev/next controls.
- **D-05:** Event blocks show **client name (bold) + task category** below. Color-coded by client using the existing chart palette. Duration reflected by block height.
- **D-06:** Calendar view lives **within the Switcher detail page** — a section or tab, not a new top-level nav entry.
- **D-07:** Clicking a calendar event block opens the same **floating task modal** as chart clicks. Consistent interaction.
- **D-08:** Days with **>8 hours total** get a visual warning — amber/red highlight on the day column. **Fixed 8h threshold**, not configurable.

### Table Filtering & Task Explorer
- **D-09:** Task Explorer returns as a **separate nav entry** alongside the Categories tab. Two distinct nav items.
- **D-10:** All task/event tables (Task Explorer, category drilldowns, detail views, chart modals) get **column header sort + filter controls**. Clickable headers for sort (asc/desc), filter icon opens dropdown with checkboxes (for Switcher, Client, Category, Department) or date range (for Date).
- **D-11:** TaskTable.jsx is upgraded **once** with the filtering system — all instances across the app benefit.

### Historical/Upcoming Toggle
- **D-12:** A **global toggle** ("Historical" / "Upcoming") in the header replaces the current collapsible UpcomingEvents sections on all pages.
- **D-13:** When "Upcoming" is active, all views show the same charts, stats, and breakdowns but filtered to future events. Full analytical experience, not a flat list.
- **D-14:** Toggle is **global** — switching affects Dashboard, Switchers, Clients, Teams, Categories simultaneously.
- **D-15:** Current `UpcomingEvents.jsx` collapsible sections are **removed** in favor of the toggle.

### Category Drilldowns
- **D-16:** Category detail views get richer content — switcher breakdown, client distribution, and trend charts. Not just an event table.
- **D-17:** Switcher detail pages show category breakdown with **per-client distribution** — which clients each Switcher's category time goes to.

### Classification Pipeline Fixes
- **D-18:** **"Unknown" client → "Internal"**: Events with generic/internal titles (break, changes & output, inbox, emails, HR, small tasks) should classify as "Internal" client, not "Unknown". Beef up the Internal catch-all rules in the rule engine.
- **D-19:** **Declined meetings filtered out**: If a Switcher's `responseStatus === 'declined'` for a meeting, that event is excluded from their timesheet data entirely. Filter applied during calendar sync.
- **D-20:** **Management department restricted to management members**: Non-management Switchers should never have events classified under the Management department. Management categories (Accounts, Operations, Business Development, HR) resolve to the Switcher's `primary_dept` for non-management members. The 6 management members: Richard, Melissa, Ed, Lisa, Luke, Andrea.
- **D-21:** **Personal vs Internal distinction**: Personal events (doctor, gym, lunch, breakfast, commute) → filter out entirely (not work). Internal tasks (break, inbox, emails, HR admin, small tasks, changes & output) → classify as "Internal" client (work, but not client-facing). Sharpen the boundary between these two categories in the rule engine.

### Classification Override System
- **D-22:** Management users can **reclassify events directly in the dashboard**. Clicking an event in any table/modal shows current classification (client, category, dept) with dropdown overrides. Save persists the correction.
- **D-23:** Overrides are **sticky** — once a user overrides a classification, it persists across re-syncs. The event is flagged as `classification_method: 'user_override'`. Re-syncs update time/title but don't touch overridden classifications.
- **D-24:** Overrides **feed into LLM context** — stored in the audit log and included in the LLM classification prompt as correction examples ("Event X was reclassified from Y to Z — apply similar logic"). The rule engine stays unchanged, but the LLM improves from corrections over time.

### Claude's Discretion
- Calendar week navigation UI (arrows, date picker, or both)
- Exact position/styling of the Historical/Upcoming toggle in the header
- Sort/filter dropdown styling and animation
- How many recent overrides to include in LLM context (10? 50? all?)
- Whether the override UI is inline in TaskTable rows or via the floating modal

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Prior Phase Context
- `.planning/phases/01-foundation/01-CONTEXT.md` — Module structure, component patterns, Vitest setup
- `.planning/phases/02-data-pipeline/02-CONTEXT.md` — Classification pipeline, rule engine, LLM fallback, sync orchestration, Google Calendar API fields (attendee response status available)
- `.planning/phases/03-dashboard-admin/03-CONTEXT.md` — Supabase data access, admin Edge Functions, dashboard data flow, UpcomingEvents sections (being replaced)

### Existing Components to Modify
- `src/shared/components/TaskTable.jsx` — Gets column sort + filter upgrade (D-10/D-11)
- `src/shared/components/TaskDrilldownModal.jsx` — Pattern for chart click modals (D-01)
- `src/shared/components/UpcomingEvents.jsx` — Being removed and replaced by Historical/Upcoming toggle (D-15)
- `src/features/categories/CategoriesView.jsx` — Category drilldowns being enriched (D-16)
- `src/features/detail/DetailView.jsx` — Gets calendar view section and richer category breakdown (D-06, D-17)
- `src/App.jsx` — Global toggle wiring, Task Explorer nav entry, chart click handlers

### Pipeline Code
- `supabase/functions/sync/` — Sync Edge Function for declined meeting filter (D-19) and override persistence (D-23)
- `supabase/functions/_shared/` — Rule engine for Internal client rules (D-18), Management dept restriction (D-20), personal vs internal distinction (D-21)

### Business Logic
- `Other files/Legend.pdf` — Category + department definitions
- `Other files/instructions.md` — Classification rules (source for personal vs internal distinction)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `TaskDrilldownModal.jsx` — Skeleton for chart-click floating modals. Extend with entity header link (D-03).
- `WeeklyCalendar.jsx` — Existing component may provide a starting point for the calendar view.
- `CATEGORY_DEPARTMENTS` static map in `CategoriesView.jsx` — Reuse for department grouping in enriched drilldowns.
- `useSupabaseData.js` — Hook that loads all events; will need to expose the Historical/Upcoming filter.
- `mapSupabaseRow.js` — Row mapper; override fields need to flow through here.
- `billingCalc.js`, `aggregation.js` — Existing aggregation utils to build on for upcoming data analytics.

### Established Patterns
- `useMemo` for all derived/aggregated data — upcoming analytics reuse the same pattern filtered to future events.
- Feature-based folders (`src/features/`) — calendar goes in `src/features/detail/` or as a shared component.
- Arrow function components, props destructuring, Tailwind utility classes.
- Recharts for all charts — `onClick` handlers on chart elements are built-in Recharts API.

### Integration Points
- Recharts supports `onClick` on `<Bar>`, `<Cell>`, `<Pie>` segments natively — wire to modal open.
- Google Calendar API `attendees[].responseStatus` field available in sync data — filter declined.
- `events` table needs new nullable columns: `override_client_id`, `override_category_id`, `override_department`, `classification_method` enum extended with `'user_override'`.
- New admin Edge Function endpoint for saving classification overrides.
- `audit_log` table already exists — override corrections stored here for LLM context.

</code_context>

<specifics>
## Specific Ideas

- **Upcoming = full analytics, not a flat list** — the toggle gives the upcoming view the same analytical depth as the historical view. This was explicitly called out as the current UpcomingEvents section being "very uninformative."
- **Personal ≠ Internal** — doctor/gym/lunch = remove entirely (not work). Break/inbox/emails/HR admin = keep as Internal client (work, but not client-facing). This distinction must be sharp in the rule engine.
- **Unknown client is the signal** — most "Unknown" events are actually Internal tasks. The rule engine needs stronger Internal catch-all patterns.
- **Override → LLM learning loop** — overrides stored in audit_log feed the LLM prompt as correction examples. This is the user-friendly classification improvement system.
- **8h/day warning on calendar** — visual indicator when a Switcher has >8 hours of events in a single day.
- **Management dept is people-gated** — only the 6 management members can have Management department. Everyone else routes to their primary_dept even for management-sounding categories.

</specifics>

<deferred>
## Deferred Ideas

- Bulk CSV upload for billing (v2)
- Classification confidence score display (CLAS-07)
- Classification audit trail admin UI (CLAS-08)
- Bulk Misc review workflow (CLAS-09)
- Monthly calendar view toggle (only weekly for now)
- Configurable daily hour threshold (fixed at 8h)
- Rule engine auto-generation from overrides (only LLM context for now)

</deferred>

---

*Phase: 04-polish-interactivity*
*Context gathered: 2026-04-16*
