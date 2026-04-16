import { useState, useMemo } from 'react';
import { Plus } from 'lucide-react';

/**
 * AdminTable - Shared table component for all admin entity listings.
 *
 * Props:
 *   columns - array of { key, label, render? }
 *   data - array of row objects
 *   onRowClick - fn(row)
 *   emptyMessage - string
 *   showDeactivated - bool
 *   onToggleDeactivated - fn()
 *   addLabel - string (e.g. "Add Switcher")
 *   onAdd - fn()
 */
export const AdminTable = ({
  columns,
  data,
  onRowClick,
  emptyMessage = 'No items found.',
  showDeactivated = false,
  onToggleDeactivated,
  addLabel = 'Add',
  onAdd,
}) => {
  const activeRows = useMemo(() => data.filter(r => r.active !== false), [data]);
  const inactiveRows = useMemo(() => data.filter(r => r.active === false), [data]);

  const hasDeactivated = inactiveRows.length > 0;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-6">
      {/* Header bar */}
      <div className="flex items-center justify-between mb-4">
        <div>
          {onToggleDeactivated && (
            <label className="text-xs text-stone-400 hover:text-switch-secondary font-dm flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showDeactivated}
                onChange={onToggleDeactivated}
                className="rounded"
              />
              Show deactivated
            </label>
          )}
        </div>
        {onAdd && (
          <button
            onClick={onAdd}
            className="bg-switch-secondary text-white text-sm font-bold px-4 py-2 rounded-lg hover:bg-switch-secondary-dark transition-colors flex items-center gap-2"
          >
            <Plus size={16} />
            {addLabel}
          </button>
        )}
      </div>

      {/* Table */}
      {activeRows.length === 0 && (!showDeactivated || inactiveRows.length === 0) ? (
        <div className="py-16 text-center text-stone-400 text-sm font-dm">
          {emptyMessage}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm font-dm">
            <thead>
              <tr className="text-xs font-bold uppercase tracking-wider text-stone-400 border-b border-stone-100">
                {columns.map(col => (
                  <th key={col.key} className="py-3 px-4 text-left">
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {activeRows.map((row, i) => (
                <tr
                  key={row.id || i}
                  onClick={() => onRowClick?.(row)}
                  className="border-b border-stone-50 hover:bg-stone-50 transition-colors cursor-pointer"
                >
                  {columns.map(col => (
                    <td key={col.key} className="py-3 px-4 text-switch-secondary">
                      {col.render ? col.render(row) : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))}

              {/* Deactivated rows */}
              {showDeactivated && hasDeactivated && (
                <>
                  <tr>
                    <td
                      colSpan={columns.length}
                      className="text-xs text-stone-400 font-dm py-2 border-t border-stone-100"
                    >
                      Deactivated
                    </td>
                  </tr>
                  {inactiveRows.map((row, i) => (
                    <tr
                      key={`inactive-${row.id || i}`}
                      onClick={() => onRowClick?.(row)}
                      className="border-b border-stone-50 hover:bg-stone-50 transition-colors cursor-pointer opacity-60"
                    >
                      {columns.map(col => (
                        <td key={col.key} className="py-3 px-4 text-stone-400">
                          {col.render ? col.render(row) : row[col.key]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

/**
 * Status badge helper -- use inside column render functions.
 * Returns an active or inactive badge element.
 */
export const StatusBadge = ({ active }) => (
  <span
    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${
      active !== false
        ? 'bg-switch-bg text-switch-secondary'
        : 'bg-stone-100 text-stone-400'
    }`}
  >
    {active !== false ? 'Active' : 'Inactive'}
  </span>
);
