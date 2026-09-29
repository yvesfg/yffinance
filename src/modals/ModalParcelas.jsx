import React, { useState } from 'react';
import { T } from '../constants.js';
import { fmt, fmtD } from '../lib/formatters.js';
import { useModalKeys } from '../lib/useModalKeys.js';

const inp = { background: T.bg3, border: `1px solid ${T.border2}`, color: T.txt, padding: '7px 10px', borderRadius: T.radius2, fontFamily: "'Sora',sans-serif", fontSize: 13, outline: 'none', boxSizing: 'border-box' };

const OPCOES = [
  { v: 'parcela', l: 'É parcela' },
  { v: 'ignorar', l: 'Ignorar' },
  { v: 'estorno', l: 'Pode ser estorno' },
];

/**
 * Modal para confirmar parcelas detectadas antes de importar.
 * Mostra lista de transações parceladas e permite editar atual/total — ou
 * dizer que a detecção errou: "Ignorar" importa como lançamento único, sem
 * projetar meses futuros; "Pode ser estorno" faz o mesmo e ainda inverte o
 * sinal para entrada, para o caso de "Parcela 1 de 18" ser, na verdade,
 * dinheiro voltando (a leitura por IA ou o padrão do banco às vezes confundem).
 *
 * Props:
 *   open        — boolean
 *   parcelas    — [{ tx, atual, total, base }]  (lista de parceladas detectadas)
 *   onConfirm   — (parcelasConfirmadas, descricoesEstorno) => void
 *   onClose     — () => void
 */
export default function ModalParcelas({ open, parcelas = [], onConfirm, onClose }) {
  const [items, setItems] = useState(() => parcelas.map(p => ({ ...p, status: 'parcela' })));

  // Sincroniza quando a prop muda (novo arquivo)
  React.useEffect(() => {
    setItems(parcelas.map(p => ({ ...p, status: 'parcela' })));
  }, [parcelas]);

  const confirmar = () => {
    const deParcela = items.filter(it => it.status === 'parcela').map(({ status, ...it }) => it);
    const estornos = items.filter(it => it.status === 'estorno').map(it => it.tx.descricao);
    onConfirm(deParcela, estornos);
  };

  useModalKeys(open, { onClose, onEnter: confirmar });

  if (!open || !parcelas.length) return null;

  const update = (i, field, val) => {
    setItems(prev => prev.map((it, idx) => idx === i ? { ...it, [field]: Number(val) } : it));
  };
  const setStatus = (i, status) => {
    setItems(prev => prev.map((it, idx) => idx === i ? { ...it, status } : it));
  };

  const emParcela = items.filter(it => it.status === 'parcela');
  const totalFuturos = emParcela.reduce((s, it) => s + Math.max(0, it.total - it.atual), 0);
  const qtdIgnoradas = items.length - emParcela.length;

  return (
    <div onClick={onClose} style={{ display:'flex', position:'fixed', inset:0, background:'rgba(0,0,0,.7)', zIndex:1100, backdropFilter:'blur(6px)', justifyContent:'center', alignItems:'center', padding:16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background:T.bg2, border:`1px solid ${T.border2}`, borderRadius:18, padding:24, width:560, maxWidth:'95vw', maxHeight:'85vh', display:'flex', flexDirection:'column', gap:0 }}>

        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:16 }}>
          <div>
            <h3 style={{ fontFamily:"'Sora',sans-serif", fontSize:18, fontWeight:700, color:T.txt, margin:0 }}>Parcelas detectadas</h3>
            <p style={{ fontSize:12, color:T.txt3, margin:'4px 0 0' }}>
              Confirme o número de cada parcela, ou diga que a detecção errou.
            </p>
          </div>
          <button onClick={onClose} style={{ background:'transparent', border:'none', color:T.txt3, cursor:'pointer', fontSize:18, lineHeight:1 }}>✕</button>
        </div>

        {/* Lista */}
        <div style={{ overflowY:'auto', flex:1, marginBottom:16 }}>
          {items.map((it, i) => {
            const ativo = it.status === 'parcela';
            return (
              <div key={i} style={{ padding:'10px 10px', borderBottom:`1px solid ${T.border}` }}>
                <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                  <div style={{ flex:1, minWidth:0, opacity: ativo ? 1 : .55 }}>
                    <div style={{ fontSize:13, color:T.txt, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{it.base}</div>
                    <div style={{ fontSize:11, color:T.txt3, marginTop:2, display:'flex', gap:8, flexWrap:'wrap' }}>
                      <span>{fmtD(it.tx.data)}</span>
                      <span style={{ fontFamily:"'IBM Plex Mono',monospace", color: it.status === 'estorno' ? T.green : T.red }}>
                        {it.status === 'estorno' ? '+' : '-'}{fmt(it.tx.valor)}
                      </span>
                      {it.status === 'parcela' && it.atual < it.total && (
                        <span style={{ color:T.purple }}>→ +{it.total - it.atual} meses futuros</span>
                      )}
                      {it.status === 'parcela' && it.atual === it.total && (
                        <span style={{ color:T.txt3 }}>última parcela</span>
                      )}
                      {it.status === 'ignorar' && (
                        <span style={{ color:T.gold }}>→ entra como lançamento único, sem meses futuros</span>
                      )}
                      {it.status === 'estorno' && (
                        <span style={{ color:T.green }}>→ entra como entrada (estorno), sem meses futuros</span>
                      )}
                    </div>
                  </div>
                  {ativo && (
                    <div style={{ display:'flex', gap:6, flexShrink:0 }}>
                      <input
                        type="number" min="1" max={it.total} value={it.atual}
                        onChange={e => update(i, 'atual', e.target.value)}
                        title="Parcela atual"
                        style={{ ...inp, width:52, textAlign:'center' }}
                      />
                      <span style={{ color:T.txt3, alignSelf:'center' }}>/</span>
                      <input
                        type="number" min={it.atual} max="120" value={it.total}
                        onChange={e => update(i, 'total', e.target.value)}
                        title="Total de parcelas"
                        style={{ ...inp, width:52, textAlign:'center' }}
                      />
                    </div>
                  )}
                </div>

                {/* Ignorar / Estorno */}
                <div style={{ display:'flex', gap:3, background:T.bg3, padding:3, borderRadius:T.radius2, marginTop:8, width:'fit-content' }}>
                  {OPCOES.map(op => (
                    <button key={op.v} onClick={() => setStatus(i, op.v)} style={{
                      padding:'4px 10px', border: it.status === op.v ? `1px solid ${T.border3}` : '1px solid transparent',
                      background: it.status === op.v ? T.bg4 : 'transparent', color: it.status === op.v ? T.txt : T.txt3,
                      borderRadius:6, cursor:'pointer', fontSize:11, fontFamily:"'Sora',sans-serif",
                    }}>{op.l}</button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Resumo */}
        <div style={{ background:T.bg3, borderRadius:T.radius2, padding:'10px 14px', marginBottom:16, fontSize:12, color:T.txt2, display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:6 }}>
          <span>{emParcela.length} compra(s) parcelada(s){qtdIgnoradas > 0 ? ` · ${qtdIgnoradas} fora da projeção` : ''}</span>
          {totalFuturos > 0
            ? <span style={{ color:T.purple, fontWeight:600 }}>+{totalFuturos} lançamentos futuros serão criados</span>
            : <span style={{ color:T.txt3 }}>Sem lançamentos futuros</span>
          }
        </div>

        {/* Ações */}
        <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
          <button onClick={onClose} style={{ padding:'9px 18px', background:T.bg3, border:`1px solid ${T.border2}`, color:T.txt2, borderRadius:T.radius2, cursor:'pointer', fontFamily:"'Sora',sans-serif", fontSize:13 }}>
            Cancelar
          </button>
          <button onClick={confirmar} style={{ padding:'9px 20px', background:T.gold, color:'#000', borderRadius:T.radius2, border:'none', cursor:'pointer', fontFamily:"'Sora',sans-serif", fontSize:13, fontWeight:600 }}>
            Confirmar e importar →
          </button>
        </div>
      </div>
    </div>
  );
}
