// =============================================================
// Shared TypeScript types for Switch Timesheet pipeline
// Mirrors SQL schema from 0001_schema.sql
// Imported by all Edge Function modules
// =============================================================

// Mirrors switchers table
export interface Switcher {
  id: string;
  name: string;
  email: string;
  primary_dept: string;
  is_management_member: boolean;
  active: boolean;
}

// Mirrors clients table
export interface Client {
  id: string;
  name: string;
  active: boolean;
}

// Mirrors client_aliases table
export interface ClientAlias {
  id: string;
  client_id: string;
  alias: string;
}

// Mirrors categories table
export interface Category {
  id: string;
  name: string;
  department: string;
  llm_hint: string | null;
}

// Raw Google Calendar API event (before processing)
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

// Event after filtering and title parsing, before classification
export interface ParsedEvent {
  google_event_id: string;
  recurring_event_id: string | null;
  title: string;
  client_name_raw: string;
  task_details: string;
  description: string | null;
  attendees: Array<{ email: string; displayName?: string }> | null;
  start_at: string; // ISO 8601
  end_at: string; // ISO 8601
  duration_minutes: number;
  event_date: string; // YYYY-MM-DD
  day_of_week: number; // 0=Mon..6=Sun
  off_schedule: boolean;
  temporal_status: "upcoming" | "completed";
}

// Classification result from rule engine or LLM
export interface ClassificationResult {
  client_name: string;
  category: string;
  department: string;
  classification_method: "rule" | "llm" | "llm_corrected" | "misc";
  rule_confidence: "confident" | "borderline" | null;
}

// Fully classified event ready for DB upsert
export interface ClassifiedEvent extends ParsedEvent {
  switcher_id: string;
  client_id: string | null;
  category_id: string | null;
  department: string;
  classification_method: "rule" | "llm" | "llm_corrected" | "misc";
  rule_confidence: "confident" | "borderline" | null;
}

// Mirrors sync_runs table
export interface SyncRun {
  id: string;
  started_at: string;
  completed_at: string | null;
  trigger: "cron" | "manual";
  status: "success" | "partial" | "failed";
  window_start: string;
  window_end: string;
  events_processed: number | null;
  rule_classified: number | null;
  llm_classified: number | null;
  llm_corrected: number | null;
  misc_count: number | null;
  borderline_count: number | null;
  errors: Record<string, string> | null;
  duration_ms: number | null;
}

// Mirrors audit_log table
export interface AuditLogEntry {
  event_id: string;
  audit_run_id: string | null;
  original_category: string;
  original_department: string;
  corrected_category: string;
  corrected_department: string;
  reasoning: string;
}

// Sync metrics accumulator (used during pipeline execution)
export interface SyncMetrics {
  events_processed: number;
  rule_classified: number;
  llm_classified: number;
  llm_corrected: number;
  misc_count: number;
  borderline_count: number;
  errors: Record<string, string>;
}
