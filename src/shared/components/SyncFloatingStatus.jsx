import { RefreshCw, ArrowRight } from 'lucide-react';

const formatShortWindow = (start, end) => {
  if (!start || !end) return '';
  const s = new Date(`${start}T00:00:00Z`);
  const e = new Date(`${end}T00:00:00Z`);
  if (isNaN(s) || isNaN(e)) return `${start} -> ${end}`;
  const opts = { day: 'numeric', month: 'short', timeZone: 'UTC' };
  if (start === end) return s.toLocaleDateString('en-GB', opts);
  return `${s.toLocaleDateString('en-GB', opts)} \u2013 ${e.toLocaleDateString('en-GB', opts)}`;
};

export const SyncFloatingStatus = ({ sync, onOpenSyncTab, isOnSyncTab }) => {
  const { syncState, chunkProgress } = sync;
  const running = syncState === 'firing' || syncState === 'polling';

  if (!running) return null;
  if (isOnSyncTab) return null;
  if (!chunkProgress) return null;

  const { total, done, current } = chunkProgress;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const currentNum = Math.min(done + 1, total);

  return (
    <button
      type="button"
      onClick={onOpenSyncTab}
      className="fixed bottom-6 right-6 z-40 bg-white border border-stone-200 shadow-lg rounded-2xl p-4 flex items-center gap-4 max-w-sm w-80 text-left hover:border-switch-primary hover:shadow-xl transition-all group animate-in fade-in slide-in-from-bottom-4 duration-300"
    >
      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-switch-bg flex items-center justify-center">
        <RefreshCw size={18} className="animate-spin text-switch-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-bold text-switch-secondary font-dm uppercase tracking-wider">
            Syncing
          </span>
          <span className="text-xs text-stone-400 font-dm font-bold">
            {currentNum}/{total}
          </span>
        </div>
        <div className="w-full h-1.5 bg-stone-100 rounded-full overflow-hidden mb-1">
          <div
            className="h-full bg-switch-primary transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-[11px] text-stone-400 font-dm truncate">
          {current ? formatShortWindow(current.start, current.end) : 'Preparing...'}
        </p>
      </div>
      <ArrowRight
        size={14}
        className="flex-shrink-0 text-stone-300 group-hover:text-switch-primary transition-colors"
      />
    </button>
  );
};
