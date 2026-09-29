import React from 'react';
import { T } from '../constants.js';
import { useIsMobile } from '../lib/useMedia.js';

/**
 * Barra superior. O título vem pronto do App (`title`) — antes o componente
 * esperava `pag` e traduzia com um mapa próprio, então recebia undefined e a
 * barra ficava sem título nenhum.
 */
export default function TopBar({ title, onMenuClick }) {
  const isMobile = useIsMobile();

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: isMobile ? '12px 16px' : '16px 24px',
      borderBottom: `1px solid ${T.border}`,
      background: T.bg2, position: 'sticky', top: 0, zIndex: 100,
    }}>
      {/* No desktop a barra lateral já está à vista; o menu só serve no celular */}
      {isMobile && (
        <button
          onClick={onMenuClick}
          style={{
            display: 'flex', flexDirection: 'column', gap: 4,
            background: 'transparent', border: 'none', cursor: 'pointer',
            padding: 8, marginLeft: -8, borderRadius: T.radius3,
          }}
          aria-label="Abrir menu"
        >
          {[0, 1, 2].map(i => (
            <span key={i} style={{ display: 'block', width: 18, height: 2, background: T.txt2, borderRadius: 2 }} />
          ))}
        </button>
      )}
      <h2 style={{
        fontFamily: "'Sora', sans-serif", fontSize: isMobile ? 16 : 18, fontWeight: 700,
        color: T.txt, margin: 0, letterSpacing: '-.3px',
      }}>
        {title}
      </h2>
    </div>
  );
}
