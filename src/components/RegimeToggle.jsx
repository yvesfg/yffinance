import React from 'react';
import { T } from '../constants.js';
import { REGIMES } from '../lib/regime.js';

/**
 * Alterna entre ver o mesmo período em Competência (gasto no dia da compra)
 * ou Caixa (dinheiro no dia em que sai da conta). Mesmo controle no Dashboard
 * e no Extrato.
 */
export default function RegimeToggle({ value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 3, background: T.bg3, padding: 3, borderRadius: T.radius2 }} title="Competência: gasto no dia da compra · Caixa: dinheiro no dia em que sai da conta">
      {REGIMES.map(r => (
        <button key={r.v} onClick={() => onChange(r.v)} title={r.ajuda} style={{
          padding: '5px 10px', border: value === r.v ? `1px solid ${T.border3}` : '1px solid transparent',
          background: value === r.v ? T.bg4 : 'transparent', color: value === r.v ? T.txt : T.txt2,
          borderRadius: 6, cursor: 'pointer', fontSize: 12, fontFamily: "'Sora',sans-serif",
        }}>{r.l}</button>
      ))}
    </div>
  );
}
