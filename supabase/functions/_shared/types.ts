// --- Types for Switch Timesheet Pipeline ---
// These types define the data structures used across all Edge Functions.

export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  attendees?: Array<{
    email: string;
    displayName?: string;
    responseStatus?: string;
  }>;
  recurringEventId?: string;
  recurrence?: string[];
}

export interface ParsedEvent {
  google_event_id: string;
  recurring_event_id: string | null;
  title: string;
  client_name_raw: string;
  task_details: string;
  description: string | null;
  attendees: Array<{ email: string; displayName?: string }> | null;
  start_at: string;
  end_at: string;
  duration_minutes: number;
  event_date: string;
  day_of_week: number;
  off_schedule: boolean;
  temporal_status: "upcoming" | "completed";
}

export interface ClassificationResult {
  client_name: string;
  category: string;
  department: string;
  classification_method: "rule" | "llm" | "llm_corrected" | "misc";
  rule_confidence: "confident" | "borderline" | null;
}
