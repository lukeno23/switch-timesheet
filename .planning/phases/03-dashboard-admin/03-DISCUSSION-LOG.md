# Phase 3: Dashboard + Admin - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-15
**Phase:** 03-dashboard-admin
**Areas discussed:** Supabase read path, Admin UI shape & access, Billing feature, Dashboard migration details

---

## Supabase read path

### Q1: How should the dashboard and admin UI read data from Supabase?

| Option | Description | Selected |
|--------|-------------|----------|
| Anon + read-only RLS | Supabase anon key + password gate as security boundary; SELECT-only policies for anon; admin writes via Edge Functions with service role | ✓ |
| Edge Function API | Dashboard calls custom Edge Functions that use service role server-side | |
| Supabase Auth | Enable Supabase Auth with a single shared account | |

**User's choice:** Anon + read-only RLS.
**Notes:** Keeps the architecture flat. Password gate = security boundary.

### Q2: How should admin writes reach Supabase?

| Option | Description | Selected |
|--------|-------------|----------|
| Edge Function endpoints | Dedicated endpoints using service role; auth via shared password hash or admin secret | ✓ |
| Direct writes via anon INSERT/UPDATE RLS | Grant INSERT/UPDATE/DELETE on reference tables to anon | |
| Supabase Auth + RLS | Writes allowed only for authenticated role | |

**User's choice:** Edge Function endpoints.

### Q3: How should admin Edge Functions authenticate callers?

| Option | Description | Selected |
|--------|-------------|----------|
| Send password hash | Browser sends the verified SHA-256 password hash in `x-switch-auth` header | ✓ |
| Dedicated ADMIN_API_SECRET | Separate static secret, rotates independently | |
| Anon JWT + custom claim | Signed JWT, more crypto complexity | |

**User's choice:** Send password hash.
**Notes:** Reuses the existing Phase 1 hash — no new credentials to manage.

### Q4: What should the anon read policies cover?

| Option | Description | Selected |
|--------|-------------|----------|
| Broad read | SELECT on events, switchers, clients, client_aliases, categories, sync_runs, client_billing, audit_log | ✓ |
| Minimum viable read | SELECT only on events + reference tables | |
| Everything including audit_log | SELECT on every table | |

**User's choice:** Broad read (including audit_log).
**Notes:** Makes a v2 admin audit surface easy.

---

## Admin UI shape & access

### Q1: Where should the admin UI live in the navigation?

| Option | Description | Selected |
|--------|-------------|----------|
| New top-level nav entry | Admin tab alongside Dashboard / Switchers / Teams / Clients / Categories | ✓ |
| Nested in SettingsModal | Tabs inside the existing modal | |
| Hidden route (/admin) | Accessed via keyboard shortcut or icon | |

**User's choice:** New top-level nav entry.

### Q2: How should admin CRUD feel?

| Option | Description | Selected |
|--------|-------------|----------|
| Table + modal | Tables per entity; Add / edit modals with validation | ✓ |
| Inline editing | Edit cells directly in tables | |
| Full-page form | Dedicated page per entity record | |

**User's choice:** Table + modal.

### Q3: Who inside the password gate should see the admin section?

| Option | Description | Selected |
|--------|-------------|----------|
| Same gate, all see it | All ~6 management users see Admin | ✓ |
| Separate admin password | Second password to enter Admin | |
| Allowlist by name | Hardcoded allowlist (requires user accounts) | |

**User's choice:** Same gate, all see it.

### Q4: How should deletion of reference data work?

| Option | Description | Selected |
|--------|-------------|----------|
| Soft delete (deactivate) | `active` boolean; inactive rows skipped by sync/pickers but preserve history | ✓ |
| Hard delete with blocking | DELETE; FK violations surface as errors | |
| Hard delete + cascade | DELETE propagates to events | |

**User's choice:** Soft delete via `active` flag.

### Q5: Which fields should be editable per entity?

| Option | Description | Selected |
|--------|-------------|----------|
| Switcher: name, email, primary_dept, management flag, active | All switcher fields | ✓ |
| Client: name + add/remove aliases | Name edits + alias nested list | ✓ |
| Category: name, department, llm_hint | All category fields including LLM hint | ✓ |
| Show deactivated toggle | Per-table toggle to reactivate soft-deleted rows | ✓ |

**User's choice:** All four.

### Q6: Where should "Sync now" and "Last synced" live?

| Option | Description | Selected |
|--------|-------------|----------|
| Both in Admin + header timestamp | Button in Admin only; timestamp in header everywhere | ✓ |
| Admin only | Both inside Admin | |
| Header for both | Button also in header | |

**User's choice:** Both in Admin + header timestamp.

### Q7: How should validation/conflicts surface?

| Option | Description | Selected |
|--------|-------------|----------|
| Server-side validate + friendly errors | Edge Function validates; UI shows plain-English messages | ✓ |
| Rely on DB constraints, show raw error | Raw Postgres error bubbles to UI | |
| Client-side-only validation | Check in browser before API call | |

**User's choice:** Server-side validate + friendly errors.

---

## Billing feature

### Q1: How should monthly billing be entered?

| Option | Description | Selected |
|--------|-------------|----------|
| Both, manual-first | Manual form + CSV bulk upload | |
| Manual only (MVP) | Per-client/month form; CSV deferred | ✓ |
| CSV upload only | Whole-month bulk | |

**User's choice:** Manual only (MVP).

### Q2: What should the `client_billing` table look like?

| Option | Description | Selected |
|--------|-------------|----------|
| One row per client-month | UNIQUE(client_id, year_month); single amount per row | ✓ |
| One row per invoice | Itemized with invoice_number | |
| JSON blob per client | Single row per client, jsonb map | |

**User's choice:** One row per client-month.

### Q3: Where should hours-to-billing analytics surface?

| Option | Description | Selected |
|--------|-------------|----------|
| Extend Clients view + drilldown | New column in Clients list; monthly time series in drilldown | ✓ |
| New Billing top-level nav entry | Dedicated section | |
| Admin-only data entry | No dashboard surface | |

**User's choice:** Extend Clients view + per-client drilldown.

### Q4: What counts as over/under-serviced?

| Option | Description | Selected |
|--------|-------------|----------|
| Target rate per client, configurable | New nullable `target_hourly_rate` on clients | ✓ |
| Single agency-wide threshold | One global €/hour target | |
| No indicator, raw numbers only | Show hours, amount, rate; no delta | |

**User's choice:** Per-client configurable target rate.

### Q5: How should retainers vs project work and empty months be handled?

| Option | Description | Selected |
|--------|-------------|----------|
| Missing = 0 / unknown, one flag per row | No row = no billing; optional `billing_type` column | ✓ |
| Explicit zero vs null | Force "not billed" vs "€0 billed" entry | |
| Derive retainer from recurring entries | Auto-detect | |

**User's choice:** Missing = 0/unknown with optional `billing_type` flag.

### Q6: Edit/delete policy and audit trail?

| Option | Description | Selected |
|--------|-------------|----------|
| Edit freely + `updated_at` | Any admin can edit/delete; just track updated_at | ✓ |
| Edit freely + full audit log | `billing_audit` table with old/new values | |
| Lock after 30 days | Read-only after month + 30 days | |

**User's choice:** Edit freely with `updated_at` only.

### Q7: Currency handling?

| Option | Description | Selected |
|--------|-------------|----------|
| EUR only | Single currency, Intl format | |
| EUR + optional override currency per row | `currency` column | ✓ |

**User's choice:** EUR + USD (optional per row).
**Notes:** User clarified that USD is the only non-EUR currency actually used — some US-based clients billed in USD. Asked for live FX rates for that one extra currency.

### Q8: How should USD ↔ EUR conversion work?

| Option | Description | Selected |
|--------|-------------|----------|
| Daily ECB cached in Supabase | Pipeline fetches daily USD→EUR; `fx_rates` table | |
| Rate stored per billing entry | Captured at entry time, row remembers | ✓ |
| Admin-entered FX alongside amount | Manual rate per entry | |

**User's choice:** Rate stored per billing entry.
**Notes:** Supersedes live-FX ask — per-entry storage is how the live rate gets pinned.

### Q9: Display currency toggle in dashboard?

| Option | Description | Selected |
|--------|-------------|----------|
| EUR primary, raw in drilldown | All aggregates EUR; drilldown shows raw + FX rate | ✓ |
| User-selectable display currency | Header toggle, re-convert on display | |

**User's choice:** EUR primary, raw in drilldown.

---

## Dashboard migration details

### Q1: How should the dashboard fetch events?

| Option | Description | Selected |
|--------|-------------|----------|
| Upfront load, filter client-side | One query on login; in-memory filtering | ✓ |
| Fetch by date range | Query on each filter change | |
| Realtime subscription | Live updates | |

**User's choice:** Upfront load.

### Q2: Default load window?

| Option | Description | Selected |
|--------|-------------|----------|
| Last 90 days + upcoming | ~6k rows | |
| Last 365 days + upcoming | ~24k rows | |
| Full history from Feb 1 always | Everything, simplest | |

**User's choice:** Free-text — "All data synced from January 4th 2026. Historical data is important for comparisons."
**Notes:** User explicitly wants full historical visibility. Derived decision: D-19 (full history from Jan 4 forward) + D-20 (Phase 3 triggers a one-off sync extending backfill to Jan 4).

### Q3: Fate of `src/features/upload/UploadView.jsx`?

| Option | Description | Selected |
|--------|-------------|----------|
| Delete entirely | Success criterion says CSV UI is gone | ✓ |
| Keep as hidden dev route | Safety net | |
| Repurpose for historical CSV backfill | Admin-only import | |

**User's choice:** Delete entirely.

### Q4: How should DASH-04 be fixed?

| Option | Description | Selected |
|--------|-------------|----------|
| Keyed cache with invalidation | `{key, report}`; key derived from filters | ✓ |
| Clear on filter change | `useEffect` resets `aiReport` | |
| No cache at all | Always re-fetch | |

**User's choice:** Keyed cache with invalidation.

### Q5: "Upcoming events" surface?

| Option | Description | Selected |
|--------|-------------|----------|
| Lightweight section now | Collapsible dashboard section | ✓ |
| Separate "Upcoming" nav entry | Dedicated view | |
| Defer to later phase | Skip | |

**User's choice:** Lightweight section now.

### Q6: Upcoming-events presentation?

| Option | Description | Selected |
|--------|-------------|----------|
| By day, grouped by switcher | Capacity-oriented | |
| By client, grouped by day | Servicing-oriented | |
| Simple chronological list | Flat list | |

**User's choice:** Free-text — "switcher, client, and department views for the upcoming work — they are all relevant."
**Notes:** All three entity perspectives are required. D-23 in CONTEXT.md captures this.

### Q7: Last-synced timestamp format?

| Option | Description | Selected |
|--------|-------------|----------|
| Relative + absolute on hover | Friendly headline, precise tooltip | ✓ |
| Absolute only | Precise only | |
| Relative only | Friendly only | |

**User's choice:** Relative + absolute on hover.

### Q8: Sync-now feedback UX?

| Option | Description | Selected |
|--------|-------------|----------|
| Poll sync_runs until done | Progress + completion toast | ✓ |
| Fire and forget | Trigger + refresh-later message | |
| Server-sent events / websocket | Live streaming | |

**User's choice:** Poll sync_runs until done.

### Q9: Partial sync failure surface?

| Option | Description | Selected |
|--------|-------------|----------|
| Header warning chip + details in Admin | Amber chip next to Last-synced | ✓ |
| Admin-only | Invisible from dashboard | |
| Dismissable banner | Full-width | |

**User's choice:** Header warning chip + details in Admin.

---

## Claude's Discretion

- Ordering of Admin sub-sections
- Month picker UX in billing entry (native vs custom)
- Skeleton vs spinner loading states
- Hydration join pattern (Postgres embed vs client-side join)
- Empty-state copy when the DB has no events yet

## Deferred Ideas

- Bulk CSV upload for billing (v2)
- Immutable billing audit log (v2)
- Per-user accounts / per-user audit (waiting on ERP integration)
- LLM classification audit trail UI (Phase 2 deferred list)
- Classification feedback loop CLAS-07/08/09 (Phase 2 deferred list)
- Live FX API (rejected in favor of stored-per-entry rate)
- Admin-from-raw-event flow (one-click "add this as a client")
- EUR/USD display toggle in header (rejected in favor of EUR primary + raw in drilldown)
