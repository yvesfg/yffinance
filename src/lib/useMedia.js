import { useState, useEffect } from 'react';

/**
 * Media query reativa. O app é todo estilo inline, então não dá para usar
 * @media do CSS: o layout precisa saber o tamanho da tela em JS.
 *
 * Antes isso era `window.innerWidth < 768` lido direto no corpo do
 * componente — só acertava por acaso, quando algo mais causava re-render.
 * Girar o celular ou redimensionar a janela não mudava nada.
 */
export function useMedia(query) {
  const [bate, setBate] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia(query).matches);

  useEffect(() => {
    const mq = window.matchMedia(query);
    const aoMudar = e => setBate(e.matches);
    setBate(mq.matches);
    mq.addEventListener('change', aoMudar);
    return () => mq.removeEventListener('change', aoMudar);
  }, [query]);

  return bate;
}

// Celular: a barra lateral vira gaveta e as listas viram cartão.
export const useIsMobile = () => useMedia('(max-width: 767px)');
// Tablet e telas estreitas: cabe a barra lateral, mas não as grades de 4 colunas.
export const useIsTablet = () => useMedia('(max-width: 1023px)');
