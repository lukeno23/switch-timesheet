# Phase 2: Data Pipeline - Research

**Researched:** 2026-04-14
**Domain:** Supabase Edge Functions / Google Calendar API / Gemini classification pipeline / pg_cron
**Confidence:** HIGH (core stack verified against official docs and npm registry)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Supabase Schema**
- D-01: Normalized tables — switchers, clients (with aliases), categories, events referencing via foreign keys
- D-02: Client alias storage approach is Claude's discretion
- D-03: Basic RLS from the start — service role for Edge Functions, anon role blocked
- D-04: SQL migration seed file for all reference data (15 switchers, ~35 clients with aliases, ~35 categories)

**Three-Stage Classification Pipeline**
- D-05: Stage 1 — Rule engine (direct TypeScript port of process_export.py + instructions.md), runs inside Edge Function as imported module
- D-06: Stage 2 — LLM fallback (Gemini 2.5 Flash), events sent in batches with full Legend context, client list, Switcher department mappings
- D-07: Stage 3 — LLM audit pass (Gemini 2.5 Flash), reviews borderline + random sample of confident rule classifications; overrides logged to audit_log with original/new/reasoning
- D-08: Rule engine emits "confident" or "borderline" confidence signal; audit pass focuses on borderline events
- D-09: Expand rule engine coverage first (targeting ~98% rule coverage) before relying on LLM
- D-10: LLM output validated against canonical client/category lists before DB write; invalid results rejected and flagged

**Work Week & Filtering**
- D-11: Mon–Thu work week; Friday events classified normally with off_schedule: true; Saturday/Sunday filtered entirely
- D-12: Personal, all-day, zero-duration events filtered (port personal filter from process_export.py)

**Sync Orchestration**
- D-13: Nightly at ~5 AM CET via pg_cron trigger on Edge Function
- D-14: Sync window 7 days back + 2 weeks forward
- D-15: First sync backfills from February 1, 2026; subsequent syncs use rolling window
- D-16: Per-Switcher error isolation — failures logged, remaining Switchers continue
- D-17: Hard delete for events removed from calendar within the re-sync window
- D-18: Manual sync HTTP endpoint with secret key authentication
- D-19: "Last synced" timestamp updated per successful sync

**Google Calendar API**
- D-20: Fields extracted: title, start/end time, description/notes, attendees list, recurring event info; location NOT extracted
- D-21: Title parsing strategy (pipe-delimited) is Claude's discretion

**Event Data Model**
- D-22: Recurring events stored as series + instances
- D-23: duration_minutes calculated field at ingest
- D-24: temporal_status field ("upcoming"/"completed") based on event date vs now; updated on each sync

**Testing & Quality**
- D-25: Vitest for rule engine unit tests; existing CSV data as reference only (not golden dataset)
- D-26: Classification summary report per sync: events processed, rule/llm/misc/corrected counts, flagged borderline items
- D-27: Edge Function tested locally using Supabase CLI against local Postgres; Google Calendar API mocked with fixture data

**Monitoring & Observability**
- D-28: sync_runs table: timestamp, events processed, events per Switcher, rule/LLM/misc/corrected/borderline counts, errors, duration
- D-29: Per-sync classification metrics tracked over time

**API Key Management**
- D-30: Gemini API key and Google service account JSON stored as Supabase Edge Function secrets (Deno.env.get); never client-exposed

### Claude's Discretion
- Client alias storage: separate alias table vs alias column on clients table
- Title parsing strategy: ingest-time vs classification-time
- Batch size for LLM classification calls
- Random sample percentage for LLM audit pass on confident rule classifications

### Deferred Ideas (OUT OF SCOPE)
- Upcoming events dashboard section (Phase 3)
- Classification feedback loop v2 (CLAS-07/08/09)
- Audit trail UI (Phase 3)
- Iterative rule tuning process (Phase 3 admin or separate)
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PIPE-01 | Sync all 15 Switcher calendars nightly via Google Calendar API with service account + domain-wide delegation | Google Calendar API JWT impersonation pattern documented; Deno-compatible REST approach identified |
| PIPE-02 | Sync covers a rolling 7-day window to catch late-added or edited events | Google Calendar events.list timeMin/timeMax parameters confirmed; D-14 extends to +2 weeks forward |
| PIPE-03 | Events stored in Supabase with upsert on (switcher_id, google_event_id) | Supabase upsert with onConflict composite columns confirmed; raw SQL recommended for reliability |
| PIPE-04 | Personal, all-day, zero-duration events filtered automatically | Personal filter logic fully documented in process_export.py + classify_with_ai.py (expanded list); port to TypeScript |
| PIPE-05 | Sync job runs via pg_cron trigger on Supabase Edge Function | pg_cron + pg_net + Supabase Vault pattern confirmed in official docs; exact SQL pattern documented below |
| PIPE-06 | Dashboard shows "Last synced" timestamp | sync_runs table write (D-28); frontend reads latest row timestamp |
| CLAS-01 | Deterministic rule engine (TypeScript port of process_export.py) classifies ~98% of events | Full rule engine in process_export.py + instructions.md; 17-priority classification sequence documented; 65 Misc entries identified in reference dataset |
| CLAS-02 | Gemini LLM fallback classifies unresolved events, targeting <2% Misc rate | Gemini 2.5 Flash confirmed; structured output (responseSchema + enum) eliminates JSON parse errors; batch of 80 events matches existing classify_with_ai.py approach |
| CLAS-03 | LLM output validated against canonical client/category lists before DB write | Post-classification validation step: compare against known client/category sets; reject + flag invalid values |
| CLAS-04 | Client name aliases and typos resolved automatically (~35 known clients with aliases) | Full alias table in instructions.md (17 documented aliases + non-client corrections); stored in DB or constants |
| CLAS-05 | Per-Switcher department assignment logic preserved | process_export.py get_department() contains full 15-Switcher logic with special cases for Ed, Lisa, Designers; direct TypeScript port |
| CLAS-06 | Each classified event records its classification_method (rule/llm/misc) | classification_method column on events table; D-07 adds "llm_corrected" value; audit_log table for corrections |
</phase_requirements>

---

## Summary

Phase 2 builds a fully automated nightly pipeline: Google Calendar events for 15 Switchers are fetched via service account impersonation, classified via a three-stage rule+LLM engine, and stored in a normalized Supabase schema. The pipeline runs on pg_cron at 5 AM CET and produces a classification summary report for human review.

The core technical challenge is implementing the Google Calendar API service account impersonation inside a Deno Edge Function without Node.js-specific auth libraries. The recommended approach is a **manual JWT construction** using the Deno Web Crypto API (`crypto.subtle.sign` with RSA-SHA256), followed by token exchange at `https://oauth2.googleapis.com/token`. This avoids the `google-auth-library` npm compatibility issues known to affect Supabase Edge Functions on older Deno versions.

The classification engine is a direct TypeScript port of the 500-line Python `process_export.py` plus the extended rules from `instructions.md`. The LLM fallback uses Gemini 2.5 Flash with a structured JSON schema (`responseSchema` with `enum` fields), which eliminates the JSON parse-and-retry loop in `classify_with_ai.py`. The free tier limits (10 RPM, 250 RPD for Gemini 2.5 Flash) are sufficient for the ~200 events/day nightly batch.

**Primary recommendation:** Implement Google Calendar auth as a pure Deno JWT utility (no npm auth library), use Gemini structured output with `responseSchema` to enforce canonical category/client values in the API response itself, and use raw SQL (not the supabase-js SDK) for upsert on composite keys.

---

## Standard Stack

### Core

| Library / Service | Version | Purpose | Why Standard |
|---|---|---|---|
| Supabase Edge Functions (Deno) | Deno 2.x runtime | Pipeline orchestration, API server | Native to Supabase; Deno 2.x resolves google-auth-library compat issues |
| @supabase/supabase-js | 2.103.0 [VERIFIED: npm registry 2026-04-09] | Supabase client for DB operations inside Edge Function | Official client; service role bypasses RLS |
| Google Calendar API v3 | REST (no SDK) | Fetch calendar events for all 15 Switchers | Direct REST avoids Deno npm compat issues with googleapis SDK |
| Gemini 2.5 Flash API | REST (generativelanguage.googleapis.com) | LLM fallback + audit classification | Already in use; free tier covers 250 RPD / 10 RPM |
| pg_cron + pg_net | Supabase built-in extensions | Nightly HTTP trigger to Edge Function | Official Supabase scheduling pattern; no external scheduler needed |
| Supabase Vault | Built-in | Secure storage of anon key for cron HTTP call | Prevents hardcoding auth tokens in SQL |

### Supporting

| Library | Version | Purpose | When to Use |
|---|---|---|---|
| vitest | 4.1.4 [VERIFIED: npm] | Rule engine unit tests | Already configured in vite.config.js; src-side tests only |
| Deno.test | Built-in Deno | Edge Function integration tests | For supabase/functions/tests/; uses deno test runner |
| Deno Web Crypto API | Built-in | RSA-SHA256 JWT signing for Google auth | Replaces google-auth-library; zero dependencies |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|---|---|---|
| Manual JWT (Deno crypto.subtle) | google-auth-library npm | npm auth library has known Deno compatibility issues (gcp-metadata dependency); manual JWT is ~60 lines but fully reliable |
| Gemini REST API directly | @google/generative-ai npm SDK | SDK adds dependency complexity; REST pattern already used in existing App.jsx; identical API surface |
| Raw SQL upsert | supabase-js .upsert() | supabase-js has reported issues with composite primary key ON CONFLICT resolution; raw SQL is reliable and explicit |

### Installation

```bash
# Supabase CLI (macOS)
brew install supabase/tap/supabase

# Deno (for local Edge Function testing)
curl -fsSL https://deno.land/install.sh | sh

# No additional npm packages needed for the pipeline itself
# vitest already installed; @supabase/supabase-js added in Edge Function deno.json
```

**Note:** Supabase CLI is NOT currently installed [VERIFIED: `supabase --version` returned "not installed"]. It must be installed before Edge Function development begins.

---

## Architecture Patterns

### Recommended Project Structure

```
supabase/
├── functions/
│   ├── _shared/
│   │   ├── supabaseClient.ts       # Service-role Supabase client
│   │   ├── googleAuth.ts           # JWT signing + token exchange (Deno crypto)
│   │   ├── calendarFetcher.ts      # Google Calendar REST calls per Switcher
│   │   ├── eventFilter.ts          # Personal/all-day/zero-duration filter
│   │   ├── titleParser.ts          # Pipe-delimited title parsing
│   │   ├── ruleEngine.ts           # TypeScript port of process_export.py
│   │   ├── aliasResolver.ts        # Client alias + non-client name correction
│   │   ├── llmClassifier.ts        # Gemini 2.5 Flash batch fallback
│   │   ├── llmAuditPass.ts         # Gemini 2.5 Flash audit of rule output
│   │   ├── outputValidator.ts      # Validate LLM output against canonical lists
│   │   └── types.ts                # Shared TypeScript types
│   ├── sync/
│   │   ├── index.ts                # Main sync orchestrator
│   │   └── deno.json               # Imports for this function
│   └── tests/
│       ├── ruleEngine-test.ts      # Deno.test for classification logic
│       ├── eventFilter-test.ts     # Deno.test for filter logic
│       └── fixtures/
│           ├── calendarEvents.json # Mock Google Calendar API responses
│           └── sampleEvents.ts     # Known events with expected classifications

src/
├── features/
│   ├── dashboard/                  # (Phase 1 — reads CSV; Phase 3 — reads Supabase)
│   └── ...
├── shared/
│   └── utils/
│       └── __tests__/
│           └── classifier.test.js  # Vitest for rule engine logic (browser-side port if needed)
└── ...

supabase/
├── migrations/
│   ├── 0001_schema.sql             # Tables: switchers, clients, client_aliases, categories, events, sync_runs, audit_log
│   └── 0002_seed.sql               # Initial reference data (15 switchers, ~35 clients, aliases, categories)
└── config.toml                     # Local Supabase config
```

### Pattern 1: Google Calendar Service Account JWT (Deno)

**What:** Manually construct a signed JWT using Deno's Web Crypto API, exchange it for an OAuth2 access token, use the token to fetch calendar events on behalf of each Switcher via domain-wide delegation.

**When to use:** Any time the Edge Function needs to read a Switcher's Google Calendar.

**Key insight:** Deno's `crypto.subtle.importKey` and `crypto.subtle.sign` support RSA-SHA256 natively. The service account private key (PEM) must be converted from PKCS#8 PEM format to ArrayBuffer before importing.

```typescript
// Source: Google OAuth2 service account docs (developers.google.com/identity/protocols/oauth2/service-account)
// Pattern verified against Deno Web Crypto API

async function getGoogleAccessToken(serviceAccountJson: string, userEmail: string): Promise<string> {
  const sa = JSON.parse(serviceAccountJson);
  const now = Math.floor(Date.now() / 1000);
  
  const header = btoa(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = btoa(JSON.stringify({
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/calendar.readonly",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
    sub: userEmail,  // domain-wide delegation: impersonate this user
  }));
  
  const signingInput = `${header}.${payload}`;
  
  // Import RSA private key (PKCS#8 PEM → CryptoKey)
  const pemBody = sa.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\n/g, "");
  const keyData = Uint8Array.from(atob(pemBody), c => c.charCodeAt(0));
  
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    keyData.buffer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );
  
  const signatureBuffer = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    new TextEncoder().encode(signingInput)
  );
  
  const signature = btoa(String.fromCharCode(...new Uint8Array(signatureBuffer)));
  const jwt = `${signingInput}.${signature}`;
  
  // Exchange JWT for access token
  const tokenResp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  
  const { access_token } = await tokenResp.json();
  return access_token;
}
```

[VERIFIED: JWT claim fields from developers.google.com/identity/protocols/oauth2/service-account]

### Pattern 2: Google Calendar Events Fetch with Pagination

**What:** Fetch calendar events for one Switcher using their email as calendarId, with timeMin/timeMax filter and pagination support.

**When to use:** Inside the per-Switcher fetch loop in `calendarFetcher.ts`.

```typescript
// Source: [CITED: developers.google.com/calendar/api/v3/reference/events/list]
async function fetchCalendarEvents(
  accessToken: string,
  calendarId: string,  // = switcher email address
  timeMin: string,     // RFC3339 e.g. "2026-04-07T00:00:00Z"
  timeMax: string      // RFC3339 e.g. "2026-04-28T23:59:59Z"
): Promise<CalendarEvent[]> {
  const events: CalendarEvent[] = [];
  let pageToken: string | undefined;
  
  do {
    const params = new URLSearchParams({
      timeMin,
      timeMax,
      singleEvents: "true",  // expand recurring events into instances
      maxResults: "250",
      fields: "items(id,summary,description,start,end,attendees,recurringEventId,recurrence),nextPageToken",
    });
    if (pageToken) params.set("pageToken", pageToken);
    
    const resp = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    
    const data = await resp.json();
    events.push(...(data.items ?? []));
    pageToken = data.nextPageToken;
  } while (pageToken);
  
  return events;
}
```

[VERIFIED: singleEvents parameter, pagination pattern from developers.google.com/calendar/api/v3/reference/events/list]

### Pattern 3: pg_cron Nightly Schedule

**What:** Schedule the Edge Function to run nightly at 5 AM CET (= 4 AM UTC in CET, 3 AM UTC in CEST summer). 5 AM CET = 04:00 UTC.

**When to use:** One-time setup SQL run after schema migration.

```sql
-- Source: [CITED: supabase.com/docs/guides/functions/schedule-functions]
-- Store credentials securely in Vault (one-time setup)
select vault.create_secret('https://YOUR-PROJECT.supabase.co', 'project_url');
select vault.create_secret('YOUR_SERVICE_ROLE_KEY', 'service_role_key');

-- Schedule nightly sync at 4 AM UTC (= 5 AM CET / 6 AM CEST — verify seasonally)
select cron.schedule(
  'nightly-calendar-sync',
  '0 4 * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url')
           || '/functions/v1/sync',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
    ),
    body := '{"trigger": "cron"}'::jsonb
  );
  $$
);
```

[CITED: supabase.com/docs/guides/functions/schedule-functions]

### Pattern 4: Gemini Structured Output for Classification

**What:** Use `responseMimeType: "application/json"` + `responseSchema` to force Gemini to return valid JSON matching the expected classification schema. Eliminates the manual JSON parsing + retry loop from `classify_with_ai.py`.

**When to use:** Both LLM fallback (Stage 2) and LLM audit pass (Stage 3).

```typescript
// Source: [CITED: ai.google.dev/gemini-api/docs/structured-output]
const classificationSchema = {
  type: "array",
  items: {
    type: "object",
    properties: {
      row: { type: "integer" },
      client: { type: "string" },
      category: {
        type: "string",
        enum: VALID_CATEGORIES,  // canonical list from DB/constants
      },
      department: {
        type: "string",
        enum: ["Marketing", "Design", "Brand", "PM", "Management"],
      },
    },
    required: ["row", "client", "category", "department"],
  },
};

const resp = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ parts: [{ text: userMessage }] }],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: "application/json",
        responseSchema: classificationSchema,
      },
    }),
  }
);
```

[CITED: ai.google.dev/gemini-api/docs/structured-output]

**Important caveat:** `responseSchema` with `enum` enforces syntactic validity. Semantic validation (is the client canonical? is the category appropriate for the Switcher?) must still happen in `outputValidator.ts`. [VERIFIED: official Gemini docs state "structured output guarantees syntactically correct JSON but not semantic correctness"]

### Pattern 5: Supabase Upsert (Composite Key — Use Raw SQL)

**What:** Upsert events on composite key (switcher_id, google_event_id) using raw SQL via `supabaseAdmin.rpc` or a Postgres function. The supabase-js `.upsert()` has known issues with composite primary key conflict detection.

**When to use:** Writing classified events to the events table.

```typescript
// Source: [ASSUMED] — pattern based on known supabase-js composite key limitations
// Use raw SQL via a Postgres function or direct query

const { error } = await supabase.rpc('upsert_event', {
  p_switcher_id: event.switcherId,
  p_google_event_id: event.googleEventId,
  p_title: event.title,
  // ... other fields
});

// Alternative: use the Postgres function approach
// CREATE OR REPLACE FUNCTION upsert_event(...) AS $$
// INSERT INTO events (...) VALUES (...)
// ON CONFLICT (switcher_id, google_event_id) DO UPDATE SET ...
// $$ LANGUAGE sql;
```

### Pattern 6: Edge Function Secrets Access

**What:** Read Google service account JSON and Gemini API key from Edge Function environment variables.

```typescript
// Source: [CITED: supabase.com/docs/guides/functions/secrets]
const serviceAccountJson = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON");
const geminiApiKey = Deno.env.get("GEMINI_API_KEY");

// Stored via CLI:
// supabase secrets set GOOGLE_SERVICE_ACCOUNT_JSON="$(cat service-account.json | tr -d '\n')"
// supabase secrets set GEMINI_API_KEY=your-key-here
```

**Multi-line JSON secret:** Store service account JSON as a single-line minified JSON string. The Supabase CLI accepts multi-line values via `--env-file` but the value must be on a single line in the .env file.

### Anti-Patterns to Avoid

- **Using google-auth-library npm package:** Known to break with Deno Edge Functions when gcp-metadata is >= 6.1.1. [VERIFIED: GitHub discussion #33244]. Use manual JWT signing instead.
- **Using supabase-js `.upsert()` with composite keys:** Reports of 42P10 errors in production. [VERIFIED: GitHub discussions #36532]. Use raw SQL or Postgres functions.
- **Parsing LLM JSON output manually:** The `classify_with_ai.py` try/except JSON parse loop is unnecessary with structured output. `responseMimeType: "application/json"` + `responseSchema` guarantees valid JSON.
- **Storing full service account JSON multi-line in .env:** Must be minified to single line before storage in Supabase secrets.
- **Using `singleEvents: false`:** Returns recurring event parent records without instances. Use `singleEvents: true` to get individual instances (the actual calendar entries), then track `recurringEventId` field for series grouping (D-22).
- **Skipping pagination:** Google Calendar API defaults to 250 results per page with max 2500. The 3-week window for 15 Switchers could generate 300+ events — always follow `nextPageToken`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---|---|---|---|
| Cron scheduling | Custom scheduler service | pg_cron built into Supabase | Free, zero maintenance, runs in same Postgres instance |
| OAuth2 JWT exchange | Custom crypto library | Deno Web Crypto API (`crypto.subtle`) | Built into Deno runtime; no dependencies needed |
| JSON schema validation of LLM output | Custom JSON validator | Gemini `responseSchema` + `enum` | Forces model to return valid structured output; eliminates error loops |
| Category/client validation post-LLM | Fuzzy string matching | Exact set membership check against canonical lists | LLM enums are exact strings; fuzzy matching introduces false positives |
| Client alias lookup | Full-text search | Simple lookup map (constant or DB table) | Alias list is static (~17 entries); a Map is faster and simpler |
| Department assignment | Per-event LLM call | Deterministic TypeScript function (port of `get_department()`) | Rules are fully specified; LLM adds cost/latency with no accuracy gain |

**Key insight:** The classification problem is primarily a rule-matching problem with a small LLM fallback. The Python reference scripts have already solved it — the task is faithful TypeScript translation, not redesign.

---

## Runtime State Inventory

> SKIPPED — This is a greenfield phase. No existing runtime state to inventory.

---

## Environment Availability Audit

| Dependency | Required By | Available | Version | Fallback |
|---|---|---|---|---|
| Node.js | Project build tooling | ✓ | v24.13.0 [VERIFIED] | — |
| npm | Package management | ✓ | (with Node.js) | — |
| Supabase CLI | Local Edge Function dev, secrets push, migrations | ✗ | — | Manual dashboard management (viable but slower) |
| Deno | Edge Function local testing | ✗ | — | Use `supabase functions serve` (CLI includes runtime) |
| Google service account credentials | PIPE-01 | ✗ (not yet created) | — | BLOCKER: Luke (admin) must create and configure in Google Workspace |
| Supabase project (separate from ERP) | All PIPE requirements | ✗ (not yet created) | — | BLOCKER: Must be created before any schema work |
| Gemini API key | CLAS-01, CLAS-02 | Unknown | — | Key likely exists (used in dashboard); confirm it works with Edge Function secrets |
| vitest | CLAS-01 unit tests | ✓ | 4.1.4 [VERIFIED] | — |

**Missing with no fallback (BLOCKERS):**
- Google service account with domain-wide delegation — requires Luke (Google Workspace admin) to set up. Cannot be automated; must precede calendar fetch implementation.
- Supabase project creation — required before schema migrations can run.

**Missing with fallback:**
- Supabase CLI — can use Supabase dashboard for manual secret management and SQL editor for migrations. CLI strongly preferred for automation and reproducibility.
- Deno — `supabase functions serve` (bundled in CLI) handles local testing without separate Deno install. Separate Deno install improves IDE experience (LSP, autocomplete).

---

## Common Pitfalls

### Pitfall 1: google-auth-library Deno Compatibility
**What goes wrong:** Importing `google-auth-library` npm package causes Edge Function crashes; `gcp-metadata >= 6.1.1` introduces a `google-logging-utils` dependency that breaks in Deno.
**Why it happens:** Deno's npm compatibility layer has edge cases with packages that use Node.js-specific networking features.
**How to avoid:** Use manual JWT signing with `crypto.subtle` (Deno built-in). ~60 lines of code, no dependencies.
**Warning signs:** `Error: Cannot find module 'google-logging-utils'` in Edge Function logs.
[VERIFIED: github.com/orgs/supabase/discussions/33244]

### Pitfall 2: supabase-js Composite Key Upsert Failure
**What goes wrong:** `.upsert()` with `onConflict: 'switcher_id, google_event_id'` returns error code 42P10 ("no unique or exclusion constraint matching the ON CONFLICT specification").
**Why it happens:** supabase-js passes the conflict columns in a way that PostgREST cannot always resolve against composite constraints.
**How to avoid:** Use a Postgres function (`upsert_event(...)`) with raw `INSERT ... ON CONFLICT DO UPDATE` SQL. Call via `supabase.rpc('upsert_event', {...})`.
**Warning signs:** 42P10 error on upsert calls, or events being duplicated instead of updated.
[VERIFIED: github.com/orgs/supabase/discussions/36532]

### Pitfall 3: Edge Function Timeout (150s on Free Tier)
**What goes wrong:** Historical backfill (Feb 1 to present = ~3 months, ~4000 events) exceeds the 150-second wall-clock timeout on the Supabase free tier.
**Why it happens:** LLM classification batch calls are the bottleneck. At 80 events/batch and ~5s/batch for Gemini, 50 batches = 250s — well above the 150s limit.
**How to avoid:** Backfill is batched into multiple sync calls (D-15). Each call covers a date range that fits within 150s. The manual sync HTTP endpoint (D-18) enables multiple sequential calls.
**Warning signs:** `Error: wall clock time limit reached` in Edge Function logs.
[CITED: supabase.com/docs/guides/functions/limits — Free tier: 150s wall clock, 2s CPU]

### Pitfall 4: Gemini Free Tier Rate Limits During Backfill
**What goes wrong:** Historical backfill sends too many Gemini API calls too quickly. Free tier is 10 RPM / 250 RPD for Gemini 2.5 Flash.
**Why it happens:** 4000 events / 80 per batch = 50 batches. At 10 RPM, that's 5 minutes minimum. The 250 RPD limit is the real constraint — the entire backfill fits in 250 requests, but must be spread across days if classification is needed.
**How to avoid:** Rule engine handles ~98% of events — LLM fallback sees only ~80 Misc events from the full dataset. That's ~1 batch. Rate limits are not a practical concern for normal operation.
**Warning signs:** HTTP 429 responses from the Gemini API.
[ASSUMED: 250 RPD figure from secondary source (aifreeapi.com); verify at aistudio.google.com/rate-limit before backfill]

### Pitfall 5: singleEvents vs Recurring Event Data Model
**What goes wrong:** `singleEvents: true` expands recurring events into individual instances. The parent recurring event object is NOT returned. `singleEvents: false` returns parent recurring events without individual instances.
**Why it happens:** D-22 requires both series tracking AND individual instances. The decision was "singleEvents: true" for fetching (to get instance start/end times), with `recurringEventId` field on each instance linking back to the series.
**How to avoid:** Always use `singleEvents: true`. Each returned event has a `recurringEventId` if it's an instance of a recurring series. Group by `recurringEventId` to identify series. For series-level metadata (recurrence rule), fetch the parent with a separate `events.get(recurringEventId)` call if needed.
**Warning signs:** Missing individual event instances, or unexpected duplication of events.
[CITED: developers.google.com/workspace/calendar/api/guides/recurringevents]

### Pitfall 6: Time Zone Handling (CET vs UTC vs Google Calendar)
**What goes wrong:** Google Calendar API returns event times in the timezone specified by the calendar, or UTC if not set. Comparisons against `now()` for `temporal_status` fail if timezone offsets are ignored.
**Why it happens:** Malta (Switch) is in CET (UTC+1) / CEST (UTC+2 in summer). Events created locally appear in CET. Postgres `now()` returns UTC.
**How to avoid:** Store all timestamps in Postgres as `TIMESTAMPTZ` (with timezone). Parse Google Calendar `start.dateTime` with explicit timezone offset. The pg_cron schedule `0 4 * * *` runs at 04:00 UTC = 05:00 CET — adjust seasonally for CEST.
**Warning signs:** Events classified as "upcoming" when they are past, or vice versa.
[ASSUMED: CET/CEST timezone handling — verify Malta timezone transitions for pg_cron scheduling]

### Pitfall 7: Personal Event Keyword Divergence Between Python Scripts
**What goes wrong:** `process_export.py` and `classify_with_ai.py` have different personal event keyword lists. The TypeScript port uses the wrong (shorter) list.
**Why it happens:** `classify_with_ai.py` has an expanded list including `hospital`, `surgery`, `gynae`, `ultrasound`, `pick up pips`, `stay with kids`, `slow vinyasa`, `had to lie down`, `hygiene walk`, `luncch`, `malta marathon`, `p&p flea` — not present in the original `process_export.py`.
**How to avoid:** Use the **`classify_with_ai.py` personal filter** as the TypeScript source of truth (it's the more recent and more complete version). Both `PERSONAL_EXACT` and `PERSONAL_CONTAINS` lists must be ported.
**Warning signs:** Personal calendar entries appearing in the timesheet data.
[VERIFIED: Direct comparison of both Python files]

### Pitfall 8: Title Parsing Edge Cases
**What goes wrong:** Events without a pipe separator have the entire title treated as task details with empty client name. Edge cases in instructions.md must be handled.
**Why it happens:** The pipe-delimiter convention is informal — some Switchers don't follow it, some events use multiple pipes, and some non-client names appear in the client field (Marketing, PM, Design, HR, Admin, BD, TBC, SAFETY TIME).
**How to avoid:** Title parsing must implement the full set of post-parse corrections from instructions.md: non-client name detection, empty client name resolution rules, and the client-in-title pattern (e.g., "instasmile" in title with no client → client = "Instasmile").
**Warning signs:** Events with `client_name` = "Marketing", "PM", "Design", "HR", "Admin", "BD", "TBC".
[VERIFIED: instructions.md "Non-Client Names That Appear in the Client Field" section]

---

## Code Examples

### Rule Engine: Classification Priority Order (TypeScript)

The TypeScript port follows this exact 17-priority sequence from `instructions.md`. The Python implementation in `process_export.py` is the executable reference — the instructions.md is the authoritative documentation.

```typescript
// Source: process_export.py classify_category() + instructions.md Priority 1-17
// VERIFIED: Direct reading of both source files

function classifyCategory(taskDetails: string, client: string): { category: string; confidence: "confident" | "borderline" } {
  const td = taskDetails.toLowerCase().trim();
  const cl = client.toLowerCase().strip();
  
  // Priority 1: Management-department categories
  if (ACCOUNTS_KEYWORDS.some(kw => td.includes(kw))) return { category: "Accounts", confidence: "confident" };
  if (OPERATIONS_KEYWORDS.some(kw => td.includes(kw))) return { category: "Operations", confidence: "confident" };
  if (BD_NAMED_MEETINGS.some(nm => td.includes(nm))) return { category: "Business Development", confidence: "confident" };
  if (PROSPECT_KEYWORDS.some(kw => td.includes(kw))) return { category: "Business Development", confidence: "confident" };
  if (HR_KEYWORDS.some(kw => td.includes(kw))) return { category: "HR", confidence: "confident" };
  
  // Priority 2: Brand Writing
  if (BRAND_WRITING_KEYWORDS.some(kw => td.includes(kw))) return { category: "Brand Writing", confidence: "confident" };
  
  // Priority 3: Meetings (Non-Client / Internal Client / External Client)
  // ... (full implementation in ruleEngine.ts)
  
  // Fallback
  return { category: "Misc", confidence: "borderline" };
}
```

### Rule Engine: Department Assignment (TypeScript)

```typescript
// Source: process_export.py get_department() — VERIFIED direct reading
// Special cases for Ed, Lisa, Designers must be preserved exactly

function getDepartment(taskCategory: string, taskDetails: string, switcher: string): string {
  const td = taskDetails.toLowerCase().trim();
  const primaryDept = PRIMARY_DEPT[switcher] ?? "Cross-Department";
  
  // Rule 1: Management categories always → Management
  if (MANAGEMENT_CATEGORIES.has(taskCategory)) return "Management";
  
  // Rule 2: Management Meeting + management member → Management
  if (td.includes("management meeting") && MANAGEMENT_MEMBERS.has(switcher)) return "Management";
  
  // Rule 3: Brand Writing → Brand
  if (taskCategory === "Brand Writing") return "Brand";
  
  // Rule 4: Ed special handling
  if (switcher === "Ed") {
    if (taskCategory === "Copywriting") return "Marketing";
    if (DESIGN_CATEGORIES.has(taskCategory)) return "Design";
    return "Brand"; // Strategy, meetings, everything else
  }
  
  // Rule 5: Lisa special handling
  if (switcher === "Lisa") {
    if (PM_CATEGORIES.has(taskCategory)) return "PM";
    return "Management";
  }
  
  // Rule 6: Designers → almost everything Design
  if (primaryDept === "Design") {
    if (MANAGEMENT_CATEGORIES.has(taskCategory) || td.includes("management meeting")) return "Management";
    return "Design";
  }
  
  // Rule 7: Everyone else
  if (DESIGN_CATEGORIES.has(taskCategory)) return "Design";
  return primaryDept; // Cross-dept, PM, Marketing categories → primary dept
}
```

### Supabase Schema (Core Tables)

```sql
-- VERIFIED: Supabase Postgres; TIMESTAMPTZ for timezone-correct storage

-- Reference tables
CREATE TABLE switchers (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL UNIQUE,           -- "Andrea", "Laura C", etc.
  email       text NOT NULL UNIQUE,           -- "andrea@switch.com.mt"
  primary_dept text NOT NULL,                 -- "Design", "Marketing", "PM", "Management", "Brand"
  is_management_member boolean NOT NULL DEFAULT false,
  active      boolean NOT NULL DEFAULT true
);

CREATE TABLE clients (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL UNIQUE,           -- canonical name e.g. "Palazzo Parisio"
  active      boolean NOT NULL DEFAULT true
);

-- Claude's Discretion: separate alias table (recommended for Phase 3 admin UI)
CREATE TABLE client_aliases (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   uuid NOT NULL REFERENCES clients(id),
  alias       text NOT NULL UNIQUE            -- e.g. "PP", "WRH", "Palazzo"
);

CREATE TABLE categories (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL UNIQUE,           -- e.g. "Production", "CC Management"
  department  text NOT NULL,                  -- which dept this category "belongs to"
  llm_hint    text                            -- optional context for LLM (Phase 3)
);

-- Events table
CREATE TABLE events (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  switcher_id           uuid NOT NULL REFERENCES switchers(id),
  google_event_id       text NOT NULL,
  recurring_event_id    text,                 -- parent series ID if instance
  title                 text NOT NULL,
  client_id             uuid REFERENCES clients(id),
  client_name_raw       text,                 -- raw extracted client before alias resolution
  task_details          text NOT NULL,
  start_at              timestamptz NOT NULL,
  end_at                timestamptz NOT NULL,
  duration_minutes      integer NOT NULL,     -- computed at ingest
  event_date            date NOT NULL,        -- date portion for filtering
  day_of_week           smallint NOT NULL,    -- 0=Mon..6=Sun
  off_schedule          boolean NOT NULL DEFAULT false,  -- true for Friday events
  temporal_status       text NOT NULL DEFAULT 'upcoming', -- 'upcoming' | 'completed'
  category_id           uuid REFERENCES categories(id),
  department            text,
  classification_method text,                 -- 'rule' | 'llm' | 'llm_corrected' | 'misc'
  rule_confidence       text,                 -- 'confident' | 'borderline' (rule engine only)
  description           text,                 -- event description/notes from Calendar
  attendees             jsonb,                -- list of attendee objects
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  UNIQUE (switcher_id, google_event_id)       -- constraint for upsert ON CONFLICT
);

-- Sync tracking
CREATE TABLE sync_runs (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at            timestamptz NOT NULL,
  completed_at          timestamptz,
  trigger               text NOT NULL,        -- 'cron' | 'manual'
  status                text NOT NULL,        -- 'success' | 'partial' | 'failed'
  window_start          date NOT NULL,
  window_end            date NOT NULL,
  events_processed      integer,
  rule_classified       integer,
  llm_classified        integer,
  llm_corrected         integer,
  misc_count            integer,
  borderline_count      integer,
  errors                jsonb,                -- per-Switcher error log
  duration_ms           integer
);

-- LLM audit corrections
CREATE TABLE audit_log (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id              uuid NOT NULL REFERENCES events(id),
  audit_run_id          uuid REFERENCES sync_runs(id),
  original_category     text NOT NULL,
  original_department   text NOT NULL,
  corrected_category    text NOT NULL,
  corrected_department  text NOT NULL,
  reasoning             text NOT NULL,        -- LLM's explanation
  created_at            timestamptz NOT NULL DEFAULT now()
);
```

### RLS Policies

```sql
-- Source: [CITED: supabase.com/docs/guides/database/postgres/row-level-security]
-- Edge Functions use service_role key → bypasses RLS (no policy needed for writes)
-- Anon role blocked by default (no SELECT policy on events = blocked)
-- Phase 3 will add password-gated read access

ALTER TABLE switchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- No SELECT policies on any table = anon role sees nothing
-- Service role bypasses all RLS → full access for Edge Functions
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|---|---|---|---|
| Manual JSON parsing + retry loop for LLM (classify_with_ai.py) | `responseSchema` + `responseMimeType: "application/json"` in Gemini API | Late 2024 (Gemini 1.5+) | Eliminates JSON parse failures; schema enforces valid enum values |
| Gemini 2.5 Pro for classification | Gemini 2.5 Flash (D-06, D-07) | 2025 | Lower cost, faster response; sufficient for structured classification task |
| google-auth-library npm in Edge Functions | Manual JWT via Deno crypto.subtle | 2025 (Deno 2.x migration) | Eliminates compat dependency; no external libraries needed |
| import_map.json for Deno dependencies | Per-function `deno.json` | Supabase CLI v1.215.0+ | Better isolation between functions; required for deployment |

**Deprecated / Outdated:**
- `singleEvents: false` for recurring event handling: Still works but doesn't return instance-level start/end times needed for duration calculation. Use `singleEvents: true` with `recurringEventId` tracking.
- Google Apps Script (CalendarExtractor.gs): Replaced entirely by the Supabase Edge Function approach.
- Python process_export.py + classify_with_ai.py: Reference material only; the Edge Function is the production replacement.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|---|---|---|
| A1 | Gemini 2.5 Flash free tier is 250 RPD and 10 RPM | Common Pitfalls / Rate Limits | If lower, backfill could hit rate limits; add delays between batches |
| A2 | Supabase free tier allows pg_cron with no job count limit | Standard Stack / pg_cron | If free tier restricts job count, may need to consolidate jobs |
| A3 | CET is UTC+1 year-round for scheduling purposes | Common Pitfalls #6 | Malta uses CEST (UTC+2) in summer; pg_cron schedule may need seasonal adjustment |
| A4 | Gemini `responseSchema` with `enum` correctly rejects values not in the enum list | Code Examples / Pattern 4 | If enum enforcement is soft, invalid categories could pass through; keep post-validation |
| A5 | The `supabase.rpc()` approach for upsert via Postgres function is reliably available on the free tier | Don't Hand-Roll | If RPC calls have limitations, may need direct SQL connection via supabase-js v2 `from().select()` |
| A6 | Google service account private_key is in PKCS#8 PEM format (not PKCS#1) | Pattern 1 / JWT signing | Google service account JSON consistently uses PKCS#8; if PKCS#1, Deno crypto.subtle.importKey will fail |

---

## Open Questions

1. **CET vs CEST pg_cron scheduling**
   - What we know: Luke wants 5 AM CET. Malta observes CEST (UTC+2) in summer.
   - What's unclear: Should pg_cron be set to `0 4 * * *` (always 5 AM CET) or `0 3 * * *` for summer? Does Supabase pg_cron support timezone-aware cron expressions?
   - Recommendation: Set `0 4 * * *` (04:00 UTC = 05:00 CET) as the default. Accept that in summer it runs at 06:00 CEST. The sync is nightly — 1 hour drift is acceptable. Document this for Luke.

2. **Manual sync authentication (D-18)**
   - What we know: Manual sync uses an HTTP endpoint with secret key authentication.
   - What's unclear: Should this use the Supabase service role key, or a separate custom secret header?
   - Recommendation: Use a separate `SYNC_SECRET` env var checked in the Edge Function handler. Avoids exposing the service role key as a URL param.

3. **Client alias storage — DB table vs constants (D-02, Claude's Discretion)**
   - What we know: ~17 known aliases from instructions.md; Phase 3 admin UI will need to manage these.
   - What's unclear: Aliases in DB are live-editable (Phase 3 benefit); aliases in code are faster and simpler for Phase 2.
   - Recommendation: **Separate `client_aliases` table** (see schema above). Phase 3 admin UI will CRUD this table directly. Edge Function queries it at sync time. Slightly more complex but eliminates a Phase 3 migration.

4. **Batch size for LLM calls (Claude's Discretion)**
   - What we know: `classify_with_ai.py` uses 80 events/batch (worked well in testing). Edge Function has 150s timeout.
   - What's unclear: At 80 events/batch and ~5s/batch, 50 batches = 250s. During normal nightly sync only the ~2% unresolved events go to LLM — that's ~8 events max = 1 batch. Batch size only matters for backfill.
   - Recommendation: Use **80 events/batch** for LLM fallback. For backfill, use the manual sync endpoint in multiple calls to stay under the 150s timeout.

5. **LLM audit pass sample percentage (Claude's Discretion)**
   - What we know: The audit pass reviews borderline events + a random sample of confident classifications (D-07, D-08).
   - What's unclear: What percentage of confident classifications to include in the audit sample.
   - Recommendation: **10% of confident rule classifications** per sync run. At ~200 events/night and ~98% rule-classified, that's ~20 events. Combined with all borderline events (~4 at 2%), the audit reviews ~24 events — well within 1 API batch.

---

## Security Domain

> `security_enforcement` is not set to false in config.json — security domain included.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---|---|---|
| V2 Authentication | Yes (service account + manual sync auth) | Google OAuth2 JWT; `SYNC_SECRET` header check in Edge Function |
| V3 Session Management | No | No user sessions in the pipeline |
| V4 Access Control | Yes (RLS) | Service role for writes; anon role blocked via RLS |
| V5 Input Validation | Yes (LLM output, Calendar API data) | `outputValidator.ts` checks against canonical lists; `responseSchema` constrains LLM; event filter for personal/all-day/zero-duration |
| V6 Cryptography | Yes (JWT signing) | Deno `crypto.subtle` (Web Crypto standard); RSA-SHA256 via PKCS#8 key |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---|---|---|
| Service account JSON exposure | Information Disclosure | Store in Supabase secrets only; never in git or env files; minified single-line string |
| Manual sync endpoint abuse | Spoofing / Denial of Service | `SYNC_SECRET` header check; rate-limit by verifying against Edge Function secret |
| LLM prompt injection via calendar event title | Tampering | System prompt architecture separates instruction from data; classification schema enforces enum values |
| Supabase anon key exposes data | Information Disclosure | RLS enabled on all tables with no anon SELECT policies |
| Gemini API key exposure | Information Disclosure | Stored as Edge Function secret only; never returned to client-side code |

---

## Sources

### Primary (HIGH confidence)
- Official Supabase docs: schedule-functions, functions/limits, functions/secrets, database/postgres/row-level-security
- Official Google docs: developers.google.com/identity/protocols/oauth2/service-account, developers.google.com/calendar/api/v3/reference/events/list
- Official Gemini docs: ai.google.dev/gemini-api/docs/structured-output, ai.google.dev/gemini-api/docs/rate-limits
- npm registry: @supabase/supabase-js 2.103.0 (verified 2026-04-09)
- Direct source code reading: process_export.py, classify_with_ai.py, CalendarExtractor.gs, instructions.md

### Secondary (MEDIUM confidence)
- GitHub Discussions: supabase #33244 (google-auth-library compat), #36532 (composite key upsert)
- Supabase blog: supabase.com/blog/supabase-edge-functions-deploy-dashboard-deno-2-1 (Deno 2.1 + structured functions)

### Tertiary (LOW confidence, marked [ASSUMED] where used)
- aifreeapi.com: Gemini 2.5 Flash rate limits (secondary source; verify at aistudio.google.com)
- Community guides on JWT manual construction in Deno (pattern verified against official Google docs for claim fields)

---

## Metadata

**Confidence breakdown:**
- Standard Stack: HIGH — verified npm versions, official docs for all core services
- Architecture: HIGH — patterns derived from official Supabase + Google docs and direct source code reading
- Pitfalls: HIGH (Pitfalls 1-2, 7-8) / MEDIUM (Pitfalls 3-6) — some rate limit specifics are secondary sources
- Classification Logic: HIGH — direct reading of 500-line Python source + 500-line instructions document

**Research date:** 2026-04-14
**Valid until:** 2026-07-14 (90 days — Supabase Edge Function limits and Gemini rate limits change frequently; re-verify before phase execution)
