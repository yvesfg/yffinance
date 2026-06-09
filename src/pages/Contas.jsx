import React from 'react';
import { T, BANCOS } from '../constants.js';
import { fmt } from '../lib/formatters.js';

function BankLogo({ slug, size = 32 }) {
  const b = BANCOS[slug];
  if (!b?.logo) return <div style={{ width:size, height:size, borderRadius:size*.28, background:T.bg3, border:`1px solid ${T.border2}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, color:T.txt2 }}>{(slug||'?')[0].toUpperCase()}</div>;
  return <img src={b.logo} width={size} height={size} style={{ borderRadius:size*.28, background:'white', padding:3, objectFit:'contain' }} onError={e => e.target.style.display='none'} alt={b.nome} />;
}

export default function Contas({ contas, txs, onNew, onEdit, onDelete }) {
  const calcSaldo = id => {
    const c = contas.find(c => c.id === id); if (!c) return 0;
    let s = Number(c.saldo_inicial) || 0;
    txs.forEach(t => {
      if (t.conta_id === id && (t.tipo === 'despesa' || t.tipo === 'cartao' || t.tipo === 'transferencia')) s -= Number(t.valor);
      if (t.conta_id === id && t.tipo === 'receita') s += Number(t.valor);
      if (t.conta_destino_id === id && t.tipo === 'transferencia') s += Number(t.valor);
    });
    return s;
  };

  const saldoTotal = contas.reduce((s, c) => s + calcSaldo(c.id), 0);

  const TIPOS_LABEL = { corrente:'Conta Corrente', poupanca:'Poupança', investimento:'Investimento', carteira:'Carteira', outro:'Outro' };

  return (
    <div style={{ padding:'24px 28px', fontFamily:"'DM Sans',sans-serif" }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
        <div>
          <h2 style={{ fontFamily:"'Syne',sans-serif", fontSize:24, fontWeight:700, color:T.txt, margin:0, letterSpacing:-.5 }}>Contas</h2>
          <p style={{ fontSize:12, color:T.txt3, marginTop:3 }}>Saldo total: <span style={{ fontFamily:"'JetBrains Mono',monospace", color: saldoTotal>=0?T.green:T.red }}>{fmt(saldoTotal)}</span></p>
        </div>
        <button onClick={onNew} style={{ background:T.green, color:'#000', border:'none', borderRadius:T.radius2, padding:'9px 18px', cursor:'pointer', fontFamily:"'DM Sans',sans-serif", fontSize:13, fontWeight:600 }}>+ Nova Conta</button>
      </div>

      {contas.length === 0
        ? <div style={{ background:T.bg2, border:`1px solid ${T.border}`, borderRadius:T.radius, padding:'48px', textAlign:'center', color:T.txt3 }}>
            <div style={{ fontSize:32, marginBottom:12 }}>🏦</div>
            <div style={{ fontSize:14 }}>Nenhuma conta cadastrada</div>
            <div style={{ fontSize:12, marginTop:6 }}>Adicione uma conta para começar</div>
          </div>
        : <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:14 }}>
            {contas.map(c => {
              const saldo = calcSaldo(c.id);
              const banco = BANCOS[c.banco_slug] || BANCOS.outro;
              const txCount = txs.filter(t => t.conta_id === c.id || t.conta_destino_id === c.id).length;
              return (
                <div key={c.id} style={{ background:T.bg2, border:`1px solid ${T.border}`, borderRadius:T.radius, padding:20, position:'relative', overflow:'hidden' }}>
                  <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:`linear-gradient(90deg,${c.cor||banco.cor},transparent)` }} />
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:16 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <BankLogo slug={c.banco_slug} size={36} />
                      <div>
                        <div style={{ fontSize:14, fontWeight:600, color:T.txt }}>{c.nome}</div>
                        <div style={{ fontSize:11, color:T.txt3 }}>{TIPOS_LABEL[c.tipo] || c.tipo} · {banco.nome}</div>
                      </div>
                    </div>
                    <div style={{ display:'flex', gap:6 }}>
                      <button onClick={() => onEdit(c)} style={{ background:T.bg3, border:`1px solid ${T.border2}`, color:T.txt2, width:28, height:28, borderRadius:T.radius3, cursor:'pointer', fontSize:13, display:'flex', alignItems:'center', justifyContent:'center' }}>✎</button>
                      <button onClick={() => { if (window.confirm('Excluir esta conta? Lançamentos vinculados não serão excluídos.')) onDelete(c.id); }} style={{ background:T.bg3, border:`1px solid ${T.border2}`, color:T.txt2, width:28, height:28, borderRadius:T.radius3, cursor:'pointer', fontSize:13, display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
                    </div>
                  </div>
                  <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:22, fontWeight:500, color: saldo>=0?T.green:T.red, marginBottom:8 }}>{fmt(saldo)}</div>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:T.txt3 }}>
                    <span>Saldo inicial: {fmt(c.saldo_inicial)}</span>
                    <span>{txCount} movimentações</span>
                  </div>
                </div>
              );
            })}
          </div>
      }
    </div>
  );
}
