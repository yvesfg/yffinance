import React from 'react';
import { T } from '../constants.js';

const TITLES = {
  dashboard:    'Dashboard',
  extrato:      'Extrato',
  lancamentos:  'Lançamentos',
  contas:       'Contas & Bancos',
  cartoes:      'Cartões de Crédito',
  pluggy:       'Open Finance',
  importar:     'Importar Extrato',
};

export default function TopBar({ pag, onMenuClick }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '16px 24px', borderBottom: `1px solid ${T.border}`,
      background: T.bg2, position: 'sticky', top: 0, zIndex: 100,
    }}>
      <button
        onClick={onMenuClick}
        style={{
          display: 'flex', flexDirection: 'column', gap: 4,
          background: 'transparent', border: 'none', cursor: 'pointer',
          padding: 6, borderRadius: T.radius3,
        }}
        aria-label="Menu"
      >
        {[0,1,2].map(i => (
          <span key={i} style={{ display: 'block', width: 18, height: 2, background: T.txt2, borderRadius: 2 }} />
        ))}
      </button>
      <h2 style={{
        fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 700,
        color: T.txt, margin: 0, letterSpacing: '-.3px',
      }}>
        {TITLES[pag] || pag}
      </h2>
    </div>
  );
}
