// --- Rule Engine ---
// TypeScript port of process_export.py classify_category() and get_department().
// Faithfully reproduces the 17-priority classification sequence from
// instructions.md and process_export.py.

import type { ParsedEvent, ClassificationResult } from "./types.ts";
import { resolveClientAlias, isNonClientName } from "./aliasResolver.ts";

// ============================================================
// Category Classification Result
// ============================================================

interface CategoryResult {
  category: string;
  confidence: "confident" | "borderline";
}

// ============================================================
// Keyword Sets
// ============================================================

// --- Priority 1: Management-Department Categories ---

const ACCOUNTS_KEYWORDS = [
  "billing",
  "payroll",
  "payments and payroll",
  "2025 accounts",
  "eom payment",
  "eom forecast",
  "download bank statement",
  "monthly invoice",
  "statements",
  "payments",
  "end of month",
  "accounts",
];

const OPERATIONS_KEYWORDS = [
  "business strategy",
  "finance meeting",
  "vistage",
  "finance",
];

const BD_KEYWORDS = [
  "prospect",
  "quoting",
  "business development",
  "bd",
  "commercial engine",
];

const BD_NAMED_MEETINGS = [
  "lee // rik",
  "francesca ellul",
  "gilbert",
  "let's sync",
  "let's synk",
  "soledarjeta",
  "solidarjeta",
  "duane",
  "zampa",
  "jennifer // richard",
  "francesca // rik",
  "mark // richard",
  "wise pirates",
  "kurt vella",
  "daniela",
  "intro: richard",
  "switch & lewis",
  "wrh: switch & lewis",
];

const HR_KEYWORDS = [
  "interview",
  "quarterly catch-up",
  "recruitment",
  "hr",
];

// --- Priority 2: Brand Writing ---

const BRAND_WRITING_KEYWORDS = [
  "brand fundamentals",
  "narrative",
  "brand strategy",
  "brand writing",
  "brand process",
];

// --- Priority 3: Meetings ---

const INTERNAL_MEETINGS = [
  "agency planning",
  "pm standup",
  "client roundup",
  "marketing/pm catch-up",
  "marketing team check-in",
  "design & pm",
  "pm - billing",
  "ed's birthday",
  "switch catch up",
  "ed & luke",
  "ed & ernesta",
  "nella / andrea",
  "naomi / andrea",
  "laura / andrea",
  "nella / steve",
  "steve / nella",
  "kat & fan",
  "lisa&mel weekly",
  "luke & rik",
  "luke&mel",
  "rik & mel",
  "marketing catch-up",
  "marketing meeting",
  "antigravity project",
  "check forecast",
  "forecats",
  "new claude setup",
  "switch ai doc",
  "mastering capacity planning",
  "laura's presentation",
  "seo/aeo",
  "aeo research",
  "geo article",
  "sb4 group meeting",
  "ed & pm team",
  "ed & kim",
  "switch segment",
  "segment",
  "leadership",
  "leadership (cont.)",
  "switch off",
  "switch brand",
  "birthday celebration",
  "birthday",
  "laura c's birthday",
  "naomi's birthday",
  "ernesta's & cam's birthday",
  "ed's birthday celebration",
  "handover",
  "misc - camfan",
  "task delegation",
  "task handover",
  "cmos and organic growth",
  "rebrand",
  "switch (to the) new brand",
  "ernesta & luke",
  "kim & luke",
  "lisa & fan",
  "andrea & mel",
  "ed & mel",
  "mel & rik",
  "ed / rik",
  "maria & mel",
  "pm questions",
];

const INTERNAL_CLIENT_MEETING_KEYWORDS = [
  "internal catch up",
  "internal meeting",
  "internal weekly",
  "internal pm",
];

const WEEKLY_MEETING_KEYWORDS = [
  "weekly meeting",
  "weekly catch up",
  "weekly catchup",
  "weekly call",
  "weekly check",
];

const CATCHUP_KEYWORDS = [
  "catchup",
  "catch-up",
  "catch up",
  "check-in",
  "client check-in",
];

// --- Priority 4: Emails ---

const EMAILS_KEYWORDS = [
  "emails",
  "email",
  "inbox management",
  "messages",
  "emails & briefs",
  "emails or urgent task",
  "small tasks & emails",
  "email & asana",
  "emails and briefs",
  "correspondence",
  "mailbox",
  "inbox",
  "small tasks",
];

// --- Priority 5: PM Categories ---

const TASK_MANAGEMENT_KEYWORDS = [
  "task management",
  "asana",
  "calendar management",
  "weekly planning",
  "daily planning",
  "next week planning",
  "action item",
  "post meeting action",
  "post meeting tasks",
  "check studio and marketing calendars",
  "calendar setup",
  "self organisation",
  "team calendar organisation",
  "calendar juggling",
];

const CLIENT_ADMIN_SPECIFIC = ["client email"];

// --- Priority 6: Admin ---

const ADMIN_KEYWORDS = ["timesheet", "update timesheet", "dashlane"];

// --- Priority 8: Brief writing ---
// (checked for "brief", "briefing" but NOT when "emails" is also present)

// --- Priority 10: Research ---

const RESEARCH_KEYWORDS = ["research", "podcasts", "podcast"];

// --- Priority 12: Marketing Categories ---

const COPYWRITING_KEYWORDS = [
  "copywriting",
  "copy writing",
  "caption",
  "news article",
  "article",
  "case study",
  "blog",
  "copy",
  "content",
  "thought leadership",
  "ebook",
  "white paper",
];

const REPORTING_KEYWORDS = [
  "compiling report",
  "report analysis",
  "reporting",
  "weekly reporting",
  "switch in numbers",
];

const CC_MANAGEMENT_KEYWORDS = [
  "3-month plan",
  "cc skeleton",
  "content calendar",
  "moving posts",
  "add post to cc",
  "cc march",
];

const CC_MANAGEMENT_EXACT = ["cc", "palazzo cc"];

const EMAIL_MARKETING_KEYWORDS = ["newsletter", "drip campaign"];

const PAID_MANAGEMENT_KEYWORDS = [
  "campaign",
  "ad setup",
  "post boost",
  "boost",
  "ad spend",
  "li campaign",
  "boosting",
];

const SOCIAL_MEDIA_KEYWORDS = [
  "scheduling",
  "posting",
  "schedule march",
  "schedule ed",
  "publishing on socials",
  "rebrand socials",
  "check austin's li",
  "share reel",
  "li check-in",
];

const SOCIAL_MEDIA_EXACT = ["posts", "tl posts"];

const STRATEGY_KEYWORDS = [
  "strategy",
  "comms plan",
  "thinking & strategy",
  "optimization roadmap",
  "budgeting",
  "retainers",
  "pricing",
];

const CRM_KEYWORDS = ["hubspot", "crm"];

const DIRECTORY_KEYWORDS = ["director"];

const WEB_MANAGEMENT_KEYWORDS = [
  "wordpress",
  "cms update",
  "web management",
  "web page",
  "landing page",
  "website",
  "upload",
  "contact page",
  "one pager",
  "ga account",
  "google ad account",
];

// --- Priority 13: Design Categories ---

const BRAND_DESIGN_KEYWORDS = ["visual identity", "brand formal"];

const PRODUCTION_KEYWORDS = [
  "design",
  "visuals",
  "visual",
  "resize",
  "artwork",
  "reel",
  "brochure",
  "signage",
  "poster",
  "infographic",
  "banner",
  "menu",
  "place cards",
  "collateral",
  "formatting",
  "flight schedule",
  "link march",
  "mialink",
  "guest posts",
  "art memes",
  "changes & output",
  "changes and output",
  "changes & outputs",
  "changes and outputs",
  "promo",
  "small change",
  "design safety time",
  "template for slide",
  "safety time",
  "pending tasks",
  "video work",
];

const WEB_DESIGN_KEYWORDS = [
  "ux",
  "wireframing",
  "ui design",
  "front end design",
];

const MOTION_KEYWORDS = ["animation", "motion", "video edit"];

const PHOTOGRAPHY_KEYWORDS = [
  "photo shoot",
  "photo editing",
  "photos",
  "get photos",
  "image selection",
];

const MISC_DESIGN_KEYWORDS = [
  "illustration",
  "moodboard",
  "storyboard",
  "collecting files",
];

// --- Priority 14: Other Cross-Department ---

const PITCH_WORK_KEYWORDS = [
  "pitch",
  "proposal",
  "presentation",
  "sales deck",
  "specifi",
];

const CONFIGURING_LLM_KEYWORDS = [
  "claude",
  "llm",
  "customgpt",
  "gem ",
  "prompt generation",
  "aicom",
  "ai doc",
  "ai white paper",
  "ai insights",
];

// --- Priority 15: Client Admin (catch-all) ---

const CLIENT_ADMIN_CATCHALL_KEYWORDS = [
  "send signature",
  "set up cmo",
  "send",
  "check sponsors",
  "reminder",
  "f/u",
  "follow up",
  "follow-up",
  "chase",
  "bbi",
  "connexion",
  "print",
  "sourcing",
  "signature",
  "set up",
  "configure",
  "fast news",
  "retainer doc",
  "whatsapp",
  "training programme",
  "add column",
  "prep call",
  "fop",
  "agenda numbers",
  "google access",
  "reminder email",
];

// --- Internal Catch-All Keywords (D-18) ---
// Events with these generic/internal titles classify as Internal client
// instead of falling to Unknown/Misc

const INTERNAL_CATCH_ALL_KEYWORDS: string[] = [
  "changes & output",
  "changes and output",
  "inbox",
  "inbox management",
  "emails",
  "email",
  "hr admin",
  "small tasks",
  "buffer time",
  "downtime",
  "admin",
  "internal",
];

// --- Priority 16: Generic Meetings ---

const GENERIC_MEETING_KEYWORDS = [
  "meeting",
  "call",
  "chat",
  "sync",
  "jamie",
  "teams with",
  "webinar",
  "registration confirmed",
  "festival of place",
];

// ============================================================
// Helper functions
// ============================================================

function containsAny(text: string, keywords: string[]): boolean {
  for (const kw of keywords) {
    if (text.includes(kw)) {
      return true;
    }
  }
  return false;
}

function isExactOrStartsWith(text: string, word: string): boolean {
  return text === word || text.startsWith(word + " ");
}

function hasClient(client: string): boolean {
  const cl = client.toLowerCase().trim();
  return cl !== "" && cl !== "internal";
}

function isStandaloneWord(text: string, word: string): boolean {
  // Check if word appears as a standalone word in text
  const padded = ` ${text} `;
  return padded.includes(` ${word} `);
}

// ============================================================
// classifyCategory
// ============================================================

/**
 * Classify a task's category based on task details and client context.
 * Implements the exact 17-priority classification sequence from
 * instructions.md and process_export.py.
 *
 * @param taskDetails - The task details portion of the event title
 * @param clientRaw - The raw client name (before alias resolution)
 * @returns Category and confidence signal
 */
export function classifyCategory(
  taskDetails: string,
  clientRaw: string,
): CategoryResult {
  const td = taskDetails.toLowerCase().trim();
  const cl = clientRaw.toLowerCase().trim();

  // --- PRIORITY 1: Management-Department Categories ---

  // Accounts
  if (containsAny(td, ACCOUNTS_KEYWORDS)) {
    return { category: "Accounts", confidence: "confident" };
  }

  // Management Meeting -> Non-Client Meeting (dept override handled by getDepartment)
  if (td.includes("management meeting")) {
    return { category: "Non-Client Meeting", confidence: "confident" };
  }

  // Operations
  if (containsAny(td, OPERATIONS_KEYWORDS)) {
    return { category: "Operations", confidence: "confident" };
  }

  // Business Development - named meetings first
  for (const nm of BD_NAMED_MEETINGS) {
    if (td.includes(nm)) {
      // simon - instasmile is an External Client Meeting, not BD
      if (nm.includes("instasmile") || td.includes("instasmile")) {
        return { category: "External Client Meeting", confidence: "confident" };
      }
      return { category: "Business Development", confidence: "confident" };
    }
  }

  // Business Development - keywords
  if (containsAny(td, BD_KEYWORDS)) {
    return { category: "Business Development", confidence: "confident" };
  }

  // PR support -> Business Development
  if (td.includes("pr support")) {
    return { category: "Business Development", confidence: "confident" };
  }

  // HR
  if (containsAny(td, HR_KEYWORDS)) {
    return { category: "HR", confidence: "confident" };
  }

  // --- PRIORITY 2: Brand Writing ---
  if (containsAny(td, BRAND_WRITING_KEYWORDS)) {
    return { category: "Brand Writing", confidence: "confident" };
  }

  // --- PRIORITY 3: Meetings ---

  // Non-Client Meetings (internal, not about specific clients)
  for (const kw of INTERNAL_MEETINGS) {
    if (td.includes(kw)) {
      return { category: "Non-Client Meeting", confidence: "confident" };
    }
  }

  // PH (public holiday)
  if (td === "ph") {
    return { category: "Non-Client Meeting", confidence: "confident" };
  }

  // Internal Post Mortem -> Internal Client Meeting
  if (td.includes("internal post mortem")) {
    return { category: "Internal Client Meeting", confidence: "confident" };
  }

  // Post mortem / postmortem
  if (td.includes("post mortem") || td.includes("postmortem")) {
    if (cl === "internal" || cl === "") {
      return { category: "Non-Client Meeting", confidence: "confident" };
    }
    return { category: "Internal Client Meeting", confidence: "confident" };
  }

  // Internal Client Meeting keywords
  if (containsAny(td, INTERNAL_CLIENT_MEETING_KEYWORDS)) {
    return { category: "Internal Client Meeting", confidence: "confident" };
  }

  // Weekly meeting variants
  if (containsAny(td, WEEKLY_MEETING_KEYWORDS)) {
    if (cl === "internal") {
      return { category: "Non-Client Meeting", confidence: "confident" };
    }
    return { category: "External Client Meeting", confidence: "confident" };
  }

  // Catchup / check-in variants
  if (containsAny(td, CATCHUP_KEYWORDS)) {
    if (cl === "internal" || cl === "") {
      return { category: "Non-Client Meeting", confidence: "confident" };
    }
    return { category: "External Client Meeting", confidence: "confident" };
  }

  // --- PRIORITY 4: Emails ---
  if (containsAny(td, EMAILS_KEYWORDS)) {
    return { category: "Emails", confidence: "confident" };
  }

  // --- PRIORITY 5: PM Categories ---

  // Task management
  if (containsAny(td, TASK_MANAGEMENT_KEYWORDS)) {
    return { category: "Task management", confidence: "confident" };
  }

  // "calendar" standalone
  if (isStandaloneWord(td, "calendar") || td === "calendar") {
    return { category: "Task management", confidence: "confident" };
  }

  // Client Admin specific
  if (containsAny(td, CLIENT_ADMIN_SPECIFIC)) {
    return { category: "Client Admin", confidence: "confident" };
  }

  // --- PRIORITY 6: Admin ---
  if (containsAny(td, ADMIN_KEYWORDS)) {
    return { category: "Admin", confidence: "confident" };
  }
  if (td === "admin" || td === "account" || td.startsWith("admin ")) {
    return { category: "Admin", confidence: "confident" };
  }

  // --- PRIORITY 7: QA ---
  if (
    isStandaloneWord(td, "qa") ||
    td === "qa" ||
    td.startsWith("qa ") ||
    td.includes("internal qa") ||
    td.includes("internal review")
  ) {
    return { category: "QA", confidence: "confident" };
  }
  if (
    td.includes("review") &&
    !td.includes("strategy") &&
    !td.includes("post mortem")
  ) {
    return { category: "QA", confidence: "confident" };
  }

  // --- PRIORITY 8: Brief writing ---
  if (
    (td.includes("brief") || td.includes("briefing")) &&
    !td.includes("emails")
  ) {
    return { category: "Brief writing", confidence: "confident" };
  }

  // --- PRIORITY 9: Brainstorming ---
  if (td.includes("brainstorm")) {
    return { category: "Brainstorming", confidence: "confident" };
  }

  // --- PRIORITY 10: Research ---
  if (containsAny(td, RESEARCH_KEYWORDS)) {
    return { category: "Research", confidence: "confident" };
  }

  // --- PRIORITY 11: Project / Catalyst work (check BEFORE marketing) ---
  if (td.includes("scope") || td.includes("sitemap")) {
    return { category: "Web Management", confidence: "confident" };
  }
  if (td.includes("catalyst") || (td.includes("project") && td.includes("-"))) {
    return { category: "Production", confidence: "confident" };
  }

  // --- PRIORITY 12: Marketing Categories ---

  // Copywriting (check before generic marketing to avoid false matches)
  // TL = Thought Leadership = Copywriting
  if (containsAny(td, COPYWRITING_KEYWORDS) || td.includes("fyorin tl") || td.includes("tl ")) {
    return { category: "Copywriting", confidence: "confident" };
  }

  // Reporting
  if (containsAny(td, REPORTING_KEYWORDS)) {
    return { category: "Reporting", confidence: "confident" };
  }
  // Newsletter + report = Reporting (not Email Marketing)
  if (td.includes("newsletter") && td.includes("report")) {
    return { category: "Reporting", confidence: "confident" };
  }

  // CC Management
  if (containsAny(td, CC_MANAGEMENT_KEYWORDS)) {
    return { category: "CC Management", confidence: "confident" };
  }
  if (CC_MANAGEMENT_EXACT.includes(td)) {
    return { category: "CC Management", confidence: "confident" };
  }

  // Email Marketing
  if (containsAny(td, EMAIL_MARKETING_KEYWORDS)) {
    return { category: "Email Marketing", confidence: "confident" };
  }

  // Paid Management
  if (containsAny(td, PAID_MANAGEMENT_KEYWORDS)) {
    return { category: "Paid Management", confidence: "confident" };
  }

  // Social Media Management
  if (containsAny(td, SOCIAL_MEDIA_KEYWORDS)) {
    return { category: "Social Media Management", confidence: "confident" };
  }
  if (SOCIAL_MEDIA_EXACT.includes(td)) {
    return { category: "Social Media Management", confidence: "confident" };
  }

  // Strategy
  if (containsAny(td, STRATEGY_KEYWORDS)) {
    return { category: "Strategy", confidence: "confident" };
  }

  // CRM Management
  if (containsAny(td, CRM_KEYWORDS)) {
    return { category: "CRM Management", confidence: "confident" };
  }

  // Directory Management
  if (containsAny(td, DIRECTORY_KEYWORDS)) {
    return { category: "Directory Management", confidence: "confident" };
  }

  // Web Management
  if (containsAny(td, WEB_MANAGEMENT_KEYWORDS)) {
    return { category: "Web Management", confidence: "confident" };
  }

  // --- PRIORITY 13: Design Categories ---

  // Brand Design
  if (containsAny(td, BRAND_DESIGN_KEYWORDS)) {
    return { category: "Brand Design", confidence: "confident" };
  }

  // Production
  if (containsAny(td, PRODUCTION_KEYWORDS)) {
    return { category: "Production", confidence: "confident" };
  }

  // Web Design
  if (containsAny(td, WEB_DESIGN_KEYWORDS)) {
    return { category: "Web Design", confidence: "confident" };
  }

  // Motion
  if (containsAny(td, MOTION_KEYWORDS)) {
    return { category: "Motion", confidence: "confident" };
  }

  // Photography
  if (containsAny(td, PHOTOGRAPHY_KEYWORDS)) {
    return { category: "Photography", confidence: "confident" };
  }

  // Misc Design
  if (containsAny(td, MISC_DESIGN_KEYWORDS)) {
    return { category: "Misc Design", confidence: "confident" };
  }

  // --- PRIORITY 14: Other Cross-Department ---

  // Pitch Work
  if (containsAny(td, PITCH_WORK_KEYWORDS)) {
    return { category: "Pitch Work", confidence: "confident" };
  }

  // Configuring LLM
  if (containsAny(td, CONFIGURING_LLM_KEYWORDS)) {
    return { category: "Configuring LLM", confidence: "confident" };
  }

  // --- PRIORITY 15: Client Admin (catch-all for generic client work) ---
  if (containsAny(td, CLIENT_ADMIN_CATCHALL_KEYWORDS)) {
    return { category: "Client Admin", confidence: "confident" };
  }

  // --- PRIORITY 15.5: CMO meetings ---
  if (td.includes("furnitubes cmo") || td === "cmo") {
    return { category: "External Client Meeting", confidence: "confident" };
  }

  // --- PRIORITY 16: Generic Meetings ---
  if (containsAny(td, GENERIC_MEETING_KEYWORDS)) {
    if (cl === "internal" || cl === "") {
      return { category: "Non-Client Meeting", confidence: "confident" };
    }
    return { category: "External Client Meeting", confidence: "confident" };
  }

  // --- PRIORITY 17: Remaining patterns ---

  // "event" -> Social Media Management
  if (td.includes("event")) {
    return { category: "Social Media Management", confidence: "confident" };
  }

  // "forty for 40" -> Production
  if (td.includes("forty for 40")) {
    return { category: "Production", confidence: "confident" };
  }

  // "pp lecture" -> External Client Meeting
  if (td.includes("pp lecture")) {
    return { category: "External Client Meeting", confidence: "confident" };
  }

  // "book time" -> Task management
  if (td.includes("book time")) {
    return { category: "Task management", confidence: "confident" };
  }

  // Generic client name as title -> External Client Meeting
  if (hasClient(cl)) {
    return { category: "External Client Meeting", confidence: "confident" };
  }

  // "stuff" -> Client Admin
  if (td.includes("stuff")) {
    return { category: "Client Admin", confidence: "confident" };
  }

  // --- Internal Catch-All (D-18) ---
  // Events with generic/internal titles classify as Internal client
  // instead of falling to Unknown/Misc
  if (containsAny(td, INTERNAL_CATCH_ALL_KEYWORDS)) {
    return { category: "Administration", confidence: "confident" };
  }

  // --- FALLBACK ---
  return { category: "Misc", confidence: "borderline" };
}

// ============================================================
// Department Category Sets
// ============================================================

/** Categories that ALWAYS map to Management department */
const MANAGEMENT_CATEGORIES = new Set([
  "Accounts",
  "Operations",
  "Business Development",
  "HR",
]);

/** Management team members (D-20) — only these Switchers can have Management department */
const MANAGEMENT_MEMBERS = new Set([
  "Richard", "Melissa", "Ed", "Lisa", "Luke", "Andrea",
]);

/** Categories from the Legend's Design department */
const DESIGN_CATEGORIES = new Set([
  "Brand Design",
  "Production",
  "Web Design",
  "Motion",
  "Photography",
  "Misc Design",
]);

/** Categories from the Legend's PM department */
const PM_CATEGORIES = new Set(["Task management", "Client Admin"]);

/** Categories from the Legend's Marketing department */
const MARKETING_CATEGORIES = new Set([
  "Reporting",
  "CC Management",
  "Email Marketing",
  "Paid Management",
  "Social Media Management",
  "Strategy",
  "CRM Management",
  "Directory Management",
  "Web Management",
  "Copywriting",
]);

/** Cross-Department categories */
const CROSS_DEPT_CATEGORIES = new Set([
  "Brief writing",
  "Brainstorming",
  "Emails",
  "QA",
  "Misc",
  "Research",
  "Pitch Work",
  "Non-Client Meeting",
  "External Client Meeting",
  "Internal Client Meeting",
  "Configuring LLM",
  "Admin",
]);

// ============================================================
// getDepartment
// ============================================================

/**
 * Assign the department for a classified event based on the task category,
 * task details, switcher identity, and switcher's primary department.
 *
 * Implements the exact 7-rule priority sequence from process_export.py
 * and instructions.md.
 *
 * @param taskCategory - The classified task category
 * @param taskDetails - The original task details text
 * @param switcherName - The switcher's name
 * @param switcherDept - The switcher's primary department
 * @param isManagementMember - Whether the switcher is a management member
 * @returns The department assignment
 */
export function getDepartment(
  taskCategory: string,
  taskDetails: string,
  switcherName: string,
  switcherDept: string,
  isManagementMember: boolean,
): string {
  const td = taskDetails.toLowerCase().trim();

  // Rule 1: Management categories -> Management for management members
  if (MANAGEMENT_CATEGORIES.has(taskCategory)) {
    // Rule 1b (D-20): Non-management Switchers never get Management department
    // even for management-sounding categories — route to their primary dept
    if (!MANAGEMENT_MEMBERS.has(switcherName)) {
      return switcherDept;
    }
    return "Management";
  }

  // Rule 2: "Management Meeting" -> Management for management members
  if (td.includes("management meeting") && isManagementMember) {
    return "Management";
  }

  // Rule 3: Brand Writing -> always Brand
  if (taskCategory === "Brand Writing") {
    return "Brand";
  }

  // Rule 4: Ed special handling
  if (switcherName === "Ed") {
    if (taskCategory === "Copywriting") {
      return "Marketing";
    }
    if (DESIGN_CATEGORIES.has(taskCategory)) {
      return "Design";
    }
    // Strategy, meetings, cross-dept, PM categories -> Brand (his primary)
    return "Brand";
  }

  // Rule 5: Lisa special handling
  if (switcherName === "Lisa") {
    if (PM_CATEGORIES.has(taskCategory)) {
      return "PM";
    }
    // Everything else -> Management
    return "Management";
  }

  // Rule 6: Designers (primaryDept === "Design") -- almost everything -> Design
  if (switcherDept === "Design") {
    if (MANAGEMENT_CATEGORIES.has(taskCategory)) {
      return "Management";
    }
    if (td.includes("management meeting")) {
      return "Management";
    }
    return "Design";
  }

  // Rule 7: Everyone else
  // Design categories -> Design (actual design work stays Design)
  if (DESIGN_CATEGORIES.has(taskCategory)) {
    return "Design";
  }

  // Cross-department -> switcher's primary department
  if (CROSS_DEPT_CATEGORIES.has(taskCategory)) {
    // "Management Meeting" for management members (already handled by Rule 2)
    if (td.includes("management meeting") && isManagementMember) {
      return "Management";
    }
    return switcherDept;
  }

  // PM categories for PM/Marketing/Management switchers -> primary
  if (PM_CATEGORIES.has(taskCategory)) {
    return switcherDept;
  }

  // Marketing categories -> primary
  if (MARKETING_CATEGORIES.has(taskCategory)) {
    return switcherDept;
  }

  // Fallback to primary department
  return switcherDept;
}

// ============================================================
// Attendee-based meeting type detection
// ============================================================

const SWITCH_INTERNAL_DOMAINS = new Set(["switch.com.mt", "switchmalta.com"]);

/** Meeting categories that should be corrected based on attendee data */
const MEETING_CATEGORIES = new Set([
  "External Client Meeting",
  "Internal Client Meeting",
  "Non-Client Meeting",
]);

/**
 * Check if an email address belongs to a Switch team member.
 */
function isInternalEmail(email: string): boolean {
  const domain = email.toLowerCase().split("@")[1];
  return domain ? SWITCH_INTERNAL_DOMAINS.has(domain) : false;
}

/**
 * Determine whether a meeting has external attendees based on the
 * attendee list from Google Calendar.
 *
 * @returns "external" if any non-Switch attendee, "internal" if all Switch, null if no data
 */
function detectMeetingType(
  attendees: Array<{ email: string; displayName?: string }> | null,
): "external" | "internal" | null {
  if (!attendees || attendees.length === 0) return null;
  const hasExternal = attendees.some((a) => !isInternalEmail(a.email));
  return hasExternal ? "external" : "internal";
}

// ============================================================
// classifyEvent
// ============================================================

/**
 * Top-level classification function that combines alias resolution,
 * category classification, attendee-based meeting correction, and
 * department assignment.
 *
 * @param parsed - The parsed event data (includes attendees)
 * @param switcherName - The switcher's name
 * @param switcherDept - The switcher's primary department
 * @param isManagementMember - Whether the switcher is a management member
 * @param aliasMap - Optional alias map for client name resolution
 * @returns Complete classification result
 */
export function classifyEvent(
  parsed: ParsedEvent,
  switcherName: string,
  switcherDept: string,
  isManagementMember: boolean,
  aliasMap?: Map<string, string>,
): ClassificationResult {
  // Step 1: Resolve client alias
  const clientName = aliasMap
    ? resolveClientAlias(parsed.client_name_raw, aliasMap)
    : parsed.client_name_raw;

  // Step 2: Classify category (keyword-based)
  let { category, confidence } = classifyCategory(
    parsed.task_details,
    clientName,
  );

  // Step 2a: Attendee-based meeting correction
  // Override keyword-based meeting classification with actual attendee data
  if (MEETING_CATEGORIES.has(category)) {
    const meetingType = detectMeetingType(parsed.attendees);
    if (meetingType === "internal" && category === "External Client Meeting") {
      // All attendees are Switch staff — not an external meeting
      if (clientName.trim() === "" || isNonClientName(clientName)) {
        category = "Non-Client Meeting";
      } else {
        category = "Internal Client Meeting";
      }
    } else if (meetingType === "external" && category === "Non-Client Meeting") {
      // Has external attendees — upgrade to external meeting
      category = "External Client Meeting";
    } else if (meetingType === "external" && category === "Internal Client Meeting") {
      // Has external attendees — this is actually an external meeting
      category = "External Client Meeting";
    }
  }

  // Step 2b: Internal client override
  // When the client is empty/non-client and the category is internal work,
  // assign to "Internal" client instead of leaving as Unknown
  const INTERNAL_WORK_CATEGORIES = new Set([
    "Administration", "Emails", "Admin", "Task management",
    "Non-Client Meeting", "QA", "Research", "Brainstorming",
    "Brief writing", "Configuring LLM", "Misc",
    "Internal Client Meeting",
  ]);
  let resolvedClient = clientName;
  if (
    INTERNAL_WORK_CATEGORIES.has(category) &&
    (resolvedClient.trim() === "" || isNonClientName(resolvedClient))
  ) {
    resolvedClient = "Internal";
  }

  // Step 3: Assign department
  const department = getDepartment(
    category,
    parsed.task_details,
    switcherName,
    switcherDept,
    isManagementMember,
  );

  // Step 4: Determine classification method
  const classification_method = category === "Misc" ? "misc" : "rule";

  return {
    client_name: resolvedClient,
    category,
    department,
    classification_method,
    rule_confidence: confidence,
  };
}
