import { useState, useRef, useCallback } from 'react';
import { Check } from 'lucide-react';
import { useClickOutside } from '../hooks/useClickOutside.js';

export const FilterDropdown = ({ type, options, selected, onChange, isOpen, onToggle }) => {
  const dropdownRef = useRef(null);

  useClickOutside(dropdownRef, useCallback(() => {
    if (isOpen) onToggle();
  }, [isOpen, onToggle]));

  if (!isOpen) return null;

  const handleCheckboxToggle = (option) => {
    if (selected.includes(option)) {
      const next = selected.filter(item => item !== option);
      onChange(next.length === 0 ? [] : next);
    } else {
      onChange([...selected, option]);
    }
  };

  const handleClear = () => {
    onChange([]);
  };

  const handleSelectAll = () => {
    onChange([...options]);
  };

  const handleDateChange = (field, value) => {
    onChange({ ...selected, [field]: value });
  };

  return (
    <div
      ref={dropdownRef}
      className="absolute top-full left-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-stone-100 p-2 z-50"
    >
      {type === 'categorical' ? (
        <>
          <div className="max-h-48 overflow-y-auto">
            {options.map((option) => (
              <button
                key={option}
                onClick={(e) => { e.preventDefault(); handleCheckboxToggle(option); }}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center justify-between hover:bg-stone-50 transition-colors min-h-[36px] ${
                  selected.includes(option) ? 'bg-switch-bg text-switch-secondary font-medium' : 'text-stone-600'
                }`}
              >
                <span className="truncate font-dm">{option}</span>
                {selected.includes(option) && <Check size={14} className="text-switch-primary" />}
              </button>
            ))}
          </div>
          <div className="border-t border-stone-100 mt-1 pt-1 flex justify-between">
            <button
              onClick={handleSelectAll}
              className="px-3 py-1.5 text-xs text-stone-400 hover:text-stone-600 font-dm transition-colors"
            >
              Select All
            </button>
            <button
              onClick={handleClear}
              className="px-3 py-1.5 text-xs text-stone-400 hover:text-stone-600 font-dm transition-colors"
            >
              Clear
            </button>
          </div>
        </>
      ) : (
        <div className="p-2 space-y-3">
          <div>
            <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1 font-dm">From</label>
            <input
              type="date"
              value={selected?.start || ''}
              onChange={(e) => handleDateChange('start', e.target.value)}
              className="w-full px-3 py-2 text-sm font-dm border border-stone-200 rounded-lg bg-white focus:outline-none focus:border-switch-primary transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1 font-dm">To</label>
            <input
              type="date"
              value={selected?.end || ''}
              onChange={(e) => handleDateChange('end', e.target.value)}
              className="w-full px-3 py-2 text-sm font-dm border border-stone-200 rounded-lg bg-white focus:outline-none focus:border-switch-primary transition-colors"
            />
          </div>
        </div>
      )}
    </div>
  );
};
