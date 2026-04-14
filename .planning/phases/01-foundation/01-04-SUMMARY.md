---
phase: 01-foundation
plan: "04"
subsystem: testing-and-ci
tags: [unit-tests, vitest, github-actions, ci, vercel]
dependency_graph:
  requires: ["01-03"]
  provides: ["test-coverage-utils", "ci-pipeline", "vercel-ready"]
  affects: ["all future plans — CI now gates merges"]
tech_stack:
  added: []
  patterns:
    - Vitest with jsdom environment for pure function unit tests
    - GitHub Actions CI: checkout -> setup-node (v24) -> npm ci -> npm test -> npm run build
    - Vercel auto-detection (no vercel.json required for Vite projects)
key_files:
  created:
    - src/shared/utils/__tests__/parseCSV.test.js
    - src/shared/utils/__tests__/getWeekNumber.test.js
    - src/shared/utils/__tests__/aggregation.test.js
    - .github/workflows/ci.yml
  modified:
    - src/shared/utils/parseCSV.js
decisions:
  - "No vercel.json needed — Vercel auto-detects Vite projects with correct build command and output directory defaults"
  - "parseCSV empty input guard added as Rule 1 auto-fix (crash on lines[0].split when input is empty)"
metrics:
  duration: ~10 minutes
  completed: "2026-04-14"
  tasks_completed: 2
  files_changed: 5
---

# Phase 1 Plan 4: Unit Tests, CI, and Vercel Readiness Summary

**One-liner:** 36-test Vitest suite for parseCSV/getWeekNumber/buildTrendData with GitHub Actions CI gating push and PR to main.

## What Was Built

### Task 1: Unit Tests for Core Utils

Three test files covering all three utility functions extracted in Plan 02:

- `src/shared/utils/__tests__/parseCSV.test.js` — 13 test cases: valid CSV parsing, invalid date filtering, empty input, whitespace input, headers-only, missing switcher/client, integer minutes, ascending sort, quoted commas, dd/mm/yyyy format, multi-row, and non-numeric time spent.
- `src/shared/utils/__tests__/getWeekNumber.test.js` — 7 test cases: ISO week 1 for Jan 1 2026, Dec 31 2025 cross-year boundary, known mid-year date, consistency, range bounds (1-53), monotonic progression, and Jan 4 always-week-1 rule.
- `src/shared/utils/__tests__/aggregation.test.js` — 16 test cases: empty input for all timeframes, day bucketing and summing, week bucketing with W-prefix names, month bucketing and summing, chronological order, null dateObj skipping, and minutes-to-hours conversion.

All 36 tests pass with `npm test` (exit code 0).

### Task 2: GitHub Actions CI and Vercel Configuration

- `.github/workflows/ci.yml` — triggers on push and PR to main; runs Node 24 with npm cache; steps: `npm ci`, `npm test`, `npm run build`.
- No `vercel.json` needed — Vercel auto-detects Vite projects. The `vite.config.js` base path of `/` (set in Plan 01) is correct for Vercel.
- User setup steps documented in plan frontmatter: connect repo in Vercel dashboard, set `VITE_APP_PASSWORD_HASH` environment variable.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed parseCSV crash on empty/whitespace-only input**
- **Found during:** Task 1 — empty input test case
- **Issue:** `parseCSV('')` throws `TypeError: Cannot read properties of undefined (reading 'split')` because `lines[0]` is `undefined` when all lines are empty after filtering
- **Fix:** Added early return guard `if (lines.length === 0) return [];` after line filtering, before accessing `lines[0]`
- **Files modified:** `src/shared/utils/parseCSV.js`
- **Commit:** `a555ccb`

## Commits

| Hash | Message |
|------|---------|
| `a555ccb` | test(01-04): add unit tests for parseCSV, getWeekNumber, and buildTrendData |
| `7593e32` | chore(01-04): add GitHub Actions CI workflow |

## Known Stubs

None — no placeholder data or TODO stubs introduced.

## Threat Flags

None — test files use synthetic data only (fake names, dates). No new network endpoints or auth paths introduced.

## Self-Check: PASSED

- `src/shared/utils/__tests__/parseCSV.test.js` — FOUND
- `src/shared/utils/__tests__/getWeekNumber.test.js` — FOUND
- `src/shared/utils/__tests__/aggregation.test.js` — FOUND
- `.github/workflows/ci.yml` — FOUND
- Commit `a555ccb` — FOUND
- Commit `7593e32` — FOUND
- `npm test` exit 0 with 36 tests passing — VERIFIED
- `npm run build` exit 0 — VERIFIED
