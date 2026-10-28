// ─────────────────────────────────────────────────────────
//  Só quem está logado gasta IA (mesmo arquivo do CO e do frota-pro).
//  /api/ai-extract repassa ao gateway com o NOSSO token (AI_HUB_TOKEN); sem
//  esta checagem, qualquer um na internet chamava /api/ai-extract e gastava a
//  conta. Confere o JWT do Supabase no próprio Supabase: /auth/v1/user só
//  responde 200 para sessão válida — a chave anon, token vencido ou forjado
//  voltam 401/403.
//  Arquivo com "_" na frente: a Vercel não publica como rota.
// ─────────────────────────────────────────────────────────

const SUPA_URL = process.env.VITE_SB_URL || "https://nxcpxnbkmdwumbdsmxpf.supabase.co";
// Chave anon (pública — já vai no bundle do app). Só identifica o projeto.
const SUPA_ANON = process.env.VITE_SB_KEY
  || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54Y3B4bmJrbWR3dW1iZHNteHBmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2NTA2MDEsImV4cCI6MjA5NjIyNjYwMX0.9iMmShZXsYxXpgYrtUPdeXN25fbRgkHvf0hWwmO5414";

export async function usuarioLogado(req, fetchFn = fetch) {
  const auth = String(req.headers?.authorization || "");
  if (!/^Bearer\s+\S+/.test(auth)) return false;
  try {
    const r = await fetchFn(`${SUPA_URL.replace(/\/$/, "")}/auth/v1/user`, { headers: { apikey: SUPA_ANON, Authorization: auth } });
    if (!r.ok) return false;
    const u = await r.json().catch(() => null);
    return !!u?.id;
  } catch { return false; }
}

// Responde 401 e devolve false quando não há login — uso: if (!(await exigirLogin(req, res))) return;
export async function exigirLogin(req, res, fetchFn = fetch) {
  if (await usuarioLogado(req, fetchFn)) return true;
  res.status(401).json({ error: "Sessão expirada — entre de novo para usar a leitura por IA." });
  return false;
}
