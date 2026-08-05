import React from 'react';
import { T, BANCOS, MESES } from '../constants.js';
import { fmt, fmtD } from '../lib/formatters.js';
import { useIsMobile } from '../lib/useMedia.js';
import BankLogo from '../components/BankLogo.jsx';
import PeriodoSelect from '../components/PeriodoSelect.jsx';

const pad = n => String(n).padStart(2, '0');
const ultimoDia = (a, m) => new Date(a, m, 0).getDate();

/**
 * Em qual fatura a compra cai. Comprou depois do fechamento, entra na fatura
 * do mês seguinte — é o que faz a fatura de julho não ser "tudo que gastei em
 * julho". Sem `dia_fechamento` cadastrado, cai no mês da compra mesmo.
 */
function cicloDaCompra(data, diaFechamento) {
  const [a, m, d] = String(data).slice(0, 10).split('-').map(Number);
  if (!diaFechamento) return `${a}-${pad(m)}`;
  if (d <= diaFechamento) return `${a}-${pad(m)}`;
  const dt = new Date(a, m, 1);   // mês seguinte
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}`;
}

const rotuloCiclo = ym => { const [a, m] = ym.split('-').map(Number); return `${MESES[m - 1]}/${a}`; };

const dataNoMes = (ym, dia) => {
  const [a, m] = ym.split('-').map(Number);
  return `${a}-${pad(m)}-${pad(Math.min(dia, ultimoDia(a, m)))}`;
};

/**
 * Fatura do cartão no período. Antes clicar no cartão não fazia nada e a
 * "fatura atual" era a soma de tudo do mês visível, sem ciclo nenhum.
 */
export default function FaturaDetalhe({ cartao, txs, cats, periodo, setPeriodo, onVoltar, onEdit, onDelete, onEditCartao }) {
  const isMobile = useIsMobile();

  const doCartao = txs
    .filter(t => t.tipo === 'cartao' && (t.cartao_id === cartao.id || t.conta_id === cartao.id))
    .sort((a, b) => String(b.data).localeCompare(String(a.data)));

  // Agrupa por ciclo de fatura
  const ciclos = {};
  for (const t of doCartao) {
    const c = cicloDaCompra(t.data, Number(cartao.dia_fechamento) || 0);
    (ciclos[c] = ciclos[c] || []).push(t);
  }
  const ordenados = Object.entries(ciclos).sort((a, b) => b[0].localeCompare(a[0]));

  const total = doCartao.reduce((s, t) => s + Number(t.valor), 0);
  const limite = Number(cartao.limite) || 0;
  const catNome = id => { const c = cats.find(x => x.id === id); return c ? `${c.icone || ''} ${c.nome}` : ''; };

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

      {/* Total do período */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 12, marginBottom: 16 }}>
        <div style={{ background: T.bg2, border: `1px solid ${T.border}`, borderRadius: T.radius, padding: '14px 16px' }}>
          <div style={{ fontSize: 10, color: T.txt3, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600, marginBottom: 6 }}>Total no período</div>
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 18, fontWeight: 500, color: T.purple }}>{fmt(total)}</div>
          <div style={{ fontSize: 11, color: T.txt3, marginTop: 4 }}>{doCartao.length} lançamentos</div>
        </div>
        {limite > 0 && (
          <div style={{ background: T.bg2, border: `1px solid ${T.border}`, borderRadius: T.radius, padding: '14px 16px' }}>
            <div style={{ fontSize: 10, color: T.txt3, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600, marginBottom: 6 }}>Limite</div>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 18, fontWeight: 500, color: T.txt }}>{fmt(limite)}</div>
            <div style={{ height: 4, background: T.bg3, borderRadius: 99, overflow: 'hidden', marginTop: 8 }}>
              <div style={{ height: '100%', width: `${Math.min(100, Math.round(total / limite * 100))}%`, background: total / limite > .8 ? T.red : T.purple, borderRadius: 99 }} />
            </div>
          </div>
        )}
      </div>

      {/* Faturas do período */}
      {ordenados.length === 0
        ? <div style={{ background: T.bg2, border: `1px solid ${T.border}`, borderRadius: T.radius, padding: 40, textAlign: 'center', color: T.txt3, fontSize: 13 }}>
            Nenhum gasto neste cartão no período selecionado
          </div>
        : ordenados.map(([ciclo, itens]) => {
          const soma = itens.reduce((s, t) => s + Number(t.valor), 0);
          return (
            <div key={ciclo} style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 6, paddingLeft: 4, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: T.txt }}>Fatura de {rotuloCiclo(ciclo)}</span>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, color: T.purple }}>{fmt(soma)}</span>
                <span style={{ fontSize: 11, color: T.txt3 }}>
                  {cartao.dia_fechamento ? `fecha ${fmtD(dataNoMes(ciclo, Number(cartao.dia_fechamento)))}` : ''}
                  {cartao.dia_vencimento ? ` · vence ${fmtD(dataNoMes(ciclo, Number(cartao.dia_vencimento)))}` : ''}
                </span>
              </div>
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
              </div>
            </div>
          );
        })
      }
    </div>
  );
}
