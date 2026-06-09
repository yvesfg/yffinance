import { SB_URL, SB_KEY } from './constants.js';

export async function sb(table, method = 'GET', data = null, params = '') {
  const r = await fetch(`${SB_URL}/rest/v1/${table}${params}`, {
    method,
    headers: {
      apikey: SB_KEY,
      Authorization: `Bearer ${SB_KEY}`,
      'Content-Type': 'application/json',
      Prefer: method === 'POST' ? 'return=representation' : method === 'PATCH' ? 'return=representation' : '',
    },
    body: data ? JSON.stringify(data) : undefined,
  });
  if (!r.ok) throw new Error(await r.text());
  if (r.status === 204) return null;
  return r.json();
}
