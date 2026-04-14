# Phase 1: Foundation - Context

**Gathered:** 2026-04-14
**Status:** Ready for planning

<domain>
## Phase Boundary

Refactor the monolithic App.jsx into a modular component architecture, fix critical bugs (XSS, performance, stale cache), add unit test coverage, implement simple password protection, and deploy the frontend to Vercel. The result is a clean, secure, tested frontend ready to connect to a real backend in Phase 2.

Requirements covered: QUAL-01, QUAL-02, QUAL-03, QUAL-04, QUAL-05, QUAL-06, QUAL-07, DASH-03, DASH-05

</domain>

<decisions>
## Implementation Decisions

### Module Structure
- **D-01:** Feature-based folder organization. Group code by feature under `src/features/` (dashboard, detail, upload, settings). Shared code lives in `src/shared/` (components, hooks, utils, services). `App.jsx` becomes a thin routing + layout shell.
- **D-02:** Every component gets its own file, regardless of size. Even small components like Card and StatCard are separate files. Consistent, easy to find, maximizes reuse. Expect ~20-25 component files across the feature folders.

### Password Protection
- **D-03:** Shared password approach — single password shared among the ~6 management users. Simple login screen, no per-user accounts. Matches DASH-03 "simple password protection".
- **D-04:** Password verified client-side via hash comparison. Store a SHA-256 hashed password in a Vercel environment variable (`VITE_APP_PASSWORD_HASH`). Client hashes user input and compares. Authenticated session persists via `sessionStorage`. Sufficient security for an internal management tool.

### Testing Strategy
- **D-05:** Vitest for unit tests only in Phase 1. Cover pure functions: `parseCSV`, `getWeekNumber`, data aggregation helpers, and classification logic. No component tests or E2E tests in this phase.
- **D-06:** GitHub Actions CI workflow. Tests run on push/PR via a simple workflow. Satisfies success criterion #5 ("test coverage that passes in CI").

### Color Token Naming
- **D-07:** Claude's Discretion. Claude will choose a naming convention that balances readability and maintainability — either semantic (brand-primary) or descriptive (switch-green), whichever fits best when implementing the Tailwind theme extension.

### Claude's Discretion
- Constants organization: Claude decides whether to use separate files per constant type (colors.js, logos.jsx) or a single constants file, based on what makes sense for each type.
- Color token naming convention: Claude picks the approach that best balances readability and maintainability.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Classification & Business Logic
- `Other files/instructions.md` -- Comprehensive classification rules and business logic (source of truth for rule engine port)
- `Other files/process_export.py` -- Current Python rule-based classifier (~500 lines of classification logic to be tested)
- `Other files/Legend.pdf` -- Authoritative reference for task categories and departments

### Existing Code
- `src/App.jsx` -- The monolith being decomposed; read to understand all component boundaries, state management, and data flow
- `.planning/codebase/CONCERNS.md` -- Known bugs, security issues, and tech debt with line-level references
- `.planning/codebase/CONVENTIONS.md` -- Current code patterns to preserve during refactor

### Project Context
- `.planning/REQUIREMENTS.md` -- Full requirement definitions with IDs (QUAL-01 through QUAL-07, DASH-03, DASH-05)
- `.planning/ROADMAP.md` -- Phase success criteria that must be satisfied

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `clsx` and `tailwind-merge` are already installed — use for conditional class composition in extracted components
- `COLORS` constant (App.jsx:13) defines the full brand palette and chart colors — source of truth for Tailwind theme extraction
- Section comments (`// --- Section Name ---`) in App.jsx cleanly delimit the 6 logical areas: Assets & Constants, Helpers, API Service, Components, View Components, Main App Logic

### Established Patterns
- Arrow function components with props destructuring and JS default values (not `defaultProps`)
- `useMemo` for ALL derived/aggregated data — must be preserved in extracted components
- `useState` for UI state, no reducers or context — keep this pattern in Phase 1
- Early return pattern for conditional rendering (modals, guards)

### Integration Points
- `src/main.jsx` renders `<App />` in StrictMode — password gate wraps at this level or inside App
- `vite.config.js` base path currently `/switch-timesheet/` for GitHub Pages — must change to `/` for Vercel
- `package.json` deploy scripts target gh-pages — need Vercel-specific build config
- Google Fonts loaded via inline `<style>` tags — should move to `src/index.css` during refactor

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-foundation*
*Context gathered: 2026-04-14*
