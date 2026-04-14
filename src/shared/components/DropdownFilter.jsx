import { useState, useRef } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { useClickOutside } from '../hooks/useClickOutside.js';

export const DropdownFilter = ({ options, selected, onChange, label, placeholder }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useClickOutside(dropdownRef, () => setIsOpen(false));

  const displayLabel = selected ? selected : (placeholder || `Select ${label}`);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 bg-white border border-stone-200 rounded-lg text-xs font-medium hover:border-switch-primary transition-colors min-w-[130px] justify-between"
      >
        <span className="truncate max-w-[100px]">{displayLabel}</span>
        <ChevronDown size={14} className="text-stone-400" />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-stone-100 p-2 z-50 max-h-64 overflow-y-auto">
          {options.map((option) => (
            <button
              key={option}
              onClick={() => {
                onChange(option);
                setIsOpen(false);
              }}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center justify-between hover:bg-stone-50 transition-colors ${
                selected === option
                  ? 'bg-switch-bg text-switch-secondary font-medium'
                  : 'text-stone-600'
              }`}
            >
              <span className="truncate">{option}</span>
              {selected === option && <Check size={14} className="text-switch-primary" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
