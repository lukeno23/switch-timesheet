import {
  BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer,
} from 'recharts';
import { COLORS } from '../../constants/colors.js';

export const AllocationChart = ({ data, dataKey = 'hours', nameKey = 'name', color = null, limit = null, onClick }) => {
  const sortedData = [...data].sort((a, b) => b[dataKey] - a[dataKey]);
  const displayData = limit ? sortedData.slice(0, limit) : sortedData;
  const chartHeight = Math.max(displayData.length * 40, 300);

  return (
    <div className={`w-full mt-4 ${!limit ? 'overflow-y-auto max-h-[400px]' : 'h-72'}`}>
      <div style={{ height: !limit ? chartHeight : '100%' }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            layout="vertical"
            data={displayData}
            margin={{ top: 0, right: 30, left: 40, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f0f0f0" />
            <XAxis type="number" hide />
            <YAxis
              dataKey={nameKey}
              type="category"
              width={100}
              tick={{ fontSize: 13, fill: '#444', fontFamily: 'DM Sans', cursor: onClick ? 'pointer' : 'default' }}
              interval={0}
              onClick={(e) => onClick && onClick(e.value)}
            />
            <RechartsTooltip
              cursor={{ fill: 'transparent' }}
              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
              formatter={(value) => value.toFixed(1)}
            />
            <Bar
              dataKey={dataKey}
              radius={[0, 4, 4, 0]}
              barSize={20}
              onClick={(e) => onClick && onClick(e[nameKey])}
              cursor={onClick ? 'pointer' : 'default'}
            >
              {displayData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={color || COLORS.chartPalette[index % COLORS.chartPalette.length]}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
