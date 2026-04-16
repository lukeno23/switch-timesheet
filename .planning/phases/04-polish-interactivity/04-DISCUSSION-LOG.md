# Phase 4: Polish & Interactivity - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-16
**Phase:** 04-polish-interactivity
**Areas discussed:** Interactive charts, Calendar view, Table filtering, Pipeline rules, Upcoming data presentation

---

## Interactive Charts

### Q1: What should happen when a user clicks a chart element?

| Option | Description | Selected |
|--------|-------------|----------|
| Floating modal | Popup showing underlying events, reuses TaskDrilldownModal pattern | ✓ |
| Navigate to detail | Full page transition to existing detail view | |
| Inline expand | Chart section expands to show mini event table below | |

**User's choice:** Floating modal
**Notes:** Chart stays visible behind the modal. Consistent with existing TaskDrilldownModal pattern.

### Q2: Which charts should get clickable behavior?

| Option | Description | Selected |
|--------|-------------|----------|
| All charts | Every bar, pie slice, area, and line point across all views | ✓ |
| Only bar & pie charts | Bar and pie get clicks; trend charts don't | |
| Dashboard charts only | Only main dashboard view charts | |

**User's choice:** All charts

### Q3: Should modal have navigation to full detail page?

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — link to detail | Entity name as clickable link in modal header | ✓ |
| No — self-contained | Modal only shows event table | |

**User's choice:** Yes — link to detail

---

## Calendar View

### Q1: Default time scale?

| Option | Description | Selected |
|--------|-------------|----------|
| Weekly view | Mon–Thu columns with time slots and event blocks | ✓ |
| Monthly view | Month grid with dots/badges per day | |
| Both with toggle | Default weekly, toggle to monthly | |

**User's choice:** Weekly view

### Q2: Event block display?

| Option | Description | Selected |
|--------|-------------|----------|
| Client + category | Client bold, category below, color-coded by client | ✓ |
| Client only | Just client name, color-coded | |
| Full event title | Raw Google Calendar title | |

**User's choice:** Client + category

### Q3: Access point?

| Option | Description | Selected |
|--------|-------------|----------|
| Switcher detail page | Section/tab within existing Switcher drilldown | ✓ |
| Separate top-level tab | New Calendar nav entry | |
| Both | Available in detail AND as standalone tab | |

**User's choice:** Switcher detail page

### Q4: Additional requirements (user-initiated)

**User added:** 
- Clicking a calendar event opens the floating task modal (consistent with chart clicks)
- Days with >8 hours should show a visual warning

### Q5: Overtime threshold?

| Option | Description | Selected |
|--------|-------------|----------|
| Fixed 8h threshold | Hardcoded at 8 hours per day | ✓ |
| Configurable threshold | Admin sets per-Switcher or global threshold | |

**User's choice:** Fixed 8h threshold

---

## Table Filtering

### Q1: Task Explorer flat table placement?

| Option | Description | Selected |
|--------|-------------|----------|
| Tab toggle within Categories | Two modes in one nav entry | |
| Separate nav entry | Task Explorer as its own nav tab | ✓ |
| No flat table | Skip entirely | |

**User's choice:** Separate nav entry

### Q2: Filtering controls?

| Option | Description | Selected |
|--------|-------------|----------|
| Column headers with sort + filter dropdowns | Clickable headers for sort, filter icon with checkbox dropdowns | ✓ |
| Search bar + filter chips | Single search bar with removable chip filters | |
| Search bar only | Text search across all columns | |

**User's choice:** Column headers with sort + filter dropdowns

### Q3: Filter scope?

| Option | Description | Selected |
|--------|-------------|----------|
| All task tables | Every TaskTable instance gets filtering | ✓ |
| Task Explorer only | Only flat table, others stay read-only | |

**User's choice:** All task tables

---

## Pipeline Rules

### Q1: Areas needing rules (multi-select)

**User selected:** Event filtering rules, Department routing fixes
**User added:** Classification feedback system — wants user-friendly way for management to improve classification over time.

### Q2: Event filtering specifics

**User's input (free text):**
- "Unknown" client events should mostly be reclassified as "Internal" (break, changes & output, inbox, emails, HR, small tasks)
- Declined meetings should be filtered out — if a Switcher declined a meeting invitation, it shouldn't appear in their data

### Q3: Department routing specifics

**User's input (free text):**
- Management department can only be applied to the 6 management members. Non-management Switchers are incorrectly getting Management time.

### Q4: Classification feedback approach?

| Option | Description | Selected |
|--------|-------------|----------|
| Reclassify in dashboard | Click event, see dropdowns for client/category/dept, save override | ✓ |
| Flag for review | Flag as misclassified with note, admin reviews in queue | |
| Both flag + override | Quick override for obvious, flag for ambiguous | |

**User's choice:** Reclassify in dashboard

### Q5: Learning from overrides?

| Option | Description | Selected |
|--------|-------------|----------|
| Feed into LLM context | Overrides included as examples in LLM classification prompt | ✓ |
| Feed into rule engine | Overrides generate new rules | |
| Store only, no learning | Overrides persist for that event only | |

**User's choice:** Feed into LLM context

### Q6: Override persistence across re-syncs?

| Option | Description | Selected |
|--------|-------------|----------|
| Override is sticky | Permanent for that event; re-syncs don't touch overridden classifications | ✓ |
| Re-classify but warn | Re-syncs reclassify, flag conflicts with prior overrides | |
| Always re-classify | Overrides are advisory only | |

**User's choice:** Override is sticky

---

## Upcoming Data Presentation (user-initiated area)

**User's input (free text):**
- Current UpcomingEvents sections are "very uninformative" — just a long list
- Wants upcoming data to have the same analytical depth as historical data (charts, stats, breakdowns)
- Suggested a tab toggle at the top of the UI: Historical / Upcoming

### Q1: Replace or coexist with current UpcomingEvents?

| Option | Description | Selected |
|--------|-------------|----------|
| Replace | Remove collapsible sections; toggle is the only way to see upcoming | ✓ |
| Coexist | Keep collapsible as quick glance, toggle for full view | |

**User's choice:** Replace

### Q2: Toggle scope?

| Option | Description | Selected |
|--------|-------------|----------|
| Global toggle | One toggle affects all views | ✓ |
| Per-view toggle | Each view has its own toggle | |

**User's choice:** Global toggle

---

## Additional Clarification (user-initiated)

**User's input (free text):**
- Personal events (doctor, gym, lunch, breakfast) should be filtered out entirely — not work
- Internal tasks (break, inbox, emails, HR admin, small tasks) should classify as "Internal" client — work, but not client-facing
- These two categories must be distinct in the pipeline

---

## Claude's Discretion

- Calendar week navigation UI style
- Historical/Upcoming toggle position and styling
- Sort/filter dropdown styling and animation
- Number of recent overrides to include in LLM context
- Override UI placement (inline vs modal)

## Deferred Ideas

- Monthly calendar view toggle
- Configurable daily hour threshold
- Rule engine auto-generation from overrides
- Bulk CSV upload for billing
- Classification confidence scores (CLAS-07)
