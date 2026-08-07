// src/components/Icon.jsx
// Ícones de linha (mesmo estilo do controle-operacional): viewBox 24, fill
// none, stroke currentColor. Uso: <Icon n="trash" s={16} c={T.red} />
import React from 'react';

const P = {
  // ações genéricas
  x:       <><path d="M18 6 6 18M6 6l12 12"/></>,
  check:   <><polyline points="20 6 9 17 4 12"/></>,
  edit:    <><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z"/></>,
  trash:   <><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></>,
  plus:    <><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>,
  "arrow-right": <><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></>,
  "chevron-left": <><polyline points="15 18 9 12 15 6"/></>,
  "chevron-right": <><polyline points="9 18 15 12 9 6"/></>,
  // categorias financeiras
  utensils:      <><path d="M3 2v7c0 1.1.9 2 2 2h2a2 2 0 0 0 2-2V2M7 2v20M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3zm0 0v7"/></>,
  home:          <><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></>,
  smartphone:    <><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></>,
  "credit-card": <><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></>,
  droplet:       <><path d="M12 2.69 17.66 8.35A8 8 0 1 1 6.34 8.35z"/></>,
  "book-open":   <><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></>,
  monitor:       <><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></>,
  "dollar-sign": <><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></>,
  users:         <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>,
  receipt:       <><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1z"/><line x1="8" y1="8" x2="16" y2="8"/><line x1="8" y1="12" x2="16" y2="12"/></>,
  megaphone:     <><path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/></>,
  package:       <><path d="M16.5 9.4 7.55 4.24M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></>,
  user:          <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></>,
  activity:      <><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></>,
  "shopping-cart": <><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></>,
  gamepad:       <><line x1="6" y1="12" x2="10" y2="12"/><line x1="8" y1="10" x2="8" y2="14"/><circle cx="15" cy="13" r="1"/><circle cx="18" cy="11" r="1"/><rect x="2" y="6" width="20" height="12" rx="2"/></>,
  car:           <><path d="M14 16H9m10 0h3v-3.15a1 1 0 0 0-.84-.99L19 11l-2.7-3.6a1 1 0 0 0-.8-.4H5.24a2 2 0 0 0-1.8 1.1l-.8 1.63A6 6 0 0 0 2 12.42V16h2"/><circle cx="6.5" cy="16.5" r="2.5"/><circle cx="16.5" cy="16.5" r="2.5"/></>,
  laptop:        <><path d="M20 16V7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v9"/><path d="M2 16h20l1.28 2.55a1 1 0 0 1-.9 1.45H1.62a1 1 0 0 1-.9-1.45z"/></>,
  "trending-up": <><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></>,
  building:      <><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="9" y1="6" x2="9" y2="6.01"/><line x1="15" y1="6" x2="15" y2="6.01"/><line x1="9" y1="10" x2="9" y2="10.01"/><line x1="15" y1="10" x2="15" y2="10.01"/><line x1="9" y1="14" x2="9" y2="14.01"/><line x1="15" y1="14" x2="15" y2="14.01"/></>,
  briefcase:     <><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></>,
  repeat:        <><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></>,
  tag:           <><path d="M20.59 13.41 13.41 20.6a2 2 0 0 1-2.83 0L2 12.99V2h10.99l8.6 8.58a2 2 0 0 1 0 2.83Z"/><line x1="7" y1="7" x2="7.01" y2="7"/></>,
};

export default function Icon({ n, name, s = 16, size, c, color, sw = 1.8, style }) {
  const key = n || name;
  const paths = P[key];
  const px = size || s;
  if (!paths) return null;
  return (
    <svg width={px} height={px} viewBox="0 0 24 24" fill="none"
      stroke={color || c || 'currentColor'} strokeWidth={sw}
      strokeLinecap="round" strokeLinejoin="round"
      style={{ display: 'inline-block', flexShrink: 0, verticalAlign: 'middle', ...style }}>
      {paths}
    </svg>
  );
}

// Emoji -> nome do ícone, para categorias já cadastradas (campo cf_categorias.icone
// continua guardando o emoji — este mapa só decide QUAL svg mostrar no lugar dele).
export const EMOJI_ICON = {
  '🍽️': 'utensils', '🍽': 'utensils',
  '🏠': 'home',
  '📱': 'smartphone',
  '💳': 'credit-card',
  '⛽': 'droplet',
  '📚': 'book-open',
  '🖥️': 'monitor', '🖥': 'monitor',
  '💰': 'dollar-sign',
  '🤝': 'users',
  '🧾': 'receipt',
  '🎮': 'gamepad',
  '📣': 'megaphone',
  '📦': 'package',
  '👤': 'user',
  '🏥': 'activity',
  '🛒': 'shopping-cart',
  '🚗': 'car',
  '💻': 'laptop',
  '📈': 'trending-up',
  '🏢': 'building',
  '💼': 'briefcase',
  '🔄': 'repeat',
};

/** Ícone de categoria a partir do emoji salvo — cai em "tag" se não mapeado. */
export function CategoriaIcon({ emoji, s = 14, c, style }) {
  return <Icon n={EMOJI_ICON[emoji] || 'tag'} s={s} c={c} style={style} />;
}
