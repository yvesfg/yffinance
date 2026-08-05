import React, { useState } from 'react';
import { T } from '../constants.js';
import { periodoMes, periodoTrimestre, periodoAno, periodoLivre, moverPeriodo, rotuloPeriodo, mesDoPeriodo } from '../lib/periodo.js';

const btn = {
  background: T.bg3, border: `1px solid ${T.border2}`, color: T.txt2,
  width: 28, height: 28, borderRadius: T.radius3, cursor: 'pointer', fontSize: 13,
  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
};
const inp = {
  background: T.bg3, border: `1px solid ${T.border2}`, color: T.txt,
  padding: '6px 8px', borderRadius: T.radius3, fontSize: 12, outline: 'none',
  fontFamily: "'DM Sans',sans-serif", width: '100%', boxSizing: 'border-box',
};

/**
 * Seletor de período usado em todas as telas. Mês continua sendo o padrão —
 * a diferença é poder abrir para trimestre, ano ou intervalo livre sem ter de
 * clicar mês a mês para achar onde estão os lançamentos.
 */
export default function PeriodoSelect({ value, onChange, compacto = false }) {
  const [aberto, setAberto] = useState(false);
  const [de, setDe]   = useState(value.inicio);
  const [ate, setAte] = useState(value.fim);

  const ano = Number(mesDoPeriodo(value).slice(0, 4));
  const escolher = p => { onChange(p); setAberto(false); };

  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 8 }}>
      <button onClick={() => onChange(moverPeriodo(value, -1))} style={btn} title="Anterior">‹</button>

      <button
        onClick={() => setAberto(a => !a)}
        style={{ ...btn, width: 'auto', padding: '0 12px', gap: 6, fontFamily: "'JetBrains Mono',monospace",
                 fontSize: 12, color: T.txt, minWidth: compacto ? 0 : 150, justifyContent: 'center' }}
        title="Escolher período"
      >
        {rotuloPeriodo(value)} <span style={{ color: T.txt3, fontSize: 9 }}>▾</span>
      </button>

      <button onClick={() => onChange(moverPeriodo(value, 1))} style={btn} title="Próximo">›</button>

      {aberto && (
        <>
          <div onClick={() => setAberto(false)} style={{ position: 'fixed', inset: 0, zIndex: 90 }} />
          <div style={{
            position: 'absolute', top: 36, right: 0, zIndex: 91, width: 260,
            background: T.bg2, border: `1px solid ${T.border2}`, borderRadius: T.radius2,
            padding: 12, boxShadow: '0 12px 32px rgba(0,0,0,.45)',
          }}>
            <div style={{ fontSize: 10, color: T.txt3, textTransform: 'uppercase', letterSpacing: .8, fontWeight: 600, marginBottom: 8 }}>Mês</div>
            <input type="month" style={inp} value={mesDoPeriodo(value)}
              onChange={e => e.target.value && escolher(periodoMes(e.target.value))} />

            <div style={{ fontSize: 10, color: T.txt3, textTransform: 'uppercase', letterSpacing: .8, fontWeight: 600, margin: '12px 0 8px' }}>Trimestre</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {[1, 2, 3, 4].map(t => (
                <button key={t} onClick={() => escolher(periodoTrimestre(ano, t))}
                  style={{ ...btn, flex: 1, width: 'auto', fontSize: 11 }}>{t}º</button>
              ))}
            </div>

            <div style={{ fontSize: 10, color: T.txt3, textTransform: 'uppercase', letterSpacing: .8, fontWeight: 600, margin: '12px 0 8px' }}>Ano</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {[ano - 1, ano, ano + 1].map(a => (
                <button key={a} onClick={() => escolher(periodoAno(a))}
                  style={{ ...btn, flex: 1, width: 'auto', fontSize: 11 }}>{a}</button>
              ))}
            </div>

            <div style={{ fontSize: 10, color: T.txt3, textTransform: 'uppercase', letterSpacing: .8, fontWeight: 600, margin: '12px 0 8px' }}>Intervalo</div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input type="date" style={inp} value={de} onChange={e => setDe(e.target.value)} />
              <span style={{ color: T.txt3, fontSize: 11 }}>a</span>
              <input type="date" style={inp} value={ate} onChange={e => setAte(e.target.value)} />
            </div>
            <button
              onClick={() => de && ate && escolher(periodoLivre(de, ate))}
              style={{ ...btn, width: '100%', marginTop: 8, background: T.green, color: '#000', border: 'none', fontWeight: 600, fontSize: 12 }}
            >Aplicar intervalo</button>
          </div>
        </>
      )}
    </div>
  );
}
