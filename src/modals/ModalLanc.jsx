import React, { useState, useEffect } from 'react';
import { T } from '../constants.js';

const TIPOS = [
  { v: 'despesa',      l: '↓ Despesa',    c: T.red    },
  { v: 'receita',      l: '↑ Receita',     c: T.green  },
  { v: 'transferencia',l: '⇄ Transf.',     c: T.blue   },
  { v: 'cartao',       l: '▣ Cartão',      c: T.purple },
];

function fg(label, children) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label style={{ fontSize: 11, color: T.txt3, fontWeight: 600, textTransform: 'uppercase', letterSpacing: .5 }}>{label}</label>
      {children}
    </div>
  );
}

const inp = { background: T.bg3, border: `1px solid ${T.border2}`, color: T.txt, padding: '9px 12px', borderRadius: T.radius2, fontFamily: "'DM Sans', sans-serif", fontSize: 13, outline: 'none', width: '100%', boxSizing: 'border-box' };

export default function ModalLanc({ open, onClose, onSave, contas, cartoes, cats, editData }) {
  const [tipo, setTipo]   = useState('despesa');
  const [data, setData]   = useState('');
  const [valor, setValor] = useState('');
  const [desc, setDesc]   = useState('');
  const [contaId, setContaId]   = useState('');
  const [cartaoId, setCartaoId] = useState('');
  const [destId, setDestId]     = useState('');
  const [catId, setCatId]       = useState('');
  const [status, setStatus]     = useState('efetivado');
  const [obs, setObs]           = useState('');

  useEffect(() => {
    if (editData) {
      setTipo(editData.tipo || 'despesa');
      setData(editData.data || '');
      setValor(editData.valor || '');
      setDesc(editData.descricao || '');
      setContaId(editData.conta_id || '');
      setCartaoId(editData.cartao_id || '');
      setDestId(editData.conta_destino_id || '');
      setCatId(editData.categoria_id || '');
      setStatus(editData.status || 'efetivado');
      setObs(editData.observacao || '');
    } else {
      setTipo('despesa'); setData(new Date().toISOString().slice(0,10));
      setValor(''); setDesc(''); setContaId(contas[0]?.id || '');
      setCartaoId(cartoes[0]?.id || ''); setDestId(''); setCatId(''); setStatus('efetivado'); setObs('');
    }
  }, [open, editData]);

  if (!open) return null;

  const catsFilt = cats.filter(c => c.tipo === (tipo === 'cartao' ? 'despesa' : tipo === 'transferencia' ? 'transferencia' : tipo));

  const handleSave = () => {
    if (!data || !valor || !desc.trim()) return;
    onSave({
      tipo, data, valor: parseFloat(valor), descricao: desc.trim(),
      conta_id: contaId || null,
      cartao_id: tipo === 'cartao' ? cartaoId || null : null,
      conta_destino_id: tipo === 'transferencia' ? destId || null : null,
      categoria_id: catId || null, status, observacao: obs || null,
    });
  };

  return (
    <div onClick={onClose} style={{ display:'flex', position:'fixed', inset:0, background:'rgba(0,0,0,.65)', zIndex:1000, backdropFilter:'blur(6px)', justifyContent:'center', alignItems:'center' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: T.bg2, border: `1px solid ${T.border2}`, borderRadius: 18, padding: 26, width: 560, maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 20 }}>
          <h3 style={{ fontFamily:"'Syne',sans-serif", fontSize:19, fontWeight:700, color:T.txt, margin:0 }}>{editData ? 'Editar Lançamento' : 'Novo Lançamento'}</h3>
          <button onClick={onClose} style={{ background:'transparent', border:'none', color:T.txt3, cursor:'pointer', fontSize:18 }}>✕</button>
        </div>

        {/* Tipo toggle */}
        <div style={{ display:'flex', gap:3, background:T.bg3, padding:3, borderRadius:T.radius2, marginBottom:16 }}>
          {TIPOS.map(t => (
            <button key={t.v} onClick={() => setTipo(t.v)} style={{
              flex:1, padding:'7px 4px', border: tipo===t.v ? `1px solid ${t.c}40` : '1px solid transparent',
              background: tipo===t.v ? `${t.c}20` : 'transparent', color: tipo===t.v ? t.c : T.txt3,
              borderRadius:6, cursor:'pointer', fontSize:12, fontWeight:500, fontFamily:"'DM Sans',sans-serif",
              transition:'all .12s',
            }}>{t.l}</button>
          ))}
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
          {fg('Data', <input type="date" style={inp} value={data} onChange={e => setData(e.target.value)} />)}
          {fg('Valor (R$)', <input type="number" step="0.01" style={inp} value={valor} onChange={e => setValor(e.target.value)} placeholder="0,00" />)}
          {tipo !== 'cartao' && fg('Conta', <select style={inp} value={contaId} onChange={e => setContaId(e.target.value)}>{contas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}</select>)}
          {tipo === 'cartao' && fg('Cartão', <select style={inp} value={cartaoId} onChange={e => setCartaoId(e.target.value)}>{cartoes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}</select>)}
          {tipo === 'transferencia' && fg('Conta Destino', <select style={inp} value={destId} onChange={e => setDestId(e.target.value)}>{contas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}</select>)}
          {fg('Categoria', <select style={inp} value={catId} onChange={e => setCatId(e.target.value)}><option value="">Sem categoria</option>{catsFilt.map(c => <option key={c.id} value={c.id}>{c.icone} {c.nome}</option>)}</select>)}
          <div style={{ gridColumn:'1/-1' }}>{fg('Descrição', <input type="text" style={inp} value={desc} onChange={e => setDesc(e.target.value)} placeholder="Ex: Almoço, Salário..." />)}</div>
          {fg('Status', <select style={inp} value={status} onChange={e => setStatus(e.target.value)}><option value="efetivado">Efetivado</option><option value="pendente">Pendente</option></select>)}
          <div style={{ gridColumn:'1/-1' }}>{fg('Observação', <input type="text" style={inp} value={obs} onChange={e => setObs(e.target.value)} placeholder="Opcional" />)}</div>
        </div>

        <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:20, paddingTop:16, borderTop:`1px solid ${T.border}` }}>
          <button onClick={onClose} style={{ padding:'9px 18px', background:T.bg3, border:`1px solid ${T.border2}`, color:T.txt2, borderRadius:T.radius2, cursor:'pointer', fontFamily:"'DM Sans',sans-serif", fontSize:13 }}>Cancelar</button>
          <button onClick={handleSave} style={{ padding:'9px 18px', background:T.green, color:'#000', borderRadius:T.radius2, border:'none', cursor:'pointer', fontFamily:"'DM Sans',sans-serif", fontSize:13, fontWeight:600 }}>Salvar</button>
        </div>
      </div>
    </div>
  );
}
