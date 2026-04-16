import { useState, useMemo, useEffect } from 'react';
import { ChevronLeft, Sparkles, BarChart2, PieChart as PieChartIcon } from 'lucide-react';
import { COLORS } from '../../constants/colors.js';
import { getWeekNumber } from '../../shared/utils/getWeekNumber.js';
import { callGemini } from '../../shared/services/gemini.js';
import { buildCacheKey } from '../../shared/utils/cacheKey.js';
import { calcEffectiveRate, calcOverUnderIndicator, formatCurrency, formatRawAmount } from '../../shared/utils/billingCalc.js';
import { Card } from '../../shared/components/Card.jsx';
import { TimeFrameToggle } from '../../shared/components/TimeFrameToggle.jsx';
import { MultiSelect } from '../../shared/components/MultiSelect.jsx';
import { AIInsightsModal } from '../../shared/components/AIInsightsModal.jsx';
import { TaskTable } from '../../shared/components/TaskTable.jsx';
import { SimpleTrendChart } from '../dashboard/SimpleTrendChart.jsx';
import { MultiLineTrendChart } from '../dashboard/MultiLineTrendChart.jsx';
import { AllocationChart } from '../dashboard/AllocationChart.jsx';
import { ClientDistributionChart } from '../dashboard/ClientDistributionChart.jsx';
import { DonutChart } from '../dashboard/DonutChart.jsx';

export const DetailView = ({ title, type, data, dateRange, onBack, apiKey, onOpenSettings, billingData, clientId, clientTargetRate }) => {
  const [timeframe, setTimeframe] = useState('day');
  const [trendMode, setTrendMode] = useState('total');
  const [selectedLines, setSelectedLines] = useState([]);
  const [allocationChartType, setAllocationChartType] = useState('bar');

  // AI State
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [aiCache, setAiCache] = useState({ key: null, report: null });
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);

  // Calculate detailed stats
  const detailStats = useMemo(() => {
    const totalHours = data.reduce((acc, curr) => acc + curr.minutes, 0) / 60;
    const uniqueClients = new Set(data.map(d => d.client)).size;
    const uniqueSwitchers = new Set(data.map(d => d.switcher)).size;
    const totalTasks = data.length;

    const uniqueDays = new Set(data.map(d => d.dateStr)).size;
    const avgDaily = uniqueDays > 0 ? totalHours / uniqueDays : 0;

    let longestTask = { task: '-', minutes: 0 };
    data.forEach(d => {
      if (d.minutes > longestTask.minutes) longestTask = d;
    });

    const topEntity = {};
    const entityKey = type === 'client' ? 'switcher' : 'client';
    data.forEach(d => {
      const k = d[entityKey];
      topEntity[k] = (topEntity[k] || 0) + d.minutes;
    });
    const sortedEntities = Object.entries(topEntity).sort((a, b) => b[1] - a[1]);
    const topContributor = sortedEntities.length > 0
      ? { name: sortedEntities[0][0], hours: sortedEntities[0][1] / 60 }
      : { name: '-', hours: 0 };

    const dailyHours = {};
    data.forEach(d => {
      const k = d.dateStr;
      dailyHours[k] = (dailyHours[k] || 0) + d.minutes;
    });
    const sortedDays = Object.entries(dailyHours).sort((a, b) => b[1] - a[1]);
    const busiestDay = sortedDays.length > 0
      ? { date: sortedDays[0][0], hours: sortedDays[0][1] / 60 }
      : { date: '-', hours: 0 };

    return {
      totalHours,
      uniqueClients,
      uniqueSwitchers,
      totalTasks,
      avgDaily,
      longestTask,
      topContributor,
      busiestDay,
    };
  }, [data, type]);

  // Determine breakdown options based on view type
  const breakdownOptions = useMemo(() => {
    const options = ['total'];
    if (type === 'switcher') {
      options.push('client');
    } else if (type === 'department') {
      options.push('client', 'switcher');
    } else if (type === 'client') {
      options.push('switcher', 'department');
    }
    return options;
  }, [type]);

  // Derive breakdown list items for multiselect
  const breakdownList = useMemo(() => {
    if (trendMode === 'total') return [];

    const getSortedKeys = (key) => {
      const counts = {};
      data.forEach(d => counts[d[key]] = (counts[d[key]] || 0) + d.minutes);
      return Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .map(e => e[0]);
    };

    if (trendMode === 'client') return getSortedKeys('client');
    if (trendMode === 'switcher') return getSortedKeys('switcher');
    if (trendMode === 'department') return getSortedKeys('department');
    return [];
  }, [data, trendMode]);

  // Default selection when mode changes
  useEffect(() => {
    if (breakdownList.length > 0) {
      setSelectedLines(breakdownList.slice(0, 3));
    }
  }, [breakdownList]);

  const handleGenerateReport = async () => {
    if (!apiKey) {
      onOpenSettings();
      return;
    }

    const currentKey = buildCacheKey(dateRange, null, title);
    setIsAIModalOpen(true);
    if (aiCache.key === currentKey && aiCache.report) {
      return; // Serve cached report
    }
    // Clear stale report
    setAiCache({ key: null, report: null });
    setIsAiLoading(true);
    setAiError(null);

    const summaryData = {
      title,
      type,
      totalTasks: data.length,
      totalHours: (data.reduce((acc, curr) => acc + curr.minutes, 0) / 60).toFixed(1),
      breakdown: Object.entries(data.reduce((acc, curr) => {
        const k = type === 'client' ? curr.department : curr.client;
        acc[k] = (acc[k] || 0) + curr.minutes;
        return acc;
      }, {})).map(([k, v]) => `${k}: ${(v / 60).toFixed(1)}h`).join(', '),
    };

    const prompt = `
      You are a senior data analyst at 'Switch', a marketing agency.
      Analyze the following performance data for ${type}: "${title}".

      Data Summary:
      ${JSON.stringify(summaryData)}

      Please provide a concise, professional performance analysis formatted with simple HTML tags (<b>, <br>, <ul>, <li>).
      Focus on:
      1. <b>Key Focus Areas:</b> Where is the time being spent?
      2. <b>Efficiency Observations:</b> Any patterns?
      3. <b>Recommendations:</b> Quick tips for improvement or resource allocation.
    `;

    try {
      const result = await callGemini(apiKey, prompt);
      const report = result || 'No insights could be generated.';
      setAiCache({ key: currentKey, report });
    } catch (e) {
      setAiError('Failed to generate report. Please check your API key.');
    }
    setIsAiLoading(false);
  };

  // Process Trend Data
  const trendData = useMemo(() => {
    const grouped = {};
    data.forEach(item => {
      if (!item.dateObj) return;
      let key;
      const d = item.dateObj;
      if (timeframe === 'day') key = `${d.getDate()}/${d.getMonth() + 1}`;
      else if (timeframe === 'week') key = `W${getWeekNumber(d)}`;
      else key = d.toLocaleString('default', { month: 'short' });

      if (!grouped[key]) grouped[key] = { name: key, label: key, hours: 0 };

      grouped[key].hours += item.minutes / 60;

      if (trendMode !== 'total') {
        const entity = item[trendMode];
        if (selectedLines.includes(entity)) {
          grouped[key][entity] = (grouped[key][entity] || 0) + item.minutes / 60;
        }
      }
    });
    return Object.values(grouped);
  }, [data, timeframe, trendMode, selectedLines]);

  // Process Allocations
  const clientAllocation = useMemo(() => {
    const grouped = {};
    data.forEach(item => {
      const k = item.client || 'Unknown';
      if (!grouped[k]) grouped[k] = 0;
      grouped[k] += item.minutes / 60;
    });
    return Object.entries(grouped)
      .map(([name, hours]) => ({ name, hours: parseFloat(hours.toFixed(1)) }))
      .sort((a, b) => b.hours - a.hours);
  }, [data]);

  const switcherSplit = useMemo(() => {
    if (type !== 'client') return [];
    const grouped = {};
    data.forEach(item => {
      const k = item.switcher || 'Unknown';
      if (!grouped[k]) grouped[k] = 0;
      grouped[k] += item.minutes / 60;
    });
    return Object.entries(grouped)
      .map(([name, hours]) => ({ name, hours: parseFloat(hours.toFixed(1)) }))
      .sort((a, b) => b.hours - a.hours);
  }, [data, type]);

  const secondaryAllocation = useMemo(() => {
    const grouped = {};
    const targetKey = type === 'department' ? 'switcher' : 'department';
    data.forEach(item => {
      const k = item[targetKey] || 'Unknown';
      if (!grouped[k]) grouped[k] = 0;
      grouped[k] += item.minutes / 60;
    });
    return Object.entries(grouped)
      .map(([name, hours]) => ({ name, hours: parseFloat(hours.toFixed(1)) }))
      .sort((a, b) => b.hours - a.hours);
  }, [data, type]);

  // Billing monthly series (client detail only)
  const billingMonthly = useMemo(() => {
    if (!billingData || !data || type !== 'client' || !clientId) return [];

    // Group events by month for this client
    const monthlyHours = {};
    data.forEach(d => {
      if (!d.dateObj) return;
      const month = `${d.dateObj.getFullYear()}-${String(d.dateObj.getMonth() + 1).padStart(2, '0')}-01`;
      monthlyHours[month] = (monthlyHours[month] || 0) + d.minutes / 60;
    });

    // Match billing entries for this client
    const clientBilling = billingData.filter(b => b.client_id === clientId);

    // Build series: for each month that has hours OR billing
    const allMonths = new Set([...Object.keys(monthlyHours), ...clientBilling.map(b => b.year_month)]);
    return Array.from(allMonths).sort().reverse().map(month => {
      const hours = monthlyHours[month] || 0;
      const billing = clientBilling.find(b => b.year_month === month);
      const effectiveRate = billing ? calcEffectiveRate(hours, billing.eur_equivalent) : null;
      const indicator = effectiveRate ? calcOverUnderIndicator(effectiveRate, clientTargetRate) : null;
      const rawDisplay = billing ? formatRawAmount(billing.amount, billing.currency, billing.fx_rate_to_eur, billing.eur_equivalent) : null;

      return {
        month,
        monthLabel: new Date(month).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }),
        hours: hours.toFixed(1),
        billed: billing ? formatCurrency(billing.eur_equivalent, 'EUR') : '--',
        effectiveRate: effectiveRate ? `\u20AC${effectiveRate.toFixed(2)}` : '--',
        indicator,
        rawDisplay,
      };
    });
  }, [billingData, data, type, clientId, clientTargetRate]);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <AIInsightsModal
        isOpen={isAIModalOpen}
        onClose={() => setIsAIModalOpen(false)}
        title={`${title} Analysis`}
        content={aiCache.report}
        isLoading={isAiLoading}
        error={aiError}
      />

      <div className="flex justify-between items-center mb-6">
        <button
          onClick={onBack}
          className="flex items-center text-switch-secondary opacity-60 hover:opacity-100 transition-opacity font-medium"
        >
          <ChevronLeft size={18} className="mr-1" /> Back to Dashboard
        </button>

        <button
          onClick={handleGenerateReport}
          className="bg-white border border-switch-primary text-switch-secondary px-4 py-2 rounded-xl font-bold font-dm hover:bg-switch-primary hover:text-white transition-all flex items-center gap-2 shadow-sm"
        >
          <Sparkles size={16} />
          {apiKey ? 'Analyze Performance' : 'Enable AI Insights'}
        </button>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <span className="font-playfair text-switch-tertiary text-lg capitalize">
            {type === 'department' ? 'Team' : type} Report
          </span>
          <h1 className="text-4xl font-bold text-switch-secondary font-dm">{title}</h1>
        </div>
      </div>

      {/* Detail Banner */}
      <div className="bg-gradient-to-br from-switch-secondary to-[#455a3f] rounded-2xl p-8 mb-8 text-white shadow-lg relative overflow-hidden font-dm">
        <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-switch-primary rounded-full opacity-10 blur-2xl" />

        <h2 className="font-playfair text-2xl mb-4 relative z-10 text-switch-primary">Performance Summary</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4 text-sm opacity-90 relative z-10">
          {type === 'switcher' && (
            <>
              <p className="text-lg leading-relaxed mb-2 md:col-span-2">
                {title} has logged{' '}
                <span className="font-bold text-switch-tertiary">{detailStats.totalHours.toFixed(1)}</span> hours
                across{' '}
                <span className="font-bold text-switch-tertiary">{detailStats.uniqueClients}</span> clients.
              </p>
              <div className="flex items-start gap-3">
                <div className="mt-1.5 min-w-[6px] h-[6px] rounded-full bg-switch-tertiary flex-shrink-0" />
                <p>
                  Completed <strong className="text-white">{detailStats.totalTasks}</strong> tasks with an average
                  of <strong className="text-white">{detailStats.avgDaily.toFixed(1)}</strong> hours per day.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="mt-1.5 min-w-[6px] h-[6px] rounded-full bg-switch-tertiary flex-shrink-0" />
                <p>
                  Longest single task: <strong className="text-white">{detailStats.longestTask.task}</strong>{' '}
                  ({(detailStats.longestTask.minutes / 60).toFixed(1)}h).
                </p>
              </div>
            </>
          )}

          {type === 'client' && (
            <>
              <p className="text-lg leading-relaxed mb-2 md:col-span-2">
                {title} received{' '}
                <span className="font-bold text-switch-tertiary">{detailStats.totalHours.toFixed(1)}</span> hours of
                service from{' '}
                <span className="font-bold text-switch-tertiary">{detailStats.uniqueSwitchers}</span> team members.
              </p>
              <div className="flex items-start gap-3">
                <div className="mt-1.5 min-w-[6px] h-[6px] rounded-full bg-switch-tertiary flex-shrink-0" />
                <p>
                  Top contributor: <strong className="text-white">{detailStats.topContributor.name}</strong>{' '}
                  ({detailStats.topContributor.hours.toFixed(1)}h).
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="mt-1.5 min-w-[6px] h-[6px] rounded-full bg-switch-tertiary flex-shrink-0" />
                <p>
                  Busiest day: <strong className="text-white">{detailStats.busiestDay.date}</strong>{' '}
                  ({detailStats.busiestDay.hours.toFixed(1)}h logged).
                </p>
              </div>
            </>
          )}

          {type === 'department' && (
            <>
              <p className="text-lg leading-relaxed mb-2 md:col-span-2">
                The {title} team logged{' '}
                <span className="font-bold text-switch-tertiary">{detailStats.totalHours.toFixed(1)}</span> hours
                with{' '}
                <span className="font-bold text-switch-tertiary">{detailStats.uniqueSwitchers}</span> active members.
              </p>
              <div className="flex items-start gap-3">
                <div className="mt-1.5 min-w-[6px] h-[6px] rounded-full bg-switch-tertiary flex-shrink-0" />
                <p>
                  Primary focus: <strong className="text-white">{detailStats.topContributor.name}</strong>{' '}
                  ({(detailStats.topContributor.hours / detailStats.totalHours * 100).toFixed(0)}% of time).
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="mt-1.5 min-w-[6px] h-[6px] rounded-full bg-switch-tertiary flex-shrink-0" />
                <p>
                  Highest hours logged:{' '}
                  <strong className="text-white">
                    {Object.entries(
                      data.reduce((acc, curr) => {
                        acc[curr.switcher] = (acc[curr.switcher] || 0) + curr.minutes;
                        return acc;
                      }, {})
                    ).sort((a, b) => b[1] - a[1])[0]?.[0] || '-'}
                  </strong>.
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 mb-8">
        <Card className="w-full">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
            <h3 className="text-lg font-bold text-switch-secondary">Time Trends</h3>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex bg-stone-100 p-1 rounded-lg">
                {breakdownOptions.map(opt => (
                  <button
                    key={opt}
                    onClick={() => setTrendMode(opt)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md capitalize transition-all ${
                      trendMode === opt ? 'bg-white shadow-sm text-switch-secondary' : 'text-stone-500'
                    }`}
                  >
                    {opt === 'total' ? 'Total' : `By ${opt === 'department' ? 'Team' : opt}`}
                  </button>
                ))}
              </div>

              {trendMode !== 'total' && (
                <div className="h-8">
                  <MultiSelect
                    label={trendMode === 'department' ? 'team' : trendMode}
                    options={breakdownList}
                    selected={selectedLines}
                    onChange={setSelectedLines}
                  />
                </div>
              )}

              <TimeFrameToggle current={timeframe} onChange={setTimeframe} />
            </div>
          </div>

          {trendMode === 'total' ? (
            <SimpleTrendChart data={trendData} timeframe={timeframe} />
          ) : (
            <MultiLineTrendChart data={trendData} lines={selectedLines} timeframe={timeframe} />
          )}
        </Card>
      </div>

      {type === 'switcher' ? (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <Card>
              <h3 className="text-lg font-bold text-switch-secondary mb-1">Client Allocation</h3>
              <p className="font-playfair text-sm text-stone-400 mb-6">Hours by Client (Bar)</p>
              <AllocationChart data={clientAllocation} limit={10} />
            </Card>
            <Card>
              <h3 className="text-lg font-bold text-switch-secondary mb-1">Client Distribution</h3>
              <p className="font-playfair text-sm text-stone-400 mb-6">Share of total hours (Pie)</p>
              <ClientDistributionChart data={clientAllocation} />
            </Card>
          </div>
          <Card className="max-h-[35rem] overflow-auto">
            <h3 className="text-lg font-bold text-switch-secondary mb-1">Task History</h3>
            <p className="font-playfair text-sm text-stone-400 mb-6">Complete log of tasks performed</p>
            <TaskTable data={data} />
          </Card>
        </>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {type === 'client' ? (
              <Card>
                <h3 className="text-lg font-bold text-switch-secondary mb-1">Switcher Split</h3>
                <p className="font-playfair text-sm text-stone-400 mb-6">Hours logged by team members</p>
                <AllocationChart data={switcherSplit} limit={10} />
              </Card>
            ) : (
              <Card>
                <div className="flex justify-between items-center mb-1">
                  <h3 className="text-lg font-bold text-switch-secondary">Client Allocation</h3>
                  <div className="flex bg-stone-100 p-1 rounded-lg">
                    <button
                      onClick={() => setAllocationChartType('bar')}
                      className={`p-1.5 rounded-md transition-all ${
                        allocationChartType === 'bar' ? 'bg-white text-switch-secondary shadow-sm' : 'text-stone-400'
                      }`}
                    >
                      <BarChart2 size={16} />
                    </button>
                    <button
                      onClick={() => setAllocationChartType('pie')}
                      className={`p-1.5 rounded-md transition-all ${
                        allocationChartType === 'pie' ? 'bg-white text-switch-secondary shadow-sm' : 'text-stone-400'
                      }`}
                    >
                      <PieChartIcon size={16} />
                    </button>
                  </div>
                </div>
                <p className="font-playfair text-sm text-stone-400 mb-6">Distribution of time across clients</p>
                {allocationChartType === 'bar' ? (
                  <AllocationChart data={clientAllocation} limit={10} />
                ) : (
                  <ClientDistributionChart data={clientAllocation} />
                )}
              </Card>
            )}

            <Card>
              <h3 className="text-lg font-bold text-switch-secondary mb-1">
                {type === 'department' ? 'Team Contribution' : 'Team Split'}
              </h3>
              <p className="font-playfair text-sm text-stone-400 mb-6">Internal breakdown</p>
              <DonutChart data={secondaryAllocation} />
            </Card>
          </div>

          <Card className="max-h-[35rem] overflow-auto">
            <h3 className="text-lg font-bold text-switch-secondary mb-1">Task History</h3>
            <p className="font-playfair text-sm text-stone-400 mb-6">Complete log of tasks performed</p>
            <TaskTable data={data} />
          </Card>

          {type === 'client' && (
            <div className="mt-8">
              <h3 className="text-xl font-bold text-switch-secondary font-dm mb-4">Billing Analysis</h3>
              {billingMonthly.length > 0 ? (
                <Card>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm font-dm">
                      <thead>
                        <tr className="text-xs font-bold uppercase tracking-wider text-stone-400 border-b border-stone-100">
                          <th className="py-3 px-4 text-left">Month</th>
                          <th className="py-3 px-4 text-right">Hours</th>
                          <th className="py-3 px-4 text-right">Billed</th>
                          <th className="py-3 px-4 text-right">{'\u20AC'}/hr</th>
                          <th className="py-3 px-4 text-left">vs Target</th>
                          <th className="py-3 px-4 text-left">Raw Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {billingMonthly.map(row => (
                          <tr key={row.month} className="border-b border-stone-50">
                            <td className="py-3 px-4 text-switch-secondary">{row.monthLabel}</td>
                            <td className="py-3 px-4 text-right text-switch-secondary">{row.hours}</td>
                            <td className="py-3 px-4 text-right font-bold text-switch-secondary">{row.billed}</td>
                            <td className="py-3 px-4 text-right font-bold text-switch-primary">{row.effectiveRate}</td>
                            <td className="py-3 px-4">
                              {row.indicator && (
                                <span className={`text-xs font-dm font-bold ${
                                  row.indicator.status === 'over-serviced' ? 'text-red-500' :
                                  row.indicator.status === 'under-serviced' ? 'text-switch-primary' :
                                  'text-stone-400'
                                }`}>
                                  {row.indicator.status === 'over-serviced' ? `\u2193 ${row.indicator.label}` :
                                   row.indicator.status === 'under-serviced' ? `\u2191 ${row.indicator.label}` :
                                   `\u2248 ${row.indicator.label}`}
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-stone-500 text-xs">{row.rawDisplay || ''}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              ) : (
                <Card>
                  <div className="py-8 text-center">
                    <p className="text-stone-400 text-sm font-dm">No billing data entered yet for this client.</p>
                  </div>
                </Card>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};
