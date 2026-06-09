import React, { useState, useRef } from 'react';
import { T, BANCOS } from '../constants.js';
import { fmt, fmtD } from '../lib/formatters.js';
import { parseOFX, parseCSV } from '../lib/parsers.js';
import { matchTransf } from '../lib/dedup.js';
import { detectParcela, gerarParcelas, jaExisteParcela, uuid } from '../lib/parcelas.js';
import { sb } from '../supabase.js';
import ModalParcelas from '../modals/ModalParcelas.jsx';

const inp = {
  background: T.bg3, border: `1px solid ${T.border2}`, color: T.txt,
  padding: '9px 12px', borderRadius: T.radius2, fontFamily: "'DM Sans',sans-serif",
  fontSize: 13, outline: 'none', width: '100%', boxSizing: 'border-box',
};

export default function Importar({ contas, cats, perfil, onToast, onDone }) {
  const [contaId, setContaId]     = useState('');
  const [banco, setBanco]         = useState('inter');
  const [arquivo, setArquivo]     = useState(null);
  const [txsParsed, setTxsParsed] = useState([]);   // todas as txs do arquivo
  const [preview, setPreview]     = useState([]);    // primeiras 10 para exibição
  const [importando, setImportando] = useState(false);
  const [resultado, setResultado]   = useState(null);
  const [modalParcelas, setModalParcelas] = useState(false);
  const [parcelasDetect, setParcelasDetect] = useState([]);
  const fileRef = useRef();

  const handleFile = e => {
    const f = e.target.files[0]; if (!f) return;
    setArquivo(f); setPreview([]); setResultado(null); setTxsParsed([]);
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const txt = ev.target.result;
        const result = f.name.toLowerCase().endsWith('.ofx') ? parseOFX(txt) : parseCSV(txt);
        const txs = Array.isArray(result) ? result : (result?.txs || []);
        if (!txs.length) { onToast('Nenhuma transação encontrada no arquivo', 'error'); return; }
        setTxsParsed(txs);
        setPreview(txs.slice(0, 10));
      } catch {
        onToast('Erro ao ler arquivo. Verifique o formato.', 'error');
      }
    };
    reader.readAsText(f, 'utf-8');
  };

  // Etapa 1: usuário clica Importar → detectar parcelas e mostrar modal se houver
  const handleImportar = async () => {
    if (!contaId || !txsParsed.length) { onToast('Selecione a conta e carregue um arquivo', 'error'); return; }

    // Detectar parcelas no lote importado
    const detectadas = [];
    for (const tx of txsParsed) {
      if (tx.tipo === 'receita' || tx.tipo === 'transferencia') continue;
      const p = detectParcela(tx.descricao);
      if (p) detectadas.push({ tx, base: p.base, atual: p.atual, total: p.total });
    }

    if (detectadas.length > 0) {
      setParcelasDetect(detectadas);
      setModalParcelas(true);
    } else {
      await executarImportacao([]);
    }
  };

  // Etapa 2: chamado após confirmação do modal (ou sem parcelas)
  const handleConfirmarParcelas = async (parcelasConfirmadas) => {
    setModalParcelas(false);
    await executarImportacao(parcelasConfirmadas);
  };

  // Etapa 3: importação efetiva com dedup completo
  const executarImportacao = async (parcelasConfirmadas) => {
    setImportando(true);
    try {
      // Buscar transações existentes para dedup (últimos 12 meses + futuros)
      const anoAtras  = new Date(Date.now() - 365 * 86400000).toISOString().slice(0, 10);
      const doisAnos  = new Date(Date.now() + 730 * 86400000).toISOString().slice(0, 10);
      const existentes = await sb(
        `cf_transacoes?perfil=eq.${perfil}&data=gte.${anoAtras}&data=lte.${doisAnos}&select=id,data,valor,tipo,descricao,descricao_base,conta_id,conta_destino_id,parcela_atual,parcela_total,parcela_grupo`
      ) || [];

      let salvos = 0, duplic = 0, parcelasNovas = 0;

      // Mapa para agrupar parcelas confirmadas por descrição original
      const parcelasMap = {};
      for (const p of parcelasConfirmadas) {
        parcelasMap[p.tx.descricao] = p;
      }

      const txsParaSalvar = [];

      for (const tx of txsParsed) {
        // --- DEDUP GERAL: mesma conta + data + valor + descrição ---
        const jaLancado = existentes.some(e =>
          e.conta_id === contaId &&
          String(e.data).slice(0, 10) === tx.data &&
          Math.abs(Number(e.valor) - Number(tx.valor)) < 0.01 &&
          (e.descricao || '').toLowerCase().slice(0, 20) === (tx.descricao || '').toLowerCase().slice(0, 20)
        );
        if (jaLancado) { duplic++; continue; }

        // --- TRANSFERÊNCIAS ---
        if (tx.tipo === 'transferencia') {
          const jaTransf = matchTransf(existentes, { ...tx, conta_id: contaId });
          if (jaTransf) { duplic++; continue; }
          txsParaSalvar.push({ ...tx, conta_id: contaId, perfil, status: 'pago' });
          continue;
        }

        // --- PARCELAS ---
        const pInfo = parcelasMap[tx.descricao];
        if (pInfo) {
          const { base, atual, total } = pInfo;
          const grupoId = uuid();

          const futuras = gerarParcelas(
            { ...tx, descricao_base: base, conta_id: contaId, perfil, status: 'pago', tipo: 'despesa' },
            atual,
            total,
            grupoId
          );

          for (const parc of futuras) {
            // Dedup específico de parcela: mesmo grupo base + valor + parcela_atual
            if (jaExisteParcela(existentes, base, parc.valor, parc.parcela_atual)) {
              duplic++; continue;
            }
            txsParaSalvar.push(parc);
            if (parc.parcela_atual === atual) salvos++;
            else parcelasNovas++;
          }
          continue;
        }

        // --- DESPESA/RECEITA NORMAL ---
        txsParaSalvar.push({ ...tx, conta_id: contaId, perfil, status: 'pago' });
        salvos++;
      }

      // Salvar em lote (sequencial para não estourar rate limit)
      for (const tx of txsParaSalvar) {
        await sb('cf_transacoes', 'POST', tx);
      }

      setResultado({ salvos, duplic, parcelasNovas });
      onToast(
        `${salvos} importados${parcelasNovas ? `, ${parcelasNovas} parcelas futuras criadas` : ''}, ${duplic} duplicatas ignoradas`,
        'success'
      );
      onDone?.();
    } catch (err) {
      onToast('Erro na importação: ' + err.message, 'error');
    } finally {
      setImportando(false);
    }
  };

  return (
    <div style={{ padding: '24px 28px', fontFamily: "'DM Sans',sans-serif", maxWidth: 700 }}>
      <h2 style={{ fontFamily: "'Syne',sans-serif", fontSize: 24, fontWeight: 700, color: T.txt, margin: '0 0 20px', letterSpacing: -.5 }}>
        Importar Extrato
      </h2>

      <div style={{ background: T.bg2, border: `1px solid ${T.border}`, borderRadius: T.radius, padding: 22, marginBottom: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
          <div>
            <label style={{ fontSize: 11, color: T.txt3, fontWeight: 600, textTransform: 'uppercase', letterSpacing: .5, display: 'block', marginBottom: 5 }}>Conta</label>
            <select style={inp} value={contaId} onChange={e => setContaId(e.target.value)}>
              <option value="">Selecionar conta</option>
              {contas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11, color: T.txt3, fontWeight: 600, textTransform: 'uppercase', letterSpacing: .5, display: 'block', marginBottom: 5 }}>Banco / Formato</label>
            <select style={inp} value={banco} onChange={e => setBanco(e.target.value)}>
              {Object.entries(BANCOS).filter(([k]) => k !== 'outro').map(([k, v]) => <option key={k} value={k}>{v.nome}</option>)}
            </select>
          </div>
        </div>

        {/* Drop zone */}
        <div
          onClick={() => fileRef.current?.click()}
          style={{ border: `2px dashed ${T.border2}`, borderRadius: T.radius2, padding: '28px 20px', textAlign: 'center', cursor: 'pointer', marginBottom: 14, background: arquivo ? T.bg3 : 'transparent', transition: 'border-color .2s' }}
          onMouseEnter={e => e.currentTarget.style.borderColor = T.green}
          onMouseLeave={e => e.currentTarget.style.borderColor = T.border2}
        >
          <input ref={fileRef} type="file" accept=".csv,.ofx,.txt" style={{ display: 'none' }} onChange={handleFile} />
          <div style={{ fontSize: 28, marginBottom: 8 }}>📂</div>
          {arquivo
            ? <><div style={{ fontSize: 13, color: T.txt }}>{arquivo.name}</div><div style={{ fontSize: 11, color: T.txt3, marginTop: 4 }}>{txsParsed.length} transações lidas</div></>
            : <><div style={{ fontSize: 13, color: T.txt2 }}>Clique para selecionar ou arraste aqui</div><div style={{ fontSize: 11, color: T.txt3, marginTop: 4 }}>Suporte: CSV (Inter, Nubank, Bradesco, Mercado Pago...) e OFX</div></>
          }
        </div>

        {/* Prévia */}
        {preview.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, color: T.txt3, fontWeight: 600, textTransform: 'uppercase', letterSpacing: .5, marginBottom: 8 }}>
              Prévia (primeiras {preview.length} de {txsParsed.length})
            </div>
            <div style={{ background: T.bg3, borderRadius: T.radius2, overflow: 'hidden', border: `1px solid ${T.border}` }}>
              {preview.map((t, i) => {
                const parc = (t.tipo !== 'receita' && t.tipo !== 'transferencia') ? detectParcela(t.descricao) : null;
                return (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 12px', borderBottom: i < preview.length - 1 ? `1px solid ${T.border}` : 'none', fontSize: 12, gap: 8 }}>
                    <span style={{ color: T.txt3, flexShrink: 0 }}>{fmtD(t.data)}</span>
                    <span style={{ flex: 1, color: T.txt, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.descricao}</span>
                    {parc && (
                      <span style={{ background: T.purpleGlow, color: T.purple, borderRadius: 4, padding: '1px 6px', fontSize: 10, fontWeight: 600, flexShrink: 0 }}>
                        {parc.atual}/{parc.total}
                      </span>
                    )}
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", color: t.tipo === 'receita' ? T.green : T.red, flexShrink: 0 }}>
                      {t.tipo === 'receita' ? '+' : '-'}{fmt(t.valor)}
                    </span>
                  </div>
                );
              })}
            </div>
            {txsParsed.filter(t => t.tipo !== 'receita' && t.tipo !== 'transferencia' && detectParcela(t.descricao)).length > 0 && (
              <div style={{ marginTop: 8, fontSize: 11, color: T.purple, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ background: T.purpleGlow, borderRadius: 4, padding: '1px 6px', fontWeight: 600 }}>
                  {txsParsed.filter(t => t.tipo !== 'receita' && t.tipo !== 'transferencia' && detectParcela(t.descricao)).length} parcelas detectadas
                </span>
                — serão confirmadas antes de importar
              </div>
            )}
          </div>
        )}

        <button
          onClick={handleImportar}
          disabled={!contaId || !txsParsed.length || importando}
          style={{ width: '100%', padding: '11px', background: (!contaId || !txsParsed.length || importando) ? T.bg3 : T.green, color: (!contaId || !txsParsed.length || importando) ? T.txt3 : '#000', border: 'none', borderRadius: T.radius2, cursor: (!contaId || !txsParsed.length || importando) ? 'not-allowed' : 'pointer', fontFamily: "'DM Sans',sans-serif", fontSize: 14, fontWeight: 600 }}
        >
          {importando ? 'Importando...' : 'Importar'}
        </button>
      </div>

      {/* Resultado */}
      {resultado && (
        <div style={{ background: T.bg2, border: `1px solid ${T.border}`, borderRadius: T.radius, padding: 18 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: T.txt3, textTransform: 'uppercase', letterSpacing: .5, marginBottom: 10 }}>Resultado</div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ background: T.greenGlow, color: T.green, borderRadius: T.radius2, padding: '8px 14px', fontSize: 13, fontWeight: 600 }}>✓ {resultado.salvos} importados</div>
            {resultado.parcelasNovas > 0 && <div style={{ background: T.purpleGlow, color: T.purple, borderRadius: T.radius2, padding: '8px 14px', fontSize: 13, fontWeight: 600 }}>📅 {resultado.parcelasNovas} parcelas futuras criadas</div>}
            {resultado.duplic > 0 && <div style={{ background: T.bg3, color: T.txt2, borderRadius: T.radius2, padding: '8px 14px', fontSize: 13 }}>⊘ {resultado.duplic} duplicatas ignoradas</div>}
          </div>
        </div>
      )}

      {/* Modal de confirmação de parcelas */}
      <ModalParcelas
        open={modalParcelas}
        parcelas={parcelasDetect}
        onConfirm={handleConfirmarParcelas}
        onClose={() => setModalParcelas(false)}
      />
    </div>
  );
}
