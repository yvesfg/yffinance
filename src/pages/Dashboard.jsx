import React from 'react';
import { T, BANCOS, MESES } from '../constants.js';
import { fmt, fmtD } from '../lib/formatters.js';

function StatCard({ label, value, color, sub, accent }) {
  return (
    <div style={{ background: T.bg2, border: `1px solid ${T.border}`, borderRadius: T.radius, padding: 18, position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg,${accent},transparent)` }} />
      <div style={{ fontSize: 10, color: T.txt3, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600, marginBottom: 10 }}>{label}</div>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 20, fontWeight: 500, color }}>{value}</div>
      <div style={{ fontSize: 11, color: T.txt3, marginTop: 6 }}>{sub}</div>
    </div>
  );
}

function BankLogo({ slug, size = 28 }) {
  const b = BANCOS[slug];
  if (!b?.logo) return <div style={{ width: size, height: size, borderRadius: size * .28, background: T.bg3, border: `1px solid ${T.border2}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: T.txt2 }}>{(slug || '?')[0].toUpperCase()}</div>;
  return <img src={b.logo} width={size} height={size} style={{ borderRadius: size * .28, background: 'white', padding: 3, objectFit: 'contain' }} onError={e => e.target.style.display = 'none'} alt={b.nome} />;
}

export default function Dashboard({ txs, contas, cats, mesAtual, setMesAtual, loadTxs, perfil }) {
  const rec  = txs.filter(t => t.tipo === 'receita').reduce((s, t) => s + Number(t.valor), 0);
  const desp = txs.filter(t => t.tipo === 'despesa').reduce((s, t) => s + Number(t.valor), 0);
  const cart = txs.filter(t => t.tipo === 'cartao').reduce((s, t) => s + Number(t.valor), 0);

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

  const [ano, mes] = mesAtual.split('-').map(Number);
  const mudarMes = d => {
    const dt = new Date(ano, mes - 1 + d, 1);
    setMesAtual(`${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`);
    loadTxs();
  };

  const catMap = {};
  txs.filter(t => t.tipo === 'despesa' || t.tipo === 'cartao').forEach(t => {
    const cat = cats.find(c => c.id === t.categoria_id);
    const n = cat ? cat.nome : 'Sem categoria';
    catMap[n] = (catMap[n] || 0) + Number(t.valor);
  });
  const topCats = Object.entries(catMap).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const totalCat = topCats.reduce((s, [, v]) => s + v, 0) || 1;
  const CORES = ['#f04f6e','#f97316','#f7c645','#4d8eff','#9b6dff','#05d49b'];

  const ultimas = txs.slice(0, 8);

  return (
    <div style={{ padding: '24px 28px', fontFamily: "'DM Sans', sans-serif" }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 24, fontWeight: 700, color: T.txt, margin: 0, letterSpacing: -.5 }}>Dashboard</h2>
          <p style={{ fontSize: 12, color: T.txt3, marginTop: 3 }}>{perfil === 'pessoal' ? 'Finanças pessoais' : 'YFGroup Transportes'}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => mudarMes(-1)} style={{ background: T.bg3, border: `1px solid ${T.border}`, color: T.txt2, width: 28, height: 28, borderRadius: T.radius3, cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>‹</button>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, minWidth: 100, textAlign: 'center', color: T.txt }}>{MESES[mes - 1]} {ano}</span>
          <button onClick={() => mudarMes(1)} style={{ background: T.bg3, border: `1px solid ${T.border}`, color: T.txt2, width: 28, height: 28, borderRadius: T.radius3, cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>›</button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 20 }}>
        <StatCard label="Receitas"    value={fmt(rec)}      color={T.green}  accent={T.green}  sub={`${txs.filter(t=>t.tipo==='receita').length} lançamentos`} />
        <StatCard label="Despesas"    value={fmt(desp)}     color={T.red}    accent={T.red}    sub={`${txs.filter(t=>t.tipo==='despesa').length} lançamentos`} />
        <StatCard label="Cartões"     value={fmt(cart)}     color={T.purple} accent={T.purple} sub={`${txs.filter(t=>t.tipo==='cartao').length} lançamentos`} />
        <StatCard label="Saldo Total" value={fmt(saldoTotal)} color={T.gold} accent={T.gold}  sub={`${contas.length} contas`} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        {/* Contas */}
        <div style={{ background: T.bg2, border: `1px solid ${T.border}`, borderRadius: T.radius, padding: 18 }}>
          <div style={{ fontSize: 10, color: T.txt3, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600, marginBottom: 14 }}>Saldo por Conta</div>
          {contas.length === 0
            ? <div style={{ color: T.txt3, fontSize: 12 }}>Sem contas cadastradas</div>
            : contas.map(c => {
              const s = calcSaldo(c.id);
              return (
                <div key={c.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 0', borderBottom:`1px solid ${T.border}` }}>
                  <BankLogo slug={c.banco_slug} size={26} />
                  <div style={{ flex: 1, fontSize: 13, fontWeight: 500, color: T.txt, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{c.nome}</div>
                  <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:13, color: s >= 0 ? T.green : T.red }}>{fmt(s)}</div>
                </div>
              );
            })
          }
        </div>

        {/* Categorias */}
        <div style={{ background: T.bg2, border: `1px solid ${T.border}`, borderRadius: T.radius, padding: 18 }}>
          <div style={{ fontSize: 10, color: T.txt3, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600, marginBottom: 14 }}>Gastos por Categoria</div>
          {topCats.length === 0
            ? <div style={{ color: T.txt3, fontSize: 12 }}>Sem gastos</div>
            : topCats.map(([n, val], i) => (
              <div key={n} style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
                <div style={{ width:7, height:7, borderRadius:'50%', background:CORES[i%6], flexShrink:0 }} />
                <div style={{ flex:1, fontSize:13, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', color:T.txt }}>{n}</div>
                <div style={{ width:80, height:4, background:T.bg3, borderRadius:99, overflow:'hidden', flexShrink:0 }}>
                  <div style={{ height:'100%', width:`${Math.round(val/totalCat*100)}%`, background:CORES[i%6], borderRadius:99 }} />
                </div>
                <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:12, color:T.txt2, width:72, textAlign:'right', flexShrink:0 }}>{fmt(val)}</div>
              </div>
            ))
          }
        </div>
      </div>

      {/* Últimas */}
      <div style={{ background: T.bg2, border: `1px solid ${T.border}`, borderRadius: T.radius, padding: 18 }}>
        <div style={{ fontSize: 10, color: T.txt3, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600, marginBottom: 14 }}>Últimas Movimentações</div>
        {ultimas.length === 0
          ? <div style={{ color: T.txt3, fontSize: 12, padding: '12px 0' }}>Sem movimentações</div>
          : ultimas.map(t => {
            const cor = t.tipo==='receita'?T.green:t.tipo==='transferencia'?T.blue:t.tipo==='cartao'?T.purple:T.red;
            const bg  = t.tipo==='receita'?T.greenGlow:t.tipo==='transferencia'?T.blueGlow:t.tipo==='cartao'?T.purpleGlow:T.redGlow;
            const icon = t.tipo==='receita'?'↑':t.tipo==='transferencia'?'⇄':t.tipo==='cartao'?'▣':'↓';
            const sinal = t.tipo==='receita'?'+':t.tipo==='transferencia'?'⇄':'-';
            const cat = cats.find(c => c.id === t.categoria_id);
            return (
              <div key={t.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 0', borderBottom:`1px solid ${T.border}` }}>
                <div style={{ width:32, height:32, borderRadius:9, background:bg, color:cor, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, flexShrink:0 }}>{icon}</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', color:T.txt }}>{t.descricao}</div>
                  <div style={{ fontSize:11, color:T.txt3, marginTop:1 }}>{fmtD(t.data)}{cat?` · ${cat.nome}`:''}</div>
                </div>
                <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:13, color:cor, flexShrink:0 }}>{sinal}{fmt(t.valor)}</div>
              </div>
            );
          })
        }
      </div>
    </div>
  );
}
