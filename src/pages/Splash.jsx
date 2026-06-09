import React from 'react';
import { T } from '../constants.js';

export default function Splash({ onSelect }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: T.bg, zIndex: 9000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexDirection: 'column', gap: 0, fontFamily: "'DM Sans', sans-serif",
    }}>
      <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 48, fontWeight: 800, letterSpacing: -3, marginBottom: 8 }}>
        <span style={{ color: T.txt }}>YF</span><span style={{ color: T.green }}>Finance</span>
      </div>
      <div style={{ fontSize: 12, color: T.txt3, letterSpacing: 4, textTransform: 'uppercase', marginBottom: 56 }}>
        Sistema Financeiro Pessoal &amp; Empresarial
      </div>
      <div style={{ display: 'flex', gap: 20 }}>
        {[
          { perfil: 'pessoal',  icon: '👤', title: 'Pessoal',  desc: 'Finanças pessoais, gastos do dia a dia e cartões' },
          { perfil: 'empresa',  icon: '🏢', title: 'Empresa',  desc: 'YFGroup Transportes — receitas, despesas e DRE' },
        ].map(({ perfil, icon, title, desc }) => (
          <div key={perfil} onClick={() => onSelect(perfil)} style={{
            width: 200, padding: '28px 24px', border: `1px solid ${T.border2}`,
            borderRadius: T.radius, cursor: 'pointer', textAlign: 'center',
            background: T.bg2, transition: 'all .2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = T.green; e.currentTarget.style.transform = 'translateY(-3px)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = T.border2; e.currentTarget.style.transform = 'none'; }}
          >
            <div style={{ fontSize: 36, marginBottom: 14 }}>{icon}</div>
            <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: 17, fontWeight: 700, color: T.txt, margin: '0 0 6px' }}>{title}</h3>
            <p style={{ fontSize: 12, color: T.txt2, lineHeight: 1.5, margin: 0 }}>{desc}</p>
          </div>
        ))}
      </div>
      <div style={{ position: 'absolute', bottom: 20, fontSize: 11, color: T.txt3, letterSpacing: 1 }}>
        by YFGroup
      </div>
    </div>
  );
}
