import { useEffect } from 'react';
import { X } from 'lucide-react';

/**
 * AdminModal - Shared base modal for admin CRUD forms.
 *
 * Props:
 *   isOpen - bool
 *   onClose - fn()
 *   title - string (e.g. "Add Switcher", "Edit Client")
 *   children - form field JSX
 *   footer - JSX (action buttons)
 *   error - string (server error message)
 *
 * Form field helper styles (for callers):
 *   label:      block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2
 *   input:      w-full p-3 border border-stone-200 rounded-xl focus:outline-none focus:border-switch-primary font-dm text-sm
 *   select:     same as input
 *   field group: mb-4
 *   validation: text-xs text-red-500 font-dm mt-1
 */
export const AdminModal = ({ isOpen, onClose, title, children, footer, error }) => {
  // Escape key close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-switch-secondary font-dm">{title}</h3>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-600"
            aria-label="Close"
          >
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        {children}

        {/* Error display */}
        {error && (
          <p className="text-xs text-red-500 font-dm mt-2 mb-2">
            Couldn't save changes: {error}
          </p>
        )}

        {/* Footer */}
        <div className="flex justify-end gap-3 pt-4 border-t border-stone-100 mt-6">
          {footer}
        </div>
      </div>
    </div>
  );
};
