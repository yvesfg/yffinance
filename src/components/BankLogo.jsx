import React, { useState, useEffect } from 'react';
import { T, BANCOS } from '../constants.js';

const EXT_IMG = /\.(png|jpe?g|svg|webp|gif|ico|avif)(\?|#|$)/i;

/**
 * Aceita tanto o link direto de uma imagem quanto o endereço do site do banco
 * ("mercadopago.com.br"): nesse caso busca o ícone do próprio domínio, que é
 * o que a pessoa espera ao colar o site na mão.
 */
export function resolverLogo(url) {
  const u = (url || '').trim();
  if (!u) return '';
  if (u.startsWith('data:') || EXT_IMG.test(u)) return u;
  try {
    const { hostname } = new URL(/^https?:\/\//i.test(u) ? u : `https://${u}`);
    return `https://www.google.com/s2/favicons?domain=${hostname}&sz=128`;
  } catch {
    return u;
  }
}

/**
 * Logo do banco. Prioriza um link customizado (logo_url), depois o logo
 * mapeado em BANCOS pelo slug, e por fim um quadrado com a inicial.
 */
export default function BankLogo({ slug, url, size = 28 }) {
  const b = BANCOS[slug];
  const src = resolverLogo(url) || b?.logo;
  const [falhou, setFalhou] = useState(false);

  // Trocar de conta/cartão reaproveita o componente; sem isso o logo novo
  // herdava a falha do anterior e nunca aparecia.
  useEffect(() => { setFalhou(false); }, [src]);

  if (!src || falhou) {
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
      onError={() => setFalhou(true)}
      alt={b?.nome || slug || 'banco'}
    />
  );
}
