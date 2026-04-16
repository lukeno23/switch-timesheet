import { useState, useMemo, useEffect } from 'react';
import { Sparkles } from 'lucide-react';
import { COLORS } from '../../constants/colors.js';
import { getWeekNumber } from '../../shared/utils/getWeekNumber.js';
import { callGemini } from '../../shared/services/gemini.js';
import { buildCacheKey } from '../../shared/utils/cacheKey.js';
import { Card } from '../../shared/components/Card.jsx';
import { TimeFrameToggle } from '../../shared/components/TimeFrameToggle.jsx';
import { MultiSelect } from '../../shared/components/MultiSelect.jsx';
import { AIInsightsModal } from '../../shared/components/AIInsightsModal.jsx';
import { SimpleTrendChart } from './SimpleTrendChart.jsx';
import { MultiLineTrendChart } from './MultiLineTrendChart.jsx';
import { AllocationChart } from './AllocationChart.jsx';
import { VerticalBarChart } from './VerticalBarChart.jsx';
import { TopSwitchersGrid } from './TopSwitchersGrid.jsx';
import { ClientDistributionChart } from './ClientDistributionChart.jsx';
import { UpcomingEvents } from '../../shared/components/UpcomingEvents.jsx';

export const DashboardView = ({ data, dateRange, onNavigate, apiKey, onOpenSettings }) => {
  const [trendMetric, setTrendMetric] = useState('total');
  const [trendTimeframe, setTrendTimeframe] = useState('day');
  const [selectedLines, setSelectedLines] = useState([]);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [aiCache, setAiCache] = useState({ key: null, report: null });
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);

  // Derived stats for dashboard
  const stats = useMemo(() => {
    if (!data || data.length === 0) return null;
    const totalHours = data.reduce((acc, curr) => acc + curr.minutes, 0) / 60;
    const switchers = [...new Set(data.map(d => d.switcher))];
    const departments = [...new Set(data.map(d => d.department))];
    const clients = [...new Set(data.map(d => d.client))];

    // Calculate date range using reduce instead of Math.min/max spread
    const dates = data.map(d => d.dateObj).filter(Boolean).map(d => d.getTime());
    const minDate = dates.length
      ? new Date(dates.reduce((m, d) => d < m ? d : m, Infinity))
      : new Date();
    const maxDate = dates.length
      ? new Date(dates.reduce((m, d) => d > m ? d : m, -Infinity))
      : new Date();
    const dayDiff = Math.max(1, (maxDate - minDate) / (1000 * 60 * 60 * 24)) + 1;
    const weeksDiff = Math.max(1, dayDiff / 7);

    const clientHours = {};
    data.forEach(d => clientHours[d.client] = (clientHours[d.client] || 0) + d.minutes);
    const topClients = Object.entries(clientHours)
      .map(([name, mins]) => ({ name, hours: parseFloat((mins / 60 / weeksDiff).toFixed(1)) }))
      .sort((a, b) => b.hours - a.hours);

    const deptHours = {};
    data.forEach(d => deptHours[d.department] = (deptHours[d.department] || 0) + d.minutes);
    const deptWorkload = Object.entries(deptHours)
      .map(([name, mins]) => ({ name, hours: parseFloat((mins / 60).toFixed(1)) }));

    const switcherHours = {};
    data.forEach(d => switcherHours[d.switcher] = (switcherHours[d.switcher] || 0) + d.minutes);
    const switcherWorkload = Object.entries(switcherHours)
      .map(([name, mins]) => ({ name, hours: parseFloat((mins / 60).toFixed(1)) }));

    const switcherStats = {};
    data.forEach(d => {
      const sw = d.switcher;
      if (!switcherStats[sw]) switcherStats[sw] = { minutes: 0, days: new Set(), dept: d.department };
      switcherStats[sw].minutes += d.minutes;
      if (d.dateStr) switcherStats[sw].days.add(d.dateStr);
    });

    const sortedSwitchers = Object.entries(switcherStats)
      .map(([name, stat]) => ({
        switcher: name,
        dept: stat.dept,
        totalHours: stat.minutes / 60,
        avgDailyHours: (stat.minutes / 60) / (stat.days.size || 1),
      }))
      .sort((a, b) => b.totalHours - a.totalHours);

    const topSwitchers = sortedSwitchers.slice(0, 6);
    const top3Switchers = sortedSwitchers.slice(0, 3).map(s => s.switcher).join(', ');
    const top5ClientsNames = topClients.slice(0, 5).map(c => c.name).join(', ');
    const overworkedSwitchers = sortedSwitchers
      .filter(s => s.avgDailyHours > 7)
      .map(s => s.switcher);

    const sortedDepts = [...deptWorkload].sort((a, b) => b.hours - a.hours);
    const topDept = sortedDepts[0];
    const topDeptShare = totalHours > 0 ? ((topDept.hours / totalHours) * 100).toFixed(0) : 0;

    const totalClientHours = Object.entries(clientHours)
      .map(([name, mins]) => ({ name, hours: mins / 60 }));

    return {
      totalHours,
      switcherCount: switchers.length,
      deptCount: departments.length,
      clientCount: clients.length,
      topClients,
      deptWorkload,
      switcherWorkload,
      topSwitchers,
      top3Switchers,
      top5ClientsNames,
      topDept,
      topDeptShare,
      overworkedSwitchers,
      totalClientHours,
    };
  }, [data]);

  // Entity lists for trend dropdown
  const entityLists = useMemo(() => {
    if (!data || data.length === 0) return { department: [], client: [], switcher: [], total: [] };

    const getSortedKeys = (key) => {
      const counts = {};
      data.forEach(d => counts[d[key]] = (counts[d[key]] || 0) + d.minutes);
      return Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .map(e => e[0]);
    };

    return {
      total: ['Total Agency Hours'],
      department: getSortedKeys('department'),
      client: getSortedKeys('client'),
      switcher: getSortedKeys('switcher'),
    };
  }, [data]);

  // Default selection when metric changes
  useEffect(() => {
    if (entityLists[trendMetric] && entityLists[trendMetric].length > 0) {
      setSelectedLines(entityLists[trendMetric].slice(0, 1));
    }
  }, [trendMetric, entityLists]);

  // Multi-line trend data
  const multiLineTrendData = useMemo(() => {
    if (!data || data.length === 0) return [];

    const grouped = {};
    data.forEach(item => {
      if (!item.dateObj) return;
      let timeKey;
      const d = item.dateObj;
      if (trendTimeframe === 'day') timeKey = `${d.getDate()}/${d.getMonth() + 1}`;
      else if (trendTimeframe === 'week') timeKey = `W${getWeekNumber(d)}`;
      else timeKey = d.toLocaleString('default', { month: 'short' });

      if (!grouped[timeKey]) grouped[timeKey] = { name: timeKey };

      if (trendMetric === 'total') {
        const key = 'Total Agency Hours';
        if (selectedLines.includes(key)) {
          grouped[timeKey][key] = (grouped[timeKey][key] || 0) + item.minutes / 60;
        }
      } else {
        const entity = item[trendMetric];
        if (selectedLines.includes(entity)) {
          grouped[timeKey][entity] = (grouped[timeKey][entity] || 0) + item.minutes / 60;
        }
      }
    });

    return Object.values(grouped);
  }, [data, trendMetric, trendTimeframe, selectedLines]);

  const handleGenerateDashboardReport = async () => {
    if (!apiKey) {
      onOpenSettings();
      return;
    }

    const currentKey = buildCacheKey(dateRange, null, null);
    setIsAIModalOpen(true);
    if (aiCache.key === currentKey && aiCache.report) {
      return; // Serve cached report
    }
    // Clear stale report
    setAiCache({ key: null, report: null });
    setIsAiLoading(true);
    setAiError(null);

    const simpleStats = {
      totalHours: stats.totalHours.toFixed(0),
      activeClients: stats.clientCount,
      activeSwitchers: stats.switcherCount,
      topClients: stats.topClients.slice(0, 5).map(c => `${c.name} (${c.hours}h/wk)`),
      deptWorkload: stats.deptWorkload.map(d => `${d.name}: ${d.hours}h`),
      topSwitchers: stats.topSwitchers.map(s => `${s.switcher} (${s.avgDailyHours.toFixed(1)}h/day)`),
    };

    const prompt = `
      You are a strategic data analyst for 'Switch' Agency.
      Analyze the following high-level timesheet data:
      ${JSON.stringify(simpleStats)}

      Generate an Executive Summary formatted with HTML tags (<b>, <br>, <ul>, <li>).
      Structure:
      1. <b>Health Check:</b> Overall activity levels.
      2. <b>Risk Assessment:</b> Identify potential burnout (high daily hours) or client over-dependency.
      3. <b>Strategic Recommendations:</b> Resource allocation suggestions.
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

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-64 text-stone-400 font-dm">
        No data to display.
      </div>
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <AIInsightsModal
        isOpen={isAIModalOpen}
        onClose={() => setIsAIModalOpen(false)}
        title="Executive Summary"
        content={aiCache.report}
        isLoading={isAiLoading}
        error={aiError}
      />

      <header className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <h1 className="text-5xl font-bold text-switch-secondary font-dm tracking-tight">Overview</h1>
        </div>
        <button
          onClick={handleGenerateDashboardReport}
          className="mt-4 md:mt-0 bg-white border border-switch-primary text-switch-secondary px-4 py-2 rounded-xl font-bold font-dm hover:bg-switch-primary hover:text-white transition-all flex items-center gap-2 shadow-sm"
        >
          <Sparkles size={16} />
          {apiKey ? 'Generate AI Report' : 'Enable AI Insights'}
        </button>
      </header>

      {/* KPI Banner */}
      <div className="bg-gradient-to-br from-switch-secondary to-[#455a3f] rounded-2xl p-8 mb-10 text-white shadow-lg relative overflow-hidden font-dm">
        <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-switch-primary rounded-full opacity-10 blur-2xl" />

        <h2 className="font-playfair text-3xl mb-4 relative z-10 text-switch-primary">Let's deliver clarity.</h2>

        <p className="text-xl opacity-90 relative z-10 leading-relaxed max-w-4xl mb-6">
          Switch has logged{' '}
          <span className="font-bold text-switch-tertiary">{stats.totalHours.toFixed(0)}</span> total hours across{' '}
          <span className="font-bold text-switch-tertiary">{stats.switcherCount}</span> Switchers,{' '}
          <span className="font-bold text-switch-tertiary">{stats.clientCount}</span> active clients, and{' '}
          <span className="font-bold text-switch-tertiary">{stats.deptCount}</span> teams.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4 pt-6 border-t border-white/10 text-sm opacity-80">
          <div className="flex items-start gap-3">
            <div className="mt-1.5 min-w-[6px] h-[6px] rounded-full bg-switch-tertiary flex-shrink-0" />
            <p className="leading-snug">
              The top 5 clients by hours logged were{' '}
              <strong className="text-white">{stats.top5ClientsNames}</strong>.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <div className="mt-1.5 min-w-[6px] h-[6px] rounded-full bg-switch-tertiary flex-shrink-0" />
            <p className="leading-snug">
              The 3 busiest Switchers were{' '}
              <strong className="text-white">{stats.top3Switchers}</strong>.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <div className="mt-1.5 min-w-[6px] h-[6px] rounded-full bg-switch-tertiary flex-shrink-0" />
            <p className="leading-snug">
              The <strong className="text-white">{stats.topDept.name}</strong> team carried{' '}
              <strong className="text-white">{stats.topDeptShare}%</strong> of the total workload.
            </p>
          </div>
          {stats.overworkedSwitchers.length > 0 && (
            <div className="flex items-start gap-3">
              <div className="mt-1.5 min-w-[6px] h-[6px] rounded-full bg-red-400 flex-shrink-0" />
              <p className="leading-snug">
                Attention: <strong className="text-white">{stats.overworkedSwitchers.join(', ')}</strong> are
                averaging more than 7 hours per day.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Global Trend Row */}
      <Card className="mb-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 gap-4">
          <div>
            <h3 className="text-lg font-bold text-switch-secondary">Global Hours Trend</h3>
            <p className="text-stone-500 text-sm max-w-xl mt-1">
              Compare performance trends over time. Select a category below to split the data.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex bg-stone-100 p-1 rounded-lg">
              <button
                onClick={() => setTrendMetric('total')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md ${trendMetric === 'total' ? 'bg-white shadow-sm' : 'text-stone-500'}`}
              >
                Total
              </button>
              <button
                onClick={() => setTrendMetric('department')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md ${trendMetric === 'department' ? 'bg-white shadow-sm' : 'text-stone-500'}`}
              >
                By Team
              </button>
              <button
                onClick={() => setTrendMetric('client')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md ${trendMetric === 'client' ? 'bg-white shadow-sm' : 'text-stone-500'}`}
              >
                By Client
              </button>
              <button
                onClick={() => setTrendMetric('switcher')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md ${trendMetric === 'switcher' ? 'bg-white shadow-sm' : 'text-stone-500'}`}
              >
                By Switcher
              </button>
            </div>

            <div className="border-l border-stone-200 h-6 mx-1 hidden md:block" />

            <MultiSelect
              label={trendMetric}
              options={entityLists[trendMetric]}
              selected={selectedLines}
              onChange={setSelectedLines}
            />

            <TimeFrameToggle current={trendTimeframe} onChange={setTrendTimeframe} />
          </div>
        </div>
        <MultiLineTrendChart data={multiLineTrendData} lines={selectedLines} timeframe={trendTimeframe} />
      </Card>

      {/* Client Workload Bar Chart */}
      <div className="mb-8">
        <Card>
          <h3 className="text-lg font-bold text-switch-secondary mb-1">Client Workload</h3>
          <p className="font-playfair text-sm text-stone-400 mb-4">Average weekly hours logged per client</p>
          <AllocationChart
            data={stats.topClients}
            color={COLORS.primary}
            onClick={(clientId) => onNavigate('client', clientId)}
          />
        </Card>
      </div>

      {/* Client Distribution Pie Chart */}
      <div className="mb-8">
        <Card>
          <h3 className="text-lg font-bold text-switch-secondary mb-1">Client Distribution</h3>
          <p className="font-playfair text-sm text-stone-400 mb-4">Share of total hours logged</p>
          <ClientDistributionChart data={stats.totalClientHours} />
        </Card>
      </div>

      {/* Top Switchers Grid */}
      <div className="mb-8">
        <h3 className="text-lg font-bold text-switch-secondary mb-4">Top 6 Switchers by Hours Logged</h3>
        <TopSwitchersGrid
          data={stats.topSwitchers}
          onNavigate={(id) => onNavigate('switcher', id)}
        />
      </div>

      {/* Workload Charts */}
      <div className="flex flex-col gap-8">
        <Card>
          <h3 className="text-lg font-bold text-switch-secondary mb-1">Team Workload</h3>
          <p className="font-playfair text-sm text-stone-400 mb-2">Total hours per team</p>
          <VerticalBarChart
            data={stats.deptWorkload}
            height={350}
            onClick={(id) => onNavigate('dept', id)}
          />
        </Card>
        <Card>
          <h3 className="text-lg font-bold text-switch-secondary mb-1">Switcher Workload</h3>
          <p className="font-playfair text-sm text-stone-400 mb-2">Total hours per employee</p>
          <VerticalBarChart
            data={stats.switcherWorkload}
            height={350}
            onClick={(id) => onNavigate('switcher', id)}
          />
        </Card>
      </div>

      {/* Upcoming Events */}
      <UpcomingEvents events={data} />
    </div>
  );
};
