import { useState, useMemo } from 'react';
import { AdminTable, StatusBadge } from './AdminTable.jsx';
import { AdminModal } from './AdminModal.jsx';
import { adminApi } from '../../shared/services/adminApi.js';

const DEPARTMENTS = ['Brand', 'Design', 'Management', 'Marketing', 'PM'];

const EMPTY_FORM = {
  name: '',
  email: '',
  primary_dept: 'Design',
  is_management_member: false,
};

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const SwitchersTab = ({ switchers = [], onDataChange }) => {
  const [showDeactivated, setShowDeactivated] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null); // null = creating, object = editing
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmWarning, setConfirmWarning] = useState(null);

  const columns = useMemo(() => [
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
    { key: 'primary_dept', label: 'Department' },
    {
      key: 'is_management_member',
      label: 'Management',
      render: (row) => row.is_management_member ? 'Yes' : '--',
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
    setConfirmWarning(null);
    setModalOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setForm({
      name: row.name || '',
      email: row.email || '',
      primary_dept: row.primary_dept || 'Design',
      is_management_member: row.is_management_member || false,
    });
    setErrors({});
    setServerError('');
    setConfirmWarning(null);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
    setConfirmWarning(null);
  };

  const validateField = (field, value) => {
    if (field === 'name' && !value.trim()) return 'Name is required.';
    if (field === 'email') {
      if (!value.trim()) return 'Email is required.';
      if (!emailRegex.test(value)) return 'Enter a valid email address.';
    }
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

  const handleSave = async (confirmed = false) => {
    // Client-side validation
    const nameErr = validateField('name', form.name);
    const emailErr = validateField('email', form.email);
    if (nameErr || emailErr) {
      setErrors({ name: nameErr, email: emailErr });
      return;
    }

    setSaving(true);
    setServerError('');
    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        primary_dept: form.primary_dept,
        is_management_member: form.is_management_member,
      };

      if (editing) {
        payload.id = editing.id;
      }

      if (confirmed) {
        payload.confirmed = true;
      }

      const result = await adminApi(
        editing ? 'update-switcher' : 'create-switcher',
        payload
      );

      // Handle requireConfirmation response (deactivation warning)
      if (result.requireConfirmation) {
        setConfirmWarning(result.message || 'This switcher has upcoming events. Are you sure?');
        setSaving(false);
        return;
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
      const result = await adminApi('update-switcher', {
        id: editing.id,
        active: !editing.active,
      });

      if (result.requireConfirmation) {
        setConfirmWarning(result.message || 'This switcher has upcoming events. Are you sure?');
        setSaving(false);
        return;
      }

      closeModal();
      onDataChange?.();
    } catch (err) {
      setServerError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleConfirm = () => {
    handleSave(true);
  };

  return (
    <>
      <AdminTable
        columns={columns}
        data={switchers}
        onRowClick={openEdit}
        emptyMessage="No Switchers found. Add the first one above."
        showDeactivated={showDeactivated}
        onToggleDeactivated={() => setShowDeactivated(prev => !prev)}
        addLabel="Add Switcher"
        onAdd={openAdd}
      />

      <AdminModal
        isOpen={modalOpen}
        onClose={closeModal}
        title={editing ? 'Edit Switcher' : 'Add Switcher'}
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
              onClick={() => handleSave(false)}
              disabled={saving}
              className="px-4 py-2 bg-switch-secondary text-white rounded-lg hover:bg-switch-secondary-dark transition-colors font-dm font-bold disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Switcher'}
            </button>
          </>
        }
      >
        {/* Confirmation warning */}
        {confirmWarning && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
            <p className="text-sm text-amber-800 font-dm mb-2">{confirmWarning}</p>
            <button
              onClick={handleConfirm}
              disabled={saving}
              className="px-3 py-1.5 bg-amber-500 text-white text-sm font-bold rounded-lg hover:bg-amber-600 transition-colors font-dm disabled:opacity-50"
            >
              Yes, proceed
            </button>
          </div>
        )}

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
            placeholder="Full name"
          />
          {errors.name && <p className="text-xs text-red-500 font-dm mt-1">{errors.name}</p>}
        </div>

        {/* Email */}
        <div className="mb-4">
          <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
            Email
          </label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => handleChange('email', e.target.value)}
            onBlur={() => handleBlur('email')}
            className="w-full p-3 border border-stone-200 rounded-xl focus:outline-none focus:border-switch-primary font-dm text-sm"
            placeholder="name@switch.com.mt"
          />
          {errors.email && <p className="text-xs text-red-500 font-dm mt-1">{errors.email}</p>}
        </div>

        {/* Department */}
        <div className="mb-4">
          <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
            Department
          </label>
          <select
            value={form.primary_dept}
            onChange={(e) => handleChange('primary_dept', e.target.value)}
            className="w-full p-3 border border-stone-200 rounded-xl focus:outline-none focus:border-switch-primary font-dm text-sm"
          >
            {DEPARTMENTS.map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
        </div>

        {/* Management member */}
        <div className="mb-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_management_member}
              onChange={(e) => handleChange('is_management_member', e.target.checked)}
              className="rounded"
            />
            <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">
              Management Member
            </span>
          </label>
        </div>
      </AdminModal>
    </>
  );
};
