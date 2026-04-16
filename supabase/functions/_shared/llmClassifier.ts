// --- LLM Classifier ---
// Gemini 2.5 Flash batch classification for events that the rule engine
// could not classify (D-06, CLAS-02). Uses structured output with
// responseSchema to enforce valid JSON (Research Pattern 4).
// API key read from Deno.env.get by the caller (T-02-07).
// Override learning loop (D-24): recent user corrections injected as
// LLM context so the model improves from manual overrides.

import type { ParsedEvent } from "./types.ts";
import { validateClassifications } from "./outputValidator.ts";
import { supabaseAdmin } from "./supabaseClient.ts";

// ============================================================
// Override Learning Loop (D-24)
// ============================================================

/**
 * Fetch recent user override corrections from audit_log to include
 * as learning examples in the LLM classification prompt.
 *
 * Queries audit_log for 'classification_override' entries, then
 * resolves human-readable client/category names from the events
 * table via FK joins. Returns a formatted string to append to
 * the system prompt, or empty string if no corrections exist.
 *
 * Called once per batch (not per event) to avoid N+1 queries.
 *
 * @param limit - Maximum number of recent corrections to include (default 30)
 */
async function fetchRecentCorrections(limit = 30): Promise<string> {
  const { data: corrections, error } = await supabaseAdmin
    .from("audit_log")
    .select("entity_id, details, created_at")
    .eq("action", "classification_override")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !corrections || corrections.length === 0) {
    return "";
  }

  // For each correction, fetch the event's task_details and resolved
  // client/category names via FK joins on override columns
  const correctionLines: string[] = [];
  for (const c of corrections) {
    const { data: event } = await supabaseAdmin
      .from("events")
      .select(
        "task_details, client_name_raw, override_client_id, override_category_id, override_department, client:clients!override_client_id(name), category:categories!override_category_id(name)",
      )
      .eq("id", c.entity_id)
      .single();

    if (event) {
      const clientName =
        (event.client as { name: string } | null)?.name ?? "Unknown";
      const categoryName =
        (event.category as { name: string } | null)?.name ?? "Unknown";
      const department = event.override_department ?? "Unknown";
      correctionLines.push(
        `- Event "${event.task_details}" was corrected to: Client="${clientName}", Category="${categoryName}", Department="${department}"`,
      );
    }
  }

  if (correctionLines.length === 0) return "";

  return `\n\nRecent corrections (learn from these — apply similar logic to similar events):\n${correctionLines.join("\n")}`;
}

// ============================================================
// Constants
// ============================================================

const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

const BATCH_SIZE = 80; // Per classify_with_ai.py approach

const BATCH_DELAY_MS = 6000; // 6s between batches (T-02-10: respects 10 RPM free tier)

// ============================================================
// System Prompt
// ============================================================

/**
 * Build the system prompt with full classification context.
 * Includes category descriptions, client list with aliases,
 * Switcher department mappings, and classification rules.
 */
function buildSystemPrompt(
  validCategories: string[],
  validClients: string[],
  validDepartments: string[],
  switcherContext: Map<string, { dept: string; isManagement: boolean }>,
  overrideContext: string = "",
): string {
  const switcherLines: string[] = [];
  for (const [name, ctx] of switcherContext.entries()) {
    const mgmt = ctx.isManagement ? " (management member)" : "";
    switcherLines.push(`- ${name} -> ${ctx.dept}${mgmt}`);
  }

  return `You are a timesheet classification assistant for Switch, a creative agency in Malta.

Your job: given a batch of calendar event rows, assign the correct "client", "category", and "department" to each row.

## VALID TASK CATEGORIES (use one of these exactly):
${validCategories.join(", ")}

## VALID DEPARTMENTS (use one of these exactly):
${validDepartments.join(", ")}

## WHAT EACH TASK CATEGORY INCLUDES:
- Brand Design: Visual Identity Design (from scratch), Brand Formalisation
- Production: CC Element Design, Editorial Design, Artwork Resizing, design visuals, resizing, collateral, formatting, posters, banners, brochures, signage, reels, menus, promo materials
- Web Design: UX/Wireframing, UI Design, Front End Design (WordPress)
- Motion: Animation, Motion Graphics, Video Editing
- Photography: Photo Shoots, Photo Editing, filming
- Misc Design: Illustration, Moodboards, Story Boarding
- Task management: Asana (internal), Calendar management, planning, scheduling internal tasks
- Client Admin: External Asana, Client Emails, follow-ups, chasing, reminders, general PM admin for clients
- Reporting: Compiling Reports, Report Analysis, Monthly Business Overview, performance reports
- CC Management: Content Calendar work -- maintaining 3-month plans, moving posts, scheduling CC, writing CC briefs
- Email Marketing: Scheduling newsletters (NL), configuring drip campaigns
- Paid Management: Ad campaigns, LinkedIn ads, Meta/FB/IG ads, Google ads, boosting posts, ad setup
- Social Media Management: Scheduling/posting posts, LinkedIn posts, setting up events, managing profiles
- Strategy: Comms plan writing, creating new 3-month plans, budgeting, retainer planning, thinking time
- CRM Management: HubSpot edits, CRM proposals
- Directory Management: Updating/creating directory profiles
- Web Management: Uploading blogs, WordPress/CMS updates, staging, server migration, website work
- Copywriting: Captions, articles, case studies, blogs, thought leadership (TL), content writing, ebooks, white papers
- Brief writing: Design briefs, writing briefs
- Brainstorming: Naming sessions, design brainstorms, campaign ideas
- Emails: Personal email management, inbox management
- QA: Quality assurance on designs, writing, reports
- Misc: Anything that genuinely does not fit any other category
- Research: Research of any kind, podcasts
- Pitch Work: Contributing to a pitch or proposal, presentations, sales decks
- Non-Client Meeting: Internal meetings NOT about specific clients (agency planning, PM standup, team catch-ups, management meetings, birthday celebrations, leadership meetings)
- External Client Meeting: Meetings WITH clients or suppliers (CMO meetings, weekly client calls, client check-ins)
- Internal Client Meeting: Internal meetings ABOUT specific clients (internal catch up with a client name, post-mortems about clients)
- Configuring LLM: Setting up Claude projects, Gems, CustomGPTs
- Admin: Billing, timesheet filling, Dashlane, general admin
- Brand Writing: Brand Fundamentals, Narrative, Brand Strategy
- Accounts: Statements, payroll, billing, invoicing, EOM payments
- Operations: Management meetings, business strategy, finance meetings, Vistage
- Business Development: Meetings with prospects, quoting, proposals, PR partnerships
- HR: Interviews, quarterly catch-ups, recruitment

## SWITCHER PRIMARY DEPARTMENTS:
${switcherLines.join("\n")}

## DEPARTMENT ASSIGNMENT RULES:
1. Accounts, Operations, Business Development, HR -> always "Management"
2. "Management Meeting" task -> "Management" for management members
3. Brand Writing -> always "Brand"
4. Ed: Copywriting->Marketing, Design categories->Design, Strategy->Brand, everything else->Brand
5. Lisa: Task management/Client Admin->PM, everything else->Management
6. Designers (Andrea, Nella, Naomi, Laura P): almost everything->Design, only Management categories->Management
7. Everyone else: Design categories stay "Design", cross-department categories->Switcher's primary department

## VALID CLIENTS:
${validClients.join(", ")}

## CLIENT NAME FIXES:
WRH -> Levaris, AD -> Alter Domus, FYO -> Fyorin, Fyrion -> Fyorin, Palazzo -> Palazzo Parisio, PP -> Palazzo Parisio, :ucy -> Lucy, Inernal -> Internal, Onepercent -> onepercent, ELCOL -> Edwards Lowell, CWL & CEL -> CEL & CWL, APS & Sicav -> APS, Switch Website -> Switch, Timberline -> Kalon, Specifi -> Furnitubes, ICOM & Switch -> ICOM

## KEY CONTEXT:
- "Catalyst" is a product of Levaris
- "WRH" = Levaris (always)
- "TL" = Thought Leadership = Copywriting
- "NL" = Newsletter = Email Marketing
- "CC" in task context usually = Content Calendar = CC Management
- "CMO" meetings are External Client Meetings
- Tasks with "internal" in the title + a client name = Internal Client Meeting
- Named person-to-person meetings with no client = Non-Client Meeting
- Meetings with named external people or prospects = Business Development

Classify each event by assigning client, category, and department. Use the canonical names exactly as provided.${overrideContext}`;
}

// ============================================================
// Schema for Gemini structured output
// ============================================================

function buildResponseSchema(
  validCategories: string[],
  validDepartments: string[],
): Record<string, unknown> {
  return {
    type: "ARRAY",
    items: {
      type: "OBJECT",
      properties: {
        row: { type: "INTEGER" },
        client: { type: "STRING" },
        category: {
          type: "STRING",
          enum: validCategories,
        },
        department: {
          type: "STRING",
          enum: validDepartments,
        },
      },
      required: ["row", "client", "category", "department"],
    },
  };
}

// ============================================================
// Gemini API call
// ============================================================

async function callGemini(
  apiKey: string,
  systemPrompt: string,
  userMessage: string,
  responseSchema: Record<string, unknown>,
): Promise<
  Array<{ row: number; client: string; category: string; department: string }>
> {
  const resp = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: [{ parts: [{ text: userMessage }] }],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: "application/json",
        responseSchema,
      },
    }),
  });

  if (!resp.ok) {
    const errorBody = await resp.text();
    throw new Error(`Gemini API error (${resp.status}): ${errorBody}`);
  }

  const body = await resp.json();
  const candidates = body.candidates ?? [];
  if (candidates.length === 0) {
    throw new Error(
      `Gemini returned no candidates: ${JSON.stringify(body).slice(0, 500)}`,
    );
  }

  const parts = candidates[0]?.content?.parts ?? [];
  if (parts.length === 0) {
    throw new Error(
      `Gemini returned no parts: ${JSON.stringify(body).slice(0, 500)}`,
    );
  }

  const text = parts[0].text;
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Gemini returned invalid JSON: ${text.slice(0, 200)}`);
  }
}

// ============================================================
// Delay helper
// ============================================================

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================================
// Main classifier
// ============================================================

/**
 * Classify a batch of unresolved events using Gemini 2.5 Flash.
 *
 * Events are sent in batches of 80 with structured output (responseSchema
 * with enum fields) to guarantee valid JSON responses. Results are
 * validated against canonical lists before returning.
 *
 * Invalid LLM results (unknown client/category/department) are flagged
 * with issues and should be treated as classification_method = "misc"
 * by the caller.
 *
 * @param events - Parsed events that the rule engine could not classify
 * @param geminiApiKey - Gemini API key (from Deno.env.get, never logged)
 * @param validCategories - Canonical category names
 * @param validClients - Canonical client names
 * @param validDepartments - Canonical department names
 * @param switcherContext - Map of Switcher name -> { dept, isManagement }
 * @returns Array of classification results with row index, validated
 */
export async function classifyWithLLM(
  events: ParsedEvent[],
  geminiApiKey: string,
  validCategories: string[],
  validClients: string[],
  validDepartments: string[],
  switcherContext: Map<string, { dept: string; isManagement: boolean }>,
  eventSwitcherNames?: Map<number, string>,
): Promise<
  Array<{
    row: number;
    client: string;
    category: string;
    department: string;
    valid: boolean;
    issues: string[];
  }>
> {
  if (events.length === 0) {
    return [];
  }

  // D-24: Fetch recent override corrections once per batch (not per event)
  // so the LLM learns from user corrections
  const overrideContext = await fetchRecentCorrections(30);

  const systemPrompt = buildSystemPrompt(
    validCategories,
    validClients,
    validDepartments,
    switcherContext,
    overrideContext,
  );

  const responseSchema = buildResponseSchema(validCategories, validDepartments);

  // Build validation sets for outputValidator
  const clientSet = new Set(validClients);
  const categorySet = new Set(validCategories);
  const departmentSet = new Set(validDepartments);

  const allResults: Array<{
    row: number;
    client: string;
    category: string;
    department: string;
    valid: boolean;
    issues: string[];
  }> = [];

  // Process in batches of BATCH_SIZE
  const numBatches = Math.ceil(events.length / BATCH_SIZE);

  for (let batchIdx = 0; batchIdx < numBatches; batchIdx++) {
    const start = batchIdx * BATCH_SIZE;
    const end = Math.min(start + BATCH_SIZE, events.length);
    const batch = events.slice(start, end);

    // Build user message for this batch
    const lines = batch.map((event, i) => {
      const rowNum = start + i;
      const switcherName = eventSwitcherNames?.get(rowNum) ?? "Unknown";
      return `Row ${rowNum}: Switcher: "${switcherName}", Title: "${event.title}", Task: "${event.task_details}", Client field: "${event.client_name_raw}"`;
    });

    const userMessage =
      "Classify these calendar entries:\n\n" + lines.join("\n");

    try {
      const rawResults = await callGemini(
        geminiApiKey,
        systemPrompt,
        userMessage,
        responseSchema,
      );

      // Validate against canonical lists
      const validated = validateClassifications(
        rawResults,
        clientSet,
        categorySet,
        departmentSet,
      );

      for (let i = 0; i < validated.length; i++) {
        const v = validated[i];
        const rawRow = rawResults[i]?.row ?? start + i;
        allResults.push({
          row: rawRow,
          client: v.client_name,
          category: v.category,
          department: v.department,
          valid: v.valid,
          issues: v.issues,
        });
      }
    } catch (error) {
      // If Gemini call fails for this batch, mark all events as invalid
      for (let i = start; i < end; i++) {
        allResults.push({
          row: i,
          client: events[i].client_name_raw,
          category: "Misc",
          department: "",
          valid: false,
          issues: [
            `Gemini API error: ${error instanceof Error ? error.message : String(error)}`,
          ],
        });
      }
    }

    // Rate limit: 6s delay between batches (T-02-10)
    if (batchIdx < numBatches - 1) {
      await delay(BATCH_DELAY_MS);
    }
  }

  return allResults;
}
