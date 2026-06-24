import { supabase } from './lib/supabaseClient.js';

const SB_URL = import.meta.env.VITE_SB_URL || 'https://nxcpxnbkmdwumbdsmxpf.supabase.co';
const SB_KEY = import.meta.env.VITE_SB_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54Y3B4bmJrbWR3dW1iZHNteHBmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2NTA2MDEsImV4cCI6MjA5NjIyNjYwMX0.9iMmShZXsYxXpgYrtUPdeXN25fbRgkHvf0hWwmO5414';

export async function sb(path, method = 'GET', data = null, params = '') {
  const url = `${SB_URL}/rest/v1/${path}${params}`;
  const { data: authData } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }));
  const token = authData?.session?.access_token || SB_KEY;

  const headers = {
    apikey: SB_KEY,
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
  if (method === 'POST' || method === 'PATCH') headers.Prefer = 'return=representation';

  const r = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
  });

  const text = await r.text();
  if (!r.ok) {
    // Tenta extrair a mensagem amigável do PostgREST ({ message, hint, details })
    let msg = text;
    try { const j = JSON.parse(text); msg = j.message || j.hint || j.details || text; } catch {}
    throw new Error(msg || `${r.status} ${r.statusText}`);
  }
  // DELETE e respostas vazias não têm corpo JSON
  return text ? JSON.parse(text) : null;
}
