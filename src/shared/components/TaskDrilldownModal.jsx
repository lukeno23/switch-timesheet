import { X } from 'lucide-react';

export const TaskDrilldownModal = ({ isOpen, onClose, title, tasks }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col shadow-2xl">
        <div className="p-6 border-b border-stone-100 flex justify-between items-center">
          <h3 className="text-xl font-bold text-switch-secondary font-dm">{title}</h3>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600">
            <X size={24} />
          </button>
        </div>
        <div className="p-4 overflow-y-auto flex-1">
          {(!tasks || tasks.length === 0) ? (
            <p className="text-stone-400 text-sm font-dm">No tasks to display.</p>
          ) : (
            <ul className="space-y-2">
              {tasks.map((task, i) => (
                <li key={i} className="bg-stone-50 rounded-lg p-3">
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-switch-secondary font-dm truncate">{task.task}</p>
                      <p className="text-xs text-stone-500 font-dm mt-0.5">{task.client} · {task.dateStr}</p>
                    </div>
                    <span className="text-sm font-bold text-switch-primary font-dm whitespace-nowrap">
                      {(task.minutes / 60).toFixed(1)}h
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};
