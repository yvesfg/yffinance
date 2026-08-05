import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useIsMobile } from '../lib/useMedia.js';
import { T, BANCOS, MESES } from '../constants.js';
import { fmt, fmtD } from '../lib/formatters.js';
import { parseOFX, parseCSV } from '../lib/parsers.js';
import { acharOperacaoCompleta, acharContraparteSaida, chaveBase, contarPorChave, contarPorChaveNoLote, hashDedup } from '../lib/dedup.js';
import { cicloDaCompra, datasDoCiclo, ehPagamentoFatura, acharFaturaParaPagamento } from '../lib/faturas.js';
import { detectParcela, parcelaDaTx, gerarParcelas, jaExisteParcela, uuid } from '../lib/parcelas.js';
import { lerDocumento } from '../lib/aiIntake.js';
import { indicePorHistorico, categorizarLote, sugerirCategoria } from '../lib/categorizar.js';
import { sb } from '../supabase.js';
import ModalParcelas from '../modals/ModalParcelas.jsx';
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

export default function Importar({ contas, cartoes = [], cats, perfil, onToast, onCreateConta, onDone }) {
  const isMobile = useIsMobile();
  const [destino, setDestino]     = useState('conta');   // 'conta' | 'cartao'
  const [contaId, setContaId]     = useState('');
  const [cartaoId, setCartaoId]   = useState('');
  const [banco, setBanco]         = useState('inter');
  const [lendoIA, setLendoIA]     = useState(null);      // { arquivo, feito, total }
  const [lendoSegundos, setLendoSegundos] = useState(0);   // relógio visível — a leitura por IA pode chegar perto de 1min por página, e sem contador aquilo parece travado

  useEffect(() => {
    if (!lendoIA) { setLendoSegundos(0); return; }
    const t0 = Date.now();
    const id = setInterval(() => setLendoSegundos(Math.floor((Date.now() - t0) / 1000)), 1000);
    return () => clearInterval(id);
  }, [lendoIA?.arquivo, lendoIA?.feito]);
  const [arquivos, setArquivos]   = useState([]);   // nomes dos arquivos carregados
  const [txsParsed, setTxsParsed] = useState([]);   // todas as txs (de todos os arquivos)
  const [preview, setPreview]     = useState([]);    // primeiras 10 para exibição
  const [importando, setImportando] = useState(false);
  const [resultado, setResultado]   = useState(null);
  const [modalParcelas, setModalParcelas] = useState(false);
  const [parcelasDetect, setParcelasDetect] = useState([]);
  const [historico, setHistorico] = useState([]);   // importações anteriores deste destino
  const [indiceCat, setIndiceCat] = useState(() => new Map());   // núcleo da descrição → categoria
  const fileRef = useRef();

  // Conta ou cartão: o resto do fluxo trabalha com o destino escolhido
  const noCartao   = destino === 'cartao';
  const destinoId  = noCartao ? cartaoId : contaId;
  const campoAlvo  = noCartao ? 'cartao_id' : 'conta_id';

  // Meses distintos detectados a partir das datas das transações
  const mesesDetectados = [...new Set(txsParsed.map(t => (t.data || '').slice(0, 7)).filter(Boolean))].sort();

  // Histórico de importações da conta selecionada, para avisar sobre período repetido
  const carregarHistorico = useCallback(async () => {
    if (!destinoId) { setHistorico([]); return; }
    try {
      const data = await sb(`cf_importacoes?${campoAlvo}=eq.${destinoId}&perfil=eq.${perfil}&order=created_at.desc`);
      setHistorico(data || []);
    } catch { setHistorico([]); }
  }, [destinoId, campoAlvo, perfil]);

  useEffect(() => { carregarHistorico(); }, [carregarHistorico]);

  // Índice de categorização: aprende com o que já está categorizado na base.
  // Fica no nível do perfil (não do destino) — categorizar no cartão ensina a
  // conta e vice-versa.
  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const data = await sb(`cf_transacoes?perfil=eq.${perfil}&categoria_id=not.is.null&select=descricao,categoria_id&order=data.desc&limit=2000`);
        if (vivo) setIndiceCat(indicePorHistorico(data || []));
      } catch { /* sem histórico, os padrões embutidos seguem valendo */ }
    })();
    return () => { vivo = false; };
  }, [perfil]);

  // Meses do arquivo que já foram importados nesta conta antes
  const mesesRepetidos = mesesDetectados
    .map(ym => {
      const antes = historico.filter(h => h.mes_referencia === ym);
      if (!antes.length) return null;
      const qtd = antes.reduce((s, h) => s + Number(h.qtd_lancamentos || 0), 0);
      return { ym, qtd, quando: antes[0].created_at };
    })
    .filter(Boolean);

  // CSV e OFX são lidos aqui mesmo; PDF, foto e print vão para a IA.
  const ehTexto = f => /\.(csv|ofx|txt)$/i.test(f.name);

  const handleFile = async e => {
    const files = [...e.target.files]; if (!files.length) return;
    setResultado(null);
    let todas = [];
    const nomes = [];
    const falhas = [];   // arquivos/páginas que não leram — não pode derrubar o resto
    try {
      for (const f of files) {
        // Cada arquivo é isolado: uma leitura por IA pode levar quase um
        // minuto e, no fim, ainda falhar (o provedor sobrecarregado). Antes,
        // isso jogava fora TUDO o que já tinha sido lido dos arquivos
        // anteriores no mesmo lote — quem subia 5 meses perdia os 5 se o
        // último desse erro.
        try {
          let txs = [];
          if (ehTexto(f)) {
            const txt = await lerArquivo(f);
            const result = f.name.toLowerCase().endsWith('.ofx') ? parseOFX(txt) : parseCSV(txt, { fatura: noCartao });
            txs = Array.isArray(result) ? result : (result?.txs || []);
          } else {
            // Extrato/fatura em PDF ou imagem: uma chamada de IA por página.
            // Pode legitimamente levar perto de um minuto por página — o
            // servidor tenta um provedor, cai pro seguinte, só desiste no limite.
            setLendoIA({ arquivo: f.name, feito: 0, total: 0 });
            const out = await lerDocumento(f, {
              onProgresso: (feito, total) => setLendoIA({ arquivo: f.name, feito, total }),
            });
            txs = out.txs;
            if (out.paginasIgnoradas > 0) {
              onToast(`${f.name}: só as primeiras ${out.paginas} páginas foram lidas`, 'error');
            }
            if (out.paginasComErro?.length) {
              falhas.push(`${f.name}: página${out.paginasComErro.length > 1 ? 's' : ''} ${out.paginasComErro.map(p => p.pagina).join(', ')} não leu`);
            }
          }
          nomes.push({ nome: f.name, qtd: txs.length, ia: !ehTexto(f) });
          // Marca a origem: o dedup precisa saber o que se repete DENTRO de um
          // arquivo (legítimo) e o que se repete ENTRE arquivos (sobreposição).
          todas = todas.concat(txs.map(t => ({ ...t, _arquivo: f.name })));
        } catch (err) {
          falhas.push(`${f.name}: ${err?.message || 'erro ao ler'}`);
        }
      }
      if (!todas.length) {
        onToast(falhas.length ? falhas.join(' · ') : 'Nenhuma transação encontrada nos arquivos', 'error');
        return;
      }
      // Ordena por data para visualização coerente entre meses
      todas.sort((a, b) => (a.data || '').localeCompare(b.data || ''));
      setArquivos(nomes);
      setTxsParsed(todas);
      setPreview(todas.slice(0, 10));
      if (falhas.length) onToast(`Lido com ressalvas — ${falhas.join(' · ')}`, 'error');
    } finally {
      setLendoIA(null);
      if (fileRef.current) fileRef.current.value = ''; // permite re-selecionar os mesmos arquivos
    }
  };

  // Etapa 1: usuário clica Importar → detectar parcelas e mostrar modal se houver
  const handleImportar = async () => {
    if (!destinoId || !txsParsed.length) {
      onToast(`Selecione ${noCartao ? 'o cartão' : 'a conta'} e carregue um arquivo`, 'error'); return;
    }

    // Detectar parcelas no lote importado
    const detectadas = [];
    for (const tx of txsParsed) {
      if (tx.tipo === 'receita' || tx.tipo === 'transferencia') continue;
      const p = parcelaDaTx(tx);
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
        `cf_transacoes?perfil=eq.${perfil}&data=gte.${anoAtras}&data=lte.${doisAnos}&select=id,data,valor,tipo,descricao,descricao_base,conta_id,conta_destino_id,cartao_id,parcela_atual,parcela_total,parcela_grupo`
      ) || [];

      let salvos = 0, duplic = 0, parcelasNovas = 0, vinculadas = 0, creditosFatura = 0, pagamentosVinc = 0;

      // Faturas em aberto dos cartões que este extrato pode estar pagando — só
      // olha cartões cuja "conta de pagamento" é a conta selecionada. Buscado
      // uma vez, antes do laço, porque decide a CLASSIFICAÇÃO da linha (o hash
      // de dedup depende do tipo final, não pode mudar no meio do laço).
      let faturasCandidatas = [];
      if (!noCartao) {
        const cartoesLigados = cartoes.filter(c => c.conta_pagamento_id === contaId);
        if (cartoesLigados.length) {
          const ids = cartoesLigados.map(c => c.id).join(',');
          faturasCandidatas = await sb(`cf_faturas?cartao_id=in.(${ids})&status=in.(aberta,fechada,parcial)&select=id,cartao_id,valor_total,valor_pago,data_vencimento`) || [];
        }
      }

      // Monta a linha conforme o destino: conta ou cartão de crédito.
      // Na fatura todo gasto é tipo 'cartao' com cartao_id — é assim que a
      // aba Cartões enxerga a fatura (ela soma por tipo === 'cartao').
      const noDestino = tx => (noCartao
        ? { ...tx, tipo: 'cartao', cartao_id: cartaoId, conta_id: null, perfil, status: 'pago' }
        : { ...tx, conta_id: contaId, perfil, status: 'pago' });

      // Mapa para agrupar parcelas confirmadas por descrição original
      const parcelasMap = {};
      for (const p of parcelasConfirmadas) {
        parcelasMap[p.tx.descricao] = p;
      }

      const txsParaSalvar = [];
      const patches   = [];   // vínculos em linhas que já estão no banco

      // --- DEDUP POR CONTAGEM ---
      // Quantas linhas de cada chave o banco já tem, e quantas o arquivo traz.
      // Entra só a diferença: reimportar não duplica, e o extrato que traz dois
      // lançamentos idênticos legítimos continua entrando com os dois.
      // Na fatura a linha é gravada como tipo 'cartao'; se for pagamento de
      // fatura, vira 'pagamento_fatura'. A chave de dedup tem que ser calculada
      // sobre o tipo FINAL — reclassificar depois do hash faria reimportar não
      // bater com o banco.
      const lote = noCartao
        ? txsParsed.map(t => ({ ...t, tipo: 'cartao' }))
        : txsParsed.map(tx => {
            if (tx.tipo !== 'despesa' || !ehPagamentoFatura(tx.descricao)) return tx;
            // Guarda de compatibilidade: se esta mesma linha já foi importada
            // ANTES desta regra existir (está gravada como despesa comum), não
            // reclassifica — criaria uma segunda linha, agora como pagamento de
            // fatura, duplicando o que já está lançado.
            const jaComoDespesa = existentes.some(e =>
              e.tipo === 'despesa' && e.conta_id === contaId &&
              String(e.data).slice(0, 10) === tx.data &&
              Math.abs(Number(e.valor) - Number(tx.valor)) < 0.01
            );
            if (jaComoDespesa) return tx;
            const fatura = acharFaturaParaPagamento(faturasCandidatas, { valor: tx.valor, data: tx.data });
            return fatura ? { ...tx, tipo: 'pagamento_fatura', fatura_id: fatura.id } : tx;
          });

      const noBanco   = contarPorChave(existentes, destinoId, campoAlvo);
      const noArquivo = contarPorChaveNoLote(lote, destinoId);
      const emitidas  = new Map();   // já emitidas nesta execução, por chave

      for (const tx of lote) {
        const chave  = chaveBase(tx, destinoId);
        const jaTem  = noBanco.get(chave) || 0;
        const cabem  = Math.max(0, (noArquivo.get(chave) || 0) - jaTem);
        const usadas = emitidas.get(chave) || 0;
        if (usadas >= cabem) { duplic++; continue; }
        emitidas.set(chave, usadas + 1);
        // Ordinal desta ocorrência, para o índice único do banco
        const hash = hashDedup(tx, destinoId, jaTem + usadas);

        // --- FATURA DE CARTÃO ---
        // Crédito na fatura (pagamento da própria fatura, estorno) não entra:
        // o pagamento vem do extrato da conta e seria contado duas vezes.
        if (noCartao) {
          if ((tx.sentido || 'saida') === 'entrada') { creditosFatura++; continue; }
        }

        // --- TRANSFERÊNCIA ENTRE CONTAS PRÓPRIAS ---
        // O lançamento entra como receita ou despesa (é o que ele é, do ponto
        // de vista desta conta). Só quando a OUTRA perna aparece — ou seja,
        // quando você importa o extrato do outro banco — as duas viram uma
        // transferência só. Enquanto isso, o dinheiro conta nos totais.
        if (!noCartao && tx.transf && (tx.sentido || 'saida') === 'entrada') {
          // Já pareada antes? (reimportação do extrato de destino)
          const completa = acharOperacaoCompleta(existentes, tx, contaId, 'entrada');
          if (completa) { completa._consumida = true; duplic++; continue; }

          const contraparte = acharContraparteSaida(existentes, tx, contaId);
          if (contraparte) {
            // A saída da outra conta vira a transferência; esta entrada não
            // gera linha nova, senão o valor apareceria duas vezes.
            contraparte.tipo = 'transferencia';
            contraparte.conta_destino_id = contaId;
            contraparte._consumida = true;
            if (contraparte.id) {
              patches.push({ id: contraparte.id, dados: { tipo: 'transferencia', conta_destino_id: contaId, categoria_id: null } });
            }
            vinculadas++;
            continue;
          }
          // Sem par: segue como receita normal, no fluxo abaixo
        }

        // --- PARCELAS ---
        const pInfo = parcelasMap[tx.descricao];
        if (pInfo) {
          const { base, atual, total } = pInfo;
          const grupoId = uuid();

          const futuras = gerarParcelas(
            { ...noDestino(tx), descricao_base: base, tipo: noCartao ? 'cartao' : 'despesa' },
            atual,
            total,
            grupoId
          );

          for (const parc of futuras) {
            // Dedup específico de parcela: mesmo grupo base + valor + parcela_atual
            if (jaExisteParcela(existentes, base, parc.valor, parc.parcela_atual)) {
              duplic++; continue;
            }
            // Cada parcela tem data e descrição próprias, então a chave dela
            // já é única — ordinal 0.
            txsParaSalvar.push({ ...parc, hash_dedup: hashDedup(parc, destinoId, 0) });
            if (parc.parcela_atual === atual) salvos++;
            else parcelasNovas++;
          }
          continue;
        }

        // --- DESPESA/RECEITA NORMAL (ou gasto de fatura) ---
        txsParaSalvar.push({ ...noDestino(tx), hash_dedup: hash });
        salvos++;
      }

      // Mantém apenas colunas reais de cf_transacoes (remove _sel, sentido e outros auxiliares).
      //
      // TODAS as colunas vão em TODAS as linhas, preenchendo com null o que não
      // se aplica: no insert em lote o PostgREST exige que os objetos tenham
      // exatamente as mesmas chaves, senão devolve "All object keys must match"
      // e o lote inteiro falha. Como cada linha omitia o que estava vazio
      // (parcela só nas parceladas, cartao_id só na fatura...), bastava um
      // extrato variado para nada entrar.
      const COLS = ['data', 'tipo', 'descricao', 'valor', 'conta_id', 'conta_destino_id', 'categoria_id', 'status', 'origem', 'observacao', 'perfil', 'parcela_atual', 'parcela_total', 'parcela_grupo', 'descricao_base', 'cartao_id', 'hash_dedup', 'fatura_id'];
      const limpar = tx => {
        const o = {};
        for (const k of COLS) o[k] = (tx[k] === undefined || tx[k] === '') ? null : tx[k];
        o.origem = 'importacao';
        return o;
      };

      // Categoriza o que vai entrar sem categoria: extrato de banco não traz
      // essa informação, e sem isso o gráfico de gastos por categoria nasce
      // vazio mesmo com o mês inteiro lançado.
      const cat = categorizarLote(txsParaSalvar, indiceCat, cats);
      txsParaSalvar.length = 0;
      txsParaSalvar.push(...cat.txs);

      // Fatura de cartão: garante que toda compra tenha uma cf_faturas para
      // cair dentro, criando as que faltarem no ciclo certo (fechamento e
      // vencimento vêm do cartão). Sem isso a fatura fica sem dono no banco —
      // existe como gasto de cartão, mas nenhuma cf_faturas sabe que ele é dela.
      let mapaFat = new Map();   // mes_referencia -> fatura_id, usado também depois do insert
      if (noCartao && cartaoId && txsParaSalvar.length) {
        const cartaoObj = cartoes.find(c => c.id === cartaoId);
        const diaFech = Number(cartaoObj?.dia_fechamento) || 0;
        const diaVenc = Number(cartaoObj?.dia_vencimento) || 0;
        const mesesNecessarios = [...new Set(txsParaSalvar.map(t => cicloDaCompra(t.data, diaFech)))];
        const existentesFat = await sb(`cf_faturas?cartao_id=eq.${cartaoId}&mes_referencia=in.(${mesesNecessarios.join(',')})`) || [];
        mapaFat = new Map(existentesFat.map(f => [f.mes_referencia, f.id]));
        const faltantes = mesesNecessarios.filter(m => !mapaFat.has(m));
        if (faltantes.length) {
          const novasFaturas = faltantes.map(m => {
            const { fechamento, vencimento } = datasDoCiclo(m, diaFech, diaVenc);
            return { cartao_id: cartaoId, perfil, mes_referencia: m, valor_total: 0, status: 'aberta', data_fechamento: fechamento, data_vencimento: vencimento };
          });
          const criadas = await sb('cf_faturas', 'POST', novasFaturas);
          (Array.isArray(criadas) ? criadas : [criadas]).forEach(f => mapaFat.set(f.mes_referencia, f.id));
        }
        txsParaSalvar.forEach(t => { t.fatura_id = mapaFat.get(cicloDaCompra(t.data, diaFech)) || null; });
      }

      // Insert em lote: uma requisição por bloco em vez de uma por linha, e o
      // índice único descarta o que já existe (duplo clique, duas abas, lote
      // reenviado) sem derrubar o resto.
      let inseridas = 0;
      const salvasRows = [];   // linhas REALMENTE gravadas — o banco devolve o id
      const BLOCO = 200;
      for (let i = 0; i < txsParaSalvar.length; i += BLOCO) {
        const bloco = txsParaSalvar.slice(i, i + BLOCO).map(limpar);
        const r = await sb('cf_transacoes', 'POST', bloco, '', 'resolution=ignore-duplicates');
        if (Array.isArray(r)) { inseridas += r.length; salvasRows.push(...r); }
        else inseridas += bloco.length;
      }
      // O banco pode ter recusado linhas que o cliente achou novas
      const bloqueadas = txsParaSalvar.length - inseridas;
      if (bloqueadas > 0) { duplic += bloqueadas; salvos = Math.max(0, salvos - bloqueadas); }

      // Soma de volta o total da fatura a partir do banco, não do que este
      // import trouxe: reimportar, ou importar em duas vezes, não pode fazer o
      // total divergir do que realmente está lançado.
      if (noCartao && mapaFat.size) {
        for (const faturaId of new Set(mapaFat.values())) {
          const linhas = await sb(`cf_transacoes?fatura_id=eq.${faturaId}&tipo=eq.cartao&select=valor`) || [];
          const total = linhas.reduce((s, r) => s + Number(r.valor), 0);
          await sb('cf_faturas', 'PATCH', { valor_total: total }, `id=eq.${faturaId}`);
        }
      }

      // Pagamento de fatura reconhecido no extrato: registra a baixa. Só para
      // linhas que o banco realmente gravou agora (salvasRows) — se a linha já
      // existia, o pagamento já foi registrado da vez anterior.
      const pagamentosNovos = salvasRows.filter(r => r.tipo === 'pagamento_fatura' && r.fatura_id);
      if (pagamentosNovos.length) {
        await sb('cf_fatura_pagamentos', 'POST', pagamentosNovos.map(r => ({
          fatura_id: r.fatura_id, transacao_id: r.id, conta_id: r.conta_id, valor: r.valor, data: r.data,
        })));
        pagamentosVinc = pagamentosNovos.length;
      }

      // Converte em transferência as saídas que acharam a entrada correspondente
      for (const p of patches) {
        await sb('cf_transacoes', 'PATCH', p.dados, `id=eq.${p.id}`);
      }

      // Registra o período importado, para avisar numa próxima vez.
      // Conta o que o DOCUMENTO trouxe, não o que foi gravado: parcela futura
      // cai em meses que o extrato nem cobre, e marcá-los faria o app avisar
      // que agosto já foi importado quando só existe ali uma parcela projetada.
      if (inseridas > 0) {
        const porMes = {};
        for (const tx of txsParsed) {
          const ym = String(tx.data).slice(0, 7);
          if (ym) porMes[ym] = (porMes[ym] || 0) + 1;
        }
        const nomes = arquivos.map(a => a.nome).join(', ').slice(0, 500);
        await sb('cf_importacoes', 'POST', Object.entries(porMes).map(([mes, qtd]) => ({
          perfil,
          conta_id:  noCartao ? null : contaId,
          cartao_id: noCartao ? cartaoId : null,
          mes_referencia: mes, qtd_lancamentos: qtd, arquivos: nomes,
        })));
        carregarHistorico();
      }

      setResultado({ salvos, duplic, parcelasNovas, vinculadas, creditosFatura, categorizados: cat.categorizados, pagamentosVinc });
      onToast(
        `${salvos} importados${parcelasNovas ? `, ${parcelasNovas} parcelas futuras criadas` : ''}${vinculadas ? `, ${vinculadas} transferências vinculadas` : ''}, ${duplic} duplicatas ignoradas`,
        'success'
      );

      // Entrega a faixa de datas do que foi importado: sem isso o app voltava
      // para o período atual e mostrava tela vazia, dando a impressão de que a
      // importação não fez nada.
      const datas = txsParsed.map(t => String(t.data).slice(0, 10)).filter(Boolean).sort();
      onDone?.(datas.length ? { inicio: datas[0], fim: datas[datas.length - 1] } : null);
    } catch (err) {
      onToast('Erro na importação: ' + err.message, 'error');
    } finally {
      setImportando(false);
    }
  };

  return (
    <div style={{ padding: isMobile ? '16px 14px' : '24px 28px', fontFamily: "'DM Sans',sans-serif", maxWidth: 700 }}>
      <h2 style={{ fontFamily: "'Syne',sans-serif", fontSize: 24, fontWeight: 700, color: T.txt, margin: '0 0 20px', letterSpacing: -.5 }}>
        Importar Extrato
      </h2>

      <div style={{ background: T.bg2, border: `1px solid ${T.border}`, borderRadius: T.radius, padding: 22, marginBottom: 16 }}>
        {/* Extrato de conta ou fatura de cartão */}
        <div style={{ display: 'flex', gap: 3, background: T.bg3, padding: 3, borderRadius: T.radius2, marginBottom: 14 }}>
          {[['conta', '🏦 Extrato de conta'], ['cartao', '💳 Fatura de cartão']].map(([v, l]) => (
            <button key={v} onClick={() => setDestino(v)} style={{
              flex: 1, padding: '8px 4px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600,
              fontFamily: "'DM Sans',sans-serif",
              border: destino === v ? `1px solid ${T.green}40` : '1px solid transparent',
              background: destino === v ? `${T.green}20` : 'transparent',
              color: destino === v ? T.green : T.txt3,
            }}>{l}</button>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
          <div>
            <label style={{ fontSize: 11, color: T.txt3, fontWeight: 600, textTransform: 'uppercase', letterSpacing: .5, display: 'block', marginBottom: 5 }}>{noCartao ? 'Cartão' : 'Conta'}</label>
            {noCartao
              ? <select style={inp} value={cartaoId} onChange={e => setCartaoId(e.target.value)}>
                  <option value="">{cartoes.length ? 'Selecionar cartão' : 'Nenhum cartão cadastrado'}</option>
                  {cartoes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              : <ContaSelect value={contaId} onChange={setContaId} contas={contas} onCreate={onCreateConta} allowEmpty emptyLabel="Selecionar conta" />}
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
          <input ref={fileRef} type="file" accept=".csv,.ofx,.txt,.pdf,image/*" multiple style={{ display: 'none' }} onChange={handleFile} />
          <div style={{ fontSize: 28, marginBottom: 8 }}>{lendoIA ? '🤖' : '📂'}</div>
          {lendoIA
            ? <><div style={{ fontSize: 13, color: T.txt }}>Lendo {lendoIA.arquivo} com IA… <span style={{ fontFamily: "'JetBrains Mono',monospace", color: T.txt3 }}>{lendoSegundos}s</span></div><div style={{ fontSize: 11, color: T.txt3, marginTop: 4 }}>{lendoIA.total ? `página ${Math.min(lendoIA.feito + 1, lendoIA.total)} de ${lendoIA.total}` : 'preparando páginas'} · cada página pode levar perto de 1 minuto</div></>
            : arquivos.length
            ? <><div style={{ fontSize: 13, color: T.txt }}>{arquivos.length === 1 ? arquivos[0].nome : `${arquivos.length} arquivos`}</div><div style={{ fontSize: 11, color: T.txt3, marginTop: 4 }}>{txsParsed.length} transações lidas{arquivos.some(a => a.ia) ? ' (via IA)' : ''}{mesesDetectados.length ? ` · ${mesesDetectados.length} ${mesesDetectados.length === 1 ? 'mês' : 'meses'}` : ''}</div></>
            : <><div style={{ fontSize: 13, color: T.txt2 }}>Clique para selecionar (vários de uma vez) ou arraste aqui</div><div style={{ fontSize: 11, color: T.txt3, marginTop: 4 }}>CSV e OFX são lidos na hora; PDF, foto e print do {noCartao ? 'da fatura' : 'extrato'} são lidos por IA</div></>
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

        {/* Período já importado nesta conta */}
        {mesesRepetidos.length > 0 && (
          <div style={{ background: T.bg3, border: `1px solid ${T.gold}40`, borderRadius: T.radius2, padding: '10px 12px', marginBottom: 14, fontSize: 12, color: T.txt2 }}>
            <div style={{ color: T.gold, fontWeight: 600, marginBottom: 4 }}>⚠ Período já importado nesta conta</div>
            {mesesRepetidos.map(m => (
              <div key={m.ym} style={{ fontSize: 11, color: T.txt3 }}>
                {rotuloMes(m.ym)} — {m.qtd} {m.qtd === 1 ? 'lançamento' : 'lançamentos'} em {fmtD(String(m.quando).slice(0, 10))}
              </div>
            ))}
            <div style={{ fontSize: 11, color: T.txt3, marginTop: 5 }}>
              Pode importar mesmo assim: o que já existe é reconhecido e ignorado, e só entra o que estiver faltando.
            </div>
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
                const parc = (t.tipo !== 'receita' && t.tipo !== 'transferencia') ? parcelaDaTx(t) : null;
                const catSug = cats.find(c => c.id === sugerirCategoria(noCartao ? { ...t, tipo: 'cartao' } : t, indiceCat, cats));
                return (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 12px', borderBottom: i < preview.length - 1 ? `1px solid ${T.border}` : 'none', fontSize: 12, gap: 8 }}>
                    <span style={{ color: T.txt3, flexShrink: 0 }}>{fmtD(t.data)}</span>
                    <span style={{ flex: 1, color: T.txt, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.descricao}</span>
                    {catSug && (
                      <span title="Categoria sugerida" style={{ background: T.bg2, border: `1px solid ${T.border2}`, color: T.txt2, borderRadius: 4, padding: '1px 6px', fontSize: 10, flexShrink: 0, whiteSpace: 'nowrap' }}>
                        {catSug.icone} {catSug.nome}
                      </span>
                    )}
                    {parc && (
                      <span style={{ background: T.purpleGlow, color: T.purple, borderRadius: 4, padding: '1px 6px', fontSize: 10, fontWeight: 600, flexShrink: 0 }}>
                        {parc.atual}/{parc.total}
                      </span>
                    )}
                    {/* O sinal segue o SENTIDO, não o tipo: "Pix recebido" é
                        transferência e entrava aqui como -R$ em vermelho. */}
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", color: (t.sentido || (t.tipo === 'receita' ? 'entrada' : 'saida')) === 'entrada' ? T.green : T.red, flexShrink: 0 }}>
                      {(t.sentido || (t.tipo === 'receita' ? 'entrada' : 'saida')) === 'entrada' ? '+' : '-'}{fmt(t.valor)}
                    </span>
                  </div>
                );
              })}
            </div>
            {txsParsed.filter(t => t.tipo !== 'receita' && t.tipo !== 'transferencia' && parcelaDaTx(t)).length > 0 && (
              <div style={{ marginTop: 8, fontSize: 11, color: T.purple, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ background: T.purpleGlow, borderRadius: 4, padding: '1px 6px', fontWeight: 600 }}>
                  {txsParsed.filter(t => t.tipo !== 'receita' && t.tipo !== 'transferencia' && parcelaDaTx(t)).length} parcelas detectadas
                </span>
                — serão confirmadas antes de importar
              </div>
            )}
          </div>
        )}

        <button
          onClick={handleImportar}
          disabled={!destinoId || !txsParsed.length || importando || !!lendoIA}
          style={{ width: '100%', padding: '11px', background: (!destinoId || !txsParsed.length || importando || lendoIA) ? T.bg3 : T.green, color: (!destinoId || !txsParsed.length || importando || lendoIA) ? T.txt3 : '#000', border: 'none', borderRadius: T.radius2, cursor: (!destinoId || !txsParsed.length || importando || lendoIA) ? 'not-allowed' : 'pointer', fontFamily: "'DM Sans',sans-serif", fontSize: 14, fontWeight: 600 }}
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
            {resultado.categorizados > 0 && <div style={{ background: T.goldGlow, color: T.gold, borderRadius: T.radius2, padding: '8px 14px', fontSize: 13, fontWeight: 600 }}>🏷 {resultado.categorizados} categorizados automaticamente</div>}
            {resultado.pagamentosVinc > 0 && <div style={{ background: T.purpleGlow, color: T.purple, borderRadius: T.radius2, padding: '8px 14px', fontSize: 13, fontWeight: 600 }}>🧾 {resultado.pagamentosVinc} pagamento(s) de fatura reconhecidos</div>}
            {resultado.creditosFatura > 0 && <div style={{ background: T.bg3, color: T.txt2, borderRadius: T.radius2, padding: '8px 14px', fontSize: 13 }}>↩ {resultado.creditosFatura} créditos da fatura ignorados (pagamento/estorno)</div>}
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
