// --- Calendar Fetcher ---
// Paginated Google Calendar REST API fetch for a single Switcher.
// Uses singleEvents=true to expand recurring events into individual instances
// (Research Pitfall 5). Requests only the fields needed for classification
// (D-20: title, start/end, description, attendees, recurring info; NO location).

import type { GoogleCalendarEvent } from "./types.ts";

/**
 * Fetch all calendar events for a single Switcher within a time window.
 *
 * Uses the Google Calendar Events.list REST API with pagination
 * (follows nextPageToken until exhausted). Recurring events are expanded
 * into individual instances via singleEvents=true; each instance carries
 * a recurringEventId for series grouping.
 *
 * @param accessToken - OAuth2 Bearer token (from getGoogleAccessToken)
 * @param calendarId - Switcher's email address (used as calendar ID)
 * @param timeMin - Start of fetch window (RFC3339, e.g. "2026-04-07T00:00:00Z")
 * @param timeMax - End of fetch window (RFC3339, e.g. "2026-04-28T23:59:59Z")
 * @returns Array of raw Google Calendar events
 * @throws Error if the API returns a non-200 response
 */
export async function fetchCalendarEvents(
  accessToken: string,
  calendarId: string,
  timeMin: string,
  timeMax: string,
): Promise<GoogleCalendarEvent[]> {
  const events: GoogleCalendarEvent[] = [];
  let pageToken: string | undefined;

  do {
    // Build query parameters per Google Calendar API v3 spec
    const params = new URLSearchParams({
      timeMin,
      timeMax,
      singleEvents: "true", // Expand recurring events into instances
      maxResults: "250", // Max per page
      orderBy: "startTime",
      // D-20: Request only needed fields (no location)
      fields:
        "items(id,summary,description,start,end,attendees,recurringEventId,recurrence),nextPageToken",
    });

    if (pageToken) {
      params.set("pageToken", pageToken);
    }

    const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params}`;

    const resp = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!resp.ok) {
      const errorBody = await resp.text();
      throw new Error(
        `Google Calendar API error for ${calendarId} (${resp.status}): ${errorBody}`,
      );
    }

    const data = await resp.json();
    events.push(...(data.items ?? []));
    pageToken = data.nextPageToken;
  } while (pageToken);

  return events;
}
