import { X } from 'lucide-react';
import { TaskTable } from './TaskTable.jsx';

export const ChartDrilldownModal = ({ isOpen, onClose, title, tasks, onNavigate }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[80vh] flex flex-col shadow-2xl">
        <div className="p-6 border-b border-stone-100 flex justify-between items-center">
          <div className="flex flex-col gap-0.5">
            <h3 className="text-xl font-bold text-switch-secondary font-dm">{title}</h3>
            {onNavigate && (
              <button
                onClick={() => { onNavigate(); onClose(); }}
                className="text-xs text-switch-primary font-dm hover:underline text-left"
              >
                View full breakdown &rarr;
              </button>
            )}
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600">
            <X size={24} />
          </button>
        </div>
        <div className="p-4 overflow-y-auto flex-1">
          {(!tasks || tasks.length === 0) ? (
            <p className="text-stone-400 text-sm font-dm">No tasks to display.</p>
          ) : (
            <>
              <div className="flex justify-between items-center mb-3 px-1">
                <span className="text-xs font-bold text-stone-400 uppercase tracking-wider font-dm">
                  {tasks.length} events
                </span>
                <span className="text-sm font-bold text-switch-primary font-dm">
                  {(tasks.reduce((s, t) => s + t.minutes, 0) / 60).toFixed(1)}h total
                </span>
              </div>
              <TaskTable data={tasks} showContext={true} />
            </>
          )}
        </div>
      </div>
    </div>
  );
};
