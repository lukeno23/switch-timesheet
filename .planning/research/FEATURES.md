# Feature Research

**Domain:** Internal agency timesheet analytics with calendar integration and AI classification
**Researched:** 2026-04-14
**Confidence:** HIGH

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features the management team assumes exist. Missing these = tool feels broken or untrustworthy.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Time-by-client breakdown | Core reason the tool exists — where is time going? | LOW | Already exists. Must remain after migration. |
| Time-by-person breakdown | Managers need to see individual Switcher allocation | LOW | Already exists. |
| Time-by-department breakdown | Switch is structured around 5 departments | LOW | Already exists. |
| Date range filtering | Any period — weekly, monthly, custom | LOW | Already exists. Must work correctly after Supabase migration. |
| Utilization summary cards | Total hours, billable %, client mix at a glance | LOW | Already exists as summary cards. |
| Automatic data freshness | Data reflects last night's sync without manual upload | HIGH | Core milestone goal — replaces manual CSV workflow. |
| Consistent classification | Same event classified the same way every run | MEDIUM | Deterministic rules + LLM must produce stable output. |
| Personal event filtering | Lunch, OOO, gym excluded automatically | LOW | Already exists in process_export.py. Must carry over. |
| Client name normalisation | "PP", "Palazzo Parisio", and typos all resolve to one client | MEDIUM | ~35 clients with known aliases. Already partially solved. Admin-editable. |
| Admin: manage Switcher roster | Add/remove team members, set departments | MEDIUM | New. Required — team composition changes over time. |
| Admin: manage client list | Add new clients, set aliases | MEDIUM | New. Required — agency wins new clients regularly. |
| Admin: manage task categories | Add/remove categories, configure LLM hints | MEDIUM | New. Required — categories evolve with agency services. |
| Password protection | Stop unauthenticated access to sensitive staff/client data | LOW | Simple shared password. Full auth deferred to ERP. |
| Drilldown to individual events | Click a bar → see underlying calendar events | MEDIUM | Already exists in dashboard. Must survive refactor. |

---

### Differentiators (Competitive Advantage)

Features that make this tool meaningfully better than a manual spreadsheet or a generic SaaS tracker.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Hybrid LLM + rule classification | ~82 ambiguous events currently fall to "Misc"; LLM reduces this significantly without breaking deterministic cases | HIGH | The core intelligence of the system. Rules handle ~85% of cases fast and cheaply; Gemini handles the rest. |
| Classification confidence display | Shows management which entries were auto-classified vs LLM-classified vs fell to Misc — builds trust | MEDIUM | A simple `source: rule | llm | misc` flag per row. Surfaced in drilldown, not main dashboard. |
| Nightly automated sync | Zero human action required after setup | HIGH | Google Calendar API + service account + nightly job. Replaces a manual workflow that requires remembering to run. |
| Per-Switcher department logic | Ed doing Copywriting→Marketing but Ed doing Strategy→Brand. System knows this. | HIGH | Complex business rule already implemented in Python. Must survive migration to Supabase pipeline. |
| AI narrative reports | Gemini-generated written summaries of time allocation trends | MEDIUM | Already exists (Gemini integration). Fix caching bug; otherwise keep. |
| Cross-department visibility for management members | Richard, Melissa, Ed, Lisa, Luke, Andrea see full picture; others see their own department | MEDIUM | Access scoping already conceptually modelled in existing app. Formalise in Supabase with RLS or query filters. |
| Classification history / audit trail | For any event, know when it was classified, which method, and what confidence | MEDIUM | Store `classified_at`, `classification_method`, `confidence_score` in Supabase. Surface in admin view only. |

---

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Real-time sync | "Why wait until morning?" | Google Calendar API quotas; sync jobs running mid-day produce partial data; overkill for a planning/review tool | Nightly batch at 2am. Show "Last synced: 14 Apr 02:03" in UI. |
| Per-entry manual correction UI | "The AI got this one wrong" | Creates dual source of truth between Google Calendar (authoritative) and manual overrides; permanent maintenance burden; if the classifier is good, you rarely need this | Improve classifier. If Misc rate stays above ~5%, add a bulk review workflow — not per-entry editing. |
| Individual Switcher logins | "Only my team should see my data" | Full RBAC is an ERP feature. Switch is 15 people — management already knows who does what. Password protection is sufficient at this stage. | Simple shared password now. Full auth at ERP integration. |
| Invoice generation | "We already have the hours — let's bill from here" | Invoicing logic (rates, billing periods, client terms) is genuinely complex and out of scope. Scope creep risk is high. | Export to CSV for billing workflows. Keep this as analytics-only. |
| Employee self-service (Switchers view own hours) | "Can I see my own hours?" | Doubles the audience, requires per-user auth, exposes privacy concerns about tracking | Management-only tool for now. Switchers use their own Google Calendar. |
| Predictive scheduling / forecasting | "Tell me if we're over-allocated next month" | Requires forward-looking calendar data + capacity models. Future-state problem. | Phase this in after ERP; it belongs there. |
| Mobile app | "I want to check on my phone" | PWA behaviour on Vercel is free. A native app is a separate product. | Ensure dashboard is mobile-responsive (it already largely is with Tailwind). |
| Webhooks / real-time push on classification | "Notify me when an event is classified" | No use case for a nightly batch tool. Unnecessary complexity. | "Last synced" timestamp in header is sufficient. |

---

## Feature Dependencies

```
[Supabase schema + data model]
    └──requires──> [Google Calendar API sync job]
                       └──requires──> [Service account + domain-wide delegation]
    └──requires──> [Classification pipeline (rules + LLM)]
                       └──requires──> [Admin: client list with aliases]
                       └──requires──> [Admin: task category list with LLM hints]
                       └──requires──> [Admin: Switcher roster with department rules]

[Dashboard reads from Supabase]
    └──requires──> [Supabase schema + data model]

[Admin: manage Switcher roster]
    └──requires──> [Password protection]

[Admin: manage client list]
    └──requires──> [Password protection]

[Admin: manage task categories]
    └──requires──> [Password protection]

[Classification confidence display]
    └──enhances──> [Hybrid LLM + rule classification]

[AI narrative reports]
    └──requires──> [Dashboard reads from Supabase]

[Per-Switcher department logic]
    └──requires──> [Admin: Switcher roster with department rules]

[Audit trail / classification history]
    └──requires──> [Supabase schema + data model]
    └──enhances──> [Hybrid LLM + rule classification]
```

### Dependency Notes

- **Admin features require password protection:** Without any auth gate, the admin panel (which can change classification rules and Switcher data) is publicly editable. Password protection must land before admin features are exposed.
- **Classification pipeline requires admin-managed reference data:** The hybrid classifier looks up clients, aliases, and categories from Supabase, not hardcoded config. Admin management of these tables must be in place before classification runs against live data.
- **Dashboard migration requires Supabase schema to be stable:** Refactoring App.jsx in parallel with migrating from CSV to Supabase is high-risk. Stabilise data model first, then refactor presentation layer.
- **LLM classification enhances rule classification (not replaces):** Rules run first. Only events that fail to match a rule go to the LLM. This order is non-negotiable for cost and consistency.

---

## MVP Definition

This is a subsequent milestone (not greenfield), so "MVP" here means "minimum to ship the milestone and retire the manual CSV workflow."

### Ship With (Milestone v1)

- [ ] Google Calendar API sync via service account — without this, nothing is automated
- [ ] Supabase schema: events, switchers, clients, categories, classification_runs
- [ ] Hybrid classification pipeline: rules first, LLM for ambiguous cases
- [ ] Dashboard reads from Supabase (not CSV upload)
- [ ] Admin: manage Switchers (add/remove, set primary department, flag as management member)
- [ ] Admin: manage clients (add/remove, set aliases/typos)
- [ ] Admin: manage task categories (add/remove, set LLM hint text)
- [ ] Password protection on admin routes
- [ ] Fix critical bugs: XSS on AI output, stale AI report cache
- [ ] Modular component architecture (prerequisite for safe ongoing development)

### Add After Validation (v1.x)

- [ ] Classification confidence display in drilldown — add once management asks "how confident is the system?"
- [ ] Classification audit trail in admin — add once there's evidence of misclassification patterns worth investigating
- [ ] Error boundaries on dashboard — add before exposing to wider audience
- [ ] Test coverage on parseCSV, classification logic, data aggregation — add before team grows

### Future Consideration (v2+ / ERP integration)

- [ ] Per-user authentication and role-based access — belongs to ERP integration project
- [ ] Predictive resource allocation — requires forward-looking data model
- [ ] Bulk classification review / correction workflow — only worthwhile if Misc rate stays above ~5% after LLM is tuned
- [ ] Switcher self-service view — requires auth per user

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Nightly automated sync | HIGH | HIGH | P1 |
| Supabase backend + schema | HIGH | HIGH | P1 |
| Hybrid classification pipeline | HIGH | HIGH | P1 |
| Dashboard reads from Supabase | HIGH | MEDIUM | P1 |
| Admin: manage Switchers | HIGH | MEDIUM | P1 |
| Admin: manage clients + aliases | HIGH | MEDIUM | P1 |
| Admin: manage task categories | HIGH | MEDIUM | P1 |
| Password protection | HIGH | LOW | P1 |
| Fix XSS on AI output | HIGH | LOW | P1 (security) |
| Modular component refactor | MEDIUM | HIGH | P1 (prerequisite for everything else) |
| Fix stale AI report cache | MEDIUM | LOW | P1 |
| Classification confidence display | MEDIUM | LOW | P2 |
| Classification audit trail | MEDIUM | MEDIUM | P2 |
| Error boundaries | MEDIUM | LOW | P2 |
| Test coverage | MEDIUM | MEDIUM | P2 |
| Predictive forecasting | LOW | HIGH | P3 |
| Per-user auth | LOW | HIGH | P3 |

**Priority key:**
- P1: Required for milestone completion
- P2: Ship after core is stable and validated
- P3: Future milestone / ERP project

---

## Competitor Feature Analysis

This is an internal tool, not a product — the "competitors" are the commercial platforms this replaces. The goal is to match their core read-only analytics while surpassing them on automation and agency-specific classification.

| Feature | Toggl Track | Harvest | Our Approach |
|---------|-------------|---------|--------------|
| Calendar sync | Auto-import from Google Calendar | Read-only calendar integration | Full API sync, all 15 calendars via service account — no per-user OAuth needed |
| Client management | Client list, tags | Clients with rates | Admin UI backed by Supabase; includes alias resolution for legacy names |
| Category management | Project/task tags | Task categories | Per-category LLM hint text — beyond what commercial tools offer |
| AI classification | None | None | Hybrid rules + Gemini — the primary differentiator |
| Per-person department rules | Flat user roles only | Flat user roles only | Per-Switcher department mapping (e.g. Ed's category→department overrides) |
| Analytics depth | Summary + detailed reports | Budget burn + utilisation | Existing dashboard already matches or exceeds. Focus is on automation, not new chart types. |
| Auth model | Per-user accounts | Per-user accounts | Shared password (sufficient for 6-person management team) |

---

## Sources

- [Productive.io: Best Agency Time Tracking Software 2026](https://productive.io/blog/best-agency-time-tracking-software/)
- [Toggl: 10 Best Agency Time Tracking Software 2025](https://toggl.com/blog/agency-time-tracking-software)
- [Harvest vs Toggl 2026 comparison](https://www.getharvest.com/resources/harvest-vs-toggl)
- [ClickTime audit trail module](https://support.clicktime.com/hc/en-us/articles/210709906-Audit-Trail-Module-and-Audit-Log-Report)
- [TimeCamp Google Calendar integration](https://www.timecamp.com/integrations/google-calendar-time-tracking/)
- Existing codebase: `process_export.py` (classification rules), `App.jsx` (dashboard features), `PROJECT.md` (requirements)

---
*Feature research for: Switch Timesheet — automated agency timesheet analytics*
*Researched: 2026-04-14*
