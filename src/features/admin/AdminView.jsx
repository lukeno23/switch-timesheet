import { useState, useEffect } from 'react';
import { Users, Briefcase, Tag, Receipt, RefreshCw, Settings } from 'lucide-react';
import { SwitchersTab } from './SwitchersTab.jsx';
import { ClientsTab } from './ClientsTab.jsx';
import { CategoriesTab } from './CategoriesTab.jsx';
import { BillingTab } from './BillingTab.jsx';
import { SyncTab } from './SyncTab.jsx';
import { SettingsTab } from './SettingsTab.jsx';

const TABS = [
  { id: 'switchers', label: 'Switchers', icon: Users },
  { id: 'clients', label: 'Clients', icon: Briefcase },
  { id: 'categories', label: 'Categories', icon: Tag },
  { id: 'billing', label: 'Billing', icon: Receipt },
  { id: 'sync', label: 'Sync', icon: RefreshCw },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export const AdminView = ({
  refData = {},
  billingData = [],
  onDataChange,
  latestSync,
  initialTab = 'switchers',
  apiKey,
  setApiKey,
}) => {
  const [activeTab, setActiveTab] = useState(initialTab || 'switchers');

  // Sync initialTab prop changes to activeTab
  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab]);

  return (
    <div className="animate-in fade-in duration-500">
      {/* Page heading */}
      <h2 className="text-3xl font-bold text-switch-secondary font-dm mb-6">Admin</h2>

      {/* Tab strip */}
      <div className="bg-white rounded-xl border border-stone-100 p-1 flex gap-1 mb-6">
        {TABS.map(tab => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 text-sm px-4 py-2 rounded-lg transition-colors ${
                isActive
                  ? 'bg-switch-bg text-switch-secondary font-bold'
                  : 'text-stone-500 hover:bg-stone-50 hover:text-switch-secondary'
              }`}
            >
              <Icon size={16} />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {activeTab === 'switchers' && (
        <SwitchersTab
          switchers={refData.switchers || []}
          onDataChange={onDataChange}
        />
      )}
      {activeTab === 'clients' && (
        <ClientsTab
          clients={refData.clients || []}
          aliases={refData.aliases || []}
          onDataChange={onDataChange}
        />
      )}
      {activeTab === 'categories' && (
        <CategoriesTab
          categories={refData.categories || []}
          onDataChange={onDataChange}
        />
      )}
      {activeTab === 'billing' && (
        <BillingTab
          billingData={billingData}
          clients={refData.clients || []}
          onDataChange={onDataChange}
        />
      )}
      {activeTab === 'sync' && (
        <SyncTab
          latestSync={latestSync}
          onDataChange={onDataChange}
        />
      )}
      {activeTab === 'settings' && (
        <SettingsTab
          apiKey={apiKey}
          setApiKey={setApiKey}
        />
      )}
    </div>
  );
};
