// Uma transferência é UMA operação que aparece em DOIS extratos: sai da conta
// de origem e entra na de destino. No banco ela é uma linha só —
// conta_id = origem, conta_destino_id = destino. Estas funções existem para
// que a segunda perna importada vire vínculo na linha existente, e não uma
// nova linha (que debitaria as duas contas e sumiria com o saldo).

// Extratos de bancos diferentes registram a mesma transferência com 1-2 dias
// de diferença (TED/DOC principalmente). Janela padrão de tolerância.
export const JANELA_DIAS = 3;

const soData = d => String(d || '').slice(0, 10);

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
 * Procura a perna de saída órfã que corresponde a esta entrada: mesmo valor,
 * data próxima, outra conta e ainda sem destino definido. Achou = é a outra
 * metade da mesma operação, então basta preencher o conta_destino_id.
 */
export function acharPernaSaida(lista, tx, contaId, janela = JANELA_DIAS) {
  return lista.find(e =>
    e.tipo === 'transferencia' &&
    !e._consumida &&
    !e.conta_destino_id &&
    e.conta_id && e.conta_id !== contaId &&
    mesmoValor(e.valor, tx.valor) &&
    diffDias(e.data, tx.data) <= janela
  );
}
