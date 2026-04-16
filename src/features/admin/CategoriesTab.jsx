import { useState, useMemo } from 'react';
import { AdminTable, StatusBadge } from './AdminTable.jsx';
import { AdminModal } from './AdminModal.jsx';
import { adminApi } from '../../shared/services/adminApi.js';

const DEPARTMENTS = ['Brand', 'Design', 'Digital', 'Film', 'Management', 'Production'];

const EMPTY_FORM = {
  name: '',
  department: 'Design',
  llm_hint: '',
};

export const CategoriesTab = ({ categories = [], onDataChange }) => {
  const [showDeactivated, setShowDeactivated] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [saving, setSaving] = useState(false);

  const columns = useMemo(() => [
    { key: 'name', label: 'Name' },
    { key: 'department', label: 'Department' },
    {
      key: 'llm_hint',
      label: 'LLM Hint',
      render: (row) => row.llm_hint || '--',
    },
    {
      key: 'active',
      label: 'Status',
      render: (row) => <StatusBadge active={row.active} />,
    },
  ], []);

  const openAdd = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setErrors({});
    setServerError('');
    setModalOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setForm({
      name: row.name || '',
      department: row.department || 'Design',
      llm_hint: row.llm_hint || '',
    });
    setErrors({});
    setServerError('');
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
        department: form.department,
        llm_hint: form.llm_hint.trim() || null,
      };

      if (editing) {
        payload.id = editing.id;
        await adminApi('update-category', payload);
      } else {
        await adminApi('create-category', payload);
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
      await adminApi('update-category', {
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
        data={categories}
        onRowClick={openEdit}
        emptyMessage="No Categories found. Add the first one above."
        showDeactivated={showDeactivated}
        onToggleDeactivated={() => setShowDeactivated(prev => !prev)}
        addLabel="Add Category"
        onAdd={openAdd}
      />

      <AdminModal
        isOpen={modalOpen}
        onClose={closeModal}
        title={editing ? 'Edit Category' : 'Add Category'}
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
              {saving ? 'Saving...' : 'Save Category'}
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
            placeholder="Category name"
          />
          {errors.name && <p className="text-xs text-red-500 font-dm mt-1">{errors.name}</p>}
        </div>

        {/* Department */}
        <div className="mb-4">
          <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
            Department
          </label>
          <select
            value={form.department}
            onChange={(e) => handleChange('department', e.target.value)}
            className="w-full p-3 border border-stone-200 rounded-xl focus:outline-none focus:border-switch-primary font-dm text-sm"
          >
            {DEPARTMENTS.map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
        </div>

        {/* LLM Hint */}
        <div className="mb-4">
          <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
            LLM Hint
          </label>
          <textarea
            rows={2}
            value={form.llm_hint}
            onChange={(e) => handleChange('llm_hint', e.target.value)}
            className="w-full p-3 border border-stone-200 rounded-xl focus:outline-none focus:border-switch-primary font-dm text-sm resize-none"
            placeholder="Optional hint for the LLM classifier"
          />
        </div>
      </AdminModal>
    </>
  );
};
