import React, { useState, useRef } from 'react';
import { T, BANCOS } from '../constants.js';
import { fmt, fmtD } from '../lib/formatters.js';
import { parseOFX, parseCSV } from '../lib/parsers.js';
import { matchTransf } from '../lib/dedup.js';
import { sb } from '../supabase.js';

export default function Importar({ contas, cats, perfil, onToast, onDone }) {
  const [contaId, setContaId] = useState('');
  const [banco, setBanco]     = useState('inter');
  const [preview, setPreview] = useState([]);
  const [arquivo, setArquivo] = useState(null);
  const [importando, setImportando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const fileRef = useRef();

  const handleFile = e => {
    const f = e.target.files[0]; if (!f) return;
    setArquivo(f); setPreview([]); setResultado(null);
    const reader = new FileReader();
    reader.onload = ev => {
      const txt = ev.target.result;
      try {
        const txs = f.name.toLowerCase().endsWith('.ofx') ? parseOFX(txt) : parseCSV(txt, banco);
        setPreview(txs.slice(0, 10));
      } catch {
        onToast('Erro ao ler arquivo. Verifique o formato.', 'error');
      }
    };
    reader.readAsText(f, 'utf-8');
  };

  const handleImportar = async () => {
    if (!contaId || !arquivo) { onToast('Selecione a conta e o arquivo', 'error'); return; }
    setImportando(true);
    const reader = new FileReader();
    reader.onload = async ev => {
      try {
        const txt = ev.target.result;
        const txs = arquivo.name.toLowerCase().endsWith('.ofx') ? parseOFX(txt) : parseCSV(txt, banco);

        // Buscar transferências existentes para dedup
        const hoje = new Date().toISOString().slice(0, 10);
        const tresM = new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10);
        const existentes = await sb(`cf_transacoes?perfil=eq.${perfil}&tipo=eq.transferencia&data=gte.${tresM}&data=lte.${hoje}&select=data,valor,conta_id,conta_destino_id`);

        let salvos = 0, duplic = 0, pendentes = [];

        for (const t of txs) {
          // Dedup: mesma conta + mesma data + mesmo valor já importado
          const jaExiste = existentes.some?.(e => e.conta_id === contaId && String(e.data).slice(0,10) === t.data && Math.abs(Number(e.valor) - Number(t.valor)) < 0.01);
          const jaTransf = matchTransf(existentes || [], { ...t, conta_id: contaId });

          if (jaExiste || jaTransf) { duplic++; continue; }

          if (t.tipo === 'transferencia') {
            pendentes.push({ ...t, conta_id: contaId, perfil });
          } else {
            await sb('cf_transacoes', 'POST', { ...t, conta_id: contaId, perfil, status: 'pago' });
            salvos++;
          }
        }

        setResultado({ salvos, duplic, pendentes });
        if (pendentes.length === 0) {
          onToast(`${salvos} lançamentos importados, ${duplic} duplicatas ignoradas`, 'success');
          onDone?.();
        }
      } catch (err) {
        onToast('Erro na importação: ' + err.message, 'error');
      } finally {
        setImportando(false);
      }
    };
    reader.readAsText(arquivo, 'utf-8');
  };

  const inp = { background:T.bg3, border:`1px solid ${T.border2}`, color:T.txt, padding:'9px 12px', borderRadius:T.radius2, fontFamily:"'DM Sans',sans-serif", fontSize:13, outline:'none', width:'100%', boxSizing:'border-box' };

  return (
    <div style={{ padding:'24px 28px', fontFamily:"'DM Sans',sans-serif", maxWidth:700 }}>
      <h2 style={{ fontFamily:"'Syne',sans-serif", fontSize:24, fontWeight:700, color:T.txt, margin:'0 0 20px', letterSpacing:-.5 }}>Importar Extrato</h2>

      <div style={{ background:T.bg2, border:`1px solid ${T.border}`, borderRadius:T.radius, padding:22, marginBottom:16 }}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:14 }}>
          <div>
            <label style={{ fontSize:11, color:T.txt3, fontWeight:600, textTransform:'uppercase', letterSpacing:.5, display:'block', marginBottom:5 }}>Conta</label>
            <select style={inp} value={contaId} onChange={e => setContaId(e.target.value)}>
              <option value="">Selecionar conta</option>
              {contas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize:11, color:T.txt3, fontWeight:600, textTransform:'uppercase', letterSpacing:.5, display:'block', marginBottom:5 }}>Banco / Formato</label>
            <select style={inp} value={banco} onChange={e => setBanco(e.target.value)}>
              {Object.entries(BANCOS).filter(([k]) => k !== 'outro').map(([k, v]) => <option key={k} value={k}>{v.nome}</option>)}
            </select>
          </div>
        </div>

        <div
          onClick={() => fileRef.current?.click()}
          style={{ border:`2px dashed ${T.border2}`, borderRadius:T.radius2, padding:'28px 20px', textAlign:'center', cursor:'pointer', marginBottom:14, background: arquivo ? T.bg3 : 'transparent' }}
          onMouseEnter={e => e.currentTarget.style.borderColor = T.green}
          onMouseLeave={e => e.currentTarget.style.borderColor = T.border2}
        >
          <input ref={fileRef} type="file" accept=".csv,.ofx,.txt" style={{ display:'none' }} onChange={handleFile} />
          <div style={{ fontSize:28, marginBottom:8 }}>📂</div>
          {arquivo
            ? <div style={{ fontSize:13, color:T.txt }}>{arquivo.name}</div>
            : <>
                <div style={{ fontSize:13, color:T.txt2 }}>Clique para selecionar ou arraste aqui</div>
                <div style={{ fontSize:11, color:T.txt3, marginTop:4 }}>Suporte: CSV (Inter, Nubank, Bradesco...) e OFX</div>
              </>
          }
        </div>

        {preview.length > 0 && (
          <div style={{ marginBottom:14 }}>
            <div style={{ fontSize:11, color:T.txt3, fontWeight:600, textTransform:'uppercase', letterSpacing:.5, marginBottom:8 }}>Prévia ({preview.length} de {preview.length < 10 ? preview.length : '10+'} linhas)</div>
            <div style={{ background:T.bg3, borderRadius:T.radius2, overflow:'hidden', border:`1px solid ${T.border}` }}>
              {preview.map((t, i) => (
                <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'7px 12px', borderBottom: i < preview.length-1 ? `1px solid ${T.border}` : 'none', fontSize:12 }}>
                  <span style={{ color:T.txt3 }}>{fmtD(t.data)}</span>
                  <span style={{ flex:1, paddingLeft:10, color:T.txt, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{t.descricao}</span>
                  <span style={{ fontFamily:"'JetBrains Mono',monospace", color: t.tipo==='receita'?T.green:T.red, paddingLeft:10 }}>{t.tipo==='receita'?'+':'-'}{fmt(t.valor)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={handleImportar}
          disabled={!contaId || !arquivo || importando}
          style={{ width:'100%', padding:'11px', background: (!contaId||!arquivo||importando) ? T.bg3 : T.green, color: (!contaId||!arquivo||importando) ? T.txt3 : '#000', border:'none', borderRadius:T.radius2, cursor: (!contaId||!arquivo||importando) ? 'not-allowed' : 'pointer', fontFamily:"'DM Sans',sans-serif", fontSize:14, fontWeight:600 }}
        >
          {importando ? 'Importando...' : 'Importar'}
        </button>
      </div>

      {resultado && (
        <div style={{ background:T.bg2, border:`1px solid ${T.border}`, borderRadius:T.radius, padding:18 }}>
          <div style={{ fontSize:12, fontWeight:600, color:T.txt3, textTransform:'uppercase', letterSpacing:.5, marginBottom:10 }}>Resultado da importação</div>
          <div style={{ display:'flex', gap:14, marginBottom: resultado.pendentes?.length ? 14 : 0 }}>
            <div style={{ background:T.greenGlow, color:T.green, borderRadius:T.radius2, padding:'8px 14px', fontSize:13, fontWeight:600 }}>✓ {resultado.salvos} importados</div>
            {resultado.duplic > 0 && <div style={{ background:T.bg3, color:T.txt2, borderRadius:T.radius2, padding:'8px 14px', fontSize:13 }}>⊘ {resultado.duplic} duplicatas</div>}
            {resultado.pendentes?.length > 0 && <div style={{ background:T.purpleGlow, color:T.purple, borderRadius:T.radius2, padding:'8px 14px', fontSize:13 }}>{resultado.pendentes.length} transferências para identificar</div>}
          </div>
          {resultado.pendentes?.length > 0 && (
            <div style={{ fontSize:12, color:T.txt2 }}>
              As transferências identificadas precisam ser vinculadas. Acesse <strong>Open Finance → Identificar</strong> ou revise manualmente em Lançamentos.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
