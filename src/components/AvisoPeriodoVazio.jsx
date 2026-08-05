import React, { useState, useEffect } from 'react';
import { T } from '../constants.js';
import { fmtD } from '../lib/formatters.js';
import { sb } from '../supabase.js';
import { rotuloPeriodo, periodoMes, periodoLivre } from '../lib/periodo.js';

/**
 * "Não tem nada aqui, mas você tem lançamentos ali."
 *
 * Tela vazia sem explicação foi o que fez parecer que a importação tinha
 * falhado: os dados estavam no banco, só que em outro mês. Este aviso aparece
 * em qualquer tela que dependa do período, e leva direto onde o dado está.
 */
export default function AvisoPeriodoVazio({ perfil, periodo, setPeriodo, vazio }) {
  const [faixa, setFaixa] = useState(null);

  useEffect(() => {
    if (!vazio) { setFaixa(null); return; }
    let vivo = true;
    (async () => {
      try {
        const [ini, fim, todas] = await Promise.all([
          sb(`cf_transacoes?perfil=eq.${perfil}&select=data&order=data.asc&limit=1`),
          sb(`cf_transacoes?perfil=eq.${perfil}&select=data&order=data.desc&limit=1`),
          sb(`cf_transacoes?perfil=eq.${perfil}&select=id&limit=2000`),
        ]);
        if (!vivo || !ini?.length || !fim?.length) return;
        setFaixa({ primeira: ini[0].data, ultima: fim[0].data, qtd: (todas || []).length });
      } catch { if (vivo) setFaixa(null); }
    })();
    return () => { vivo = false; };
  }, [vazio, perfil]);

  if (!vazio || !faixa) return null;

  const mesDoUltimo = periodoMes(String(faixa.ultima).slice(0, 7));

  return (
    <div style={{ background: T.bg2, border: `1px solid ${T.gold}40`, borderRadius: T.radius, padding: '14px 18px', marginBottom: 16 }}>
      <div style={{ color: T.gold, fontWeight: 600, fontSize: 13, marginBottom: 4 }}>
        Nenhum lançamento em {rotuloPeriodo(periodo)}
      </div>
      <div style={{ fontSize: 12, color: T.txt2 }}>
        Você tem {faixa.qtd} {faixa.qtd === 1 ? 'lançamento' : 'lançamentos'} entre {fmtD(faixa.primeira)} e {fmtD(faixa.ultima)}.
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
        <button onClick={() => setPeriodo(mesDoUltimo)}
          style={{ background: T.green, color: '#000', border: 'none', borderRadius: T.radius3, padding: '7px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: "'DM Sans',sans-serif" }}>
          Ir para {rotuloPeriodo(mesDoUltimo)}
        </button>
        <button onClick={() => setPeriodo(periodoLivre(faixa.primeira, faixa.ultima))}
          style={{ background: T.bg3, color: T.txt2, border: `1px solid ${T.border2}`, borderRadius: T.radius3, padding: '7px 14px', cursor: 'pointer', fontSize: 12, fontFamily: "'DM Sans',sans-serif" }}>
          Ver tudo que existe
        </button>
      </div>
    </div>
  );
}
