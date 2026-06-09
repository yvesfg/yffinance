import { supabase } from './lib/supabaseClient.js';

const SB_URL = import.meta.env.VITE_SB_URL || 'https://nxcpxnbkmdwumbdsmxpf.supabase.co';
const SB_KEY = import.meta.env.VITE_SB_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54Y3B4bmJrbWR3dW1iZHNteHBmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkxMjMwMDEsImV4cCI6MjA2NDY5OTAwMX0.SX9G4PEpFR0b9jlZAAmVB3xkZR6YhIAYQl1W2Rw5Rno';

export async function sb(path, method = 'GET', data = null, params = '') {
  const url = `${SB_URL}/rest/v1/${path}${params}`;
  const { data: authData } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }));
  const token = authData?.session?.access_token || SB_KEY;

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
