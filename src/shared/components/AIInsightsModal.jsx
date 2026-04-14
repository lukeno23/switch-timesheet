import DOMPurify from 'dompurify';
import { X, Loader2, Sparkles } from 'lucide-react';

export const AIInsightsModal = ({ isOpen, onClose, title, content, isLoading, error }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-stone-100 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-switch-primary text-white p-2 rounded-lg">
              <Sparkles size={20} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-switch-secondary font-dm">{title}</h3>
              <p className="text-xs text-stone-500 font-dm">AI Generated Analysis</p>
            </div>
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600">
            <X size={24} />
          </button>
        </div>

        <div className="p-8 overflow-y-auto flex-1 font-dm text-switch-secondary leading-relaxed">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 size={48} className="text-switch-primary animate-spin mb-4" />
              <p className="text-stone-500 font-medium">Analyzing data...</p>
              <p className="text-stone-400 text-sm mt-1">This may take a few seconds.</p>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-red-500 font-bold mb-2">Analysis Failed</p>
              <p className="text-stone-500 text-sm">{error}</p>
            </div>
          ) : (
            <div
              className="prose prose-stone max-w-none"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content) }}
            />
          )}
        </div>
      </div>
    </div>
  );
};
