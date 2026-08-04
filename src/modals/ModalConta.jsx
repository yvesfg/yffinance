import React, { useState, useEffect } from 'react';
import { T, BANCOS } from '../constants.js';
import { useModalKeys } from '../lib/useModalKeys.js';
import ColorField from '../components/ColorField.jsx';
import BankLogo from '../components/BankLogo.jsx';

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
  const [logoUrl, setLogoUrl] = useState('');
  const [busy, setBusy]   = useState(false);

  useEffect(() => {
    if (editData) {
      setNome(editData.nome || ''); setBanco(editData.banco_slug || 'outro');
      setTipo(editData.tipo || 'corrente'); setSaldo(editData.saldo_inicial || '0');
      setCor(editData.cor || '#4d8eff'); setLogoUrl(editData.logo_url || '');
    } else {
      setNome(''); setBanco('outro'); setTipo('corrente'); setSaldo('0'); setCor('#4d8eff'); setLogoUrl('');
    }
    setBusy(false);
  }, [open, editData]);

  const handleSave = async () => {
    if (!nome.trim() || busy) return;
    const b = BANCOS[banco] || BANCOS.outro;
    setBusy(true);
    try {
      await onSave({ nome: nome.trim(), banco: b.nome, banco_slug: banco, tipo, saldo_inicial: parseFloat(saldo) || 0, cor, logo_url: logoUrl.trim() || null });
    } finally {
      setBusy(false);
    }
  };

  useModalKeys(open, { onClose, onEnter: handleSave });

  if (!open) return null;

  return (
    <div onClick={onClose} style={{ display:'flex', position:'fixed', inset:0, background:'rgba(0,0,0,.65)', zIndex:1000, backdropFilter:'blur(6px)', justifyContent:'center', alignItems:'center' }}>
      <div onClick={e => e.stopPropagation()} style={{ background:T.bg2, border:`1px solid ${T.border2}`, borderRadius:18, padding:26, width:420, maxWidth:'95vw', maxHeight:'90vh', overflowY:'auto' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <h3 style={{ fontFamily:"'Syne',sans-serif", fontSize:19, fontWeight:700, color:T.txt, margin:0 }}>{editData ? 'Editar Conta' : 'Nova Conta'}</h3>
          <button onClick={onClose} style={{ background:'transparent', border:'none', color:T.txt3, cursor:'pointer', fontSize:18 }}>✕</button>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
          <div style={{ gridColumn:'1/-1' }}>{fg('Nome', <input type="text" style={inp} value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Inter Pessoal" autoFocus />)}</div>
          {fg('Banco', <select style={inp} value={banco} onChange={e => setBanco(e.target.value)}>{Object.entries(BANCOS).map(([k,v]) => <option key={k} value={k}>{v.nome}</option>)}</select>)}
          {fg('Tipo', <select style={inp} value={tipo} onChange={e => setTipo(e.target.value)}><option value="corrente">Conta Corrente</option><option value="poupanca">Poupança</option><option value="investimento">Investimento</option><option value="carteira">Carteira</option><option value="outro">Outro</option></select>)}
          {fg('Saldo Inicial (R$)', <input type="number" step="0.01" style={inp} value={saldo} onChange={e => setSaldo(e.target.value)} />)}
          {fg('Cor', <ColorField value={cor} onChange={setCor} />)}
          <div style={{ gridColumn:'1/-1' }}>{fg('Site do banco ou link do logo (opcional)',
            <div style={{ display:'flex', gap:8, alignItems:'center' }}>
              <BankLogo slug={banco} url={logoUrl} size={36} />
              <input style={inp} value={logoUrl} onChange={e => setLogoUrl(e.target.value)} placeholder="mercadopago.com.br — ou o link direto da imagem" />
            </div>
          )}</div>
        </div>
        <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:20, paddingTop:16, borderTop:`1px solid ${T.border}` }}>
          <button onClick={onClose} style={{ padding:'9px 18px', background:T.bg3, border:`1px solid ${T.border2}`, color:T.txt2, borderRadius:T.radius2, cursor:'pointer', fontFamily:"'DM Sans',sans-serif", fontSize:13 }}>Cancelar</button>
          <button onClick={handleSave} disabled={busy || !nome.trim()} style={{ padding:'9px 18px', background: (busy || !nome.trim()) ? T.bg3 : T.green, color: (busy || !nome.trim()) ? T.txt3 : '#000', borderRadius:T.radius2, border:'none', cursor: (busy || !nome.trim()) ? 'not-allowed' : 'pointer', fontFamily:"'DM Sans',sans-serif", fontSize:13, fontWeight:600 }}>{busy ? 'Salvando...' : 'Salvar'}</button>
        </div>
      </div>
    </div>
  );
}
