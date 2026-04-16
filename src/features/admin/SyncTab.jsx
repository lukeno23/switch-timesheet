import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Check } from 'lucide-react';
import { AdminTable } from './AdminTable.jsx';
import { adminApi } from '../../shared/services/adminApi.js';
import { useSyncStatus } from '../../shared/hooks/useSyncStatus.js';
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

export const SyncTab = ({ latestSync, onDataChange }) => {
  const { syncState, progress, result, triggerSync, reset } = useSyncStatus(latestSync);
  const [syncRuns, setSyncRuns] = useState([]);
  const [loadingRuns, setLoadingRuns] = useState(true);
  const [toast, setToast] = useState(null);

  // Load recent sync runs on mount
  const loadSyncRuns = useCallback(async () => {
    setLoadingRuns(true);
    try {
      const { data } = await supabase
        .from('sync_runs')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(20);
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

  // Show toast on done/error and auto-dismiss
  useEffect(() => {
    if (syncState === 'done') {
      const eventsUpdated = result?.events_processed || result?.total_events || 0;
      setToast({
        type: 'success',
        message: `Sync complete -- ${eventsUpdated} events updated`,
      });
      // Refresh sync runs and data
      loadSyncRuns();
      onDataChange?.();
      const timer = setTimeout(() => {
        setToast(null);
        reset();
      }, 5000);
      return () => clearTimeout(timer);
    }
    if (syncState === 'error') {
      setToast({
        type: 'error',
        message: 'Sync failed -- check Admin > Sync log',
      });
      loadSyncRuns();
      const timer = setTimeout(() => {
        setToast(null);
        reset();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [syncState, result, reset, loadSyncRuns, onDataChange]);

  const handleSyncNow = () => {
    triggerSync(adminApi);
  };

  const syncRunColumns = [
    {
      key: 'started_at',
      label: 'Date/Time',
      render: (row) => formatDateTime(row.started_at),
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
      label: 'Events Updated',
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

  // Determine button label and state
  let buttonLabel = 'Sync Now';
  let buttonDisabled = false;
  let iconSpin = false;

  if (syncState === 'firing') {
    buttonLabel = 'Starting sync...';
    buttonDisabled = true;
    iconSpin = true;
  } else if (syncState === 'polling') {
    buttonLabel = 'Syncing...';
    buttonDisabled = true;
    iconSpin = true;
  }

  // Progress text
  let progressText = null;
  if (syncState === 'polling') {
    if (progress?.switchers_processed != null && progress?.total_switchers != null) {
      progressText = `Syncing... ${progress.switchers_processed} of ${progress.total_switchers} switchers done`;
    } else {
      progressText = 'Sync in progress -- this may take a few minutes';
    }
  }
  if (syncState === 'fallback') {
    progressText = 'Still running in background -- check back shortly';
  }

  return (
    <div>
      {/* Sync Now button */}
      <div className="mb-6">
        <button
          onClick={handleSyncNow}
          disabled={buttonDisabled}
          className="bg-switch-secondary text-white text-sm font-bold px-5 py-2.5 rounded-lg hover:bg-switch-secondary-dark transition-colors flex items-center gap-2 min-h-[44px] disabled:opacity-50"
        >
          <RefreshCw size={16} className={iconSpin ? 'animate-spin' : ''} />
          {buttonLabel}
        </button>

        {/* Progress text */}
        {progressText && (
          <p className={`text-sm font-dm mt-2 ${syncState === 'fallback' ? 'text-stone-400' : 'text-stone-500'}`}>
            {progressText}
          </p>
        )}
      </div>

      {/* Sync log table */}
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

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 rounded-xl px-5 py-3 shadow-lg z-50 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-300 ${
            toast.type === 'error'
              ? 'bg-red-500 text-white'
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
