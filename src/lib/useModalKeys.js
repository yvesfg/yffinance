import { useEffect } from 'react';

/**
 * Atalhos de teclado padrão para modais:
 *   ESC   → fecha (onClose)
 *   ENTER → salva (onEnter), quando o foco está num <input> simples
 *   Ctrl/Cmd+ENTER → salva de qualquer campo (inclusive textarea/select)
 *
 * TAB para navegar entre campos é nativo do browser — não precisa de handler.
 */
export function useModalKeys(open, { onClose, onEnter } = {}) {
  useEffect(() => {
    if (!open) return;
    const handler = e => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose?.();
        return;
      }
      if (e.key === 'Enter') {
        const tag = (e.target?.tagName || '').toUpperCase();
        const isComposing = e.isComposing;
        const cmd = e.metaKey || e.ctrlKey;
        // Enter em input simples salva; em textarea/select só com Ctrl/Cmd
        if (!isComposing && onEnter && (cmd || tag === 'INPUT')) {
          e.preventDefault();
          onEnter();
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose, onEnter]);
}
