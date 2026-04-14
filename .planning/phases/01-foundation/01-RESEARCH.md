# Phase 1: Foundation - Research

**Researched:** 2026-04-14
**Domain:** React SPA refactor, client-side auth, XSS remediation, Vitest unit testing, Vercel deployment
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Feature-based folder organization under `src/features/` (dashboard, detail, upload, settings). Shared code in `src/shared/` (components, hooks, utils, services). `App.jsx` becomes a thin routing + layout shell.
- **D-02:** Every component gets its own file regardless of size. Expect ~20–25 component files across feature folders.
- **D-03:** Shared password approach — single password shared among ~6 management users. Simple login screen, no per-user accounts.
- **D-04:** Password verified client-side via SHA-256 hash comparison. Store hashed password in Vercel env var `VITE_APP_PASSWORD_HASH`. Client hashes user input and compares. Authenticated session persists via `sessionStorage`.
- **D-05:** Vitest for unit tests only. Cover pure functions: `parseCSV`, `getWeekNumber`, data aggregation helpers, and classification logic. No component tests or E2E in Phase 1.
- **D-06:** GitHub Actions CI workflow. Tests run on push/PR.

### Claude's Discretion

- Constants organization: Claude decides whether to use separate files per constant type (colors.js, logos.jsx) or a single constants file.
- Color token naming convention: Claude picks the approach that best balances readability and maintainability.
- **D-07 (from UI-SPEC):** Token naming resolved — use `switch-` prefix semantic names: `switch-bg`, `switch-primary`, `switch-secondary`, `switch-tertiary`, `switch-secondary-dark`.

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| QUAL-01 | App.jsx refactored into modular component architecture (components, hooks, utils, services) | D-01/D-02 lock feature-based folder structure; ~20–25 component files identified from App.jsx sections |
| QUAL-02 | XSS vulnerability fixed — Gemini HTML output sanitized with DOMPurify before rendering | DOMPurify 3.4.0 verified in npm registry; single call pattern identified |
| QUAL-03 | Hardcoded hex colors extracted into Tailwind theme tokens | Token map defined in UI-SPEC; tailwind.config.js `theme.extend.colors` confirmed empty and ready |
| QUAL-04 | Error boundaries prevent white-screen crashes on runtime errors | React 18 class component ErrorBoundary pattern; no external library needed |
| QUAL-05 | Performance fixes — Math.min/max spread replaced with reduce, calendar filtering optimized | Specific lines identified in CONCERNS.md (1517, 1633–1634, 817–823); fix patterns clear |
| QUAL-06 | Repo artifacts cleaned up (app.jsx.scpt, vite.config backup files, .DS_Store in .gitignore) | Files confirmed present in root: `app.jsx.scpt`, `vite.config.jsx.txt`, `vite.config.jsx.js.sb-*`; no .gitignore exists — must create |
| QUAL-07 | Test coverage for classification logic and CSV/data parsing | Vitest 4.1.4 + jsdom verified; pure function targets identified from App.jsx |
| DASH-03 | Simple password protection gates access to the dashboard | Web Crypto API SHA-256 verified working; sessionStorage pattern confirmed; VITE_ prefix exposes at build time |
| DASH-05 | Frontend deployed to Vercel (replaces GitHub Pages) | vite.config.js base path must change from `/switch-timesheet/` to `/`; vercel CLI not installed locally but not required for deployment |
</phase_requirements>

---

## Summary

Phase 1 is a refactor + hardening phase, not a greenfield build. The entire codebase lives in a single 2149-line `src/App.jsx`. The work involves decomposing it into a feature-based module structure, fixing three confirmed security/quality issues (XSS at line 218, var usage, stale AI cache), adding a password gate, configuring tests, and migrating from GitHub Pages to Vercel.

All locked decisions are technically sound. The SHA-256 client-side hash approach (D-04) is appropriate for an internal management tool — it is not ASVS-grade authentication but was explicitly chosen as sufficient for this use case. DOMPurify is the correct, battle-tested solution for the dangerouslySetInnerHTML XSS risk. Vitest is already compatible with the Vite 5 project without any configuration conflicts.

The highest complexity task in this phase is the App.jsx decomposition (QUAL-01). The file has clear section delimiter comments that map cleanly to the feature-folder structure. The decomposition must preserve all existing `useMemo` patterns and avoid introducing any React context or state management changes — the architecture stays flat (`useState` only).

**Primary recommendation:** Decompose App.jsx section-by-section following the existing `// --- Section ---` delimiters. Each section maps to a target module. Do not refactor logic during decomposition — move first, fix second.

---

## Standard Stack

### Core (already installed — no new installs for most)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 18.2.0 | UI framework | Already installed |
| Vite | 5.1.4 | Build tool | Already installed |
| Tailwind CSS | 3.4.1 | Styling | Already installed |
| Recharts | 2.12.0 | Charts | Already installed |
| Lucide React | 0.330.0 | Icons | Already installed |
| clsx | 2.1.0 | Class composition | Already installed |
| tailwind-merge | 2.2.1 | Tailwind class merging | Already installed |

### New Dependencies Required
| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| dompurify | 3.4.0 | Sanitize Gemini HTML before dangerouslySetInnerHTML | Industry standard; only correct fix for QUAL-02 |
| vitest | 4.1.4 | Unit test runner | Vite-native, zero config with vite.config.js |
| jsdom | 29.0.2 | Browser environment for Vitest | Required for DOM-dependent helpers |
| @vitest/coverage-v8 | 4.1.4 | Coverage reports | V8 native coverage, no instrumentation overhead |

**Version verification:** [VERIFIED: npm registry — 2026-04-14]
- dompurify: `3.4.0` (latest)
- vitest: `4.1.4` (latest stable)
- jsdom: `29.0.2` (latest stable)
- @vitest/coverage-v8: `4.1.4` (latest stable)

**Installation:**
```bash
npm install dompurify
npm install --save-dev vitest jsdom @vitest/coverage-v8
```

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| dompurify | react-markdown + remark | Markdown requires Gemini prompt change to return MD instead of HTML; higher refactor cost for no Phase 1 benefit |
| jsdom | happy-dom | jsdom is the established default; happy-dom is faster but has known gaps with complex DOM APIs |
| @vitest/coverage-v8 | istanbul/nyc | V8 coverage is built-in to Node, no instrumentation; istanbul adds overhead and a separate config |

---

## Architecture Patterns

### Target Module Structure

```
src/
├── features/
│   ├── dashboard/
│   │   ├── DashboardView.jsx         # Main dashboard view
│   │   ├── StatCard.jsx              # Individual stat card
│   │   ├── SimpleTrendChart.jsx      # Area chart component
│   │   ├── MultiLineTrendChart.jsx   # Multi-line trend chart
│   │   ├── AllocationChart.jsx       # Bar/pie allocation chart
│   │   └── VerticalBarChart.jsx      # Vertical bar chart
│   ├── detail/
│   │   ├── DetailView.jsx            # Generic detail drilldown
│   │   └── DetailStat.jsx            # Stat display in detail
│   ├── upload/
│   │   └── UploadView.jsx            # CSV upload screen
│   └── settings/
│       └── SettingsModal.jsx         # API key settings modal
├── shared/
│   ├── components/
│   │   ├── Card.jsx                  # Base card wrapper
│   │   ├── AIInsightsModal.jsx       # AI report modal
│   │   ├── ErrorBoundary.jsx         # React error boundary (new)
│   │   ├── TimeFrameToggle.jsx       # Day/week/month toggle
│   │   ├── MultiSelect.jsx           # Multi-select dropdown
│   │   ├── DropdownFilter.jsx        # Single-select filter
│   │   ├── WeeklyCalendar.jsx        # Weekly calendar view
│   │   └── PasswordGate.jsx          # Password auth screen (new)
│   ├── hooks/
│   │   └── useClickOutside.js        # Extracted from MultiSelect/dropdowns
│   ├── utils/
│   │   ├── parseCSV.js               # CSV parsing (unit tested)
│   │   ├── getWeekNumber.js          # Week number helper (unit tested)
│   │   └── aggregation.js            # Data aggregation helpers (unit tested)
│   └── services/
│       └── gemini.js                 # callGemini API function
├── constants/
│   ├── colors.js                     # COLORS constant
│   └── logos.jsx                     # LogoMain, LogoSquare SVG components
├── App.jsx                           # Thin shell: layout + routing + top-level state
├── main.jsx                          # Unchanged (StrictMode + createRoot)
└── index.css                         # Google Fonts @import moved here + scrollbar CSS
```

### Pattern 1: Feature-Based Module Split (QUAL-01)

**What:** Move code from App.jsx sections to their target files verbatim. No logic changes during the move.
**When to use:** Every component, helper, and constant extracted from App.jsx.

```jsx
// Source: existing App.jsx pattern — preserve exactly
// src/shared/utils/parseCSV.js
export const parseCSV = (text) => {
  // ... exact code from App.jsx lines 54-99
};

// src/shared/services/gemini.js
export const callGemini = async (apiKey, prompt) => {
  // ... exact code from App.jsx lines 112-136
};

// src/constants/colors.js
export const COLORS = {
  bg: '#edf4ed',
  primary: '#a5c869',
  // ...
};
```

### Pattern 2: XSS Fix with DOMPurify (QUAL-02)

**What:** Sanitize Gemini HTML output before rendering with `dangerouslySetInnerHTML`.
**Fix target:** `src/App.jsx` line 218 (moves to `AIInsightsModal.jsx`)

```jsx
// Source: DOMPurify official API [VERIFIED: npm registry dompurify 3.4.0]
import DOMPurify from 'dompurify';

// In AIInsightsModal:
<div
  className="prose prose-stone max-w-none"
  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content) }}
/>
```

DOMPurify runs entirely client-side. No server or config required. Default sanitization strips `<script>`, event handlers, `javascript:` URIs. [VERIFIED: DOMPurify README]

### Pattern 3: SHA-256 Password Gate (DASH-03)

**What:** Client-side hash comparison using the Web Crypto API. No library needed — native browser API.
**When:** On password form submit.

```jsx
// Source: Web Crypto API — verified working in Node 24 and all modern browsers [ASSUMED: browser compatibility]
// src/shared/components/PasswordGate.jsx

const hashPassword = async (password) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

const handleSubmit = async (e) => {
  e.preventDefault();
  const hash = await hashPassword(inputPassword);
  const expectedHash = import.meta.env.VITE_APP_PASSWORD_HASH;
  if (hash === expectedHash) {
    sessionStorage.setItem('switch_auth', 'true');
    onAuthenticated();
  } else {
    setError('Incorrect password. Try again.');
    setInputPassword('');
    inputRef.current?.focus();
  }
};
```

**Generating the hash for the env var:**
```bash
# Run once to get the hash value to store in Vercel
node -e "
const crypto = require('crypto');
const hash = crypto.createHash('sha256').update('YOUR_PASSWORD').digest('hex');
console.log(hash);
"
```

**VITE_ prefix requirement:** Vite only exposes env vars prefixed with `VITE_` to the client bundle. `VITE_APP_PASSWORD_HASH` will be available as `import.meta.env.VITE_APP_PASSWORD_HASH`. [VERIFIED: Vite docs pattern in vite.config.js]

**sessionStorage check on App mount:**
```jsx
// In App.jsx or main.jsx
const isAuthenticated = sessionStorage.getItem('switch_auth') === 'true';
if (!isAuthenticated) return <PasswordGate onAuthenticated={...} />;
```

### Pattern 4: React Error Boundary (QUAL-04)

**What:** Class component wrapping each major view. React 18 does not yet support hook-based error boundaries — class component is required. [ASSUMED: React 18 class boundary requirement — consistent with React docs training data]

```jsx
// Source: React 18 ErrorBoundary class pattern
// src/shared/components/ErrorBoundary.jsx
import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-switch-bg">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center border-t-4 border-switch-primary">
            <h2 className="text-xl font-bold text-switch-secondary font-dm mb-2">
              Something went wrong
            </h2>
            <p className="text-stone-500 text-sm font-dm mb-6">
              Refresh the page to try again. If the problem persists, contact your administrator.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-switch-secondary text-white px-4 py-2 rounded-lg font-dm font-bold"
            >
              Refresh page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
```

### Pattern 5: Tailwind Theme Token Migration (QUAL-03)

**What:** Move all `bg-[#hex]`, `text-[#hex]`, `border-[#hex]` arbitrary values to named tokens in `tailwind.config.js`.

```js
// tailwind.config.js — full replacement
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'switch-bg': '#edf4ed',
        'switch-primary': '#a5c869',
        'switch-secondary': '#2f3f28',
        'switch-secondary-dark': '#1a2416',
        'switch-tertiary': '#d2beff',
      },
      fontFamily: {
        'dm': ['DM Sans', 'sans-serif'],
        'playfair': ['Playfair Display', 'serif'],
      },
    },
  },
  plugins: [],
}
```

After this, all `text-[#2f3f28]` → `text-switch-secondary`, `bg-[#a5c869]` → `bg-switch-primary`, etc. Google Fonts `@import` moves from inline `<style>` tags to `src/index.css`. [VERIFIED: tailwind.config.js confirmed empty `extend` block]

### Pattern 6: Performance Fixes (QUAL-05)

**Fix 1: Math.spread → reduce** (App.jsx lines 1517–1519)
```js
// Before (stack overflow risk on large arrays):
const min = new Date(Math.min(...dates));
const max = new Date(Math.max(...dates));

// After:
const min = new Date(dates.reduce((m, d) => d < m ? d : m, Infinity));
const max = new Date(dates.reduce((m, d) => d > m ? d : m, -Infinity));
```

**Fix 2: Calendar pre-grouped Map** (App.jsx lines 817–823)
```js
// In WeeklyCalendar, replace per-cell filter with useMemo Map:
const tasksByDay = useMemo(() => {
  const map = new Map();
  data.forEach(entry => {
    const key = entry.dateObj.toDateString();
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(entry);
  });
  return map;
}, [data]);

// Then: tasksByDay.get(day.toDateString()) ?? []
```

### Pattern 7: Vitest Configuration (QUAL-07)

```js
// vite.config.js — add test block
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/',  // Changed from '/switch-timesheet/' for Vercel
  test: {
    environment: 'jsdom',
    globals: true,
    coverage: {
      provider: 'v8',
      include: ['src/shared/utils/**', 'src/shared/services/**'],
    },
  },
});
```

```json
// package.json scripts additions:
"test": "vitest run",
"test:watch": "vitest",
"test:coverage": "vitest run --coverage"
```

### Pattern 8: GitHub Actions CI (D-06)

```yaml
# .github/workflows/ci.yml
name: CI
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '24'
          cache: 'npm'
      - run: npm ci
      - run: npm test
```

No secrets required for tests — pure unit tests with no external service calls. [ASSUMED: GitHub Actions ubuntu-latest includes Node 24 — consistent with standard GitHub-hosted runners]

### Pattern 9: Vercel Deployment (DASH-05)

**vite.config.js change:** `base: '/switch-timesheet/'` → `base: '/'`

**Vercel configuration:** No `vercel.json` required for a standard Vite SPA — Vercel auto-detects Vite projects. The only required setup:
1. Connect GitHub repo to Vercel project via UI
2. Set `VITE_APP_PASSWORD_HASH` as an environment variable in Vercel dashboard
3. Build command: `npm run build` (default)
4. Output directory: `dist` (default for Vite)

**package.json cleanup:** The `predeploy` and `deploy` scripts (gh-pages) can be removed or left inert — they won't interfere with Vercel's build pipeline. [ASSUMED: Vercel auto-detects Vite — consistent with Vercel documentation training data]

### Anti-Patterns to Avoid

- **Don't refactor logic during decomposition.** Move code first, then fix bugs. Mixing both in one step makes regressions hard to isolate.
- **Don't introduce React Context or useReducer.** The locked decisions keep state management flat (`useState` only). Phase 2 will introduce Supabase-driven state where a different pattern may be warranted.
- **Don't change Recharts imports or chart logic.** Recharts components are already working correctly — only move them, never restructure.
- **Don't add `@tailwind/typography` plugin.** The existing `prose` class usage will continue to work via CDN-loaded styles or can be scoped; adding the plugin would change visual output unexpectedly.
- **Don't sanitize with innerHTML replacement.** Always use `DOMPurify.sanitize(content)` inside the `__html` property — never manipulate `innerHTML` directly in React.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HTML sanitization | Custom regex/replace stripping tags | DOMPurify 3.4.0 | Regex sanitization has known bypasses; DOMPurify handles SVG, MathML, mutation-based vectors |
| SHA-256 hashing | Custom hash implementation | `crypto.subtle.digest('SHA-256', ...)` (Web Crypto API) | Native browser API, no library overhead; cryptographically correct |
| Test environment setup | Custom JSDOM bootstrap | Vitest `environment: 'jsdom'` config | Built-in integration, zero config |
| React error boundary logic | `try/catch` around JSX | React `ErrorBoundary` class component | Only class components can catch render-phase errors |
| Color token management | Manual find-replace every hex | Tailwind `theme.extend.colors` | Single source of truth; Tailwind purges unused tokens automatically |

**Key insight:** The XSS fix and password gate are both single-library or native-API solutions. The complexity is in the App.jsx decomposition, not in any of the individual fixes.

---

## Common Pitfalls

### Pitfall 1: vite.config.js base path left as `/switch-timesheet/`
**What goes wrong:** All assets 404 on Vercel because Vercel serves from the root path, not `/switch-timesheet/`.
**Why it happens:** The base path was set for GitHub Pages subdirectory hosting and is still hardcoded.
**How to avoid:** Change `base: '/switch-timesheet/'` to `base: '/'` in vite.config.js as the very first step before any other changes.
**Warning signs:** Blank page or 404 on Vercel after deployment.

### Pitfall 2: VITE_ prefix missing on env var
**What goes wrong:** `import.meta.env.VITE_APP_PASSWORD_HASH` is `undefined` at runtime; every password attempt fails silently or throws.
**Why it happens:** Vite strips env vars without the `VITE_` prefix from the client bundle for security.
**How to avoid:** Name the Vercel environment variable exactly `VITE_APP_PASSWORD_HASH`. Verify in browser devtools: `console.log(import.meta.env.VITE_APP_PASSWORD_HASH)` should print the hash string.
**Warning signs:** Password gate rejects all inputs; hash comparison never succeeds.

### Pitfall 3: Circular imports after decomposition
**What goes wrong:** `App.jsx` imports from `features/dashboard/DashboardView.jsx` which imports from `constants/colors.js` which accidentally imports from `App.jsx`.
**Why it happens:** When extracting a monolith, it's easy to accidentally create circular dependency chains, especially for constants and utilities.
**How to avoid:** Constants (`colors.js`, `logos.jsx`) must have zero imports from any other project file. Utilities (`parseCSV.js`, etc.) must only import from other utils or external libraries. Components import from shared/ and constants/, never from sibling features.
**Warning signs:** Vite build error "circular dependency detected"; app renders blank.

### Pitfall 4: Import paths break on Windows due to case sensitivity
**What goes wrong:** `import Card from './shared/Components/Card.jsx'` works on Mac (case-insensitive FS) but fails in CI on Linux.
**Why it happens:** macOS filesystem is case-insensitive; GitHub Actions runs on ubuntu-latest (case-sensitive).
**How to avoid:** Use exact case in all import paths. Directory and file names should be consistent: `shared/components/Card.jsx` with lowercase `components`.
**Warning signs:** CI fails but local build succeeds.

### Pitfall 5: DOMPurify strips valid HTML elements used in Gemini output
**What goes wrong:** Gemini returns HTML with `<table>`, `<strong>`, `<em>`, `<ul>`, `<ol>` — DOMPurify default config allows these, but custom config could over-strip.
**Why it happens:** Developers sometimes configure DOMPurify too aggressively.
**How to avoid:** Use `DOMPurify.sanitize(content)` with **no custom config** in Phase 1. Default config allows all safe HTML elements and strips only dangerous ones.
**Warning signs:** AI reports display as plain text or partial content.

### Pitfall 6: sessionStorage clears on tab close (expected, not a bug)
**What goes wrong:** Users complain they have to re-enter the password when opening a new tab.
**Why it happens:** `sessionStorage` is per-tab, per-session — this is the decided behavior (D-04).
**How to avoid:** Document this in code comments. If user asks about it, this is by design.
**Warning signs:** None — this is the intended behavior.

### Pitfall 7: SVG gradient ID collision after decomposition
**What goes wrong:** Multiple `SimpleTrendChart` instances render on the same page and share the gradient `id`, causing visual artifacts.
**Why it happens:** `CONCERNS.md` documents this — `id={\`color${timeframe}\`}` collides across instances.
**How to avoid:** Fix as part of QUAL-05 or QUAL-01 when extracting `SimpleTrendChart` — use `useId()` hook (React 18) to generate a unique suffix per instance.

---

## Code Examples

### Extracted parseCSV with null-date fix (QUAL-05)
```js
// Source: App.jsx lines 54–99 with CONCERNS.md fix applied
// src/shared/utils/parseCSV.js
export const parseCSV = (text) => {
  const lines = text.split('\n').filter(line => line.trim() !== '');
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());

  return lines.slice(1).map(line => {
    // ... existing CSV parsing logic ...
    if (entry.dateStr) {
      const parts = entry.dateStr.split('/');
      if (parts.length === 3) {
        entry.dateObj = new Date(parts[2], parts[1] - 1, parts[0]);
      } else {
        entry.dateObj = null; // Fix: was new Date() — see CONCERNS.md
      }
    }
    return entry;
  }).filter(e => e.switcher && e.client && e.dateObj instanceof Date && !isNaN(e.dateObj))
    .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());
};
```

### getWeekNumber with var fix (CONCERNS.md)
```js
// Source: App.jsx lines 102–108 with var → const fix
// src/shared/utils/getWeekNumber.js
export const getWeekNumber = (d) => {
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1)); // was var
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7); // was var
  return weekNo;
};
```

### Vitest test structure
```js
// src/shared/utils/__tests__/parseCSV.test.js
import { describe, it, expect } from 'vitest';
import { parseCSV } from '../parseCSV.js';

describe('parseCSV', () => {
  it('parses valid CSV with all expected fields', () => {
    const csv = `switcher,date,department,client,task category,task,time spent
Luke,14/01/2026,Marketing,Acme,Strategy Meeting,planning,60`;
    const result = parseCSV(csv);
    expect(result).toHaveLength(1);
    expect(result[0].switcher).toBe('Luke');
    expect(result[0].minutes).toBe(60);
  });

  it('filters rows with invalid dates instead of using today', () => {
    const csv = `switcher,date,client,time spent
Luke,not-a-date,Acme,30`;
    const result = parseCSV(csv);
    expect(result).toHaveLength(0); // Invalid date filtered out
  });

  it('handles quoted commas in values', () => {
    const csv = `switcher,date,client,time spent
Luke,14/01/2026,"Acme, Inc",60`;
    const result = parseCSV(csv);
    expect(result[0].client).toBe('Acme, Inc');
  });
});
```

### AI cache invalidation fix (CONCERNS.md)
```jsx
// In whatever component holds aiReport state, add this useEffect:
useEffect(() => {
  setAiReport(null);
  setAiError(null);
}, [filteredData]);
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| GitHub Pages via gh-pages npm | Vercel (DASH-05) | Phase 1 | Base path changes; env vars available via dashboard |
| Inline `<style>` font injection per render | Single `@import` in `index.css` | Phase 1 refactor | Eliminates duplicate font requests per render cycle |
| Arbitrary hex values in className | Tailwind theme tokens (`switch-primary`) | Phase 1 refactor | Single source of truth; rename from config only |
| Monolithic App.jsx (2149 lines) | Feature-based module structure | Phase 1 refactor | Each file ~50–150 lines; clear import boundaries |
| No error recovery | React `ErrorBoundary` per view | Phase 1 refactor | No more white-screen crashes |
| Unsanitized Gemini HTML | DOMPurify-sanitized before render | Phase 1 refactor | XSS vectors closed |

**Deprecated/outdated:**
- `gh-pages` deploy scripts: Still in package.json but superseded by Vercel. Can be removed.
- `base: '/switch-timesheet/'` in vite.config.js: Required for GitHub Pages, wrong for Vercel.
- `app.jsx.scpt`, `vite.config.jsx.txt`, `vite.config.jsx.js.sb-*`: Dead artifacts, should be deleted and added to .gitignore.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Web Crypto API SHA-256 works in all target browsers (modern evergreen) | Password Gate pattern | Negligible — Web Crypto is baseline in all modern browsers since 2015 |
| A2 | Vercel auto-detects Vite projects and uses `dist` output directory without vercel.json | Vercel Deployment pattern | Low — standard Vite SPA is Vercel's most common framework; fallback is adding vercel.json with explicit config |
| A3 | GitHub Actions ubuntu-latest supports Node 24 | GitHub Actions CI pattern | Low — `actions/setup-node@v4` with `node-version: '24'` installs it regardless of runner default |
| A4 | React 18 class components are still required for error boundaries | ErrorBoundary pattern | Low — React 18 never shipped hook-based error boundaries; if wrong, use-error-boundary library (0.4KB) is available |
| A5 | DOMPurify default config allows all HTML elements Gemini produces (ul, ol, strong, em, table, h2, h3) | XSS fix pattern | Low — DOMPurify default allowlist includes all common HTML elements; only event handlers and JS URLs are stripped |

---

## Open Questions

1. **Password for the gate — who generates and sets the hash?**
   - What we know: A SHA-256 hash of the chosen password must be stored in Vercel as `VITE_APP_PASSWORD_HASH`.
   - What's unclear: Luke (the admin) needs to decide the password and generate the hash before or during deployment.
   - Recommendation: Include a note in the deployment task with the one-liner Node command to generate the hash. Luke runs it locally and pastes the output into Vercel environment variables.

2. **Should gh-pages scripts be removed from package.json?**
   - What we know: They are no longer used after Vercel migration. QUAL-06 covers artifact cleanup.
   - What's unclear: Whether Luke wants to keep them as a fallback.
   - Recommendation: Remove them as part of QUAL-06 cleanup. If needed, they can be recovered from git history.

3. **`CalendarExtractor.gs` and CSV files in `Other files/` — should these be gitignored?**
   - What we know: These are reference files, not part of the app build. The `Other files/` directory contains CSV timesheet exports with real employee calendar data — potential PII.
   - What's unclear: Whether these should remain in the repo.
   - Recommendation: Add `Other files/*.csv` to `.gitignore` to prevent committing PII. The `.gs` and `.py` scripts are fine to keep. This is a judgment call for Luke.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Vitest, build | ✓ | v24.13.0 | — |
| npm | Package install | ✓ | (lockfileVersion 3) | — |
| Vercel CLI | DASH-05 deployment | ✗ | — | Deploy via GitHub integration in Vercel dashboard (no CLI needed) |
| GitHub Actions | D-06 CI | ✓ (implied) | — | Tests run locally with `npm test` |

**Missing dependencies with no fallback:** None — Vercel CLI is not required; dashboard-based deployment is the standard approach.

**Missing dependencies with fallback:**
- Vercel CLI not installed locally — use Vercel GitHub integration (connect repo in dashboard, push to trigger deploy).

---

## Security Domain

Phase 1 introduces a password gate for an internal management tool. The user explicitly chose client-side SHA-256 hash comparison as sufficient (D-04). The following represents an honest assessment, not a recommendation to change the design.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes (password gate) | Client-side hash — not ASVS-grade, explicitly accepted as sufficient for internal tool |
| V3 Session Management | yes | sessionStorage (tab-scoped, no persistent token) |
| V4 Access Control | no | Single-user-class tool; no role differentiation in Phase 1 |
| V5 Input Validation | yes | DOMPurify sanitizes Gemini HTML; CSV parsing validates field presence |
| V6 Cryptography | yes | SHA-256 via Web Crypto API (no hand-rolled crypto) |

### Known Threat Patterns for Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| XSS via Gemini HTML response | Spoofing/Tampering | DOMPurify.sanitize() before dangerouslySetInnerHTML (QUAL-02) |
| Hash enumeration (client-visible hash) | Information Disclosure | Acceptable for internal tool; hash is in built JS bundle — not a secret per se |
| Session fixation | Elevation of Privilege | sessionStorage clears on tab close; no persistent token |
| CSV formula injection | Tampering | Low risk (internal CSV from Google Calendar); no downstream spreadsheet export in Phase 1 |
| API key exposure in localStorage | Information Disclosure | Accepted risk (see CONCERNS.md); documented limitation for internal tool |

---

## Sources

### Primary (HIGH confidence)
- npm registry (2026-04-14) — dompurify 3.4.0, vitest 4.1.4, jsdom 29.0.2, @vitest/coverage-v8 4.1.4
- `src/App.jsx` (local) — 2149-line monolith; full structure and section delimiters verified
- `.planning/codebase/CONCERNS.md` (local) — line-level bug references verified
- `.planning/codebase/CONVENTIONS.md` (local) — code patterns verified
- `.planning/phases/01-foundation/01-CONTEXT.md` (local) — locked decisions
- `.planning/phases/01-foundation/01-UI-SPEC.md` (local) — approved UI contract and token names
- `tailwind.config.js` (local) — confirmed empty `extend` block
- `vite.config.js` (local) — confirmed GitHub Pages base path
- `package.json` (local) — confirmed all installed versions
- `.planning/config.json` (local) — nyquist_validation: false confirmed

### Secondary (MEDIUM confidence)
- Web Crypto API `crypto.subtle.digest` — verified working via live Node 24.13.0 execution in this session

### Tertiary (LOW confidence)
- Vercel auto-detection of Vite projects [ASSUMED] — consistent with widely documented Vercel behavior

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all versions verified against npm registry in this session
- Architecture: HIGH — derived directly from reading App.jsx and locked decisions
- Pitfalls: HIGH — derived from CONCERNS.md (authoritative bug audit) and locked decision specifics
- Vercel deployment: MEDIUM — CLI not available locally; relying on standard Vercel/Vite integration knowledge

**Research date:** 2026-04-14
**Valid until:** 2026-05-14 (stable dependencies; Vitest/Vite versions unlikely to change meaningfully)
