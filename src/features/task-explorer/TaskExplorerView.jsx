import { useState, useMemo } from 'react';
import { Search, Calendar, Clock, Users } from 'lucide-react';
import { Card } from '../../shared/components/Card.jsx';
import { TaskTable } from '../../shared/components/TaskTable.jsx';

export const TaskExplorerView = ({ data, refData, onSelectDetail }) => {
  const [search, setSearch] = useState('');

  // Global search filter across task, client, switcher, category, department
  const searchFiltered = useMemo(() => {
    if (!data) return [];
    if (!search.trim()) return data;
    const q = search.toLowerCase();
    return data.filter(d =>
      (d.task || '').toLowerCase().includes(q) ||
      (d.client || '').toLowerCase().includes(q) ||
      (d.switcher || '').toLowerCase().includes(q) ||
      (d.categoryName || '').toLowerCase().includes(q) ||
      (d.department || '').toLowerCase().includes(q)
    );
  }, [data, search]);

  // Summary stats from search-filtered data
  const stats = useMemo(() => {
    const events = searchFiltered;
    const totalHours = (events.reduce((s, d) => s + d.minutes, 0) / 60).toFixed(1);
    const uniqueClients = new Set(events.map(d => d.client)).size;
    const uniqueSwitchers = new Set(events.map(d => d.switcher)).size;
    return { count: events.length, totalHours, uniqueClients, uniqueSwitchers };
  }, [searchFiltered]);

  return (
    <div className="animate-in fade-in duration-500">
      {/* Header with search */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-switch-secondary font-dm">Task Explorer</h2>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search events..."
            className="pl-9 pr-3 py-2 text-sm font-dm border border-stone-200 rounded-lg bg-white focus:outline-none focus:border-switch-primary transition-colors w-64"
          />
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-8">
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-switch-bg flex items-center justify-center">
              <Calendar size={20} className="text-switch-secondary" />
            </div>
            <div>
              <p className="text-xs font-bold text-stone-400 uppercase tracking-wider font-dm">Events</p>
              <p className="text-2xl font-bold text-switch-secondary font-dm">{stats.count}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-switch-bg flex items-center justify-center">
              <Clock size={20} className="text-switch-secondary" />
            </div>
            <div>
              <p className="text-xs font-bold text-stone-400 uppercase tracking-wider font-dm">Total Hours</p>
              <p className="text-2xl font-bold text-switch-primary font-dm">{stats.totalHours}h</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-switch-bg flex items-center justify-center">
              <Users size={20} className="text-switch-secondary" />
            </div>
            <div>
              <p className="text-xs font-bold text-stone-400 uppercase tracking-wider font-dm">Clients</p>
              <p className="text-2xl font-bold text-switch-secondary font-dm">{stats.uniqueClients}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-switch-bg flex items-center justify-center">
              <Users size={20} className="text-switch-secondary" />
            </div>
            <div>
              <p className="text-xs font-bold text-stone-400 uppercase tracking-wider font-dm">Switchers</p>
              <p className="text-2xl font-bold text-switch-secondary font-dm">{stats.uniqueSwitchers}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Task table with all columns */}
      {searchFiltered.length === 0 ? (
        <Card>
          <p className="text-stone-400 text-sm font-dm py-8 text-center">
            No events match your filters. Try clearing one or more column filters to see results.
          </p>
        </Card>
      ) : (
        <Card>
          <TaskTable data={searchFiltered} showContext={true} refData={refData} />
        </Card>
      )}
    </div>
  );
};
