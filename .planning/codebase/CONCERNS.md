# Codebase Concerns

**Analysis Date:** 2026-04-14

## Security Considerations

**XSS via dangerouslySetInnerHTML:**
- Risk: AI-generated HTML from the Gemini API is rendered directly into the DOM without sanitization. A compromised or malicious API response could inject arbitrary scripts.
- Files: `src/App.jsx` line 218 — `dangerouslySetInnerHTML={{ __html: content }}`
- Current mitigation: None. The `prose` Tailwind class provides no XSS protection.
- Recommendations: Sanitize `content` with a library such as `dompurify` before rendering, or convert Gemini to return Markdown and render with a safe Markdown parser (e.g., `react-markdown`).

**API Key stored in localStorage:**
- Risk: The Gemini API key is persisted to `localStorage` under the key `switch_ai_key`. Any JavaScript running on the page (including browser extensions or future XSS) can read it. localStorage is also accessible to any same-origin script.
- Files: `src/App.jsx` lines 148, 1501
- Current mitigation: The input field uses `type="password"` to hide visual display only.
- Recommendations: Acceptable for a client-side-only internal tool, but document this limitation clearly. If the tool is ever embedded in a broader site, move key handling to a backend proxy.

**No CSV input validation beyond field presence:**
- Risk: Malicious or malformed CSV content (e.g., formula injection with `=CMD|...`) could affect downstream spreadsheet users if data is exported. No validation of field values beyond `parseInt` on time fields.
- Files: `src/App.jsx` `parseCSV()` function (lines 53–98)
- Current mitigation: Rows missing `switcher`, `client`, or an invalid `dateObj` are filtered out, but field values are otherwise trusted as-is.
- Recommendations: For internal use this is low risk. If CSVs come from untrusted sources, add value sanitization.

---

## Tech Debt

**Monolithic single-file architecture (2149 lines):**
- Issue: All components, helpers, API calls, constants, and the main App are in a single file `src/App.jsx`. This makes navigation, maintenance, and code review significantly harder as the app grows.
- Files: `src/App.jsx`
- Impact: Any change touches one large file, increasing merge conflict risk and cognitive load. No ability to lazy-load sections.
- Fix approach: Split into feature-organized directories: `src/components/`, `src/hooks/`, `src/utils/`, `src/services/`. At minimum extract `parseCSV`, `callGemini`, chart components, and modal components into separate files.

**Inline `<style>` tags injected in JSX render:**
- Issue: Google Fonts `@import` and custom scrollbar CSS are injected via `<style>` tags inside the JSX render function at lines 1805–1809 and 1834–1838. This re-injects the same `@import` on every render cycle and on both the upload screen and dashboard.
- Files: `src/App.jsx` lines 1197–1209, 1805–1809, 1834–1838
- Impact: Duplicate style injections, potential flash of unstyled text on re-renders, and network round-trip for fonts duplicated unnecessarily.
- Fix approach: Move font imports to `src/index.css` (already exists) and keep the custom scrollbar rule in a global CSS class there.

**All colors hard-coded as hex strings in Tailwind className strings:**
- Issue: Color values like `#2f3f28`, `#a5c869`, `#d2beff` are repeated inline throughout className strings across the entire file instead of being configured as Tailwind theme tokens.
- Files: `src/App.jsx` (hundreds of occurrences), `tailwind.config.js` (empty `extend`)
- Impact: Rebranding or palette changes require a global search-and-replace rather than a single config update. Typos in hex values are invisible to the type system.
- Fix approach: Add brand colors to `tailwind.config.js` under `theme.extend.colors` and use semantic Tailwind tokens (`text-brand-primary`, `bg-brand-bg`) throughout.

**AI report is cached per-session but never invalidated on data or date range change:**
- Issue: The `aiReport` state is cached in `App` and in `DetailView` components. The cache is only cleared when navigating sidebar items. If the user changes the date filter, the stale AI report for the old date range is shown without re-generating.
- Files: `src/App.jsx` lines 1731, 1051, 1879
- Impact: Users see AI analysis that does not match the currently displayed filtered data.
- Fix approach: Add a `useEffect` that clears `aiReport` whenever `dateRange` or `filteredData` changes (or add a visible "Stale — Regenerate" indicator).

**`getWeekNumber` uses `var` instead of `const`/`let`:**
- Issue: The helper at lines 101–107 uses `var` for `yearStart` and `weekNo`, inconsistent with the rest of the file which uses `const`/`let` exclusively.
- Files: `src/App.jsx` lines 104–105
- Impact: Minor — no functional bug, but inconsistent style.
- Fix approach: Replace `var` with `const`.

**Fallback date set to `new Date()` for unparseable CSV dates:**
- Issue: In `parseCSV()` at line 92, if a date string does not have exactly 3 slash-separated parts, `entry.dateObj` is set to `new Date()` (today). Entries with broken dates are then kept if they have `switcher` and `client` populated.
- Files: `src/App.jsx` line 92
- Impact: Entries with corrupt dates silently appear attributed to today's date, skewing trend charts and date-based calculations.
- Fix approach: Return `null` or `undefined` for invalid dates and add this to the `.filter()` condition already present at line 97.

**`SimpleTrendChart` gradient `id` collides across multiple instances:**
- Issue: The `linearGradient` SVG element uses `id={\`color${timeframe}\`}` (e.g., `colorday`, `colorweek`). If two `SimpleTrendChart` components render on the same page simultaneously with the same `timeframe` prop, the gradient `id` will collide and one chart will use the wrong gradient.
- Files: `src/App.jsx` lines 372–375
- Impact: Currently unlikely since only one chart renders at a time, but fragile as the app grows.
- Fix approach: Use a `useId()` hook (React 18) or a `uuid` suffix to generate unique gradient IDs per instance.

---

## Fragile Areas

**`parseCSV` header detection relies on `includes()` substring matching:**
- Files: `src/App.jsx` lines 76–83
- Why fragile: Column detection uses `h.includes('switcher')`, `h.includes('date')`, etc. A header like `"date submitted"` and `"date"` would both match `h.includes('date')`, with the last match winning. Column order changes or new columns with overlapping names can silently break parsing.
- Safe modification: Treat header names as fixed contracts and match exactly (after trimming/lowercasing), or document the exact required column names prominently.
- Test coverage: None — there are zero test files in the project.

**`VerticalBarChart` silently slices to top 15:**
- Files: `src/App.jsx` line 460
- Why fragile: The component hard-codes `.slice(0, 15)` with no indication in the UI that data is truncated. If a dataset has 30+ switchers, 15+ are invisible on the Switcher Workload chart with no "show more" affordance.
- Safe modification: Add a visible count label ("Showing top 15 of N") or make the limit a prop with a sensible default.

**Weekly calendar only shows Mon–Fri (5 days hardcoded):**
- Files: `src/App.jsx` lines 795–801
- Why fragile: `Array.from({length: 5})` always generates Mon–Fri. If timesheet data contains weekend entries they are simply invisible in the calendar view with no warning. The `getTasksForDay` filter will match but the columns are never rendered.
- Safe modification: Either document this limitation or detect whether weekend data is present and extend to 7 days.

**`app.jsx.scpt` AppleScript binary committed to repo:**
- Files: `app.jsx.scpt` (root directory)
- Why fragile: This is a compiled/uncompiled AppleScript binary, likely from a Scripting Addition automation workflow. It is non-functional ("contains uncompiled changes and cannot be run") and should not be tracked in version control.
- Safe modification: Add `*.scpt` to `.gitignore` and remove the file.

**Leftover `vite.config.jsx.txt` and `vite.config.jsx.js.sb-*` files:**
- Files: `vite.config.jsx.txt`, `vite.config.jsx.js.sb-531bd113-IbWeU2` (root directory)
- Why fragile: These are editor/OS artefacts (Script Editor sandbox file, a plain-text backup). They add noise to the repo and could confuse build tooling if a tool tries to resolve `vite.config.jsx`.
- Safe modification: Delete both files and add `*.sb-*` and `*.txt` (or more targeted patterns) to `.gitignore`.

---

## Performance Bottlenecks

**`Math.min(...dates)` and `Math.max(...dates)` with spread on large arrays:**
- Problem: `stats` computation at lines 1633–1634 uses `Math.min.apply(null, dates)` and `Math.max(...dates)` where `dates` is an array of all date timestamps. For datasets with tens of thousands of rows this will blow the call stack limit or create large GC pressure.
- Files: `src/App.jsx` lines 1517, 1633–1634
- Cause: Spreading a large array into function arguments has an engine-specific argument limit (~65k in V8).
- Improvement path: Replace with a `reduce` or a single-pass loop: `dates.reduce((min, d) => d < min ? d : min, Infinity)`.

**`getTasksForDay` runs a full `data.filter()` per calendar cell on every render:**
- Problem: The `WeeklyCalendar` component calls `getTasksForDay(day)` for each of the 5 weekday columns inside the render function. With large datasets, 5 full array scans happen on every render of the calendar.
- Files: `src/App.jsx` lines 817–823, 880–882
- Cause: No memoization of the per-day grouping.
- Improvement path: Pre-group data into a `Map<dateString, tasks[]>` inside a `useMemo` at the top of `WeeklyCalendar` and look up by key per column.

**`multiLineTrendData` and `trendData` both duplicate aggregation logic:**
- Problem: Two near-identical `useMemo` blocks (lines 1111–1141 in `DetailView`, and 1586–1620 in `App`) perform the same time-bucketing and entity-grouping logic independently. Any bug fix or optimization must be applied in both places.
- Files: `src/App.jsx` lines 1111–1141 and 1586–1620
- Improvement path: Extract a shared `buildTrendData(data, timeframe, mode, selectedLines)` utility function.

---

## Missing Critical Features

**No error boundary:**
- Problem: If any chart or computation throws a runtime error (e.g., a malformed CSV producing a `NaN` in a Recharts formatter), the entire app unmounts with a blank white screen. There is no `ErrorBoundary` component.
- Blocks: Users lose all work and have no recovery path.
- Recommendation: Wrap the main `<App>` render (and ideally each major section) with a React `ErrorBoundary` that shows a friendly message and a "Reset" button.

**No file type or size validation on upload:**
- Problem: `handleFileUpload` at line 1508 accepts any file passed from the `<input accept=".csv">`. There is no check on MIME type, file size, or whether the content is valid UTF-8 text before calling `parseCSV`. Very large files (>50MB) will block the main thread.
- Files: `src/App.jsx` lines 1508–1534
- Recommendation: Add a size guard (e.g., warn if `file.size > 10MB`) and check `file.type` before reading.

---

## Test Coverage Gaps

**Zero test coverage:**
- What is not tested: Every function, component, and interaction in the application. `parseCSV` has several edge cases (missing columns, quoted commas, bad dates) with no tests. Trend data aggregation, filter logic, and AI prompt construction are all untested.
- Files: Entire `src/` directory
- Risk: Regressions in CSV parsing, date filtering, or chart data preparation go undetected until a user reports a data discrepancy.
- Priority: High — `parseCSV` is the most critical function; bugs there corrupt all downstream visualizations. Add at minimum unit tests for `parseCSV` and `getWeekNumber` using Vitest (already compatible with the Vite setup).

---

*Concerns audit: 2026-04-14*
