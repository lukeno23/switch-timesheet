---
phase: 01-foundation
plan: 02
subsystem: shared-layer
tags: [extraction, shared-components, bug-fixes, security, xss, error-boundary, password-gate]
dependency_graph:
  requires: ["01-01"]
  provides: [src/constants/colors.js, src/constants/logos.jsx, src/shared/utils/parseCSV.js, src/shared/utils/getWeekNumber.js, src/shared/utils/aggregation.js, src/shared/services/gemini.js, src/shared/hooks/useClickOutside.js, src/shared/components/Card.jsx, src/shared/components/TimeFrameToggle.jsx, src/shared/components/MultiSelect.jsx, src/shared/components/AIInsightsModal.jsx, src/shared/components/SettingsModal.jsx, src/shared/components/ErrorBoundary.jsx, src/shared/components/PasswordGate.jsx]
  affects: [src/App.jsx]
tech_stack:
  added: [dompurify@3.4.0]
  patterns: [named-exports, react-class-component-error-boundary, web-crypto-sha256, tailwind-design-tokens, hook-extraction]
key_files:
  created:
    - src/constants/colors.js
    - src/constants/logos.jsx
    - src/shared/utils/parseCSV.js
    - src/shared/utils/getWeekNumber.js
    - src/shared/utils/aggregation.js
    - src/shared/services/gemini.js
    - src/shared/hooks/useClickOutside.js
    - src/shared/components/Card.jsx
    - src/shared/components/TimeFrameToggle.jsx
    - src/shared/components/MultiSelect.jsx
    - src/shared/components/AIInsightsModal.jsx
    - src/shared/components/SettingsModal.jsx
    - src/shared/components/ErrorBoundary.jsx
    - src/shared/components/PasswordGate.jsx
  modified: []
decisions:
  - "DOMPurify installed via npm (was in package.json but not installed) — Rule 3 auto-fix during extraction"
  - "buildTrendData exports a simple total-hours aggregation; multi-line breakdown logic stays in consumer components because it depends on selectedLines state"
  - "PasswordGate uses import.meta.env.VITE_APP_PASSWORD_HASH for hash comparison — hash not yet set, feature non-functional until env var is configured"
metrics:
  duration: "~15 minutes"
  completed: "2026-04-14"
  tasks_completed: 2
  files_created: 14
---

# Phase 01 Plan 02: Shared Layer Extraction Summary

**One-liner:** Extracted constants, utilities, services, hooks, and all shared UI components from App.jsx monolith into 14 self-contained modules with XSS fix (DOMPurify), null-date crash fix, var-to-const cleanup, ErrorBoundary, and PasswordGate.

## What Was Built

Created the complete shared layer that Plan 03 (feature view extraction) will import from:

**Constants (2 files):**
- `src/constants/colors.js` — COLORS brand palette, zero project imports
- `src/constants/logos.jsx` — LogoMain and LogoSquare SVG components, imports COLORS only

**Utilities (3 files):**
- `src/shared/utils/parseCSV.js` — CSV parser with QUAL-05 null-date fix applied
- `src/shared/utils/getWeekNumber.js` — ISO week calculation with var→const fix
- `src/shared/utils/aggregation.js` — buildTrendData shared aggregation helper

**Services (1 file):**
- `src/shared/services/gemini.js` — callGemini Gemini API function

**Hooks (1 file):**
- `src/shared/hooks/useClickOutside.js` — Reusable click-outside detection hook

**Shared Components (7 files):**
- `Card.jsx` — Base card wrapper, uses Tailwind tokens
- `TimeFrameToggle.jsx` — Day/week/month toggle, switch-* tokens
- `MultiSelect.jsx` — Multi-select dropdown using useClickOutside hook
- `AIInsightsModal.jsx` — AI report modal with DOMPurify XSS fix (QUAL-02)
- `SettingsModal.jsx` — API key management modal
- `ErrorBoundary.jsx` — React class error boundary (QUAL-04)
- `PasswordGate.jsx` — SHA-256 password gate with sessionStorage auth (DASH-03)

## Bugs Fixed During Extraction

| Bug | File | Fix |
|-----|------|-----|
| QUAL-05: parseCSV null-date crash | parseCSV.js | `entry.dateObj = null` instead of `new Date()` for malformed dates |
| QUAL-02: XSS in AIInsightsModal | AIInsightsModal.jsx | `DOMPurify.sanitize(content)` wraps all Gemini HTML before rendering |
| Tech debt: var in getWeekNumber | getWeekNumber.js | `var yearStart`/`var weekNo` → `const yearStart`/`const weekNo` |
| Tech debt: inline useEffect in MultiSelect | MultiSelect.jsx | Replaced with `useClickOutside` hook |

## Security Improvements

- **T-02-01 mitigated:** DOMPurify sanitization in AIInsightsModal closes XSS vector from Gemini API responses
- **QUAL-04 addressed:** ErrorBoundary prevents white-screen crashes, provides user-friendly recovery UI
- **DASH-03 implemented:** PasswordGate uses Web Crypto SHA-256 with sessionStorage per D-04 decision

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] DOMPurify not installed despite being in package.json**
- **Found during:** Task 2 (AIInsightsModal extraction)
- **Issue:** `dompurify` was listed in package.json dependencies but not installed in node_modules. AIInsightsModal requires it for the QUAL-02 XSS fix.
- **Fix:** Ran `npm install dompurify` to install the package
- **Files modified:** package-lock.json (updated)
- **Commit:** 7f40484

### Design Decision

**buildTrendData scope:** The plan asked to extract duplicate trend aggregation from both DetailView and App. The extracted `buildTrendData` provides the simple total-hours aggregation. The multi-line breakdown logic (grouping by entity, filtering by selectedLines) was not extracted because it depends on `selectedLines` component state — extracting it as a pure function would require passing selectedLines and trendMode as parameters, which makes it harder to use. Plan 03 can wire this up when reimplementing the feature views.

## Known Stubs

None. All extracted modules are complete and self-contained.

## Threat Flags

No new threat surface introduced. All security-relevant surfaces were already in the plan's threat model (T-02-01 through T-02-04).

## Self-Check: PASSED

Files verified:
- All 14 files exist in correct locations
- `entry.dateObj = null` present in parseCSV.js
- `const yearStart`, `const weekNo` present in getWeekNumber.js
- `DOMPurify.sanitize` present in AIInsightsModal.jsx
- `autoFocus` present in PasswordGate.jsx
- No `bg-[#` or `text-[#` hex values in shared/components/
- No circular imports (colors.js has zero project imports)

Commits verified:
- 96c4324: feat(01-02): extract constants, utils, services, and hooks
- 7f40484: feat(01-02): extract shared UI components with bug fixes and new components
