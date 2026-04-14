import { useMemo, useState } from 'react';

const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const getMonday = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

const addDays = (date, days) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};

export const WeeklyCalendar = ({ data }) => {
  const [currentWeekStart, setCurrentWeekStart] = useState(() => getMonday(new Date()));

  // Pre-group tasks by day using Map — O(n) instead of per-cell O(n) filter
  const tasksByDay = useMemo(() => {
    const map = new Map();
    data.forEach(entry => {
      if (!entry.dateObj) return;
      const key = entry.dateObj.toDateString();
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(entry);
    });
    return map;
  }, [data]);

  const weekDays = useMemo(() => {
    return DAYS_OF_WEEK.map((name, i) => ({
      name,
      date: addDays(currentWeekStart, i),
    }));
  }, [currentWeekStart]);

  const prevWeek = () => setCurrentWeekStart(d => addDays(d, -7));
  const nextWeek = () => setCurrentWeekStart(d => addDays(d, 7));

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={prevWeek}
          className="px-3 py-1 text-sm text-stone-500 hover:text-switch-secondary transition-colors"
        >
          &larr; Prev
        </button>
        <span className="text-sm font-bold text-switch-secondary font-dm">
          Week of {currentWeekStart.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
        </span>
        <button
          onClick={nextWeek}
          className="px-3 py-1 text-sm text-stone-500 hover:text-switch-secondary transition-colors"
        >
          Next &rarr;
        </button>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {weekDays.map(({ name, date }) => {
          const tasks = tasksByDay.get(date.toDateString()) ?? [];
          const totalHours = tasks.reduce((acc, t) => acc + t.minutes / 60, 0);

          return (
            <div key={name} className="min-h-[120px] bg-stone-50 rounded-xl p-2">
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-bold text-stone-400 uppercase">{name}</span>
                <span className="text-xs text-stone-300">{date.getDate()}</span>
              </div>
              {tasks.length === 0 ? (
                <p className="text-xs text-stone-300 italic">No tasks</p>
              ) : (
                <>
                  <p className="text-xs font-bold text-switch-primary mb-1">{totalHours.toFixed(1)}h</p>
                  <div className="space-y-1">
                    {tasks.slice(0, 3).map((task, i) => (
                      <div key={i} className="bg-white rounded px-1 py-0.5 text-xs text-stone-600 truncate" title={task.task}>
                        {task.client}
                      </div>
                    ))}
                    {tasks.length > 3 && (
                      <p className="text-xs text-stone-400">+{tasks.length - 3} more</p>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
