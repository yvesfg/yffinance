import { detectParcela } from './parcelas.js';

export function normData(raw) {
  raw = (raw || '').trim().replace(/['"]/g, '');
  if (/^\d{2}[-\/]\d{2}[-\/]\d{4}/.test(raw)) {
    const p = raw.split(/[-\/]/);
    return `${p[2]}-${p[1]}-${p[0]}`;
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  return raw;
}

// Acento fora, para casar cabeçalho de CSV ("Lançamento" ≡ "lancamento")
export const semAcento = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '');

/**
 * Valor monetário em qualquer formato que os bancos brasileiros mandam.
 *
 * O símbolo da moeda quebrava tudo: a fatura do Inter traz "R$ 1.280,12" com
 * espaço NÃO-QUEBRÁVEL, e o parseFloat parava no "R" — a compra de R$ 1.280,12
 * virava R$ 1,28. Agora o símbolo (e qualquer letra) sai antes da conversão, e
 * quem decide o separador decimal é a ÚLTIMA pontuação, não uma lista de casos.
 */
export function normValor(raw) {
  let s = String(raw ?? '').replace(/[\s ]/g, '').replace(/['"]/g, '');
  if (!s) return NaN;
  // "-R$ 45,60", "45,60-" e "(45,60)" são todos negativos
  const negativo = s.includes('-') || /^\(.*\)$/.test(s);
  s = s.replace(/[^0-9.,]/g, '');
  if (!s) return NaN;

  const virgula = s.lastIndexOf(','), ponto = s.lastIndexOf('.');
  if (virgula > ponto) {
    s = s.replace(/\./g, '').replace(',', '.');        // 1.280,12
  } else if (ponto > virgula) {
    s = /^\d{1,3}(\.\d{3})+$/.test(s)
      ? s.replace(/\./g, '')                            // 1.280 (milhar, sem centavos)
      : s.replace(/,/g, '');                            // 1,280.12
  } else {
    s = s.replace(',', '.');
  }
  const n = parseFloat(s);
  return isNaN(n) ? NaN : (negativo ? -n : n);
}

// Movimentação entre contas (a mesma operação aparece nos dois extratos)
const P_TRANSF  = ['ted','doc','pix','transferencia','transferência','transf','entre contas'];
// Direção quando o extrato não traz sinal no valor (CSV sem coluna D/C)
const P_ENTRADA = ['recebido','recebida','recebimento','credito','crédito','entrada','deposito','depósito','salário','salario','rendimento','estorno','devolucao','devolução'];
const P_SAIDA   = ['enviado','enviada','envio','debito','débito','saida','saída','pagamento','compra','saque','tarifa'];

export function ehTransferencia(desc) {
  const d = (desc || '').toLowerCase();
  return P_TRANSF.some(p => d.includes(p));
}

/**
 * Direção da movimentação na conta do extrato: 'entrada' (dinheiro chegou)
 * ou 'saida' (dinheiro saiu). O sinal do valor manda quando existe; sem ele,
 * cai nas palavras-chave. É isso que impede "PIX RECEBIDO" de virar débito.
 */
export function detectSentido(desc, valorOrig) {
  if (Number.isFinite(valorOrig) && valorOrig !== 0) return valorOrig > 0 ? 'entrada' : 'saida';
  const d = (desc || '').toLowerCase();
  if (P_ENTRADA.some(p => d.includes(p))) return 'entrada';
  if (P_SAIDA.some(p => d.includes(p)))   return 'saida';
  return 'saida';
}

/**
 * PIX/TED é MEIO de pagamento, não significado: "Pix recebido da Rodorrica" é
 * receita de cliente e "Pix enviado para o fornecedor" é despesa. Só vira
 * transferência quando a outra perna aparece, e isso quem decide é a
 * importação (ver acharContraparteSaida em dedup.js) — aqui vale a direção.
 *
 * Classificar todo PIX como transferência tirava o dinheiro dos dois totais do
 * Dashboard: num extrato real de 20 linhas, 18 sumiam de Entradas e Saídas.
 */
export function detectTipo(desc, valorOrig) {
  return detectSentido(desc, valorOrig) === 'entrada' ? 'receita' : 'despesa';
}

export function parseOFX(content) {
  const matches = [...content.matchAll(/<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi)];
  if (!matches.length) return { error: 'Nenhuma transação no OFX' };
  const get = (b, tag) => { const r = new RegExp(`<${tag}>([^<\n]+)`, 'i').exec(b); return r ? r[1].trim() : ''; };
  const txs = matches.map(m => {
    const b = m[1], dtRaw = get(b, 'DTPOSTED').slice(0, 8);
    const data = dtRaw ? `${dtRaw.slice(0,4)}-${dtRaw.slice(4,6)}-${dtRaw.slice(6,8)}` : '';
    const vOrig = parseFloat(get(b, 'TRNAMT').replace(',', '.'));
    const valor = Math.abs(vOrig);
    const descricao = get(b, 'MEMO') || get(b, 'NAME') || 'Transação';
    return { data, valor, tipo: detectTipo(descricao, vOrig), sentido: detectSentido(descricao, vOrig), transf: ehTransferencia(descricao), descricao, _sel: true };
  }).filter(t => t.data && t.valor);
  return { txs };
}

// Só é coluna de débito/crédito se o CONTEÚDO for débito/crédito. A fatura do
// Inter tem uma coluna "Tipo" com "Parcela 1/15" dentro: tratada como D/C, o
// "c" de "parcela" fazia a compra virar receita.
const DC_CREDITO = /^(c|cr|credito|credit|entrada|receita)$/;
const DC_DEBITO  = /^(d|db|deb|debito|debit|saida|despesa)$/;
const ehColunaDC = valores => {
  const v = valores.filter(Boolean).map(x => semAcento(x).toLowerCase().trim());
  return v.length > 0 && v.every(x => DC_CREDITO.test(x) || DC_DEBITO.test(x));
};

/**
 * @param {object} opts
 * @param {boolean} opts.fatura  fatura de cartão: aqui valor positivo é COMPRA
 *   (saída), o contrário do extrato de conta. Sem isso a fatura inteira entra
 *   invertida, como se cada compra fosse dinheiro entrando.
 */
export function parseCSV(content, { fatura = false } = {}) {
  let lines = String(content).replace(/^﻿/, '')   // BOM do Excel
    .replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim().split('\n').filter(l => l.trim());
  if (lines.length < 2) return { error: 'CSV vazio' };

  const sep = lines[0].includes(';') ? ';' : ',';

  // Split que respeita aspas: a fatura do Inter é separada por vírgula E tem
  // vírgula DENTRO do valor ("R$ 1.280,12"). Partindo no separador cru, o
  // campo virava "R$ 1.280" e a compra de R$ 1.280,12 entrava como R$ 1.280.
  const corta = linha => {
    const campos = []; let atual = '', dentroDeAspas = false;
    for (let i = 0; i < linha.length; i++) {
      const c = linha[i];
      if (c === '"') {
        if (dentroDeAspas && linha[i + 1] === '"') { atual += '"'; i++; }  // "" escapado
        else dentroDeAspas = !dentroDeAspas;
      } else if (c === sep && !dentroDeAspas) { campos.push(atual); atual = ''; }
      else atual += c;
    }
    campos.push(atual);
    return campos.map(s => s.trim());
  };
  const fi = (headers, ...ns) => { for (const n of ns) { const i = headers.findIndex(h => h.includes(n)); if (i >= 0) return i; } return -1; };

  // A fatura do Itaú em xlsx traz 13 linhas de cabeçalho do documento (nome,
  // agência, conta, resumo do cartão, e até uma linha "Lançamentos" solta)
  // antes da linha REAL da tabela — por isso não basta achar uma linha que
  // contenha a palavra "data"/"lançamento" (a linha solta também contém), tem
  // que ser a primeira linha que resolve as colunas de data E de valor.
  let headerIdx = -1, iD = -1, iV = -1;
  for (let i = 0; i < Math.min(30, lines.length); i++) {
    const headers = corta(lines[i]).map(h => semAcento(h).toLowerCase());
    const d = fi(headers, 'release_date', 'data', 'date', 'dt');
    const v = fi(headers, 'net_amount', 'transaction_net', 'amount', 'valor', 'montante', 'value', 'vlr', 'credito', 'debito');
    if (d >= 0 && v >= 0) { headerIdx = i; iD = d; iV = v; break; }
  }
  if (headerIdx < 0) return { error: `Cabeçalho não encontrado nas primeiras ${Math.min(30, lines.length)} linhas` };
  lines = lines.slice(headerIdx);
  if (lines.length < 2) return { error: 'Cabeçalho não encontrado' };

  // Cabeçalho sem acento: o Inter escreve "Lançamento" e a busca era por
  // "lancamento", então a descrição não era encontrada e virava "Transação".
  const headers = corta(lines[0]).map(h => semAcento(h).toLowerCase());
  const iDesc = fi(headers, 'transaction_type', 'historico', 'lancamento', 'descri', 'memo', 'hist', 'name', 'estabelecimento');
  const iTipo = fi(headers, 'tipo', 'type', 'natureza', 'd/c', 'dc');
  const iCat  = fi(headers, 'categoria', 'category');
  // Fatura do Itaú traz "Parcela 1 de 3" em coluna própria "Parcelamento" —
  // formato "N de M", diferente do "N/15" da fatura do Inter (colTipo, abaixo).
  const iParc = fi(headers, 'parcelamento');

  if (iD < 0 || iV < 0) return { error: `Colunas não reconhecidas: ${headers.slice(0,5).join(', ')}` };

  const corpo = lines.slice(1).map(corta).filter(c => c.length > Math.max(iD, iV));
  const usaDC = iTipo >= 0 && ehColunaDC(corpo.map(c => c[iTipo]));

  const txs = corpo.map(cols => {
    const data = normData(cols[iD]);
    const vRaw = normValor(cols[iV]);
    const valor = Math.abs(vRaw);
    if (!data || !valor || isNaN(valor)) return null;

    const descricao = iDesc >= 0 ? (cols[iDesc] || 'Transação') : 'Transação';
    const colTipo   = iTipo >= 0 ? semAcento(cols[iTipo] || '').toLowerCase() : '';

    let sentido;
    if (usaDC) {
      sentido = DC_CREDITO.test(colTipo.trim()) ? 'entrada' : 'saida';
    } else if (fatura) {
      // Na fatura tudo é compra, menos estorno/crédito (que vem negativo)
      sentido = (vRaw < 0 || /estorno|credito|pagamento recebido/.test(colTipo)) ? 'entrada' : 'saida';
    } else {
      sentido = detectSentido(descricao, vRaw);
    }

    // "Parcela 1/15" costuma vir em coluna própria, não na descrição
    const mParc = /(\d{1,2})\s*\/\s*(\d{1,3})/.exec(colTipo);
    // Itaú: mesma ideia, mas coluna "Parcelamento" no formato "Parcela N de M"
    const pParc = !mParc && iParc >= 0 ? detectParcela(cols[iParc] || '') : null;
    const tipo = sentido === 'entrada' ? 'receita' : 'despesa';

    return {
      data, valor, tipo, sentido,
      transf: ehTransferencia(descricao),
      descricao,
      parcela: mParc ? `${Number(mParc[1])}/${Number(mParc[2])}`
        : pParc ? `${pParc.atual}/${pParc.total}` : '',
      categoriaBanco: iCat >= 0 ? (cols[iCat] || '') : '',
      _sel: true,
    };
  }).filter(Boolean);

  if (!txs.length) return { error: 'Nenhuma transação válida' };
  return { txs };
}

/**
 * Fatura/extrato em .xlsx (ex.: exportação nativa do Itaú): converte a
 * planilha em texto separado por ";" e reaproveita o parseCSV — mesma
 * detecção de cabeçalho, mesmas colunas, mesmo dedup. Datas viram dd/mm/yyyy
 * (formato que normData já entende) em vez do número de série do Excel, e
 * números seguem crus, sem formatação de moeda, para não depender de como o
 * SheetJS aplica o formato "R$" da célula.
 */
export async function parseXLSX(file, opts = {}) {
  const XLSX = await import('xlsx');
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array', cellDates: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const linhas = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: '' })
    .map(row => row.map(cel => {
      if (cel instanceof Date) {
        const dd = String(cel.getDate()).padStart(2, '0');
        const mm = String(cel.getMonth() + 1).padStart(2, '0');
        return `${dd}/${mm}/${cel.getFullYear()}`;
      }
      return String(cel ?? '');
    }).join(';'));
  return parseCSV(linhas.join('\n'), opts);
}
