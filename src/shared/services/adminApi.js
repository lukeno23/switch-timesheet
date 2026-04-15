const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

const getAuthHash = () => sessionStorage.getItem('switch_auth_hash');

export const adminApi = async (action, payload = {}) => {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/admin`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-switch-auth': getAuthHash(),
    },
    body: JSON.stringify({ action, ...payload }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || 'Request failed');
  return body;
};
