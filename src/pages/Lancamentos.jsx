import React, { useState } from 'react';
import { T } from '../constants.js';
import { fmt, fmtD } from '../lib/formatters.js';

const inp = { background: T.bg3, border: `1px solid ${T.border2}`, color: T.txt, padding: '8px 12px', borderRadius: T.radius2, fontFamily: "'DM Sans',sans-serif", fontSize: 13, outline: 'none', boxSizing: 'border-box', width: '100%' };

const TIPO_INFO = {
  despesa:       { label:'↓ Despesa',       color: T.red,    bg: T.redGlow },
  receita:       { label:'↑ Receita',        color: T.green,  bg: T.greenGlow },
  transferencia: { label:'⇄ Transferência', color: T.blue,   bg: T.blueGlow },
  cartao:        { label:'▣ Cartão',         color: T.purple, bg: T.purpleGlow },
};

export default function Lancamentos({ txs, contas, cats, cartoes, onNew, onEdit, onDelete, mesAtual, setMesAtual, loadTxs }) {
  const [filtTipo, setFiltTipo] = useState('todos');
  const [filtStatus, setFiltStatus] = useState('todos');

  const [ano, mes] = mesAtual.split('-').map(Number);
  const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  const mudarMes = d => {
    const dt = new Date(ano, mes - 1 + d, 1);
    setMesAtual(`${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`);
    loadTxs();
  };

  const lista = txs
    .filter(t => filtTipo === 'todos' || t.tipo === filtTipo)
    .filter(t => filtStatus === 'todos' || t.status === filtStatus)
    .sort((a, b) => new Date(b.data) - new Date(a.data));

  const catNome   = id => { const c = cats.find(c => c.id === id); return c ? `${c.icone||''} ${c.nome}` : 'Sem categoria'; };
  const contaNome = id => contas.find(c => c.id === id)?.nome || cartoes.find(c => c.id === id)?.nome || '';

  return (
    <div style={{ padding:'24px 28px', fontFamily:"'DM Sans',sans-serif" }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
        <h2 style={{ fontFamily:"'Syne',sans-serif", fontSize:24, fontWeight:700, color:T.txt, margin:0, letterSpacing:-.5 }}>Lançamentos</h2>
        <div style={{ display:'flex', gap:10, alignItems:'center' }}>
          <button onClick={() => mudarMes(-1)} style={{ background:T.bg3, border:`1px solid ${T.border2}`, color:T.txt2, width:28, height:28, borderRadius:T.radius3, cursor:'pointer', fontSize:13, display:'flex', alignItems:'center', justifyContent:'center' }}>‹</button>
          <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:12, minWidth:110, textAlign:'center', color:T.txt }}>{MESES[mes-1]} {ano}</span>
          <button onClick={() => mudarMes(1)} style={{ background:T.bg3, border:`1px solid ${T.border2}`, color:T.txt2, width:28, height:28, borderRadius:T.radius3, cursor:'pointer', fontSize:13, display:'flex', alignItems:'center', justifyContent:'center' }}>›</button>
          <button onClick={onNew} style={{ background:T.green, color:'#000', border:'none', borderRadius:T.radius2, padding:'8px 16px', cursor:'pointer', fontFamily:"'DM Sans',sans-serif", fontSize:13, fontWeight:600 }}>+ Novo</button>
        </div>
      </div>

      {/* Filtros */}
      <div style={{ display:'flex', gap:10, marginBottom:14, flexWrap:'wrap' }}>
        <div style={{ display:'flex', gap:3, background:T.bg2, border:`1px solid ${T.border}`, padding:3, borderRadius:T.radius2 }}>
          {['todos','despesa','receita','transferencia','cartao'].map(t => (
            <button key={t} onClick={() => setFiltTipo(t)} style={{
              padding:'5px 10px', border: filtTipo===t?`1px solid ${T.border3}`:'1px solid transparent',
              background: filtTipo===t?T.bg4:'transparent', color: filtTipo===t?T.txt:T.txt2,
              borderRadius:6, cursor:'pointer', fontSize:12, fontFamily:"'DM Sans',sans-serif", textTransform:'capitalize',
            }}>{t === 'todos' ? 'Todos' : TIPO_INFO[t]?.label || t}</button>
          ))}
        </div>
        <div style={{ display:'flex', gap:3, background:T.bg2, border:`1px solid ${T.border}`, padding:3, borderRadius:T.radius2 }}>
          {['todos','pago','pendente'].map(s => (
            <button key={s} onClick={() => setFiltStatus(s)} style={{
              padding:'5px 10px', border: filtStatus===s?`1px solid ${T.border3}`:'1px solid transparent',
              background: filtStatus===s?T.bg4:'transparent', color: filtStatus===s?T.txt:T.txt2,
              borderRadius:6, cursor:'pointer', fontSize:12, fontFamily:"'DM Sans',sans-serif", textTransform:'capitalize',
            }}>{s === 'todos' ? 'Todos' : s.charAt(0).toUpperCase() + s.slice(1)}</button>
          ))}
        </div>
      </div>

      {/* Lista agrupada por data */}
      {lista.length === 0
        ? <div style={{ background:T.bg2, border:`1px solid ${T.border}`, borderRadius:T.radius, padding:'32px', textAlign:'center', color:T.txt3, fontSize:13 }}>Nenhum lançamento neste período</div>
        : (() => {
          const grupos = {};
          lista.forEach(t => { (grupos[t.data] = grupos[t.data] || []).push(t); });
          return Object.entries(grupos).sort((a, b) => new Date(b[0]) - new Date(a[0])).map(([data, txsGrupo]) => (
            <div key={data} style={{ marginBottom:12 }}>
              <div style={{ fontSize:11, color:T.txt3, fontWeight:600, textTransform:'uppercase', letterSpacing:.8, marginBottom:6, paddingLeft:4 }}>{fmtD(data)}</div>
              <div style={{ background:T.bg2, border:`1px solid ${T.border}`, borderRadius:T.radius, overflow:'hidden' }}>
                {txsGrupo.map((t, i) => {
                  const info = TIPO_INFO[t.tipo] || TIPO_INFO.despesa;
                  return (
                    <div key={t.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', borderBottom: i < txsGrupo.length-1 ? `1px solid ${T.border}` : 'none' }}
                      onMouseEnter={e => e.currentTarget.style.background = T.bg3}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <div style={{ width:30, height:30, borderRadius:8, background:info.bg, color:info.color, display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, flexShrink:0 }}>
                        {t.tipo==='receita'?'↑':t.tipo==='transferencia'?'⇄':t.tipo==='cartao'?'▣':'↓'}
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:13, color:T.txt, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{t.descricao}</div>
                        <div style={{ fontSize:11, color:T.txt3, marginTop:1 }}>{contaNome(t.conta_id)}{t.categoria_id ? ` · ${catNome(t.categoria_id)}` : ''}</div>
                      </div>
                      {t.status === 'pendente' && (
                        <span style={{ fontSize:10, background:T.goldGlow, color:T.gold, borderRadius:4, padding:'2px 6px', fontWeight:600 }}>pendente</span>
                      )}
                      <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:13, color:info.color, flexShrink:0 }}>
                        {t.tipo==='receita'?'+':t.tipo==='transferencia'?'±':'-'}{fmt(t.valor)}
                      </span>
                      <div style={{ display:'flex', gap:4, flexShrink:0 }}>
                        <button onClick={() => onEdit(t)} style={{ background:'transparent', border:'none', color:T.txt3, cursor:'pointer', fontSize:13, padding:'2px 4px' }}>✎</button>
                        <button onClick={() => { if (window.confirm('Excluir?')) onDelete(t.id); }} style={{ background:'transparent', border:'none', color:T.txt3, cursor:'pointer', fontSize:13, padding:'2px 4px' }}>✕</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ));
        })()
      }
    </div>
  );
}
