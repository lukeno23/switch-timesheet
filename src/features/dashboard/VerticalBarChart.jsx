import {
  BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer,
} from 'recharts';
import { COLORS } from '../../constants/colors.js';

export const VerticalBarChart = ({ data, dataKey = 'hours', nameKey = 'name', height = 300, onClick }) => {
  const sortedData = [...data].sort((a, b) => b[dataKey] - a[dataKey]).slice(0, 15);

  return (
    <div style={{ height: `${height}px` }} className="w-full mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={sortedData} margin={{ top: 20, right: 0, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
          <XAxis
            dataKey={nameKey}
            tick={{ fontSize: 10, fill: '#444', fontFamily: 'DM Sans', cursor: onClick ? 'pointer' : 'default' }}
            interval={0}
            height={30}
            onClick={(e) => onClick && onClick(e.value)}
          />
          <YAxis hide />
          <RechartsTooltip
            cursor={{ fill: 'transparent' }}
            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
            formatter={(value) => value.toFixed(1)}
          />
          <Bar
            dataKey={dataKey}
            radius={[4, 4, 0, 0]}
            onClick={(e) => onClick && onClick(e[nameKey])}
            cursor={onClick ? 'pointer' : 'default'}
          >
            {sortedData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={COLORS.chartPalette[index % COLORS.chartPalette.length]}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
