// ─────────────────────────────────────────────────────────
//  Ciclo da fatura de cartão.
//
//  "Fatura de julho" não é "o que gastei em julho": é o que foi comprado entre
//  o fechamento de junho e o de julho. Comprou depois do corte, cai na fatura
//  seguinte. Toda a alocação de compra e de parcela passa por aqui.
// ─────────────────────────────────────────────────────────

import { semAcento } from './parsers.js';

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

// ─────────────────────────────────────────────────────────
//  Reconhecer o pagamento da fatura dentro do extrato da CONTA.
//
//  "Pagamento efetuado: Pagamento fatura cartao Inter" chega no extrato como
//  uma despesa qualquer. Sem isso, ela conta como despesa E as compras do
//  cartão contam como saída — o mesmo dinheiro duas vezes.
// ─────────────────────────────────────────────────────────

const RE_PAGAMENTO_FATURA = /pag(to|amento)[\s\S]{0,25}fatura|fatura[\s\S]{0,25}cartao|pgto[\s\S]{0,20}(cartao|fatura)|deb[\s\S]{0,20}autom[\s\S]{0,20}fatura/i;

export function ehPagamentoFatura(descricao) {
  return RE_PAGAMENTO_FATURA.test(semAcento(String(descricao || '')).toLowerCase());
}

// Estorno/reembolso de compra: um crédito na fatura que NÃO é o pagamento
// (esse já é reconhecido acima). Sem isso, todo crédito que chegasse na
// fatura e não fosse pagamento — inclusive um estorno de verdade, com a
// palavra "estorno" na descrição — caía no mesmo descarte genérico
// ("creditosFatura++") e nunca virava lançamento nenhum.
// O texto testado já passou por semAcento(), então o padrão fica todo em ASCII.
const RE_ESTORNO = /estorno|reembolso|devolucao|cancelamento|chargeback|refund|credito.{0,15}(compra|estorno)/i;

export function ehEstornoDescricao(descricao) {
  return RE_ESTORNO.test(semAcento(String(descricao || '')).toLowerCase());
}

/**
 * Entre as faturas em aberto de um cartão, qual esta transação de saída está
 * quitando. Duas tentativas, nesta ordem:
 *
 * 1. O valor bate com a dívida da fatura (dentro de R$1 ou 2%) — é o caso do
 *    débito automático, que paga o total certinho.
 * 2. Não bate valor nenhum, mas o vencimento está a poucos dias da data do
 *    pagamento — é um pagamento parcial ou com juros/desconto.
 *
 * Sem nenhum dos dois, devolve null: melhor deixar como despesa comum do que
 * vincular à fatura errada.
 */
export function acharFaturaParaPagamento(faturas, { valor, data }, janelaDias = 10) {
  const abertas = (faturas || []).filter(f => saldoDevedor(f) > 0.009);
  if (!abertas.length) return null;

  const diffDias = (a, b) => Math.abs((new Date(`${a}T00:00:00`) - new Date(`${b}T00:00:00`)) / 86400000);
  const porData = lista => lista.slice().sort((a, b) =>
    diffDias(a.data_vencimento || data, data) - diffDias(b.data_vencimento || data, data));

  const porValor = abertas.filter(f => Math.abs(saldoDevedor(f) - Number(valor)) < Math.max(1, saldoDevedor(f) * 0.02));
  if (porValor.length) return porData(porValor)[0];

  const proximas = abertas.filter(f => f.data_vencimento && diffDias(f.data_vencimento, data) <= janelaDias);
  return proximas.length ? porData(proximas)[0] : null;
}
