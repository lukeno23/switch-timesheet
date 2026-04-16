import { useEffect } from 'react';
import { Check, X } from 'lucide-react';

export const Toast = ({ message, type = 'success', onDismiss, duration = 5000 }) => {
  useEffect(() => {
    const timer = setTimeout(onDismiss, duration);
    return () => clearTimeout(timer);
  }, [onDismiss, duration]);

  const isError = type === 'error';

  return (
    <div className={`fixed bottom-6 right-6 ${isError ? 'bg-red-600' : 'bg-switch-secondary'} text-white rounded-xl px-5 py-3 shadow-lg z-50 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-300`}>
      {isError ? <X size={18} /> : <Check size={18} className="text-switch-primary" />}
      <span className="text-sm font-dm font-bold">{message}</span>
    </div>
  );
};
