import React, { useState, useEffect } from 'react';
import { T } from '../constants.js';
import { fmt, fmtD } from '../lib/formatters.js';
import { sb } from '../supabase.js';
import { saldoDaConta } from '../lib/regime.js';
import { useIsMobile } from '../lib/useMedia.js';
import BankLogo from '../components/BankLogo.jsx';
import PeriodoSelect from '../components/PeriodoSelect.jsx';
import Icon, { CategoriaIcon } from '../components/Icon.jsx';

const Card = ({ label, valor, cor, sub }) => (
  <div style={{ background: T.bg2, border: `1px solid ${T.border}`, borderRadius: T.radius, padding: '14px 16px' }}>
    <div style={{ fontSize: 10, color: T.txt3, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600, marginBottom: 6 }}>{label}</div>
    <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 18, fontWeight: 500, color: cor }}>{valor}</div>
    {sub && <div style={{ fontSize: 11, color: T.txt3, marginTop: 4 }}>{sub}</div>}
  </div>
);

/**
 * Extrato de UMA conta no período. Antes clicar na conta não fazia nada — dava
 * para cadastrar e editar, mas não para ver o que passou por ela.
 *
 * O saldo aqui é o de verdade: busca tudo até o fim do período, não só o que
 * está carregado na tela. Saldo calculado com o mês visível dava número
 * diferente conforme o período escolhido.
 */
export default function ContaDetalhe({ conta, txs, contas, cats, periodo, setPeriodo, onVoltar, onEdit, onDelete, onEditConta }) {
  const isMobile = useIsMobile();
  const [saldos, setSaldos] = useState(null);   // { inicial, final }

  const daConta = txs.filter(t => t.conta_id === conta.id || t.conta_destino_id === conta.id)
    .sort((a, b) => String(b.data).localeCompare(String(a.data)));

  const entradas = daConta.filter(t => t.tipo === 'receita' || (t.tipo === 'transferencia' && t.conta_destino_id === conta.id))
    .reduce((s, t) => s + Number(t.valor), 0);
  // Pagamento de fatura sai da conta — sem contá-lo aqui, este total ficava
  // menor que o saldo final (que já usa saldoDaConta, esse sim completo).
  const saidas = daConta.filter(t => (t.tipo === 'despesa' || t.tipo === 'pagamento_fatura') && t.conta_id === conta.id)
    .reduce((s, t) => s + Number(t.valor), 0);
  const transfSaida = daConta.filter(t => t.tipo === 'transferencia' && t.conta_id === conta.id)
    .reduce((s, t) => s + Number(t.valor), 0);

  // Saldo real: precisa de tudo até o fim do período, não só do que está na tela
  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const data = await sb(`cf_transacoes?or=(conta_id.eq.${conta.id},conta_destino_id.eq.${conta.id})&data=lte.${periodo.fim}&select=data,tipo,valor,conta_id,conta_destino_id`);
        if (!vivo) return;
        const move = linhas => saldoDaConta(linhas, conta.id, conta.saldo_inicial);
        const todas = data || [];
        setSaldos({
          final: move(todas),
          inicial: move(todas.filter(t => String(t.data).slice(0, 10) < periodo.inicio)),
        });
      } catch { if (vivo) setSaldos(null); }
    })();
    return () => { vivo = false; };
  }, [conta.id, conta.saldo_inicial, periodo.inicio, periodo.fim]);

  const catObj = id => cats.find(x => x.id === id);
  const contaNome = id => contas.find(c => c.id === id)?.nome || '';

  return (
    <div style={{ padding: isMobile ? '16px 14px' : '24px 28px', fontFamily: "'Sora',sans-serif" }}>
      {/* Cabeçalho */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
        <button onClick={onVoltar} style={{ background: T.bg3, border: `1px solid ${T.border2}`, color: T.txt2, borderRadius: T.radius3, padding: '6px 12px', cursor: 'pointer', fontSize: 12, fontFamily: "'Sora',sans-serif", display: 'flex', alignItems: 'center', gap: 5 }}><Icon n="chevron-left" s={13} /> Contas</button>
        <BankLogo slug={conta.banco_slug} url={conta.logo_url} size={32} />
        <div style={{ flex: 1, minWidth: 120 }}>
          <h2 style={{ fontFamily: "'Sora',sans-serif", fontSize: 20, fontWeight: 700, color: T.txt, margin: 0, letterSpacing: -.3 }}>{conta.nome}</h2>
          <div style={{ fontSize: 11, color: T.txt3 }}>{conta.banco} · {conta.tipo}</div>
        </div>
        <PeriodoSelect value={periodo} onChange={setPeriodo} />
        <button onClick={() => onEditConta(conta)} style={{ background: T.bg3, border: `1px solid ${T.border2}`, color: T.txt2, width: 30, height: 30, borderRadius: T.radius3, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Editar conta"><Icon n="edit" s={14} /></button>
      </div>

      {/* Números do período */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 12, marginBottom: 16 }}>
        <Card label="Saldo inicial" valor={saldos ? fmt(saldos.inicial) : '—'} cor={T.txt2} sub="antes do período" />
        <Card label="Entradas"      valor={fmt(entradas)} cor={T.green} />
        <Card label="Saídas"        valor={fmt(saidas + transfSaida)} cor={T.red} sub={transfSaida > 0 ? `inclui ${fmt(transfSaida)} em transferências` : undefined} />
        <Card label="Saldo final"   valor={saldos ? fmt(saldos.final) : '—'} cor={saldos && saldos.final >= 0 ? T.green : T.red} sub="no fim do período" />
      </div>

      {/* Movimentações */}
      <div style={{ background: T.bg2, border: `1px solid ${T.border}`, borderRadius: T.radius }}>
        <div style={{ padding: '10px 14px', borderBottom: `1px solid ${T.border}`, fontSize: 10, color: T.txt3, textTransform: 'uppercase', letterSpacing: .8, fontWeight: 600 }}>
          {daConta.length} {daConta.length === 1 ? 'movimentação' : 'movimentações'} no período
        </div>
        {daConta.length === 0
          ? <div style={{ padding: 32, textAlign: 'center', color: T.txt3, fontSize: 13 }}>
              Nenhuma movimentação nesta conta no período selecionado
            </div>
          : daConta.map((t, i) => {
            const entrou = t.tipo === 'receita' || (t.tipo === 'transferencia' && t.conta_destino_id === conta.id);
            const cor = entrou ? T.green : t.tipo === 'transferencia' ? T.blue : t.tipo === 'cartao' ? T.purple : T.red;
            const bg  = entrou ? T.greenGlow : t.tipo === 'transferencia' ? T.blueGlow : t.tipo === 'cartao' ? T.purpleGlow : T.redGlow;
            const icon = entrou ? '↑' : t.tipo === 'transferencia' ? '⇄' : t.tipo === 'cartao' ? '▣' : '↓';
            return (
              <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', borderBottom: i < daConta.length - 1 ? `1px solid ${T.border}` : 'none' }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: bg, color: cor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, flexShrink: 0 }}>{icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: T.txt, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.descricao}</div>
                  <div style={{ fontSize: 11, color: T.txt3, marginTop: 1, display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                    {[
                      <span key="data">{fmtD(t.data)}</span>,
                      catObj(t.categoria_id) && <span key="cat" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><CategoriaIcon emoji={catObj(t.categoria_id).icone} s={11} />{catObj(t.categoria_id).nome}</span>,
                      t.tipo === 'transferencia' && (
                        <span key="transf">{t.conta_destino_id === conta.id ? `de ${contaNome(t.conta_id) || '—'}` : `para ${contaNome(t.conta_destino_id) || 'destino não informado'}`}</span>
                      ),
                    ].filter(Boolean).map((node, i) => <React.Fragment key={i}>{i > 0 && <span>·</span>}{node}</React.Fragment>)}
                  </div>
                </div>
                <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 13, color: cor, whiteSpace: 'nowrap' }}>
                  {entrou ? '+' : '-'}{fmt(t.valor)}
                </span>
                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                  <button onClick={() => onEdit(t)} style={{ background: 'transparent', border: 'none', color: T.txt3, cursor: 'pointer', padding: '2px 4px', display: 'flex' }} title="Editar"><Icon n="edit" s={13} /></button>
                  <button onClick={() => { if (window.confirm('Excluir esta movimentação?')) onDelete(t.id); }} style={{ background: 'transparent', border: 'none', color: T.txt3, cursor: 'pointer', padding: '2px 4px', display: 'flex' }} title="Excluir"><Icon n="trash" s={13} /></button>
                </div>
              </div>
            );
          })
        }
      </div>
    </div>
  );
}
