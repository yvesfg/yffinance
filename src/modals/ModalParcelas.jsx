import React, { useState } from 'react';
import { T } from '../constants.js';
import { fmt, fmtD } from '../lib/formatters.js';

const inp = { background: T.bg3, border: `1px solid ${T.border2}`, color: T.txt, padding: '7px 10px', borderRadius: T.radius2, fontFamily: "'DM Sans',sans-serif", fontSize: 13, outline: 'none', boxSizing: 'border-box' };

/**
 * Modal para confirmar parcelas detectadas antes de importar.
 * Mostra lista de transações parceladas e permite editar atual/total.
 *
 * Props:
 *   open        — boolean
 *   parcelas    — [{ tx, atual, total, base }]  (lista de parceladas detectadas)
 *   onConfirm   — (parcelasConfirmadas) => void
 *   onClose     — () => void
 */
export default function ModalParcelas({ open, parcelas = [], onConfirm, onClose }) {
  const [items, setItems] = useState(() => parcelas.map(p => ({ ...p })));

  // Sincroniza quando a prop muda (novo arquivo)
  React.useEffect(() => {
    setItems(parcelas.map(p => ({ ...p })));
  }, [parcelas]);

  if (!open || !parcelas.length) return null;

  const update = (i, field, val) => {
    setItems(prev => prev.map((it, idx) => idx === i ? { ...it, [field]: Number(val) } : it));
  };

  const totalFuturos = items.reduce((s, it) => s + Math.max(0, it.total - it.atual), 0);

  return (
    <div onClick={onClose} style={{ display:'flex', position:'fixed', inset:0, background:'rgba(0,0,0,.7)', zIndex:1100, backdropFilter:'blur(6px)', justifyContent:'center', alignItems:'center', padding:16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background:T.bg2, border:`1px solid ${T.border2}`, borderRadius:18, padding:24, width:520, maxWidth:'95vw', maxHeight:'85vh', display:'flex', flexDirection:'column', gap:0 }}>

        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:16 }}>
          <div>
            <h3 style={{ fontFamily:"'Syne',sans-serif", fontSize:18, fontWeight:700, color:T.txt, margin:0 }}>Parcelas detectadas</h3>
            <p style={{ fontSize:12, color:T.txt3, margin:'4px 0 0' }}>
              Confirme ou corrija o número de cada parcela antes de importar.
            </p>
          </div>
          <button onClick={onClose} style={{ background:'transparent', border:'none', color:T.txt3, cursor:'pointer', fontSize:18, lineHeight:1 }}>✕</button>
        </div>

        {/* Lista */}
        <div style={{ overflowY:'auto', flex:1, marginBottom:16 }}>
          {/* Cabeçalho da tabela */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 80px 80px', gap:8, padding:'6px 10px', fontSize:10, color:T.txt3, textTransform:'uppercase', letterSpacing:.8, fontWeight:600, borderBottom:`1px solid ${T.border}` }}>
            <div>Descrição</div><div style={{ textAlign:'center' }}>Parcela atual</div><div style={{ textAlign:'center' }}>Total</div>
          </div>

          {items.map((it, i) => (
            <div key={i} style={{ display:'grid', gridTemplateColumns:'1fr 80px 80px', gap:8, padding:'10px 10px', borderBottom:`1px solid ${T.border}`, alignItems:'center' }}>
              <div>
                <div style={{ fontSize:13, color:T.txt, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{it.base}</div>
                <div style={{ fontSize:11, color:T.txt3, marginTop:2, display:'flex', gap:8 }}>
                  <span>{fmtD(it.tx.data)}</span>
                  <span style={{ fontFamily:"'JetBrains Mono',monospace", color:T.red }}>-{fmt(it.tx.valor)}</span>
                  {it.atual < it.total && (
                    <span style={{ color:T.purple }}>→ +{it.total - it.atual} meses futuros</span>
                  )}
                  {it.atual === it.total && (
                    <span style={{ color:T.txt3 }}>última parcela</span>
                  )}
                </div>
              </div>
              <div style={{ textAlign:'center' }}>
                <input
                  type="number" min="1" max={it.total} value={it.atual}
                  onChange={e => update(i, 'atual', e.target.value)}
                  style={{ ...inp, width:60, textAlign:'center' }}
                />
              </div>
              <div style={{ textAlign:'center' }}>
                <input
                  type="number" min={it.atual} max="120" value={it.total}
                  onChange={e => update(i, 'total', e.target.value)}
                  style={{ ...inp, width:60, textAlign:'center' }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Resumo */}
        <div style={{ background:T.bg3, borderRadius:T.radius2, padding:'10px 14px', marginBottom:16, fontSize:12, color:T.txt2, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span>{items.length} compra(s) parcelada(s) detectada(s)</span>
          {totalFuturos > 0
            ? <span style={{ color:T.purple, fontWeight:600 }}>+{totalFuturos} lançamentos futuros serão criados</span>
            : <span style={{ color:T.txt3 }}>Sem lançamentos futuros (últimas parcelas)</span>
          }
        </div>

        {/* Ações */}
        <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
          <button onClick={onClose} style={{ padding:'9px 18px', background:T.bg3, border:`1px solid ${T.border2}`, color:T.txt2, borderRadius:T.radius2, cursor:'pointer', fontFamily:"'DM Sans',sans-serif", fontSize:13 }}>
            Cancelar
          </button>
          <button onClick={() => onConfirm(items)} style={{ padding:'9px 20px', background:T.green, color:'#000', borderRadius:T.radius2, border:'none', cursor:'pointer', fontFamily:"'DM Sans',sans-serif", fontSize:13, fontWeight:600 }}>
            Confirmar e importar →
          </button>
        </div>
      </div>
    </div>
  );
}
