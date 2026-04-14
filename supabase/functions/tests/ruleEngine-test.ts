// --- Rule Engine Tests ---
// Deno.test suite for classifyCategory, getDepartment, and classifyEvent.
// TDD RED phase: these tests define the expected behavior before implementation.

import {
  classifyCategory,
  getDepartment,
  classifyEvent,
} from "../_shared/ruleEngine.ts";
import type { ParsedEvent } from "../_shared/types.ts";

import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";

// ============================================================
// classifyCategory Tests — Priority 1: Management Categories
// ============================================================

Deno.test("classifyCategory - Accounts: billing keyword", () => {
  const result = classifyCategory("billing", "");
  assertEquals(result.category, "Accounts");
  assertEquals(result.confidence, "confident");
});

Deno.test("classifyCategory - Accounts: payroll keyword", () => {
  const result = classifyCategory("payroll", "");
  assertEquals(result.category, "Accounts");
  assertEquals(result.confidence, "confident");
});

Deno.test("classifyCategory - Accounts: eom payment keyword", () => {
  const result = classifyCategory("eom payment", "");
  assertEquals(result.category, "Accounts");
  assertEquals(result.confidence, "confident");
});

Deno.test("classifyCategory - Accounts: statements keyword", () => {
  const result = classifyCategory("statements", "");
  assertEquals(result.category, "Accounts");
  assertEquals(result.confidence, "confident");
});

Deno.test("classifyCategory - Operations: business strategy keyword", () => {
  const result = classifyCategory("business strategy", "");
  assertEquals(result.category, "Operations");
  assertEquals(result.confidence, "confident");
});

Deno.test("classifyCategory - Operations: vistage keyword", () => {
  const result = classifyCategory("vistage", "");
  assertEquals(result.category, "Operations");
  assertEquals(result.confidence, "confident");
});

Deno.test("classifyCategory - Management Meeting -> Non-Client Meeting", () => {
  const result = classifyCategory("management meeting", "");
  assertEquals(result.category, "Non-Client Meeting");
  assertEquals(result.confidence, "confident");
});

Deno.test("classifyCategory - Business Development: prospect keyword", () => {
  const result = classifyCategory("prospect", "");
  assertEquals(result.category, "Business Development");
  assertEquals(result.confidence, "confident");
});

Deno.test("classifyCategory - Business Development: quoting keyword", () => {
  const result = classifyCategory("quoting", "");
  assertEquals(result.category, "Business Development");
  assertEquals(result.confidence, "confident");
});

Deno.test("classifyCategory - HR: interview keyword", () => {
  const result = classifyCategory("interview", "");
  assertEquals(result.category, "HR");
  assertEquals(result.confidence, "confident");
});

Deno.test("classifyCategory - HR: quarterly catch-up keyword", () => {
  const result = classifyCategory("quarterly catch-up", "");
  assertEquals(result.category, "HR");
  assertEquals(result.confidence, "confident");
});

Deno.test("classifyCategory - HR: recruitment keyword", () => {
  const result = classifyCategory("recruitment", "");
  assertEquals(result.category, "HR");
  assertEquals(result.confidence, "confident");
});

// ============================================================
// classifyCategory Tests — Priority 2: Brand Writing
// ============================================================

Deno.test("classifyCategory - Brand Writing: brand fundamentals", () => {
  const result = classifyCategory("brand fundamentals", "");
  assertEquals(result.category, "Brand Writing");
  assertEquals(result.confidence, "confident");
});

Deno.test("classifyCategory - Brand Writing: narrative", () => {
  const result = classifyCategory("narrative", "");
  assertEquals(result.category, "Brand Writing");
  assertEquals(result.confidence, "confident");
});

Deno.test("classifyCategory - Brand Writing: brand strategy", () => {
  const result = classifyCategory("brand strategy", "");
  assertEquals(result.category, "Brand Writing");
  assertEquals(result.confidence, "confident");
});

// ============================================================
// classifyCategory Tests — Priority 3: Meetings
// ============================================================

Deno.test("classifyCategory - Non-Client Meeting: agency planning", () => {
  const result = classifyCategory("agency planning", "");
  assertEquals(result.category, "Non-Client Meeting");
  assertEquals(result.confidence, "confident");
});

Deno.test("classifyCategory - Non-Client Meeting: pm standup", () => {
  const result = classifyCategory("pm standup", "");
  assertEquals(result.category, "Non-Client Meeting");
  assertEquals(result.confidence, "confident");
});

Deno.test("classifyCategory - Internal Client Meeting: internal post mortem", () => {
  const result = classifyCategory("internal post mortem", "Kalon");
  assertEquals(result.category, "Internal Client Meeting");
  assertEquals(result.confidence, "confident");
});

Deno.test("classifyCategory - Internal Client Meeting: internal catch up with client", () => {
  const result = classifyCategory("internal catch up", "Levaris");
  assertEquals(result.category, "Internal Client Meeting");
  assertEquals(result.confidence, "confident");
});

Deno.test("classifyCategory - External Client Meeting: weekly meeting with client", () => {
  const result = classifyCategory("weekly meeting", "Levaris");
  assertEquals(result.category, "External Client Meeting");
  assertEquals(result.confidence, "confident");
});

Deno.test("classifyCategory - Non-Client Meeting: weekly meeting with Internal", () => {
  const result = classifyCategory("weekly meeting", "internal");
  assertEquals(result.category, "Non-Client Meeting");
  assertEquals(result.confidence, "confident");
});

Deno.test("classifyCategory - External Client Meeting: catch up with client", () => {
  const result = classifyCategory("catch up", "Sigma");
  assertEquals(result.category, "External Client Meeting");
  assertEquals(result.confidence, "confident");
});

Deno.test("classifyCategory - Non-Client Meeting: catch up with no client", () => {
  const result = classifyCategory("catch up", "");
  assertEquals(result.category, "Non-Client Meeting");
  assertEquals(result.confidence, "confident");
});

Deno.test("classifyCategory - BD: named meeting Lee // Rik", () => {
  const result = classifyCategory("lee // rik", "");
  assertEquals(result.category, "Business Development");
  assertEquals(result.confidence, "confident");
});

Deno.test("classifyCategory - BD: named meeting Francesca Ellul", () => {
  const result = classifyCategory("francesca ellul", "");
  assertEquals(result.category, "Business Development");
  assertEquals(result.confidence, "confident");
});

Deno.test("classifyCategory - External Client Meeting: simon - instasmile", () => {
  const result = classifyCategory("simon - instasmile", "");
  assertEquals(result.category, "External Client Meeting");
  assertEquals(result.confidence, "confident");
});

// ============================================================
// classifyCategory Tests — Priority 4: Emails
// ============================================================

Deno.test("classifyCategory - Emails: emails keyword", () => {
  const result = classifyCategory("emails", "");
  assertEquals(result.category, "Emails");
  assertEquals(result.confidence, "confident");
});

Deno.test("classifyCategory - Emails: inbox management", () => {
  const result = classifyCategory("inbox management", "");
  assertEquals(result.category, "Emails");
  assertEquals(result.confidence, "confident");
});

// ============================================================
// classifyCategory Tests — Priority 5: PM Categories
// ============================================================

Deno.test("classifyCategory - Task management: asana keyword", () => {
  const result = classifyCategory("asana", "");
  assertEquals(result.category, "Task management");
  assertEquals(result.confidence, "confident");
});

Deno.test("classifyCategory - Task management: weekly planning", () => {
  const result = classifyCategory("weekly planning", "");
  assertEquals(result.category, "Task management");
  assertEquals(result.confidence, "confident");
});

// ============================================================
// classifyCategory Tests — Priority 6: Admin
// ============================================================

Deno.test("classifyCategory - Admin: timesheet keyword", () => {
  const result = classifyCategory("timesheet", "");
  assertEquals(result.category, "Admin");
  assertEquals(result.confidence, "confident");
});

Deno.test("classifyCategory - Admin: exact title 'admin'", () => {
  const result = classifyCategory("admin", "");
  assertEquals(result.category, "Admin");
  assertEquals(result.confidence, "confident");
});

// ============================================================
// classifyCategory Tests — Priority 7: QA
// ============================================================

Deno.test("classifyCategory - QA: standalone qa", () => {
  const result = classifyCategory("qa", "");
  assertEquals(result.category, "QA");
  assertEquals(result.confidence, "confident");
});

Deno.test("classifyCategory - QA: internal review", () => {
  const result = classifyCategory("internal review", "");
  assertEquals(result.category, "QA");
  assertEquals(result.confidence, "confident");
});

// ============================================================
// classifyCategory Tests — Priority 8: Brief writing
// ============================================================

Deno.test("classifyCategory - Brief writing: brief keyword", () => {
  const result = classifyCategory("design brief", "");
  assertEquals(result.category, "Brief writing");
  assertEquals(result.confidence, "confident");
});

// ============================================================
// classifyCategory Tests — Priority 9: Brainstorming
// ============================================================

Deno.test("classifyCategory - Brainstorming: brainstorm keyword", () => {
  const result = classifyCategory("brainstorm session", "");
  assertEquals(result.category, "Brainstorming");
  assertEquals(result.confidence, "confident");
});

// ============================================================
// classifyCategory Tests — Priority 10: Research
// ============================================================

Deno.test("classifyCategory - Research: research keyword", () => {
  const result = classifyCategory("research", "");
  assertEquals(result.category, "Research");
  assertEquals(result.confidence, "confident");
});

Deno.test("classifyCategory - Research: podcast keyword", () => {
  const result = classifyCategory("podcast", "");
  assertEquals(result.category, "Research");
  assertEquals(result.confidence, "confident");
});

// ============================================================
// classifyCategory Tests — Priority 11: Project/Catalyst
// ============================================================

Deno.test("classifyCategory - Web Management: scope keyword", () => {
  const result = classifyCategory("scope", "");
  assertEquals(result.category, "Web Management");
  assertEquals(result.confidence, "confident");
});

Deno.test("classifyCategory - Production: catalyst keyword", () => {
  const result = classifyCategory("catalyst project", "");
  assertEquals(result.category, "Production");
  assertEquals(result.confidence, "confident");
});

// ============================================================
// classifyCategory Tests — Priority 12: Marketing Categories
// ============================================================

Deno.test("classifyCategory - Copywriting: copywriting keyword", () => {
  const result = classifyCategory("copywriting", "");
  assertEquals(result.category, "Copywriting");
  assertEquals(result.confidence, "confident");
});

Deno.test("classifyCategory - Copywriting: caption keyword", () => {
  const result = classifyCategory("caption writing", "");
  assertEquals(result.category, "Copywriting");
  assertEquals(result.confidence, "confident");
});

Deno.test("classifyCategory - CC Management: content calendar", () => {
  const result = classifyCategory("content calendar", "");
  assertEquals(result.category, "CC Management");
  assertEquals(result.confidence, "confident");
});

Deno.test("classifyCategory - Email Marketing: newsletter", () => {
  const result = classifyCategory("newsletter", "");
  assertEquals(result.category, "Email Marketing");
  assertEquals(result.confidence, "confident");
});

Deno.test("classifyCategory - Paid Management: campaign keyword", () => {
  const result = classifyCategory("campaign", "");
  assertEquals(result.category, "Paid Management");
  assertEquals(result.confidence, "confident");
});

Deno.test("classifyCategory - Social Media Management: scheduling keyword", () => {
  const result = classifyCategory("scheduling", "");
  assertEquals(result.category, "Social Media Management");
  assertEquals(result.confidence, "confident");
});

Deno.test("classifyCategory - Strategy: strategy keyword", () => {
  const result = classifyCategory("strategy", "");
  assertEquals(result.category, "Strategy");
  assertEquals(result.confidence, "confident");
});

Deno.test("classifyCategory - Web Management: wordpress keyword", () => {
  const result = classifyCategory("wordpress", "");
  assertEquals(result.category, "Web Management");
  assertEquals(result.confidence, "confident");
});

// ============================================================
// classifyCategory Tests — Priority 13: Design Categories
// ============================================================

Deno.test("classifyCategory - Brand Design: visual identity", () => {
  const result = classifyCategory("visual identity", "");
  assertEquals(result.category, "Brand Design");
  assertEquals(result.confidence, "confident");
});

Deno.test("classifyCategory - Production: design keyword", () => {
  const result = classifyCategory("design work", "");
  assertEquals(result.category, "Production");
  assertEquals(result.confidence, "confident");
});

Deno.test("classifyCategory - Web Design: ux keyword", () => {
  const result = classifyCategory("ux wireframes", "");
  assertEquals(result.category, "Web Design");
  assertEquals(result.confidence, "confident");
});

Deno.test("classifyCategory - Motion: animation keyword", () => {
  const result = classifyCategory("animation project", "");
  assertEquals(result.category, "Motion");
  assertEquals(result.confidence, "confident");
});

Deno.test("classifyCategory - Photography: photo shoot", () => {
  const result = classifyCategory("photo shoot", "");
  assertEquals(result.category, "Photography");
  assertEquals(result.confidence, "confident");
});

Deno.test("classifyCategory - Misc Design: illustration keyword", () => {
  const result = classifyCategory("illustration", "");
  assertEquals(result.category, "Misc Design");
  assertEquals(result.confidence, "confident");
});

// ============================================================
// classifyCategory Tests — Priority 14: Other Cross-Department
// ============================================================

Deno.test("classifyCategory - Pitch Work: pitch keyword", () => {
  const result = classifyCategory("pitch preparation", "");
  assertEquals(result.category, "Pitch Work");
  assertEquals(result.confidence, "confident");
});

Deno.test("classifyCategory - Configuring LLM: claude keyword", () => {
  const result = classifyCategory("claude setup", "");
  assertEquals(result.category, "Configuring LLM");
  assertEquals(result.confidence, "confident");
});

// ============================================================
// classifyCategory Tests — Priority 15: Client Admin
// ============================================================

Deno.test("classifyCategory - Client Admin: follow up keyword", () => {
  const result = classifyCategory("follow up", "");
  assertEquals(result.category, "Client Admin");
  assertEquals(result.confidence, "confident");
});

// ============================================================
// classifyCategory Tests — Priority 16: Generic Meetings
// ============================================================

Deno.test("classifyCategory - External Client Meeting: generic meeting with client", () => {
  const result = classifyCategory("meeting", "Levaris");
  assertEquals(result.category, "External Client Meeting");
  assertEquals(result.confidence, "confident");
});

Deno.test("classifyCategory - Non-Client Meeting: generic meeting no client", () => {
  const result = classifyCategory("meeting", "");
  assertEquals(result.category, "Non-Client Meeting");
  assertEquals(result.confidence, "confident");
});

// ============================================================
// classifyCategory Tests — Priority 17: Remaining patterns
// ============================================================

Deno.test("classifyCategory - Social Media Management: event keyword", () => {
  const result = classifyCategory("event setup", "");
  assertEquals(result.category, "Social Media Management");
  assertEquals(result.confidence, "confident");
});

// ============================================================
// classifyCategory Tests — Fallback
// ============================================================

Deno.test("classifyCategory - Misc fallback for no match", () => {
  const result = classifyCategory("zzzunknownzzz", "");
  assertEquals(result.category, "Misc");
  assertEquals(result.confidence, "borderline");
});

// ============================================================
// getDepartment Tests — Rule 1: Management categories
// ============================================================

Deno.test("getDepartment - Accounts always Management", () => {
  const result = getDepartment("Accounts", "billing", "Luke", "Marketing", true);
  assertEquals(result, "Management");
});

Deno.test("getDepartment - Operations always Management", () => {
  const result = getDepartment("Operations", "business strategy", "Richard", "Management", true);
  assertEquals(result, "Management");
});

Deno.test("getDepartment - Business Development always Management", () => {
  const result = getDepartment("Business Development", "prospect meeting", "Ed", "Brand", true);
  assertEquals(result, "Management");
});

Deno.test("getDepartment - HR always Management", () => {
  const result = getDepartment("HR", "interview", "Camille", "PM", false);
  assertEquals(result, "Management");
});

// ============================================================
// getDepartment Tests — Rule 2: Management Meeting
// ============================================================

Deno.test("getDepartment - Management Meeting for management member -> Management", () => {
  const result = getDepartment("Non-Client Meeting", "management meeting", "Luke", "Marketing", true);
  assertEquals(result, "Management");
});

Deno.test("getDepartment - Management Meeting for non-management -> primary dept", () => {
  const result = getDepartment("Non-Client Meeting", "management meeting", "Camille", "PM", false);
  assertEquals(result, "PM");
});

// ============================================================
// getDepartment Tests — Rule 3: Brand Writing
// ============================================================

Deno.test("getDepartment - Brand Writing always Brand", () => {
  const result = getDepartment("Brand Writing", "brand fundamentals", "Luke", "Marketing", true);
  assertEquals(result, "Brand");
});

// ============================================================
// getDepartment Tests — Rule 4: Ed special handling
// ============================================================

Deno.test("getDepartment - Ed Copywriting -> Marketing", () => {
  const result = getDepartment("Copywriting", "caption writing", "Ed", "Brand", true);
  assertEquals(result, "Marketing");
});

Deno.test("getDepartment - Ed Production (design) -> Design", () => {
  const result = getDepartment("Production", "design work", "Ed", "Brand", true);
  assertEquals(result, "Design");
});

Deno.test("getDepartment - Ed Brand Design -> Design", () => {
  const result = getDepartment("Brand Design", "visual identity", "Ed", "Brand", true);
  assertEquals(result, "Design");
});

Deno.test("getDepartment - Ed Strategy -> Brand", () => {
  const result = getDepartment("Strategy", "comms plan", "Ed", "Brand", true);
  assertEquals(result, "Brand");
});

Deno.test("getDepartment - Ed Non-Client Meeting -> Brand", () => {
  const result = getDepartment("Non-Client Meeting", "pm standup", "Ed", "Brand", true);
  assertEquals(result, "Brand");
});

Deno.test("getDepartment - Ed Emails -> Brand", () => {
  const result = getDepartment("Emails", "emails", "Ed", "Brand", true);
  assertEquals(result, "Brand");
});

// ============================================================
// getDepartment Tests — Rule 5: Lisa special handling
// ============================================================

Deno.test("getDepartment - Lisa Task management -> PM", () => {
  const result = getDepartment("Task management", "asana", "Lisa", "Management", true);
  assertEquals(result, "PM");
});

Deno.test("getDepartment - Lisa Client Admin -> PM", () => {
  const result = getDepartment("Client Admin", "client email", "Lisa", "Management", true);
  assertEquals(result, "PM");
});

Deno.test("getDepartment - Lisa Copywriting -> Management", () => {
  const result = getDepartment("Copywriting", "caption", "Lisa", "Management", true);
  assertEquals(result, "Management");
});

Deno.test("getDepartment - Lisa Emails -> Management", () => {
  const result = getDepartment("Emails", "emails", "Lisa", "Management", true);
  assertEquals(result, "Management");
});

// ============================================================
// getDepartment Tests — Rule 6: Designers
// ============================================================

Deno.test("getDepartment - Designer Copywriting -> Design", () => {
  const result = getDepartment("Copywriting", "caption", "Andrea", "Design", true);
  assertEquals(result, "Design");
});

Deno.test("getDepartment - Designer Production -> Design", () => {
  const result = getDepartment("Production", "design visuals", "Nella", "Design", false);
  assertEquals(result, "Design");
});

Deno.test("getDepartment - Designer Emails -> Design", () => {
  const result = getDepartment("Emails", "emails", "Naomi", "Design", false);
  assertEquals(result, "Design");
});

Deno.test("getDepartment - Designer Accounts -> Management", () => {
  const result = getDepartment("Accounts", "billing", "Andrea", "Design", true);
  assertEquals(result, "Management");
});

Deno.test("getDepartment - Designer Management Meeting -> Management", () => {
  const result = getDepartment("Non-Client Meeting", "management meeting", "Andrea", "Design", true);
  assertEquals(result, "Management");
});

// ============================================================
// getDepartment Tests — Rule 7: Everyone else
// ============================================================

Deno.test("getDepartment - PM person doing Production -> Design", () => {
  const result = getDepartment("Production", "design work", "Camille", "PM", false);
  assertEquals(result, "Design");
});

Deno.test("getDepartment - Marketing person doing Emails -> Marketing", () => {
  const result = getDepartment("Emails", "emails", "Luke", "Marketing", true);
  assertEquals(result, "Marketing");
});

Deno.test("getDepartment - PM person doing Emails -> PM", () => {
  const result = getDepartment("Emails", "emails", "Camille", "PM", false);
  assertEquals(result, "PM");
});

Deno.test("getDepartment - Marketing person doing Task management -> Marketing", () => {
  const result = getDepartment("Task management", "asana", "Kim", "Marketing", false);
  assertEquals(result, "Marketing");
});

Deno.test("getDepartment - Brand Writing for any switcher -> Brand", () => {
  const result = getDepartment("Brand Writing", "narrative", "Camille", "PM", false);
  assertEquals(result, "Brand");
});

// ============================================================
// classifyEvent Tests
// ============================================================

function makeParsedEvent(overrides: Partial<ParsedEvent> = {}): ParsedEvent {
  return {
    google_event_id: "test-id",
    recurring_event_id: null,
    title: "Levaris | Design Work",
    client_name_raw: "Levaris",
    task_details: "Design Work",
    description: null,
    attendees: null,
    start_at: "2026-02-23T09:00:00+01:00",
    end_at: "2026-02-23T10:00:00+01:00",
    duration_minutes: 60,
    event_date: "2026-02-23",
    day_of_week: 0,
    off_schedule: false,
    temporal_status: "completed",
    ...overrides,
  };
}

Deno.test("classifyEvent - rule classification with Production", () => {
  const event = makeParsedEvent({
    task_details: "design visuals",
    client_name_raw: "Levaris",
  });
  const result = classifyEvent(event, "Andrea", "Design", true);
  assertEquals(result.category, "Production");
  assertEquals(result.classification_method, "rule");
  assertEquals(result.rule_confidence, "confident");
  assertEquals(result.department, "Design");
});

Deno.test("classifyEvent - Misc classification method is 'misc'", () => {
  const event = makeParsedEvent({
    task_details: "zzzunknownzzz",
    client_name_raw: "",
  });
  const result = classifyEvent(event, "Luke", "Marketing", true);
  assertEquals(result.category, "Misc");
  assertEquals(result.classification_method, "misc");
  assertEquals(result.rule_confidence, "borderline");
});

Deno.test("classifyEvent - Ed copywriting -> Marketing department", () => {
  const event = makeParsedEvent({
    task_details: "caption writing for social",
    client_name_raw: "Levaris",
  });
  const result = classifyEvent(event, "Ed", "Brand", true);
  assertEquals(result.category, "Copywriting");
  assertEquals(result.department, "Marketing");
  assertEquals(result.classification_method, "rule");
});

Deno.test("classifyEvent - Lisa task management -> PM department", () => {
  const event = makeParsedEvent({
    task_details: "asana tasks",
    client_name_raw: "Internal",
  });
  const result = classifyEvent(event, "Lisa", "Management", true);
  assertEquals(result.category, "Task management");
  assertEquals(result.department, "PM");
  assertEquals(result.classification_method, "rule");
});
