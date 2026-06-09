import React from 'react';
import { T } from '../constants.js';

const NAV = [
  { id: 'dashboard',   label: 'Dashboard',     icon: <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>, tag: null },
  { id: 'extrato',     label: 'Extrato',        icon: <><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></>, tag: null },
  { id: 'lancamentos', label: 'Lançamentos',    icon: <><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></>, tag: null },
  { id: 'sep1', sep: true },
  { id: 'contas',      label: 'Contas',         icon: <><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></>, tag: null },
  { id: 'cartoes',     label: 'Cartões',        icon: <><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></>, tag: null },
  { id: 'sep2', sep: true },
  { id: 'pluggy',      label: 'Open Finance',   icon: <><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></>, tag: 'beta' },
  { id: 'importar',    label: 'Importar',       icon: <><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></>, tag: null },
];

function Icon({ children, size = 16, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
      style={{ flexShrink: 0 }}>
      {children}
    </svg>
  );
}

function Badge({ text }) {
  return (
    <span style={{
      fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1,
      padding: '1px 5px', borderRadius: 99, marginLeft: 'auto',
      background: 'rgba(77,142,255,.15)', color: T.blue, border: '1px solid rgba(77,142,255,.25)',
    }}>{text}</span>
  );
}

export default function Sidebar({ pag, setPag, perfil, setPerfil, collapsed, setCollapsed, onClose, isMobile }) {
  const W = collapsed && !isMobile ? 56 : 228;

  const handleNav = (id) => {
    setPag(id);
    if (isMobile) onClose();
  };

  return (
    <>
      {/* Overlay mobile */}
      {isMobile && (
        <div onClick={onClose} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)',
          zIndex: 199, backdropFilter: 'blur(4px)',
        }} />
      )}

      <nav style={{
        width: W, minWidth: W, maxWidth: W,
        background: T.bg2, borderRight: `1px solid ${T.border}`,
        display: 'flex', flexDirection: 'column', height: '100vh',
        overflowY: 'auto', overflowX: 'hidden',
        position: isMobile ? 'fixed' : 'relative',
        left: isMobile ? 0 : 'auto', top: isMobile ? 0 : 'auto',
        zIndex: isMobile ? 200 : 'auto',
        transition: 'width .2s ease, min-width .2s ease',
        flexShrink: 0,
      }}>

        {/* Header / Brand */}
        <div style={{ padding: '18px 16px 14px', borderBottom: `1px solid ${T.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            {(!collapsed || isMobile) && (
              <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 16, fontWeight: 800, letterSpacing: '-.5px', color: T.txt }}>
                YF<span style={{ color: T.green }}>Finance</span>
              </div>
            )}
            {collapsed && !isMobile && (
              <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 14, fontWeight: 800, color: T.green, margin: '0 auto' }}>YF</div>
            )}
            {!isMobile && (
              <button onClick={() => setCollapsed(!collapsed)} style={{
                background: 'transparent', border: 'none', color: T.txt3,
                cursor: 'pointer', padding: 4, borderRadius: T.radius3,
                display: 'flex', alignItems: 'center',
              }}>
                <Icon color={T.txt3} size={14}>
                  {collapsed
                    ? <polyline points="9 18 15 12 9 6"/>
                    : <polyline points="15 18 9 12 15 6"/>}
                </Icon>
              </button>
            )}
          </div>

          {/* Workspace switcher */}
          {(!collapsed || isMobile) && (
            <button onClick={() => setPerfil(perfil === 'pessoal' ? 'empresa' : 'pessoal')} style={{
              marginTop: 10, display: 'inline-flex', alignItems: 'center', gap: 6,
              background: T.bg3, border: `1px solid ${T.border2}`,
              borderRadius: 99, padding: '4px 10px', fontSize: 11, color: T.txt2,
              cursor: 'pointer', transition: 'all .15s', fontFamily: "'DM Sans', sans-serif",
              width: '100%', justifyContent: 'space-between',
            }}>
              <span>{perfil === 'pessoal' ? '👤 Pessoal' : '🏢 Empresa'}</span>
              <span style={{ color: T.txt3, fontSize: 10 }}>↕</span>
            </button>
          )}
        </div>

        {/* Nav items */}
        <div style={{ flex: 1, padding: '8px 0' }}>
          {NAV.map(item => {
            if (item.sep) return (
              <div key={item.id} style={{ height: 1, background: T.border, margin: '6px 0' }} />
            );
            const active = pag === item.id;
            return (
              <button key={item.id} onClick={() => handleNav(item.id)} style={{
                display: 'flex', alignItems: 'center',
                gap: collapsed && !isMobile ? 0 : 10,
                padding: collapsed && !isMobile ? '9px 0' : '9px 16px',
                justifyContent: collapsed && !isMobile ? 'center' : 'flex-start',
                width: '100%', background: active ? `rgba(5,212,155,.06)` : 'transparent',
                border: 'none', borderLeft: `2px solid ${active ? T.green : 'transparent'}`,
                color: active ? T.green : T.txt2, cursor: 'pointer',
                fontSize: 13, fontWeight: 500, fontFamily: "'DM Sans', sans-serif",
                transition: 'all .12s', margin: '1px 0',
              }}>
                <Icon color={active ? T.green : T.txt2} size={16}>{item.icon}</Icon>
                {(!collapsed || isMobile) && <span style={{ flex: 1, textAlign: 'left' }}>{item.label}</span>}
                {(!collapsed || isMobile) && item.tag && <Badge text={item.tag} />}
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 16px', borderTop: `1px solid ${T.border}` }}>
          {(!collapsed || isMobile) ? (
            <div style={{ fontSize: 10, color: T.txt3, letterSpacing: 1, textTransform: 'uppercase', textAlign: 'center' }}>
              by YFGroup
            </div>
          ) : (
            <div style={{ fontSize: 9, color: T.txt3, textAlign: 'center' }}>YFG</div>
          )}
        </div>
      </nav>
    </>
  );
}
