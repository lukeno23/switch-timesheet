import React from 'react';

export const HistoricalUpcomingToggle = ({ upcomingMode, onChange }) => (
  <div className="flex bg-stone-100 p-1 rounded-lg">
    {[{ label: 'Historical', value: false }, { label: 'Upcoming', value: true }].map(({ label, value }) => (
      <button
        key={label}
        onClick={() => onChange(value)}
        className={`px-3 py-1.5 rounded-md text-xs font-medium font-dm transition-all duration-200 ${
          upcomingMode === value
            ? 'bg-switch-primary text-white shadow-sm'
            : 'bg-white text-stone-400 border border-stone-200'
        }`}
      >
        {label}
      </button>
    ))}
  </div>
);
