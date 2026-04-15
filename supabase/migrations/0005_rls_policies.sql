-- =============================================================
-- 0005_rls_policies.sql
-- Add SELECT policies so dashboard frontend can read data.
-- The dashboard uses the anon key (not service_role).
-- Phase 3 will add Supabase Auth for management users.
--
-- Tables with public read (anon + authenticated):
--   clients, client_aliases, categories, switchers, events, sync_runs
--
-- audit_log remains restricted to service_role only (sensitive data).
-- =============================================================

-- clients: read for anon and authenticated
CREATE POLICY "anon_read_clients" ON clients
  FOR SELECT TO anon USING (true);
CREATE POLICY "authenticated_read_clients" ON clients
  FOR SELECT TO authenticated USING (true);

-- client_aliases: read for anon and authenticated
CREATE POLICY "anon_read_client_aliases" ON client_aliases
  FOR SELECT TO anon USING (true);
CREATE POLICY "authenticated_read_client_aliases" ON client_aliases
  FOR SELECT TO authenticated USING (true);

-- categories: read for anon and authenticated
CREATE POLICY "anon_read_categories" ON categories
  FOR SELECT TO anon USING (true);
CREATE POLICY "authenticated_read_categories" ON categories
  FOR SELECT TO authenticated USING (true);

-- switchers: read for anon and authenticated
CREATE POLICY "anon_read_switchers" ON switchers
  FOR SELECT TO anon USING (true);
CREATE POLICY "authenticated_read_switchers" ON switchers
  FOR SELECT TO authenticated USING (true);

-- events: read for anon and authenticated
CREATE POLICY "anon_read_events" ON events
  FOR SELECT TO anon USING (true);
CREATE POLICY "authenticated_read_events" ON events
  FOR SELECT TO authenticated USING (true);

-- sync_runs: read for anon and authenticated
CREATE POLICY "anon_read_sync_runs" ON sync_runs
  FOR SELECT TO anon USING (true);
CREATE POLICY "authenticated_read_sync_runs" ON sync_runs
  FOR SELECT TO authenticated USING (true);

-- audit_log: NO anon or authenticated policies.
-- Only service_role (which bypasses RLS) can access audit_log.
