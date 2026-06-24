import React, { useState } from 'react';
import { T } from '../constants.js';

const inp = { background: T.bg3, border: `1px solid ${T.border2}`, color: T.txt, padding: '9px 12px', borderRadius: T.radius2, fontFamily: "'DM Sans', sans-serif", fontSize: 13, outline: 'none', width: '100%', boxSizing: 'border-box' };

const NEW = '__new__';

/**
 * <select> de conta com opção "＋ Nova conta" que cria a conta direto na base
 * (via onCreate) e já seleciona a recém-criada — evitando inconsistências de
 * contas "soltas" que não existem no banco.
 *
 * Props:
 *   value     — id da conta selecionada
 *   onChange  — (id) => void
 *   contas    — lista de contas
 *   onCreate  — async (nome) => conta criada (com .id)
 *   allowEmpty/emptyLabel — adiciona uma opção vazia no topo
 */
export default function ContaSelect({ value, onChange, contas, onCreate, allowEmpty = false, emptyLabel = 'Nenhuma' }) {
  const [creating, setCreating] = useState(false);
  const [nome, setNome] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSelect = e => {
    if (e.target.value === NEW) { setCreating(true); return; }
    onChange(e.target.value);
  };

  const confirm = async () => {
    const n = nome.trim();
    if (!n || busy) return;
    setBusy(true);
    try {
      const nova = await onCreate(n);
      if (nova?.id) onChange(nova.id);
      setCreating(false); setNome('');
    } finally {
      setBusy(false);
    }
  };

  if (creating) {
    return (
      <div style={{ display: 'flex', gap: 6 }}>
        <input
          autoFocus
          style={inp}
          value={nome}
          onChange={e => setNome(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); confirm(); }
            if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); setCreating(false); setNome(''); }
          }}
          placeholder="Nome da nova conta"
        />
        <button type="button" onClick={confirm} disabled={busy || !nome.trim()} style={{ flexShrink: 0, padding: '0 12px', background: nome.trim() ? T.green : T.bg3, color: nome.trim() ? '#000' : T.txt3, border: 'none', borderRadius: T.radius2, cursor: nome.trim() ? 'pointer' : 'not-allowed', fontSize: 13, fontWeight: 600 }}>
          {busy ? '...' : 'OK'}
        </button>
        <button type="button" onClick={() => { setCreating(false); setNome(''); }} style={{ flexShrink: 0, padding: '0 10px', background: T.bg3, color: T.txt2, border: `1px solid ${T.border2}`, borderRadius: T.radius2, cursor: 'pointer', fontSize: 13 }}>✕</button>
      </div>
    );
  }

  return (
    <select style={inp} value={value || ''} onChange={handleSelect}>
      {allowEmpty && <option value="">{emptyLabel}</option>}
      {contas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
      <option value={NEW}>＋ Nova conta…</option>
    </select>
  );
}
