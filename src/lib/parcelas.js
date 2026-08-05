// Padrões de parcela encontrados em CSVs/OFX de bancos brasileiros
// Exemplos reais: "AMAZON 02/12", "NETFLIX 3/5", "PARC 2 DE 12", "02 DE 12",
// "PARCELA 2/12", "MERCADOLIVRE*MERCADOLIVRE Parcela 1 de 2"
const PATTERNS = [
  // "02/12" ou "02-12" no final ou após espaço — mais comum
  { re: /\b0*(\d{1,2})\s*[\/\-]\s*0*(\d{2,3})\b/, strip: true },
  // "2 DE 12", "Parcela 1 de 2" — o total aqui era exigido com 2-3 dígitos
  // (\d{2,3}), então qualquer parcelamento de menos de 10x ("1 de 2", "1 de
  // 6", "1 de 9" — a maioria das compras parceladas reais) passava batido,
  // sem virar parcela nenhuma. O prefixo "parcela"/"parc" agora é consumido
  // pelo próprio padrão quando existe, senão sobrava a palavra solta na base
  // ("MERCADOLIVRE*MERCADOLIVRE Parcela" em vez de só o nome do lugar).
  { re: /\b(?:parc(?:ela)?\s+)?0*(\d{1,2})\s+de\s+0*(\d{1,3})\b/i, strip: true },
  // "PARC 02/12" ou "PARCELA 2/12" — mesmo ajuste do total 1-3 dígitos
  { re: /parc(?:ela)?\s+0*(\d{1,2})\s*[\/\-]?\s*0*(\d{1,3})/i, strip: true },
  // "2X" no contexto de "12 de 24X" — menos comum
  { re: /\b0*(\d{1,2})\s*x\s+0*(\d{2,3})\s*x?\b/i, strip: true },
];

/**
 * Tenta detectar parcela na descrição.
 * @returns {{ base: string, atual: number, total: number } | null}
 */
export function detectParcela(desc) {
  for (const { re, strip } of PATTERNS) {
    const m = re.exec(desc);
    if (!m) continue;
    const atual = parseInt(m[1], 10);
    const total = parseInt(m[2], 10);
    // Sanidade: atual entre 1 e total, total entre 2 e 120
    if (atual < 1 || total < 2 || atual > total || total > 120) continue;
    const base = strip
      ? desc.replace(m[0], '').replace(/\s{2,}/g, ' ').trim().replace(/[,\-]+$/, '').trim()
      : desc;
    return { base, atual, total };
  }
  return null;
}

/**
 * Parcela de uma transação, venha de onde vier. A fatura do Inter traz
 * "Parcela 1/15" em COLUNA PRÓPRIA, não na descrição — só olhar a descrição
 * perdia todo o parcelamento de fatura.
 */
export function parcelaDaTx(tx) {
  const m = /^(\d{1,2})\/(\d{1,3})$/.exec(String(tx?.parcela || '').trim());
  if (m) {
    const atual = Number(m[1]), total = Number(m[2]);
    if (atual >= 1 && total >= 2 && atual <= total && total <= 120) {
      return { base: String(tx.descricao || '').trim(), atual, total };
    }
  }
  return detectParcela(tx?.descricao);
}

/**
 * Gera todos os lançamentos de parcelas a partir da parcela atual até a final.
 * @param {object} tx   — transação base com data, valor, tipo, etc.
 * @param {number} atual — número da parcela atual (ex: 2)
 * @param {number} total — total de parcelas (ex: 12)
 * @param {string} grupoId — UUID do grupo de parcelas
 * @returns {object[]}
 */
export function gerarParcelas(tx, atual, total, grupoId) {
  const [ano, mes, dia] = tx.data.split('-').map(Number);
  const resultado = [];

  for (let i = atual; i <= total; i++) {
    // Avança meses a partir da data da parcela atual
    const offset = i - atual;
    const dt = new Date(ano, mes - 1 + offset, 1);
    // Usar o mesmo dia, ou o último dia do mês se o dia não existir
    const ultimoDia = new Date(dt.getFullYear(), dt.getMonth() + 1, 0).getDate();
    const diaFinal  = Math.min(dia, ultimoDia);
    const data = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(diaFinal).padStart(2, '0')}`;

    resultado.push({
      ...tx,
      data,
      descricao: `${tx.descricao_base} (${i}/${total})`,
      descricao_base: tx.descricao_base,
      parcela_atual: i,
      parcela_total: total,
      parcela_grupo: grupoId,
    });
  }
  return resultado;
}

/**
 * Verifica se uma transação parcelada já existe no banco.
 * Usa descricao_base + valor + parcela_atual para identificação única.
 */
export function jaExisteParcela(existentes, descBase, valor, parcelaAtual) {
  return existentes.some(e =>
    e.descricao_base === descBase &&
    Math.abs(Number(e.valor) - Number(valor)) < 0.01 &&
    e.parcela_atual === parcelaAtual
  );
}

/** Gera um UUID v4 simples sem dependência externa */
export function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}
