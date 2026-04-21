import { useState, useEffect, useCallback, useMemo } from 'react';
import { RefreshCw, Check, CalendarDays } from 'lucide-react';
import { AdminTable } from './AdminTable.jsx';
import { adminApi } from '../../shared/services/adminApi.js';
import { useSyncStatus, buildChunks } from '../../shared/hooks/useSyncStatus.js';
import { supabase } from '../../shared/services/supabase.js';

const formatDateTime = (ts) => {
  if (!ts) return '--';
  const d = new Date(ts);
  if (isNaN(d.getTime())) return ts;
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatDuration = (startedAt, completedAt) => {
  if (!startedAt || !completedAt) return '--';
  const ms = new Date(completedAt).getTime() - new Date(startedAt).getTime();
  if (isNaN(ms) || ms < 0) return '--';
  const secs = Math.round(ms / 1000);
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  const remSecs = secs % 60;
  return `${mins}m ${remSecs}s`;
};

const formatWindow = (start, end) => {
  if (!start || !end) return '--';
  const s = new Date(`${start}T00:00:00Z`);
  const e = new Date(`${end}T00:00:00Z`);
  if (isNaN(s) || isNaN(e)) return `${start} -> ${end}`;
  const opts = { day: 'numeric', month: 'short' };
  const startStr = s.toLocaleDateString('en-GB', { ...opts, timeZone: 'UTC' });
  const endStr = e.toLocaleDateString('en-GB', { ...opts, year: s.getUTCFullYear() !== e.getUTCFullYear() ? 'numeric' : undefined, timeZone: 'UTC' });
  if (start === end) return startStr;
  return `${startStr} \u2013 ${endStr}`;
};

const StatusBadgeSyncRun = ({ status }) => {
  const styles = {
    completed: 'bg-green-100 text-green-700',
    failed: 'bg-red-100 text-red-700',
    running: 'bg-amber-100 text-amber-700',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${styles[status] || 'bg-stone-100 text-stone-400'}`}>
      {status || 'unknown'}
    </span>
  );
};

const todayISO = () => new Date().toISOString().split('T')[0];
const shiftISO = (days) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split('T')[0];
};

export const SyncTab = ({ onDataChange }) => {
  const { syncState, chunkProgress, result, triggerSync, reset } = useSyncStatus();
  const [syncRuns, setSyncRuns] = useState([]);
  const [loadingRuns, setLoadingRuns] = useState(true);
  const [toast, setToast] = useState(null);

  const [range, setRange] = useState(() => ({
    start: shiftISO(-7),
    end: shiftISO(14),
  }));

  const chunks = useMemo(() => buildChunks(range.start, range.end), [range]);
  const rangeInvalid = chunks.length === 0;

  const loadSyncRuns = useCallback(async () => {
    setLoadingRuns(true);
    try {
      const { data } = await supabase
        .from('sync_runs')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(25);
      setSyncRuns(data || []);
    } catch {
      // Silently fail -- sync log is non-critical
    } finally {
      setLoadingRuns(false);
    }
  }, []);

  useEffect(() => {
    loadSyncRuns();
  }, [loadSyncRuns]);

  // Refresh log after each chunk completes (chunkProgress.done increments).
  useEffect(() => {
    if (chunkProgress?.done != null && chunkProgress.done > 0) {
      loadSyncRuns();
    }
  }, [chunkProgress?.done, loadSyncRuns]);

  useEffect(() => {
    if (syncState === 'done') {
      setToast({
        type: 'success',
        message: `Sync complete -- ${result?.chunks || 0} chunks, ${result?.totalEvents || 0} events updated`,
      });
      loadSyncRuns();
      onDataChange?.();
      const timer = setTimeout(() => { setToast(null); reset(); }, 5000);
      return () => clearTimeout(timer);
    }
    if (syncState === 'error') {
      const failed = result?.failures || 0;
      setToast({
        type: 'error',
        message: failed
          ? `Sync finished with ${failed} failed chunk(s) -- check the log`
          : 'Sync failed -- check the log',
      });
      loadSyncRuns();
      const timer = setTimeout(() => { setToast(null); reset(); }, 6000);
      return () => clearTimeout(timer);
    }
    if (syncState === 'fallback') {
      setToast({
        type: 'warn',
        message: `Sync finished -- ${result?.timeouts || 0} chunk(s) still running in background`,
      });
      loadSyncRuns();
      const timer = setTimeout(() => { setToast(null); reset(); }, 6000);
      return () => clearTimeout(timer);
    }
  }, [syncState, result, reset, loadSyncRuns, onDataChange]);

  const handleSyncNow = () => {
    if (rangeInvalid) return;
    triggerSync(adminApi, range);
  };

  const running = syncState === 'firing' || syncState === 'polling';

  const syncRunColumns = [
    {
      key: 'started_at',
      label: 'Date/Time',
      render: (row) => formatDateTime(row.started_at),
    },
    {
      key: 'window',
      label: 'Window',
      render: (row) => (
        <span className="font-dm text-xs text-stone-600">
          {formatWindow(row.window_start, row.window_end)}
        </span>
      ),
    },
    {
      key: 'trigger',
      label: 'Trigger',
      render: (row) => (
        <span className="text-xs text-stone-500 capitalize">{row.trigger || '--'}</span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => <StatusBadgeSyncRun status={row.status} />,
    },
    {
      key: 'duration',
      label: 'Duration',
      render: (row) => formatDuration(row.started_at, row.completed_at),
    },
    {
      key: 'events_processed',
      label: 'Events',
      render: (row) => row.events_processed ?? row.total_events ?? '--',
    },
    {
      key: 'errors',
      label: 'Errors',
      render: (row) => {
        if (!row.errors) return '--';
        if (Array.isArray(row.errors)) return row.errors.length > 0 ? `${row.errors.length} error(s)` : '--';
        return typeof row.errors === 'string' ? row.errors : '--';
      },
    },
  ];

  // Progress strip for the active run
  const progressStrip = running && chunkProgress ? (
    <div className="mt-4 rounded-xl border border-stone-100 bg-white p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-sm font-dm font-bold text-switch-secondary">
          <RefreshCw size={14} className="animate-spin text-switch-primary" />
          Syncing chunk {Math.min(chunkProgress.done + 1, chunkProgress.total)} of {chunkProgress.total}
          {chunkProgress.current && (
            <span className="text-stone-400 font-normal">
              ({formatWindow(chunkProgress.current.start, chunkProgress.current.end)})
            </span>
          )}
        </div>
        <span className="text-xs text-stone-400 font-dm">
          {Math.round((chunkProgress.done / chunkProgress.total) * 100)}%
        </span>
      </div>
      <div className="w-full h-2 bg-stone-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-switch-primary transition-all duration-300"
          style={{ width: `${(chunkProgress.done / chunkProgress.total) * 100}%` }}
        />
      </div>
      {chunkProgress.completed && chunkProgress.completed.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {chunkProgress.completed.map((c, i) => (
            <span
              key={i}
              className={`text-[11px] font-dm px-2 py-0.5 rounded ${
                c.status === 'completed'
                  ? 'bg-green-50 text-green-700'
                  : c.status === 'failed'
                  ? 'bg-red-50 text-red-700'
                  : 'bg-stone-100 text-stone-500'
              }`}
            >
              {formatWindow(c.start, c.end)}
            </span>
          ))}
        </div>
      )}
    </div>
  ) : null;

  return (
    <div>
      {/* Range controls */}
      <div className="mb-5 rounded-xl border border-stone-100 bg-white p-5">
        <div className="flex items-center gap-2 mb-4 text-switch-secondary">
          <CalendarDays size={16} />
          <h3 className="text-sm font-bold font-dm">Sync range</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <div>
            <label className="block text-[11px] font-bold text-stone-500 uppercase tracking-wider mb-1">Start</label>
            <input
              type="date"
              value={range.start}
              max={range.end}
              onChange={(e) => setRange((r) => ({ ...r, start: e.target.value }))}
              disabled={running}
              className="w-full text-sm p-2 border border-stone-200 rounded-lg focus:outline-none focus:border-switch-primary font-dm text-stone-600 disabled:bg-stone-50 disabled:text-stone-300"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-stone-500 uppercase tracking-wider mb-1">End</label>
            <input
              type="date"
              value={range.end}
              min={range.start}
              onChange={(e) => setRange((r) => ({ ...r, end: e.target.value }))}
              disabled={running}
              className="w-full text-sm p-2 border border-stone-200 rounded-lg focus:outline-none focus:border-switch-primary font-dm text-stone-600 disabled:bg-stone-50 disabled:text-stone-300"
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            type="button"
            onClick={() => setRange({ start: shiftISO(-7), end: shiftISO(14) })}
            disabled={running}
            className="text-[11px] font-dm font-bold uppercase tracking-wider px-3 py-1.5 rounded-md border border-stone-200 text-stone-500 hover:border-switch-primary hover:text-switch-secondary disabled:opacity-40"
          >
            Default (-7d to +14d)
          </button>
          <button
            type="button"
            onClick={() => setRange({ start: shiftISO(-30), end: todayISO() })}
            disabled={running}
            className="text-[11px] font-dm font-bold uppercase tracking-wider px-3 py-1.5 rounded-md border border-stone-200 text-stone-500 hover:border-switch-primary hover:text-switch-secondary disabled:opacity-40"
          >
            Last 30 days
          </button>
          <button
            type="button"
            onClick={() => setRange({ start: todayISO(), end: shiftISO(14) })}
            disabled={running}
            className="text-[11px] font-dm font-bold uppercase tracking-wider px-3 py-1.5 rounded-md border border-stone-200 text-stone-500 hover:border-switch-primary hover:text-switch-secondary disabled:opacity-40"
          >
            Next 14 days
          </button>
        </div>

        <div className="flex items-center justify-between flex-wrap gap-3">
          <p className="text-xs font-dm text-stone-500">
            {rangeInvalid
              ? 'Pick a valid range.'
              : (
                <>
                  <span className="font-bold text-switch-secondary">{chunks.length}</span>{' '}
                  chunk{chunks.length === 1 ? '' : 's'} of up to 3 days, run sequentially to stay under the Supabase free-tier limit.
                </>
              )}
          </p>
          <button
            onClick={handleSyncNow}
            disabled={running || rangeInvalid}
            className="bg-switch-secondary text-white text-sm font-bold px-5 py-2.5 rounded-lg hover:bg-switch-secondary-dark transition-colors flex items-center gap-2 min-h-[44px] disabled:opacity-50"
          >
            <RefreshCw size={16} className={running ? 'animate-spin' : ''} />
            {syncState === 'firing' ? 'Starting...' : syncState === 'polling' ? 'Syncing...' : 'Sync Now'}
          </button>
        </div>

        {progressStrip}
      </div>

      {/* Sync log table */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold font-dm text-switch-secondary">Recent syncs</h3>
          {!loadingRuns && syncRuns.length > 0 && (
            <button
              onClick={loadSyncRuns}
              className="text-[11px] font-dm font-bold uppercase tracking-wider text-stone-400 hover:text-switch-secondary flex items-center gap-1"
            >
              <RefreshCw size={12} /> Refresh
            </button>
          )}
        </div>
        {loadingRuns ? (
          <div className="py-8 text-center text-stone-400 text-sm font-dm">Loading sync log...</div>
        ) : (
          <AdminTable
            columns={syncRunColumns}
            data={syncRuns}
            onRowClick={() => {}}
            emptyMessage="No sync runs recorded yet."
          />
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 rounded-xl px-5 py-3 shadow-lg z-50 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-300 ${
            toast.type === 'error'
              ? 'bg-red-500 text-white'
              : toast.type === 'warn'
              ? 'bg-amber-500 text-white'
              : 'bg-switch-secondary text-white'
          }`}
        >
          {toast.type === 'success' && <Check size={18} className="text-switch-primary" />}
          <span className="text-sm font-dm font-bold">{toast.message}</span>
        </div>
      )}
    </div>
  );
};
