export function normData(raw) {
  raw = (raw || '').trim().replace(/['"]/g, '');
  if (/^\d{2}[-\/]\d{2}[-\/]\d{4}/.test(raw)) {
    const p = raw.split(/[-\/]/);
    return `${p[2]}-${p[1]}-${p[0]}`;
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  return raw;
}

export function normValor(raw) {
  raw = (raw || '').trim().replace(/['"]/g, '').replace(/\s/g, '');
  if (/\d+\.\d{3},\d+/.test(raw) || (/\d+,\d{2}$/.test(raw) && !raw.includes('.')))
    return parseFloat(raw.replace(/\./g, '').replace(',', '.'));
  if (/\d+,\d{1,2}$/.test(raw)) return parseFloat(raw.replace(',', '.'));
  return parseFloat(raw.replace(/[^0-9.-]/g, ''));
}

export function detectTipo(desc, valorOrig) {
  const d = (desc || '').toLowerCase();
  if (['ted','doc','pix','transferencia','transferência','transf','entre contas'].some(p => d.includes(p)))
    return 'transferencia';
  if (['salário','salario','deposito','depósito','pix recebido','ted recebido','rendimento'].some(p => d.includes(p)) || valorOrig > 0)
    return 'receita';
  return 'despesa';
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
    return { data, valor, tipo: detectTipo(descricao, vOrig), descricao, _sel: true };
  }).filter(t => t.data && t.valor);
  return { txs };
}

export function parseCSV(content) {
  let lines = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim().split('\n').filter(l => l.trim());
  if (lines.length < 2) return { error: 'CSV vazio' };

  const sep = lines[0].includes(';') ? ';' : ',';
  let headerIdx = 0;
  for (let i = 0; i < Math.min(5, lines.length); i++) {
    const low = lines[i].toLowerCase();
    if (low.includes('date') || low.includes('release') || low.includes('data') || low.includes('lancamento') || low.includes('historico')) {
      headerIdx = i; break;
    }
  }
  lines = lines.slice(headerIdx);
  if (lines.length < 2) return { error: 'Cabeçalho não encontrado' };

  const headers = lines[0].split(sep).map(h => h.trim().toLowerCase().replace(/['"]/g, ''));
  const fi = (...ns) => { for (const n of ns) { const i = headers.findIndex(h => h.includes(n)); if (i >= 0) return i; } return -1; };
  const iD    = fi('release_date', 'data', 'date', 'dt', 'lançamento', 'lancamento');
  const iV    = fi('net_amount', 'transaction_net', 'amount', 'valor', 'montante', 'value', 'vlr', 'crédito', 'debito');
  const iDesc = fi('transaction_type', 'historico', 'descri', 'memo', 'hist', 'name', 'lancamento');
  const iTipo = fi('tipo', 'type', 'natureza', 'd/c', 'dc');

  if (iD < 0 || iV < 0) return { error: `Colunas não reconhecidas: ${headers.slice(0,5).join(', ')}` };

  const txs = lines.slice(1).map(line => {
    const cols = line.split(sep).map(c => c.trim().replace(/^["']|["']$/g, ''));
    if (cols.length <= Math.max(iD, iV)) return null;
    const data = normData(cols[iD]);
    const vRaw = normValor(cols[iV]);
    const valor = Math.abs(vRaw);
    if (!data || !valor || isNaN(valor)) return null;
    const descricao = iDesc >= 0 ? (cols[iDesc] || 'Transação') : 'Transação';
    const tipo = iTipo >= 0
      ? (cols[iTipo].toLowerCase().includes('c') ? 'receita' : 'despesa')
      : detectTipo(descricao, vRaw);
    return { data, valor, tipo, descricao, _sel: true };
  }).filter(Boolean);

  if (!txs.length) return { error: 'Nenhuma transação válida' };
  return { txs };
}
