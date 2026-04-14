import { useState, useMemo } from 'react';
import { ArrowUpDown } from 'lucide-react';

export const TaskTable = ({ data, showContext = false }) => {
  const [sortConfig, setSortConfig] = useState({ key: 'dateObj', direction: 'desc' });

  const sortedData = useMemo(() => {
    let sortableItems = [...data];
    if (sortConfig.key !== null) {
      sortableItems.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        if (typeof aValue === 'string') aValue = aValue.toLowerCase();
        if (typeof bValue === 'string') bValue = bValue.toLowerCase();

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [data, sortConfig]);

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (name) => {
    if (sortConfig.key !== name) {
      return <ArrowUpDown size={14} className="text-stone-300 ml-1 inline-block" />;
    }
    return (
      <ArrowUpDown
        size={14}
        className={`text-switch-primary ml-1 inline-block ${sortConfig.direction === 'asc' ? 'rotate-180' : ''}`}
      />
    );
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-sm font-dm">
        <thead className="bg-stone-50 border-b border-stone-100 text-switch-secondary">
          <tr>
            <th
              className="px-4 py-3 font-bold cursor-pointer hover:bg-stone-100 transition-colors group select-none"
              onClick={() => requestSort('dateObj')}
            >
              <div className="flex items-center gap-1">Date {getSortIcon('dateObj')}</div>
            </th>
            {showContext && (
              <>
                <th
                  className="px-4 py-3 font-bold cursor-pointer hover:bg-stone-100 transition-colors group select-none"
                  onClick={() => requestSort('department')}
                >
                  <div className="flex items-center gap-1">Team {getSortIcon('department')}</div>
                </th>
                <th
                  className="px-4 py-3 font-bold cursor-pointer hover:bg-stone-100 transition-colors group select-none"
                  onClick={() => requestSort('switcher')}
                >
                  <div className="flex items-center gap-1">Switcher {getSortIcon('switcher')}</div>
                </th>
              </>
            )}
            <th
              className="px-4 py-3 font-bold cursor-pointer hover:bg-stone-100 transition-colors group select-none"
              onClick={() => requestSort('client')}
            >
              <div className="flex items-center gap-1">Client {getSortIcon('client')}</div>
            </th>
            <th
              className="px-4 py-3 font-bold cursor-pointer hover:bg-stone-100 transition-colors group select-none"
              onClick={() => requestSort('task')}
            >
              <div className="flex items-center gap-1">Task Details {getSortIcon('task')}</div>
            </th>
            <th
              className="px-4 py-3 font-bold text-right cursor-pointer hover:bg-stone-100 transition-colors group select-none"
              onClick={() => requestSort('minutes')}
            >
              <div className="flex items-center justify-end gap-1">Hours {getSortIcon('minutes')}</div>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-50">
          {sortedData.map((item, i) => (
            <tr key={i} className="hover:bg-stone-50/50 transition-colors">
              <td className="px-4 py-3 text-stone-500 whitespace-nowrap">{item.dateStr}</td>
              {showContext && (
                <>
                  <td className="px-4 py-3 text-stone-600">{item.department}</td>
                  <td className="px-4 py-3 text-stone-600 font-medium">{item.switcher}</td>
                </>
              )}
              <td className="px-4 py-3 font-medium text-switch-secondary">{item.client}</td>
              <td className="px-4 py-3 text-stone-600 max-w-xs truncate" title={item.task}>
                {item.task}
              </td>
              <td className="px-4 py-3 text-right font-medium text-switch-primary">
                {(item.minutes / 60).toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
