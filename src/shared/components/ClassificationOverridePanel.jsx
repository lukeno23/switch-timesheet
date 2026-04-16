import { useState } from 'react';
import { Pencil } from 'lucide-react';
import { saveOverride } from '../services/adminApi.js';
import { Toast } from './Toast.jsx';

const ALLOWED_DEPARTMENTS = ['Brand', 'Design', 'Marketing', 'PM', 'Management', 'Cross-Department'];

export const ClassificationOverridePanel = ({ event, clients, categories, departments, onSaved }) => {
  const [expanded, setExpanded] = useState(false);
  const [overrideClient, setOverrideClient] = useState('');
  const [overrideCategory, setOverrideCategory] = useState('');
  const [overrideDept, setOverrideDept] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const deptOptions = departments && departments.length > 0 ? departments : ALLOWED_DEPARTMENTS;

  const handleExpand = () => {
    // Pre-populate with current values
    const matchedClient = clients?.find(c => c.name === event.client);
    const matchedCategory = categories?.find(c => c.name === event.categoryName);
    setOverrideClient(matchedClient?.id || '');
    setOverrideCategory(matchedCategory?.id || '');
    setOverrideDept(event.department || '');
    setExpanded(true);
  };

  const handleCancel = () => {
    setExpanded(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveOverride(event.id, {
        clientId: overrideClient || null,
        categoryId: overrideCategory || null,
        department: overrideDept || null,
      });
      setToast({ message: 'Override saved.', type: 'success' });
      setExpanded(false);
      if (onSaved) onSaved();
    } catch (err) {
      setToast({ message: 'Could not save override. Check your connection and try again.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (!expanded) {
    return (
      <div className="inline-flex items-center gap-2">
        {event.isUserOverride && (
          <span className="text-xs bg-purple-50 text-purple-700 border border-purple-200 rounded px-1 font-dm">
            Overridden
          </span>
        )}
        <button
          onClick={handleExpand}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-stone-400 hover:text-stone-600 p-1"
          title="Edit classification"
        >
          <Pencil size={14} />
        </button>
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onDismiss={() => setToast(null)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="mt-2 p-3 bg-stone-50 rounded-lg border border-stone-100">
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div>
          <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1 font-dm">Client</label>
          <select
            value={overrideClient}
            onChange={(e) => setOverrideClient(e.target.value)}
            className="w-full px-3 py-2 text-sm font-dm border border-stone-200 rounded-lg bg-white focus:outline-none focus:border-switch-primary transition-colors min-h-[36px]"
          >
            <option value="">-- Select --</option>
            {clients?.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1 font-dm">Category</label>
          <select
            value={overrideCategory}
            onChange={(e) => setOverrideCategory(e.target.value)}
            className="w-full px-3 py-2 text-sm font-dm border border-stone-200 rounded-lg bg-white focus:outline-none focus:border-switch-primary transition-colors min-h-[36px]"
          >
            <option value="">-- Select --</option>
            {categories?.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1 font-dm">Department</label>
          <select
            value={overrideDept}
            onChange={(e) => setOverrideDept(e.target.value)}
            className="w-full px-3 py-2 text-sm font-dm border border-stone-200 rounded-lg bg-white focus:outline-none focus:border-switch-primary transition-colors min-h-[36px]"
          >
            <option value="">-- Select --</option>
            {deptOptions.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex items-center">
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-switch-primary text-white text-xs px-3 py-1 rounded-lg font-dm font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Override'}
        </button>
        <button
          onClick={handleCancel}
          className="text-stone-400 text-xs font-dm ml-2 hover:text-stone-600 transition-colors"
        >
          Cancel
        </button>
      </div>
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onDismiss={() => setToast(null)}
        />
      )}
    </div>
  );
};
