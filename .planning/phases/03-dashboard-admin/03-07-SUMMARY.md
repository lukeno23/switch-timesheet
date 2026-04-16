---
phase: 03-dashboard-admin
plan: 07
subsystem: frontend
tags: [upcoming-events, uat, phase-completion]

# Dependency graph
requires:
  - phase: 03-dashboard-admin
    provides: All prior plans (01-06, 08) — complete data layer, admin UI, billing analytics, categories tab
provides:
  - UpcomingEvents collapsible section in Dashboard, Switchers, Clients, Departments views
  - Phase 3 human verification completed
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns: [collapsible-section, temporal-filtering]

key-files:
  created:
    - src/shared/components/UpcomingEvents.jsx
  modified:
    - src/features/dashboard/DashboardView.jsx
    - src/App.jsx

key-decisions:
  - "UpcomingEvents defaults to collapsed state to avoid visual clutter"
  - "Filters by temporalStatus === 'upcoming' and hides column matching filterKey for context views"

requirements-completed: [DASH-02, ADMN-04]

# Metrics
duration: 5min
completed: 2026-04-16
---

# Phase 3 Plan 07: Upcoming Events + UAT Summary

**UpcomingEvents collapsible section across all 4 views, plus Phase 3 human verification**

## Accomplishments
- UpcomingEvents component with collapsed-by-default chevron toggle, count badge, and italic separator
- Integrated into Dashboard, Switchers list, Clients list, Departments list, and all entity detail drilldowns
- Phase 3 UAT checkpoint completed — all core success criteria verified by user

## Task Commits
1. **Task 1: UpcomingEvents component + integration** — `291e6e8` (feat)
2. **Task 2: Human verification** — approved by user

## UAT Findings (addressed during Phase 3)
- Admin save error: fixed missing apikey/Authorization headers in adminApi.js
- Data limited to 1000 rows: fixed with pagination in useSupabaseData.js
- Feb/March data gap: backfilled via manual sync triggers
- Cross-Department showing as team: fixed mapSupabaseRow to resolve to switcher's primary_dept
- Admin department dropdown: fixed ALLOWED_DEPARTMENTS to correct 6 values
- Task Explorer → Categories: replaced with full CategoriesView (Plan 08)

## Deferred to Phase 4
- Richer category drilldown dashboards
- Task Explorer flat table (alongside Categories tab)
- Full columns + filtering in all task tables
- Clickable chart elements → floating task modal
- Switcher calendar view (Google Calendar style)
- Category breakdown with client distribution in switcher pages
- User's additional data processing/classification rules

## Self-Check: PASSED

---
*Phase: 03-dashboard-admin*
*Completed: 2026-04-16*
