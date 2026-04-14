import { Users } from 'lucide-react';

export const TopSwitchersGrid = ({ data, onNavigate }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {data.map((person, idx) => (
        <div
          key={idx}
          onClick={() => onNavigate && onNavigate(person.switcher)}
          className="bg-stone-50 p-4 rounded-xl flex flex-col cursor-pointer hover:bg-stone-100 transition-colors border border-transparent hover:border-switch-primary"
        >
          <span className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-2">
            {person.dept}
          </span>
          <div className="flex items-end justify-between mt-auto">
            <div>
              <span className="block text-xl font-bold text-switch-secondary">{person.switcher}</span>
              <span className="block text-sm text-switch-primary font-medium">
                {person.avgDailyHours.toFixed(1)}h / day
              </span>
            </div>
            <div className="h-8 w-8 bg-white rounded-full flex items-center justify-center text-stone-300 shadow-sm">
              <Users size={16} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
