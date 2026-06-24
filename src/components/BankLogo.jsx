import React from 'react';
import { T, BANCOS } from '../constants.js';

/**
 * Logo do banco. Prioriza um link customizado (logo_url), depois o logo
 * mapeado em BANCOS pelo slug, e por fim um quadrado com a inicial.
 */
export default function BankLogo({ slug, url, size = 28 }) {
  const b = BANCOS[slug];
  const src = url || b?.logo;
  if (!src) {
    return (
      <div style={{ width: size, height: size, borderRadius: size * .28, background: T.bg3, border: `1px solid ${T.border2}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: Math.max(10, size * .38), fontWeight: 700, color: T.txt2 }}>
        {(slug || '?')[0].toUpperCase()}
      </div>
    );
  }
  return (
    <img
      src={src}
      width={size}
      height={size}
      style={{ borderRadius: size * .28, background: 'white', padding: Math.max(2, size * .09), objectFit: 'contain' }}
      onError={e => { e.target.style.display = 'none'; }}
      alt={b?.nome || slug || 'banco'}
    />
  );
}
