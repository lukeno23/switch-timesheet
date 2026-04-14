# External Integrations

**Analysis Date:** 2026-04-14

## APIs & External Services

**AI / Language Model:**
- Google Gemini 2.5 Flash - Used for AI-generated timesheet insights
  - SDK/Client: Native `fetch` (no SDK); called directly in `src/App.jsx` via `callGemini()` function (line 112)
  - Endpoint: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent`
  - Auth: API key passed as query param `?key=<apiKey>`; key is user-supplied at runtime via Settings modal
  - Key storage: `localStorage.getItem('switch_ai_key')` / `localStorage.setItem('switch_ai_key', ...)` in `src/App.jsx` (lines 149, 1501)
  - Key source: Users obtain keys from `https://aistudio.google.com/app/apikey`

**Fonts:**
- Google Fonts CDN - Loads `DM Sans` and `Playfair Display` typefaces
  - URL: `https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;500;700&family=Playfair+Display:ital,wght@0,400;0,700;1,400&display=swap`
  - Injected inline via `<style>` tags in `src/App.jsx` (lines 1806, 1835)
  - No fallback font loading strategy; relies on network availability

## Data Storage

**Databases:**
- None - no server-side database

**Client-side Storage:**
- `localStorage` - Persists the user's Gemini API key under key `switch_ai_key`
  - Read: `src/App.jsx` line 1501
  - Written: `src/App.jsx` line 149

**File Input:**
- CSV upload - Users upload Switch timesheet CSV files via browser file picker
  - Parsed client-side in `parseCSV()` function in `src/App.jsx` (line 54)
  - Expected columns: switcher, date (DD/MM/YYYY), department, client, task category, task, time/spent (minutes)
  - All data remains in browser memory (`useState`); not persisted beyond session

**File Storage:**
- None - no remote file storage; all data is ephemeral in browser session

**Caching:**
- None

## Authentication & Identity

**Auth Provider:**
- None - no user authentication system
- The only credential is the Gemini API key, which is user-managed and stored in `localStorage`

## Monitoring & Observability

**Error Tracking:**
- None - no error tracking service integrated

**Logs:**
- `console.error` used in `callGemini()` error handler (`src/App.jsx` line 133)
- No structured logging

## CI/CD & Deployment

**Hosting:**
- GitHub Pages - static hosting at `https://lukeno23.github.io/switch-timesheet/`

**CI Pipeline:**
- None detected - deployment is manual via `npm run deploy`

**Deploy Flow:**
1. `npm run deploy` triggers `predeploy` script (`npm run build`)
2. Vite builds to `dist/` with base path `/switch-timesheet/`
3. `gh-pages` package publishes `dist/` to the `gh-pages` branch of the repository

## Environment Configuration

**Required env vars:**
- None - no environment variables required at build or runtime

**Secrets location:**
- No secrets in the repository; Gemini API key is end-user-provided via UI and stored in the user's own browser `localStorage`

## Webhooks & Callbacks

**Incoming:**
- None

**Outgoing:**
- Gemini API calls are on-demand, initiated by user interaction (AI Insights buttons in `src/App.jsx`)
- No scheduled or background outgoing requests

---

*Integration audit: 2026-04-14*
