import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../services/supabase.js';

export const useSyncStatus = (latestSync) => {
  const [syncState, setSyncState] = useState('idle'); // idle | firing | polling | done | error | fallback
  const [progress, setProgress] = useState(null);
  const [result, setResult] = useState(null);
  const pollRef = useRef(null);
  const startTimeRef = useRef(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }, []);

  const triggerSync = useCallback(async (adminApiFn) => {
    setSyncState('firing');
    startTimeRef.current = new Date().toISOString();
    try {
      await adminApiFn('trigger-sync', {});
      setSyncState('polling');
      pollRef.current = setInterval(async () => {
        const elapsed = Date.now() - new Date(startTimeRef.current).getTime();
        if (elapsed > 180000) { // 3 minute fallback
          stopPolling();
          setSyncState('fallback');
          return;
        }
        const { data } = await supabase.from('sync_runs').select('*')
          .gte('started_at', startTimeRef.current).order('started_at', { ascending: false }).limit(1);
        const run = data?.[0];
        if (run) {
          setProgress(run);
          if (run.status === 'completed') { stopPolling(); setResult(run); setSyncState('done'); }
          if (run.status === 'failed') { stopPolling(); setResult(run); setSyncState('error'); }
        }
      }, 3000);
    } catch (err) {
      setSyncState('error');
      setResult({ error: err.message });
    }
  }, [stopPolling]);

  const reset = useCallback(() => { setSyncState('idle'); setProgress(null); setResult(null); }, []);

  useEffect(() => () => stopPolling(), [stopPolling]);

  return { syncState, progress, result, triggerSync, reset };
};
