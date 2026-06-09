import React, { useState } from 'react';
import { T } from '../constants.js';
import { fmt, fmtD } from '../lib/formatters.js';
import { matchTransf } from '../lib/dedup.js';
import { sb } from '../supabase.js';
import ModalVincular from '../modals/ModalVincular.jsx';

const SB_URL = import.meta.env.VITE_SB_URL || 'https://nxcpxnbkmdwumbdsmxpf.supabase.co';
const SB_KEY = import.meta.env.VITE_SB_KEY || '';

export default function Pluggy({ contas, cats, perfil, onToast, onDone }) {
  const [contaId, setContaId] = useState('');
  const [loading, setLoading] = useState(false);
  const [txsPluggy, setTxsPluggy] = useState([]);
  const [pendTransf, setPendTransf] = useState([]);
  const [vincIdx, setVincIdx] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);

  const inp = { background:T.bg3, border:`1px solid ${T.border2}`, color:T.txt, padding:'9px 12px', borderRadius:T.radius2, fontFamily:"'DM Sans',sans-serif", fontSize:13, outline:'none', width:'100%', boxSizing:'border-box' };

  const buscarPluggy = async () => {
    if (!contaId) { onToast('Selecione uma conta', 'error'); return; }
    const conta = contas.find(c => c.id === contaId);
    if (!conta?.pluggy_item_id || !conta?.pluggy_account_id) {
      onToast('Conta sem integração Pluggy configurada', 'error'); return;
    }
    setLoading(true);
    try {
      const resp = await fetch(`${SB_URL}/functions/v1/pluggy-sync`, {
        method:'POST',
        headers:{ Authorization:`Bearer ${SB_KEY}`, 'Content-Type':'application/json' },
        body: JSON.stringify({ item_id: conta.pluggy_item_id, account_id: conta.pluggy_account_id, conta_id: contaId, perfil }),
      });
      if (!resp.ok) throw new Error(await resp.text());
      const data = await resp.json();
      setTxsPluggy(data.novas || []);
      onToast(`${data.novas?.length || 0} novas transações encontradas`, 'success');
    } catch (err) {
      onToast('Erro ao sincronizar: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const iniciarVinculo = () => {
    const transf = txsPluggy.filter(t => t.tipo === 'transferencia');
    if (!transf.length) { onToast('Nenhuma transferência para vincular', 'error'); return; }
    setPendTransf(transf); setVincIdx(0); setModalOpen(true);
  };

  const confirmarVinculo = async (dados) => {
    const t = pendTransf[vincIdx];
    await sb('cf_transacoes', 'PATCH', { ...dados, status:'pago' }, `id=eq.${t.id}`);
    if (vincIdx + 1 < pendTransf.length) setVincIdx(v => v + 1);
    else { setModalOpen(false); onToast('Transferências vinculadas!', 'success'); onDone?.(); }
  };

  return (
    <div style={{ padding:'24px 28px', fontFamily:"'DM Sans',sans-serif", maxWidth:700 }}>
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6 }}>
        <h2 style={{ fontFamily:"'Syne',sans-serif", fontSize:24, fontWeight:700, color:T.txt, margin:0, letterSpacing:-.5 }}>Open Finance</h2>
        <span style={{ fontSize:10, background:T.blueGlow, color:T.blue, borderRadius:4, padding:'2px 8px', fontWeight:600, letterSpacing:.5 }}>BETA</span>
      </div>
      <p style={{ fontSize:12, color:T.txt3, marginBottom:24 }}>Sincronize transações direto da sua conta bancária via Pluggy.</p>

      <div style={{ background:T.bg2, border:`1px solid ${T.border}`, borderRadius:T.radius, padding:22, marginBottom:16 }}>
        <div style={{ marginBottom:14 }}>
          <label style={{ fontSize:11, color:T.txt3, fontWeight:600, textTransform:'uppercase', letterSpacing:.5, display:'block', marginBottom:5 }}>Conta</label>
          <select style={inp} value={contaId} onChange={e => setContaId(e.target.value)}>
            <option value="">Selecionar conta</option>
            {contas.map(c => <option key={c.id} value={c.id}>{c.nome}{c.pluggy_item_id ? ' ✓' : ''}</option>)}
          </select>
        </div>
        <button onClick={buscarPluggy} disabled={loading || !contaId} style={{ width:'100%', padding:'11px', background: loading||!contaId?T.bg3:T.blue, color: loading||!contaId?T.txt3:'#fff', border:'none', borderRadius:T.radius2, cursor: loading||!contaId?'not-allowed':'pointer', fontFamily:"'DM Sans',sans-serif", fontSize:14, fontWeight:600 }}>
          {loading ? 'Sincronizando...' : '⟳ Sincronizar'}
        </button>
      </div>

      {txsPluggy.length > 0 && (
        <div style={{ background:T.bg2, border:`1px solid ${T.border}`, borderRadius:T.radius, padding:18 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
            <div style={{ fontSize:12, fontWeight:600, color:T.txt3, textTransform:'uppercase', letterSpacing:.5 }}>Novas transações ({txsPluggy.length})</div>
            {txsPluggy.some(t => t.tipo === 'transferencia') && (
              <button onClick={iniciarVinculo} style={{ padding:'7px 14px', background:T.purple, color:'#fff', border:'none', borderRadius:T.radius2, cursor:'pointer', fontSize:12, fontWeight:600, fontFamily:"'DM Sans',sans-serif" }}>
                Vincular transferências
              </button>
            )}
          </div>
          {txsPluggy.map((t, i) => {
            const cor = t.tipo==='receita'?T.green:t.tipo==='transferencia'?T.blue:T.red;
            return (
              <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom:`1px solid ${T.border}`, fontSize:12 }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ color:T.txt, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{t.descricao}</div>
                  <div style={{ color:T.txt3, marginTop:1 }}>{fmtD(t.data)}</div>
                </div>
                <span style={{ fontFamily:"'JetBrains Mono',monospace", color:cor, paddingLeft:10 }}>
                  {t.tipo==='receita'?'+':'-'}{fmt(t.valor)}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {txsPluggy.length === 0 && !loading && (
        <div style={{ background:T.bg2, border:`1px solid ${T.border}`, borderRadius:T.radius, padding:'40px', textAlign:'center', color:T.txt3 }}>
          <div style={{ fontSize:32, marginBottom:10 }}>🔗</div>
          <div style={{ fontSize:13 }}>Selecione uma conta e sincronize para ver novas transações</div>
          <div style={{ fontSize:11, marginTop:6 }}>A conta precisa ter o Pluggy configurado</div>
        </div>
      )}

      <ModalVincular
        open={modalOpen}
        tx={pendTransf[vincIdx]}
        idx={vincIdx}
        total={pendTransf.length}
        contas={contas}
        cats={cats}
        onConfirm={confirmarVinculo}
        onSkip={() => vincIdx + 1 < pendTransf.length ? setVincIdx(v => v + 1) : (setModalOpen(false), onDone?.())}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
}
