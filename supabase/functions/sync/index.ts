// =============================================================
// Sync Edge Function — Main Pipeline Orchestrator
// Ties together all shared modules from Plans 01-03:
//   fetch -> filter -> parse -> classify (rule+LLM+audit) ->
//   upsert -> delete stale -> record metrics
//
// Triggers:
//   - Cron (pg_cron via service role key in Authorization header)
//   - Manual (x-sync-secret header against SYNC_SECRET env var)
//
// Per-Switcher error isolation: one failing calendar does not
// block the other 14 (D-16).
// =============================================================

import { supabaseAdmin } from "../_shared/supabaseClient.ts";
import { getGoogleAccessToken } from "../_shared/googleAuth.ts";
import { fetchCalendarEvents } from "../_shared/calendarFetcher.ts";
import { filterEvents, isWeekendEvent, isZeroDuration, isPersonalEvent } from "../_shared/eventFilter.ts";
import { parseTitle } from "../_shared/titleParser.ts";
import { buildAliasMap, resolveClientAlias, isNonClientName } from "../_shared/aliasResolver.ts";
import { classifyEvent } from "../_shared/ruleEngine.ts";
import { classifyWithLLM } from "../_shared/llmClassifier.ts";
import { auditRuleClassifications } from "../_shared/llmAuditPass.ts";
import type {
  Switcher,
  Client,
  Category,
  ParsedEvent,
  ClassifiedEvent,
  SyncMetrics,
  GoogleCalendarEvent,
} from "../_shared/types.ts";

// =============================================================
// Authentication (T-02-11)
// =============================================================

/**
 * Validate the incoming request. Returns null if authorized,
 * or a Response with 401 status if not.
 */
function authenticateRequest(req: Request): Response | null {
  // Check for cron trigger: Authorization Bearer with service role key
  const authHeader = req.headers.get("authorization");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (authHeader && serviceRoleKey && authHeader === `Bearer ${serviceRoleKey}`) {
    return null; // Authorized
  }

  // Check for manual trigger: x-sync-secret header
  const syncSecret = req.headers.get("x-sync-secret");
  const expectedSecret = Deno.env.get("SYNC_SECRET");
  if (syncSecret && expectedSecret && syncSecret === expectedSecret) {
    return null; // Authorized
  }

  return new Response(JSON.stringify({ error: "Unauthorized" }), {
    status: 401,
    headers: { "Content-Type": "application/json" },
  });
}

// =============================================================
// Window Calculation (D-14, D-15)
// =============================================================

interface SyncWindow {
  start: string; // YYYY-MM-DD
  end: string; // YYYY-MM-DD
  startRFC: string; // RFC3339 for Google Calendar API
  endRFC: string; // RFC3339 for Google Calendar API
}

function calculateSyncWindow(
  backfillStart?: string,
  backfillEnd?: string,
): SyncWindow {
  if (backfillStart && backfillEnd) {
    return {
      start: backfillStart,
      end: backfillEnd,
      startRFC: `${backfillStart}T00:00:00Z`,
      endRFC: `${backfillEnd}T23:59:59Z`,
    };
  }

  // Standard sync: today - 7 days to today + 14 days
  const now = new Date();
  const windowStart = new Date(now);
  windowStart.setUTCDate(windowStart.getUTCDate() - 7);
  const windowEnd = new Date(now);
  windowEnd.setUTCDate(windowEnd.getUTCDate() + 14);

  const startDate = windowStart.toISOString().split("T")[0];
  const endDate = windowEnd.toISOString().split("T")[0];

  return {
    start: startDate,
    end: endDate,
    startRFC: `${startDate}T00:00:00Z`,
    endRFC: `${endDate}T23:59:59Z`,
  };
}

// =============================================================
// Reference Data Loading (D-04 / ADMN-04)
// =============================================================

interface ReferenceData {
  switchers: Switcher[];
  clients: Client[];
  aliasMap: Map<string, string>;
  categories: Category[];
  validClients: string[];
  validCategories: string[];
  validDepartments: string[];
  clientNameToId: Map<string, string>;
  categoryNameToId: Map<string, string>;
  switcherContext: Map<string, { dept: string; isManagement: boolean }>;
}

async function loadReferenceData(): Promise<ReferenceData> {
  // Load all reference data in parallel
  const [switchersRes, clientsRes, aliasesRes, categoriesRes] =
    await Promise.all([
      supabaseAdmin.from("switchers").select("*").eq("active", true),
      supabaseAdmin.from("clients").select("*").eq("active", true),
      supabaseAdmin
        .from("client_aliases")
        .select("alias, clients(name)"),
      supabaseAdmin.from("categories").select("*"),
    ]);

  if (switchersRes.error) throw new Error(`Switchers load failed: ${switchersRes.error.message}`);
  if (clientsRes.error) throw new Error(`Clients load failed: ${clientsRes.error.message}`);
  if (aliasesRes.error) throw new Error(`Aliases load failed: ${aliasesRes.error.message}`);
  if (categoriesRes.error) throw new Error(`Categories load failed: ${categoriesRes.error.message}`);

  const switchers = switchersRes.data as Switcher[];
  const clients = clientsRes.data as Client[];
  const categories = categoriesRes.data as Category[];

  // Build alias map from DB records
  // The join returns { alias: string, clients: { name: string } }
  const aliasRecords = (aliasesRes.data ?? []).map(
    (row: { alias: string; clients: { name: string } | null }) => ({
      alias: row.alias,
      client_name: row.clients?.name ?? "",
    }),
  );
  const aliasMap = buildAliasMap(aliasRecords);

  // Build lookup maps
  const clientNameToId = new Map<string, string>();
  for (const c of clients) {
    clientNameToId.set(c.name.toLowerCase(), c.id);
  }

  const categoryNameToId = new Map<string, string>();
  for (const cat of categories) {
    categoryNameToId.set(cat.name.toLowerCase(), cat.id);
  }

  // Build valid sets for LLM validation
  const validClients = clients.map((c) => c.name);
  const validCategories = [...new Set(categories.map((c) => c.name))];
  const validDepartments = [
    ...new Set(categories.map((c) => c.department)),
  ];

  // Build Switcher context for LLM
  const switcherContext = new Map<
    string,
    { dept: string; isManagement: boolean }
  >();
  for (const s of switchers) {
    switcherContext.set(s.name, {
      dept: s.primary_dept,
      isManagement: s.is_management_member,
    });
  }

  return {
    switchers,
    clients,
    aliasMap,
    categories,
    validClients,
    validCategories,
    validDepartments,
    clientNameToId,
    categoryNameToId,
    switcherContext,
  };
}

// =============================================================
// Event Parsing
// =============================================================

function parseCalendarEvent(
  event: GoogleCalendarEvent,
  aliasMap: Map<string, string>,
): ParsedEvent | null {
  const startAt = event.start.dateTime;
  const endAt = event.end.dateTime;

  // Skip all-day events that somehow got through (safety check)
  if (!startAt || !endAt) {
    return null;
  }

  // Check zero-duration
  if (isZeroDuration(startAt, endAt)) {
    return null;
  }

  // Calculate day of week (0=Mon..6=Sun)
  const startDate = new Date(startAt);
  const dayOfWeek = (startDate.getUTCDay() + 6) % 7;

  // Filter weekend events (D-11)
  if (isWeekendEvent(dayOfWeek)) {
    return null;
  }

  const title = event.summary || "";
  const { clientRaw, taskDetails } = parseTitle(title);

  // Post-parse personal event check with client context
  if (isPersonalEvent(title, clientRaw)) {
    return null;
  }

  // Calculate duration
  const endDate = new Date(endAt);
  const durationMinutes = Math.round(
    (endDate.getTime() - startDate.getTime()) / 60000,
  );

  // Event date (YYYY-MM-DD)
  const eventDate = startAt.split("T")[0];

  // Off-schedule: Friday = day_of_week 4 (D-11)
  const offSchedule = dayOfWeek === 4;

  // Temporal status (D-24)
  const temporalStatus =
    new Date(startAt) > new Date() ? "upcoming" : "completed";

  return {
    google_event_id: event.id,
    recurring_event_id: event.recurringEventId ?? null,
    title,
    client_name_raw: clientRaw,
    task_details: taskDetails,
    description: event.description ?? null,
    attendees: event.attendees
      ? event.attendees.map((a) => ({
          email: a.email,
          displayName: a.displayName,
        }))
      : null,
    start_at: startAt,
    end_at: endAt,
    duration_minutes: durationMinutes,
    event_date: eventDate,
    day_of_week: dayOfWeek,
    off_schedule: offSchedule,
    temporal_status: temporalStatus,
  };
}

// =============================================================
// Event Upsert
// =============================================================

async function upsertClassifiedEvent(
  switcherId: string,
  parsed: ParsedEvent,
  classification: {
    client_name: string;
    category: string;
    department: string;
    classification_method: string;
    rule_confidence: string | null;
  },
  clientNameToId: Map<string, string>,
  categoryNameToId: Map<string, string>,
): Promise<string | null> {
  // Look up client_id by resolved client name
  const clientId =
    clientNameToId.get(classification.client_name.toLowerCase()) ?? null;

  // Look up category_id by category name
  const categoryId =
    categoryNameToId.get(classification.category.toLowerCase()) ?? null;

  const { data, error } = await supabaseAdmin.rpc("upsert_event", {
    p_switcher_id: switcherId,
    p_google_event_id: parsed.google_event_id,
    p_recurring_event_id: parsed.recurring_event_id,
    p_title: parsed.title,
    p_client_id: clientId,
    p_client_name_raw: parsed.client_name_raw,
    p_task_details: parsed.task_details,
    p_description: parsed.description,
    p_attendees: parsed.attendees ? JSON.stringify(parsed.attendees) : null,
    p_start_at: parsed.start_at,
    p_end_at: parsed.end_at,
    p_duration_minutes: parsed.duration_minutes,
    p_event_date: parsed.event_date,
    p_day_of_week: parsed.day_of_week,
    p_off_schedule: parsed.off_schedule,
    p_temporal_status: parsed.temporal_status,
    p_category_id: categoryId,
    p_department: classification.department,
    p_classification_method: classification.classification_method,
    p_rule_confidence: classification.rule_confidence,
  });

  if (error) {
    throw new Error(`Upsert failed for ${parsed.google_event_id}: ${error.message}`);
  }

  return data as string | null;
}

// =============================================================
// Main Sync Handler
// =============================================================

Deno.serve(async (req: Request) => {
  // --- A. Authentication (T-02-11) ---
  const authError = authenticateRequest(req);
  if (authError) {
    return authError;
  }

  const startTime = Date.now();

  try {
    // --- B. Request parsing ---
    let trigger: "cron" | "manual" = "manual";
    let backfillStart: string | undefined;
    let backfillEnd: string | undefined;

    try {
      const body = await req.json();
      trigger = body.trigger === "cron" ? "cron" : "manual";
      backfillStart = body.backfill_start;
      backfillEnd = body.backfill_end;
    } catch {
      // No body or invalid JSON -- use defaults
    }

    // --- C. Window calculation (D-14, D-15) ---
    const window = calculateSyncWindow(backfillStart, backfillEnd);

    // --- D. Reference data loading ---
    const ref = await loadReferenceData();

    if (ref.switchers.length === 0) {
      return new Response(
        JSON.stringify({ error: "No active switchers found" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    // --- E. Create sync_runs record (D-28) ---
    const { data: syncRunData, error: syncRunError } = await supabaseAdmin
      .from("sync_runs")
      .insert({
        started_at: new Date().toISOString(),
        trigger,
        status: "running",
        window_start: window.start,
        window_end: window.end,
      })
      .select("id")
      .single();

    if (syncRunError || !syncRunData) {
      throw new Error(
        `Failed to create sync_runs record: ${syncRunError?.message}`,
      );
    }

    const syncRunId = syncRunData.id;

    // --- F. Per-Switcher pipeline (D-16) ---
    const metrics: SyncMetrics = {
      events_processed: 0,
      rule_classified: 0,
      llm_classified: 0,
      llm_corrected: 0,
      misc_count: 0,
      borderline_count: 0,
      errors: {},
    };

    const serviceAccountJson =
      Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON") ?? "";
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY") ?? "";

    if (!serviceAccountJson) {
      throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON environment variable not set");
    }

    // Accumulate unresolved (Misc) events for LLM fallback
    const unresolvedEvents: Array<{
      parsed: ParsedEvent;
      switcherId: string;
      switcherName: string;
    }> = [];

    // Accumulate borderline events for audit
    const borderlineEvents: Array<{
      eventId: string;
      parsed: ParsedEvent;
      switcherName: string;
      classification: {
        client_name: string;
        category: string;
        department: string;
        classification_method: string;
        rule_confidence: string | null;
      };
    }> = [];

    // Accumulate confident events for 10% random audit sample
    const confidentEvents: Array<{
      eventId: string;
      parsed: ParsedEvent;
      switcherName: string;
      classification: {
        client_name: string;
        category: string;
        department: string;
        classification_method: string;
        rule_confidence: string | null;
      };
    }> = [];

    for (const switcher of ref.switchers) {
      try {
        // 1. Fetch calendar events
        const accessToken = await getGoogleAccessToken(
          serviceAccountJson,
          switcher.email,
        );

        const rawEvents = await fetchCalendarEvents(
          accessToken,
          switcher.email,
          window.startRFC,
          window.endRFC,
        );

        // 2. Filter events (pre-parse: personal, all-day, zero-duration, removable)
        const filteredEvents = filterEvents(rawEvents);

        // 3. Parse and post-filter (weekend, zero-duration on parsed times, personal with client context)
        const parsedEvents: ParsedEvent[] = [];
        const googleEventIds: string[] = [];

        for (const event of filteredEvents) {
          const parsed = parseCalendarEvent(event, ref.aliasMap);
          if (parsed) {
            parsedEvents.push(parsed);
            googleEventIds.push(parsed.google_event_id);
          }
        }

        // Also collect google_event_ids from filtered-out events for delete_missing tracking
        // We need ALL fetched IDs, not just parsed ones, to avoid deleting filtered events
        const allFetchedEventIds = rawEvents.map((e) => e.id);

        metrics.events_processed += parsedEvents.length;

        // 4. Classify (Stage 1 - Rules)
        for (const parsed of parsedEvents) {
          const classification = classifyEvent(
            parsed,
            switcher.name,
            switcher.primary_dept,
            switcher.is_management_member,
            ref.aliasMap,
          );

          if (classification.classification_method === "misc") {
            metrics.misc_count++;
            unresolvedEvents.push({
              parsed,
              switcherId: switcher.id,
              switcherName: switcher.name,
            });
          } else {
            metrics.rule_classified++;
          }

          if (classification.rule_confidence === "borderline") {
            metrics.borderline_count++;
          }

          // Upsert to DB (rule-classified events get immediate upsert)
          if (classification.classification_method !== "misc") {
            const eventId = await upsertClassifiedEvent(
              switcher.id,
              parsed,
              classification,
              ref.clientNameToId,
              ref.categoryNameToId,
            );

            // Track for audit
            if (classification.rule_confidence === "borderline") {
              borderlineEvents.push({
                eventId: eventId ?? parsed.google_event_id,
                parsed,
                switcherName: switcher.name,
                classification,
              });
            } else {
              confidentEvents.push({
                eventId: eventId ?? parsed.google_event_id,
                parsed,
                switcherName: switcher.name,
                classification,
              });
            }
          } else {
            // Upsert misc events too (they'll be updated if LLM resolves them)
            const eventId = await upsertClassifiedEvent(
              switcher.id,
              parsed,
              classification,
              ref.clientNameToId,
              ref.categoryNameToId,
            );

            // Store the DB event ID for LLM update
            if (eventId) {
              (parsed as ParsedEvent & { _dbEventId?: string })._dbEventId =
                eventId;
            }
          }
        }

        // 6. Hard delete removed events (D-17)
        // Use ALL fetched event IDs (including filtered ones) to avoid
        // accidentally deleting events that exist in calendar but were filtered
        await supabaseAdmin.rpc("delete_missing_events", {
          p_switcher_id: switcher.id,
          p_google_event_ids: allFetchedEventIds,
          p_window_start: window.start,
          p_window_end: window.end,
        });
      } catch (error) {
        // Per-Switcher error isolation (D-16)
        metrics.errors[switcher.name] =
          error instanceof Error ? error.message : String(error);
      }
    }

    // --- G. LLM Fallback (Stage 2) ---
    if (unresolvedEvents.length > 0 && geminiApiKey) {
      try {
        // Build ParsedEvent array with Switcher context for LLM
        const eventsForLLM = unresolvedEvents.map((e) => e.parsed);

        // Build Switcher name map keyed by event index for LLM prompt context
        const eventSwitcherNames = new Map<number, string>();
        for (let i = 0; i < unresolvedEvents.length; i++) {
          eventSwitcherNames.set(i, unresolvedEvents[i].switcherName);
        }

        const llmResults = await classifyWithLLM(
          eventsForLLM,
          geminiApiKey,
          ref.validCategories,
          ref.validClients,
          ref.validDepartments,
          ref.switcherContext,
          eventSwitcherNames,
        );

        // Update events with LLM results
        let llmResolved = 0;
        for (let i = 0; i < llmResults.length; i++) {
          const result = llmResults[i];
          const eventInfo = unresolvedEvents[i];
          if (!eventInfo) continue;

          if (result.valid) {
            // LLM resolved the event -- update in DB
            const clientId =
              ref.clientNameToId.get(result.client.toLowerCase()) ?? null;
            const categoryId =
              ref.categoryNameToId.get(result.category.toLowerCase()) ?? null;

            await supabaseAdmin
              .from("events")
              .update({
                client_id: clientId,
                client_name_raw: eventInfo.parsed.client_name_raw,
                category_id: categoryId,
                department: result.department,
                classification_method: "llm",
                rule_confidence: null,
                updated_at: new Date().toISOString(),
              })
              .eq("switcher_id", eventInfo.switcherId)
              .eq("google_event_id", eventInfo.parsed.google_event_id);

            llmResolved = llmResolved + 1;
          }
          // If not valid, the event stays as misc (already upserted)
        }
        metrics.llm_classified = llmResolved;
        metrics.misc_count = unresolvedEvents.length - llmResolved;
      } catch (error) {
        // LLM fallback failure is non-fatal -- events stay as misc
        console.error("LLM fallback error:", error);
      }
    }

    // --- H. LLM Audit Pass (Stage 3, D-07, D-08) ---
    if (geminiApiKey) {
      try {
        // Select events for audit:
        // - ALL borderline rule-classified events
        // - 10% random sample of confident rule-classified events
        const sampleSize = Math.ceil(confidentEvents.length * 0.1);
        const sampledConfident = confidentEvents
          .sort(() => Math.random() - 0.5) // Shuffle
          .slice(0, sampleSize);

        const eventsToAudit = [...borderlineEvents, ...sampledConfident].map(
          (e) => ({
            event_id: e.eventId,
            title: e.parsed.title,
            task_details: e.parsed.task_details,
            client_name: e.classification.client_name,
            switcher_name: e.switcherName,
            rule_category: e.classification.category,
            rule_department: e.classification.department,
            rule_confidence: e.classification.rule_confidence as
              | "confident"
              | "borderline",
          }),
        );

        if (eventsToAudit.length > 0) {
          const auditResults = await auditRuleClassifications(
            eventsToAudit,
            geminiApiKey,
            ref.validCategories,
            ref.validClients,
            ref.validDepartments,
          );

          // Process audit corrections
          for (const result of auditResults) {
            if (!result.agrees && result.corrected_category && result.corrected_department) {
              // Update event with corrected classification
              const categoryId =
                ref.categoryNameToId.get(
                  result.corrected_category.toLowerCase(),
                ) ?? null;

              await supabaseAdmin
                .from("events")
                .update({
                  category_id: categoryId,
                  department: result.corrected_department,
                  classification_method: "llm_corrected",
                  updated_at: new Date().toISOString(),
                })
                .eq("id", result.event_id);

              // Write audit_log entry
              await supabaseAdmin.from("audit_log").insert({
                event_id: result.event_id,
                audit_run_id: syncRunId,
                original_category: result.original_category,
                original_department: result.original_department,
                corrected_category: result.corrected_category,
                corrected_department: result.corrected_department,
                reasoning: result.reasoning,
              });

              metrics.llm_corrected++;
            }
          }
        }
      } catch (error) {
        // Audit failure is non-fatal
        console.error("LLM audit error:", error);
      }
    }

    // --- I. Update sync_runs record (D-28, D-29, PIPE-06) ---
    const durationMs = Date.now() - startTime;
    const hasErrors = Object.keys(metrics.errors).length > 0;
    const allFailed =
      hasErrors &&
      Object.keys(metrics.errors).length === ref.switchers.length;

    const syncStatus = allFailed
      ? "failed"
      : hasErrors
        ? "partial"
        : "success";

    await supabaseAdmin
      .from("sync_runs")
      .update({
        completed_at: new Date().toISOString(),
        status: syncStatus,
        events_processed: metrics.events_processed,
        rule_classified: metrics.rule_classified,
        llm_classified: metrics.llm_classified,
        llm_corrected: metrics.llm_corrected,
        misc_count: metrics.misc_count,
        borderline_count: metrics.borderline_count,
        errors: Object.keys(metrics.errors).length > 0 ? metrics.errors : null,
        duration_ms: durationMs,
      })
      .eq("id", syncRunId);

    // --- J. Return classification summary report (D-26) ---
    return new Response(
      JSON.stringify({
        status: syncStatus,
        sync_run_id: syncRunId,
        window: { start: window.start, end: window.end },
        metrics: {
          events_processed: metrics.events_processed,
          rule_classified: metrics.rule_classified,
          llm_classified: metrics.llm_classified,
          llm_corrected: metrics.llm_corrected,
          misc_count: metrics.misc_count,
          borderline_count: metrics.borderline_count,
        },
        errors: metrics.errors,
        duration_ms: durationMs,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    // Top-level error: something fundamental broke
    const durationMs = Date.now() - startTime;
    return new Response(
      JSON.stringify({
        status: "failed",
        error: error instanceof Error ? error.message : String(error),
        duration_ms: durationMs,
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});
