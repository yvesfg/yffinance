// src/components/Modal.jsx
// Janela única do app (direção Cabine, a mesma do Controle Operacional e do
// Frota Pro). Os 4 modais montavam overlay, caixa, título e X à mão, cada um
// com um tamanho de título e um escurecimento. O desenho mora em index.css
// (.yf-modal*); aqui fica só a estrutura e o clique fora. Esc e Enter
// continuam com o useModalKeys de cada modal.
import React from 'react';
import Icon from './Icon.jsx';

export default function Modal({ titulo, sub, onClose, largura = 420, zIndex, coluna = false, children }) {
  return (
    <div className="yf-modal-overlay" onClick={onClose} style={zIndex ? { zIndex } : undefined}>
      <div className={`yf-modal${coluna ? ' yf-modal--coluna' : ''}`} role="dialog" aria-modal="true"
        onClick={e => e.stopPropagation()} style={{ maxWidth: largura }}>
        <div className="yf-modal__head">
          <div style={{ minWidth: 0 }}>
            <h3 className="yf-modal__title">{titulo}</h3>
            {sub && <p className="yf-modal__sub">{sub}</p>}
          </div>
          <button type="button" className="yf-modal__close" onClick={onClose} aria-label="Fechar" title="Fechar">
            <Icon n="x" s={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
