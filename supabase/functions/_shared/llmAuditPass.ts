// --- LLM Audit Pass ---
// Gemini 2.5 Flash review of rule-classified events (D-07, D-08).
// Reviews ALL borderline events + 10% random sample of confident events.
// Corrections are validated via outputValidator.ts before acceptance (T-02-08).

import { validateClassifications } from "./outputValidator.ts";

// ============================================================
// Types
// ============================================================

export interface AuditResult {
  event_id: string;
  original_category: string;
  original_department: string;
  corrected_category: string | null;
  corrected_department: string | null;
  agrees: boolean;
  reasoning: string;
}

interface AuditInput {
  event_id: string;
  title: string;
  task_details: string;
  client_name: string;
  switcher_name: string;
  rule_category: string;
  rule_department: string;
  rule_confidence: "confident" | "borderline";
}

// ============================================================
// Constants
// ============================================================

const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

const AUDIT_BATCH_SIZE = 80;

const BATCH_DELAY_MS = 6000; // 6s between batches (respects 10 RPM free tier)

// ============================================================
// Audit System Prompt
// ============================================================

function buildAuditPrompt(
  validCategories: string[],
  validDepartments: string[],
): string {
  return `You are a timesheet classification auditor for Switch, a creative agency in Malta.

You are reviewing events that were classified by a rule-based engine. For each event, you see the original rule classification. Your job is to verify whether the classification is correct.

For each event:
- If the rule classification is CORRECT, set "agrees" to true and provide brief reasoning.
- If the rule classification is INCORRECT, set "agrees" to false, provide the corrected category and/or department, and explain your reasoning.

## VALID TASK CATEGORIES:
${validCategories.join(", ")}

## VALID DEPARTMENTS:
${validDepartments.join(", ")}

## DEPARTMENT ASSIGNMENT RULES:
1. Accounts, Operations, Business Development, HR -> always "Management"
2. "Management Meeting" task -> "Management" for management members (Richard, Melissa, Ed, Lisa, Luke, Andrea)
3. Brand Writing -> always "Brand"
4. Ed: Copywriting->Marketing, Design categories->Design, Strategy->Brand, everything else->Brand
5. Lisa: Task management/Client Admin->PM, everything else->Management
6. Designers (Andrea, Nella, Naomi, Laura P): almost everything->Design, only Management categories->Management
7. Everyone else: Design categories stay "Design", cross-department categories->Switcher's primary department

## KEY CONTEXT:
- "WRH" = Levaris
- "TL" = Thought Leadership = Copywriting
- "NL" = Newsletter = Email Marketing
- "CC" in task context = Content Calendar = CC Management
- "CMO" meetings are External Client Meetings
- Named person-to-person meetings with no client = Non-Client Meeting
- "Catalyst" is a Levaris product

Review each event carefully. Only disagree if the classification is clearly wrong.`;
}

// ============================================================
// Response schema for audit
// ============================================================

function buildAuditResponseSchema(
  validCategories: string[],
  validDepartments: string[],
): Record<string, unknown> {
  return {
    type: "ARRAY",
    items: {
      type: "OBJECT",
      properties: {
        row: { type: "INTEGER" },
        agrees: { type: "BOOLEAN" },
        corrected_category: {
          type: "STRING",
          enum: validCategories,
        },
        corrected_department: {
          type: "STRING",
          enum: validDepartments,
        },
        reasoning: { type: "STRING" },
      },
      required: ["row", "agrees", "reasoning"],
    },
  };
}

// ============================================================
// Gemini API call for audit
// ============================================================

async function callGeminiAudit(
  apiKey: string,
  systemPrompt: string,
  userMessage: string,
  responseSchema: Record<string, unknown>,
): Promise<
  Array<{
    row: number;
    agrees: boolean;
    corrected_category?: string;
    corrected_department?: string;
    reasoning: string;
  }>
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
    throw new Error(`Gemini Audit API error (${resp.status}): ${errorBody}`);
  }

  const body = await resp.json();
  const candidates = body.candidates ?? [];
  if (candidates.length === 0) {
    throw new Error(
      `Gemini audit returned no candidates: ${JSON.stringify(body).slice(0, 500)}`,
    );
  }

  const parts = candidates[0]?.content?.parts ?? [];
  if (parts.length === 0) {
    throw new Error(
      `Gemini audit returned no parts: ${JSON.stringify(body).slice(0, 500)}`,
    );
  }

  const text = parts[0].text;
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Gemini audit returned invalid JSON: ${text.slice(0, 200)}`);
  }
}

// ============================================================
// Delay helper
// ============================================================

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================================
// Main audit function
// ============================================================

/**
 * Audit rule-classified events using Gemini 2.5 Flash.
 *
 * Receives events that were selected for audit (all borderline +
 * 10% random sample of confident events -- selection done by the
 * sync orchestrator). Reviews each classification and returns
 * agreement/disagreement with reasoning.
 *
 * When the LLM disagrees, corrected values are validated against
 * canonical lists via outputValidator.ts. Invalid corrections are
 * rejected (treated as agreement with the original classification).
 *
 * @param eventsToAudit - Events with their rule classifications
 * @param geminiApiKey - Gemini API key (from Deno.env.get, never logged)
 * @param validCategories - Canonical category names
 * @param validClients - Canonical client names
 * @param validDepartments - Canonical department names
 * @returns Array of AuditResult with agrees flag and optional corrections
 */
export async function auditRuleClassifications(
  eventsToAudit: AuditInput[],
  geminiApiKey: string,
  validCategories: string[],
  validClients: string[],
  validDepartments: string[],
): Promise<AuditResult[]> {
  if (eventsToAudit.length === 0) {
    return [];
  }

  const systemPrompt = buildAuditPrompt(validCategories, validDepartments);
  const responseSchema = buildAuditResponseSchema(
    validCategories,
    validDepartments,
  );

  // Validation sets
  const clientSet = new Set(validClients);
  const categorySet = new Set(validCategories);
  const departmentSet = new Set(validDepartments);

  const allResults: AuditResult[] = [];

  // Process in batches
  const numBatches = Math.ceil(eventsToAudit.length / AUDIT_BATCH_SIZE);

  for (let batchIdx = 0; batchIdx < numBatches; batchIdx++) {
    const start = batchIdx * AUDIT_BATCH_SIZE;
    const end = Math.min(start + AUDIT_BATCH_SIZE, eventsToAudit.length);
    const batch = eventsToAudit.slice(start, end);

    // Build user message
    const lines = batch.map((event, i) => {
      const rowNum = start + i;
      return (
        `Row ${rowNum}: Switcher: ${event.switcher_name}, ` +
        `Title: "${event.title}", Task: "${event.task_details}", ` +
        `Client: "${event.client_name}", ` +
        `Rule Category: "${event.rule_category}", ` +
        `Rule Department: "${event.rule_department}", ` +
        `Confidence: ${event.rule_confidence}`
      );
    });

    const userMessage =
      "Review these rule-classified events:\n\n" + lines.join("\n");

    try {
      const rawResults = await callGeminiAudit(
        geminiApiKey,
        systemPrompt,
        userMessage,
        responseSchema,
      );

      // Build a lookup from the batch keyed by expected row numbers
      const eventLookup = new Map<number, AuditInput>();
      for (let i = 0; i < batch.length; i++) {
        eventLookup.set(start + i, batch[i]);
      }

      for (const r of rawResults) {
        const rowIdx = r.row ?? -1;
        const eventRef = eventLookup.get(rowIdx);
        if (!eventRef) {
          // LLM returned an unrecognized row index -- skip this result
          continue;
        }

        if (r.agrees) {
          // LLM agrees with rule classification
          allResults.push({
            event_id: eventRef.event_id,
            original_category: eventRef.rule_category,
            original_department: eventRef.rule_department,
            corrected_category: null,
            corrected_department: null,
            agrees: true,
            reasoning: r.reasoning,
          });
        } else {
          // LLM disagrees -- validate corrected values
          const correctedCategory = r.corrected_category ?? eventRef.rule_category;
          const correctedDepartment =
            r.corrected_department ?? eventRef.rule_department;

          // Validate corrections against canonical lists
          const validated = validateClassifications(
            [
              {
                row: 0,
                client: eventRef.client_name,
                category: correctedCategory,
                department: correctedDepartment,
              },
            ],
            clientSet,
            categorySet,
            departmentSet,
          );

          const v = validated[0];

          if (v.valid) {
            // Correction is valid -- accept it
            allResults.push({
              event_id: eventRef.event_id,
              original_category: eventRef.rule_category,
              original_department: eventRef.rule_department,
              corrected_category: v.category,
              corrected_department: v.department,
              agrees: false,
              reasoning: r.reasoning,
            });
          } else {
            // Correction contains invalid values -- reject and treat as agree
            allResults.push({
              event_id: eventRef.event_id,
              original_category: eventRef.rule_category,
              original_department: eventRef.rule_department,
              corrected_category: null,
              corrected_department: null,
              agrees: true,
              reasoning: `LLM correction rejected (${v.issues.join("; ")}). Original classification retained.`,
            });
          }
        }
      }
    } catch (error) {
      // If audit fails, treat all events as agreed (no correction)
      for (const event of batch) {
        allResults.push({
          event_id: event.event_id,
          original_category: event.rule_category,
          original_department: event.rule_department,
          corrected_category: null,
          corrected_department: null,
          agrees: true,
          reasoning: `Audit skipped due to error: ${error instanceof Error ? error.message : String(error)}`,
        });
      }
    }

    // Rate limit between batches
    if (batchIdx < numBatches - 1) {
      await delay(BATCH_DELAY_MS);
    }
  }

  return allResults;
}
