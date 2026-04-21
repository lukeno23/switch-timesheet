import { useState, useEffect } from 'react';
import { Check } from 'lucide-react';

export const SettingsTab = ({ apiKey, setApiKey }) => {
  const [inputKey, setInputKey] = useState(apiKey);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setInputKey(apiKey);
  }, [apiKey]);

  const handleSave = () => {
    setApiKey(inputKey);
    localStorage.setItem('switch_ai_key', inputKey);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const dirty = inputKey !== apiKey;

  return (
    <div className="bg-white rounded-xl border border-stone-100 p-6 max-w-2xl">
      <h3 className="text-lg font-bold text-switch-secondary font-dm mb-1">Gemini API Key</h3>
      <p className="text-xs text-stone-500 font-dm mb-4">
        Powers the AI performance reports. Stored locally in your browser — never sent to Switch servers.
      </p>

      <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
        API Key
      </label>
      <input
        type="password"
        value={inputKey}
        onChange={(e) => setInputKey(e.target.value)}
        placeholder="Paste your AIza... key here"
        className="w-full p-3 border border-stone-200 rounded-xl focus:outline-none focus:border-switch-primary font-dm"
      />
      <p className="text-xs text-stone-400 mt-2 mb-5">
        Get your key from{' '}
        <a
          href="https://aistudio.google.com/app/apikey"
          target="_blank"
          rel="noreferrer"
          className="text-switch-primary hover:underline"
        >
          Google AI Studio
        </a>
        .
      </p>

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={!dirty}
          className="px-4 py-2 bg-switch-secondary text-white rounded-lg hover:bg-switch-secondary-dark transition-colors font-dm font-bold disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Save Key
        </button>
        {saved && (
          <span className="flex items-center gap-1.5 text-green-600 text-sm font-dm animate-in fade-in duration-200">
            <Check size={14} /> Saved
          </span>
        )}
      </div>
    </div>
  );
};
