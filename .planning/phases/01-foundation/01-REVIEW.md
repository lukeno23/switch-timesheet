---
phase: 01-foundation
reviewed: 2026-04-14T00:00:00Z
depth: standard
files_reviewed: 32
files_reviewed_list:
  - src/App.jsx
  - src/constants/colors.js
  - src/constants/logos.jsx
  - src/features/dashboard/AllocationChart.jsx
  - src/features/dashboard/ClientDistributionChart.jsx
  - src/features/dashboard/DashboardView.jsx
  - src/features/dashboard/DonutChart.jsx
  - src/features/dashboard/MultiLineTrendChart.jsx
  - src/features/dashboard/SimpleTrendChart.jsx
  - src/features/dashboard/StatCard.jsx
  - src/features/dashboard/TopSwitchersGrid.jsx
  - src/features/dashboard/VerticalBarChart.jsx
  - src/features/detail/DetailStat.jsx
  - src/features/detail/DetailView.jsx
  - src/features/upload/UploadView.jsx
  - src/shared/components/AIInsightsModal.jsx
  - src/shared/components/Card.jsx
  - src/shared/components/DropdownFilter.jsx
  - src/shared/components/ErrorBoundary.jsx
  - src/shared/components/MultiSelect.jsx
  - src/shared/components/PasswordGate.jsx
  - src/shared/components/SettingsModal.jsx
  - src/shared/components/TaskDrilldownModal.jsx
  - src/shared/components/TaskTable.jsx
  - src/shared/components/TimeFrameToggle.jsx
  - src/shared/components/WeeklyCalendar.jsx
  - src/shared/hooks/useClickOutside.js
  - src/shared/services/gemini.js
  - src/shared/utils/aggregation.js
  - src/shared/utils/getWeekNumber.js
  - src/shared/utils/parseCSV.js
  - package.json
  - tailwind.config.js
  - vite.config.js
findings:
  critical: 2
  warning: 7
  info: 5
  total: 14
status: issues_found
---

# Phase 01: Code Review Report

**Reviewed:** 2026-04-14
**Depth:** standard
**Files Reviewed:** 32
**Status:** issues_found

## Summary

The refactored codebase is in good shape overall. The modular split from a monolithic `App.jsx` into feature folders is clean, imports are well-organised, and XSS risk is mitigated by the use of DOMPurify on AI-generated HTML. The core data pipeline (CSV parsing, date handling, filter logic) is correct.

Two critical issues require immediate attention: the authentication gate relies on a client-side hash that may be absent at runtime, silently bypassing the password check; and the Gemini API key is exposed in the URL query string of every AI request, making it readable in server logs and browser history. Seven warnings cover stale-closure risks, a race condition in async AI calls, index-based list keys on mutable data, a broken import for `SimpleTrendChart` in `DashboardView`, and an unused exported utility. Five info items cover unused dependencies, dead-code components, and the `vite.config.js` base path discrepancy versus the documented deployment target.

---

## Critical Issues

### CR-01: Auth bypass when `VITE_APP_PASSWORD_HASH` env var is missing

**File:** `src/shared/components/PasswordGate.jsx:26`
**Issue:** The expected hash is read from `import.meta.env.VITE_APP_PASSWORD_HASH`. If this variable is not set at build time (e.g., a local `npm run dev` without a `.env` file, or a Vercel deployment with a missing env var), `expectedHash` is `undefined`. The comparison `hash === undefined` always returns `false`, so the password gate blocks all access — but the bigger risk is the inverse: if a future refactor ever short-circuits on a falsy guard before the comparison, or if a developer accidentally sets the env var to an empty string, the gate could silently pass. More practically, there is currently no compile-time or runtime guard that warns the developer when the variable is absent, making misconfiguration silent and hard to diagnose in production.

**Fix:** Add an explicit check for a missing env var and fail closed with a visible error:

```jsx
const handleSubmit = async (e) => {
  e.preventDefault();
  const expectedHash = import.meta.env.VITE_APP_PASSWORD_HASH;
  if (!expectedHash) {
    setError('App is not configured. Contact your administrator.');
    return;
  }
  setIsChecking(true);
  setError('');
  try {
    const hash = await hashPassword(inputPassword);
    if (hash === expectedHash) {
      sessionStorage.setItem('switch_auth', 'true');
      onAuthenticated();
    } else {
      setError('Incorrect password. Try again.');
      setInputPassword('');
      inputRef.current?.focus();
    }
  } finally {
    setIsChecking(false);
  }
};
```

---

### CR-02: Gemini API key exposed in URL query string

**File:** `src/shared/services/gemini.js:4`
**Issue:** The API key is appended as a query parameter (`?key=${apiKey}`) in the URL passed to `fetch`. This means the key appears in browser network logs, request history, and any server or CDN access logs that capture the full URL. The Gemini API supports key-based auth via the `x-goog-api-key` request header, which keeps the secret out of the URL.

**Fix:**

```js
export const callGemini = async (apiKey, prompt) => {
  try {
    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      }
    );
    // ... rest unchanged
  }
};
```

---

## Warnings

### WR-01: Race condition — `isAiLoading` not reset when modal closes mid-flight

**File:** `src/features/dashboard/DashboardView.jsx:174-213` and `src/features/detail/DetailView.jsx:121-165`
**Issue:** `handleGenerateDashboardReport` / `handleGenerateReport` set `isAiLoading = true` before awaiting `callGemini`, and reset it in a `finally`-style assignment at line 212 / 164. However, there is no `finally` block — the reset only runs if no exception is thrown. If the component unmounts or `data` changes while the fetch is in flight, the `setIsAiLoading(false)` and `setAiReport()` calls still execute on a potentially stale closure, and a React warning about updating state on an unmounted component can be triggered. More concretely, if the user navigates away during loading, then returns, `isAiLoading` may never be reset to `false`, leaving the spinner permanently visible.

**Fix:** Use a `finally` block instead of placing the reset after the try/catch:

```js
try {
  const result = await callGemini(apiKey, prompt);
  setAiReport(result || 'No insights could be generated.');
} catch (e) {
  setAiError('Failed to generate report. Please check your API key.');
} finally {
  setIsAiLoading(false);
}
```

This applies to both `DashboardView.jsx:207-212` and `DetailView.jsx:159-164`.

---

### WR-02: `useClickOutside` re-registers listener on every render due to unstable handler

**File:** `src/shared/hooks/useClickOutside.js:4-11`, `src/shared/components/DropdownFilter.jsx:9`
**Issue:** `useClickOutside` lists `handler` in its dependency array. In `DropdownFilter`, the handler is the inline arrow `() => setIsOpen(false)` created inside the component body. Because this creates a new function reference on every render, the `useEffect` in `useClickOutside` tears down and re-adds the `mousedown` listener on every render. While not a functional bug in most cases, it is a correctness issue during fast interaction (e.g., rapid state updates) that can cause the listener to fire after the element has been removed. `MultiSelect` avoids this correctly by wrapping the handler in `useCallback`, but `DropdownFilter` does not.

**Fix:** Wrap the handler in `useClickOutside`'s `useEffect` callback in a `useRef` to keep the identity stable, or require callers to stabilise the handler. The simplest fix is in `DropdownFilter`:

```js
// DropdownFilter.jsx
import { useState, useRef, useCallback } from 'react';
// ...
const handleClose = useCallback(() => setIsOpen(false), []);
useClickOutside(dropdownRef, handleClose);
```

---

### WR-03: `SimpleTrendChart` is imported but never rendered in `DashboardView`

**File:** `src/features/dashboard/DashboardView.jsx:10`
**Issue:** `SimpleTrendChart` is imported on line 10 but there is no JSX usage of `<SimpleTrendChart` anywhere in `DashboardView.jsx`. The dashboard uses `MultiLineTrendChart` exclusively for the global trend. This is a dead import that bloats the module graph and is misleading.

**Fix:** Remove the unused import:

```js
// Remove this line from DashboardView.jsx:
import { SimpleTrendChart } from './SimpleTrendChart.jsx';
```

---

### WR-04: Index used as React list key on data that can change order

**File:** `src/shared/components/TaskTable.jsx:94`, `src/shared/components/TaskDrilldownModal.jsx:21`, `src/features/dashboard/TopSwitchersGrid.jsx:8`
**Issue:** These three components use `index` (`i`) as the React `key` prop on list items that come from sorted/filtered mutable data. When the user changes the sort column in `TaskTable`, React cannot reconcile existing DOM nodes correctly — it matches on key (the index), not the data identity. This can cause input focus issues (in interactive rows) and in rare cases incorrect rendering of conditionally displayed content per row (e.g., the `showContext` columns).

**Fix:** Use a stable, unique identifier from the data. For task rows, a composite of `dateStr + switcher + task` is available and unique enough:

```jsx
// TaskTable.jsx line 93
{sortedData.map((item) => (
  <tr key={`${item.dateStr}-${item.switcher}-${item.task}`} ...>
```

```jsx
// TopSwitchersGrid.jsx line 8
{data.map((person) => (
  <div key={person.switcher} ...>
```

```jsx
// TaskDrilldownModal.jsx line 21
{tasks.map((task, i) => (
  <li key={`${task.dateStr}-${task.task}-${i}`} ...>
```

---

### WR-05: `detailStats` useMemo crashes when `data` is empty

**File:** `src/features/detail/DetailView.jsx:36-81`
**Issue:** `detailStats` computes `longestTask` by iterating over `data` and checking `d.minutes > longestTask.minutes`. It initialises `longestTask = { task: '-', minutes: 0 }`. If `data` is empty (which is possible when the parent `detailData` filter returns zero rows for a given ID), the reduce never runs, and the returned object has `longestTask.minutes = 0`. This is handled for the display case (`'-'`), but `(detailStats.longestTask.minutes / 60).toFixed(1)` will compute `0.0` rather than `'-'`, producing misleading output.

More critically: `topDept` and the `reduce` on line 91 of `DashboardView.jsx` access `sortedDepts[0]` and `sortedEntities[0]` without a null guard. In `DashboardView` the outer `if (!stats)` guard protects this at the component level, but in `DetailView` the `detailStats` memo itself has no guard for empty `data`, so `sortedEntities[0]` is accessed directly:

```js
// DetailView.jsx:57-59 — no guard if data is empty
const sortedEntities = Object.entries(topEntity).sort((a, b) => b[1] - a[1]);
const topContributor = sortedEntities.length > 0
  ? { name: sortedEntities[0][0], hours: sortedEntities[0][1] / 60 }
  : { name: '-', hours: 0 };
```

The `topContributor` guard is correct. However, line 337 in the `department` JSX block computes:

```js
(detailStats.topContributor.hours / detailStats.totalHours * 100).toFixed(0)
```

When `detailStats.totalHours` is `0` (empty `data`), this produces `NaN`, which renders as `"NaN%"` in the UI.

**Fix:** Add a zero-division guard:

```jsx
{/* DetailView.jsx ~line 337 */}
{detailStats.totalHours > 0
  ? ((detailStats.topContributor.hours / detailStats.totalHours) * 100).toFixed(0)
  : '0'}%
```

---

### WR-06: Stale closure — `useEffect` default selection omits `setSelectedLines` from dependencies

**File:** `src/features/detail/DetailView.jsx:115-119`
**Issue:** The `useEffect` that resets `selectedLines` when `breakdownList` changes lists only `[breakdownList]` in its dependency array. `setSelectedLines` is a state setter from `useState`, which React guarantees to be stable, so this is not a correctness bug today. However, the effect implicitly captures `setSelectedLines` from the outer scope without declaring it as a dependency. ESLint's `react-hooks/exhaustive-deps` rule would flag this. The same pattern exists in `DashboardView.jsx:137-141`.

**Fix:** Include `setSelectedLines` in the dependency array (this is a no-op at runtime since it's stable, but it makes the dependency explicit and quiets linters):

```js
useEffect(() => {
  if (breakdownList.length > 0) {
    setSelectedLines(breakdownList.slice(0, 3));
  }
}, [breakdownList, setSelectedLines]);
```

---

### WR-07: Sidebar nav active-state logic produces false positives

**File:** `src/App.jsx:212`
**Issue:** The active-state comparison uses:

```js
view.type === item.id || view.type.startsWith(item.id.slice(0, -1))
```

`item.id.slice(0, -1)` drops the last character of the nav item ID string:
- `'switchers'` becomes `'switcher'` — correctly matches `'switcher_detail'`
- `'departments'` becomes `'department'` — correctly matches `'dept_detail'` (does NOT match since `'dept_detail'` does not start with `'department'`)
- `'clients'` becomes `'client'` — correctly matches `'client_detail'`
- `'tasks'` becomes `'task'` — this would erroneously match any `view.type` beginning with `'task'`, which is currently harmless since there is no `'task_detail'` route, but is fragile

The real problem is the `departments` / `dept_detail` case: the nav item id is `'departments'`, truncated to `'department'`. The detail view type is `'dept_detail'`, which does NOT start with `'department'`. So the "Teams" nav item is NOT highlighted when viewing a department detail. This is a silent UI bug.

**Fix:** Use an explicit mapping instead of the slice heuristic:

```js
const navItemActiveTypes = {
  dashboard: ['dashboard'],
  switchers: ['switchers', 'switcher_detail'],
  departments: ['departments', 'dept_detail'],
  clients: ['clients', 'client_detail'],
  tasks: ['tasks'],
};

// in the nav item className:
navItemActiveTypes[item.id]?.includes(view.type)
```

---

## Info

### IN-01: `clsx` and `tailwind-merge` listed as dependencies but never imported

**File:** `package.json:17-18`
**Issue:** Both `clsx` and `tailwind-merge` are listed in `dependencies` but are not imported anywhere in the source tree. They add to the production bundle size (minimal, but non-zero) and create a maintenance burden to keep updated. If the project plans to use them in a future utility, move them to devDependencies or add the utility file. Otherwise remove them.

**Fix:** Remove from `package.json` if not planned for immediate use:

```bash
npm uninstall clsx tailwind-merge
```

---

### IN-02: `buildTrendData` utility is exported but not imported by any feature component

**File:** `src/shared/utils/aggregation.js`
**Issue:** `buildTrendData` was extracted as shared logic, but both `DashboardView.jsx` and `DetailView.jsx` still implement their own inline `useMemo` trend-data grouping (with minor differences in shape). The utility is only referenced in its own test file. This means a future maintainer may fix a bug in one copy but not the others.

**Fix:** Refactor `DashboardView` and `DetailView` to consume `buildTrendData`, or delete the utility and co-locate the logic in the views that use it. Either is acceptable; the current half-extracted state is the worst outcome.

---

### IN-03: Dead component — `StatCard` is defined but not rendered by any parent

**File:** `src/features/dashboard/StatCard.jsx`
**Issue:** `StatCard` is fully implemented and exported, but a project-wide search finds no `import.*StatCard` usage in any JSX or JS file. It appears to have been extracted in anticipation of use but was never wired in. It will be included in the production bundle if it is transitively reachable, or become orphaned dead code otherwise.

**Fix:** Either import and render `StatCard` in `DashboardView` where the KPI values are displayed inline (inside the banner), or delete the file.

---

### IN-04: `WeeklyCalendar` and `DropdownFilter` are defined but not rendered

**File:** `src/shared/components/WeeklyCalendar.jsx`, `src/shared/components/DropdownFilter.jsx`
**Issue:** Neither component is imported or used anywhere in the current application. `WeeklyCalendar` appears to have been built for a personal/switcher detail view that has not yet been wired in. `DropdownFilter` was likely replaced by `MultiSelect`. Both are dead code.

**Fix:** Delete or explicitly plan where these will be used. If upcoming phases will use them, add a comment. Unused code grows stale quickly.

---

### IN-05: `vite.config.js` base path is `'/'` but `CLAUDE.md` documents it as `'/switch-timesheet/'`

**File:** `vite.config.js:6`
**Issue:** The Vite `base` is set to `'/'`, but `CLAUDE.md` documents the deployment target as `https://lukeno23.github.io/switch-timesheet/` which requires a base of `'/switch-timesheet/'` for asset paths to resolve correctly on GitHub Pages. This mismatch would cause all JS/CSS assets to 404 after a GitHub Pages deploy. Possibly this was deliberately changed for Vercel hosting (where `'/'` is correct), but if GitHub Pages deployment is still needed via `npm run deploy`, the base must be restored.

**Fix:** If deploying to GitHub Pages, set:

```js
base: '/switch-timesheet/',
```

If deploying exclusively to Vercel, update `CLAUDE.md` to remove the GitHub Pages deployment documentation to prevent confusion.

---

_Reviewed: 2026-04-14_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
