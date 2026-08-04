// ─────────────────────────────────────────────────────────
//  PROXY DE IA — encaminha para o gateway central yf-ai-gateway.
//  O browser chama /api/ai-extract e nunca vê o token do hub; o
//  AI_HUB_TOKEN vive só aqui, na env do projeto na Vercel.
//  Mesmo padrão já usado no controle-operacional e no frota-pro.
//
//  Envs (Vercel → yffinance → Environment Variables):
//    AI_HUB_URL    (opcional) default https://yf-ai-gateway.vercel.app/api/extract
//    AI_HUB_TOKEN  precisa bater com AI_TOKEN_YFFINANCE no gateway
// ─────────────────────────────────────────────────────────

// Página de extrato renderizada em JPEG passa fácil de 1 MB; o default da
// Vercel (1mb) recusaria o corpo.
export const config = { api: { bodyParser: { sizeLimit: "8mb" } } };

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Método não permitido" });
    return;
  }
  const url = process.env.AI_HUB_URL || "https://yf-ai-gateway.vercel.app/api/extract";
  const hubToken = process.env.AI_HUB_TOKEN || "";
  if (!hubToken) {
    res.status(503).json({ error: "Leitura por IA não configurada (falta AI_HUB_TOKEN)" });
    return;
  }
  try {
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-ai-token": hubToken },
      body: JSON.stringify(req.body || {}),
    });
    const text = await r.text();
    res.status(r.status).setHeader("Content-Type", "application/json");
    res.send(text);
  } catch (e) {
    res.status(502).json({ error: e.message || "Falha ao falar com o gateway de IA" });
  }
}
