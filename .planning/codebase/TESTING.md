# Testing

## Current State

**No test framework or test files exist in this project.**

### What's Missing
- No test runner (no vitest, jest, mocha, or similar)
- No test files (`*.test.*`, `*.spec.*`) anywhere in `src/`
- No testing libraries in `package.json` (no `@testing-library/react`, no `vitest`, no `jest`)
- No test scripts in `package.json`
- No CI/CD pipeline or test automation

### DevDependencies Present (Non-Test)
The `package.json` includes `@types/react` and `@types/react-dom` as devDependencies, but these are for editor type-checking support, not testing.

## Test Considerations

### High-Value Test Targets
If tests were to be added, these areas would benefit most:

1. **`parseCSV()` function** (`src/App.jsx:54-99`) — Core data parsing logic with custom CSV parser that handles quoted fields. Edge cases: malformed dates, missing fields, quoted commas, empty lines.

2. **Date filtering** (`src/App.jsx:1542-1555`) — The `filteredData` useMemo that filters by date range, including timezone-aware date parsing.

3. **Statistical aggregations** (`src/App.jsx:1623-1721`) — The `stats` useMemo that computes totals, averages, top entities, and overworked switcher detection.

4. **`getWeekNumber()` helper** (`src/App.jsx:102-108`) — ISO week number calculation.

### Recommended Test Setup
Given the Vite + React stack:
- **Framework:** Vitest (native Vite integration)
- **Component testing:** @testing-library/react
- **Config:** Add to `vite.config.js` or separate `vitest.config.js`

## Manual Testing

The application currently relies entirely on manual testing:
1. Upload a CSV file
2. Verify dashboard renders with correct stats
3. Navigate through switchers, teams, clients, categories
4. Check detail views, charts, and drilldowns
5. Test AI insights with a valid Gemini API key
6. Verify date range filtering
