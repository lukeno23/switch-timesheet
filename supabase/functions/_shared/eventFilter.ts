// --- Event Filter ---
// Filters out personal events, all-day events, zero-duration events,
// and weekend events before classification.
// Ported from classify_with_ai.py (expanded list per Research Pitfall 7).

import type { GoogleCalendarEvent } from "./types.ts";

// Exact title matches (case-insensitive) — from classify_with_ai.py expanded list
const PERSONAL_EXACT: Set<string> = new Set([
  "---",
  "rest",
  "physio",
  "cardio",
  "insurance",
  "run",
  "out",
  "yoga",
  "hair",
  "buffer",
  "break",
  "lunch break",
  "food",
]);

// Substring matches (case-insensitive) — from classify_with_ai.py expanded list
const PERSONAL_CONTAINS: string[] = [
  "lunch",
  "gym",
  "out of office",
  "ooo",
  "errand",
  "day off",
  "sick",
  "leave",
  "holiday",
  "vacation",
  "dentist",
  "swimming class",
  "pick up denzil",
  "parents day",
  "no meetings",
  "dm for meetings",
  "doctor",
  "hospital",
  "surgery",
  "gynae",
  "ultrasound",
  "pick up pips",
  "stay with kids",
  "slow vinyasa",
  "had to lie down",
  "hygiene walk",
  "luncch",
  "malta marathon",
  "p&p flea",
  "breakfast",
  "commute",
  "school run",
  "personal errand",
  "food",
  "snack",
  "nap",
  "walk the dog",
  "vet",
  "massage",
  "meditation",
];

/**
 * Check if an event title represents a personal event that should be filtered.
 * Uses the expanded personal event list from classify_with_ai.py.
 */
export function isPersonalEvent(title: string, clientRaw = ""): boolean {
  const t = title.toLowerCase().trim();

  // Exact match check
  if (PERSONAL_EXACT.has(t)) {
    // "insurance" with a client is work, not personal
    if (t === "insurance" && clientRaw.trim() !== "") {
      return false;
    }
    return true;
  }

  // Substring match check
  for (const kw of PERSONAL_CONTAINS) {
    if (t.includes(kw)) {
      return true;
    }
  }

  // "travel" as standalone title with no client -> personal
  // But "travel research" or similar is work
  if (t === "travel" && clientRaw.trim() === "") {
    return true;
  }

  // "travel time" -> always personal
  if (t === "travel time") {
    return true;
  }

  // "traveltime" (no space) -> always personal
  if (t.includes("traveltime")) {
    return true;
  }

  // "dr bilocca" or "dr zahra" -> personal (medical appointments)
  if (t.includes("dr bilocca") || t.includes("dr zahra")) {
    return true;
  }

  // "buffer" + "travel" combination -> personal
  if (t.includes("buffer") && t.includes("travel")) {
    return true;
  }

  // "flight to [destination]" with no client -> personal travel
  if (t.startsWith("flight to") && clientRaw.trim() === "") {
    return true;
  }

  return false;
}

/**
 * Check if an event is an all-day event.
 * Google Calendar API uses start.date (not start.dateTime) for all-day events.
 */
export function isAllDayEvent(event: GoogleCalendarEvent): boolean {
  return event.start.date != null && event.start.dateTime == null;
}

/**
 * Check if an event has zero duration (start equals end).
 * These are calendar placeholders and should be filtered.
 */
export function isZeroDuration(startAt: string, endAt: string): boolean {
  return new Date(startAt).getTime() === new Date(endAt).getTime();
}

/**
 * Check if a day is a weekend day.
 * Uses 0=Monday convention: Saturday=5, Sunday=6.
 * Friday (4) is NOT a weekend - Friday events pass through with off_schedule flag.
 */
export function isWeekendEvent(dayOfWeek: number): boolean {
  return dayOfWeek === 5 || dayOfWeek === 6;
}

/**
 * Check if an event is a removable system event (Switch Off, Public Holiday, etc.).
 */
export function isRemovableEvent(title: string): boolean {
  const t = title.toLowerCase().trim();
  return (
    t === "switch off" ||
    t === "public holiday" ||
    t === "ph" ||
    t === "timesheet update" ||
    t.startsWith("switch off") ||
    t.startsWith("public holiday")
  );
}

/**
 * Filter an array of Google Calendar events, removing:
 * - Personal events
 * - All-day events
 * - Zero-duration events (requires parsed start/end, so only checks all-day here)
 * - Removable system events
 *
 * Note: Weekend filtering and zero-duration checks on parsed timestamps
 * happen after parsing (in the pipeline), since we need parsed fields.
 * This function handles pre-parse filtering on raw Google Calendar events.
 */
export function filterEvents(
  events: GoogleCalendarEvent[],
): GoogleCalendarEvent[] {
  return events.filter((event) => {
    const title = event.summary || "";

    // Filter all-day events
    if (isAllDayEvent(event)) {
      return false;
    }

    // Filter personal events (no client info available at this stage, pass empty)
    if (isPersonalEvent(title)) {
      return false;
    }

    // Filter removable system events
    if (isRemovableEvent(title)) {
      return false;
    }

    // Filter zero-duration events (using raw dateTime if available)
    if (
      event.start.dateTime &&
      event.end.dateTime &&
      isZeroDuration(event.start.dateTime, event.end.dateTime)
    ) {
      return false;
    }

    return true;
  });
}
