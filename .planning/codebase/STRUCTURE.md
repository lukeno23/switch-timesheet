# Project Structure

## Directory Layout

```
switch-timesheet/
├── index.html                  # HTML entry point
├── package.json                # Dependencies and scripts
├── vite.config.js              # Vite configuration (base path for GH Pages)
├── tailwind.config.js          # Tailwind CSS config (default extend)
├── postcss.config.js           # PostCSS with tailwindcss + autoprefixer
├── dist/                       # Built output (deployed to GitHub Pages)
├── node_modules/               # Dependencies
└── src/
    ├── main.jsx                # React entry point (createRoot + StrictMode)
    ├── index.css               # Tailwind directives + body font
    └── App.jsx                 # ENTIRE APPLICATION (~2150 lines)
```

## Key Locations

### Application Code
- **All application logic:** `src/App.jsx` — single monolithic file containing:
  - Lines 1-10: Imports (React, recharts, lucide-react)
  - Lines 12-50: Constants (`COLORS` palette) and SVG logos (`LogoMain`, `LogoSquare`)
  - Lines 52-108: Helper functions (`parseCSV`, `getWeekNumber`)
  - Lines 110-136: API service (`callGemini`)
  - Lines 138-935: Presentational components (modals, charts, calendar, tables)
  - Lines 937-1427: View components (`DetailView`, `ListView`)
  - Lines 1487-2149: Main `App` component (state, handlers, render)

### Configuration
- **Vite config:** `vite.config.js` — base path set to `/switch-timesheet/`
- **Tailwind config:** `tailwind.config.js` — default with content paths
- **PostCSS config:** `postcss.config.js` — tailwindcss + autoprefixer

### Styling
- **CSS entry:** `src/index.css` — Tailwind directives + DM Sans font family
- **Inline styles:** Extensive Tailwind utility classes throughout `src/App.jsx`
- **Dynamic styles:** `<style>` tags embedded in JSX for Google Fonts import and custom font classes

### Deployment
- **Build output:** `dist/` directory
- **Deploy config:** `package.json` scripts (`predeploy`, `deploy`) using `gh-pages`
- **GitHub Pages base:** Configured in `vite.config.js` as `/switch-timesheet/`

## Naming Conventions

### Components
- **PascalCase** for all components: `SettingsModal`, `AIInsightsModal`, `DetailView`, `TaskTable`
- Components are arrow functions: `const Card = ({ children, className }) => (...)`

### Functions
- **camelCase** with `handle` prefix for event handlers: `handleFileUpload`, `handleNavigate`, `handleGenerateReport`
- Helper functions: `parseCSV`, `getWeekNumber`, `callGemini`

### State Variables
- **camelCase** for state: `dateRange`, `sortOrder`, `trendMetric`
- Boolean state uses `is` prefix: `isOpen`, `isAIModalOpen`, `isAiLoading`

### Constants
- **SCREAMING_SNAKE_CASE** for top-level constants: `COLORS`

### CSS
- Tailwind utility classes with arbitrary values for brand colors: `text-[#2f3f28]`, `bg-[#a5c869]`
- Custom font classes via inline `<style>`: `.font-dm`, `.font-playfair`

## File Count

- Source files: 3 (`main.jsx`, `index.css`, `App.jsx`)
- Config files: 3 (`vite.config.js`, `tailwind.config.js`, `postcss.config.js`)
- Total meaningful files: ~7 (including `index.html` and `package.json`)

This is a very small codebase by file count but dense by line count — `App.jsx` at 2150 lines contains the entire application.
