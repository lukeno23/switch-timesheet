export const TimeFrameToggle = ({ current, onChange }) => (
  <div className="flex bg-stone-100 p-1 rounded-lg">
    {['day', 'week', 'month'].map((tf) => (
      <button
        key={tf}
        onClick={() => onChange(tf)}
        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 capitalize ${
          current === tf
            ? 'bg-white text-switch-secondary shadow-sm'
            : 'text-stone-500 hover:text-stone-700'
        }`}
      >
        {tf}
      </button>
    ))}
  </div>
);
