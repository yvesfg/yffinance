import React, { useState, useEffect } from 'react';
import { T, BANCOS } from '../constants.js';

const inp = { background: T.bg3, border: `1px solid ${T.border2}`, color: T.txt, padding: '9px 12px', borderRadius: T.radius2, fontFamily: "'DM Sans', sans-serif", fontSize: 13, outline: 'none', width: '100%', boxSizing: 'border-box' };
const fg = (label, children) => (
  <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
    <label style={{ fontSize:11, color:T.txt3, fontWeight:600, textTransform:'uppercase', letterSpacing:.5 }}>{label}</label>
    {children}
  </div>
);

export default function ModalCartao({ open, onClose, onSave, contas, editData }) {
  const [nome, setNome]     = useState('');
  const [banco, setBanco]   = useState('inter');
  const [band, setBand]     = useState('Visa');
  const [limite, setLimite] = useState('0');
  const [fech, setFech]     = useState('');
  const [venc, setVenc]     = useState('');
  const [contaPag, setContaPag] = useState('');
  const [cor, setCor]       = useState('#9b6dff');

  useEffect(() => {
    if (editData) {
      setNome(editData.nome||''); setBanco(editData.banco_slug||'inter'); setBand(editData.bandeira||'Visa');
      setLimite(editData.limite||'0'); setFech(editData.dia_fechamento||''); setVenc(editData.dia_vencimento||'');
      setContaPag(editData.conta_pagamento_id||''); setCor(editData.cor||'#9b6dff');
    } else {
      setNome(''); setBanco('inter'); setBand('Visa'); setLimite('0'); setFech(''); setVenc(''); setContaPag(''); setCor('#9b6dff');
    }
  }, [open, editData]);

  if (!open) return null;

  const handleSave = () => {
    if (!nome.trim()) return;
    onSave({ nome: nome.trim(), banco_slug: banco, bandeira: band, limite: parseFloat(limite)||0, dia_fechamento: parseInt(fech)||null, dia_vencimento: parseInt(venc)||null, conta_pagamento_id: contaPag||null, cor });
  };

  return (
    <div onClick={onClose} style={{ display:'flex', position:'fixed', inset:0, background:'rgba(0,0,0,.65)', zIndex:1000, backdropFilter:'blur(6px)', justifyContent:'center', alignItems:'center' }}>
      <div onClick={e => e.stopPropagation()} style={{ background:T.bg2, border:`1px solid ${T.border2}`, borderRadius:18, padding:26, width:420, maxWidth:'95vw' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <h3 style={{ fontFamily:"'Syne',sans-serif", fontSize:19, fontWeight:700, color:T.txt, margin:0 }}>{editData ? 'Editar Cartão' : 'Novo Cartão'}</h3>
          <button onClick={onClose} style={{ background:'transparent', border:'none', color:T.txt3, cursor:'pointer', fontSize:18 }}>✕</button>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
          <div style={{ gridColumn:'1/-1' }}>{fg('Nome', <input type="text" style={inp} value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Inter Gold" />)}</div>
          {fg('Banco', <select style={inp} value={banco} onChange={e => setBanco(e.target.value)}>{Object.entries(BANCOS).map(([k,v]) => <option key={k} value={k}>{v.nome}</option>)}</select>)}
          {fg('Bandeira', <select style={inp} value={band} onChange={e => setBand(e.target.value)}><option>Visa</option><option>Mastercard</option><option>Elo</option><option>Amex</option></select>)}
          {fg('Limite (R$)', <input type="number" step="0.01" style={inp} value={limite} onChange={e => setLimite(e.target.value)} />)}
          {fg('Dia Fechamento', <input type="number" min="1" max="28" style={inp} value={fech} onChange={e => setFech(e.target.value)} />)}
          {fg('Dia Vencimento', <input type="number" min="1" max="28" style={inp} value={venc} onChange={e => setVenc(e.target.value)} />)}
          <div style={{ gridColumn:'1/-1' }}>{fg('Conta para Pagamento', <select style={inp} value={contaPag} onChange={e => setContaPag(e.target.value)}><option value="">Nenhuma</option>{contas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}</select>)}</div>
          {fg('Cor', <input type="color" style={{...inp, height:40, padding:3}} value={cor} onChange={e => setCor(e.target.value)} />)}
        </div>
        <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:20, paddingTop:16, borderTop:`1px solid ${T.border}` }}>
          <button onClick={onClose} style={{ padding:'9px 18px', background:T.bg3, border:`1px solid ${T.border2}`, color:T.txt2, borderRadius:T.radius2, cursor:'pointer', fontFamily:"'DM Sans',sans-serif", fontSize:13 }}>Cancelar</button>
          <button onClick={handleSave} style={{ padding:'9px 18px', background:T.green, color:'#000', borderRadius:T.radius2, border:'none', cursor:'pointer', fontFamily:"'DM Sans',sans-serif", fontSize:13, fontWeight:600 }}>Salvar</button>
        </div>
      </div>
    </div>
  );
}
