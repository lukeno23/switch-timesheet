import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '../services/supabase.js';

const CHUNK_DAYS = 3;
const CHUNK_TIMEOUT_MS = 180000; // 3 min cap per chunk (free-tier hits ~150s)
const POLL_INTERVAL_MS = 3000;

const fmt = (d) => d.toISOString().split('T')[0];

export const buildChunks = (startISO, endISO, days = CHUNK_DAYS) => {
  if (!startISO || !endISO) return [];
  const start = new Date(`${startISO}T00:00:00Z`);
  const end = new Date(`${endISO}T00:00:00Z`);
  if (isNaN(start) || isNaN(end) || start > end) return [];

  const chunks = [];
  let cursor = new Date(start);
  while (cursor <= end) {
    const chunkEnd = new Date(cursor);
    chunkEnd.setUTCDate(chunkEnd.getUTCDate() + days - 1);
    if (chunkEnd > end) chunkEnd.setTime(end.getTime());
    chunks.push({ start: fmt(cursor), end: fmt(chunkEnd) });
    cursor = new Date(chunkEnd);
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return chunks;
};

export const useSyncStatus = () => {
  const [syncState, setSyncState] = useState('idle'); // idle | firing | polling | done | error | fallback
  const [chunkProgress, setChunkProgress] = useState(null); // { total, done, current, completed[] }
  const [result, setResult] = useState(null);
  const abortRef = useRef(false);

  useEffect(() => () => { abortRef.current = true; }, []);

  const pollChunk = useCallback(async (chunkStartedAt) => {
    const deadline = Date.now() + CHUNK_TIMEOUT_MS;
    while (Date.now() < deadline) {
      if (abortRef.current) return { status: 'aborted' };
      const { data } = await supabase
        .from('sync_runs')
        .select('*')
        .gte('started_at', chunkStartedAt)
        .order('started_at', { ascending: false })
        .limit(1);
      const run = data?.[0];
      if (run && (run.status === 'completed' || run.status === 'failed')) return run;
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    }
    return { status: 'timeout' };
  }, []);

  const triggerSync = useCallback(
    async (adminApiFn, range) => {
      abortRef.current = false;
      const chunks = buildChunks(range?.start, range?.end);
      if (chunks.length === 0) {
        setSyncState('error');
        setResult({ error: 'Invalid date range' });
        return;
      }

      const completed = [];
      let totalEvents = 0;
      setResult(null);
      setSyncState('firing');
      setChunkProgress({ total: chunks.length, done: 0, current: chunks[0], completed: [] });

      for (let i = 0; i < chunks.length; i++) {
        if (abortRef.current) break;
        const chunk = chunks[i];
        const firedAt = new Date().toISOString();
        setChunkProgress({ total: chunks.length, done: i, current: chunk, completed: [...completed] });
        setSyncState('polling');

        try {
          await adminApiFn('trigger-sync', {
            backfill_start: chunk.start,
            backfill_end: chunk.end,
          });
        } catch (err) {
          completed.push({ ...chunk, status: 'failed', error: err.message });
          continue;
        }

        const run = await pollChunk(firedAt);
        const events = run?.events_processed ?? 0;
        totalEvents += events;
        completed.push({
          ...chunk,
          status: run?.status || 'unknown',
          events,
          runId: run?.id,
        });
      }

      setChunkProgress({
        total: chunks.length,
        done: completed.length,
        current: null,
        completed,
      });

      const hadFailures = completed.some((c) => c.status === 'failed');
      const hadTimeouts = completed.some((c) => c.status === 'timeout');
      setResult({
        chunks: completed.length,
        totalEvents,
        failures: completed.filter((c) => c.status === 'failed').length,
        timeouts: completed.filter((c) => c.status === 'timeout').length,
      });
      setSyncState(hadFailures ? 'error' : hadTimeouts ? 'fallback' : 'done');
    },
    [pollChunk],
  );

  const reset = useCallback(() => {
    setSyncState('idle');
    setChunkProgress(null);
    setResult(null);
  }, []);

  const abort = useCallback(() => {
    abortRef.current = true;
  }, []);

  return { syncState, chunkProgress, result, triggerSync, reset, abort };
};
