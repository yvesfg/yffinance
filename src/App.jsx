import React, { useState, useEffect, useCallback, useRef } from 'react';
import { T } from './constants.js';
import { sb } from './supabase.js';
import { periodoMes, mesDeHoje, mesDoPeriodo } from './lib/periodo.js';
import { supabase } from './lib/supabaseClient.js';

import Login from './pages/Login.jsx';
import Splash from './pages/Splash.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Extrato from './pages/Extrato.jsx';
import Lancamentos from './pages/Lancamentos.jsx';
import Contas from './pages/Contas.jsx';
import Cartoes from './pages/Cartoes.jsx';
import Importar from './pages/Importar.jsx';
import ContaDetalhe from './pages/ContaDetalhe.jsx';
import FaturaDetalhe from './pages/FaturaDetalhe.jsx';

import Sidebar from './components/Sidebar.jsx';
import TopBar from './components/TopBar.jsx';
import Toast from './components/Toast.jsx';

import ModalLanc from './modals/ModalLanc.jsx';
import ModalConta from './modals/ModalConta.jsx';
import ModalCartao from './modals/ModalCartao.jsx';


export default function App() {
  const [session, setSession]     = useState(undefined); // undefined = carregando
  const [perfil, setPerfil]       = useState(() => localStorage.getItem('yf_perfil') || null);
  const [pagina, setPagina]       = useState('dashboard');
  const [periodo, setPeriodo]     = useState(() => periodoMes(mesDeHoje()));
  // Conta ou cartão aberto no detalhamento (null = lista normal)
  const [detalhe, setDetalhe]     = useState(null);
  const [sideOpen, setSideOpen]   = useState(false);

  const [txs, setTxs]         = useState([]);
  const [contas, setContas]   = useState([]);
  const [cats, setCats]       = useState([]);
  const [cartoes, setCartoes] = useState([]);

  const [authErro, setAuthErro] = useState('');

  // Auth: quem troca o ?code= do retorno do Google por sessão é o
  // detectSessionInUrl do client (lib/supabaseClient.js). Aqui só escutamos —
  // trocar o code na mão em paralelo derrubava o login (code de uso único).
  useEffect(() => {
    let vivo = true;

    // Erro devolvido pelo provider (?error= ou #error=) — antes sumia calado e
    // o usuário só via a tela de login de novo, sem explicação nenhuma.
    const q = new URLSearchParams(window.location.search);
    const h = new URLSearchParams(window.location.hash.slice(1));
    const erroOAuth = q.get('error_description') || q.get('error')
                   || h.get('error_description') || h.get('error');
    if (erroOAuth) setAuthErro(decodeURIComponent(erroOAuth.replace(/\+/g, ' ')));

    // Rede lenta ou Supabase fora do ar deixavam session === undefined pra
    // sempre, travando o app no "carregando...". Passou de 8s, mostra o login.
    const limite = setTimeout(() => {
      if (vivo) setSession(s => (s === undefined ? null : s));
    }, 8000);

    supabase.auth.getSession()
      .then(({ data }) => { if (vivo) setSession(data.session ?? null); })
      .catch(() => { if (vivo) setSession(null); });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      if (!vivo) return;
      setSession(s ?? null);
      // Tira o ?code= / #access_token= da barra de endereços depois que entrou.
      if (s && (window.location.search || window.location.hash)) {
        window.history.replaceState({}, '', window.location.pathname);
      }
    });

    return () => { vivo = false; clearTimeout(limite); subscription.unsubscribe(); };
  }, []);

  const [toast, setToast]         = useState(null);
  const [editTx, setEditTx]       = useState(null);
  const [modalLanc, setModalLanc] = useState(false);
  const [editConta, setEditConta] = useState(null);
  const [modalConta, setModalConta] = useState(false);
  const [editCartao, setEditCartao] = useState(null);
  const [modalCartao, setModalCartao] = useState(false);

  const showToast = (msg, type = 'success') => setToast({ msg, type });

  // Carrega pelo PERÍODO escolhido, não mais só pelo mês corrente.
  //
  // O contador existe porque as respostas podem chegar fora de ordem: clicando
  // ‹ ‹ rápido, a busca do período antigo pode responder DEPOIS da nova e
  // sobrescrever a tela — a lista somia e reaparecia com o conteúdo errado.
  // Só a resposta da busca mais recente tem permissão de escrever.
  const buscaAtual = useRef(0);
  const loadTxs = useCallback(async () => {
    if (!perfil) return;
    const minhaBusca = ++buscaAtual.current;
    try {
      const data = await sb(`cf_transacoes?perfil=eq.${perfil}&data=gte.${periodo.inicio}&data=lte.${periodo.fim}&order=data.desc,id.desc`);
      if (minhaBusca !== buscaAtual.current) return;   // chegou atrasada
      setTxs(data || []);
    } catch (e) {
      // Antes o erro sumia calado e a tela ficava com dados do período anterior
      if (minhaBusca === buscaAtual.current) showToast('Erro ao carregar lançamentos: ' + (e.message || e), 'error');
    }
  }, [perfil, periodo.inicio, periodo.fim]);

  const loadContas = useCallback(async () => {
    if (!perfil) return;
    const data = await sb(`cf_contas?perfil=eq.${perfil}&order=nome.asc`);
    setContas(data || []);
  }, [perfil]);

  // 'ambos' são as categorias padrão do sistema, compartilhadas pelos dois
  // perfis. Igualdade estrita (perfil=eq.) nunca batia com elas — resultado:
  // toda categoria ficava invisível e nenhum lançamento tinha categoria.
  const loadCats = useCallback(async () => {
    if (!perfil) return;
    const data = await sb(`cf_categorias?perfil=in.(${perfil},ambos)&order=nome.asc`);
    setCats(data || []);
  }, [perfil]);

  const loadCartoes = useCallback(async () => {
    if (!perfil) return;
    const data = await sb(`cf_cartoes?perfil=eq.${perfil}&order=nome.asc`);
    setCartoes(data || []);
  }, [perfil]);

  useEffect(() => {
    if (perfil) { loadTxs(); loadContas(); loadCats(); loadCartoes(); }
  }, [perfil, periodo.inicio, periodo.fim]);

  const selectPerfil = p => { setPerfil(p); localStorage.setItem('yf_perfil', p); };

  // Transações
  const saveTx = async payload => {
    try {
      if (editTx) {
        await sb('cf_transacoes', 'PATCH', payload, `id=eq.${editTx.id}`);
      } else {
        await sb('cf_transacoes', 'POST', { ...payload, perfil });
      }
      await loadTxs();
      setModalLanc(false); setEditTx(null);
      showToast(editTx ? 'Lançamento atualizado' : 'Lançamento salvo');
    } catch (e) { showToast('Erro ao salvar lançamento: ' + (e.message || e), 'error'); }
  };

  const deleteTx = async id => {
    try {
      await sb('cf_transacoes', 'DELETE', null, `id=eq.${id}`);
      await loadTxs(); showToast('Lançamento excluído');
    } catch (e) { showToast('Erro ao excluir: ' + (e.message || e), 'error'); }
  };

  const openNewTx = () => { setEditTx(null); setModalLanc(true); };
  const openEditTx = t => { setEditTx(t); setModalLanc(true); };

  // Contas
  const saveConta = async payload => {
    try {
      if (editConta) {
        await sb('cf_contas', 'PATCH', payload, `id=eq.${editConta.id}`);
      } else {
        await sb('cf_contas', 'POST', { ...payload, perfil });
      }
      await loadContas(); setModalConta(false); setEditConta(null);
      showToast(editConta ? 'Conta atualizada' : 'Conta criada');
    } catch (e) { showToast('Erro ao salvar conta: ' + (e.message || e), 'error'); }
  };

  // Criação rápida de conta a partir de um <select> (ContaSelect). Salva direto
  // na base com defaults seguros e retorna a conta criada para já selecioná-la.
  const createContaQuick = async nome => {
    const novo = await sb('cf_contas', 'POST', { nome: nome.trim(), banco: 'Outro', banco_slug: 'outro', tipo: 'corrente', saldo_inicial: 0, cor: '#4d8eff', perfil });
    await loadContas();
    const conta = Array.isArray(novo) ? novo[0] : novo;
    showToast(`Conta "${conta?.nome || nome}" criada`);
    return conta;
  };

  // Criação rápida de categoria a partir do <select> do lançamento (mesmo
  // padrão do createContaQuick) — fica no perfil atual, não em "ambos": só as
  // categorias padrão do sistema são compartilhadas entre pessoal e empresa.
  const ICONE_PADRAO = { despesa: '🏷️', receita: '💰', transferencia: '🔄' };
  const createCategoriaQuick = async (nome, tipo) => {
    const nova = await sb('cf_categorias', 'POST', { nome: nome.trim(), tipo, icone: ICONE_PADRAO[tipo] || '🏷️', perfil });
    await loadCats();
    const cat = Array.isArray(nova) ? nova[0] : nova;
    showToast(`Categoria "${cat?.nome || nome}" criada`);
    return cat;
  };

  const deleteConta = async id => {
    try {
      await sb('cf_contas', 'DELETE', null, `id=eq.${id}`);
      await loadContas(); showToast('Conta excluída');
    } catch (e) { showToast('Erro ao excluir conta: ' + (e.message || e), 'error'); }
  };

  // Cartões
  const saveCartao = async payload => {
    try {
      if (editCartao) {
        await sb('cf_cartoes', 'PATCH', payload, `id=eq.${editCartao.id}`);
      } else {
        await sb('cf_cartoes', 'POST', { ...payload, perfil });
      }
      await loadCartoes(); setModalCartao(false); setEditCartao(null);
      showToast(editCartao ? 'Cartão atualizado' : 'Cartão criado');
    } catch (e) { showToast('Erro ao salvar cartão: ' + (e.message || e), 'error'); }
  };

  const deleteCartao = async id => {
    try {
      await sb('cf_cartoes', 'DELETE', null, `id=eq.${id}`);
      await loadCartoes(); showToast('Cartão excluído');
    } catch (e) { showToast('Erro ao excluir cartão: ' + (e.message || e), 'error'); }
  };

  // Aguardar verificação de sessão
  if (session === undefined) return (
    <div style={{ position:'fixed', inset:0, background:T.bg, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:13, color:T.txt3 }}>carregando...</div>
    </div>
  );

  // Não autenticado → tela de login
  if (!session) return <Login erroInicial={authErro} />;

  // Autenticado mas sem perfil → splash de seleção
  if (!perfil) return <Splash onSelect={selectPerfil} />;

  const pageProps = { txs, contas, cats, cartoes, periodo, setPeriodo, mesAtual: mesDoPeriodo(periodo), loadTxs, perfil };

  const renderPage = () => {
    // Detalhamento tem precedência: veio de um clique na conta ou no cartão
    if (detalhe?.tipo === 'conta') {
      const conta = contas.find(c => c.id === detalhe.id);
      if (conta) return <ContaDetalhe {...pageProps} conta={conta} onVoltar={() => setDetalhe(null)}
        onEdit={openEditTx} onDelete={deleteTx} onEditConta={c => { setEditConta(c); setModalConta(true); }} />;
    }
    if (detalhe?.tipo === 'cartao') {
      const cartao = cartoes.find(c => c.id === detalhe.id);
      if (cartao) return <FaturaDetalhe {...pageProps} cartao={cartao} onVoltar={() => setDetalhe(null)}
        onEdit={openEditTx} onDelete={deleteTx} onEditCartao={c => { setEditCartao(c); setModalCartao(true); }} onToast={showToast} />;
    }

    switch (pagina) {
      case 'dashboard':   return <Dashboard {...pageProps} onAbrirConta={id => setDetalhe({ tipo: 'conta', id })} />;
      case 'extrato':     return <Extrato {...pageProps} onEdit={openEditTx} onDelete={deleteTx} />;
      case 'lancamentos': return <Lancamentos {...pageProps} onNew={openNewTx} onEdit={openEditTx} onDelete={deleteTx} />;
      case 'contas':      return <Contas contas={contas} txs={txs} periodo={periodo} onAbrir={c => setDetalhe({ tipo: 'conta', id: c.id })} onNew={() => { setEditConta(null); setModalConta(true); }} onEdit={c => { setEditConta(c); setModalConta(true); }} onDelete={deleteConta} />;
      case 'cartoes':     return <Cartoes cartoes={cartoes} txs={txs} contas={contas} periodo={periodo} onAbrir={c => setDetalhe({ tipo: 'cartao', id: c.id })} onNew={() => { setEditCartao(null); setModalCartao(true); }} onEdit={c => { setEditCartao(c); setModalCartao(true); }} onDelete={deleteCartao} />;
      case 'importar':    return <Importar contas={contas} cartoes={cartoes} cats={cats} perfil={perfil} onToast={showToast} onCreateConta={createContaQuick} onDone={faixa => {
        // Ir pro MÊS mais recente do que foi importado, não pro intervalo
        // inteiro: um import de vários meses de uma vez virava um período
        // "livre" enorme (ex.: 8 meses), e daí as setas ‹ › da tela de
        // Cartões passavam a pular de 8 em 8 meses (a janela desliza pela
        // própria largura) — muito confuso pra quem só queria ir mês a mês.
        if (faixa) setPeriodo(periodoMes(faixa.fim.slice(0, 7))); else loadTxs();
        setPagina('extrato');
      }} />;
      default:            return <Dashboard {...pageProps} />;
    }
  };

  const PAGE_TITLES = {
    dashboard:'Dashboard', extrato:'Extrato', lancamentos:'Lançamentos',
    contas:'Contas', cartoes:'Cartões', importar:'Importar',
  };

  return (
    <div style={{ display:'flex', height:'100dvh', overflow:'hidden', background:T.bg, fontFamily:"'DM Sans',sans-serif" }}>
      <Sidebar
        pagina={pagina}
        setPagina={p => { setPagina(p); setDetalhe(null); setSideOpen(false); }}
        perfil={perfil}
        setPerfil={p => { setPerfil(p); localStorage.setItem('yf_perfil', p); setTxs([]); }}
        mobileOpen={sideOpen}
        onClose={() => setSideOpen(false)}
      />

      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
        <TopBar title={PAGE_TITLES[pagina] || 'YFFinance'} onMenuClick={() => setSideOpen(o => !o)} />
        <main style={{ flex:1, overflowY:'auto' }}>
          {renderPage()}
        </main>
      </div>

      <ModalLanc
        open={modalLanc}
        onClose={() => { setModalLanc(false); setEditTx(null); }}
        onSave={saveTx}
        contas={contas}
        cats={cats}
        cartoes={cartoes}
        onCreateConta={createContaQuick}
        onCreateCategoria={createCategoriaQuick}
        editData={editTx}
      />

      <ModalConta
        open={modalConta}
        onClose={() => { setModalConta(false); setEditConta(null); }}
        onSave={saveConta}
        editData={editConta}
      />

      <ModalCartao
        open={modalCartao}
        onClose={() => { setModalCartao(false); setEditCartao(null); }}
        onSave={saveCartao}
        contas={contas}
        onCreateConta={createContaQuick}
        editData={editCartao}
      />

      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
    </div>
  );
}
