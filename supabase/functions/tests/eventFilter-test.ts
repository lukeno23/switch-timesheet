// --- Event Filter, Title Parser, and Alias Resolver Tests ---
// Deno.test suite covering filtering, parsing, and alias resolution.

import {
  isPersonalEvent,
  isAllDayEvent,
  isZeroDuration,
  isWeekendEvent,
  isRemovableEvent,
  filterEvents,
} from "../_shared/eventFilter.ts";
import { parseTitle } from "../_shared/titleParser.ts";
import {
  resolveClientAlias,
  isNonClientName,
  buildAliasMap,
} from "../_shared/aliasResolver.ts";
import type { GoogleCalendarEvent } from "../_shared/types.ts";

import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";

// ============================================================
// Personal Event Filter Tests
// ============================================================

Deno.test("isPersonalEvent - exact match: lunch", () => {
  assertEquals(isPersonalEvent("lunch"), true);
});

Deno.test("isPersonalEvent - exact match case-insensitive: LUNCH", () => {
  assertEquals(isPersonalEvent("LUNCH"), true);
});

Deno.test("isPersonalEvent - exact match: rest", () => {
  assertEquals(isPersonalEvent("rest"), true);
});

Deno.test("isPersonalEvent - exact match: physio", () => {
  assertEquals(isPersonalEvent("physio"), true);
});

Deno.test("isPersonalEvent - exact match: yoga", () => {
  assertEquals(isPersonalEvent("yoga"), true);
});

Deno.test("isPersonalEvent - exact match: buffer", () => {
  assertEquals(isPersonalEvent("buffer"), true);
});

Deno.test("isPersonalEvent - exact match: run", () => {
  assertEquals(isPersonalEvent("run"), true);
});

Deno.test("isPersonalEvent - exact match: hair", () => {
  assertEquals(isPersonalEvent("hair"), true);
});

Deno.test("isPersonalEvent - substring match: hospital visit", () => {
  assertEquals(isPersonalEvent("hospital visit"), true);
});

Deno.test("isPersonalEvent - substring match: surgery scheduled", () => {
  assertEquals(isPersonalEvent("surgery scheduled"), true);
});

Deno.test("isPersonalEvent - substring match: gynae appointment", () => {
  assertEquals(isPersonalEvent("gynae appointment"), true);
});

Deno.test("isPersonalEvent - substring match: ultrasound scan", () => {
  assertEquals(isPersonalEvent("ultrasound scan"), true);
});

Deno.test("isPersonalEvent - substring match: pick up pips", () => {
  assertEquals(isPersonalEvent("pick up pips"), true);
});

Deno.test("isPersonalEvent - substring match: stay with kids", () => {
  assertEquals(isPersonalEvent("stay with kids today"), true);
});

Deno.test("isPersonalEvent - substring match: slow vinyasa", () => {
  assertEquals(isPersonalEvent("slow vinyasa class"), true);
});

Deno.test("isPersonalEvent - substring match: had to lie down", () => {
  assertEquals(isPersonalEvent("had to lie down"), true);
});

Deno.test("isPersonalEvent - substring match: hygiene walk", () => {
  assertEquals(isPersonalEvent("hygiene walk"), true);
});

Deno.test("isPersonalEvent - substring match: luncch (typo)", () => {
  assertEquals(isPersonalEvent("luncch"), true);
});

Deno.test("isPersonalEvent - substring match: malta marathon", () => {
  assertEquals(isPersonalEvent("malta marathon training"), true);
});

Deno.test("isPersonalEvent - substring match: p&p flea", () => {
  assertEquals(isPersonalEvent("p&p flea market"), true);
});

Deno.test("isPersonalEvent - travel with no client is personal", () => {
  assertEquals(isPersonalEvent("travel", ""), true);
});

Deno.test("isPersonalEvent - travel time is always personal", () => {
  assertEquals(isPersonalEvent("travel time"), true);
});

Deno.test("isPersonalEvent - traveltime (no space) is personal", () => {
  assertEquals(isPersonalEvent("traveltime buffer"), true);
});

Deno.test("isPersonalEvent - travel research is NOT personal", () => {
  assertEquals(isPersonalEvent("travel research"), false);
});

Deno.test("isPersonalEvent - dr bilocca is personal", () => {
  assertEquals(isPersonalEvent("Dr Bilocca appointment"), true);
});

Deno.test("isPersonalEvent - dr zahra is personal", () => {
  assertEquals(isPersonalEvent("Dr Zahra check-up"), true);
});

Deno.test("isPersonalEvent - insurance with no client is personal", () => {
  assertEquals(isPersonalEvent("insurance", ""), true);
});

Deno.test("isPersonalEvent - insurance with client is NOT personal", () => {
  assertEquals(isPersonalEvent("insurance", "APS"), false);
});

Deno.test("isPersonalEvent - buffer + travel is personal", () => {
  assertEquals(isPersonalEvent("buffer travel time"), true);
});

Deno.test("isPersonalEvent - flight to destination with no client is personal", () => {
  assertEquals(isPersonalEvent("flight to London", ""), true);
});

Deno.test("isPersonalEvent - normal work event is NOT personal", () => {
  assertEquals(isPersonalEvent("Website Design"), false);
});

Deno.test("isPersonalEvent - meeting is NOT personal", () => {
  assertEquals(isPersonalEvent("Client Meeting"), false);
});

// ============================================================
// All-Day Event Detection Tests
// ============================================================

Deno.test("isAllDayEvent - event with start.date is all-day", () => {
  const event: GoogleCalendarEvent = {
    id: "1",
    summary: "Holiday",
    start: { date: "2026-02-23" },
    end: { date: "2026-02-24" },
  };
  assertEquals(isAllDayEvent(event), true);
});

Deno.test("isAllDayEvent - event with start.dateTime is NOT all-day", () => {
  const event: GoogleCalendarEvent = {
    id: "2",
    summary: "Meeting",
    start: { dateTime: "2026-02-23T09:00:00+01:00" },
    end: { dateTime: "2026-02-23T10:00:00+01:00" },
  };
  assertEquals(isAllDayEvent(event), false);
});

Deno.test("isAllDayEvent - event with both date and dateTime uses date presence", () => {
  // If both are present, the presence of date without dateTime determines all-day
  const event: GoogleCalendarEvent = {
    id: "3",
    summary: "Edge case",
    start: { date: "2026-02-23", dateTime: "2026-02-23T09:00:00+01:00" },
    end: { date: "2026-02-24" },
  };
  // Has dateTime, so not all-day
  assertEquals(isAllDayEvent(event), false);
});

// ============================================================
// Zero-Duration Event Detection Tests
// ============================================================

Deno.test("isZeroDuration - same start and end is zero duration", () => {
  assertEquals(
    isZeroDuration(
      "2026-02-23T09:00:00+01:00",
      "2026-02-23T09:00:00+01:00",
    ),
    true,
  );
});

Deno.test("isZeroDuration - different start and end is NOT zero duration", () => {
  assertEquals(
    isZeroDuration(
      "2026-02-23T09:00:00+01:00",
      "2026-02-23T10:00:00+01:00",
    ),
    false,
  );
});

// ============================================================
// Weekend Filtering Tests
// ============================================================

Deno.test("isWeekendEvent - Saturday (5) is weekend", () => {
  assertEquals(isWeekendEvent(5), true);
});

Deno.test("isWeekendEvent - Sunday (6) is weekend", () => {
  assertEquals(isWeekendEvent(6), true);
});

Deno.test("isWeekendEvent - Friday (4) is NOT weekend", () => {
  assertEquals(isWeekendEvent(4), false);
});

Deno.test("isWeekendEvent - Monday (0) is NOT weekend", () => {
  assertEquals(isWeekendEvent(0), false);
});

Deno.test("isWeekendEvent - Thursday (3) is NOT weekend", () => {
  assertEquals(isWeekendEvent(3), false);
});

// ============================================================
// Removable Event Tests
// ============================================================

Deno.test("isRemovableEvent - switch off", () => {
  assertEquals(isRemovableEvent("Switch Off"), true);
});

Deno.test("isRemovableEvent - public holiday", () => {
  assertEquals(isRemovableEvent("Public Holiday"), true);
});

Deno.test("isRemovableEvent - PH abbreviation", () => {
  assertEquals(isRemovableEvent("PH"), true);
});

// ============================================================
// Combined filterEvents Tests
// ============================================================

Deno.test("filterEvents - removes all-day events", () => {
  const events: GoogleCalendarEvent[] = [
    {
      id: "1",
      summary: "Day Off",
      start: { date: "2026-02-23" },
      end: { date: "2026-02-24" },
    },
    {
      id: "2",
      summary: "Design Work",
      start: { dateTime: "2026-02-23T09:00:00+01:00" },
      end: { dateTime: "2026-02-23T10:00:00+01:00" },
    },
  ];
  const result = filterEvents(events);
  assertEquals(result.length, 1);
  assertEquals(result[0].id, "2");
});

Deno.test("filterEvents - removes personal events", () => {
  const events: GoogleCalendarEvent[] = [
    {
      id: "1",
      summary: "Lunch break",
      start: { dateTime: "2026-02-23T12:00:00+01:00" },
      end: { dateTime: "2026-02-23T13:00:00+01:00" },
    },
    {
      id: "2",
      summary: "Client Call",
      start: { dateTime: "2026-02-23T14:00:00+01:00" },
      end: { dateTime: "2026-02-23T15:00:00+01:00" },
    },
  ];
  const result = filterEvents(events);
  assertEquals(result.length, 1);
  assertEquals(result[0].id, "2");
});

Deno.test("filterEvents - removes zero-duration events", () => {
  const events: GoogleCalendarEvent[] = [
    {
      id: "1",
      summary: "Placeholder",
      start: { dateTime: "2026-02-23T09:00:00+01:00" },
      end: { dateTime: "2026-02-23T09:00:00+01:00" },
    },
    {
      id: "2",
      summary: "Real Meeting",
      start: { dateTime: "2026-02-23T09:00:00+01:00" },
      end: { dateTime: "2026-02-23T10:00:00+01:00" },
    },
  ];
  const result = filterEvents(events);
  assertEquals(result.length, 1);
  assertEquals(result[0].id, "2");
});

Deno.test("filterEvents - combined filtering removes multiple types", () => {
  const events: GoogleCalendarEvent[] = [
    {
      id: "all-day",
      summary: "OOO",
      start: { date: "2026-02-23" },
      end: { date: "2026-02-24" },
    },
    {
      id: "personal",
      summary: "Gym session",
      start: { dateTime: "2026-02-23T07:00:00+01:00" },
      end: { dateTime: "2026-02-23T08:00:00+01:00" },
    },
    {
      id: "zero-dur",
      summary: "Reminder",
      start: { dateTime: "2026-02-23T09:00:00+01:00" },
      end: { dateTime: "2026-02-23T09:00:00+01:00" },
    },
    {
      id: "removable",
      summary: "Switch Off",
      start: { dateTime: "2026-02-23T09:00:00+01:00" },
      end: { dateTime: "2026-02-23T17:00:00+01:00" },
    },
    {
      id: "valid",
      summary: "Levaris | Website Design",
      start: { dateTime: "2026-02-23T10:00:00+01:00" },
      end: { dateTime: "2026-02-23T11:00:00+01:00" },
    },
  ];
  const result = filterEvents(events);
  assertEquals(result.length, 1);
  assertEquals(result[0].id, "valid");
});

// ============================================================
// Title Parser Tests
// ============================================================

Deno.test("parseTitle - pipe-delimited: Client | Task", () => {
  const result = parseTitle("Switch | Catchup");
  assertEquals(result.clientRaw, "Switch");
  assertEquals(result.taskDetails, "Catchup");
});

Deno.test("parseTitle - no pipe: entire title is task details", () => {
  const result = parseTitle("EMAILS & BRIEFS");
  assertEquals(result.clientRaw, "");
  assertEquals(result.taskDetails, "EMAILS & BRIEFS");
});

Deno.test("parseTitle - multiple pipes: first split only", () => {
  const result = parseTitle("Client | Task | More Details");
  assertEquals(result.clientRaw, "Client");
  assertEquals(result.taskDetails, "Task | More Details");
});

Deno.test("parseTitle - empty title", () => {
  const result = parseTitle("");
  assertEquals(result.clientRaw, "");
  assertEquals(result.taskDetails, "");
});

Deno.test("parseTitle - just a pipe character", () => {
  const result = parseTitle("|");
  assertEquals(result.clientRaw, "");
  assertEquals(result.taskDetails, "");
});

Deno.test("parseTitle - whitespace around pipe", () => {
  const result = parseTitle("  Levaris  |  Website Design  ");
  assertEquals(result.clientRaw, "Levaris");
  assertEquals(result.taskDetails, "Website Design");
});

Deno.test("parseTitle - Internal pipe convention", () => {
  const result = parseTitle("Internal | Management Meeting");
  assertEquals(result.clientRaw, "Internal");
  assertEquals(result.taskDetails, "Management Meeting");
});

Deno.test("parseTitle - null-like input", () => {
  const result = parseTitle("   ");
  assertEquals(result.clientRaw, "");
  assertEquals(result.taskDetails, "");
});

// ============================================================
// Alias Resolver Tests
// ============================================================

Deno.test("buildAliasMap - builds case-insensitive map", () => {
  const aliases = [
    { alias: "WRH", client_name: "Levaris" },
    { alias: "PP", client_name: "Palazzo Parisio" },
    { alias: "AD", client_name: "Alter Domus" },
  ];
  const map = buildAliasMap(aliases);
  assertEquals(map.get("wrh"), "Levaris");
  assertEquals(map.get("pp"), "Palazzo Parisio");
  assertEquals(map.get("ad"), "Alter Domus");
});

Deno.test("resolveClientAlias - resolves known alias", () => {
  const map = new Map([
    ["wrh", "Levaris"],
    ["pp", "Palazzo Parisio"],
  ]);
  assertEquals(resolveClientAlias("WRH", map), "Levaris");
});

Deno.test("resolveClientAlias - case-insensitive lookup", () => {
  const map = new Map([["wrh", "Levaris"]]);
  assertEquals(resolveClientAlias("wrh", map), "Levaris");
  assertEquals(resolveClientAlias("WRH", map), "Levaris");
  assertEquals(resolveClientAlias("Wrh", map), "Levaris");
});

Deno.test("resolveClientAlias - unknown name returns original", () => {
  const map = new Map([["wrh", "Levaris"]]);
  assertEquals(resolveClientAlias("Sigma", map), "Sigma");
});

Deno.test("resolveClientAlias - empty string returns empty", () => {
  const map = new Map([["wrh", "Levaris"]]);
  assertEquals(resolveClientAlias("", map), "");
});

// ============================================================
// Non-Client Name Detection Tests
// ============================================================

Deno.test("isNonClientName - Marketing is non-client", () => {
  assertEquals(isNonClientName("Marketing"), true);
});

Deno.test("isNonClientName - PM is non-client", () => {
  assertEquals(isNonClientName("PM"), true);
});

Deno.test("isNonClientName - Design is non-client", () => {
  assertEquals(isNonClientName("Design"), true);
});

Deno.test("isNonClientName - HR is non-client", () => {
  assertEquals(isNonClientName("HR"), true);
});

Deno.test("isNonClientName - Admin is non-client", () => {
  assertEquals(isNonClientName("Admin"), true);
});

Deno.test("isNonClientName - BD is non-client", () => {
  assertEquals(isNonClientName("BD"), true);
});

Deno.test("isNonClientName - TBC is non-client", () => {
  assertEquals(isNonClientName("TBC"), true);
});

Deno.test("isNonClientName - SAFETY TIME is non-client (case-insensitive)", () => {
  assertEquals(isNonClientName("SAFETY TIME"), true);
  assertEquals(isNonClientName("Safety Time"), true);
});

Deno.test("isNonClientName - Asana is non-client", () => {
  assertEquals(isNonClientName("Asana"), true);
});

Deno.test("isNonClientName - Buffer time is non-client", () => {
  assertEquals(isNonClientName("Buffer time"), true);
});

Deno.test("isNonClientName - Template Design Brief is non-client", () => {
  assertEquals(isNonClientName("Template Design Brief"), true);
});

Deno.test("isNonClientName - real client is NOT non-client", () => {
  assertEquals(isNonClientName("Levaris"), false);
});

Deno.test("isNonClientName - ACAMH is NOT non-client", () => {
  assertEquals(isNonClientName("ACAMH"), false);
});

Deno.test("isNonClientName - empty string returns false", () => {
  assertEquals(isNonClientName(""), false);
});
