import { useState, useMemo } from 'react';
import { X } from 'lucide-react';
import { AdminTable, StatusBadge } from './AdminTable.jsx';
import { AdminModal } from './AdminModal.jsx';
import { adminApi } from '../../shared/services/adminApi.js';

const EMPTY_FORM = {
  name: '',
  target_hourly_rate: '',
};

export const ClientsTab = ({ clients = [], aliases = [], onDataChange }) => {
  const [showDeactivated, setShowDeactivated] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [saving, setSaving] = useState(false);
  const [aliasInput, setAliasInput] = useState('');
  // Local alias list for the currently-editing client
  const [localAliases, setLocalAliases] = useState([]);

  // Map aliases by client_id for table display
  const aliasesByClient = useMemo(() => {
    const map = {};
    aliases.forEach(a => {
      if (!map[a.client_id]) map[a.client_id] = [];
      map[a.client_id].push(a);
    });
    return map;
  }, [aliases]);

  const columns = useMemo(() => [
    { key: 'name', label: 'Name' },
    {
      key: 'aliases',
      label: 'Aliases',
      render: (row) => {
        const clientAliases = aliasesByClient[row.id] || [];
        return clientAliases.map(a => a.alias).join(', ') || '--';
      },
    },
    {
      key: 'target_hourly_rate',
      label: 'Target Rate',
      render: (row) => row.target_hourly_rate ? `\u20AC${row.target_hourly_rate}` : '--',
    },
    {
      key: 'active',
      label: 'Status',
      render: (row) => <StatusBadge active={row.active} />,
    },
  ], [aliasesByClient]);

  const openAdd = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setLocalAliases([]);
    setErrors({});
    setServerError('');
    setAliasInput('');
    setModalOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setForm({
      name: row.name || '',
      target_hourly_rate: row.target_hourly_rate ?? '',
    });
    setLocalAliases(aliasesByClient[row.id] || []);
    setErrors({});
    setServerError('');
    setAliasInput('');
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
  };

  const validateField = (field, value) => {
    if (field === 'name' && !value.trim()) return 'Name is required.';
    return null;
  };

  const handleBlur = (field) => {
    const err = validateField(field, form[field]);
    setErrors(prev => ({ ...prev, [field]: err }));
  };

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: null }));
  };

  const handleAddAlias = async () => {
    const val = aliasInput.trim().toUpperCase();
    if (!val) return;
    if (!editing) {
      // For new clients, just store locally until client is saved
      setLocalAliases(prev => [...prev, { alias: val, _local: true }]);
      setAliasInput('');
      return;
    }
    setSaving(true);
    setServerError('');
    try {
      await adminApi('create-alias', { client_id: editing.id, alias: val });
      setAliasInput('');
      onDataChange?.();
      // Refresh local aliases
      const updatedAliases = [...localAliases, { alias: val, client_id: editing.id }];
      setLocalAliases(updatedAliases);
    } catch (err) {
      setServerError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveAlias = async (aliasItem) => {
    if (aliasItem._local) {
      setLocalAliases(prev => prev.filter(a => a !== aliasItem));
      return;
    }
    setSaving(true);
    setServerError('');
    try {
      await adminApi('delete-alias', { id: aliasItem.id });
      setLocalAliases(prev => prev.filter(a => a.id !== aliasItem.id));
      onDataChange?.();
    } catch (err) {
      setServerError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    const nameErr = validateField('name', form.name);
    if (nameErr) {
      setErrors({ name: nameErr });
      return;
    }

    setSaving(true);
    setServerError('');
    try {
      const payload = {
        name: form.name.trim(),
        target_hourly_rate: form.target_hourly_rate !== '' ? Number(form.target_hourly_rate) : null,
      };

      if (editing) {
        payload.id = editing.id;
        await adminApi('update-client', payload);
      } else {
        const result = await adminApi('create-client', payload);
        // If new client, create any locally-added aliases
        const newClientId = result.id || result.data?.id;
        if (newClientId) {
          for (const a of localAliases.filter(a => a._local)) {
            try {
              await adminApi('create-alias', { client_id: newClientId, alias: a.alias });
            } catch {
              // Alias creation failure is non-blocking
            }
          }
        }
      }

      closeModal();
      onDataChange?.();
    } catch (err) {
      setServerError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async () => {
    if (!editing) return;
    setSaving(true);
    setServerError('');
    try {
      await adminApi('update-client', {
        id: editing.id,
        active: !editing.active,
      });
      closeModal();
      onDataChange?.();
    } catch (err) {
      setServerError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <AdminTable
        columns={columns}
        data={clients}
        onRowClick={openEdit}
        emptyMessage="No Clients found. Add the first one above."
        showDeactivated={showDeactivated}
        onToggleDeactivated={() => setShowDeactivated(prev => !prev)}
        addLabel="Add Client"
        onAdd={openAdd}
      />

      <AdminModal
        isOpen={modalOpen}
        onClose={closeModal}
        title={editing ? 'Edit Client' : 'Add Client'}
        error={serverError}
        footer={
          <>
            {editing && editing.active !== false && (
              <button
                onClick={handleDeactivate}
                disabled={saving}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-dm font-bold mr-auto disabled:opacity-50"
              >
                Deactivate
              </button>
            )}
            {editing && editing.active === false && (
              <button
                onClick={handleDeactivate}
                disabled={saving}
                className="px-4 py-2 bg-switch-secondary text-white rounded-lg hover:bg-switch-secondary-dark transition-colors font-dm font-bold mr-auto disabled:opacity-50"
              >
                Reactivate
              </button>
            )}
            <button
              onClick={closeModal}
              className="px-4 py-2 text-stone-500 hover:bg-stone-50 rounded-lg transition-colors font-dm"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-switch-secondary text-white rounded-lg hover:bg-switch-secondary-dark transition-colors font-dm font-bold disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Client'}
            </button>
          </>
        }
      >
        {/* Name */}
        <div className="mb-4">
          <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
            Name
          </label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => handleChange('name', e.target.value)}
            onBlur={() => handleBlur('name')}
            className="w-full p-3 border border-stone-200 rounded-xl focus:outline-none focus:border-switch-primary font-dm text-sm"
            placeholder="Client name"
          />
          {errors.name && <p className="text-xs text-red-500 font-dm mt-1">{errors.name}</p>}
        </div>

        {/* Target Hourly Rate */}
        <div className="mb-4">
          <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
            Target Hourly Rate
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={form.target_hourly_rate}
            onChange={(e) => handleChange('target_hourly_rate', e.target.value)}
            className="w-full p-3 border border-stone-200 rounded-xl focus:outline-none focus:border-switch-primary font-dm text-sm"
            placeholder="Optional (e.g. 85.00)"
          />
        </div>

        {/* Aliases */}
        <div className="mb-4">
          <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
            Aliases
          </label>
          <div className="flex flex-wrap items-center">
            {localAliases.map((aliasItem, i) => (
              <span
                key={aliasItem.id || `local-${i}`}
                className="inline-flex items-center gap-1 bg-stone-100 rounded-full px-3 py-1 text-xs font-dm text-switch-secondary mr-2 mb-2"
              >
                {aliasItem.alias}
                <button
                  onClick={() => handleRemoveAlias(aliasItem)}
                  className="ml-1 text-stone-400 hover:text-red-500 transition-colors"
                  type="button"
                >
                  <X size={14} />
                </button>
              </span>
            ))}
            <div className="inline-flex items-center gap-1 mb-2">
              <input
                type="text"
                value={aliasInput}
                onChange={(e) => setAliasInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddAlias();
                  }
                }}
                className="p-2 border border-stone-200 rounded-lg focus:outline-none focus:border-switch-primary font-dm text-xs w-24"
                placeholder="Add alias"
              />
              <button
                onClick={handleAddAlias}
                type="button"
                className="px-2 py-1.5 bg-stone-100 text-stone-600 text-xs font-bold rounded-lg hover:bg-stone-200 transition-colors font-dm"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      </AdminModal>
    </>
  );
};
