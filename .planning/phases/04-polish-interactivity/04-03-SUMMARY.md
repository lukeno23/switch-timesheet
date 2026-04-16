---
phase: 04-polish-interactivity
plan: 03
subsystem: ui
tags: [react, modal, toggle, filter, override, tailwind, components]

# Dependency graph
requires:
  - phase: 04-polish-interactivity
    plan: 02
    provides: Override columns migration, saveOverride API wrapper, mapSupabaseRow override fields
provides:
  - ChartDrilldownModal with TaskTable-based event list (D-10, SC-04-03)
  - HistoricalUpcomingToggle global two-state pill toggle (D-12)
  - FilterDropdown for categorical checkbox and date range column filtering (D-10)
  - ClassificationOverridePanel with admin API integration and Toast notifications (D-22)
  - TaskDrilldownModal updated with onNavigate prop for entity navigation (D-03)
  - Database schema pushed to Supabase with override columns live
affects: [04-04 TaskTable filtering upgrade, 04-05 view-level chart wiring, 04-06 App.jsx toggle integration]

# Tech tracking
tech-stack:
  added: []
  patterns: [ChartDrilldownModal uses TaskTable for automatic filter inheritance, controlled FilterDropdown with isOpen/onToggle props]

key-files:
  created:
    - src/shared/components/ChartDrilldownModal.jsx
    - src/shared/components/HistoricalUpcomingToggle.jsx
    - src/shared/components/FilterDropdown.jsx
    - src/shared/components/ClassificationOverridePanel.jsx
  modified:
    - src/shared/components/TaskDrilldownModal.jsx

key-decisions:
  - "ChartDrilldownModal uses TaskTable (not ul/li) so Plan 04 filter upgrades automatically apply inside chart modals"
  - "FilterDropdown uses controlled isOpen/onToggle props rather than internal state for parent coordination"
  - "ClassificationOverridePanel pre-populates dropdowns by matching event.client/categoryName against refData arrays"

patterns-established:
  - "Chart modal pattern: copy TaskDrilldownModal shell, swap body to TaskTable with showContext=true, use max-w-4xl width"
  - "Override panel pattern: collapsed Pencil icon with opacity-0 group-hover:opacity-100, expands to 3-column select grid"

requirements-completed: [SC-04-01, SC-04-03, SC-04-04]

# Metrics
duration: 2min
completed: 2026-04-16
---

# Phase 4 Plan 03: Shared UI Components Summary

**5 shared components for chart modals, toggle, filtering, and classification overrides plus Supabase schema push**

## Performance

- **Duration:** 2 min
- **Started:** 2026-04-16T15:19:24Z
- **Completed:** 2026-04-16T15:21:24Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments
- Pushed 0009_override_columns.sql migration to Supabase (override_client_id, override_category_id, override_department columns now live)
- Created ChartDrilldownModal using TaskTable for event list rendering (enables automatic filter inheritance from Plan 04)
- Created HistoricalUpcomingToggle with Historical/Upcoming pill states using bg-switch-primary active styling
- Created FilterDropdown supporting categorical checkbox lists and date range inputs with useClickOutside dismiss
- Created ClassificationOverridePanel with client/category/department dropdowns, saveOverride API call, Toast feedback, and Overridden badge
- Updated TaskDrilldownModal with onNavigate prop and "View full breakdown" entity link

## Task Commits

Each task was committed atomically:

1. **Task 1: Push database schema** - No commit (schema push only, migration file already existed from Plan 02)
2. **Task 2: Create ChartDrilldownModal, HistoricalUpcomingToggle, update TaskDrilldownModal** - `d98e517` (feat)
3. **Task 3: Create FilterDropdown, ClassificationOverridePanel** - `bb8f274` (feat)

**Plan metadata:** pending (docs: complete plan)

## Files Created/Modified
- `src/shared/components/ChartDrilldownModal.jsx` - Modal with entity link, total hours summary, TaskTable event list (max-w-4xl)
- `src/shared/components/HistoricalUpcomingToggle.jsx` - Two-state pill toggle (Historical/Upcoming) with switch-primary active state
- `src/shared/components/FilterDropdown.jsx` - Column filter popover with checkbox list (categorical) or date range inputs (date type)
- `src/shared/components/ClassificationOverridePanel.jsx` - Inline override editor with 3 dropdowns, Save Override button, Toast, Overridden badge
- `src/shared/components/TaskDrilldownModal.jsx` - Added onNavigate prop with "View full breakdown" link in header

## Decisions Made
- ChartDrilldownModal uses TaskTable (not ul/li) so Plan 04 column filter upgrades automatically apply inside chart modals -- key design decision per D-10/SC-04-03
- FilterDropdown uses controlled isOpen/onToggle props rather than internal state, allowing parent components to coordinate multiple filter dropdowns
- ClassificationOverridePanel pre-populates dropdowns by matching event.client/categoryName against refData arrays by name, falling back to empty if no match

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- `supabase db diff` requires Docker Desktop which is not running locally. Schema push verified via successful `supabase db push` output instead. The NOTICE about constraint not existing on drop is expected behavior of `DROP CONSTRAINT IF EXISTS`.

## User Setup Required
None - schema push completed successfully during execution.

## Next Phase Readiness
- All 5 shared components ready for consumption by Plans 04-06
- ChartDrilldownModal ready for chart click wiring in Plan 06
- HistoricalUpcomingToggle ready for App.jsx integration in Plan 06
- FilterDropdown ready for TaskTable column filter upgrade in Plan 04
- ClassificationOverridePanel ready for TaskTable row integration in Plan 04
- Database schema live in Supabase with override columns

## Self-Check: PASSED

All 5 component files verified present. Both commit hashes (d98e517, bb8f274) confirmed in git log.

---
*Phase: 04-polish-interactivity*
*Completed: 2026-04-16*
