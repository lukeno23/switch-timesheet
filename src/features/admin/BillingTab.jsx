import { useState, useMemo, useEffect } from 'react';
import { AdminTable } from './AdminTable.jsx';
import { AdminModal } from './AdminModal.jsx';
import { adminApi } from '../../shared/services/adminApi.js';

const EMPTY_FORM = {
  client_id: '',
  year_month: '',
  amount: '',
  currency: 'EUR',
  fx_rate_to_eur: '',
  billing_type: '',
  notes: '',
  entered_by: '',
};

const formatMonth = (yearMonth) => {
  if (!yearMonth) return '--';
  const d = new Date(yearMonth);
  if (isNaN(d.getTime())) return yearMonth;
  return d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
};

const formatAmount = (val) => {
  if (val == null || val === '') return '--';
  return Number(val).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export const BillingTab = ({ billingData = [], clients = [], onDataChange }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Active clients sorted A-Z for the select dropdown
  const activeClients = useMemo(
    () => clients.filter(c => c.active !== false).sort((a, b) => a.name.localeCompare(b.name)),
    [clients]
  );

  // Map client_id to client name for table display
  const clientNameMap = useMemo(() => {
    const map = {};
    clients.forEach(c => { map[c.id] = c.name; });
    return map;
  }, [clients]);

  // Compute EUR equivalent whenever amount/currency/fx_rate changes
  const eurEquivalent = useMemo(() => {
    const amt = parseFloat(form.amount);
    if (isNaN(amt) || amt <= 0) return null;
    if (form.currency === 'EUR') return amt;
    const rate = parseFloat(form.fx_rate_to_eur);
    if (isNaN(rate) || rate <= 0) return null;
    return amt * rate;
  }, [form.amount, form.currency, form.fx_rate_to_eur]);

  const columns = useMemo(() => [
    {
      key: 'client_id',
      label: 'Client',
      render: (row) => clientNameMap[row.client_id] || '--',
    },
    {
      key: 'year_month',
      label: 'Month',
      render: (row) => formatMonth(row.year_month),
    },
    {
      key: 'amount',
      label: 'Amount',
      render: (row) => {
        const prefix = row.currency === 'USD' ? '$' : '\u20AC';
        return `${prefix}${formatAmount(row.amount)}`;
      },
    },
    { key: 'currency', label: 'Currency' },
    {
      key: 'eur_equivalent',
      label: 'EUR Equivalent',
      render: (row) => row.eur_equivalent != null ? `\u20AC${formatAmount(row.eur_equivalent)}` : '--',
    },
    {
      key: 'billing_type',
      label: 'Type',
      render: (row) => row.billing_type || '--',
    },
    {
      key: 'entered_by',
      label: 'Entered By',
      render: (row) => row.entered_by || '--',
    },
  ], [clientNameMap]);

  const openAdd = () => {
    setEditing(null);
    setForm({
      ...EMPTY_FORM,
      client_id: activeClients[0]?.id || '',
    });
    setErrors({});
    setServerError('');
    setShowDeleteConfirm(false);
    setModalOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    // Convert year_month date to input[type=month] value (YYYY-MM)
    let monthVal = '';
    if (row.year_month) {
      const d = new Date(row.year_month);
      if (!isNaN(d.getTime())) {
        monthVal = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      }
    }
    setForm({
      client_id: row.client_id || '',
      year_month: monthVal,
      amount: row.amount ?? '',
      currency: row.currency || 'EUR',
      fx_rate_to_eur: row.fx_rate_to_eur ?? '',
      billing_type: row.billing_type || '',
      notes: row.notes || '',
      entered_by: row.entered_by || '',
    });
    setErrors({});
    setServerError('');
    setShowDeleteConfirm(false);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
    setShowDeleteConfirm(false);
  };

  const validateField = (field, value) => {
    if (field === 'client_id' && !value) return 'Client is required.';
    if (field === 'year_month' && !value) return 'Month is required.';
    if (field === 'amount') {
      if (value === '' || value == null) return 'Amount is required.';
      if (isNaN(Number(value)) || Number(value) < 0) return 'Enter a valid amount.';
    }
    if (field === 'fx_rate_to_eur' && form.currency === 'USD') {
      if (value === '' || value == null) return 'FX rate is required for USD.';
      if (isNaN(Number(value)) || Number(value) <= 0) return 'Enter a valid FX rate.';
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

  const handleSave = async () => {
    // Validate all required fields
    const fieldErrors = {};
    for (const field of ['client_id', 'year_month', 'amount']) {
      const err = validateField(field, form[field]);
      if (err) fieldErrors[field] = err;
    }
    if (form.currency === 'USD') {
      const fxErr = validateField('fx_rate_to_eur', form.fx_rate_to_eur);
      if (fxErr) fieldErrors.fx_rate_to_eur = fxErr;
    }
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }

    setSaving(true);
    setServerError('');
    try {
      const amt = parseFloat(form.amount);
      const fxRate = form.currency === 'USD' ? parseFloat(form.fx_rate_to_eur) : null;
      const eurEq = form.currency === 'EUR' ? amt : amt * fxRate;

      const payload = {
        client_id: form.client_id,
        year_month: `${form.year_month}-01`,
        amount: amt,
        currency: form.currency,
        fx_rate_to_eur: fxRate,
        eur_equivalent: eurEq,
        billing_type: form.billing_type || null,
        notes: form.notes.trim() || null,
        entered_by: form.entered_by.trim() || null,
      };

      if (editing) {
        payload.id = editing.id;
        await adminApi('update-billing', payload);
      } else {
        await adminApi('create-billing', payload);
      }

      closeModal();
      onDataChange?.();
    } catch (err) {
      setServerError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editing) return;
    setSaving(true);
    setServerError('');
    try {
      await adminApi('delete-billing', { id: editing.id });
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
        data={billingData}
        onRowClick={openEdit}
        emptyMessage="No billing data entered yet for this client."
        addLabel="Add Entry"
        onAdd={openAdd}
      />

      <AdminModal
        isOpen={modalOpen}
        onClose={closeModal}
        title={editing ? 'Edit Entry' : 'Add Entry'}
        error={serverError}
        footer={
          <>
            {/* Delete confirmation */}
            {editing && !showDeleteConfirm && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                disabled={saving}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-dm font-bold mr-auto disabled:opacity-50"
              >
                Delete Entry
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
              {saving ? 'Saving...' : 'Save Entry'}
            </button>
          </>
        }
      >
        {/* Delete confirmation dialog */}
        {showDeleteConfirm && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-sm font-bold text-red-800 font-dm mb-1">Delete this entry?</p>
            <p className="text-xs text-red-700 font-dm mb-3">
              This billing record will be permanently removed. This cannot be undone.
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleDelete}
                disabled={saving}
                className="px-3 py-1.5 bg-red-500 text-white text-sm font-bold rounded-lg hover:bg-red-600 transition-colors font-dm disabled:opacity-50"
              >
                Delete Entry
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-3 py-1.5 text-stone-500 text-sm rounded-lg hover:bg-stone-50 transition-colors font-dm"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Client */}
        <div className="mb-4">
          <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
            Client
          </label>
          <select
            value={form.client_id}
            onChange={(e) => handleChange('client_id', e.target.value)}
            onBlur={() => handleBlur('client_id')}
            className="w-full p-3 border border-stone-200 rounded-xl focus:outline-none focus:border-switch-primary font-dm text-sm"
          >
            <option value="">Select a client</option>
            {activeClients.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          {errors.client_id && <p className="text-xs text-red-500 font-dm mt-1">{errors.client_id}</p>}
        </div>

        {/* Month */}
        <div className="mb-4">
          <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
            Month
          </label>
          <input
            type="month"
            value={form.year_month}
            onChange={(e) => handleChange('year_month', e.target.value)}
            onBlur={() => handleBlur('year_month')}
            className="w-full p-3 border border-stone-200 rounded-xl focus:outline-none focus:border-switch-primary font-dm text-sm"
          />
          {errors.year_month && <p className="text-xs text-red-500 font-dm mt-1">{errors.year_month}</p>}
        </div>

        {/* Amount + Currency */}
        <div className="mb-4">
          <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
            Amount
          </label>
          <div className="flex items-center gap-3">
            <div className="flex-1 relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 font-dm text-sm">
                {form.currency === 'USD' ? '$' : '\u20AC'}
              </span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.amount}
                onChange={(e) => handleChange('amount', e.target.value)}
                onBlur={() => handleBlur('amount')}
                className="w-full p-3 pl-7 border border-stone-200 rounded-xl focus:outline-none focus:border-switch-primary font-dm text-sm"
                placeholder="0.00"
              />
            </div>
            {/* Currency toggle */}
            <div className="flex rounded-full overflow-hidden border border-stone-200">
              <button
                type="button"
                onClick={() => handleChange('currency', 'EUR')}
                className={`px-3 py-1 text-xs font-bold transition-colors ${
                  form.currency === 'EUR'
                    ? 'bg-switch-secondary text-white'
                    : 'bg-stone-100 text-stone-500'
                }`}
              >
                EUR
              </button>
              <button
                type="button"
                onClick={() => handleChange('currency', 'USD')}
                className={`px-3 py-1 text-xs font-bold transition-colors ${
                  form.currency === 'USD'
                    ? 'bg-switch-secondary text-white'
                    : 'bg-stone-100 text-stone-500'
                }`}
              >
                USD
              </button>
            </div>
          </div>
          {errors.amount && <p className="text-xs text-red-500 font-dm mt-1">{errors.amount}</p>}
        </div>

        {/* FX Rate (shown only when USD) */}
        {form.currency === 'USD' && (
          <div className="mb-4">
            <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
              FX rate to EUR (e.g. 0.92)
            </label>
            <input
              type="number"
              step="0.0001"
              min="0"
              value={form.fx_rate_to_eur}
              onChange={(e) => handleChange('fx_rate_to_eur', e.target.value)}
              onBlur={() => handleBlur('fx_rate_to_eur')}
              className="w-full p-3 border border-stone-200 rounded-xl focus:outline-none focus:border-switch-primary font-dm text-sm"
              placeholder="0.0000"
            />
            <p className="text-xs text-stone-400 font-dm mt-1">
              Rate captured at time of entry -- not updated later.
            </p>
            {errors.fx_rate_to_eur && <p className="text-xs text-red-500 font-dm mt-1">{errors.fx_rate_to_eur}</p>}

            {/* EUR equivalent display */}
            {eurEquivalent != null && (
              <p className="text-sm text-stone-500 font-dm mt-1">
                = \u20AC{formatAmount(eurEquivalent)}
              </p>
            )}
          </div>
        )}

        {/* Billing Type */}
        <div className="mb-4">
          <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
            Billing Type
          </label>
          <select
            value={form.billing_type}
            onChange={(e) => handleChange('billing_type', e.target.value)}
            className="w-full p-3 border border-stone-200 rounded-xl focus:outline-none focus:border-switch-primary font-dm text-sm"
          >
            <option value="">--</option>
            <option value="retainer">Retainer</option>
            <option value="project">Project</option>
          </select>
        </div>

        {/* Notes */}
        <div className="mb-4">
          <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
            Notes
          </label>
          <textarea
            rows={2}
            value={form.notes}
            onChange={(e) => handleChange('notes', e.target.value)}
            className="w-full p-3 border border-stone-200 rounded-xl focus:outline-none focus:border-switch-primary font-dm text-sm resize-none"
            placeholder="Optional notes"
          />
        </div>

        {/* Entered By */}
        <div className="mb-4">
          <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
            Entered By
          </label>
          <input
            type="text"
            value={form.entered_by}
            onChange={(e) => handleChange('entered_by', e.target.value)}
            className="w-full p-3 border border-stone-200 rounded-xl focus:outline-none focus:border-switch-primary font-dm text-sm"
            placeholder="Your name"
          />
        </div>
      </AdminModal>
    </>
  );
};
