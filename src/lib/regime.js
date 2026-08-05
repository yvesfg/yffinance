// ─────────────────────────────────────────────────────────
//  Competência × Caixa — dois recortes sobre a MESMA base.
//
//  COMPETÊNCIA: o gasto conta no dia da compra. Serve para entender hábito de
//  consumo: comprou no cartão em julho, é gasto de julho.
//
//  CAIXA: o dinheiro só sai quando a fatura é paga. Serve para saber o que
//  realmente tem em conta.
//
//  Regra que sustenta os dois: compra no cartão (`cartao`) e pagamento da
//  fatura (`pagamento_fatura`) são o MESMO dinheiro em momentos diferentes.
//  Cada regime conta exatamente um dos dois — nunca os dois juntos, que era o
//  que dobrava as saídas quando o extrato trazia "PAGTO FATURA" e a fatura
//  trazia as compras.
//
//  Transferência entre contas próprias não entra em nenhum dos dois: não é
//  receita nem despesa, só mudou de lugar.
// ─────────────────────────────────────────────────────────

export const REGIMES = [
  { v: 'competencia', l: 'Competência', ajuda: 'Gasto no dia da compra — mostra o hábito de consumo' },
  { v: 'caixa',       l: 'Caixa',       ajuda: 'Dinheiro no dia em que sai da conta — mostra o fluxo real' },
];

const num = v => Number(v || 0);

/** A transação conta como saída neste regime? */
export function contaComoSaida(tx, regime) {
  if (tx.tipo === 'despesa') return true;                       // vale nos dois
  if (tx.tipo === 'cartao') return regime === 'competencia';    // ainda não saiu da conta
  if (tx.tipo === 'pagamento_fatura') return regime === 'caixa';// saiu da conta agora
  return false;                                                 // transferência e receita
}

export const contaComoEntrada = tx => tx.tipo === 'receita';

export function totais(txs = [], regime = 'competencia') {
  let entradas = 0, saidas = 0;
  for (const t of txs) {
    if (contaComoEntrada(t)) entradas += num(t.valor);
    else if (contaComoSaida(t, regime)) saidas += num(t.valor);
  }
  return { entradas, saidas, resultado: entradas - saidas };
}

/** Saídas por categoria, no regime escolhido. */
export function saidasPorCategoria(txs = [], cats = [], regime = 'competencia') {
  const mapa = {};
  for (const t of txs) {
    if (!contaComoSaida(t, regime)) continue;
    const cat = cats.find(c => c.id === t.categoria_id);
    const nome = cat ? cat.nome : 'Sem categoria';
    mapa[nome] = (mapa[nome] || 0) + num(t.valor);
  }
  return Object.entries(mapa).sort((a, b) => b[1] - a[1]);
}

/**
 * Saldo de uma conta. É sempre CAIXA — saldo bancário não tem competência:
 * compra no cartão não tira dinheiro da conta, o pagamento da fatura tira.
 */
export function saldoDaConta(txs = [], contaId, saldoInicial = 0) {
  return txs.reduce((s, t) => {
    const daConta = t.conta_id === contaId;
    if (daConta && (t.tipo === 'despesa' || t.tipo === 'pagamento_fatura' || t.tipo === 'transferencia')) return s - num(t.valor);
    if (daConta && t.tipo === 'receita') return s + num(t.valor);
    if (t.conta_destino_id === contaId && t.tipo === 'transferencia') return s + num(t.valor);
    return s;
  }, Number(saldoInicial) || 0);
}
