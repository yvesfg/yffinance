// ─────────────────────────────────────────────────────────
//  Leitura de extrato/fatura por IA — para o que não vem em CSV/OFX.
//  Fala com /api/ai-extract → gateway yf-ai-gateway (perfil
//  "extrato_financeiro"). Mesmo padrão do frota-pro e do CO, com uma
//  diferença: aqui o documento tem VÁRIAS páginas e todas interessam,
//  então roda uma chamada por página e junta os lançamentos.
// ─────────────────────────────────────────────────────────

import { ehTransferencia } from './parsers.js';
import { detectParcela } from './parcelas.js';

export const MAX_PAGINAS = 12;   // fatura/extrato mensal não passa disso
export const MAX_MB = 12;

function toBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(new Error('Não foi possível ler o arquivo'));
    r.readAsDataURL(file);
  });
}

// Reduz a imagem antes de enviar — corta payload sem perder legibilidade.
function downscaleImage(dataUrl, maxPx = 1800, quality = 0.85) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const s = Math.min(1, maxPx / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * s);
      c.height = Math.round(img.height * s);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      resolve(c.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => reject(new Error('Não foi possível processar a imagem'));
    img.src = dataUrl;
  });
}

/**
 * Renderiza as páginas do PDF em JPEG. O PDF vira imagem ANTES de sair do
 * navegador, assim qualquer provedor de IA lê (nem todos processam PDF nativo,
 * e os que processam ficam lentos demais em documento real).
 *
 * O worker do pdfjs NÃO pode ser importado via `?url` do Vite — isso trava
 * page.render() indefinidamente. Por isso é servido como arquivo estático em
 * /public com nome fixo (ver public/pdf.worker.min.mjs).
 */
async function pdfParaImagens(file, { maxPaginas = MAX_PAGINAS, maxPx = 1800, quality = 0.85 } = {}) {
  // Import dinâmico: pdfjs-dist é pesado (~1,4 MB) e só entra no bundle de
  // quem realmente abre um PDF.
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

  const buf = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buf, standardFontDataUrl: '/pdf-standard-fonts/' }).promise;

  const total = Math.min(pdf.numPages, maxPaginas);
  const imagens = [];
  for (let i = 1; i <= total; i++) {
    const page = await pdf.getPage(i);
    const base = page.getViewport({ scale: 1 });
    const escala = Math.min(2, maxPx / Math.max(base.width, base.height));
    const viewport = page.getViewport({ scale: escala });
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);
    await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
    imagens.push(canvas.toDataURL('image/jpeg', quality));
  }
  return { imagens, paginasIgnoradas: Math.max(0, pdf.numPages - total) };
}

async function chamarGateway(image) {
  const r = await fetch('/api/ai-extract', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ profile: 'extrato_financeiro', image, mimeType: 'image/jpeg' }),
  });
  if (!r.ok) {
    const j = await r.json().catch(() => ({}));
    throw new Error(j.error || `HTTP ${r.status}`);
  }
  return r.json();
}

// Converte o lançamento neutro da IA para o mesmo formato dos parsers de
// CSV/OFX — daí para frente o pipeline (dedup, parcelas, transferência) é
// exatamente o mesmo, sem caminho paralelo.
function paraTransacao(l) {
  // A IA devolve a parcela em campo próprio, mas na maioria dos documentos ela
  // JÁ está na descrição ("AMAZON 02/12"). Anexar às cegas gerava
  // "AMAZON 02/12 02/12" e, pior, a descrição-base das parcelas futuras
  // nascia com o número da parcela dentro.
  const descricao = l.parcela && !detectParcela(l.descricao)
    ? `${l.descricao} ${l.parcela}`
    : l.descricao;
  const tipo = l.sentido === 'entrada' ? 'receita' : 'despesa';
  return { data: l.data, valor: Number(l.valor), tipo, sentido: l.sentido, transf: ehTransferencia(descricao), descricao, _sel: true, _ia: true };
}

/**
 * Lê um extrato/fatura em PDF ou imagem e devolve transações no formato dos
 * parsers. `onProgresso(feito, total)` acompanha o andamento por página.
 */
export async function lerDocumento(file, { onProgresso } = {}) {
  if (file.size > MAX_MB * 1024 * 1024) throw new Error(`Arquivo muito grande — máx. ${MAX_MB} MB`);

  const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
  let imagens = [], paginasIgnoradas = 0;
  try {
    if (isPdf) ({ imagens, paginasIgnoradas } = await pdfParaImagens(file));
    else imagens = [await downscaleImage(await toBase64(file))];
  } catch {
    throw new Error(isPdf ? 'Não foi possível ler o PDF — tente exportar como imagem' : 'Não foi possível processar a imagem');
  }

  const txs = [];
  let documento = 'desconhecido', periodo = '', confMin = null;
  for (let i = 0; i < imagens.length; i++) {
    onProgresso?.(i, imagens.length);
    const out = await chamarGateway(imagens[i]);
    if (out.documento && out.documento !== 'desconhecido') documento = out.documento;
    if (out.periodo && !periodo) periodo = out.periodo;
    if (typeof out.confianca === 'number') confMin = confMin == null ? out.confianca : Math.min(confMin, out.confianca);
    for (const l of out.lancamentos || []) txs.push(paraTransacao(l));
  }
  onProgresso?.(imagens.length, imagens.length);

  return { txs, documento, periodo, confianca: confMin, paginas: imagens.length, paginasIgnoradas };
}
