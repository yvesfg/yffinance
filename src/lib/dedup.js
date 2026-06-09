export function matchTransf(lista, t) {
  return lista.some(tx => tx.data === t.data && Math.abs(Number(tx.valor) - t.valor) < 0.01);
}
