import { getWeekNumber } from './getWeekNumber.js';

/**
 * Shared trend-data aggregation logic extracted from both DetailView and App useMemo blocks.
 * Groups entries by the appropriate time bucket and returns an array of data points.
 *
 * @param {Array} data - Array of data entries with dateObj and minutes properties
 * @param {string} timeframe - 'day' | 'week' | 'month'
 * @returns {Array} Array of { name, hours } objects (plus entity breakdowns), sorted chronologically
 */
export const buildTrendData = (data, timeframe) => {
  const grouped = {};

  data.forEach(item => {
    if (!item.dateObj) return;
    const d = item.dateObj;

    let key;
    if (timeframe === 'day') key = `${d.getDate()}/${d.getMonth() + 1}`;
    else if (timeframe === 'week') key = `W${getWeekNumber(d)}`;
    else key = d.toLocaleString('default', { month: 'short' });

    if (!grouped[key]) grouped[key] = { name: key, label: key, hours: 0 };
    grouped[key].hours += item.minutes / 60;
  });

  return Object.values(grouped);
};
