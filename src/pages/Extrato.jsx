import React, { useState, useMemo } from 'react';
import { T, BANCOS } from '../constants.js';
import { fmt, fmtD, exportCSV } from '../lib/formatters.js';

const inp = { background: T.bg3, border: `1px solid ${T.border2}`, color: T.txt, padding: '8px 12px', borderRadius: T.radius2, fontFamily: "'DM Sans',sans-serif", fontSize: 13, outline: 'none', boxSizing: 'border-box' };

export default function Extrato({ txs, contas, cats, cartoes, mesAtual, setMesAtual, loadTxs, onEdit, onDelete }) {
  const [filtTipo, setFiltTipo] = useState('todos');
  const [filtConta, setFiltConta] = useState('');
  const [filtCat, setFiltCat] = useState('');
  const [busca, setBusca] = useState('');
  const [ordenacao, setOrdenacao] = useState('data_desc');

  const [ano, mes] = mesAtual.split('-').map(Number);
  const mudarMes = d => {
    const dt = new Date(ano, mes - 1 + d, 1);
    setMesAtual(`${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`);
    loadTxs();
  };

  const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

  const filtradas = useMemo(() => {
    let lista = [...txs];
    if (filtTipo !== 'todos') lista = lista.filter(t => t.tipo === filtTipo);
    if (filtConta) lista = lista.filter(t => t.conta_id === filtConta || t.conta_destino_id === filtConta);
    if (filtCat) lista = lista.filter(t => t.categoria_id === filtCat);
    if (busca.trim()) {
      const q = busca.toLowerCase();
      lista = lista.filter(t => (t.descricao||'').toLowerCase().includes(q));
    }
    lista.sort((a, b) => {
      if (ordenacao === 'data_desc') return new Date(b.data) - new Date(a.data);
      if (ordenacao === 'data_asc')  return new Date(a.data) - new Date(b.data);
      if (ordenacao === 'valor_desc') return Number(b.valor) - Number(a.valor);
      if (ordenacao === 'valor_asc')  return Number(a.valor) - Number(b.valor);
      return 0;
    });
    return lista;
  }, [txs, filtTipo, filtConta, filtCat, busca, ordenacao]);

  const totRec  = filtradas.filter(t => t.tipo === 'receita').reduce((s, t) => s + Number(t.valor), 0);
  const totDesp = filtradas.filter(t => t.tipo === 'despesa' || t.tipo === 'cartao').reduce((s, t) => s + Number(t.valor), 0);

  const contaNome = id => contas.find(c => c.id === id)?.nome || '';
  const catNome   = id => { const c = cats.find(c => c.id === id); return c ? `${c.icone||''} ${c.nome}` : ''; };

  const TIPOS = [
    { v:'todos',         l:'Todos' },
    { v:'receita',       l:'Receitas' },
    { v:'despesa',       l:'Despesas' },
    { v:'cartao',        l:'Cartões' },
    { v:'transferencia', l:'Transferências' },
  ];

  return (
    <div style={{ padding: '24px 28px', fontFamily: "'DM Sans',sans-serif" }}>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20 }}>
        <h2 style={{ fontFamily:"'Syne',sans-serif", fontSize:24, fontWeight:700, color:T.txt, margin:0, letterSpacing:-.5 }}>Extrato</h2>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <button onClick={() => mudarMes(-1)} style={{ ...inp, width:28, height:28, padding:0, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>‹</button>
          <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:12, minWidth:110, textAlign:'center', color:T.txt }}>{MESES[mes-1]} {ano}</span>
          <button onClick={() => mudarMes(1)} style={{ ...inp, width:28, height:28, padding:0, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>›</button>
        </div>
      </div>

      {/* Resumo */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:18 }}>
        {[
          { l:'Entradas', v:totRec, c:T.green },
          { l:'Saídas', v:totDesp, c:T.red },
          { l:'Saldo', v:totRec-totDesp, c: totRec-totDesp>=0?T.green:T.red },
        ].map(({ l, v, c }) => (
          <div key={l} style={{ background:T.bg2, border:`1px solid ${T.border}`, borderRadius:T.radius, padding:'14px 16px' }}>
            <div style={{ fontSize:10, color:T.txt3, textTransform:'uppercase', letterSpacing:1, fontWeight:600, marginBottom:6 }}>{l}</div>
            <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:18, fontWeight:500, color:c }}>{fmt(v)}</div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div style={{ background:T.bg2, border:`1px solid ${T.border}`, borderRadius:T.radius, padding:14, marginBottom:14, display:'flex', flexWrap:'wrap', gap:10, alignItems:'center' }}>
        <div style={{ display:'flex', gap:4, background:T.bg3, padding:3, borderRadius:T.radius2 }}>
          {TIPOS.map(t => (
            <button key={t.v} onClick={() => setFiltTipo(t.v)} style={{
              padding:'5px 10px', border: filtTipo===t.v?`1px solid ${T.border3}`:'1px solid transparent',
              background: filtTipo===t.v?T.bg4:'transparent', color: filtTipo===t.v?T.txt:T.txt2,
              borderRadius:6, cursor:'pointer', fontSize:12, fontFamily:"'DM Sans',sans-serif",
            }}>{t.l}</button>
          ))}
        </div>

        <select style={{ ...inp, flex:1, minWidth:120 }} value={filtConta} onChange={e => setFiltConta(e.target.value)}>
          <option value="">Todas as contas</option>
          {contas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>

        <select style={{ ...inp, flex:1, minWidth:120 }} value={filtCat} onChange={e => setFiltCat(e.target.value)}>
          <option value="">Todas as categorias</option>
          {cats.map(c => <option key={c.id} value={c.id}>{c.icone} {c.nome}</option>)}
        </select>

        <input type="text" placeholder="Buscar descrição..." style={{ ...inp, flex:2, minWidth:140 }} value={busca} onChange={e => setBusca(e.target.value)} />

        <select style={{ ...inp }} value={ordenacao} onChange={e => setOrdenacao(e.target.value)}>
          <option value="data_desc">Data ↓</option>
          <option value="data_asc">Data ↑</option>
          <option value="valor_desc">Valor ↓</option>
          <option value="valor_asc">Valor ↑</option>
        </select>

        <button onClick={() => exportCSV(filtradas, cats, contas)} style={{ ...inp, background:T.bg3, cursor:'pointer', color:T.txt2, whiteSpace:'nowrap' }}>
          ↓ Exportar
        </button>
      </div>

      {/* Lista */}
      <div style={{ background:T.bg2, border:`1px solid ${T.border}`, borderRadius:T.radius }}>
        <div style={{ display:'grid', gridTemplateColumns:'36px 1fr auto auto auto', gap:0, padding:'8px 14px', borderBottom:`1px solid ${T.border}`, fontSize:10, color:T.txt3, textTransform:'uppercase', letterSpacing:.8, fontWeight:600 }}>
          <div></div><div>Descrição</div><div style={{ textAlign:'right', paddingRight:10 }}>Conta</div><div style={{ textAlign:'right', paddingRight:10 }}>Data</div><div style={{ textAlign:'right' }}>Valor</div>
        </div>
        {filtradas.length === 0
          ? <div style={{ padding:'32px', textAlign:'center', color:T.txt3, fontSize:13 }}>Nenhuma movimentação encontrada</div>
          : filtradas.map(t => {
            const cor  = t.tipo==='receita'?T.green:t.tipo==='transferencia'?T.blue:t.tipo==='cartao'?T.purple:T.red;
            const bg   = t.tipo==='receita'?T.greenGlow:t.tipo==='transferencia'?T.blueGlow:t.tipo==='cartao'?T.purpleGlow:T.redGlow;
            const icon = t.tipo==='receita'?'↑':t.tipo==='transferencia'?'⇄':t.tipo==='cartao'?'▣':'↓';
            const sinal= t.tipo==='receita'?'+':t.tipo==='transferencia'?'±':'-';
            return (
              <div key={t.id} style={{ display:'grid', gridTemplateColumns:'36px 1fr auto auto auto', gap:0, padding:'9px 14px', borderBottom:`1px solid ${T.border}`, alignItems:'center' }}
                onMouseEnter={e => e.currentTarget.style.background = T.bg3}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{ width:28, height:28, borderRadius:8, background:bg, color:cor, display:'flex', alignItems:'center', justifyContent:'center', fontSize:13 }}>{icon}</div>
                <div style={{ paddingLeft:10, minWidth:0 }}>
                  <div style={{ fontSize:13, color:T.txt, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{t.descricao}</div>
                  <div style={{ fontSize:11, color:T.txt3, marginTop:1 }}>{catNome(t.categoria_id)}{t.conta_destino_id ? ` → ${contaNome(t.conta_destino_id)}` : ''}</div>
                </div>
                <div style={{ fontSize:12, color:T.txt3, paddingRight:14, whiteSpace:'nowrap' }}>{contaNome(t.conta_id)}</div>
                <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:12, color:T.txt3, paddingRight:14, whiteSpace:'nowrap' }}>{fmtD(t.data)}</div>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:13, color:cor, whiteSpace:'nowrap' }}>{sinal}{fmt(t.valor)}</span>
                  <div style={{ display:'flex', gap:4 }}>
                    <button onClick={() => onEdit(t)} style={{ background:'transparent', border:'none', color:T.txt3, cursor:'pointer', fontSize:13, padding:'2px 4px' }} title="Editar">✎</button>
                    <button onClick={() => { if (window.confirm('Excluir esta movimentação?')) onDelete(t.id); }} style={{ background:'transparent', border:'none', color:T.txt3, cursor:'pointer', fontSize:13, padding:'2px 4px' }} title="Excluir">✕</button>
                  </div>
                </div>
              </div>
            );
          })
        }
        <div style={{ padding:'10px 14px', fontSize:11, color:T.txt3, borderTop:`1px solid ${T.border}` }}>
          {filtradas.length} movimentações
        </div>
      </div>
    </div>
  );
}
