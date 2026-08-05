// ─────────────────────────────────────────────────────────
//  Ciclo da fatura de cartão.
//
//  "Fatura de julho" não é "o que gastei em julho": é o que foi comprado entre
//  o fechamento de junho e o de julho. Comprou depois do corte, cai na fatura
//  seguinte. Toda a alocação de compra e de parcela passa por aqui.
// ─────────────────────────────────────────────────────────

const pad = n => String(n).padStart(2, '0');
const ultimoDia = (a, m) => new Date(a, m, 0).getDate();
const somaMeses = (ym, n) => {
  const [a, m] = ym.split('-').map(Number);
  const dt = new Date(a, m - 1 + n, 1);
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}`;
};

/** Data segura dentro do mês (dia 31 em fevereiro vira o último dia). */
export function diaDoMes(ym, dia) {
  const [a, m] = ym.split('-').map(Number);
  return `${a}-${pad(m)}-${pad(Math.min(Number(dia) || 1, ultimoDia(a, m)))}`;
}

/**
 * Competência da compra: em qual fatura (YYYY-MM) ela entra.
 * Sem dia de fechamento cadastrado, cai no mês da própria compra.
 */
export function cicloDaCompra(data, diaFechamento) {
  const [a, m, d] = String(data).slice(0, 10).split('-').map(Number);
  const ym = `${a}-${pad(m)}`;
  if (!diaFechamento) return ym;
  return d <= Number(diaFechamento) ? ym : somaMeses(ym, 1);
}

/** Fechamento e vencimento da fatura. Vencimento antes do corte é do mês seguinte. */
export function datasDoCiclo(mesRef, diaFechamento, diaVencimento) {
  const fechamento = diaFechamento ? diaDoMes(mesRef, diaFechamento) : null;
  let vencimento = diaVencimento ? diaDoMes(mesRef, diaVencimento) : null;
  if (fechamento && vencimento && vencimento < fechamento) {
    vencimento = diaDoMes(somaMeses(mesRef, 1), diaVencimento);
  }
  return { fechamento, vencimento };
}

/** Janela de compras que compõem a fatura — o dia seguinte ao corte anterior até o corte. */
export function janelaDoCiclo(mesRef, diaFechamento) {
  if (!diaFechamento) {
    const [a, m] = mesRef.split('-').map(Number);
    return { inicio: `${a}-${pad(m)}-01`, fim: `${a}-${pad(m)}-${pad(ultimoDia(a, m))}` };
  }
  const corte = diaDoMes(mesRef, diaFechamento);
  const corteAnterior = diaDoMes(somaMeses(mesRef, -1), diaFechamento);
  const dia = new Date(`${corteAnterior}T00:00:00`);
  dia.setDate(dia.getDate() + 1);
  return { inicio: dia.toISOString().slice(0, 10), fim: corte };
}

/**
 * Em quais faturas caem as N parcelas, a partir da compra.
 * A parcela atual entra na fatura da compra; as seguintes, mês a mês.
 */
export function faturasDasParcelas(dataCompra, diaFechamento, atual, total) {
  const base = cicloDaCompra(dataCompra, diaFechamento);
  const out = [];
  for (let i = Number(atual); i <= Number(total); i++) {
    out.push({ parcela: i, mes_referencia: somaMeses(base, i - Number(atual)) });
  }
  return out;
}

/** Quanto ainda se deve nesta fatura. */
export const saldoDevedor = fatura =>
  Math.max(0, Number(fatura?.valor_total || 0) - Number(fatura?.valor_pago || 0));

/**
 * Status derivado da situação real, para não depender de alguém lembrar de
 * atualizar: paga > parcial > fechada (passou do corte) > aberta.
 */
export function statusDaFatura(fatura, hoje = new Date().toISOString().slice(0, 10)) {
  const total = Number(fatura?.valor_total || 0);
  const pago  = Number(fatura?.valor_pago || 0);
  if (total > 0 && pago >= total) return 'paga';
  if (pago > 0) return 'parcial';
  if (fatura?.data_fechamento && hoje > fatura.data_fechamento) return 'fechada';
  return 'aberta';
}

/** Limite ainda disponível: limite − o que está em aberto nas faturas. */
export function limiteDisponivel(cartao, faturas = []) {
  const emAberto = faturas.reduce((s, f) => s + saldoDevedor(f), 0);
  return Math.max(0, (Number(cartao?.limite) || 0) - emAberto);
}
