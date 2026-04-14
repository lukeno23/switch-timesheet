-- =============================================================
-- 0003_rls.sql
-- Row Level Security for Switch Timesheet pipeline
-- RLS enabled on all 7 tables with NO anon SELECT policies.
-- Service role key (used by Edge Functions) bypasses RLS.
-- =============================================================

ALTER TABLE switchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
