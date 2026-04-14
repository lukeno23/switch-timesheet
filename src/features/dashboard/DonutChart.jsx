import {
  PieChart, Pie, Cell, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { COLORS } from '../../constants/colors.js';

export const DonutChart = ({ data, nameKey = 'name', dataKey = 'hours' }) => {
  return (
    <div className="h-72 w-full mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={85}
            paddingAngle={5}
            dataKey={dataKey}
            nameKey={nameKey}
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={COLORS.chartPalette[index % COLORS.chartPalette.length]}
              />
            ))}
          </Pie>
          <RechartsTooltip
            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
            formatter={(value) => value.toFixed(1)}
          />
          <Legend
            layout="vertical"
            verticalAlign="middle"
            align="right"
            wrapperStyle={{ fontSize: '12px', fontFamily: 'DM Sans' }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};
