---
phase: 03-dashboard-admin
plan: 03
subsystem: frontend-shell
tags: [supabase-migration, csv-removal, admin-nav, sync-status, loading-states]

# Dependency graph
requires:
  - phase: 03-dashboard-admin
    plan: 02
    provides: useSupabaseData hook, relativeTime utilities, Supabase client singleton
provides:
  - App.jsx wired to useSupabaseData instead of CSV file upload
  - SyncStatusChip component for amber sync-issues indicator in sidebar footer
  - Toast component for floating auto-dismissing notifications
  - Admin nav entry in sidebar (last position, ShieldCheck icon)
  - Last-synced timestamp in sidebar footer with relative time and absolute tooltip
  - Skeleton loading state, error state, and empty state for data loading
  - UploadView.jsx deleted (D-21 fulfilled)
affects: [03-04, 03-05, 03-06, 03-07]

# Tech tracking
tech-stack:
  added: []
  patterns: [supabase-data-source, skeleton-loading, sync-status-chip, admin-nav-routing]

key-files:
  created:
    - src/shared/components/SyncStatusChip.jsx
    - src/shared/components/Toast.jsx
  modified:
    - src/App.jsx
  deleted:
    - src/features/upload/UploadView.jsx

key-decisions:
  - "Admin route uses inline placeholder div instead of importing non-existent AdminView -- avoids build failure; Plan 04 will replace with real component"
  - "Default dateRange set to 2026-01-04 through today via useEffect on data load -- matches D-19/D-20 anchor date"
  - "SyncStatusChip and Toast are standalone presentational components with no state -- state managed by parent"

patterns-established:
  - "Sync status chip pattern: conditionally rendered when latestSync?.errors has entries, onClick navigates to admin sync tab"
  - "Loading/error/empty early-return pattern: loading -> skeleton, error -> retry button, empty -> CTA to admin sync"
  - "Admin nav routing: setView({ type: 'admin', adminTab: 'sync' }) supports direct tab navigation"

requirements-completed: [DASH-01, DASH-02]

# Metrics
duration: 4min
completed: 2026-04-16
---

# Phase 3 Plan 03: Dashboard Shell Migration Summary

**Swapped dashboard data source from CSV upload to live Supabase, deleted UploadView, added Admin nav with ShieldCheck icon, and wired last-synced timestamp with sync-issues chip in sidebar footer**

## Performance

- **Duration:** 4 min
- **Tasks:** 2/2
- **Files:** 2 created, 1 modified, 1 deleted

## Accomplishments

- SyncStatusChip: amber chip (border-amber-200, bg-amber-50, text-amber-700) with AlertTriangle icon, "Sync issues" label, onClick navigates to Admin > Sync tab
- Toast: auto-dismissing floating notification (fixed bottom-6 right-6 z-50) with success (bg-switch-secondary + Check icon) and error (bg-red-600 + X icon) variants, configurable duration
- App.jsx fully migrated from CSV file upload to useSupabaseData hook -- data, refData, billingData, latestSync, loading, error, refetch all destructured
- UploadView.jsx deleted and all import/reference removed per D-21
- Admin nav entry added as last item in navItems array: { id: 'admin', label: 'Admin', icon: ShieldCheck }
- Sidebar footer replaced "Change File" button with last-synced display: relative time (formatRelativeTime) with absolute timestamp tooltip (formatAbsoluteTime)
- SyncStatusChip conditionally rendered in footer when latestSync.errors is non-empty
- Loading state: skeleton with 3x h-24 stat card placeholders + 4x h-10 table row placeholders (animate-pulse bg-stone-100/bg-stone-50)
- Error state: "Couldn't load timesheet data" message with Retry button calling refetch
- Empty state: CalendarIcon + "No timesheet data yet" heading + "Go to Sync" CTA navigating to admin sync tab
- Default date range set to 2026-01-04 through today on first data load per D-19/D-20
- Admin view route with placeholder content (AdminView ships in Plan 04)
- Vite build passes successfully

## Task Commits

1. **Task 1: Create SyncStatusChip and Toast components** - `0af161a` (feat)
2. **Task 2: Migrate App.jsx from CSV to Supabase, add Admin nav, delete UploadView** - `f1b949e` (feat)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] npm install required for build verification**
- **Found during:** Task 2 verification (npm run build)
- **Issue:** @supabase/supabase-js was in package.json (from Plan 02) but not installed in worktree node_modules
- **Fix:** Ran npm install to populate node_modules; did not commit node_modules changes
- **Files modified:** none committed (node_modules is gitignored-equivalent)

**2. [Rule 2 - Missing functionality] Admin route placeholder instead of non-existent import**
- **Found during:** Task 2 implementation
- **Issue:** Plan specified importing AdminView from './features/admin/AdminView.jsx' but that file doesn't exist yet (ships in Plan 04)
- **Fix:** Used inline placeholder div with informational text instead of importing a non-existent module, which would break the build
- **Files modified:** src/App.jsx

## Known Stubs

| File | Line | Stub | Reason |
|------|------|------|--------|
| src/App.jsx | 369 | Admin placeholder text "Admin panel will be available after Plan 04 ships." | AdminView component doesn't exist yet; Plan 04 will replace this with the real AdminView import and route |

## Self-Check: PASSED

All 3 created/modified files verified on disk. UploadView.jsx confirmed deleted. Both task commits (0af161a, f1b949e) verified in git log. SUMMARY.md exists at expected path. Vite build passes.
