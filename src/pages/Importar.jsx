import React, { useState, useRef } from 'react';
import { T, BANCOS, MESES } from '../constants.js';
import { fmt, fmtD } from '../lib/formatters.js';
import { parseOFX, parseCSV } from '../lib/parsers.js';
import { acharOperacaoCompleta, acharPernaSaida } from '../lib/dedup.js';
import { detectParcela, gerarParcelas, jaExisteParcela, uuid } from '../lib/parcelas.js';
import { sb } from '../supabase.js';
import ModalParcelas from '../modals/ModalParcelas.jsx';
import ModalVincular from '../modals/ModalVincular.jsx';
import ContaSelect from '../components/ContaSelect.jsx';

// Lê um arquivo como texto (Promise)
const lerArquivo = f => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = ev => resolve(ev.target.result);
  reader.onerror = reject;
  reader.readAsText(f, 'utf-8');
});

// "YYYY-MM" → "Mai/2026"
const rotuloMes = ym => {
  const [a, m] = ym.split('-');
  return `${MESES[Number(m) - 1]}/${a}`;
};

const inp = {
  background: T.bg3, border: `1px solid ${T.border2}`, color: T.txt,
  padding: '9px 12px', borderRadius: T.radius2, fontFamily: "'DM Sans',sans-serif",
  fontSize: 13, outline: 'none', width: '100%', boxSizing: 'border-box',
};

export default function Importar({ contas, cats, perfil, onToast, onCreateConta, onDone }) {
  const [contaId, setContaId]     = useState('');
  const [banco, setBanco]         = useState('inter');
  const [arquivos, setArquivos]   = useState([]);   // nomes dos arquivos carregados
  const [txsParsed, setTxsParsed] = useState([]);   // todas as txs (de todos os arquivos)
  const [preview, setPreview]     = useState([]);    // primeiras 10 para exibição
  const [importando, setImportando] = useState(false);
  const [resultado, setResultado]   = useState(null);
  const [modalParcelas, setModalParcelas] = useState(false);
  const [parcelasDetect, setParcelasDetect] = useState([]);
  // Entradas de transferência que não acharam a perna de saída correspondente:
  // o usuário identifica uma a uma no fim da importação.
  const [pendVinc, setPendVinc]   = useState([]);
  const [vincIdx, setVincIdx]     = useState(0);
  const [modalVinc, setModalVinc] = useState(false);
  const fileRef = useRef();

  // Meses distintos detectados a partir das datas das transações
  const mesesDetectados = [...new Set(txsParsed.map(t => (t.data || '').slice(0, 7)).filter(Boolean))].sort();

  const handleFile = async e => {
    const files = [...e.target.files]; if (!files.length) return;
    setResultado(null);
    try {
      let todas = [];
      const nomes = [];
      for (const f of files) {
        const txt = await lerArquivo(f);
        const result = f.name.toLowerCase().endsWith('.ofx') ? parseOFX(txt) : parseCSV(txt);
        const txs = Array.isArray(result) ? result : (result?.txs || []);
        nomes.push({ nome: f.name, qtd: txs.length });
        todas = todas.concat(txs);
      }
      if (!todas.length) { onToast('Nenhuma transação encontrada nos arquivos', 'error'); return; }
      // Ordena por data para visualização coerente entre meses
      todas.sort((a, b) => (a.data || '').localeCompare(b.data || ''));
      setArquivos(nomes);
      setTxsParsed(todas);
      setPreview(todas.slice(0, 10));
    } catch {
      onToast('Erro ao ler arquivo(s). Verifique o formato.', 'error');
    } finally {
      if (fileRef.current) fileRef.current.value = ''; // permite re-selecionar os mesmos arquivos
    }
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

      let salvos = 0, duplic = 0, parcelasNovas = 0, vinculadas = 0;

      // Mapa para agrupar parcelas confirmadas por descrição original
      const parcelasMap = {};
      for (const p of parcelasConfirmadas) {
        parcelasMap[p.tx.descricao] = p;
      }

      const txsParaSalvar = [];
      const patches   = [];   // vínculos em linhas que já estão no banco
      const pendentes = [];   // entradas sem perna de saída → ModalVincular

      for (const tx of txsParsed) {
        // --- DEDUP GERAL: mesma conta + data + valor + descrição ---
        const jaLancado = existentes.some(e =>
          e.conta_id === contaId &&
          String(e.data).slice(0, 10) === tx.data &&
          Math.abs(Number(e.valor) - Number(tx.valor)) < 0.01 &&
          (e.descricao || '').toLowerCase().slice(0, 20) === (tx.descricao || '').toLowerCase().slice(0, 20)
        );
        if (jaLancado) { duplic++; continue; }

        // --- TRANSFERÊNCIAS: uma operação, dois extratos, UMA linha ---
        if (tx.tipo === 'transferencia') {
          const sentido = tx.sentido || 'saida';

          // Esta perna já está representada por uma operação completa
          // (reimportação, ou o outro lado já foi vinculado antes)?
          const completa = acharOperacaoCompleta(existentes, tx, contaId, sentido);
          if (completa) { completa._consumida = true; duplic++; continue; }

          if (sentido === 'entrada') {
            // Procura a saída órfã correspondente (o lote em andamento também
            // está em `existentes`, ver push mais abaixo)
            const alvo = acharPernaSaida(existentes, tx, contaId);
            if (alvo) {
              // Marca no objeto em memória também, para que uma segunda entrada
              // de mesmo valor no lote não reivindique a mesma perna.
              alvo.conta_destino_id = contaId;
              if (alvo.id) patches.push({ id: alvo.id, conta_destino_id: contaId });
              vinculadas++;
              continue;
            }
            // Sem par: não dá para inserir como transferência (debitaria esta
            // conta em vez de creditar). Vai para identificação manual.
            pendentes.push(tx);
            continue;
          }

          // Saída: entra sem destino e fica aguardando a perna de entrada
          const saida = { ...tx, conta_id: contaId, conta_destino_id: null, perfil, status: 'pago' };
          txsParaSalvar.push(saida);
          existentes.push(saida);   // visível para as entradas seguintes do lote
          salvos++;
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

      // Mantém apenas colunas reais de cf_transacoes (remove _sel e outros auxiliares)
      const COLS = ['data', 'tipo', 'descricao', 'valor', 'conta_id', 'conta_destino_id', 'categoria_id', 'status', 'origem', 'observacao', 'perfil', 'parcela_atual', 'parcela_total', 'parcela_grupo', 'descricao_base', 'cartao_id'];
      const limpar = tx => {
        const o = {};
        for (const k of COLS) if (tx[k] !== undefined && tx[k] !== '') o[k] = tx[k];
        o.origem = 'importacao';
        return o;
      };

      // Salvar em lote (sequencial para não estourar rate limit)
      for (const tx of txsParaSalvar) {
        await sb('cf_transacoes', 'POST', limpar(tx));
      }

      // Vincular as pernas de entrada que acharam a saída correspondente:
      // completa a operação existente em vez de criar uma segunda linha.
      for (const p of patches) {
        await sb('cf_transacoes', 'PATCH', { conta_destino_id: p.conta_destino_id }, `id=eq.${p.id}`);
      }

      setResultado({ salvos, duplic, parcelasNovas, vinculadas, pendentes: pendentes.length });
      onToast(
        `${salvos} importados${parcelasNovas ? `, ${parcelasNovas} parcelas futuras criadas` : ''}${vinculadas ? `, ${vinculadas} transferências vinculadas` : ''}, ${duplic} duplicatas ignoradas`,
        'success'
      );

      // Entradas sem par: identificar uma a uma antes de encerrar
      if (pendentes.length) {
        setPendVinc(pendentes); setVincIdx(0); setModalVinc(true);
      } else {
        onDone?.();
      }
    } catch (err) {
      onToast('Erro na importação: ' + err.message, 'error');
    } finally {
      setImportando(false);
    }
  };

  // Encerra a fila de identificação manual
  const fecharVinculo = () => {
    setModalVinc(false);
    setResultado(r => (r ? { ...r, pendentes: 0 } : r));
    onDone?.();
  };

  const avancarVinculo = () => {
    if (vincIdx + 1 < pendVinc.length) setVincIdx(v => v + 1);
    else fecharVinculo();
  };

  // Entrada de transferência sem par: o usuário diz de onde veio (ou que não
  // era transferência). Só aqui a linha é criada — com origem e destino certos.
  const confirmarVinculo = async dados => {
    const tx = pendVinc[vincIdx];
    if (dados.tipo === 'transferencia' && !dados.conta_origem_id) {
      onToast('Selecione a conta de origem (ou marque como receita)', 'error');
      return;
    }
    try {
      const base = {
        data: tx.data, valor: tx.valor,
        descricao: dados.descricao || tx.descricao,
        categoria_id: dados.categoria_id || null,
        perfil, status: 'pago', origem: 'importacao',
      };
      await sb('cf_transacoes', 'POST', dados.tipo === 'transferencia'
        ? { ...base, tipo: 'transferencia', conta_id: dados.conta_origem_id, conta_destino_id: contaId }
        : { ...base, tipo: dados.tipo, conta_id: contaId, conta_destino_id: null });
      setResultado(r => (r ? { ...r, salvos: r.salvos + 1 } : r));
    } catch (err) {
      onToast('Erro ao vincular: ' + err.message, 'error');
      return;
    }
    avancarVinculo();
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
            <ContaSelect value={contaId} onChange={setContaId} contas={contas} onCreate={onCreateConta} allowEmpty emptyLabel="Selecionar conta" />
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
          style={{ border: `2px dashed ${T.border2}`, borderRadius: T.radius2, padding: '28px 20px', textAlign: 'center', cursor: 'pointer', marginBottom: 14, background: arquivos.length ? T.bg3 : 'transparent', transition: 'border-color .2s' }}
          onMouseEnter={e => e.currentTarget.style.borderColor = T.green}
          onMouseLeave={e => e.currentTarget.style.borderColor = T.border2}
        >
          <input ref={fileRef} type="file" accept=".csv,.ofx,.txt" multiple style={{ display: 'none' }} onChange={handleFile} />
          <div style={{ fontSize: 28, marginBottom: 8 }}>📂</div>
          {arquivos.length
            ? <><div style={{ fontSize: 13, color: T.txt }}>{arquivos.length === 1 ? arquivos[0].nome : `${arquivos.length} arquivos`}</div><div style={{ fontSize: 11, color: T.txt3, marginTop: 4 }}>{txsParsed.length} transações lidas{mesesDetectados.length ? ` · ${mesesDetectados.length} ${mesesDetectados.length === 1 ? 'mês' : 'meses'}` : ''}</div></>
            : <><div style={{ fontSize: 13, color: T.txt2 }}>Clique para selecionar (vários de uma vez) ou arraste aqui</div><div style={{ fontSize: 11, color: T.txt3, marginTop: 4 }}>Suporte: CSV (Inter, Nubank, Bradesco, Mercado Pago...) e OFX — pode subir Jan a Mai juntos</div></>
          }
        </div>

        {/* Meses detectados */}
        {mesesDetectados.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
            <span style={{ fontSize: 11, color: T.txt3, fontWeight: 600, textTransform: 'uppercase', letterSpacing: .5 }}>Meses detectados:</span>
            {mesesDetectados.map(ym => (
              <span key={ym} style={{ background: T.bg3, border: `1px solid ${T.border2}`, color: T.txt2, borderRadius: 99, padding: '2px 10px', fontSize: 11, fontWeight: 600 }}>
                {rotuloMes(ym)} <span style={{ color: T.txt3 }}>({txsParsed.filter(t => (t.data || '').slice(0, 7) === ym).length})</span>
              </span>
            ))}
          </div>
        )}

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
            {resultado.vinculadas > 0 && <div style={{ background: T.blueGlow, color: T.blue, borderRadius: T.radius2, padding: '8px 14px', fontSize: 13, fontWeight: 600 }}>⇄ {resultado.vinculadas} transferências vinculadas</div>}
            {resultado.pendentes > 0 && <div style={{ background: T.blueGlow, color: T.blue, borderRadius: T.radius2, padding: '8px 14px', fontSize: 13, fontWeight: 600 }}>⇄ {resultado.pendentes} a identificar</div>}
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

      {/* Entradas de transferência sem perna de saída correspondente */}
      <ModalVincular
        open={modalVinc}
        tx={pendVinc[vincIdx]}
        idx={vincIdx}
        total={pendVinc.length}
        contas={contas.filter(c => c.id !== contaId)}
        cats={cats}
        sentido="entrada"
        onConfirm={confirmarVinculo}
        onSkip={avancarVinculo}
        onClose={fecharVinculo}
      />
    </div>
  );
}
