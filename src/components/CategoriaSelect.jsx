import React, { useState } from 'react';
import { T } from '../constants.js';

const inp = { background: T.bg3, border: `1px solid ${T.border2}`, color: T.txt, padding: '9px 12px', borderRadius: T.radius2, fontFamily: "'DM Sans', sans-serif", fontSize: 13, outline: 'none', width: '100%', boxSizing: 'border-box' };

const NEW = '__new__';

/**
 * <select> de categoria com opção "＋ Nova categoria" — mesmo padrão do
 * ContaSelect. Existe porque a lista podia legitimamente vir vazia (categoria
 * é opcional, e o usuário pode não ter nenhuma do tipo certo ainda) e não
 * havia como sair dali sem trocar de tela.
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
      const nova = await onCreate(n, tipo);
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
          placeholder="Nome da nova categoria"
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
      <option value="">Sem categoria</option>
      {cats.map(c => <option key={c.id} value={c.id}>{c.icone} {c.nome}</option>)}
      <option value={NEW}>＋ Nova categoria…</option>
    </select>
  );
}
