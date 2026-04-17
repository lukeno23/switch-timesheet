import { useState, useMemo, useRef } from 'react';
import { ArrowUpDown, Filter } from 'lucide-react';
import { FilterDropdown } from './FilterDropdown.jsx';

export const TaskTable = ({ data, showContext = false, showOverride = false, onOverrideClick, refData }) => {
  const [sortConfig, setSortConfig] = useState({ key: 'dateObj', direction: 'desc' });
  const [activeFilters, setActiveFilters] = useState({});
  const [openFilterCol, setOpenFilterCol] = useState(null);

  // Unique values per categorical column for filter dropdown options
  const filterOptions = useMemo(() => ({
    department: [...new Set((data || []).map(d => d.department).filter(Boolean))].sort(),
    switcher: [...new Set((data || []).map(d => d.switcher).filter(Boolean))].sort(),
    client: [...new Set((data || []).map(d => d.client).filter(Boolean))].sort(),
    categoryName: [...new Set((data || []).map(d => d.categoryName).filter(Boolean))].sort(),
  }), [data]);

  // Apply column filters before sorting
  const filteredData = useMemo(() => {
    let items = [...(data || [])];
    Object.entries(activeFilters).forEach(([col, filterVal]) => {
      if (!filterVal) return;
      if (col === 'dateObj') {
        const { start, end } = filterVal;
        if (start) items = items.filter(d => d.dateObj >= new Date(start));
        if (end) {
          const endDate = new Date(end);
          endDate.setHours(23, 59, 59, 999);
          items = items.filter(d => d.dateObj <= endDate);
        }
      } else {
        if (Array.isArray(filterVal) && filterVal.length < (filterOptions[col]?.length || 0)) {
          items = items.filter(d => filterVal.includes(d[col]));
        }
      }
    });
    return items;
  }, [data, activeFilters, filterOptions]);

  // Sort the filtered data
  const sortedData = useMemo(() => {
    if (!sortConfig.key) return filteredData;
    let sortableItems = [...filteredData];
    sortableItems.sort((a, b) => {
      let aValue = a[sortConfig.key];
      let bValue = b[sortConfig.key];

      if (typeof aValue === 'string') aValue = aValue.toLowerCase();
      if (typeof bValue === 'string') bValue = bValue.toLowerCase();

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    return sortableItems;
  }, [filteredData, sortConfig]);

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

  const toggleFilter = (col) => {
    setOpenFilterCol(prev => prev === col ? null : col);
  };

  const updateFilter = (col, value) => {
    setActiveFilters(prev => ({ ...prev, [col]: value }));
  };

  const hasActiveFilter = (col) => {
    const f = activeFilters[col];
    if (f === undefined) return false;
    if (col === 'dateObj') return f.start || f.end;
    return Array.isArray(f) && f.length < (filterOptions[col]?.length || 0);
  };

  const FilterIcon = ({ col, type }) => {
    const anchorRef = useRef(null);
    return (
      <div className="relative">
        <button ref={anchorRef} onClick={(e) => { e.stopPropagation(); toggleFilter(col); }} className="ml-0.5">
          <Filter size={12} className={hasActiveFilter(col) ? 'text-switch-primary' : 'text-stone-300'} />
        </button>
        <FilterDropdown
          type={type}
          options={type === 'categorical' ? filterOptions[col] : undefined}
          selected={type === 'categorical' ? (activeFilters[col] !== undefined ? activeFilters[col] : filterOptions[col] || []) : (activeFilters[col] || { start: '', end: '' })}
          onChange={(val) => updateFilter(col, val)}
          isOpen={openFilterCol === col}
          onToggle={() => toggleFilter(col)}
          anchorRef={anchorRef}
        />
      </div>
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
              <div className="flex items-center gap-1">
                Date {getSortIcon('dateObj')}
                <FilterIcon col="dateObj" type="date" />
              </div>
            </th>
            {showContext && (
              <>
                <th
                  className="px-4 py-3 font-bold cursor-pointer hover:bg-stone-100 transition-colors group select-none"
                  onClick={() => requestSort('department')}
                >
                  <div className="flex items-center gap-1">
                    Team {getSortIcon('department')}
                    <FilterIcon col="department" type="categorical" />
                  </div>
                </th>
                <th
                  className="px-4 py-3 font-bold cursor-pointer hover:bg-stone-100 transition-colors group select-none"
                  onClick={() => requestSort('switcher')}
                >
                  <div className="flex items-center gap-1">
                    Switcher {getSortIcon('switcher')}
                    <FilterIcon col="switcher" type="categorical" />
                  </div>
                </th>
              </>
            )}
            <th
              className="px-4 py-3 font-bold cursor-pointer hover:bg-stone-100 transition-colors group select-none"
              onClick={() => requestSort('client')}
            >
              <div className="flex items-center gap-1">
                Client {getSortIcon('client')}
                <FilterIcon col="client" type="categorical" />
              </div>
            </th>
            <th
              className="px-4 py-3 font-bold cursor-pointer hover:bg-stone-100 transition-colors group select-none"
              onClick={() => requestSort('categoryName')}
            >
              <div className="flex items-center gap-1">
                Category {getSortIcon('categoryName')}
                <FilterIcon col="categoryName" type="categorical" />
              </div>
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
              <td className="px-4 py-3 text-stone-500">{item.categoryName}</td>
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
      {Object.keys(activeFilters).some(k => hasActiveFilter(k)) && (
        <p className="text-xs text-stone-400 font-dm mt-2 px-1">
          Showing {sortedData.length} of {data.length} events
        </p>
      )}
    </div>
  );
};
