import React, { useState } from 'react';
import { T } from '../constants.js';

const SWATCHES = [
  '#4fbf8b', '#4d8eff', '#9b6dff', '#f2c14e', '#ef6a5b', '#ff7a00',
  '#00b1ea', '#21c25e', '#8a05be', '#003087', '#cc092f', '#8d929c',
];

/**
 * Seletor de cor por amostras (swatches). Clicar numa amostra define a cor
 * imediatamente — sem abrir/segurar a janela nativa de cor.
 * Um botão opcional abre o seletor nativo só quando o usuário quer uma cor custom.
 */
export default function ColorField({ value, onChange }) {
  const [showCustom, setShowCustom] = useState(false);
  const isPreset = SWATCHES.includes((value || '').toLowerCase());

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
      {SWATCHES.map(c => {
        const active = (value || '').toLowerCase() === c;
        return (
          <button
            key={c}
            type="button"
            onClick={() => { onChange(c); setShowCustom(false); }}
            title={c}
            style={{
              width: 24, height: 24, borderRadius: 6, background: c, cursor: 'pointer',
              border: active ? '2px solid #fff' : `1px solid ${T.border2}`,
              boxShadow: active ? `0 0 0 2px ${c}55` : 'none', padding: 0,
            }}
          />
        );
      })}

      {(showCustom || !isPreset) ? (
        <input
          type="color"
          value={value || '#4d8eff'}
          onChange={e => onChange(e.target.value)}
          // o seletor nativo do SO fecha sozinho ao escolher; aqui só sincroniza
          onBlur={() => setShowCustom(false)}
          style={{ width: 28, height: 24, borderRadius: 6, padding: 0, border: `1px solid ${T.border2}`, background: T.bg3, cursor: 'pointer' }}
          title="Cor personalizada"
        />
      ) : (
        <button
          type="button"
          onClick={() => setShowCustom(true)}
          title="Cor personalizada"
          style={{ width: 24, height: 24, borderRadius: 6, cursor: 'pointer', border: `1px dashed ${T.border3}`, background: T.bg3, color: T.txt3, fontSize: 14, lineHeight: 1, padding: 0 }}
        >+</button>
      )}
    </div>
  );
}
