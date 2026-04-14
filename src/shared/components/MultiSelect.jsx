import { useState, useRef, useCallback } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { useClickOutside } from '../hooks/useClickOutside.js';

export const MultiSelect = ({ options, selected, onChange, label, maxLimit = 6 }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useClickOutside(dropdownRef, useCallback(() => setIsOpen(false), []));

  const handleToggle = (option) => {
    if (selected.includes(option)) {
      onChange(selected.filter(item => item !== option));
    } else {
      if (selected.length < maxLimit) {
        onChange([...selected, option]);
      }
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 bg-white border border-stone-200 rounded-lg text-xs font-medium hover:border-switch-primary transition-colors min-w-[130px] justify-between h-full"
      >
        <span className="truncate max-w-[100px]">
          {selected.length === 0 ? `Select ${label}` : `${selected.length} ${label}s`}
        </span>
        <ChevronDown size={14} className="text-stone-400" />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-stone-100 p-2 z-50 max-h-64 overflow-y-auto">
          <div className="px-2 py-1.5 text-xs font-bold text-stone-400 uppercase tracking-wider mb-1">
            Max {maxLimit} selections
          </div>
          {options.map((option) => (
            <button
              key={option}
              onClick={() => handleToggle(option)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center justify-between hover:bg-stone-50 transition-colors ${
                selected.includes(option) ? 'bg-switch-bg text-switch-secondary font-medium' : 'text-stone-600'
              }`}
            >
              <span className="truncate">{option}</span>
              {selected.includes(option) && <Check size={14} className="text-switch-primary" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
