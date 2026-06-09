import React from 'react';
import { T, BANCOS } from '../constants.js';
import { fmt } from '../lib/formatters.js';

function BankLogo({ slug, size = 28 }) {
  const b = BANCOS[slug];
  if (!b?.logo) return <div style={{ width:size, height:size, borderRadius:size*.28, background:T.bg3, border:`1px solid ${T.border2}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700, color:T.txt2 }}>{(slug||'?')[0].toUpperCase()}</div>;
  return <img src={b.logo} width={size} height={size} style={{ borderRadius:size*.28, background:'white', padding:2, objectFit:'contain' }} onError={e => e.target.style.display='none'} alt={b.nome} />;
}

export default function Cartoes({ cartoes, txs, contas, onNew, onEdit, onDelete }) {
  const gastoCartao = id => txs.filter(t => (t.cartao_id === id || t.conta_id === id) && t.tipo === 'cartao').reduce((s, t) => s + Number(t.valor), 0);

  return (
    <div style={{ padding:'24px 28px', fontFamily:"'DM Sans',sans-serif" }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
        <h2 style={{ fontFamily:"'Syne',sans-serif", fontSize:24, fontWeight:700, color:T.txt, margin:0, letterSpacing:-.5 }}>Cartões de Crédito</h2>
        <button onClick={onNew} style={{ background:T.green, color:'#000', border:'none', borderRadius:T.radius2, padding:'9px 18px', cursor:'pointer', fontFamily:"'DM Sans',sans-serif", fontSize:13, fontWeight:600 }}>+ Novo Cartão</button>
      </div>

      {cartoes.length === 0
        ? <div style={{ background:T.bg2, border:`1px solid ${T.border}`, borderRadius:T.radius, padding:'48px', textAlign:'center', color:T.txt3 }}>
            <div style={{ fontSize:32, marginBottom:12 }}>💳</div>
            <div style={{ fontSize:14 }}>Nenhum cartão cadastrado</div>
          </div>
        : <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:16 }}>
            {cartoes.map(c => {
              const gasto = gastoCartao(c.id);
              const limite = Number(c.limite) || 0;
              const pct = limite > 0 ? Math.min(100, Math.round(gasto / limite * 100)) : 0;
              const contaPag = contas.find(ct => ct.id === c.conta_pagamento_id);
              const cor = c.cor || '#9b6dff';
              return (
                <div key={c.id} style={{ background:T.bg2, border:`1px solid ${T.border}`, borderRadius:T.radius, padding:22, position:'relative', overflow:'hidden' }}>
                  <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:`linear-gradient(90deg,${cor},transparent)` }} />
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:18 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <BankLogo slug={c.banco_slug} size={32} />
                      <div>
                        <div style={{ fontSize:14, fontWeight:600, color:T.txt }}>{c.nome}</div>
                        <div style={{ fontSize:11, color:T.txt3 }}>{c.bandeira} · {BANCOS[c.banco_slug]?.nome || c.banco_slug}</div>
                      </div>
                    </div>
                    <div style={{ display:'flex', gap:6 }}>
                      <button onClick={() => onEdit(c)} style={{ background:T.bg3, border:`1px solid ${T.border2}`, color:T.txt2, width:28, height:28, borderRadius:T.radius3, cursor:'pointer', fontSize:13, display:'flex', alignItems:'center', justifyContent:'center' }}>✎</button>
                      <button onClick={() => { if (window.confirm('Excluir este cartão?')) onDelete(c.id); }} style={{ background:T.bg3, border:`1px solid ${T.border2}`, color:T.txt2, width:28, height:28, borderRadius:T.radius3, cursor:'pointer', fontSize:13, display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
                    </div>
                  </div>

                  {/* Uso do limite */}
                  <div style={{ marginBottom:14 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:6 }}>
                      <span style={{ color:T.txt3 }}>Fatura atual</span>
                      <span style={{ fontFamily:"'JetBrains Mono',monospace", color: pct > 80 ? T.red : T.txt }}>{fmt(gasto)}</span>
                    </div>
                    <div style={{ height:5, background:T.bg3, borderRadius:99, overflow:'hidden' }}>
                      <div style={{ height:'100%', width:`${pct}%`, background: pct>80?T.red:pct>60?T.gold:cor, borderRadius:99, transition:'width .3s' }} />
                    </div>
                    <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:T.txt3, marginTop:4 }}>
                      <span>{pct}% utilizado</span>
                      <span>Limite: {fmt(limite)}</span>
                    </div>
                  </div>

                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, fontSize:11 }}>
                    {c.dia_fechamento && <div style={{ color:T.txt3 }}>Fechamento: <span style={{ color:T.txt }}>dia {c.dia_fechamento}</span></div>}
                    {c.dia_vencimento && <div style={{ color:T.txt3 }}>Vencimento: <span style={{ color:T.txt }}>dia {c.dia_vencimento}</span></div>}
                    {contaPag && <div style={{ color:T.txt3, gridColumn:'1/-1' }}>Conta pagamento: <span style={{ color:T.txt }}>{contaPag.nome}</span></div>}
                  </div>
                </div>
              );
            })}
          </div>
      }
    </div>
  );
}
