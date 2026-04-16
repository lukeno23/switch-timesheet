import React, { useState, useMemo, useEffect } from 'react';
import {
  Users, Briefcase, Building2, ArrowRight, ArrowUpDown,
  BarChart2, Calendar as CalendarIcon, Settings, Table,
  ShieldCheck,
} from 'lucide-react';

import { COLORS } from './constants/colors.js';
import { LogoMain, LogoSquare } from './constants/logos.jsx';
import { PasswordGate } from './shared/components/PasswordGate.jsx';
import ErrorBoundary from './shared/components/ErrorBoundary.jsx';
import { SettingsModal } from './shared/components/SettingsModal.jsx';
import { Card } from './shared/components/Card.jsx';
import { TaskTable } from './shared/components/TaskTable.jsx';
import { SyncStatusChip } from './shared/components/SyncStatusChip.jsx';
import { Toast } from './shared/components/Toast.jsx';
import { DashboardView } from './features/dashboard/DashboardView.jsx';
import { DetailView } from './features/detail/DetailView.jsx';
import { useSupabaseData } from './shared/hooks/useSupabaseData.js';
import { formatRelativeTime, formatAbsoluteTime } from './shared/utils/relativeTime.js';
import { calcEffectiveRate } from './shared/utils/billingCalc.js';
import { AdminView } from './features/admin/AdminView.jsx';

// --- ListView (inline — thin list rendering, no sub-components needed) ---

const ListView = ({ title, items, onItemClick, icon: Icon, sortBy, onSortChange, renderExtra }) => {
  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      if (sortBy === 'hours') return b.hours - a.hours;
      return a.id.localeCompare(b.id);
    });
  }, [items, sortBy]);

  return (
    <div className="animate-in fade-in duration-500">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-switch-secondary font-dm">{title}</h2>
        <div className="flex bg-white rounded-lg border border-stone-200 p-1">
          <button
            onClick={() => onSortChange('alpha')}
            className={`px-3 py-1.5 text-xs font-bold rounded-md flex items-center gap-1 transition-colors ${sortBy === 'alpha' ? 'bg-switch-bg text-switch-secondary' : 'text-stone-400'}`}
          >
            A-Z
          </button>
          <button
            onClick={() => onSortChange('hours')}
            className={`px-3 py-1.5 text-xs font-bold rounded-md flex items-center gap-1 transition-colors ${sortBy === 'hours' ? 'bg-switch-bg text-switch-secondary' : 'text-stone-400'}`}
          >
            <ArrowUpDown size={12} /> Hours
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sortedItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onItemClick(item.id)}
            className="group bg-white p-5 rounded-xl border border-stone-100 shadow-sm hover:shadow-md hover:border-switch-primary transition-all text-left flex items-center justify-between"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-switch-bg flex items-center justify-center text-switch-secondary group-hover:bg-switch-primary group-hover:text-white transition-colors">
                <Icon size={20} />
              </div>
              <div>
                <h3 className="font-bold text-switch-secondary font-dm">{item.id}</h3>
                <div className="flex gap-3 text-xs text-stone-500 font-dm mt-0.5">
                  <span>{item.count} tasks</span>
                  <span>•</span>
                  <span className="font-bold text-switch-primary">{item.hours.toFixed(1)} hrs</span>
                  {renderExtra && renderExtra(item)}
                </div>
              </div>
            </div>
            <ArrowRight size={18} className="text-stone-300 group-hover:text-switch-primary transition-colors" />
          </button>
        ))}
      </div>
    </div>
  );
};

// --- Main App ---

const App = () => {
  // Auth gate
  const [isAuthenticated, setIsAuthenticated] = useState(
    () => sessionStorage.getItem('switch_auth') === 'true'
  );

  if (!isAuthenticated) {
    return <PasswordGate onAuthenticated={() => setIsAuthenticated(true)} />;
  }

  return <AuthenticatedApp />;
};

// Separate component to avoid hooks-after-conditional return issues
const AuthenticatedApp = () => {
  const { data, refData, billingData, latestSync, loading, error, refetch } = useSupabaseData();
  const [view, setView] = useState({ type: 'dashboard', id: null });
  const [sortOrder, setSortOrder] = useState('alpha');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('switch_ai_key') || '');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Set default date range when data loads
  useEffect(() => {
    if (data && data.length > 0 && !dateRange.start) {
      setDateRange({ start: '2026-01-04', end: new Date().toISOString().split('T')[0] });
    }
  }, [data]);

  const handleNavigate = (type, id) => {
    setView({ type: type + '_detail', id });
  };

  // Date-range filtered data
  const filteredData = useMemo(() => {
    if (!data) return null;
    if (!dateRange.start || !dateRange.end) return data;

    const [startYear, startMonth, startDay] = dateRange.start.split('-').map(Number);
    const start = new Date(startYear, startMonth - 1, startDay);
    const [endYear, endMonth, endDay] = dateRange.end.split('-').map(Number);
    const end = new Date(endYear, endMonth - 1, endDay);
    end.setHours(23, 59, 59, 999);

    return data.filter(d => d.dateObj >= start && d.dateObj <= end);
  }, [data, dateRange]);

  // List data for ListView screens
  const listData = useMemo(() => {
    if (!filteredData) return {};
    const process = (key) => {
      const acc = {};
      filteredData.forEach(d => {
        if (!acc[d[key]]) acc[d[key]] = { count: 0, minutes: 0 };
        acc[d[key]].count += 1;
        acc[d[key]].minutes += d.minutes;
      });
      return Object.entries(acc).map(([id, val]) => ({ id, count: val.count, hours: val.minutes / 60 }));
    };
    return {
      switchers: process('switcher'),
      departments: process('department'),
      clients: process('client'),
    };
  }, [filteredData]);

  // Enrich client list items with billing effective rate
  const clientsWithBilling = useMemo(() => {
    if (!listData?.clients || !billingData || !refData?.clients) return listData?.clients || [];
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

    return listData.clients.map(item => {
      const clientRecord = refData.clients.find(c => c.name === item.id);
      const billing = billingData.find(b => b.client_id === clientRecord?.id && b.year_month === currentMonth);
      const hours = item.hours;
      const effectiveRate = billing ? calcEffectiveRate(hours, billing.eur_equivalent) : null;

      return {
        ...item,
        effectiveRate,
        clientId: clientRecord?.id,
        targetRate: clientRecord?.target_hourly_rate,
      };
    });
  }, [listData, billingData, refData]);

  // Detail data for detail views
  const detailData = useMemo(() => {
    if (!filteredData || view.type === 'dashboard' || !view.id) return [];
    if (view.type === 'switcher_detail') return filteredData.filter(d => d.switcher === view.id);
    if (view.type === 'dept_detail') return filteredData.filter(d => d.department === view.id);
    if (view.type === 'client_detail') return filteredData.filter(d => d.client === view.id);
    return [];
  }, [filteredData, view]);

  if (loading) {
    return (
      <div className="p-8 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3].map(i => <div key={i} className="w-full h-24 animate-pulse bg-stone-100 rounded-2xl" />)}
        </div>
        {[1,2,3,4].map(i => <div key={i} className="h-10 animate-pulse bg-stone-50 rounded-lg w-full mb-2" />)}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full p-16">
        <div className="text-center">
          <p className="text-red-500 text-sm font-dm mb-4">Couldn't load timesheet data. Check your connection and try refreshing.</p>
          <button onClick={refetch} className="px-4 py-2 bg-switch-secondary text-white rounded-lg hover:bg-switch-secondary-dark transition-colors font-dm font-bold">
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full p-16">
        <Card className="text-center max-w-md p-8">
          <CalendarIcon size={48} className="text-stone-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-switch-secondary font-dm mb-2">No timesheet data yet</h3>
          <p className="text-sm text-stone-500 font-dm mb-6">The nightly sync hasn't run yet. Head to Admin &gt; Sync to trigger a manual sync.</p>
          <button onClick={() => setView({ type: 'admin', adminTab: 'sync' })} className="px-4 py-2 bg-switch-secondary text-white rounded-lg hover:bg-switch-secondary-dark transition-colors font-dm font-bold">
            Go to Sync
          </button>
        </Card>
      </div>
    );
  }

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart2 },
    { id: 'switchers', label: 'Switchers', icon: Users },
    { id: 'departments', label: 'Teams', icon: Building2 },
    { id: 'clients', label: 'Clients', icon: Briefcase },
    { id: 'tasks', label: 'Task Explorer', icon: Table },
    { id: 'admin', label: 'Admin', icon: ShieldCheck },
  ];

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-switch-bg flex font-dm text-switch-secondary">
        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          apiKey={apiKey}
          setApiKey={setApiKey}
        />

        {/* Sidebar */}
        <aside className="w-20 lg:w-64 bg-white border-r border-stone-100 flex-shrink-0 flex flex-col sticky top-0 h-screen z-10 transition-all">
          <div className="flex flex-col justify-center items-center lg:items-start lg:px-8 py-6 border-b border-stone-50">
            <div className="hidden lg:block mb-1"><LogoMain /></div>
            <div className="lg:hidden"><LogoSquare /></div>
            <span className="hidden lg:block text-switch-primary font-dm text-xs font-bold tracking-widest uppercase w-full mt-3">
              Workload Dashboard
            </span>
          </div>

          <nav className="p-4 space-y-2 flex-1">
            {navItems.map(item => (
              <button
                key={item.id}
                onClick={() => setView({ type: item.id, id: null })}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm ${
                  view.type === item.id || view.type.startsWith(item.id.slice(0, -1))
                    ? 'bg-switch-bg text-switch-secondary'
                    : 'text-stone-500 hover:bg-stone-50 hover:text-switch-secondary'
                }`}
              >
                <item.icon size={20} />
                <span className="hidden lg:block">{item.label}</span>
                {(view.type === item.id) && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-switch-primary hidden lg:block" />
                )}
              </button>
            ))}
          </nav>

          {/* Date Filter */}
          <div className="px-6 py-4 border-t border-stone-100">
            <div className="flex items-center gap-2 mb-2 text-stone-400">
              <CalendarIcon size={14} />
              <span className="text-xs font-bold uppercase tracking-wider">Date Range</span>
            </div>
            <div className="flex flex-col gap-2">
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                className="w-full text-xs p-2 border border-stone-200 rounded-lg focus:outline-none focus:border-switch-primary font-dm text-stone-600"
              />
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                className="w-full text-xs p-2 border border-stone-200 rounded-lg focus:outline-none focus:border-switch-primary font-dm text-stone-600"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 lg:p-6 border-t border-stone-50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-switch-bg flex items-center justify-center">
                <div className="w-6 h-6"><LogoSquare /></div>
              </div>
              <div className="hidden lg:block">
                <p className="text-sm font-bold text-switch-secondary font-dm">Switch Admin</p>
                <p className="text-xs text-stone-400 font-dm" title={latestSync ? formatAbsoluteTime(latestSync.started_at) : ''}>
                  Last synced: <span className="font-bold text-switch-secondary">{latestSync ? formatRelativeTime(latestSync.started_at) : 'Never'}</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {latestSync?.errors && Object.keys(latestSync.errors).length > 0 && (
                <SyncStatusChip onClick={() => setView({ type: 'admin', adminTab: 'sync' })} />
              )}
              <button onClick={() => setIsSettingsOpen(true)} className="text-stone-400 hover:text-switch-secondary">
                <Settings size={20} />
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6 lg:p-12 overflow-y-auto max-w-7xl mx-auto w-full relative">
          <ErrorBoundary>
            {view.type === 'dashboard' && (
              <DashboardView
                data={filteredData || []}
                dateRange={dateRange}
                onNavigate={handleNavigate}
                apiKey={apiKey}
                onOpenSettings={() => setIsSettingsOpen(true)}
              />
            )}

            {view.type === 'switchers' && (
              <ListView
                title="All Switchers"
                items={listData.switchers || []}
                icon={Users}
                onItemClick={(id) => setView({ type: 'switcher_detail', id })}
                sortBy={sortOrder}
                onSortChange={setSortOrder}
              />
            )}

            {view.type === 'departments' && (
              <ListView
                title="All Teams"
                items={listData.departments || []}
                icon={Building2}
                onItemClick={(id) => setView({ type: 'dept_detail', id })}
                sortBy={sortOrder}
                onSortChange={setSortOrder}
              />
            )}

            {view.type === 'clients' && (
              <ListView
                title="All Clients"
                items={clientsWithBilling}
                icon={Briefcase}
                onItemClick={(id) => setView({ type: 'client_detail', id })}
                sortBy={sortOrder}
                onSortChange={setSortOrder}
                renderExtra={(item) => (
                  <>
                    <span className="text-stone-300 mx-0.5">|</span>
                    {item.effectiveRate != null ? (
                      <span className="text-switch-primary font-bold text-sm">
                        {'\u20AC'}{item.effectiveRate.toFixed(2)}/hr
                      </span>
                    ) : (
                      <span className="text-stone-400 text-sm">{'\u2014'}</span>
                    )}
                  </>
                )}
              />
            )}

            {view.type === 'tasks' && (
              <div className="animate-in fade-in duration-500">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-3xl font-bold text-switch-secondary font-dm">Task Explorer</h2>
                </div>
                <Card>
                  <TaskTable data={filteredData || []} showContext />
                </Card>
              </div>
            )}

            {view.type.endsWith('_detail') && (() => {
              const clientRecord = view.type === 'client_detail'
                ? refData?.clients?.find(c => c.name === view.id)
                : null;
              return (
                <DetailView
                  title={view.id}
                  type={view.type.replace('_detail', '').replace('dept', 'department')}
                  data={detailData}
                  dateRange={dateRange}
                  onBack={() => {
                    const backType = view.type.endsWith('client_detail')
                      ? 'clients'
                      : view.type.endsWith('dept_detail')
                      ? 'departments'
                      : 'switchers';
                    setView({ type: backType, id: null });
                  }}
                  apiKey={apiKey}
                  onOpenSettings={() => setIsSettingsOpen(true)}
                  billingData={billingData}
                  clientId={clientRecord?.id}
                  clientTargetRate={clientRecord?.target_hourly_rate}
                />
              );
            })()}

            {view.type === 'admin' && (
              <AdminView
                refData={refData}
                billingData={billingData}
                onDataChange={refetch}
                latestSync={latestSync}
              />
            )}
          </ErrorBoundary>
        </main>
      </div>
    </ErrorBoundary>
  );
};

export default App;
