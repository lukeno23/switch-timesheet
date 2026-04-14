<!-- GSD:project-start source:PROJECT.md -->
## Project

**Switch Timesheet**

An automated timesheet analytics tool for Switch, a creative agency in Malta with 15 team members ("Switchers"). The system pulls Google Calendar data nightly, classifies each event into the correct client, task category, and department using a hybrid rule-based + LLM approach, stores results in Supabase, and presents an interactive dashboard for the management team to see where agency time is being spent.

**Core Value:** Accurate, automated visibility into how Switch's time is allocated across clients, tasks, and departments — without manual intervention.

### Constraints

- **Hosting**: Frontend on Vercel free tier, backend on Supabase free tier (separate project from ERP)
- **Google Workspace**: Service account with domain-wide delegation for calendar access (Luke has admin access)
- **LLM Provider**: Gemini already in use for dashboard AI insights; continue with Gemini for classification pipeline
- **Budget**: Free tiers where possible; LLM API costs should be minimal (~200 events/day across 15 people)
- **Sync**: Nightly batch sync, not real-time
- **Team size**: 15 Switchers, ~6 management users for the dashboard
- **Data volume**: ~4000 rows per 2-month period — well within free tier limits
<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->
## Technology Stack

## Languages
- JavaScript (JSX) - All application logic in `src/App.jsx`, `src/main.jsx`
- CSS - Global styles in `src/index.css` (Tailwind directives only)
- HTML - Single entry `index.html`
## Runtime
- Node.js v24.13.0 (detected in environment)
- Browser target: modern evergreen browsers (Vite defaults)
- npm
- Lockfile: `package-lock.json` present (lockfileVersion 3)
## Frameworks
- React 18.2.0 - UI framework; entry via `src/main.jsx`, single component tree in `src/App.jsx`
- React DOM 18.2.0 - Browser rendering
- Tailwind CSS 3.4.1 - Utility-first CSS; config in `tailwind.config.js`; scans `./index.html` and `./src/**/*.{js,ts,jsx,tsx}`
- PostCSS 8.4.35 - Tailwind/Autoprefixer pipeline; config in `postcss.config.js`
- Autoprefixer 10.4.17 - Vendor prefix handling
- Recharts 2.12.0 - Chart components (BarChart, PieChart, LineChart, AreaChart); imported in `src/App.jsx`
- Lucide React 0.330.0 - Icon set; imported in `src/App.jsx`
- clsx 2.1.0 - Conditional class name joining
- tailwind-merge 2.2.1 - Merging Tailwind classes without conflicts
- Vite 5.1.4 - Dev server and bundler; config in `vite.config.js`
- @vitejs/plugin-react 4.2.1 - Babel-based JSX transform for Vite
- gh-pages 6.1.1 - Publishes `dist/` to GitHub Pages; invoked via `npm run deploy`
## Key Dependencies
- `react` + `react-dom` 18.2.0 - Core framework; entire app is a single React SPA
- `recharts` 2.12.0 - All chart rendering for timesheet visualizations
- `lucide-react` 0.330.0 - UI icons used throughout `src/App.jsx`
- `vite` 5.1.4 - Build pipeline; base path set to `/switch-timesheet/` for GitHub Pages in `vite.config.js`
- `gh-pages` 6.1.1 - Deployment; `predeploy` script runs `vite build` first
## Configuration
- No `.env` files detected
- No environment variables required at build time
- Gemini API key is user-supplied at runtime; stored in `localStorage` under key `switch_ai_key` (see `src/App.jsx` lines 149, 1501)
- `vite.config.js` - Sets `base: '/switch-timesheet/'` for GitHub Pages compatibility
- `tailwind.config.js` - Content paths cover `./index.html` and `./src/**/*.{js,ts,jsx,tsx}`; no theme extensions
- `postcss.config.js` - Plugins: `tailwindcss`, `autoprefixer`
- `@types/react` 18.2.56 and `@types/react-dom` 18.2.19 present but project uses plain JS (no TypeScript config)
## Platform Requirements
- Node.js (no version constraint specified in `package.json`)
- `npm run dev` - starts Vite dev server
- `npm run build` - outputs to `dist/`
- `npm run preview` - previews production build
- Static site deployment to GitHub Pages
- Repository: `https://github.com/lukeno23/switch-timesheet` (from `package.json` homepage)
- Deployed path: `https://lukeno23.github.io/switch-timesheet/`
- Deploy command: `npm run deploy` (runs predeploy build then gh-pages publish)
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

## Language & Runtime
- **Language:** JavaScript (JSX) — no TypeScript
- **React version:** 18.2 with hooks (no class components)
- **Module system:** ES Modules (`"type": "module"` in package.json)
## Component Patterns
### Arrow Function Components
### Props Destructuring
### Default Props via Defaults
### Early Return for Conditional Rendering
## State Management Patterns
### useMemo for All Derived Data
- Filtered data (`filteredData`)
- Statistics (`stats`, `detailStats`)
- List data (`listData`)
- Chart data (`trendData`, `clientAllocation`, `categoryAllocation`)
- Entity lists (`entityLists`, `breakdownList`)
### useState for UI State
### useEffect for Side Effects
- Click-outside detection for dropdowns (`src/App.jsx:267`)
- Default selection when trend mode changes (`src/App.jsx:1038`, `src/App.jsx:1579`)
- Syncing settings modal input with stored API key (`src/App.jsx:143`)
## Styling Conventions
### Tailwind CSS with Arbitrary Values
### COLORS Constant for Dynamic Use
### Google Fonts via Inline Style Tags
### Animation Classes
## Error Handling
### Try/Catch for API Calls
### UI Error State
### No Global Error Boundary
## Code Organization
### Section Comments
- `// --- Assets & Constants ---`
- `// --- Helpers ---`
- `// --- API Service ---`
- `// --- Components ---`
- `// --- View Components ---`
- `// --- Main App Logic ---`
### No Imports Between Files
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

## Overview
## Architectural Pattern
## Entry Points
- `index.html` — HTML shell with `<div id="root">`
- `src/main.jsx` — React 18 `createRoot` with `<App />` wrapped in `StrictMode`
- `src/App.jsx` — Everything: constants, helpers, components, main app logic
## Data Flow
```
```
### Data Shape
```js
```
## Component Hierarchy
```
```
## Navigation
```js
```
## State Management
- `data` — raw parsed CSV data
- `view` — current navigation state
- `dateRange` — global date filter (start/end)
- `apiKey` — Gemini API key (also in localStorage)
- `sortOrder` — list view sort preference
## External API Integration
- Called client-side via `fetch` to `generativelanguage.googleapis.com`
- API key stored in `localStorage` under key `switch_ai_key`
- Used for AI-powered performance analysis reports
- Model: `gemini-2.5-flash-preview-09-2025`
## Build & Deploy
- **Build tool:** Vite 5 with `@vitejs/plugin-react`
- **Base path:** `/switch-timesheet/` (for GitHub Pages)
- **Deploy:** `gh-pages` package → GitHub Pages
- **Scripts:** `npm run dev` (local), `npm run build` (production), `npm run deploy` (GitHub Pages)
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, or `.github/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
