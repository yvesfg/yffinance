# YFFinance React Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Migrar yffinance/index.html (vanilla JS) para React + Vite com sidebar responsiva, workspace switcher e design tokens centralizados.

**Architecture:** App.jsx gerencia estado global e passa via props. Lógica extraída para src/lib/. Componentes focados e pequenos. Sem Context API — projeto pequeno.

**Tech Stack:** React 18, Vite 5, Supabase (existente), CSS Variables inline

---

## Arquivos criados/modificados

| Arquivo | Responsabilidade |
|---|---|
| `package.json` | deps React + Vite |
| `vite.config.js` | configuração build |
| `index.html` | entry point Vite |
| `src/main.jsx` | monta React no DOM |
| `src/App.jsx` | estado global + roteamento |
| `src/constants.js` | THEME, BANCOS, PARSERS |
| `src/supabase.js` | helper sb() |
| `src/lib/parsers.js` | parseCSV, parseOFX, normData, normValor, detectTipo |
| `src/lib/formatters.js` | fmt, fmtD, exportCSV |
| `src/lib/dedup.js` | matchTransf |
| `src/components/Sidebar.jsx` | nav + workspace + by YFGroup |
| `src/components/TopBar.jsx` | título + hamburguer mobile |
| `src/components/Toast.jsx` | toast global |
| `src/modals/ModalLanc.jsx` | novo/editar lançamento |
| `src/modals/ModalConta.jsx` | nova/editar conta |
| `src/modals/ModalCartao.jsx` | novo/editar cartão |
| `src/modals/ModalVincular.jsx` | vincular transferência |
| `src/pages/Splash.jsx` | seletor perfil |
| `src/pages/Dashboard.jsx` | visão geral |
| `src/pages/Extrato.jsx` | histórico + filtros |
| `src/pages/Lancamentos.jsx` | lançamento manual |
| `src/pages/Contas.jsx` | gestão contas |
| `src/pages/Cartoes.jsx` | gestão cartões |
| `src/pages/Importar.jsx` | upload CSV/OFX + dedup |
| `src/pages/Pluggy.jsx` | open finance |

---

### Task 1: Backup + Scaffolding

- [ ] Backup index.html → index.html.bak_20260609
- [ ] Criar package.json com React 18 + Vite 5
- [ ] Criar vite.config.js
- [ ] Reescrever index.html como entry point Vite
- [ ] Criar src/main.jsx
- [ ] npm install
- [ ] Commit: `chore: scaffold React+Vite project`

### Task 2: Constants + Supabase + Lib

- [ ] Criar src/constants.js (THEME, BANCOS, PARSERS)
- [ ] Criar src/supabase.js (helper sb)
- [ ] Criar src/lib/parsers.js
- [ ] Criar src/lib/formatters.js
- [ ] Criar src/lib/dedup.js
- [ ] Commit: `feat: extract logic to lib modules`

### Task 3: Componentes base

- [ ] Criar src/components/Toast.jsx
- [ ] Criar src/components/TopBar.jsx
- [ ] Criar src/components/Sidebar.jsx (com colapso desktop + overlay mobile)
- [ ] Commit: `feat: base layout components`

### Task 4: Modals

- [ ] Criar src/modals/ModalLanc.jsx
- [ ] Criar src/modals/ModalConta.jsx
- [ ] Criar src/modals/ModalCartao.jsx
- [ ] Criar src/modals/ModalVincular.jsx
- [ ] Commit: `feat: modal components`

### Task 5: Pages

- [ ] Criar src/pages/Splash.jsx
- [ ] Criar src/pages/Dashboard.jsx
- [ ] Criar src/pages/Extrato.jsx
- [ ] Criar src/pages/Lancamentos.jsx
- [ ] Criar src/pages/Contas.jsx
- [ ] Criar src/pages/Cartoes.jsx
- [ ] Criar src/pages/Importar.jsx (com dedup de transferências)
- [ ] Criar src/pages/Pluggy.jsx
- [ ] Commit: `feat: all pages`

### Task 6: App.jsx + integração final

- [ ] Criar src/App.jsx completo com estado global
- [ ] Testar `npm run dev` sem erros
- [ ] Testar `npm run build` sem erros
- [ ] Commit: `feat: complete React migration`
