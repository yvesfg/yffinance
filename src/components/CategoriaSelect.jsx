import React, { useState } from 'react';
import { T } from '../constants.js';
import Icon, { CategoriaIcon } from './Icon.jsx';

const inp = { background: T.bg3, border: `1px solid ${T.border2}`, color: T.txt, padding: '9px 12px', borderRadius: T.radius2, fontFamily: "'Sora', sans-serif", fontSize: 13, outline: 'none', width: '100%', boxSizing: 'border-box' };

const btn = {
  ...inp, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
  textAlign: 'left', color: T.txt,
};

const item = {
  display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: T.radius3,
  cursor: 'pointer', fontSize: 13, color: T.txt,
};

/**
 * Seletor de categoria com ícone SVG (mesmo padrão do controle-operacional) —
 * substitui o <select> nativo porque <option> do HTML não aceita SVG dentro,
 * só texto puro.
 *
 * Props:
 *   value    — id da categoria selecionada ('' = sem categoria)
 *   onChange — (id) => void
 *   cats     — lista JÁ FILTRADA pelo tipo do lançamento
 *   tipo     — tipo do lançamento ('despesa'|'receita'|'transferencia'), vai
 *              junto na criação para a categoria nova nascer com o tipo certo
 *   onCreate — async (nome, tipo) => categoria criada (com .id)
 */
export default function CategoriaSelect({ value, onChange, cats, tipo, onCreate }) {
  const [aberto, setAberto] = useState(false);
  const [creating, setCreating] = useState(false);
  const [nome, setNome] = useState('');
  const [busy, setBusy] = useState(false);

  const selecionada = cats.find(c => c.id === value);

  const escolher = id => { onChange(id); setAberto(false); };

  const confirmarNova = async () => {
    const n = nome.trim();
    if (!n || busy) return;
    setBusy(true);
    try {
      const nova = await onCreate(n, tipo);
      if (nova?.id) { onChange(nova.id); setAberto(false); }
      setCreating(false); setNome('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      <button type="button" onClick={() => setAberto(a => !a)} style={btn}>
        {selecionada
          ? <><CategoriaIcon emoji={selecionada.icone} s={15} c={T.txt2} /><span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selecionada.nome}</span></>
          : <span style={{ flex: 1, color: T.txt3 }}>Sem categoria</span>}
        <span style={{ color: T.txt3, fontSize: 9 }}>▾</span>
      </button>

      {aberto && (
        <>
          <div onClick={() => { setAberto(false); setCreating(false); }} style={{ position: 'fixed', inset: 0, zIndex: 90 }} />
          <div style={{
            position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, zIndex: 91,
            background: T.bg2, border: `1px solid ${T.border2}`, borderRadius: T.radius2,
            padding: 6, boxShadow: '0 12px 32px rgba(0,0,0,.45)', maxHeight: 280, overflowY: 'auto',
          }}>
            <div
              style={item}
              onClick={() => escolher('')}
              onMouseEnter={e => e.currentTarget.style.background = T.bg3}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <span style={{ width: 15, textAlign: 'center', color: T.txt3 }}>—</span>
              <span style={{ color: T.txt3 }}>Sem categoria</span>
            </div>

            {cats.map(c => (
              <div
                key={c.id}
                style={{ ...item, background: c.id === value ? T.bg3 : 'transparent' }}
                onClick={() => escolher(c.id)}
                onMouseEnter={e => e.currentTarget.style.background = T.bg3}
                onMouseLeave={e => e.currentTarget.style.background = c.id === value ? T.bg3 : 'transparent'}
              >
                <CategoriaIcon emoji={c.icone} s={15} c={T.txt2} />
                <span>{c.nome}</span>
              </div>
            ))}

            <div style={{ borderTop: `1px solid ${T.border}`, marginTop: 4, paddingTop: 4 }}>
              {creating ? (
                <div style={{ display: 'flex', gap: 6, padding: '4px 4px' }}>
                  <input
                    autoFocus
                    style={{ ...inp, padding: '6px 8px', fontSize: 12 }}
                    value={nome}
                    onChange={e => setNome(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); confirmarNova(); }
                      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); setCreating(false); setNome(''); }
                    }}
                    placeholder="Nome da nova categoria"
                  />
                  <button type="button" onClick={confirmarNova} disabled={busy || !nome.trim()} style={{ flexShrink: 0, padding: '0 10px', background: nome.trim() ? T.green : T.bg3, color: nome.trim() ? '#000' : T.txt3, border: 'none', borderRadius: T.radius3, cursor: nome.trim() ? 'pointer' : 'not-allowed', fontSize: 12, fontWeight: 600 }}>
                    {busy ? '...' : <Icon n="check" s={13} />}
                  </button>
                </div>
              ) : (
                <div
                  style={item}
                  onClick={() => setCreating(true)}
                  onMouseEnter={e => e.currentTarget.style.background = T.bg3}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <Icon n="plus" s={15} c={T.green} />
                  <span style={{ color: T.green, fontWeight: 600 }}>Nova categoria…</span>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
