import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

export const SettingsModal = ({ isOpen, onClose, apiKey, setApiKey }) => {
  const [inputKey, setInputKey] = useState(apiKey);

  useEffect(() => {
    setInputKey(apiKey);
  }, [apiKey, isOpen]);

  const handleSave = () => {
    setApiKey(inputKey);
    localStorage.setItem('switch_ai_key', inputKey);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <h3 className="text-xl font-bold text-switch-secondary font-dm mb-4">Settings</h3>
        <div className="mb-6">
          <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
            Gemini API Key
          </label>
          <input
            type="password"
            value={inputKey}
            onChange={(e) => setInputKey(e.target.value)}
            placeholder="Paste your AIza... key here"
            className="w-full p-3 border border-stone-200 rounded-xl focus:outline-none focus:border-switch-primary font-dm"
          />
          <p className="text-xs text-stone-400 mt-2">
            Get your key from{' '}
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noreferrer"
              className="text-switch-primary hover:underline"
            >
              Google AI Studio
            </a>
            . It is stored locally in your browser.
          </p>
        </div>
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-stone-500 hover:bg-stone-50 rounded-lg transition-colors font-dm"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-switch-secondary text-white rounded-lg hover:bg-switch-secondary-dark transition-colors font-dm font-bold"
          >
            Save Key
          </button>
        </div>
      </div>
    </div>
  );
};
