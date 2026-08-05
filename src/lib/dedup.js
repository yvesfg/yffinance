import { ehTransferencia } from './parsers.js';

// Uma transferência é UMA operação que aparece em DOIS extratos: sai da conta
// de origem e entra na de destino. No banco ela é uma linha só —
// conta_id = origem, conta_destino_id = destino. Estas funções existem para
// que a segunda perna importada vire vínculo na linha existente, e não uma
// nova linha (que debitaria as duas contas e sumiria com o saldo).

// Extratos de bancos diferentes registram a mesma transferência com 1-2 dias
// de diferença (TED/DOC principalmente). Janela padrão de tolerância.
export const JANELA_DIAS = 3;

// ─── Duplicidade por contagem de ocorrências ──────────────────────────
// Comparar "existe uma igual?" descartava lançamento legítimo repetido (dois
// cafés de R$ 12 no mesmo dia). O que vale é QUANTAS iguais o extrato traz
// contra quantas o banco já tem: entra só a diferença.

const soData   = d => String(d || '').slice(0, 10);
const normDesc = d => (d || '').toLowerCase().replace(/\s+/g, ' ').trim();

/** Chave natural de um lançamento importado, sem o número da ocorrência. */
export function chaveBase(tx, contaId) {
  return [
    contaId || tx.conta_id || '',
    soData(tx.data),
    Number(tx.valor).toFixed(2),
    tx.tipo || '',
    normDesc(tx.descricao),
  ].join('|');
}

/** Quantas linhas de cada chave a lista já tem (só as da conta em questão). */
export function contarPorChave(lista, contaId) {
  const mapa = new Map();
  for (const e of lista) {
    if (e.conta_id !== contaId) continue;
    const k = chaveBase(e, contaId);
    mapa.set(k, (mapa.get(k) || 0) + 1);
  }
  return mapa;
}

/**
 * Quantas linhas de cada chave o LOTE realmente representa.
 *
 * Conta por arquivo e fica valendo o MAIOR, porque as duas repetições têm
 * significados opostos: um mesmo extrato trazendo a linha duas vezes são dois
 * lançamentos de verdade; dois arquivos com meses sobrepostos trazendo a
 * mesma linha são o mesmo lançamento contado duas vezes.
 */
export function contarPorChaveNoLote(txs, contaId) {
  const porArquivo = new Map();
  for (const tx of txs) {
    const arq = tx._arquivo || '';
    if (!porArquivo.has(arq)) porArquivo.set(arq, new Map());
    const m = porArquivo.get(arq);
    const k = chaveBase(tx, contaId);
    m.set(k, (m.get(k) || 0) + 1);
  }
  const maior = new Map();
  for (const m of porArquivo.values()) {
    for (const [k, n] of m) if (n > (maior.get(k) || 0)) maior.set(k, n);
  }
  return maior;
}

/**
 * Chave gravada em cf_transacoes.hash_dedup — inclui a ordem da ocorrência.
 * O índice único parcial no banco usa isso como rede de proteção contra
 * duplo clique, duas abas ou lote interrompido no meio.
 */
export function hashDedup(tx, contaId, ocorrencia) {
  return `${chaveBase(tx, contaId)}|${ocorrencia}`;
}

export function diffDias(a, b) {
  const da = new Date(`${soData(a)}T00:00:00`), db = new Date(`${soData(b)}T00:00:00`);
  if (isNaN(da) || isNaN(db)) return Infinity;
  return Math.round(Math.abs(da - db) / 86400000);
}

const mesmoValor = (a, b) => Math.abs(Number(a) - Number(b)) < 0.01;

/**
 * Devolve a operação COMPLETA (origem e destino preenchidos) que já representa
 * esta perna — caso de importar o extrato do outro banco depois de a operação
 * já ter sido vinculada pelo primeiro.
 *
 * Duas regras evitam o falso positivo que fazia dinheiro sumir:
 * - só linhas já vinculadas contam (uma saída órfã de mesmo valor na janela
 *   pode ser outra transferência legítima);
 * - cada linha absorve UMA perna só. Quem chamar deve marcar `_consumida`,
 *   assim a segunda transferência de mesmo valor na semana entra normalmente.
 */
export function acharOperacaoCompleta(lista, tx, contaId, sentido, janela = JANELA_DIAS) {
  return lista.find(e =>
    e.tipo === 'transferencia' &&
    !e._consumida &&
    e.conta_id && e.conta_destino_id &&
    mesmoValor(e.valor, tx.valor) &&
    diffDias(e.data, tx.data) <= janela &&
    (sentido === 'entrada' ? e.conta_destino_id === contaId : e.conta_id === contaId)
  );
}

/**
 * Procura, para uma ENTRADA que chegou por PIX/TED, a saída correspondente já
 * lançada em OUTRA conta. Achou = as duas linhas são a mesma operação, e a
 * saída vira a transferência (recebendo conta_destino_id).
 *
 * A saída está gravada como DESPESA, não como transferência: no extrato, PIX é
 * meio de pagamento, e só a existência das duas pernas prova que o dinheiro
 * ficou na casa. Por isso os critérios são apertados — mesmo valor, data
 * próxima, outra conta, ainda sem destino, e as DUAS descrições com cara de
 * transferência. ('transferencia' entra na busca por causa das linhas
 * gravadas antes desta regra.)
 */
export function acharContraparteSaida(lista, tx, contaId, janela = JANELA_DIAS) {
  return lista.find(e =>
    !e._consumida &&
    !e.conta_destino_id &&
    e.conta_id && e.conta_id !== contaId &&
    (e.tipo === 'despesa' || e.tipo === 'transferencia') &&
    ehTransferencia(e.descricao) &&
    mesmoValor(e.valor, tx.valor) &&
    diffDias(e.data, tx.data) <= janela
  );
}
