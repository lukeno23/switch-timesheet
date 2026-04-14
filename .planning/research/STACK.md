# Stack Research

**Domain:** Google Calendar → Supabase → React dashboard with LLM classification pipeline
**Researched:** 2026-04-14
**Confidence:** HIGH (all versions verified via npm registry; architecture patterns verified via official docs)

---

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| React | 18.2.0 (keep) | UI framework | Already in use; React 19 is out but upgrading mid-milestone adds risk with no benefit for this use case |
| Vite | 8.x (upgrade from 5.1) | Build tool | Zero-config for React SPAs, fastest HMR, native ESM output. Direct Vercel detection. |
| Tailwind CSS | **3.4.x (stay on v3, do not upgrade to v4)** | Styling | v4 released in 2025 with a full rewrite — CSS-first config, removed `tailwind.config.js`, gradient utility renames, new browser requirements (Safari 16.4+, Chrome 111+). Migrating the entire app mid-project adds a high risk-to-reward ratio. The v3 upgrade path requires running `@tailwindcss/upgrade` codemod and manual review. Defer to a dedicated cleanup phase. |
| Supabase JS | 2.103.0 | Database client, auth | Official JS client for Supabase. v2 is stable, actively maintained. Provides typed query builder, auth helpers, and realtime subscriptions if needed later. |
| @tanstack/react-query | 5.99.0 | Server state management | Pairs naturally with Supabase for caching, background refresh, and loading states. v5 is the current stable release (note: `isLoading` renamed to `isPending`). Eliminates manual `useEffect` + `useState` fetch patterns, which the current App.jsx uses extensively. |
| @google/genai | 1.50.0 | Gemini LLM API client | The **new unified SDK** — the old `@google/generative-ai` package is deprecated and support ends August 31, 2025. Use `@google/genai` exclusively going forward. |

### Backend / Edge Layer

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Supabase Edge Functions | Deno 2.x runtime | Calendar sync cron job, classification pipeline | Runs TypeScript natively, globally distributed, triggered by pg_cron. Free tier includes 500K invocations/month — nightly sync of 15 calendars is negligible. Avoids needing a separate Node.js server. |
| Supabase pg_cron | Built-in Postgres extension | Nightly trigger for sync job | Available on free tier (resource-limited, not plan-limited). Schedule a `net.http_post()` call to invoke the Edge Function at 02:00 Malta time (`0 2 * * *`). Credentials stored in Supabase Vault. |
| googleapis (npm, via Edge Function) | 171.4.0 | Google Calendar API v3 — server-to-server via service account | The standard Node/Deno client for Google APIs. In Supabase Edge Functions import via `npm:googleapis@171.4.0`. Handles JWT signing for domain-wide delegation. Supports per-user impersonation (`subject` field on JWT auth client) to read each Switcher's calendar as themselves. |
| google-auth-library (npm) | 10.6.2 | Service account JWT authentication for Google APIs | The official Google auth library. Used within Edge Functions (via `npm:google-auth-library@10.6.2`) to create a `JWT` auth client with the service account private key. Required for domain-wide delegation impersonation. |

### Frontend Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| dompurify | 3.4.0 | Sanitize Gemini HTML output before `dangerouslySetInnerHTML` | **Required immediately** — existing XSS vulnerability. Wrap every AI-generated HTML string through `DOMPurify.sanitize()`. OWASP-recommended sanitizer. |
| recharts | 2.12.0 (keep — do not upgrade to v3 yet) | Data visualisation | Already installed and extensively used. Recharts v3 (3.8.1 current) rewrote state management and removed `react-smooth`. Upgrading requires testing every chart. Defer to a dedicated cleanup phase; v2.12 works fine. |
| lucide-react | 0.330.0 (keep) | Icons | Already in use. No upgrade required this milestone. |
| clsx + tailwind-merge | 2.1.0 / 2.2.1 (keep) | Conditional class utilities | Already in use, no changes needed. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| Supabase CLI | Local development, deploy Edge Functions, manage migrations | Install globally: `npm install -g supabase`. Required for `supabase functions deploy` and local Deno function development. |
| Vercel CLI | Deploy frontend, manage env vars | `npm install -g vercel`. Needed for setting `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` as Vercel environment variables. |
| vercel.json | SPA routing fix | Required: rewrites all routes to `/index.html`. Without it, direct navigation to `/admin` or `/switchers` returns 404 in production. |
| Vitest | Unit testing | Vite-native test runner. Preferred over Jest for this project because it shares Vite config, runs ESM natively, and has near-instant startup. Use for `parseCSV`, classification rules, and data aggregation logic. |

---

## Installation

```bash
# Add to existing project (new dependencies only)

# Supabase client + data fetching
npm install @supabase/supabase-js @tanstack/react-query

# New Gemini SDK (replace @google/generative-ai if present)
npm install @google/genai

# XSS sanitization (fix existing vulnerability)
npm install dompurify
npm install -D @types/dompurify

# Testing
npm install -D vitest @testing-library/react @testing-library/user-event jsdom

# Supabase CLI (global, for Edge Function development)
npm install -g supabase
```

Edge Function dependencies (imported directly in Deno TypeScript, no npm install):
```typescript
// In supabase/functions/calendar-sync/index.ts
import { google } from "npm:googleapis@171.4.0";
import { JWT } from "npm:google-auth-library@10.6.2";
import { createClient } from "npm:@supabase/supabase-js@2.103.0";
import { GoogleGenerativeAI } from "npm:@google/genai@1.50.0";
```

---

## Alternatives Considered

| Category | Recommended | Alternative | When to Use Alternative |
|----------|-------------|-------------|-------------------------|
| Frontend deployment | Vercel | Netlify | If you need Netlify's form handling or split testing features; neither applies here |
| Frontend deployment | Vercel | Keep GitHub Pages | GitHub Pages can't serve environment variables or run serverless functions. Rules out Supabase SSR auth. Vercel is a necessary upgrade. |
| Backend runtime | Supabase Edge Functions | Standalone Node.js server (Railway/Render) | If the classification pipeline grows beyond 10-minute execution windows, or if you need persistent WebSocket connections. For nightly batch sync of ~200 events this is overkill and expensive. |
| Backend runtime | Supabase Edge Functions | Vercel Serverless Functions | Works, but splits infra — calendar credentials would live in Vercel, data in Supabase. Keeping the sync job in Supabase keeps secrets and data co-located. |
| Scheduling | Supabase pg_cron | External cron service (cron-job.org, GitHub Actions) | If pg_cron limitations emerge. GitHub Actions with a scheduled workflow (`on: schedule`) is a free, reliable fallback — makes an HTTP POST to trigger the Edge Function. |
| LLM | Gemini (`@google/genai`) | OpenAI GPT-4o, Claude | Gemini already used in the dashboard AI insights; using a second provider adds key management complexity. Gemini 2.5 Pro handles the structured JSON classification task well (as demonstrated in the existing `classify_with_ai.py`). |
| Data fetching | TanStack Query v5 | SWR | Both work well with Supabase. TanStack Query has more granular cache control and better DevTools. Either is fine; TanStack Query is more widely adopted in the Supabase ecosystem based on official Supabase documentation examples. |
| Charts | Recharts v2 (keep) | Recharts v3, Chart.js, Nivo | Recharts v3 is not worth migrating to mid-project. Chart.js and Nivo are heavier and would require rewriting all charts. |
| Tailwind | v3 (stay) | v4 | v4 released 2025. Major breaking changes: config system rewritten, all `tailwind.config.js` customizations must be ported to CSS `@theme`, gradient utilities renamed, browser requirements raised. Defer migration to a dedicated refactor milestone. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `@google/generative-ai` (old SDK) | Deprecated; support permanently ends August 31, 2025. No bug fixes after that date. | `@google/genai` (unified SDK, v1.50.0+) |
| Supabase Auth for password protection | Full auth (email signup, password recovery, session management) is over-engineered for a shared internal tool. PROJECT.md explicitly defers full auth to the ERP integration. | Single shared password stored as a Supabase environment variable; verify it in an Edge Function login endpoint; store a session token in `localStorage`. Simple, auditable, easy to rotate. |
| `next/js` or any SSR framework | The existing app is a Vite React SPA. Introducing Next.js for a simple internal dashboard adds complexity (file-based routing, server components, deployment model) with no benefit at this team size. | Stay with Vite + React Router or Vite + TanStack Router |
| Hardcoded Google API credentials in frontend code | Service account private keys must NEVER be in client-side JavaScript — they would be exposed in the browser. | Store credentials in Supabase Vault secrets; access only from Edge Functions running server-side. |
| `googleapis` called from the React frontend | Exposes service account credentials in the browser; CORS will block it anyway. | All Google Calendar API calls must go through the Supabase Edge Function. |
| React Query v4 (previous major) | v4 had stale `isLoading` semantics and the `cacheTime` API (renamed `gcTime` in v5). Starting fresh, use v5. | `@tanstack/react-query@5` |
| Tailwind CSS v4 (right now) | Ground-up rewrite with CSS-first config, removed `tailwind.config.js`, gradient utility renames (`bg-gradient-to-*` → `bg-linear-to-*`), new browser requirements. 90% of migration can be automated but review is required. Not worth the risk mid-milestone. | Stay on Tailwind CSS v3.4.x until a dedicated cleanup phase. |

---

## Stack Patterns by Variant

**For the nightly sync Edge Function:**
- Use Deno TypeScript with `npm:` imports (not `node:`)
- Import `googleapis` and `google-auth-library` via `npm:` prefix with pinned versions
- Use `JWT` client from `google-auth-library` with `subject` set to each Switcher's email for domain-wide delegation impersonation
- Store service account JSON as a Supabase Vault secret; read `Deno.env.get('GOOGLE_SERVICE_ACCOUNT')` inside the function

**For the classification pipeline:**
- Run deterministic rules first (port the Python logic from `process_export.py` to TypeScript)
- Pass only unresolved rows to Gemini — this is the "hybrid" approach
- Use `@google/genai` (not `@google/generative-ai`) with the same batching strategy as `classify_with_ai.py` (80 rows per call, `temperature: 0.1`, `gemini-2.5-pro`)
- Return structured JSON; validate against `VALID_CATEGORIES` set before writing to Supabase

**For the React frontend reading from Supabase:**
- Wrap the app in `QueryClientProvider` from TanStack Query
- Use `useQuery` for all dashboard data reads (avoids the current `useEffect` + manual loading state pattern in App.jsx)
- All Supabase calls use the `anon` key (public, read-only via RLS); admin mutations use the same key but are protected by RLS policies

**For password protection:**
- Create a `POST /functions/v1/login` Edge Function that accepts `{ password }`, compares against `Deno.env.get('DASHBOARD_PASSWORD')`, and returns a signed JWT
- Store JWT in `localStorage`; check on every protected route load
- No user table, no email signup — single shared password rotatable via Supabase dashboard

**For the vercel.json SPA routing fix:**
```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/" }]
}
```

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| `react@18.2` | `recharts@2.12` | recharts v2 requires React 17+ |
| `react@18.2` | `@tanstack/react-query@5` | v5 requires React 18+ (uses `useSyncExternalStore`) |
| `react@18.2` | Do NOT upgrade to React 19 yet | React 19 dropped in 2024; nothing in this project requires it; `recharts@2` may have compatibility issues |
| `tailwindcss@3.4` | `@vitejs/plugin-react@4` | Compatible. Do not upgrade to Tailwind v4 without full migration review |
| `vite@8` | `@vitejs/plugin-react@4` | Check for `@vitejs/plugin-react@5` when upgrading Vite — plugin and core versions should stay in sync |
| `googleapis@171` | `google-auth-library@10.6.2` | Both are maintained by Google; use the same version pairing installed from npm |
| `@google/genai@1.50` | Gemini 2.5 Pro | The new unified SDK targets the same REST API as the old SDK; `gemini-2.5-pro` model string unchanged |

---

## Free Tier Capacity Check (Supabase)

This project runs well within free tier limits:

| Resource | Free Limit | Expected Usage | Headroom |
|----------|-----------|----------------|----------|
| Database storage | 500 MB | ~5 MB (4000 rows/2 months × indefinite history) | 99x margin |
| Edge Function invocations | 500K/month | ~450/month (15 calendars × nightly sync + admin calls) | 1000x margin |
| DB egress | 5 GB/month | ~100 MB/month (6 management users × dashboard loads) | 50x margin |
| pg_cron jobs | Resource-limited only | 1 nightly job | No limit hit |
| Projects | 2 active | 1 (this project) | 1 remaining for ERP |

**Critical free tier risk:** Projects pause after 7 days of inactivity. The nightly cron job itself counts as activity and will keep the project alive — but verify this behaviour after launch. If pausing occurs, the $10/month Pro upgrade is the only reliable mitigation.

---

## Sources

- `@supabase/supabase-js` current version: npm registry (2.103.0, verified 2026-04-14)
- `@google/genai` current version + deprecation notice: [google/genai npm](https://www.npmjs.com/package/@google/genai) + [deprecated-generative-ai-js GitHub](https://github.com/google-gemini/deprecated-generative-ai-js) — MEDIUM confidence (npm registry + official Google GitHub, no Context7 verification)
- `googleapis` version: npm registry (171.4.0, verified 2026-04-14)
- `google-auth-library` version: npm registry (10.6.2, verified 2026-04-14)
- `@tanstack/react-query` v5 + Supabase integration: [makerkit.dev guide](https://makerkit.dev/blog/saas/supabase-react-query) — MEDIUM confidence
- Supabase pg_cron free tier: [GitHub discussion #37405](https://github.com/orgs/supabase/discussions/37405) — MEDIUM confidence (Supabase collaborator response)
- Supabase Edge Functions + npm imports pattern: [Supabase docs — dependencies](https://supabase.com/docs/guides/functions/dependencies) — HIGH confidence (official docs)
- Supabase cron scheduling pattern: [Supabase docs — schedule functions](https://supabase.com/docs/guides/functions/schedule-functions) — HIGH confidence (official docs)
- Tailwind v4 breaking changes: [tailwindcss.com upgrade guide](https://tailwindcss.com/docs/upgrade-guide) — HIGH confidence (official docs)
- Recharts v3 migration: [recharts GitHub wiki](https://github.com/recharts/recharts/wiki/3.0-migration-guide) — HIGH confidence (official migration guide)
- DOMPurify for XSS: [DOMPurify GitHub](https://github.com/cure53/DOMPurify) — HIGH confidence (OWASP-recommended, widely adopted)
- Vercel SPA routing: [Vercel docs — Vite](https://vercel.com/docs/frameworks/frontend/vite) — HIGH confidence (official docs)
- Google Calendar service account + DWD: [Google Workspace admin docs](https://knowledge.workspace.google.com/admin/apps/control-api-access-with-domain-wide-delegation) — HIGH confidence (official docs)

---
*Stack research for: Switch Timesheet — Google Calendar → Supabase → React automation milestone*
*Researched: 2026-04-14*
