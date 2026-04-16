import { useState, useMemo } from 'react';
import { Calendar, ChevronDown, ChevronUp } from 'lucide-react';

export const UpcomingEvents = ({ events, filterKey, filterValue }) => {
  const [expanded, setExpanded] = useState(false); // Default collapsed

  const upcomingEvents = useMemo(() => {
    let filtered = (events || []).filter(e => e.temporalStatus === 'upcoming');
    if (filterKey && filterValue) {
      filtered = filtered.filter(e => e[filterKey] === filterValue);
    }
    // Sort by start time ascending
    return filtered.sort((a, b) => new Date(a.startAt) - new Date(b.startAt));
  }, [events, filterKey, filterValue]);

  if (upcomingEvents.length === 0) return null; // Don't show section if no upcoming events

  const formatTimeRange = (startAt, endAt) => {
    const start = new Date(startAt);
    const end = new Date(endAt);
    const fmt = (d) => d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    return `${fmt(start)}\u2013${fmt(end)}`;
  };

  return (
    <div className="border-t border-stone-100 mt-8">
      {/* Section header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between cursor-pointer select-none py-3"
      >
        <div className="flex items-center gap-2">
          <Calendar size={16} className="text-stone-400" />
          <span className="text-sm font-bold text-stone-500 font-dm uppercase tracking-wider">
            Upcoming (next 14 days)
          </span>
          <span className="inline-flex bg-switch-bg text-switch-secondary text-xs font-bold px-2 py-0.5 rounded-full">
            {upcomingEvents.length}
          </span>
        </div>
        {expanded ? <ChevronUp size={16} className="text-stone-400" /> : <ChevronDown size={16} className="text-stone-400" />}
      </button>

      {/* Expanded content */}
      {expanded && (
        <div>
          <p className="text-xs font-dm text-stone-400 italic py-2">
            Not yet happened — data will update after the next sync
          </p>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm font-dm">
              <tbody>
                {upcomingEvents.map((event, i) => (
                  <tr key={event.id || i} className="hover:bg-stone-50/50 transition-colors">
                    <td className="px-4 py-3 text-stone-400 italic whitespace-nowrap">{event.dateStr}</td>
                    <td className="px-4 py-3 text-stone-400 italic whitespace-nowrap">{formatTimeRange(event.startAt, event.endAt)}</td>
                    {(!filterKey || filterKey !== 'switcher') && <td className="px-4 py-3 text-switch-secondary">{event.switcher}</td>}
                    {(!filterKey || filterKey !== 'client') && <td className="px-4 py-3 text-switch-secondary">{event.client}</td>}
                    <td className="px-4 py-3 text-stone-600 max-w-xs truncate" title={event.task}>{event.task}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
