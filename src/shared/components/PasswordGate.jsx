import { useState, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import { LogoMain } from '../../constants/logos.jsx';

const hashPassword = async (password) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

export const PasswordGate = ({ onAuthenticated }) => {
  const [inputPassword, setInputPassword] = useState('');
  const [error, setError] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const inputRef = useRef(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsChecking(true);
    setError('');
    try {
      const hash = await hashPassword(inputPassword);
      const expectedHash = import.meta.env.VITE_APP_PASSWORD_HASH;
      if (hash === expectedHash) {
        sessionStorage.setItem('switch_auth', 'true');
        sessionStorage.setItem('switch_auth_hash', hash);
        onAuthenticated();
      } else {
        setError('Incorrect password. Try again.');
        setInputPassword('');
        inputRef.current?.focus();
      }
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="min-h-screen bg-switch-bg flex flex-col items-center justify-center p-4">
      <div className="mb-12">
        <LogoMain />
      </div>
      <div className="bg-white rounded-2xl shadow-sm border border-stone-100 border-t-4 border-switch-primary p-8 max-w-md w-full">
        <h1 className="text-xl font-bold text-switch-secondary font-dm mb-1 text-center">
          Switch Timesheet
        </h1>
        <p className="text-stone-500 text-sm font-dm mb-6 text-center">
          Enter your password to access the dashboard.
        </p>
        <form onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="password"
            value={inputPassword}
            onChange={(e) => setInputPassword(e.target.value)}
            placeholder="Password"
            autoFocus
            className="w-full px-4 py-3 border border-stone-200 rounded-lg font-dm text-sm focus:outline-none focus:border-switch-primary transition-colors mb-4"
          />
          {error && (
            <p className="text-red-500 text-sm font-dm mb-4">{error}</p>
          )}
          <button
            type="submit"
            disabled={isChecking || !inputPassword}
            className="w-full bg-switch-secondary text-white py-3 rounded-lg font-dm font-bold text-sm hover:bg-switch-secondary-dark transition-colors disabled:opacity-50"
          >
            {isChecking ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Checking...
              </span>
            ) : (
              'Sign in to Switch'
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
