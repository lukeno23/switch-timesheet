---
phase: 03-dashboard-admin
plan: 02
subsystem: data-layer
tags: [supabase, react-hooks, supabase-js, billing, sync, caching]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: modular src/shared structure, PasswordGate with sessionStorage auth, Vitest
  - phase: 02-data-pipeline
    provides: Supabase schema (events, switchers, clients, categories, sync_runs), RLS policies, sync Edge Function
provides:
  - Supabase anon client singleton (src/shared/services/supabase.js)
  - Admin API fetch wrapper with x-switch-auth header (src/shared/services/adminApi.js)
  - Upfront data loading hook returning events, refData, billingData, latestSync (src/shared/hooks/useSupabaseData.js)
  - Sync status polling hook with 6 states (src/shared/hooks/useSyncStatus.js)
  - Row shape mapper from Supabase to dashboard-compatible format (src/shared/utils/mapSupabaseRow.js)
  - Relative and absolute time formatters (src/shared/utils/relativeTime.js)
  - Stable cache key builder for AI report invalidation (src/shared/utils/cacheKey.js)
  - Billing calculation utilities: effective rate, over/under indicator, currency formatting (src/shared/utils/billingCalc.js)
  - PasswordGate stores SHA-256 hash in sessionStorage for admin write authentication
affects: [03-03, 03-04, 03-05, 03-06, 03-07]

# Tech tracking
tech-stack:
  added: ["@supabase/supabase-js ^2.103.2"]
  patterns: [supabase-singleton-service, upfront-load-hook, row-shape-mapping, admin-auth-header-stamping]

key-files:
  created:
    - src/shared/services/supabase.js
    - src/shared/services/adminApi.js
    - src/shared/hooks/useSupabaseData.js
    - src/shared/hooks/useSyncStatus.js
    - src/shared/utils/mapSupabaseRow.js
    - src/shared/utils/relativeTime.js
    - src/shared/utils/cacheKey.js
    - src/shared/utils/billingCalc.js
  modified:
    - src/shared/components/PasswordGate.jsx
    - package.json
    - package-lock.json

key-decisions:
  - "Followed plan exactly: Supabase client uses VITE_ env vars, adminApi reads hash from sessionStorage"
  - "mapSupabaseRow uses optional chaining on all FK joins (switcher, client, category) to handle null refs for Misc-classified events"
  - "useSupabaseData fetches 7 tables in parallel with embedded Postgres joins on events query"

patterns-established:
  - "Supabase service singleton: import { supabase } from '../services/supabase.js'"
  - "Admin API auth pattern: sessionStorage switch_auth_hash -> x-switch-auth header"
  - "Row mapping pattern: Supabase row -> { switcher, client, department, task, minutes, dateStr, dateObj } compatible with existing useMemo consumers"
  - "Sync polling pattern: triggerSync -> poll 3s -> fallback 3min"
  - "Utility module pattern: pure functions, named exports, no React imports"

requirements-completed: [DASH-01, DASH-02]

# Metrics
duration: 2min
completed: 2026-04-15
---

# Phase 3 Plan 02: Data Layer Summary

**Supabase client singleton, parallel data-loading hook with row-shape mapping, admin API auth wrapper, sync polling hook, and billing/cache/time utility modules**

## Performance

- **Duration:** 2 min
- **Started:** 2026-04-15T14:06:36Z
- **Completed:** 2026-04-15T14:09:05Z
- **Tasks:** 2
- **Files modified:** 11 (8 created, 1 modified, 2 dependency files)

## Accomplishments
- Complete frontend data access layer replacing CSV loading with live Supabase queries
- Row shape mapper producing exact property names (switcher, client, department, task, minutes, dateStr, dateObj) that existing useMemo aggregations consume unchanged
- Admin API wrapper that reads SHA-256 hash from sessionStorage and stamps x-switch-auth header for all admin Edge Function calls
- Sync status polling hook with 6 states (idle/firing/polling/done/error/fallback), 3s interval, and 3min timeout
- Four utility modules: relative time formatting, stable AI report cache keys, effective hourly rate calculation with 5% on-target threshold, and EUR/USD currency formatting

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Supabase client, admin API wrapper, and modify PasswordGate** - `5c6b85d` (feat)
2. **Task 2: Create data hooks and utility modules** - `fcef8e8` (feat)

## Files Created/Modified
- `src/shared/services/supabase.js` - Supabase anon client singleton using VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
- `src/shared/services/adminApi.js` - Fetch wrapper for admin Edge Function with x-switch-auth header from sessionStorage
- `src/shared/components/PasswordGate.jsx` - Added one line to store SHA-256 hash in sessionStorage as switch_auth_hash
- `src/shared/hooks/useSupabaseData.js` - Upfront load hook: 7 tables in parallel, events with embedded Postgres joins, returns data/refData/billingData/latestSync/loading/error/refetch
- `src/shared/hooks/useSyncStatus.js` - Sync polling hook: triggerSync fires admin API, polls sync_runs every 3s, falls back at 3min
- `src/shared/utils/mapSupabaseRow.js` - Transforms Supabase event rows to dashboard-compatible shape with optional chaining on FK joins
- `src/shared/utils/relativeTime.js` - formatRelativeTime (relative "3 hours ago") and formatAbsoluteTime (en-GB locale with timezone)
- `src/shared/utils/cacheKey.js` - buildCacheKey joining dateRange + sorted filters + entityId with pipe separator
- `src/shared/utils/billingCalc.js` - calcEffectiveRate, calcOverUnderIndicator (5% threshold), formatCurrency, formatRawAmount
- `package.json` - Added @supabase/supabase-js ^2.103.2 dependency
- `package-lock.json` - Updated lockfile

## Decisions Made
None - followed plan as specified. All implementations match the plan's code blocks exactly.

## Deviations from Plan
None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required. Environment variables (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY) are expected to be configured at deployment time per Phase 2 setup.

## Next Phase Readiness
- Data layer is complete and ready for all downstream Phase 3 plans
- Plan 03 (dashboard migration) can now import useSupabaseData and swap out CSV loading
- Plan 04 (admin CRUD) can now import adminApi for write operations
- Plan 05 (billing) can now import billingCalc utilities
- All existing useMemo aggregations will work unchanged with mapSupabaseRow output

## Self-Check: PASSED

All 9 created/modified files verified present on disk. Both task commits (5c6b85d, fcef8e8) verified in git log. SUMMARY.md exists at expected path.

---
*Phase: 03-dashboard-admin*
*Completed: 2026-04-15*
