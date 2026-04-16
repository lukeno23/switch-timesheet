import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { COLORS } from '../../constants/colors.js';

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

export const WeeklyCalendar = ({ data, onEventClick }) => {
  const [currentWeekStart, setCurrentWeekStart] = useState(() => getMonday(new Date()));

  // Pre-group tasks by day using Map — O(n) instead of per-cell O(n) filter
  const tasksByDay = useMemo(() => {
    const map = new Map();
    (data || []).forEach(entry => {
      if (!entry.dateObj) return;
      const key = entry.dateObj.toDateString();
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(entry);
    });
    return map;
  }, [data]);

  // Mon-Thu only (Switch 4-day work week)
  const weekDays = useMemo(() => {
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu'];
    const days = [];
    for (let i = 0; i < 4; i++) {
      const date = new Date(currentWeekStart);
      date.setDate(date.getDate() + i);
      days.push({ name: dayNames[i], date });
    }
    return days;
  }, [currentWeekStart]);

  // Build client-to-color index for consistent coloring
  const clientColorMap = useMemo(() => {
    const uniqueClients = [...new Set((data || []).map(d => d.client).filter(Boolean))].sort();
    const map = {};
    uniqueClients.forEach((client, i) => {
      map[client] = COLORS.chartPalette[i % COLORS.chartPalette.length];
    });
    return map;
  }, [data]);

  const prevWeek = () => setCurrentWeekStart(d => addDays(d, -7));
  const nextWeek = () => setCurrentWeekStart(d => addDays(d, 7));

  return (
    <div className="w-full">
      <div className="flex items-center justify-center gap-3 mb-4">
        <button
          onClick={prevWeek}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-stone-500 hover:text-switch-secondary hover:bg-stone-100 transition-colors"
        >
          <ChevronLeft size={16} />
        </button>
        <span className="text-sm font-bold text-switch-secondary font-dm">
          Week of {currentWeekStart.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
        </span>
        <button
          onClick={nextWeek}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-stone-500 hover:text-switch-secondary hover:bg-stone-100 transition-colors"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {weekDays.map(({ name, date }) => {
          const dayKey = date.toDateString();
          const tasks = tasksByDay.get(dayKey) || [];
          const dailyHours = tasks.reduce((acc, t) => acc + t.minutes / 60, 0);
          const warningClass = dailyHours > 10
            ? 'bg-red-50 border border-red-200'
            : dailyHours > 8
              ? 'bg-amber-50 border border-amber-200'
              : 'bg-stone-50';

          return (
            <div key={name} className={`min-h-[120px] rounded-xl p-2 ${warningClass}`}>
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-stone-500 font-dm">{name}</span>
                <span className="text-xs text-stone-400 font-dm">
                  {date.getDate()}/{date.getMonth() + 1}
                </span>
              </div>
              {tasks.length === 0 ? (
                <p className="text-xs text-stone-300 font-dm">No tasks</p>
              ) : (
                <div className="space-y-1">
                  {tasks.map((task, i) => (
                    <div
                      key={i}
                      onClick={() => onEventClick && onEventClick(task)}
                      className="rounded px-1.5 py-1 text-xs cursor-pointer hover:opacity-80 transition-opacity mb-1"
                      style={{
                        backgroundColor: clientColorMap[task.client] || COLORS.chartPalette[0],
                        color: '#fff',
                        minHeight: `${Math.max(20, (task.minutes / 60) * 48)}px`,
                      }}
                      title={`${task.task} (${(task.minutes / 60).toFixed(1)}h)`}
                    >
                      <p className="font-bold text-xs truncate">{task.client}</p>
                      <p className="text-xs text-white/80 truncate">{task.categoryName}</p>
                    </div>
                  ))}
                </div>
              )}
              {dailyHours > 8 && (
                <p className="text-xs text-amber-600 font-dm mt-1" title="Over 8 hours scheduled this day">
                  {dailyHours.toFixed(1)}h total
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
