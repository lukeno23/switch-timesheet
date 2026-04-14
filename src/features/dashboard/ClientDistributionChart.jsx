import { useMemo } from 'react';
import {
  PieChart, Pie, Cell, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { COLORS } from '../../constants/colors.js';

export const ClientDistributionChart = ({ data }) => {
  const processedData = useMemo(() => {
    const sorted = [...data].sort((a, b) => b.hours - a.hours);
    const top6 = sorted.slice(0, 6);
    const others = sorted.slice(6);

    const result = [...top6];
    if (others.length > 0) {
      const othersHours = others.reduce((sum, item) => sum + item.hours, 0);
      result.push({ name: 'Other Clients', hours: othersHours });
    }
    return result;
  }, [data]);

  const totalHours = processedData.reduce((sum, item) => sum + item.hours, 0);

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0].payload;
      const percentage = totalHours > 0 ? ((dataPoint.hours / totalHours) * 100).toFixed(1) : 0;

      return (
        <div className="bg-white p-3 border border-stone-100 shadow-lg rounded-xl">
          <p className="font-bold text-switch-secondary text-sm mb-1">{dataPoint.name}</p>
          <div className="text-xs text-stone-600 space-y-0.5">
            <p>Hours: <span className="font-medium text-switch-primary">{dataPoint.hours.toFixed(1)}h</span></p>
            <p>Share: <span className="font-medium text-switch-primary">{percentage}%</span></p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="h-72 w-full mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={processedData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={90}
            paddingAngle={2}
            dataKey="hours"
            nameKey="name"
          >
            {processedData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={COLORS.chartPalette[index % COLORS.chartPalette.length]}
              />
            ))}
          </Pie>
          <RechartsTooltip content={<CustomTooltip />} />
          <Legend
            layout="vertical"
            verticalAlign="middle"
            align="right"
            wrapperStyle={{ fontSize: '14px', fontFamily: 'DM Sans' }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};
