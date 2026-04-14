# Phase 2: Data Pipeline - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-14
**Phase:** 02-data-pipeline
**Areas discussed:** Schema design, Rule engine porting, LLM fallback design, Sync orchestration, Google Calendar API setup, Testing strategy, Event data model, Monitoring & observability

---

## Schema Design

| Option | Description | Selected |
|--------|-------------|----------|
| Normalized tables | Separate tables for switchers, clients, categories with foreign keys | ✓ |
| Flat/embedded | Store as plain text on event rows | |
| You decide | Claude picks | |

**User's choice:** Normalized tables
**Notes:** Cleanest approach for Phase 3 admin UI.

---

### Client Aliases

| Option | Description | Selected |
|--------|-------------|----------|
| Alias column on clients table | Text array/JSONB column storing all aliases | |
| Separate alias lookup table | Dedicated client_aliases table with (alias, client_id) rows | |
| You decide | Claude picks | ✓ |

**User's choice:** Claude's discretion
**Notes:** None

---

### RLS

| Option | Description | Selected |
|--------|-------------|----------|
| Basic RLS now | Service role full access, anon blocked | ✓ |
| Skip until Phase 3 | Leave disabled | |
| You decide | Claude picks | |

**User's choice:** Basic RLS now
**Notes:** Prevents accidental public data exposure.

---

### Seeding

| Option | Description | Selected |
|--------|-------------|----------|
| SQL migration seed | Migration file seeds from Python scripts | ✓ |
| Manual entry | Supabase dashboard | |
| You decide | Claude picks | |

**User's choice:** SQL migration seed
**Notes:** Reproducible and version-controlled.

---

## Rule Engine Porting

### Porting Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Direct translation | Line-by-line TypeScript port | ✓ |
| Data-driven rules in DB | Classification rules as config in Supabase | |
| Hybrid | Code rules + DB overrides | |

**User's choice:** Direct translation
**Notes:** Preserves known-working behavior. Rules in code for reliability.

---

### Runtime Location

| Option | Description | Selected |
|--------|-------------|----------|
| Inside Edge Function | Classification module imported by sync function | ✓ |
| Separate Edge Function | Decoupled sync and classify functions | |
| You decide | Claude picks | |

**User's choice:** Inside the Edge Function
**Notes:** Single deployment unit, simpler.

---

### Confidence Signal

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — flag borderline | Tag events as confident/borderline | ✓ |
| No — LLM reviews all | No confidence scoring | |
| You decide | Claude picks | |

**User's choice:** Yes — flag borderline matches
**Notes:** LLM audit pass focuses on borderline events + random sample.

---

### Rule Scope Expansion

| Option | Description | Selected |
|--------|-------------|----------|
| Expand rules first | Analyze 82 Misc entries, add keywords | ✓ |
| Port as-is | Let LLM fill gaps | |
| You decide | Claude picks | |

**User's choice:** Expand rules first
**Notes:** Goal ~98% rule coverage, ~2% LLM.

---

### Friday Events

| Option | Description | Selected |
|--------|-------------|----------|
| Flag but keep | Friday events tagged off_schedule, Sat/Sun filtered | ✓ |
| Classify all equally | No day-of-week distinction | |
| Filter Fri/Sat/Sun | Drop all weekend events | |

**User's choice:** Flag but keep
**Notes:** User clarified Switch works Mon-Thu with rare Friday exceptions. Sat/Sun filtered entirely.

---

## LLM Fallback Design

### Correction Handling

| Option | Description | Selected |
|--------|-------------|----------|
| Override + log | LLM overwrites and logs original/new/reasoning | ✓ |
| Flag only | Store suggestion, human approves | |
| You decide | Claude picks | |

**User's choice:** Override + log
**Notes:** classification_method changes to "llm_corrected".

---

### Gemini Model

| Option | Description | Selected |
|--------|-------------|----------|
| Gemini 2.5 Flash | Fast, cheap, good for structured tasks | ✓ |
| Gemini 2.5 Pro | Stronger reasoning, higher cost | |
| Flash + Pro split | Flash for classify, Pro for audit | |

**User's choice:** Gemini 2.5 Flash for everything
**Notes:** Within free tier for ~200 events/day.

---

### Batching Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Batched | Groups of events in single prompt | ✓ |
| One at a time | Individual API calls | |
| You decide | Claude picks | |

**User's choice:** Batched
**Notes:** User emphasized: "the LLM should be provided the necessary context it needs to make choices well and with confidence. We shouldn't just rely on its pattern recognition abilities within the data itself." Rich context (Legend, client list, rules) must be included in prompts.

---

### API Key Storage

| Option | Description | Selected |
|--------|-------------|----------|
| Edge Function secrets | Deno.env.get() | ✓ |
| Supabase table (encrypted) | DB-stored with RLS | |
| You decide | Claude picks | |

**User's choice:** Supabase Edge Function secrets
**Notes:** Standard server-side approach.

---

## Sync Orchestration

### Error Handling

| Option | Description | Selected |
|--------|-------------|----------|
| Skip + log, continue | Per-Switcher isolation | ✓ |
| Fail entire sync | All-or-nothing | |
| Retry then skip | Retry 2-3x with backoff | |

**User's choice:** Skip + log, continue others
**Notes:** One broken calendar shouldn't block everyone.

---

### Deleted Events

| Option | Description | Selected |
|--------|-------------|----------|
| Soft delete | Mark as deleted, preserve row | |
| Hard delete | Remove from Supabase | ✓ |

**User's choice:** Hard delete
**Notes:** User prefers lean database.

---

### Sync Schedule

| Option | Description | Selected |
|--------|-------------|----------|
| ~5 AM CET | Before workday starts | ✓ |
| ~midnight CET | End of day | |
| You decide | Claude picks | |

**User's choice:** Early morning ~5 AM CET
**Notes:** Data fresh when management opens dashboard.

---

### Manual Sync

| Option | Description | Selected |
|--------|-------------|----------|
| HTTP endpoint | Callable with secret key | ✓ |
| Nightly only | No manual trigger | |
| You decide | Claude picks | |

**User's choice:** Yes — HTTP endpoint
**Notes:** Phase 3 admin UI can add "Sync now" button.

---

### Future Events Window

| Option | Description | Selected |
|--------|-------------|----------|
| 2 weeks ahead | Current + 2 weeks upcoming | ✓ |
| 1 month ahead | Broader view | |
| You decide | Claude picks | |

**User's choice:** 2 weeks ahead
**Notes:** User wants an "upcoming" section in dashboard (Phase 3) showing scheduled future events, visually separate from historical data.

---

## Google Calendar API Setup

### Extra Fields

| Option | Description | Selected |
|--------|-------------|----------|
| Description/notes | Event body text | ✓ |
| Attendees list | Who else is on the event | ✓ |
| Location | Physical/virtual location | |
| Recurring event info | Recurrence pattern | ✓ |

**User's choice:** Description/notes, Attendees, Recurring event info (not Location)
**Notes:** None

---

### Title Parsing

| Option | Description | Selected |
|--------|-------------|----------|
| Parse on ingest | Split on pipe, store parsed fields | |
| Store raw | Parse during classification | |
| You decide | Claude picks | ✓ |

**User's choice:** Claude's discretion
**Notes:** None

---

## Testing Strategy

### Classification Testing

| Option | Description | Selected |
|--------|-------------|----------|
| Snapshot tests against CSV | Use existing outputs as golden datasets | |
| Unit tests per rule | Individual test cases per rule | |
| Both | Snapshots + unit tests | |

**User's choice:** Custom approach (free text)
**Notes:** User clarified: "The existing csv outputs aren't necessarily golden datasets. Many of these have issues. Human testing should be the real threshold. I imagine we'll likely have to have a phase of testing and iterating to get the output to be of the quality we need." Pipeline should generate reviewable classification reports for human review.

---

### Sync Report

| Option | Description | Selected |
|--------|-------------|----------|
| Summary + flagged items | Stats and borderline events for review | ✓ |
| Full export | Complete classified export | |
| Just audit log | No separate report | |

**User's choice:** Summary + flagged items
**Notes:** During development, exportable as CSV for manual review.

---

### Edge Function Testing

| Option | Description | Selected |
|--------|-------------|----------|
| Local Supabase CLI | Local Postgres, mocked API | ✓ |
| Live test calendar | Real API calls | |
| You decide | Claude picks | |

**User's choice:** Local Supabase CLI
**Notes:** Mock Google Calendar responses with fixture data.

---

## Event Data Model

### Recurring Events

| Option | Description | Selected |
|--------|-------------|----------|
| Store each instance | Individual rows with recurring flag | |
| Series + instances | Track series and instances | ✓ |

**User's choice:** Store the series + instances
**Notes:** Enables bulk reclassification of entire series and identification of standing meetings.

---

### Duration

| Option | Description | Selected |
|--------|-------------|----------|
| Store in minutes | Calculated field at ingest | ✓ |
| Calculate from start/end | No stored field | |

**User's choice:** Store duration_minutes
**Notes:** Dashboard heavily uses duration for time allocation charts.

---

### Temporal Status

| Option | Description | Selected |
|--------|-------------|----------|
| Temporal status field | "upcoming" vs "completed" | ✓ |
| Derive from date | Query-time comparison | |

**User's choice:** Temporal status field
**Notes:** Supports the upcoming events section in Phase 3.

---

## Monitoring & Observability

### Sync Health

| Option | Description | Selected |
|--------|-------------|----------|
| Sync log table | sync_runs table in Supabase | ✓ |
| Supabase + external alerting | Plus email/Slack alerts | |
| You decide | Claude picks | |

**User's choice:** Sync log table in Supabase
**Notes:** No external alerting needed for 15-person team.

---

### Classification Metrics

| Option | Description | Selected |
|--------|-------------|----------|
| Per-sync stats | Counts stored per sync run | ✓ |
| Point-in-time only | Derive from event queries | |
| You decide | Claude picks | |

**User's choice:** Per-sync stats
**Notes:** Enables Misc rate trend tracking and LLM correction frequency monitoring.

---

## Claude's Discretion

- Client alias storage approach (column vs table)
- Title parsing strategy (ingest-time vs classification-time)
- LLM batch size for classification calls
- Random sample percentage for LLM audit pass

## Deferred Ideas

- Upcoming events dashboard section (Phase 3)
- Classification feedback loop (v2)
- Audit trail UI (Phase 3)
- Iterative rule tuning process
