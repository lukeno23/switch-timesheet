-- =============================================================
-- 0001_schema.sql
-- Database schema for Switch Timesheet pipeline
-- Tables: switchers, clients, client_aliases, categories,
--         events, sync_runs, audit_log
-- Functions: upsert_event, delete_missing_events
-- =============================================================

-- Table: switchers
CREATE TABLE switchers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  email text NOT NULL UNIQUE,
  primary_dept text NOT NULL,
  is_management_member boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Table: clients
CREATE TABLE clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Table: client_aliases
CREATE TABLE client_aliases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  alias text NOT NULL UNIQUE
);

-- Table: categories
CREATE TABLE categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  department text NOT NULL,
  llm_hint text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Table: events
CREATE TABLE events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  switcher_id uuid NOT NULL REFERENCES switchers(id),
  google_event_id text NOT NULL,
  recurring_event_id text,
  title text NOT NULL,
  client_id uuid REFERENCES clients(id),
  client_name_raw text,
  task_details text NOT NULL,
  description text,
  attendees jsonb,
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,
  duration_minutes integer NOT NULL,
  event_date date NOT NULL,
  day_of_week smallint NOT NULL,
  off_schedule boolean NOT NULL DEFAULT false,
  temporal_status text NOT NULL DEFAULT 'upcoming',
  category_id uuid REFERENCES categories(id),
  department text,
  classification_method text,
  rule_confidence text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (switcher_id, google_event_id)
);

CREATE INDEX idx_events_event_date ON events(event_date);
CREATE INDEX idx_events_switcher_id ON events(switcher_id);
CREATE INDEX idx_events_temporal_status ON events(temporal_status);

-- Table: sync_runs
CREATE TABLE sync_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at timestamptz NOT NULL,
  completed_at timestamptz,
  trigger text NOT NULL,
  status text NOT NULL,
  window_start date NOT NULL,
  window_end date NOT NULL,
  events_processed integer,
  rule_classified integer,
  llm_classified integer,
  llm_corrected integer,
  misc_count integer,
  borderline_count integer,
  errors jsonb,
  duration_ms integer
);

-- Table: audit_log
CREATE TABLE audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  audit_run_id uuid REFERENCES sync_runs(id),
  original_category text NOT NULL,
  original_department text NOT NULL,
  corrected_category text NOT NULL,
  corrected_department text NOT NULL,
  reasoning text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- =============================================================
-- Function: upsert_event
-- Handles INSERT ... ON CONFLICT for composite key
-- (switcher_id, google_event_id) per PIPE-03
-- =============================================================
CREATE OR REPLACE FUNCTION upsert_event(
  p_switcher_id uuid,
  p_google_event_id text,
  p_recurring_event_id text,
  p_title text,
  p_client_id uuid,
  p_client_name_raw text,
  p_task_details text,
  p_description text,
  p_attendees jsonb,
  p_start_at timestamptz,
  p_end_at timestamptz,
  p_duration_minutes integer,
  p_event_date date,
  p_day_of_week smallint,
  p_off_schedule boolean,
  p_temporal_status text,
  p_category_id uuid,
  p_department text,
  p_classification_method text,
  p_rule_confidence text
) RETURNS uuid AS $$
DECLARE
  result_id uuid;
BEGIN
  INSERT INTO events (
    switcher_id, google_event_id, recurring_event_id, title, client_id,
    client_name_raw, task_details, description, attendees, start_at, end_at,
    duration_minutes, event_date, day_of_week, off_schedule, temporal_status,
    category_id, department, classification_method, rule_confidence, updated_at
  ) VALUES (
    p_switcher_id, p_google_event_id, p_recurring_event_id, p_title, p_client_id,
    p_client_name_raw, p_task_details, p_description, p_attendees, p_start_at, p_end_at,
    p_duration_minutes, p_event_date, p_day_of_week, p_off_schedule, p_temporal_status,
    p_category_id, p_department, p_classification_method, p_rule_confidence, now()
  )
  ON CONFLICT (switcher_id, google_event_id) DO UPDATE SET
    recurring_event_id = EXCLUDED.recurring_event_id,
    title = EXCLUDED.title,
    client_id = EXCLUDED.client_id,
    client_name_raw = EXCLUDED.client_name_raw,
    task_details = EXCLUDED.task_details,
    description = EXCLUDED.description,
    attendees = EXCLUDED.attendees,
    start_at = EXCLUDED.start_at,
    end_at = EXCLUDED.end_at,
    duration_minutes = EXCLUDED.duration_minutes,
    event_date = EXCLUDED.event_date,
    day_of_week = EXCLUDED.day_of_week,
    off_schedule = EXCLUDED.off_schedule,
    temporal_status = EXCLUDED.temporal_status,
    category_id = EXCLUDED.category_id,
    department = EXCLUDED.department,
    classification_method = EXCLUDED.classification_method,
    rule_confidence = EXCLUDED.rule_confidence,
    updated_at = now()
  RETURNING id INTO result_id;
  RETURN result_id;
END;
$$ LANGUAGE plpgsql;

-- =============================================================
-- Function: delete_missing_events
-- Hard-deletes events removed from calendar within re-sync
-- window (D-17)
-- =============================================================
CREATE OR REPLACE FUNCTION delete_missing_events(
  p_switcher_id uuid,
  p_google_event_ids text[],
  p_window_start date,
  p_window_end date
) RETURNS integer AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM events
  WHERE switcher_id = p_switcher_id
    AND event_date BETWEEN p_window_start AND p_window_end
    AND google_event_id != ALL(p_google_event_ids);
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;
