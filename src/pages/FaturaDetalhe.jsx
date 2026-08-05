import React, { useState, useEffect, useCallback } from 'react';
import { T, BANCOS, MESES } from '../constants.js';
import { fmt, fmtD } from '../lib/formatters.js';
import { useIsMobile } from '../lib/useMedia.js';
import { sb } from '../supabase.js';
import { cicloDaCompra, saldoDevedor, statusDaFatura } from '../lib/faturas.js';
import BankLogo from '../components/BankLogo.jsx';
import PeriodoSelect from '../components/PeriodoSelect.jsx';
import ContaSelect from '../components/ContaSelect.jsx';

const rotuloCiclo = ym => { const [a, m] = ym.split('-').map(Number); return `${MESES[m - 1]}/${a}`; };

const STATUS_INFO = {
  aberta:  { label: 'Em aberto',  cor: T.txt2 },
  fechada: { label: 'Fechada',    cor: T.gold },
  parcial: { label: 'Paga parcial', cor: T.gold },
  paga:    { label: 'Paga',       cor: T.green },
};

const inp = { background: T.bg3, border: `1px solid ${T.border2}`, color: T.txt, padding: '8px 10px', borderRadius: T.radius3, fontFamily: "'DM Sans',sans-serif", fontSize: 12, outline: 'none', boxSizing: 'border-box' };

/**
 * Fatura do cartão no período — lê as cf_faturas de verdade (criadas ao
 * importar a fatura do cartão), não recalcula do zero a cada render. Compra
 * antiga sem fatura_id (de antes desta função existir) ainda aparece,
 * reagrupada pelo ciclo calculado na hora.
 */
export default function FaturaDetalhe({ cartao, txs, contas, cats, periodo, setPeriodo, perfil, onVoltar, onEdit, onDelete, onEditCartao, onToast, loadTxs }) {
  const isMobile = useIsMobile();
  const [faturas, setFaturas] = useState(null);
  const [pagamentos, setPagamentos] = useState([]);
  const [pagandoId, setPagandoId] = useState(null);   // fatura sendo paga agora
  const [pagContaId, setPagContaId] = useState('');
  const [pagValor, setPagValor] = useState('');
  const [pagData, setPagData] = useState(() => new Date().toISOString().slice(0, 10));
  const [salvandoPag, setSalvandoPag] = useState(false);

  const carregar = useCallback(async () => {
    try {
      const fats = await sb(`cf_faturas?cartao_id=eq.${cartao.id}&order=mes_referencia.desc`) || [];
      setFaturas(fats);
      if (fats.length) {
        const ids = fats.map(f => f.id).join(',');
        setPagamentos(await sb(`cf_fatura_pagamentos?fatura_id=in.(${ids})&order=data.desc`) || []);
      } else setPagamentos([]);
    } catch { setFaturas([]); setPagamentos([]); }
  }, [cartao.id]);

  useEffect(() => { carregar(); }, [carregar]);

  const doCartao = txs
    .filter(t => t.tipo === 'cartao' && (t.cartao_id === cartao.id || t.conta_id === cartao.id))
    .sort((a, b) => String(b.data).localeCompare(String(a.data)));

  // Agrupa por fatura_id quando existe; sem ele (lançamento anterior a esta
  // função), reagrupa pelo ciclo calculado — não perde o item de vista.
  const grupos = {};
  for (const t of doCartao) {
    const chave = t.fatura_id || `ciclo:${cicloDaCompra(t.data, Number(cartao.dia_fechamento) || 0)}`;
    (grupos[chave] = grupos[chave] || []).push(t);
  }

  // Lista de faturas a mostrar: as reais do banco + ciclos "órfãos" (sem
  // cf_faturas ainda, típico de lançamento manual ou importação anterior).
  const linhas = [];
  for (const f of faturas || []) {
    linhas.push({ fatura: f, itens: grupos[f.id] || [] });
    delete grupos[f.id];
  }
  for (const chave of Object.keys(grupos)) {
    const mes = chave.replace('ciclo:', '');
    linhas.push({ fatura: { id: null, mes_referencia: mes, valor_total: grupos[chave].reduce((s, t) => s + Number(t.valor), 0), valor_pago: 0, status: 'aberta' }, itens: grupos[chave] });
  }
  linhas.sort((a, b) => b.fatura.mes_referencia.localeCompare(a.fatura.mes_referencia));

  const totalPeriodo = doCartao.reduce((s, t) => s + Number(t.valor), 0);
  const limite = Number(cartao.limite) || 0;
  const emAbertoTotal = (faturas || []).reduce((s, f) => s + saldoDevedor(f), 0);
  const catNome = id => { const c = cats.find(x => x.id === id); return c ? `${c.icone || ''} ${c.nome}` : ''; };

  const abrirPagamento = f => {
    setPagandoId(f.id);
    setPagContaId(cartao.conta_pagamento_id || contas[0]?.id || '');
    setPagValor(String(saldoDevedor(f) || ''));
    setPagData(new Date().toISOString().slice(0, 10));
  };

  const registrarPagamento = async fatura => {
    const valor = parseFloat(pagValor);
    if (!pagContaId || !valor || valor <= 0) { onToast?.('Selecione a conta e um valor válido', 'error'); return; }
    setSalvandoPag(true);
    try {
      const tx = await sb('cf_transacoes', 'POST', {
        conta_id: pagContaId, data: pagData, tipo: 'pagamento_fatura', descricao: `Pagamento fatura ${cartao.nome}`,
        valor, status: 'pago', origem: 'manual', perfil, fatura_id: fatura.id,
      });
      const row = Array.isArray(tx) ? tx[0] : tx;
      await sb('cf_fatura_pagamentos', 'POST', { fatura_id: fatura.id, transacao_id: row.id, conta_id: pagContaId, valor, data: pagData });
      onToast?.('Pagamento registrado', 'success');
      setPagandoId(null);
      await carregar();
      loadTxs?.();
    } catch (e) {
      onToast?.('Erro ao registrar pagamento: ' + (e.message || e), 'error');
    } finally {
      setSalvandoPag(false);
    }
  };

  return (
    <div style={{ padding: isMobile ? '16px 14px' : '24px 28px', fontFamily: "'DM Sans',sans-serif" }}>
      {/* Cabeçalho */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
        <button onClick={onVoltar} style={{ background: T.bg3, border: `1px solid ${T.border2}`, color: T.txt2, borderRadius: T.radius3, padding: '6px 12px', cursor: 'pointer', fontSize: 12, fontFamily: "'DM Sans',sans-serif" }}>← Cartões</button>
        <BankLogo slug={cartao.banco_slug} url={cartao.logo_url} size={32} />
        <div style={{ flex: 1, minWidth: 120 }}>
          <h2 style={{ fontFamily: "'Syne',sans-serif", fontSize: 20, fontWeight: 700, color: T.txt, margin: 0, letterSpacing: -.3 }}>{cartao.nome}</h2>
          <div style={{ fontSize: 11, color: T.txt3 }}>
            {cartao.bandeira} · {BANCOS[cartao.banco_slug]?.nome || cartao.banco_slug}
            {cartao.dia_fechamento ? ` · fecha dia ${cartao.dia_fechamento}` : ''}
            {cartao.dia_vencimento ? ` · vence dia ${cartao.dia_vencimento}` : ''}
          </div>
        </div>
        <PeriodoSelect value={periodo} onChange={setPeriodo} />
        <button onClick={() => onEditCartao(cartao)} style={{ background: T.bg3, border: `1px solid ${T.border2}`, color: T.txt2, width: 30, height: 30, borderRadius: T.radius3, cursor: 'pointer' }} title="Editar cartão">✎</button>
      </div>

      {!cartao.dia_fechamento && (
        <div style={{ background: T.bg3, border: `1px solid ${T.gold}40`, borderRadius: T.radius2, padding: '10px 12px', marginBottom: 14, fontSize: 12, color: T.txt2 }}>
          <span style={{ color: T.gold, fontWeight: 600 }}>Sem dia de fechamento cadastrado</span> — os gastos estão agrupados pelo mês da compra. Preencha o fechamento no cartão para ver a fatura pelo ciclo real.
        </div>
      )}

      {/* Totais */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 12, marginBottom: 16 }}>
        <div style={{ background: T.bg2, border: `1px solid ${T.border}`, borderRadius: T.radius, padding: '14px 16px' }}>
          <div style={{ fontSize: 10, color: T.txt3, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600, marginBottom: 6 }}>Total no período</div>
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 18, fontWeight: 500, color: T.purple }}>{fmt(totalPeriodo)}</div>
          <div style={{ fontSize: 11, color: T.txt3, marginTop: 4 }}>{doCartao.length} lançamentos</div>
        </div>
        <div style={{ background: T.bg2, border: `1px solid ${T.border}`, borderRadius: T.radius, padding: '14px 16px' }}>
          <div style={{ fontSize: 10, color: T.txt3, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600, marginBottom: 6 }}>Em aberto</div>
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 18, fontWeight: 500, color: emAbertoTotal > 0 ? T.red : T.green }}>{fmt(emAbertoTotal)}</div>
          <div style={{ fontSize: 11, color: T.txt3, marginTop: 4 }}>soma das faturas não quitadas</div>
        </div>
        {limite > 0 && (
          <div style={{ background: T.bg2, border: `1px solid ${T.border}`, borderRadius: T.radius, padding: '14px 16px' }}>
            <div style={{ fontSize: 10, color: T.txt3, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600, marginBottom: 6 }}>Limite</div>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 18, fontWeight: 500, color: T.txt }}>{fmt(limite)}</div>
            <div style={{ height: 4, background: T.bg3, borderRadius: 99, overflow: 'hidden', marginTop: 8 }}>
              <div style={{ height: '100%', width: `${Math.min(100, Math.round(emAbertoTotal / limite * 100))}%`, background: emAbertoTotal / limite > .8 ? T.red : T.purple, borderRadius: 99 }} />
            </div>
            <div style={{ fontSize: 11, color: T.txt3, marginTop: 4 }}>disponível: {fmt(Math.max(0, limite - emAbertoTotal))}</div>
          </div>
        )}
      </div>

      {/* Faturas do período */}
      {faturas === null
        ? <div style={{ padding: 20, textAlign: 'center', color: T.txt3, fontSize: 12 }}>Carregando…</div>
        : linhas.length === 0
        ? <div style={{ background: T.bg2, border: `1px solid ${T.border}`, borderRadius: T.radius, padding: 40, textAlign: 'center', color: T.txt3, fontSize: 13 }}>
            Nenhum gasto neste cartão no período selecionado
          </div>
        : linhas.map(({ fatura: f, itens }) => {
          const status = f.id ? (f.status || statusDaFatura(f)) : 'aberta';
          const info = STATUS_INFO[status] || STATUS_INFO.aberta;
          const devedor = saldoDevedor(f);
          const pagamentosDaFatura = f.id ? pagamentos.filter(p => p.fatura_id === f.id) : [];
          return (
            <div key={f.id || f.mes_referencia} style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 6, paddingLeft: 4, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: T.txt }}>Fatura de {rotuloCiclo(f.mes_referencia)}</span>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, color: T.purple }}>{fmt(Number(f.valor_total) || 0)}</span>
                <span style={{ fontSize: 10, fontWeight: 600, color: info.cor, background: `${info.cor}1a`, borderRadius: 4, padding: '1px 6px' }}>{info.label}</span>
                {f.data_fechamento && <span style={{ fontSize: 11, color: T.txt3 }}>fecha {fmtD(f.data_fechamento)}{f.data_vencimento ? ` · vence ${fmtD(f.data_vencimento)}` : ''}</span>}
                {f.id && devedor > 0.009 && (
                  <button onClick={() => abrirPagamento(f)} style={{ marginLeft: 'auto', background: T.bg3, border: `1px solid ${T.border2}`, color: T.txt2, borderRadius: T.radius3, padding: '4px 10px', cursor: 'pointer', fontSize: 11, fontFamily: "'DM Sans',sans-serif" }}>
                    Registrar pagamento
                  </button>
                )}
              </div>

              {/* Formulário de pagamento */}
              {pagandoId === f.id && (
                <div style={{ background: T.bg3, border: `1px solid ${T.border2}`, borderRadius: T.radius2, padding: 12, marginBottom: 8, display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                  <div style={{ minWidth: 150 }}>
                    <div style={{ fontSize: 10, color: T.txt3, marginBottom: 3 }}>Conta de origem</div>
                    <ContaSelect value={pagContaId} onChange={setPagContaId} contas={contas} allowEmpty emptyLabel="Selecionar conta" />
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: T.txt3, marginBottom: 3 }}>Valor</div>
                    <input type="number" step="0.01" style={{ ...inp, width: 110 }} value={pagValor} onChange={e => setPagValor(e.target.value)} />
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: T.txt3, marginBottom: 3 }}>Data</div>
                    <input type="date" style={inp} value={pagData} onChange={e => setPagData(e.target.value)} />
                  </div>
                  <button disabled={salvandoPag} onClick={() => registrarPagamento(f)} style={{ background: T.green, color: '#000', border: 'none', borderRadius: T.radius3, padding: '8px 14px', cursor: salvandoPag ? 'not-allowed' : 'pointer', fontSize: 12, fontWeight: 600, fontFamily: "'DM Sans',sans-serif" }}>
                    {salvandoPag ? 'Salvando…' : 'Confirmar'}
                  </button>
                  <button onClick={() => setPagandoId(null)} style={{ background: 'transparent', border: 'none', color: T.txt3, cursor: 'pointer', fontSize: 12 }}>Cancelar</button>
                  <div style={{ fontSize: 10, color: T.txt3, width: '100%' }}>Saldo devedor desta fatura: {fmt(devedor)} · aceita pagamento parcial e mais de um pagamento</div>
                </div>
              )}

              {/* Pagamentos já registrados */}
              {pagamentosDaFatura.length > 0 && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8, paddingLeft: 4 }}>
                  {pagamentosDaFatura.map(p => (
                    <span key={p.id} style={{ fontSize: 11, color: T.green, background: T.greenGlow, borderRadius: 4, padding: '2px 8px' }}>
                      ✓ {fmt(p.valor)} em {fmtD(p.data)} ({contas.find(c => c.id === p.conta_id)?.nome || 'conta removida'})
                    </span>
                  ))}
                </div>
              )}

              <div style={{ background: T.bg2, border: `1px solid ${T.border}`, borderRadius: T.radius, overflow: 'hidden' }}>
                {itens.map((t, i) => (
                  <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', borderBottom: i < itens.length - 1 ? `1px solid ${T.border}` : 'none' }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: T.purpleGlow, color: T.purple, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, flexShrink: 0 }}>▣</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, color: T.txt, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.descricao}</div>
                      <div style={{ fontSize: 11, color: T.txt3, marginTop: 1 }}>
                        {[fmtD(t.data), catNome(t.categoria_id), t.parcela_total ? `parcela ${t.parcela_atual}/${t.parcela_total}` : ''].filter(Boolean).join(' · ')}
                      </div>
                    </div>
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, color: T.purple, whiteSpace: 'nowrap' }}>{fmt(t.valor)}</span>
                    <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                      <button onClick={() => onEdit(t)} style={{ background: 'transparent', border: 'none', color: T.txt3, cursor: 'pointer', fontSize: 13, padding: '2px 4px' }} title="Editar">✎</button>
                      <button onClick={() => { if (window.confirm('Excluir este lançamento?')) onDelete(t.id); }} style={{ background: 'transparent', border: 'none', color: T.txt3, cursor: 'pointer', fontSize: 13, padding: '2px 4px' }} title="Excluir">✕</button>
                    </div>
                  </div>
                ))}
                {itens.length === 0 && (
                  <div style={{ padding: '14px', textAlign: 'center', color: T.txt3, fontSize: 12 }}>Sem compras lançadas neste ciclo ainda</div>
                )}
              </div>
            </div>
          );
        })
      }
    </div>
  );
}
