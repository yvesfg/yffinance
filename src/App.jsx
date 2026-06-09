import React, { useState, useEffect, useCallback } from 'react';
import { T } from './constants.js';
import { sb } from './supabase.js';
import { supabase } from './lib/supabaseClient.js';

import Login from './pages/Login.jsx';
import Splash from './pages/Splash.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Extrato from './pages/Extrato.jsx';
import Lancamentos from './pages/Lancamentos.jsx';
import Contas from './pages/Contas.jsx';
import Cartoes from './pages/Cartoes.jsx';
import Importar from './pages/Importar.jsx';
import Pluggy from './pages/Pluggy.jsx';

import Sidebar from './components/Sidebar.jsx';
import TopBar from './components/TopBar.jsx';
import Toast from './components/Toast.jsx';

import ModalLanc from './modals/ModalLanc.jsx';
import ModalConta from './modals/ModalConta.jsx';
import ModalCartao from './modals/ModalCartao.jsx';

const hoje = () => new Date().toISOString().slice(0, 7);

export default function App() {
  const [session, setSession]     = useState(undefined); // undefined = carregando
  const [perfil, setPerfil]       = useState(() => localStorage.getItem('yf_perfil') || null);
  const [pagina, setPagina]       = useState('dashboard');
  const [mesAtual, setMesAtual]   = useState(hoje);
  const [sideOpen, setSideOpen]   = useState(false);

  const [txs, setTxs]         = useState([]);
  const [contas, setContas]   = useState([]);
  const [cats, setCats]       = useState([]);
  const [cartoes, setCartoes] = useState([]);

  // Auth: ouvir mudanças de sessão
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => setSession(s ?? null));
    return () => subscription.unsubscribe();
  }, []);

  const [toast, setToast]         = useState(null);
  const [editTx, setEditTx]       = useState(null);
  const [modalLanc, setModalLanc] = useState(false);
  const [editConta, setEditConta] = useState(null);
  const [modalConta, setModalConta] = useState(false);
  const [editCartao, setEditCartao] = useState(null);
  const [modalCartao, setModalCartao] = useState(false);

  const showToast = (msg, type = 'success') => setToast({ msg, type });

  const loadTxs = useCallback(async () => {
    if (!perfil) return;
    const [ano, mes] = mesAtual.split('-');
    const inicio = `${ano}-${mes}-01`;
    const fim    = new Date(Number(ano), Number(mes), 0).toISOString().slice(0, 10);
    const data = await sb(`cf_transacoes?perfil=eq.${perfil}&data=gte.${inicio}&data=lte.${fim}&order=data.desc,id.desc`);
    setTxs(data || []);
  }, [perfil, mesAtual]);

  const loadContas = useCallback(async () => {
    if (!perfil) return;
    const data = await sb(`cf_contas?perfil=eq.${perfil}&order=nome.asc`);
    setContas(data || []);
  }, [perfil]);

  const loadCats = useCallback(async () => {
    if (!perfil) return;
    const data = await sb(`cf_categorias?perfil=eq.${perfil}&order=nome.asc`);
    setCats(data || []);
  }, [perfil]);

  const loadCartoes = useCallback(async () => {
    if (!perfil) return;
    const data = await sb(`cf_cartoes?perfil=eq.${perfil}&order=nome.asc`);
    setCartoes(data || []);
  }, [perfil]);

  useEffect(() => {
    if (perfil) { loadTxs(); loadContas(); loadCats(); loadCartoes(); }
  }, [perfil, mesAtual]);

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
    } catch { showToast('Erro ao salvar lançamento', 'error'); }
  };

  const deleteTx = async id => {
    try {
      await sb('cf_transacoes', 'DELETE', null, `id=eq.${id}`);
      await loadTxs(); showToast('Lançamento excluído');
    } catch { showToast('Erro ao excluir', 'error'); }
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
    } catch { showToast('Erro ao salvar conta', 'error'); }
  };

  const deleteConta = async id => {
    try {
      await sb('cf_contas', 'DELETE', null, `id=eq.${id}`);
      await loadContas(); showToast('Conta excluída');
    } catch { showToast('Erro ao excluir conta', 'error'); }
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
    } catch { showToast('Erro ao salvar cartão', 'error'); }
  };

  const deleteCartao = async id => {
    try {
      await sb('cf_cartoes', 'DELETE', null, `id=eq.${id}`);
      await loadCartoes(); showToast('Cartão excluído');
    } catch { showToast('Erro ao excluir cartão', 'error'); }
  };

  // Aguardar verificação de sessão
  if (session === undefined) return (
    <div style={{ position:'fixed', inset:0, background:T.bg, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:13, color:T.txt3 }}>carregando...</div>
    </div>
  );

  // Não autenticado → tela de login
  if (!session) return <Login />;

  // Autenticado mas sem perfil → splash de seleção
  if (!perfil) return <Splash onSelect={selectPerfil} />;

  const pageProps = { txs, contas, cats, cartoes, mesAtual, setMesAtual, loadTxs, perfil };

  const renderPage = () => {
    switch (pagina) {
      case 'dashboard':   return <Dashboard {...pageProps} />;
      case 'extrato':     return <Extrato {...pageProps} onEdit={openEditTx} onDelete={deleteTx} />;
      case 'lancamentos': return <Lancamentos {...pageProps} onNew={openNewTx} onEdit={openEditTx} onDelete={deleteTx} />;
      case 'contas':      return <Contas contas={contas} txs={txs} onNew={() => { setEditConta(null); setModalConta(true); }} onEdit={c => { setEditConta(c); setModalConta(true); }} onDelete={deleteConta} />;
      case 'cartoes':     return <Cartoes cartoes={cartoes} txs={txs} contas={contas} onNew={() => { setEditCartao(null); setModalCartao(true); }} onEdit={c => { setEditCartao(c); setModalCartao(true); }} onDelete={deleteCartao} />;
      case 'importar':    return <Importar contas={contas} cats={cats} perfil={perfil} onToast={showToast} onDone={() => { loadTxs(); setPagina('extrato'); }} />;
      case 'pluggy':      return <Pluggy contas={contas} cats={cats} perfil={perfil} onToast={showToast} onDone={() => { loadTxs(); setPagina('extrato'); }} />;
      default:            return <Dashboard {...pageProps} />;
    }
  };

  const PAGE_TITLES = {
    dashboard:'Dashboard', extrato:'Extrato', lancamentos:'Lançamentos',
    contas:'Contas', cartoes:'Cartões', importar:'Importar', pluggy:'Open Finance',
  };

  return (
    <div style={{ display:'flex', height:'100vh', overflow:'hidden', background:T.bg, fontFamily:"'DM Sans',sans-serif" }}>
      <Sidebar
        pagina={pagina}
        setPagina={p => { setPagina(p); setSideOpen(false); }}
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
        editData={editCartao}
      />

      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
    </div>
  );
}
