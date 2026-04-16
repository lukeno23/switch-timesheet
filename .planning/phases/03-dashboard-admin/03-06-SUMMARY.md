---
phase: 03-dashboard-admin
plan: 06
subsystem: frontend-billing-analytics
tags: [billing, effective-rate, over-under-indicator, EUR, client-drilldown]

# Dependency graph
requires:
  - phase: 03-dashboard-admin
    plan: 02
    provides: billingCalc.js utility functions (calcEffectiveRate, calcOverUnderIndicator, formatCurrency, formatRawAmount)
  - phase: 03-dashboard-admin
    plan: 03
    provides: App.jsx with useSupabaseData hook returning billingData and refData
  - phase: 03-dashboard-admin
    plan: 05
    provides: DetailView.jsx with keyed AI cache and dateRange prop
provides:
  - Clients list view enriched with current-month effective EUR/hr rate column
  - Client detail billing drilldown with monthly series table (6 columns)
  - Over/under-serviced indicators with 5% threshold and color-coded display
  - Raw USD amount + FX rate display for non-EUR billing entries
  - Empty state for clients with no billing data
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns: [billing-enriched-list-items, billing-monthly-series-drilldown, renderExtra-prop-pattern]

key-files:
  created: []
  modified:
    - src/App.jsx
    - src/features/detail/DetailView.jsx

key-decisions:
  - "Added renderExtra prop to ListView for extensible per-item rendering rather than hardcoding billing column"
  - "Used IIFE pattern in JSX for DetailView to compute clientRecord inline without extra useMemo"
  - "billingMonthly groups events by dateObj month and matches billing entries by client_id UUID"

patterns-established:
  - "ListView renderExtra pattern: optional callback prop for additional content per list card item"
  - "Billing drilldown pattern: useMemo computing monthly series from event data + billingData + target rate"

requirements-completed: [BILL-02, DASH-02]

# Metrics
duration: 3min
completed: 2026-04-16
---

# Phase 3 Plan 06: Hours-to-Billing Analytics Summary

**EUR/hr effective rate column on Clients list and monthly billing drilldown table in client detail with over/under-serviced indicators**

## Performance

- **Duration:** 3 min
- **Started:** 2026-04-16T11:51:47Z
- **Completed:** 2026-04-16T11:54:17Z
- **Tasks:** 1/1
- **Files modified:** 2

## Accomplishments

- Clients list view now shows effective EUR/hr rate for the current month alongside hours, using `text-switch-primary font-bold` styling when a rate exists and a `text-stone-400` dash when no billing data is entered
- Client detail view has a "Billing Analysis" section with a monthly series table showing: Month, Hours, Billed, Effective EUR/hr, vs Target, and Raw Amount columns
- Over/under-serviced indicators use 5% threshold: red-500 down arrow for over-serviced, switch-primary up arrow for under-serviced, stone-400 approximately-equal for on-target
- Raw USD amounts display in format "$X USD @ rate = EUR Y" for non-EUR billing entries; EUR entries show no raw display
- Empty state "No billing data entered yet for this client." shown when a client has no billing entries
- All 83 existing tests continue to pass; Vite build succeeds

## Task Commits

Each task was committed atomically:

1. **Task 1: Add EUR/hr column to Clients list and billing drilldown to client DetailView** - `c241587` (feat)

## Files Created/Modified

- `src/App.jsx` - Added calcEffectiveRate import, clientsWithBilling useMemo enriching client list items with effectiveRate/clientId/targetRate, renderExtra prop on ListView for EUR/hr display, billingData/clientId/clientTargetRate props passed to DetailView
- `src/features/detail/DetailView.jsx` - Added billingCalc imports (calcEffectiveRate, calcOverUnderIndicator, formatCurrency, formatRawAmount), billingMonthly useMemo computing monthly series, billing analysis table with 6 columns and over/under indicators, empty state for no billing data

## Decisions Made

- Added `renderExtra` callback prop to ListView instead of hardcoding the EUR/hr column -- keeps ListView generic and reusable for future column additions on other entity types
- Used IIFE pattern `{(() => { ... })()}` in JSX for the DetailView rendering block to compute `clientRecord` inline, avoiding an additional useMemo that would compute on every render regardless of view type
- Client matching uses `item.id` (client name from listData) to look up `refData.clients` by name, then uses the UUID `client_id` for billing data matching -- consistent with how the existing data model works

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Hours-to-billing analytics fully integrated into existing Clients views
- All billingCalc utility functions from Plan 02 are now exercised in the UI
- Plan 07 (if any remaining Phase 3 work) can build on the billing drilldown surface

## Self-Check: PASSED

All 2 modified files verified present on disk. Task commit (c241587) verified in git log. SUMMARY.md exists at expected path. Vite build passes. All 83 tests green.

---
*Phase: 03-dashboard-admin*
*Completed: 2026-04-16*
