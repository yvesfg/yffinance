export const fmt = v =>
  'R$ ' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const fmtD = d => {
  if (!d) return '';
  const [y, m, dy] = d.split('-');
  return `${dy}/${m}/${y}`;
};

export function exportCSV(txs, contas, cartoes, cats, mesAtual, perfil) {
  const h = 'Data,Descrição,Tipo,Valor,Conta,Categoria,Status';
  const rows = txs.map(t => {
    const cat   = cats.find(c => c.id === t.categoria_id);
    const conta = contas.find(c => c.id === t.conta_id) || cartoes.find(c => c.id === t.cartao_id);
    return `${t.data},"${t.descricao}",${t.tipo},${t.valor},"${conta?.nome || ''}","${cat?.nome || ''}",${t.status}`;
  });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([h + '\n' + rows.join('\n')], { type: 'text/csv' }));
  a.download = `extrato_${mesAtual}_${perfil}.csv`;
  a.click();
}
