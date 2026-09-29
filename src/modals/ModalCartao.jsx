import React, { useState, useEffect } from 'react';
import Modal from '../components/Modal.jsx';
import { T, BANCOS } from '../constants.js';
import { useModalKeys } from '../lib/useModalKeys.js';
import ColorField from '../components/ColorField.jsx';
import ContaSelect from '../components/ContaSelect.jsx';
import BankLogo from '../components/BankLogo.jsx';

const inp = { background: T.bg3, border: `1px solid ${T.border2}`, color: T.txt, padding: '9px 12px', borderRadius: T.radius2, fontFamily: "'Sora', sans-serif", fontSize: 13, outline: 'none', width: '100%', boxSizing: 'border-box' };
const fg = (label, children) => (
  <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
    <label style={{ fontSize:11, color:T.txt3, fontWeight:600, textTransform:'uppercase', letterSpacing:.5 }}>{label}</label>
    {children}
  </div>
);

export default function ModalCartao({ open, onClose, onSave, contas, onCreateConta, editData }) {
  const [nome, setNome]     = useState('');
  const [banco, setBanco]   = useState('inter');
  const [band, setBand]     = useState('Visa');
  const [limite, setLimite] = useState('0');
  const [fech, setFech]     = useState('');
  const [venc, setVenc]     = useState('');
  const [contaPag, setContaPag] = useState('');
  const [cor, setCor]       = useState('#9b6dff');
  const [logoUrl, setLogoUrl] = useState('');
  const [busy, setBusy]     = useState(false);

  useEffect(() => {
    if (editData) {
      setNome(editData.nome||''); setBanco(editData.banco_slug||'inter'); setBand(editData.bandeira||'Visa');
      setLimite(editData.limite||'0'); setFech(editData.dia_fechamento||''); setVenc(editData.dia_vencimento||'');
      setContaPag(editData.conta_pagamento_id||''); setCor(editData.cor||'#9b6dff'); setLogoUrl(editData.logo_url||'');
    } else {
      setNome(''); setBanco('inter'); setBand('Visa'); setLimite('0'); setFech(''); setVenc(''); setContaPag(''); setCor('#9b6dff'); setLogoUrl('');
    }
    setBusy(false);
  }, [open, editData]);

  const handleSave = async () => {
    if (!nome.trim() || busy) return;
    setBusy(true);
    try {
      await onSave({ nome: nome.trim(), banco_slug: banco, bandeira: band, limite: parseFloat(limite)||0, dia_fechamento: parseInt(fech)||null, dia_vencimento: parseInt(venc)||null, conta_pagamento_id: contaPag||null, cor, logo_url: logoUrl.trim() || null });
    } finally {
      setBusy(false);
    }
  };

  useModalKeys(open, { onClose, onEnter: handleSave });

  if (!open) return null;

  return (
    <Modal titulo={editData ? 'Editar Cartão' : 'Novo Cartão'} onClose={onClose} largura={420}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
          <div style={{ gridColumn:'1/-1' }}>{fg('Nome', <input type="text" style={inp} value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Inter Gold" autoFocus />)}</div>
          {fg('Banco', <select style={inp} value={banco} onChange={e => setBanco(e.target.value)}>{Object.entries(BANCOS).map(([k,v]) => <option key={k} value={k}>{v.nome}</option>)}</select>)}
          {fg('Bandeira', <select style={inp} value={band} onChange={e => setBand(e.target.value)}><option>Visa</option><option>Mastercard</option><option>Elo</option><option>Amex</option></select>)}
          {fg('Limite (R$)', <input type="number" step="0.01" style={inp} value={limite} onChange={e => setLimite(e.target.value)} />)}
          {fg('Dia Fechamento', <input type="number" min="1" max="28" style={inp} value={fech} onChange={e => setFech(e.target.value)} />)}
          {fg('Dia Vencimento', <input type="number" min="1" max="28" style={inp} value={venc} onChange={e => setVenc(e.target.value)} />)}
          <div style={{ gridColumn:'1/-1' }}>{fg('Conta para Pagamento', <ContaSelect value={contaPag} onChange={setContaPag} contas={contas} onCreate={onCreateConta} allowEmpty emptyLabel="Nenhuma" />)}</div>
          {fg('Cor', <ColorField value={cor} onChange={setCor} />)}
          <div style={{ gridColumn:'1/-1' }}>{fg('Site do banco ou link do logo (opcional)',
            <div style={{ display:'flex', gap:8, alignItems:'center' }}>
              <BankLogo slug={banco} url={logoUrl} size={36} />
              <input style={inp} value={logoUrl} onChange={e => setLogoUrl(e.target.value)} placeholder="mercadopago.com.br — ou o link direto da imagem" />
            </div>
          )}</div>
        </div>
        <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:20, paddingTop:16, borderTop:`1px solid ${T.border}` }}>
          <button onClick={onClose} style={{ padding:'9px 18px', background:T.bg3, border:`1px solid ${T.border2}`, color:T.txt2, borderRadius:T.radius2, cursor:'pointer', fontFamily:"'Sora',sans-serif", fontSize:13 }}>Cancelar</button>
          <button onClick={handleSave} disabled={busy || !nome.trim()} style={{ padding:'9px 18px', background: (busy || !nome.trim()) ? T.bg3 : T.gold, color: (busy || !nome.trim()) ? T.txt3 : '#000', borderRadius:T.radius2, border:'none', cursor: (busy || !nome.trim()) ? 'not-allowed' : 'pointer', fontFamily:"'Sora',sans-serif", fontSize:13, fontWeight:600 }}>{busy ? 'Salvando...' : 'Salvar'}</button>
        </div>
    </Modal>
  );
}
