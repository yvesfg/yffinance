import { supabase } from './lib/supabaseClient.js';

// Helper REST compatível com código existente, usa o cliente autenticado
export async function sb(path, method = 'GET', data = null, params = '') {
  const url = `${supabase.supabaseUrl}/rest/v1/${path}${params}`;
  const session = (await supabase.auth.getSession()).data.session;
  const token = session?.access_token || supabase.supabaseKey;

  const r = await fetch(url, {
    method,
    headers: {
      apikey: supabase.supabaseKey,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Prefer: method === 'POST' || method === 'PATCH' ? 'return=representation' : '',
    },
    body: data ? JSON.stringify(data) : undefined,
  });
  if (!r.ok) throw new Error(await r.text());
  if (r.status === 204) return null;
  return r.json();
}
