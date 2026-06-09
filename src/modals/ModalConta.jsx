import React, { useState, useEffect } from 'react';
import { T, BANCOS } from '../constants.js';

const inp = { background: T.bg3, border: `1px solid ${T.border2}`, color: T.txt, padding: '9px 12px', borderRadius: T.radius2, fontFamily: "'DM Sans', sans-serif", fontSize: 13, outline: 'none', width: '100%', boxSizing: 'border-box' };
const fg = (label, children) => (
  <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
    <label style={{ fontSize:11, color:T.txt3, fontWeight:600, textTransform:'uppercase', letterSpacing:.5 }}>{label}</label>
    {children}
  </div>
);

export default function ModalConta({ open, onClose, onSave, editData }) {
  const [nome, setNome]   = useState('');
  const [banco, setBanco] = useState('outro');
  const [tipo, setTipo]   = useState('corrente');
  const [saldo, setSaldo] = useState('0');
  const [cor, setCor]     = useState('#4d8eff');

  useEffect(() => {
    if (editData) {
      setNome(editData.nome || ''); setBanco(editData.banco_slug || 'outro');
      setTipo(editData.tipo || 'corrente'); setSaldo(editData.saldo_inicial || '0'); setCor(editData.cor || '#4d8eff');
    } else {
      setNome(''); setBanco('outro'); setTipo('corrente'); setSaldo('0'); setCor('#4d8eff');
    }
  }, [open, editData]);

  if (!open) return null;

  const handleSave = () => {
    if (!nome.trim()) return;
    const b = BANCOS[banco] || BANCOS.outro;
    onSave({ nome: nome.trim(), banco: b.nome, banco_slug: banco, tipo, saldo_inicial: parseFloat(saldo) || 0, cor });
  };

  return (
    <div onClick={onClose} style={{ display:'flex', position:'fixed', inset:0, background:'rgba(0,0,0,.65)', zIndex:1000, backdropFilter:'blur(6px)', justifyContent:'center', alignItems:'center' }}>
      <div onClick={e => e.stopPropagation()} style={{ background:T.bg2, border:`1px solid ${T.border2}`, borderRadius:18, padding:26, width:420, maxWidth:'95vw' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <h3 style={{ fontFamily:"'Syne',sans-serif", fontSize:19, fontWeight:700, color:T.txt, margin:0 }}>{editData ? 'Editar Conta' : 'Nova Conta'}</h3>
          <button onClick={onClose} style={{ background:'transparent', border:'none', color:T.txt3, cursor:'pointer', fontSize:18 }}>✕</button>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
          <div style={{ gridColumn:'1/-1' }}>{fg('Nome', <input type="text" style={inp} value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Inter Pessoal" />)}</div>
          {fg('Banco', <select style={inp} value={banco} onChange={e => setBanco(e.target.value)}>{Object.entries(BANCOS).map(([k,v]) => <option key={k} value={k}>{v.nome}</option>)}</select>)}
          {fg('Tipo', <select style={inp} value={tipo} onChange={e => setTipo(e.target.value)}><option value="corrente">Conta Corrente</option><option value="poupanca">Poupança</option><option value="investimento">Investimento</option><option value="carteira">Carteira</option><option value="outro">Outro</option></select>)}
          {fg('Saldo Inicial (R$)', <input type="number" step="0.01" style={inp} value={saldo} onChange={e => setSaldo(e.target.value)} />)}
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
