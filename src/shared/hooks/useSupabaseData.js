import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase.js';
import { mapSupabaseRow } from '../utils/mapSupabaseRow.js';

const EVENT_COLUMNS = 'id, google_event_id, title, client_name_raw, task_details, start_at, end_at, duration_minutes, event_date, day_of_week, off_schedule, temporal_status, department, classification_method, rule_confidence, override_client_id, override_category_id, override_department, switcher:switchers(id, name, primary_dept, is_management_member), client:clients(id, name), category:categories(id, name, department)';
const PAGE_SIZE = 1000;

const fetchAllEvents = async () => {
  const allRows = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from('events')
      .select(EVENT_COLUMNS)
      .gte('event_date', '2026-01-04')
      .order('event_date', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(error.message);
    allRows.push(...(data || []));
    if (!data || data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return allRows;
};

export const useSupabaseData = () => {
  const [data, setData] = useState(null);
  const [refData, setRefData] = useState(null);
  const [billingData, setBillingData] = useState(null);
  const [latestSync, setLatestSync] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [allEvents, switchersRes, clientsRes, categoriesRes, aliasesRes, billingRes, syncRes] =
        await Promise.all([
          fetchAllEvents(),
          supabase.from('switchers').select('*'),
          supabase.from('clients').select('*'),
          supabase.from('categories').select('*'),
          supabase.from('client_aliases').select('*'),
          supabase.from('client_billing').select('*'),
          supabase.from('sync_runs').select('*').order('started_at', { ascending: false }).limit(1),
        ]);

      const queryError = [switchersRes, clientsRes, categoriesRes, aliasesRes, billingRes, syncRes]
        .find(r => r.error);
      if (queryError?.error) throw new Error(queryError.error.message);

      const mapped = allEvents.map(mapSupabaseRow);
      setData(mapped);
      setRefData({
        switchers: switchersRes.data || [],
        clients: clientsRes.data || [],
        categories: categoriesRes.data || [],
        aliases: aliasesRes.data || [],
      });
      setBillingData(billingRes.data || []);
      setLatestSync(syncRes.data?.[0] || null);
    } catch (err) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return { data, refData, billingData, latestSync, loading, error, refetch: load };
};
