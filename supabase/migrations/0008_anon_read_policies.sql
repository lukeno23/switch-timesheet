-- =============================================================
-- 0008_anon_read_policies.sql
-- Add anon and authenticated SELECT policies for tables that
-- did not have them in 0005_rls_policies.sql:
--   - client_billing (new table from 0006)
--   - audit_log (previously service_role only; D-04 opens it)
-- =============================================================

-- client_billing: anon and authenticated read
CREATE POLICY "anon_read_client_billing" ON client_billing
  FOR SELECT TO anon USING (true);
CREATE POLICY "authenticated_read_client_billing" ON client_billing
  FOR SELECT TO authenticated USING (true);

-- audit_log: anon and authenticated read (D-04 explicitly includes it)
CREATE POLICY "anon_read_audit_log" ON audit_log
  FOR SELECT TO anon USING (true);
CREATE POLICY "authenticated_read_audit_log" ON audit_log
  FOR SELECT TO authenticated USING (true);
