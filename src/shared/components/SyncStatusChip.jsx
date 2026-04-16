import { AlertTriangle } from 'lucide-react';

export const SyncStatusChip = ({ onClick }) => (
  <button
    onClick={onClick}
    className="inline-flex items-center gap-1 px-2 py-1 rounded-full border border-amber-200 bg-amber-50 text-amber-700 text-xs font-bold font-dm cursor-pointer hover:bg-amber-100 transition-colors"
  >
    <AlertTriangle size={12} />
    Sync issues
  </button>
);
