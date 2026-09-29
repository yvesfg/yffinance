import React, { useState, useMemo } from 'react';
import { useIsMobile } from '../lib/useMedia.js';
import PeriodoSelect from '../components/PeriodoSelect.jsx';
import AvisoPeriodoVazio from '../components/AvisoPeriodoVazio.jsx';
import { T, BANCOS } from '../constants.js';
import { fmt, fmtD, exportCSV } from '../lib/formatters.js';
import { totais } from '../lib/regime.js';
import RegimeToggle from '../components/RegimeToggle.jsx';
import Icon, { CategoriaIcon } from '../components/Icon.jsx';

const inp = { background: T.bg3, border: `1px solid ${T.border2}`, color: T.txt, padding: '8px 12px', borderRadius: T.radius2, fontFamily: "'Sora',sans-serif", fontSize: 13, outline: 'none', boxSizing: 'border-box' };

export default function Extrato({ txs, contas, cats, cartoes, periodo, setPeriodo, perfil, onEdit, onDelete }) {
  const isMobile = useIsMobile();
  const [filtTipo, setFiltTipo] = useState('todos');
  const [filtConta, setFiltConta] = useState('');
  const [filtCat, setFiltCat] = useState('');
  const [busca, setBusca] = useState('');
  const [ordenacao, setOrdenacao] = useState('data_desc');


  const filtradas = useMemo(() => {
    let lista = [...txs];
    if (filtTipo !== 'todos') lista = lista.filter(t => t.tipo === filtTipo);
    if (filtConta) lista = lista.filter(t => t.conta_id === filtConta || t.conta_destino_id === filtConta);
    if (filtCat) lista = lista.filter(t => t.categoria_id === filtCat);
    if (busca.trim()) {
      const q = busca.toLowerCase();
      lista = lista.filter(t => (t.descricao||'').toLowerCase().includes(q));
    }
    lista.sort((a, b) => {
      if (ordenacao === 'data_desc') return new Date(b.data) - new Date(a.data);
      if (ordenacao === 'data_asc')  return new Date(a.data) - new Date(b.data);
      if (ordenacao === 'valor_desc') return Number(b.valor) - Number(a.valor);
      if (ordenacao === 'valor_asc')  return Number(a.valor) - Number(b.valor);
      return 0;
    });
    return lista;
  }, [txs, filtTipo, filtConta, filtCat, busca, ordenacao]);

  const [regime, setRegime] = useState(() => localStorage.getItem('yf_regime') || 'competencia');
  const mudarRegime = r => { setRegime(r); localStorage.setItem('yf_regime', r); };
  const { entradas: totRec, saidas: totDesp } = totais(filtradas, regime);

  const contaNome = id => contas.find(c => c.id === id)?.nome || '';
  const catObj    = id => cats.find(c => c.id === id);

  // Celular perde as colunas Conta e Data — elas descem para a linha de apoio
  const colunas = isMobile ? '36px 1fr auto' : '36px 1fr auto auto auto';

  const TIPOS = [
    { v:'todos',         l:'Todos' },
    { v:'receita',       l:'Receitas' },
    { v:'despesa',       l:'Despesas' },
    { v:'cartao',        l:'Cartões' },
    { v:'transferencia', l:'Transferências' },
  ];

  return (
    <div style={{ padding: isMobile ? '16px 14px' : '24px 28px', fontFamily: "'Sora',sans-serif" }}>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20 }}>
        <h2 style={{ fontFamily:"'Sora',sans-serif", fontSize:24, fontWeight:700, color:T.txt, margin:0, letterSpacing:-.5 }}>Extrato</h2>
        <div style={{ display:'flex', gap:10, alignItems:'center', flexWrap:'wrap' }}>
          <RegimeToggle value={regime} onChange={mudarRegime} />
          <PeriodoSelect value={periodo} onChange={setPeriodo} />
        </div>
      </div>

      <AvisoPeriodoVazio perfil={perfil} periodo={periodo} setPeriodo={setPeriodo} vazio={txs.length === 0} />

      {/* Resumo */}
      <div className="yf-kpis" style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:12, marginBottom:18 }}>
        {[
          { l:'Entradas', v:totRec, c:T.green },
          { l:'Saídas', v:totDesp, c:T.red },
          { l:'Saldo', v:totRec-totDesp, c: totRec-totDesp>=0?T.green:T.red },
        ].map(({ l, v, c }) => (
          <div key={l} style={{ background:T.bg2, border:`1px solid ${T.border}`, borderRadius:T.radius, padding:'14px 16px' }}>
            <div style={{ fontSize:10, color:T.txt3, textTransform:'uppercase', letterSpacing:1, fontWeight:600, marginBottom:6 }}>{l}</div>
            <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:18, fontWeight:500, color:c }}>{fmt(v)}</div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div style={{ background:T.bg2, border:`1px solid ${T.border}`, borderRadius:T.radius, padding:14, marginBottom:14, display:'flex', flexWrap:'wrap', gap:10, alignItems:'center' }}>
        {/* Em 375px as cinco pastilhas somam ~390px: viram faixa rolável em vez de sair da tela */}
        <div className="faixa-rolavel" style={{ display:'flex', gap:4, background:T.bg3, padding:3, borderRadius:T.radius2, maxWidth:'100%', overflowX:'auto' }}>
          {TIPOS.map(t => (
            <button key={t.v} onClick={() => setFiltTipo(t.v)} style={{
              padding:'5px 10px', whiteSpace:'nowrap', flexShrink:0, border: filtTipo===t.v?`1px solid ${T.border3}`:'1px solid transparent',
              background: filtTipo===t.v?T.bg4:'transparent', color: filtTipo===t.v?T.txt:T.txt2,
              borderRadius:6, cursor:'pointer', fontSize:12, fontFamily:"'Sora',sans-serif",
            }}>{t.l}</button>
          ))}
        </div>

        <select style={{ ...inp, flex:1, minWidth:120 }} value={filtConta} onChange={e => setFiltConta(e.target.value)}>
          <option value="">Todas as contas</option>
          {contas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>

        <select style={{ ...inp, flex:1, minWidth:120 }} value={filtCat} onChange={e => setFiltCat(e.target.value)}>
          <option value="">Todas as categorias</option>
          {cats.map(c => <option key={c.id} value={c.id}>{c.icone} {c.nome}</option>)}
        </select>

        <input type="text" placeholder="Buscar descrição..." style={{ ...inp, flex:2, minWidth:140 }} value={busca} onChange={e => setBusca(e.target.value)} />

        <select style={{ ...inp }} value={ordenacao} onChange={e => setOrdenacao(e.target.value)}>
          <option value="data_desc">Data ↓</option>
          <option value="data_asc">Data ↑</option>
          <option value="valor_desc">Valor ↓</option>
          <option value="valor_asc">Valor ↑</option>
        </select>

        <button onClick={() => exportCSV(filtradas, cats, contas)} style={{ ...inp, background:T.bg3, cursor:'pointer', color:T.txt2, whiteSpace:'nowrap' }}>
          ↓ Exportar
        </button>
      </div>

      {/* Lista. No celular as colunas Conta e Data saem da grade e descem para
          a linha de apoio, senão cinco colunas não cabem em 375px. */}
      <div style={{ background:T.bg2, border:`1px solid ${T.border}`, borderRadius:T.radius }}>
        {!isMobile && (
          <div style={{ display:'grid', gridTemplateColumns:colunas, gap:0, padding:'8px 14px', borderBottom:`1px solid ${T.border}`, fontSize:10, color:T.txt3, textTransform:'uppercase', letterSpacing:.8, fontWeight:600 }}>
            <div></div><div>Descrição</div><div style={{ textAlign:'right', paddingRight:10 }}>Conta</div><div style={{ textAlign:'right', paddingRight:10 }}>Data</div><div style={{ textAlign:'right' }}>Valor</div>
          </div>
        )}
        {filtradas.length === 0
          ? <div style={{ padding:'32px', textAlign:'center', color:T.txt3, fontSize:13 }}>Nenhuma movimentação encontrada</div>
          : filtradas.map(t => {
            const cor  = t.tipo==='receita'?T.green:t.tipo==='transferencia'?T.blue:t.tipo==='cartao'?T.purple:T.red;
            const bg   = t.tipo==='receita'?T.greenGlow:t.tipo==='transferencia'?T.blueGlow:t.tipo==='cartao'?T.purpleGlow:T.redGlow;
            const icon = t.tipo==='receita'?'↑':t.tipo==='transferencia'?'⇄':t.tipo==='cartao'?'▣':'↓';
            const sinal= t.tipo==='receita'?'+':t.tipo==='transferencia'?'±':'-';
            return (
              <div key={t.id} style={{ display:'grid', gridTemplateColumns:colunas, gap:0, padding:'9px 14px', borderBottom:`1px solid ${T.border}`, alignItems:'center' }}
                onMouseEnter={e => e.currentTarget.style.background = T.bg3}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{ width:28, height:28, borderRadius:8, background:bg, color:cor, display:'flex', alignItems:'center', justifyContent:'center', fontSize:13 }}>{icon}</div>
                <div style={{ paddingLeft:10, minWidth:0 }}>
                  <div style={{ fontSize:13, color:T.txt, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{t.descricao}</div>
                  <div style={{ fontSize:11, color:T.txt3, marginTop:1, display:'flex', alignItems:'center', gap:4, flexWrap:'wrap' }}>
                    {[
                      isMobile && <span key="data">{fmtD(t.data)}</span>,
                      isMobile && contaNome(t.conta_id) && <span key="conta">{contaNome(t.conta_id)}</span>,
                      catObj(t.categoria_id) && <span key="cat" style={{ display:'inline-flex', alignItems:'center', gap:4 }}><CategoriaIcon emoji={catObj(t.categoria_id).icone} s={11} />{catObj(t.categoria_id).nome}</span>,
                      t.conta_destino_id && <span key="dest">→ {contaNome(t.conta_destino_id)}</span>,
                    ].filter(Boolean).map((node, i) => <React.Fragment key={i}>{i > 0 && <span>·</span>}{node}</React.Fragment>)}
                    {/* Transferência sem destino sai do saldo da origem e não entra em lugar nenhum — precisa ficar visível */}
                    {t.tipo === 'transferencia' && !t.conta_destino_id && (
                      <span style={{ color:T.blue }}>{' · '}destino não informado</span>
                    )}
                  </div>
                </div>
                {!isMobile && <div style={{ fontSize:12, color:T.txt3, paddingRight:14, whiteSpace:'nowrap' }}>{contaNome(t.conta_id)}</div>}
                {!isMobile && <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:12, color:T.txt3, paddingRight:14, whiteSpace:'nowrap' }}>{fmtD(t.data)}</div>}
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:13, color:cor, whiteSpace:'nowrap' }}>{sinal}{fmt(t.valor)}</span>
                  <div style={{ display:'flex', gap:4 }}>
                    <button onClick={() => onEdit(t)} style={{ background:'transparent', border:'none', color:T.txt3, cursor:'pointer', padding:'2px 4px', display:'flex' }} title="Editar"><Icon n="edit" s={13} /></button>
                    <button onClick={() => { if (window.confirm('Excluir esta movimentação?')) onDelete(t.id); }} style={{ background:'transparent', border:'none', color:T.txt3, cursor:'pointer', padding:'2px 4px', display:'flex' }} title="Excluir"><Icon n="trash" s={13} /></button>
                  </div>
                </div>
              </div>
            );
          })
        }
        <div style={{ padding:'10px 14px', fontSize:11, color:T.txt3, borderTop:`1px solid ${T.border}` }}>
          {filtradas.length} movimentações
        </div>
      </div>
    </div>
  );
}
