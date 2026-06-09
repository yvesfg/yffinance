# YFFinance — Migração HTML → React + Vite
**Data:** 2026-06-09  
**Status:** Aprovado para implementação

---

## 1. Objetivo

Migrar o `yffinance/index.html` (vanilla JS, ~1350 linhas) para um projeto React + Vite estruturado, responsivo, de fácil manutenção, mantendo toda a lógica já implementada (importação CSV/OFX, deduplicação de transferências, Supabase, Pluggy).

---

## 2. Stack

| Camada | Tecnologia | Motivo |
|---|---|---|
| Framework | React 18 | Mesmo stack do controle-operacional |
| Build | Vite 5 | Dev server <2s, HMR instantâneo |
| Estilo | CSS Variables + inline styles | Zero dependência, tokens centralizados |
| Backend | Supabase (existente) | Sem alteração |
| Deploy | Vercel (existente) | Sem alteração |

---

## 3. Identidade Visual

### Tokens centralizados em `src/constants.js`

```js
export const THEME = {
  // Backgrounds
  bg:      '#08090d',   // fundo principal
  bg2:     '#0e1018',   // sidebar, cards
  bg3:     '#141720',   // inputs, hover
  bg4:     '#1a1e2a',   // dropdown, popover

  // Borders
  border:  '#1e2335',
  border2: '#242b3d',

  // Text
  txt:     '#eef0f8',
  txt2:    '#7b85a0',
  txt3:    '#3d4560',

  // Brand — extraído do logo
  green:   '#05d49b',   // accent principal (Finance verde)
  green2:  '#03a878',   // hover do accent

  // Semânticos
  red:     '#f04f6e',
  blue:    '#4d8eff',
  gold:    '#f7c645',
  purple:  '#9b6dff',

  // Radius
  radius:  '14px',
  radius2: '9px',
  radius3: '6px',
};
```

### Logo / Branding
- **"YF"** → `color: #eef0f8`, `font-weight: 800`
- **"Finance"** → `color: #05d49b`, `font-weight: 800`
- **"SISTEMA FINANCEIRO PESSOAL & EMPRESARIAL"** → uppercase, `letter-spacing: 3px`, `color: #3d4560`
- **"by YFGroup"** → canto inferior da sidebar, `font-size: 10px`, `color: #3d4560`

---

## 4. Estrutura de Arquivos

```
yffinance/
├── index.html
├── vite.config.js
├── package.json
└── src/
    ├── main.jsx              # entry point
    ├── App.jsx               # router de páginas + estado global
    ├── constants.js          # THEME, BANCOS, PARSERS
    ├── supabase.js           # helper sb()
    ├── lib/
    │   ├── parsers.js        # parseCSV, parseOFX, normData, normValor, detectTipo
    │   ├── formatters.js     # fmt (moeda), fmtD (data), exportCSV
    │   └── dedup.js          # matchTransf (lógica de deduplicação)
    ├── components/
    │   ├── Sidebar.jsx       # nav + workspace switcher + "by YFGroup"
    │   ├── TopBar.jsx        # título da página + hamburger (mobile)
    │   └── Toast.jsx         # toast global
    ├── modals/
    │   ├── ModalLanc.jsx     # novo/editar lançamento
    │   ├── ModalConta.jsx    # nova/editar conta
    │   ├── ModalCartao.jsx   # novo/editar cartão
    │   └── ModalVincular.jsx # vincular transferência (pós-import)
    └── pages/
        ├── Splash.jsx        # seletor de perfil inicial
        ├── Dashboard.jsx
        ├── Extrato.jsx
        ├── Lancamentos.jsx
        ├── Contas.jsx
        ├── Cartoes.jsx
        ├── Importar.jsx
        └── Pluggy.jsx
```

---

## 5. Sidebar Responsiva

### Desktop (≥ 768px)
- Largura expandida: **228px** com nome, ícone e label
- Botão `‹` para colapsar → **56px** (só ícones, tooltip no hover)
- Estado persistido em `localStorage`

### Mobile (< 768px)
- Sidebar **oculta por padrão**
- `TopBar` exibe botão hamburguer `☰`
- Ao clicar → sidebar abre como **overlay** com backdrop semi-transparente
- Fechar: clique fora, ou navegar para uma página

### Workspace Switcher (dentro da Sidebar)
```
┌─────────────────────────┐
│ YFFinance               │
│ [👤 Pessoal          ↕] │  ← clique troca para Empresa
└─────────────────────────┘
```
- Troca o `perfil` no estado global → todos os dados refiltram automaticamente
- Preparado para OAuth: quando implementado, cada perfil poderá ter login próprio

---

## 6. Navegação (páginas)

| Ícone | Label | Rota (estado) |
|---|---|---|
| ◈ | Dashboard | dashboard |
| ≡ | Extrato | extrato |
| ⊕ | Lançamentos | lancamentos |
| — | *separador* | — |
| ⊞ | Contas | contas |
| ▣ | Cartões | cartoes |
| — | *separador* | — |
| ⚡ | Open Finance | pluggy |
| ↑ | Importar | importar |

Ícones SVG inline (sem lib externa), mesmo padrão do controle-operacional.

---

## 7. Estado Global (App.jsx)

```js
const [perfil, setPerfil]     // 'pessoal' | 'empresa'
const [pag, setPag]           // página ativa
const [sidebarOpen, setSidebarOpen]     // mobile overlay
const [sidebarCollapsed, setSidebarCollapsed]  // desktop collapse
const [contas, setContas]
const [cartoes, setCartoes]
const [cats, setCats]
const [txs, setTxs]
const [mesAtual, setMesAtual]
const [impPreview, setImpPreview]
const [vincFila, setVincFila]
```

Passado via props (sem Context API — projeto pequeno, sem over-engineering).

---

## 8. Lógica Preservada (sem reescrita)

Toda a lógica existente será **extraída do HTML e modularizada**, não reescrita:
- `parsers.js` ← `parseCSV()`, `parseOFX()`, `normData()`, `normValor()`, `detectTipo()`
- `dedup.js` ← `matchTransf()` (correção de duplicidade de transferências)
- `formatters.js` ← `fmt()`, `fmtD()`, `exportCSV()`
- `supabase.js` ← `sb()` helper existente

---

## 9. O que NÃO está no escopo desta migração

- Autenticação OAuth (próxima fase)
- Internacionalização
- Testes automatizados
- PWA / offline mode

---

## 10. Critério de conclusão

- [ ] `npm run dev` sobe sem erros
- [ ] Sidebar colapsa no desktop, abre como overlay no mobile
- [ ] Workspace switcher Pessoal/Empresa funciona
- [ ] Todas as 8 páginas renderizam
- [ ] Import CSV (Mercado Pago e Inter) funciona com deduplicação
- [ ] Deploy na Vercel sem alteração no `vercel.json`
