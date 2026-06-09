import React, { useState, useEffect } from 'react';
import { T } from '../constants.js';
import { fmt, fmtD } from '../lib/formatters.js';

const inp = { background: T.bg3, border: `1px solid ${T.border2}`, color: T.txt, padding: '9px 12px', borderRadius: T.radius2, fontFamily: "'DM Sans', sans-serif", fontSize: 13, outline: 'none', width: '100%', boxSizing: 'border-box' };
const TIPOS = [
  { v:'transferencia', l:'⇄ Transferência', c: T.blue   },
  { v:'despesa',       l:'↓ Despesa',        c: T.red    },
  { v:'receita',       l:'↑ Receita',         c: T.green  },
];

export default function ModalVincular({ open, tx, idx, total, contas, cats, onConfirm, onSkip, onClose }) {
  const [tipo, setTipo]   = useState('transferencia');
  const [destId, setDestId] = useState('');
  const [catId, setCatId]   = useState('');
  const [desc, setDesc]     = useState('');

  useEffect(() => {
    if (tx) { setTipo('transferencia'); setDestId(contas[0]?.id||''); setCatId(''); setDesc(tx.descricao||''); }
  }, [tx]);

  if (!open || !tx) return null;

  const catsFilt = cats.filter(c => c.tipo === (tipo === 'transferencia' ? 'transferencia' : tipo));

  return (
    <div onClick={onClose} style={{ display:'flex', position:'fixed', inset:0, background:'rgba(0,0,0,.65)', zIndex:1000, backdropFilter:'blur(6px)', justifyContent:'center', alignItems:'center' }}>
      <div onClick={e => e.stopPropagation()} style={{ background:T.bg2, border:`1px solid ${T.border2}`, borderRadius:18, padding:26, width:420, maxWidth:'95vw' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
          <h3 style={{ fontFamily:"'Syne',sans-serif", fontSize:19, fontWeight:700, color:T.txt, margin:0 }}>Identificar Transferência</h3>
          <button onClick={onClose} style={{ background:'transparent', border:'none', color:T.txt3, cursor:'pointer', fontSize:18 }}>✕</button>
        </div>

        {/* Info da tx */}
        <div style={{ background:T.bg3, borderRadius:T.radius2, padding:12, marginBottom:18, fontSize:12 }}>
          {[['Data', fmtD(tx.data)], ['Valor', fmt(tx.valor)], ['Descrição', tx.descricao]].map(([k,v]) => (
            <div key={k} style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
              <span style={{ color:T.txt3 }}>{k}</span>
              <span style={{ color:k==='Valor'?T.blue:T.txt, fontFamily: k==='Valor'?"'JetBrains Mono',monospace":'inherit' }}>{v}</span>
            </div>
          ))}
          <div style={{ marginTop:6, fontSize:10, color:T.txt3 }}>{idx+1} de {total}</div>
        </div>

        {/* Tipo */}
        <div style={{ display:'flex', gap:3, background:T.bg3, padding:3, borderRadius:T.radius2, marginBottom:14 }}>
          {TIPOS.map(t => (
            <button key={t.v} onClick={() => setTipo(t.v)} style={{
              flex:1, padding:'7px 4px', border: tipo===t.v?`1px solid ${t.c}40`:'1px solid transparent',
              background: tipo===t.v?`${t.c}20`:'transparent', color: tipo===t.v?t.c:T.txt3,
              borderRadius:6, cursor:'pointer', fontSize:11, fontWeight:500, fontFamily:"'DM Sans',sans-serif",
            }}>{t.l}</button>
          ))}
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {tipo === 'transferencia' && (
            <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
              <label style={{ fontSize:11, color:T.txt3, fontWeight:600, textTransform:'uppercase', letterSpacing:.5 }}>Conta Destino</label>
              <select style={inp} value={destId} onChange={e => setDestId(e.target.value)}>{contas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}</select>
            </div>
          )}
          <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
            <label style={{ fontSize:11, color:T.txt3, fontWeight:600, textTransform:'uppercase', letterSpacing:.5 }}>Categoria</label>
            <select style={inp} value={catId} onChange={e => setCatId(e.target.value)}><option value="">Sem categoria</option>{catsFilt.map(c => <option key={c.id} value={c.id}>{c.icone} {c.nome}</option>)}</select>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
            <label style={{ fontSize:11, color:T.txt3, fontWeight:600, textTransform:'uppercase', letterSpacing:.5 }}>Descrição</label>
            <input type="text" style={inp} value={desc} onChange={e => setDesc(e.target.value)} />
          </div>
        </div>

        <div style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop:20, paddingTop:16, borderTop:`1px solid ${T.border}` }}>
          <button onClick={onSkip} style={{ padding:'9px 18px', background:T.bg3, border:`1px solid ${T.border2}`, color:T.txt2, borderRadius:T.radius2, cursor:'pointer', fontFamily:"'DM Sans',sans-serif", fontSize:13 }}>Pular →</button>
          <button onClick={() => onConfirm({ tipo, conta_destino_id: tipo==='transferencia'?destId:null, categoria_id:catId||null, descricao:desc })}
            style={{ padding:'9px 18px', background:T.green, color:'#000', borderRadius:T.radius2, border:'none', cursor:'pointer', fontFamily:"'DM Sans',sans-serif", fontSize:13, fontWeight:600 }}>Confirmar →</button>
        </div>
      </div>
    </div>
  );
}
