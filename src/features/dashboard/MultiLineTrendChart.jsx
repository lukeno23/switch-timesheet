import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { COLORS } from '../../constants/colors.js';

export const MultiLineTrendChart = ({ data, lines, timeframe }) => {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-stone-400">
        No Data
      </div>
    );
  }

  return (
    <div className="h-80 w-full mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e5e5" />
          <XAxis
            dataKey="name"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: '#888' }}
            dy={10}
            interval={timeframe === 'day' ? 'preserveStartEnd' : 0}
            minTickGap={30}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: '#888' }}
          />
          <RechartsTooltip
            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
            labelStyle={{ fontFamily: 'DM Sans', color: '#666', marginBottom: '0.25rem' }}
            formatter={(value) => value.toFixed(1)}
          />
          <Legend
            wrapperStyle={{ paddingTop: '20px', fontSize: '12px', fontFamily: 'DM Sans' }}
            iconType="circle"
          />
          {lines.map((lineKey, index) => (
            <Line
              key={lineKey}
              type="monotone"
              dataKey={lineKey}
              stroke={COLORS.chartPalette[index % COLORS.chartPalette.length]}
              strokeWidth={3}
              dot={false}
              activeDot={{ r: 6, strokeWidth: 0 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
