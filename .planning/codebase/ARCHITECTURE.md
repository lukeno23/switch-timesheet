# Architecture

## Overview

Single-page React application (SPA) with a monolithic component architecture. The entire application lives in a single file (`src/App.jsx`, ~2150 lines) with no routing library, no state management library, and no backend. All data processing happens client-side after CSV file upload.

## Architectural Pattern

**Client-side data visualization dashboard** — the app follows a simple pattern:

1. User uploads CSV file via browser `<input type="file">`
2. CSV is parsed in-memory into structured JavaScript objects
3. Data is filtered, aggregated, and visualized using React state + `useMemo` for derived computations
4. Optional AI analysis via Gemini API (client-side fetch)

There is no server, no database, no authentication system. The only persistence is `localStorage` for the Gemini API key.

## Entry Points

- `index.html` — HTML shell with `<div id="root">`
- `src/main.jsx` — React 18 `createRoot` with `<App />` wrapped in `StrictMode`
- `src/App.jsx` — Everything: constants, helpers, components, main app logic

## Data Flow

```
CSV File Upload
    ↓
parseCSV() — custom parser (handles quoted fields)
    ↓
useState(data) — raw parsed entries
    ↓
filteredData (useMemo) — date range filtering
    ↓
stats / listData / detailData (useMemo) — derived aggregations
    ↓
Chart components (recharts) — visualization
```

### Data Shape

Each parsed entry has this shape:
```js
{
  switcher: string,    // Employee name
  dateStr: string,     // Original date string (DD/MM/YYYY)
  dateObj: Date,       // Parsed Date object
  department: string,  // Team/department
  client: string,      // Client name
  category: string,    // Task category
  task: string,        // Task description
  minutes: number      // Time spent in minutes
}
```

## Component Hierarchy

```
App (root state manager)
├── Upload Screen (when no data)
├── SettingsModal (Gemini API key)
├── AIInsightsModal (AI-generated reports)
├── Sidebar (navigation + date range filter)
└── Main Content
    ├── Dashboard View
    │   ├── KPI Banner
    │   ├── MultiLineTrendChart (global trends)
    │   ├── AllocationChart (client workload)
    │   ├── ClientDistributionChart (pie)
    │   ├── TopSwitchersGrid
    │   └── VerticalBarChart (team/switcher workload)
    ├── ListView (switchers/teams/clients/categories)
    └── DetailView (per-entity deep dive)
        ├── Performance Summary Banner
        ├── SimpleTrendChart / MultiLineTrendChart
        ├── AllocationChart / DonutChart
        ├── WeeklyCalendar
        ├── TaskTable (sortable)
        └── TaskDrilldownModal
```

## Navigation

Custom view-based navigation using `useState`:
```js
const [view, setView] = useState({ type: 'dashboard', id: null });
```

View types: `dashboard`, `switchers`, `departments`, `clients`, `categories`, `*_detail`

No URL routing — browser back/forward does not work.

## State Management

All state lives in the `App` component via `useState` hooks. No Redux, Zustand, or Context API. Key state:

- `data` — raw parsed CSV data
- `view` — current navigation state
- `dateRange` — global date filter (start/end)
- `apiKey` — Gemini API key (also in localStorage)
- `sortOrder` — list view sort preference

Derived data is computed via `useMemo` with appropriate dependency arrays.

## External API Integration

Single integration: **Google Gemini API** (`callGemini` function at `src/App.jsx:112`)
- Called client-side via `fetch` to `generativelanguage.googleapis.com`
- API key stored in `localStorage` under key `switch_ai_key`
- Used for AI-powered performance analysis reports
- Model: `gemini-2.5-flash-preview-09-2025`

## Build & Deploy

- **Build tool:** Vite 5 with `@vitejs/plugin-react`
- **Base path:** `/switch-timesheet/` (for GitHub Pages)
- **Deploy:** `gh-pages` package → GitHub Pages
- **Scripts:** `npm run dev` (local), `npm run build` (production), `npm run deploy` (GitHub Pages)
