import React from 'react';

export const HistoricalUpcomingToggle = ({ upcomingMode, onChange }) => (
  <div className="flex bg-stone-100 p-1 rounded-lg gap-1">
    {[{ label: 'Historical', value: false }, { label: 'Upcoming', value: true }].map(({ label, value }) => {
      const isActive = upcomingMode === value;
      return (
        <button
          key={label}
          onClick={() => onChange(value)}
          className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium font-dm transition-all duration-200 ${
            isActive
              ? 'bg-switch-primary text-white shadow-sm'
              : 'text-stone-500 hover:text-switch-secondary'
          }`}
        >
          {label}
        </button>
      );
    })}
  </div>
);
