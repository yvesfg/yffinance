// ─────────────────────────────────────────────────────────
//  Período de análise. O app carregava sempre o MÊS corrente e nada mais:
//  quem importava um extrato de janeiro a junho em agosto via a tela vazia,
//  sem nenhum sinal de que os dados estavam lá.
//
//  Um período é sempre { tipo, inicio, fim } em datas ISO, e é isso que vai
//  para o filtro do PostgREST. `ref` guarda o mês/ano de origem para as setas
//  ‹ › saberem andar.
// ─────────────────────────────────────────────────────────

const MESES_LONGOS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

const pad = n => String(n).padStart(2, '0');
const iso = (a, m, d) => `${a}-${pad(m)}-${pad(d)}`;
const ultimoDia = (a, m) => new Date(a, m, 0).getDate();

export const mesDeHoje = () => new Date().toISOString().slice(0, 7);

export function periodoMes(ym) {
  const [a, m] = ym.split('-').map(Number);
  return { tipo: 'mes', ref: ym, inicio: iso(a, m, 1), fim: iso(a, m, ultimoDia(a, m)) };
}

export function periodoTrimestre(ano, tri) {
  const m0 = (tri - 1) * 3 + 1;
  return { tipo: 'trimestre', ref: `${ano}-${pad(tri)}`, inicio: iso(ano, m0, 1), fim: iso(ano, m0 + 2, ultimoDia(ano, m0 + 2)) };
}

export function periodoAno(ano) {
  return { tipo: 'ano', ref: String(ano), inicio: iso(ano, 1, 1), fim: iso(ano, 12, 31) };
}

export function periodoLivre(inicio, fim) {
  return { tipo: 'livre', ref: `${inicio}..${fim}`, inicio, fim };
}

/** Anda um período para trás (-1) ou para frente (+1), mantendo o tipo. */
export function moverPeriodo(p, d) {
  if (p.tipo === 'mes') {
    const [a, m] = p.ref.split('-').map(Number);
    const dt = new Date(a, m - 1 + d, 1);
    return periodoMes(`${dt.getFullYear()}-${pad(dt.getMonth() + 1)}`);
  }
  if (p.tipo === 'trimestre') {
    const [a, t] = p.ref.split('-').map(Number);
    const total = (a * 4 + (t - 1)) + d;
    return periodoTrimestre(Math.floor(total / 4), (total % 4) + 1);
  }
  if (p.tipo === 'ano') return periodoAno(Number(p.ref) + d);
  // Livre: desloca a janela inteira pela própria duração
  const dias = Math.max(1, Math.round((new Date(p.fim) - new Date(p.inicio)) / 86400000) + 1);
  const desloca = (s, n) => new Date(new Date(s).getTime() + n * 86400000).toISOString().slice(0, 10);
  return periodoLivre(desloca(p.inicio, d * dias), desloca(p.fim, d * dias));
}

export function rotuloPeriodo(p) {
  if (p.tipo === 'mes') {
    const [a, m] = p.ref.split('-').map(Number);
    return `${MESES_LONGOS[m - 1]} ${a}`;
  }
  if (p.tipo === 'trimestre') { const [a, t] = p.ref.split('-').map(Number); return `${t}º trimestre ${a}`; }
  if (p.tipo === 'ano') return `Ano de ${p.ref}`;
  const br = s => s.split('-').reverse().join('/');
  return `${br(p.inicio)} a ${br(p.fim)}`;
}

/** Mês de referência do período — para blocos que raciocinam por mês. */
export const mesDoPeriodo = p => (p.tipo === 'mes' ? p.ref : p.fim.slice(0, 7));

export const dentroDoPeriodo = (data, p) => {
  const d = String(data).slice(0, 10);
  return d >= p.inicio && d <= p.fim;
};
