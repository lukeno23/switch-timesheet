import { useState, useMemo } from 'react';
import { Tag, ChevronDown, ChevronUp, Users, Briefcase, Clock, Layers, ArrowLeft } from 'lucide-react';
import { Card } from '../../shared/components/Card.jsx';
import { AllocationChart } from '../dashboard/AllocationChart.jsx';
import { DonutChart } from '../dashboard/DonutChart.jsx';
import { SimpleTrendChart } from '../dashboard/SimpleTrendChart.jsx';
import { TaskTable } from '../../shared/components/TaskTable.jsx';

// Category-to-department mapping from Legend.pdf
const CATEGORY_DEPARTMENTS = {
  'Brand Design': 'Design',
  'Production': 'Design',
  'Web Design': 'Design',
  'Motion': 'Design',
  'Photography': 'Design',
  'Misc Design': 'Design',
  'Task management': 'PM',
  'Client Admin': 'PM',
  'Reporting': 'Marketing',
  'CC Management': 'Marketing',
  'Email Marketing': 'Marketing',
  'Paid Management': 'Marketing',
  'Social Media Management': 'Marketing',
  'Strategy': 'Marketing',
  'CRM Management': 'Marketing',
  'Directory Management': 'Marketing',
  'Web Management': 'Marketing',
  'Copywriting': 'Marketing',
  'Brief writing': 'Cross-Department',
  'Brainstorming': 'Cross-Department',
  'Emails': 'Cross-Department',
  'QA': 'Cross-Department',
  'Misc': 'Cross-Department',
  'Research': 'Cross-Department',
  'Pitch Work': 'Cross-Department',
  'Non-Client Meeting': 'Cross-Department',
  'External Client Meeting': 'Cross-Department',
  'Internal Client Meeting': 'Cross-Department',
  'Configuring LLM': 'Cross-Department',
  'Admin': 'Cross-Department',
  'Brand Writing': 'Brand',
  'Accounts': 'Management',
  'Operations': 'Management',
  'Business Development': 'Management',
  'HR': 'Management',
};

const DEPT_ORDER = ['Design', 'Marketing', 'PM', 'Brand', 'Management', 'Cross-Department'];

const DEPT_COLORS = {
  'Design': 'bg-purple-50 text-purple-700 border-purple-200',
  'Marketing': 'bg-blue-50 text-blue-700 border-blue-200',
  'PM': 'bg-orange-50 text-orange-700 border-orange-200',
  'Brand': 'bg-pink-50 text-pink-700 border-pink-200',
  'Management': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Cross-Department': 'bg-stone-50 text-stone-600 border-stone-200',
};

export const CategoriesView = ({ data, onSelectCategory, onChartClick }) => {
  const [collapsedDepts, setCollapsedDepts] = useState({});

  const toggleDept = (dept) => {
    setCollapsedDepts(prev => ({ ...prev, [dept]: !prev[dept] }));
  };

  // Compute category stats from filtered data
  const categoryStats = useMemo(() => {
    const acc = {};
    (data || []).forEach(d => {
      const cat = d.categoryName || 'Misc';
      if (!acc[cat]) acc[cat] = { name: cat, minutes: 0, count: 0, clients: new Set(), switchers: new Set() };
      acc[cat].minutes += d.minutes;
      acc[cat].count += 1;
      acc[cat].clients.add(d.client);
      acc[cat].switchers.add(d.switcher);
    });
    return Object.values(acc).map(c => ({
      ...c,
      hours: c.minutes / 60,
      clients: c.clients.size,
      switchers: c.switchers.size,
    })).sort((a, b) => b.minutes - a.minutes);
  }, [data]);

  const totalMinutes = useMemo(() => categoryStats.reduce((sum, c) => sum + c.minutes, 0), [categoryStats]);

  // Group categories by department
  const departmentGroups = useMemo(() => {
    const groups = {};
    DEPT_ORDER.forEach(dept => { groups[dept] = { name: dept, categories: [], totalMinutes: 0 }; });

    categoryStats.forEach(cat => {
      const dept = CATEGORY_DEPARTMENTS[cat.name] || 'Cross-Department';
      if (!groups[dept]) groups[dept] = { name: dept, categories: [], totalMinutes: 0 };
      groups[dept].categories.push(cat);
      groups[dept].totalMinutes += cat.minutes;
    });

    return DEPT_ORDER
      .map(dept => groups[dept])
      .filter(g => g.categories.length > 0);
  }, [categoryStats]);

  // Summary stats
  const activeCategoryCount = categoryStats.length;
  const totalHours = totalMinutes / 60;
  const mostActive = categoryStats[0] || null;

  return (
    <div className="animate-in fade-in duration-500">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-switch-secondary font-dm">Categories</h2>
      </div>

      {/* Summary stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-switch-bg flex items-center justify-center">
              <Layers size={20} className="text-switch-secondary" />
            </div>
            <div>
              <p className="text-xs font-bold text-stone-400 uppercase tracking-wider font-dm">Active Categories</p>
              <p className="text-2xl font-bold text-switch-secondary font-dm">{activeCategoryCount}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-switch-bg flex items-center justify-center">
              <Clock size={20} className="text-switch-secondary" />
            </div>
            <div>
              <p className="text-xs font-bold text-stone-400 uppercase tracking-wider font-dm">Total Hours</p>
              <p className="text-2xl font-bold text-switch-secondary font-dm">{totalHours.toFixed(1)}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-switch-bg flex items-center justify-center">
              <Tag size={20} className="text-switch-secondary" />
            </div>
            <div>
              <p className="text-xs font-bold text-stone-400 uppercase tracking-wider font-dm">Most Active</p>
              <p className="text-2xl font-bold text-switch-secondary font-dm truncate max-w-[160px]" title={mostActive?.name}>
                {mostActive?.name || '-'}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Department groups */}
      <div className="space-y-6">
        {departmentGroups.map(group => {
          const isCollapsed = collapsedDepts[group.name];
          const groupPct = totalMinutes > 0 ? (group.totalMinutes / totalMinutes * 100) : 0;
          const colorClasses = DEPT_COLORS[group.name] || DEPT_COLORS['Cross-Department'];

          return (
            <div key={group.name}>
              <button
                onClick={() => toggleDept(group.name)}
                className="w-full flex items-center justify-between py-3 mb-3 border-b border-stone-100 cursor-pointer select-none"
              >
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-bold text-switch-secondary font-dm">{group.name}</h3>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${colorClasses}`}>
                    {(group.totalMinutes / 60).toFixed(1)}h ({groupPct.toFixed(0)}%)
                  </span>
                  <span className="text-xs text-stone-400 font-dm">
                    {group.categories.length} {group.categories.length === 1 ? 'category' : 'categories'}
                  </span>
                </div>
                <div className="text-stone-400">
                  {isCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                </div>
              </button>

              {!isCollapsed && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {group.categories.map(cat => {
                    const pct = totalMinutes > 0 ? (cat.minutes / totalMinutes * 100) : 0;
                    return (
                      <button
                        key={cat.name}
                        onClick={() => onSelectCategory(cat.name)}
                        className="bg-white rounded-xl p-4 cursor-pointer hover:shadow-md transition-all text-left border border-stone-100 shadow-sm group"
                      >
                        <h4 className="font-bold text-switch-secondary font-dm mb-2">{cat.name}</h4>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-lg font-bold text-switch-primary font-dm">{cat.hours.toFixed(1)}h</span>
                          <span className="text-xs text-stone-400 font-dm">{pct.toFixed(1)}%</span>
                        </div>
                        {/* Percentage bar */}
                        <div className="w-full h-1.5 bg-switch-primary/20 rounded-full mb-3">
                          <div
                            className="h-1.5 bg-switch-primary rounded-full transition-all"
                            style={{ width: `${Math.min(pct, 100)}%` }}
                          />
                        </div>
                        <div className="flex gap-3 text-xs text-stone-500 font-dm">
                          <span className="flex items-center gap-1">
                            <Briefcase size={12} /> {cat.clients} {cat.clients === 1 ? 'client' : 'clients'}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users size={12} /> {cat.switchers} {cat.switchers === 1 ? 'switcher' : 'switchers'}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// --- Category Detail View with enriched analytics ---

export const CategoryDetailView = ({ categoryName, categoryDetailData, onBack, onChartClick }) => {
  // Switcher breakdown for this category
  const switcherAllocation = useMemo(() => {
    if (!categoryDetailData?.events) return [];
    const grouped = {};
    categoryDetailData.events.forEach(d => {
      const name = d.switcher || 'Unknown';
      grouped[name] = (grouped[name] || 0) + d.minutes / 60;
    });
    return Object.entries(grouped)
      .map(([name, hours]) => ({ name, hours: parseFloat(hours.toFixed(1)) }))
      .sort((a, b) => b.hours - a.hours);
  }, [categoryDetailData]);

  // Client distribution for this category
  const clientDistribution = useMemo(() => {
    if (!categoryDetailData?.events) return [];
    const grouped = {};
    categoryDetailData.events.forEach(d => {
      const name = d.client || 'Unknown';
      grouped[name] = (grouped[name] || 0) + d.minutes / 60;
    });
    return Object.entries(grouped)
      .map(([name, value]) => ({ name, value: parseFloat(value.toFixed(1)) }))
      .sort((a, b) => b.value - a.value);
  }, [categoryDetailData]);

  // Trend data for this category (hours per week)
  const categoryTrendData = useMemo(() => {
    if (!categoryDetailData?.events) return [];
    const byWeek = {};
    categoryDetailData.events.forEach(d => {
      if (!d.dateObj) return;
      const weekStart = new Date(d.dateObj);
      const day = weekStart.getDay();
      weekStart.setDate(weekStart.getDate() - day + (day === 0 ? -6 : 1)); // Monday
      const key = weekStart.toISOString().slice(0, 10);
      const label = `${weekStart.getDate()}/${weekStart.getMonth() + 1}`;
      byWeek[key] = byWeek[key] || { date: key, label, hours: 0 };
      byWeek[key].hours += d.minutes / 60;
    });
    return Object.values(byWeek)
      .map(w => ({ ...w, hours: parseFloat(w.hours.toFixed(1)) }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [categoryDetailData]);

  if (!categoryDetailData) return null;

  if (!categoryDetailData.events || categoryDetailData.events.length === 0) {
    return (
      <div className="animate-in fade-in duration-500">
        <button
          onClick={onBack}
          className="flex items-center text-switch-primary hover:text-switch-primary-dark mb-4 font-dm"
        >
          <ArrowLeft size={16} className="mr-1" /> Back to Categories
        </button>
        <h2 className="text-3xl font-bold text-switch-secondary font-dm mb-4">{categoryName}</h2>
        <Card>
          <p className="text-stone-400 text-sm font-dm py-8 text-center">
            No events recorded for this category in the selected period.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-500">
      <button
        onClick={onBack}
        className="flex items-center text-switch-primary hover:text-switch-primary-dark mb-4 font-dm"
      >
        <ArrowLeft size={16} className="mr-1" /> Back to Categories
      </button>
      <h2 className="text-3xl font-bold text-switch-secondary font-dm mb-2">{categoryName}</h2>

      {/* Summary stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <p className="text-xs font-bold text-stone-400 uppercase tracking-wider font-dm mb-1">Total Hours</p>
          <p className="text-2xl font-bold text-switch-secondary font-dm">{categoryDetailData.totalHours}</p>
        </Card>
        <Card>
          <p className="text-xs font-bold text-stone-400 uppercase tracking-wider font-dm mb-1">Switchers</p>
          <p className="text-2xl font-bold text-switch-secondary font-dm">{categoryDetailData.switcherCount}</p>
        </Card>
        <Card>
          <p className="text-xs font-bold text-stone-400 uppercase tracking-wider font-dm mb-1">Clients</p>
          <p className="text-2xl font-bold text-switch-secondary font-dm">{categoryDetailData.clientCount}</p>
        </Card>
      </div>

      {/* Analytics charts for category detail */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card>
          <h3 className="text-lg font-bold text-switch-secondary font-dm mb-1">Switcher Breakdown</h3>
          <p className="text-sm text-stone-400 font-dm mb-6">Hours by team member</p>
          <AllocationChart
            data={switcherAllocation}
            limit={10}
            onBarClick={(entry) => {
              if (onChartClick) {
                const events = categoryDetailData.events.filter(d => d.switcher === entry.name);
                onChartClick(entry.name, 'switcher', events);
              }
            }}
          />
        </Card>
        <Card>
          <h3 className="text-lg font-bold text-switch-secondary font-dm mb-1">Client Distribution</h3>
          <p className="text-sm text-stone-400 font-dm mb-6">Share of total hours</p>
          <DonutChart
            data={clientDistribution}
            dataKey="value"
            onCellClick={(entry) => {
              if (onChartClick) {
                const events = categoryDetailData.events.filter(d => d.client === entry.name);
                onChartClick(entry.name, 'client', events);
              }
            }}
          />
        </Card>
      </div>
      <Card className="mb-8">
        <h3 className="text-lg font-bold text-switch-secondary font-dm mb-4">Time Trend</h3>
        <SimpleTrendChart
          data={categoryTrendData}
          onDotClick={(payload) => {
            if (onChartClick) {
              const dateKey = payload?.payload?.date || payload?.date;
              onChartClick(dateKey || 'Trend Point', null, categoryDetailData.events);
            }
          }}
        />
      </Card>

      {/* Event table */}
      <Card>
        <h3 className="text-lg font-bold text-switch-secondary font-dm mb-4">Events</h3>
        <TaskTable data={categoryDetailData.events} showContext />
      </Card>
    </div>
  );
};
