# Technology Stack

**Analysis Date:** 2026-04-14

## Languages

**Primary:**
- JavaScript (JSX) - All application logic in `src/App.jsx`, `src/main.jsx`

**Secondary:**
- CSS - Global styles in `src/index.css` (Tailwind directives only)
- HTML - Single entry `index.html`

## Runtime

**Environment:**
- Node.js v24.13.0 (detected in environment)
- Browser target: modern evergreen browsers (Vite defaults)

**Package Manager:**
- npm
- Lockfile: `package-lock.json` present (lockfileVersion 3)

## Frameworks

**Core:**
- React 18.2.0 - UI framework; entry via `src/main.jsx`, single component tree in `src/App.jsx`
- React DOM 18.2.0 - Browser rendering

**Styling:**
- Tailwind CSS 3.4.1 - Utility-first CSS; config in `tailwind.config.js`; scans `./index.html` and `./src/**/*.{js,ts,jsx,tsx}`
- PostCSS 8.4.35 - Tailwind/Autoprefixer pipeline; config in `postcss.config.js`
- Autoprefixer 10.4.17 - Vendor prefix handling

**Data Visualization:**
- Recharts 2.12.0 - Chart components (BarChart, PieChart, LineChart, AreaChart); imported in `src/App.jsx`

**Icons:**
- Lucide React 0.330.0 - Icon set; imported in `src/App.jsx`

**Utilities:**
- clsx 2.1.0 - Conditional class name joining
- tailwind-merge 2.2.1 - Merging Tailwind classes without conflicts

**Build/Dev:**
- Vite 5.1.4 - Dev server and bundler; config in `vite.config.js`
- @vitejs/plugin-react 4.2.1 - Babel-based JSX transform for Vite

**Deployment:**
- gh-pages 6.1.1 - Publishes `dist/` to GitHub Pages; invoked via `npm run deploy`

## Key Dependencies

**Critical:**
- `react` + `react-dom` 18.2.0 - Core framework; entire app is a single React SPA
- `recharts` 2.12.0 - All chart rendering for timesheet visualizations
- `lucide-react` 0.330.0 - UI icons used throughout `src/App.jsx`

**Infrastructure:**
- `vite` 5.1.4 - Build pipeline; base path set to `/switch-timesheet/` for GitHub Pages in `vite.config.js`
- `gh-pages` 6.1.1 - Deployment; `predeploy` script runs `vite build` first

## Configuration

**Environment:**
- No `.env` files detected
- No environment variables required at build time
- Gemini API key is user-supplied at runtime; stored in `localStorage` under key `switch_ai_key` (see `src/App.jsx` lines 149, 1501)

**Build:**
- `vite.config.js` - Sets `base: '/switch-timesheet/'` for GitHub Pages compatibility
- `tailwind.config.js` - Content paths cover `./index.html` and `./src/**/*.{js,ts,jsx,tsx}`; no theme extensions
- `postcss.config.js` - Plugins: `tailwindcss`, `autoprefixer`

**Type Definitions (dev only):**
- `@types/react` 18.2.56 and `@types/react-dom` 18.2.19 present but project uses plain JS (no TypeScript config)

## Platform Requirements

**Development:**
- Node.js (no version constraint specified in `package.json`)
- `npm run dev` - starts Vite dev server
- `npm run build` - outputs to `dist/`
- `npm run preview` - previews production build

**Production:**
- Static site deployment to GitHub Pages
- Repository: `https://github.com/lukeno23/switch-timesheet` (from `package.json` homepage)
- Deployed path: `https://lukeno23.github.io/switch-timesheet/`
- Deploy command: `npm run deploy` (runs predeploy build then gh-pages publish)

---

*Stack analysis: 2026-04-14*
