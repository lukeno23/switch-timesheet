---
phase: 04-polish-interactivity
plan: 06
subsystem: ui
tags: [react, wiring, toggle, nav, chart-click, modal, integration]

# Dependency graph
requires:
  - phase: 04-polish-interactivity
    plan: 03
    provides: HistoricalUpcomingToggle, ChartDrilldownModal components
  - phase: 04-polish-interactivity
    plan: 04
    provides: TaskExplorerView component
  - phase: 04-polish-interactivity
    plan: 05
    provides: CategoryDetailView with chart analytics, WeeklyCalendar upgrade
provides:
  - Global Historical/Upcoming toggle wired into App.jsx header (D-12, D-13, D-14)
  - Task Explorer nav entry in sidebar (D-09)
  - Chart click handlers on AllocationChart, DonutChart, SimpleTrendChart (D-01, D-02)
  - onChartClick wiring through DashboardView, CategoriesView, DetailView (D-03, SC-04-04)
  - UpcomingEvents removal from all views (D-15)
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns: [onBarClick/onCellClick/onDotClick callback props on Recharts chart components, unified handleChartClick handler in App.jsx]

key-files:
  created: []
  modified:
    - src/App.jsx
    - src/features/dashboard/AllocationChart.jsx
    - src/features/dashboard/DonutChart.jsx
    - src/features/dashboard/SimpleTrendChart.jsx
    - src/features/dashboard/DashboardView.jsx
    - src/features/categories/CategoriesView.jsx
    - src/features/detail/DetailView.jsx

key-decisions:
  - "AllocationChart onBarClick coexists with existing onClick prop -- onBarClick opens modal, onClick navigates"
  - "DonutChart secondary allocation entity type derived from detail view type context (client->department, department->switcher)"
  - "HistoricalUpcomingToggle placed in sidebar above date range controls with conditional date range hiding"

requirements-completed: [SC-04-02, SC-04-04]

# Metrics
duration: 5min
completed: 2026-04-16
---

# Phase 4 Plan 06: App.jsx Integration & Chart Click Wiring Summary

**Global toggle, Task Explorer nav, chart click handlers on all charts and views, UpcomingEvents removal -- full end-to-end integration**

## Performance

- **Duration:** 5 min
- **Started:** 2026-04-16T15:30:25Z
- **Completed:** 2026-04-16T15:35:25Z
- **Tasks:** 3
- **Files modified:** 7

## Accomplishments

- Wired HistoricalUpcomingToggle into App.jsx sidebar with conditional date range hiding (upcoming mode hides date pickers)
- Added upcomingMode state and updated filteredData useMemo to filter future events when upcoming mode active
- Added unified handleChartClick handler in App.jsx that opens ChartDrilldownModal with filtered events and optional navigation
- Added Task Explorer nav entry between Categories and Admin in sidebar
- Rendered TaskExplorerView for task-explorer view type
- Removed all UpcomingEvents import and usages from App.jsx (switchers, departments, clients, detail views)
- Removed UpcomingEvents import and usage from DashboardView
- Added upcoming mode empty state message
- Added onBarClick prop to AllocationChart (coexists with existing onClick for navigation)
- Added onCellClick prop to DonutChart with pointer cursor on Cell elements
- Added onDotClick prop to SimpleTrendChart via activeDot onClick
- Passed onChartClick to DashboardView, CategoriesView/CategoryDetailView, DetailView
- Wired DashboardView: onBarClick on client AllocationChart
- Wired CategoryDetailView: onBarClick on switcher AllocationChart, onCellClick on client DonutChart, onDotClick on trend SimpleTrendChart
- Wired DetailView: onDotClick on trend SimpleTrendChart, onBarClick on client and switcher AllocationCharts, onCellClick on secondary DonutChart

## Task Commits

1. **Task 1: Wire toggle, nav, chart clicks, remove UpcomingEvents in App.jsx** - `27ed52c`
2. **Task 2: Add onClick props to AllocationChart, DonutChart, SimpleTrendChart** - `7bd7878`
3. **Task 3: Wire onChartClick through DashboardView, CategoriesView, DetailView** - `a7f42df`

## Files Created/Modified

- `src/App.jsx` - Added imports (HistoricalUpcomingToggle, ChartDrilldownModal, TaskExplorerView, Search icon), removed UpcomingEvents import/usages, added upcomingMode/chartModal state, handleChartClick handler, task-explorer nav, toggle in sidebar, TaskExplorerView rendering, onChartClick prop on all views, ChartDrilldownModal rendering, upcoming empty state
- `src/features/dashboard/AllocationChart.jsx` - Added onBarClick prop, wired to Bar onClick alongside existing onClick, pointer cursor when either handler present
- `src/features/dashboard/DonutChart.jsx` - Added onCellClick prop, wired to Cell onClick with pointer cursor
- `src/features/dashboard/SimpleTrendChart.jsx` - Added onDotClick prop, wired to activeDot onClick
- `src/features/dashboard/DashboardView.jsx` - Added onChartClick prop, wired onBarClick to client AllocationChart, removed UpcomingEvents import and usage
- `src/features/categories/CategoriesView.jsx` - Added onChartClick prop to CategoriesView (pass-through) and CategoryDetailView, wired onBarClick/onCellClick/onDotClick to all 3 chart components
- `src/features/detail/DetailView.jsx` - Added onChartClick prop, wired onDotClick to SimpleTrendChart, onBarClick to 3 AllocationChart instances, onCellClick to DonutChart

## Decisions Made

- AllocationChart onBarClick coexists with existing onClick prop -- onBarClick opens the drilldown modal while onClick handles navigation. Both fire on the same Bar click event.
- DonutChart secondary allocation entity type is derived from the detail view's `type` prop context: client detail shows department breakdown, department detail shows switcher breakdown.
- HistoricalUpcomingToggle placed in the sidebar above date range controls (not in the main header) because the sidebar already contains the date range picker, keeping temporal controls co-located.

## Deviations from Plan

None - plan executed exactly as written.

## Self-Check: PASSED

All 7 modified files verified present. All 3 commit hashes (27ed52c, 7bd7878, a7f42df) confirmed in git log. Build succeeds with no errors.

---
*Phase: 04-polish-interactivity*
*Completed: 2026-04-16*
