// ─────────────────────────────────────────────────────────
//  Categorização automática dos lançamentos importados.
//
//  Extrato de banco não traz categoria, então tudo que entrava pela
//  importação nascia sem nenhuma — e o gráfico "Gastos por Categoria" ficava
//  vazio mesmo com o mês inteiro lançado.
//
//  Duas camadas, nesta ordem:
//  1. HISTÓRICO — o que você já categorizou à mão manda. É o que faz o app
//     aprender o seu jeito de organizar, inclusive para lugares que nenhuma
//     lista genérica conheceria.
//  2. PADRÕES — uma lista de nomes comuns no Brasil, para dar valor já na
//     primeira importação, quando ainda não existe histórico nenhum.
//
//  Em ambas, só sugere; nada aqui sobrescreve categoria já preenchida.
// ─────────────────────────────────────────────────────────

const semAcento = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '');

// Ruído que todo extrato repete e que atrapalha reconhecer o estabelecimento
const RUIDO = /\b(compra|cartao|debito|credito|pagamento|pag|pix|ted|doc|transferencia|transf|enviado|enviada|recebido|recebida|boleto|deb|aut|parc|parcela|mensalidade|ref|via)\b/g;

/**
 * Reduz a descrição ao "núcleo" — o que identifica o estabelecimento.
 * "COMPRA CARTAO - POSTO SHELL 04/12 *1234" → "posto shell"
 * É essa chave que agrupa o mesmo lugar entre meses e entre bancos.
 */
export function nucleoDescricao(desc) {
  let s = semAcento(desc).toLowerCase();
  s = s.replace(/\(\s*\d{1,2}\s*\/\s*\d{1,3}\s*\)/g, ' ');   // (2/12)
  s = s.replace(/\b\d{1,2}\s*\/\s*\d{1,3}\b/g, ' ');          // 02/12
  s = s.replace(/\b\d{2}\/\d{2}(\/\d{2,4})?\b/g, ' ');        // datas
  s = s.replace(/\b\d{3,}\b/g, ' ');                          // números de doc/cartão
  s = s.replace(RUIDO, ' ');
  s = s.replace(/[^a-z0-9 ]+/g, ' ');
  return s.replace(/\s+/g, ' ').trim();
}

// Nomes canônicos batem com as categorias padrão criadas em constants.js.
// Se a categoria não existir na base do usuário, o padrão simplesmente não vale.
const PADROES = [
  { cat: 'Alimentação', tipo: 'despesa', re: /\b(ifood|rappi|restaurante|padaria|lanchonete|pizzaria|hamburgueria|burger|mcdonalds|bk|subway|starbucks|cafeteria|supermercado|atacad|assai|carrefour|sendas|pao de acucar|hortifruti|acougue|mercado(?! ?(pago|livre)))\b/ },
  { cat: 'Transporte',  tipo: 'despesa', re: /\b(uber|99app|99 pop|99pop|cabify|taxi|onibus|metro|estacionamento|zona azul|pedagio|sem parar|conectcar|veloe|posto|shell|ipiranga|petrobras|combustivel|gasolina|etanol|diesel|oficina|autopecas|pneu)\b/ },
  { cat: 'Moradia',     tipo: 'despesa', re: /\b(aluguel|condominio|energia|eletropaulo|cemig|celpe|copel|light|enel|equatorial|cemar|sabesp|caesb|cagece|agua|gas|internet|fibra|iptu)\b/ },
  { cat: 'Saúde',       tipo: 'despesa', re: /\b(farmacia|drogaria|drogaraia|droga raia|drogasil|pacheco|pague menos|hospital|clinica|laboratorio|unimed|amil|hapvida|sulamerica|dentista|psicolog|academia|smartfit)\b/ },
  { cat: 'Educação',    tipo: 'despesa', re: /\b(escola|colegio|faculdade|universidade|curso|udemy|alura|coursera|kumon|wizard|cna|fisk|livraria)\b/ },
  { cat: 'Lazer',       tipo: 'despesa', re: /\b(netflix|spotify|disney|hbo|globoplay|deezer|cinema|cinemark|steam|playstation|xbox|nintendo|ingresso|bar |pub|balada|viagem|hotel|airbnb|booking|latam|gol |azul )\b/ },
  { cat: 'Roupas',      tipo: 'despesa', re: /\b(renner|riachuelo|c&a|zara|hering|centauro|netshoes|nike|adidas|calcados|shoes|moda)\b/ },
  { cat: 'Serviços',    tipo: 'despesa', re: /\b(vivo|claro|tim|oi fixo|google|apple|microsoft|adobe|icloud|openai|anthropic|chatgpt|amazon prime|contabilidade|cartorio|correios)\b/ },
  { cat: 'Salário',     tipo: 'receita', re: /\b(salario|folha de pagamento|proventos|remuneracao|pro labore|prolabore|adiantamento salarial|decimo terceiro)\b/ },
  { cat: 'Investimentos', tipo: 'receita', re: /\b(rendimento|dividendo|jcp|juros|cdb|tesouro|aplicacao|resgate|poupanca)\b/ },
  { cat: 'Freelance',   tipo: 'receita', re: /\b(freelance|freela|prestacao de servico|nota fiscal|honorario)\b/ },
];

const tipoDaCategoria = tx =>
  tx.tipo === 'receita' ? 'receita'
  : tx.tipo === 'transferencia' ? 'transferencia'
  : 'despesa';   // 'cartao' e 'despesa' usam categorias de despesa

/**
 * Índice núcleo → categoria a partir do que já está categorizado na base.
 * Quando o mesmo lugar aparece com categorias diferentes, vence a mais usada.
 */
export function indicePorHistorico(txs) {
  const contagem = new Map();
  for (const t of txs) {
    if (!t.categoria_id) continue;
    const k = nucleoDescricao(t.descricao);
    if (k.length < 3) continue;
    if (!contagem.has(k)) contagem.set(k, new Map());
    const m = contagem.get(k);
    m.set(t.categoria_id, (m.get(t.categoria_id) || 0) + 1);
  }
  const indice = new Map();
  for (const [k, m] of contagem) {
    indice.set(k, [...m.entries()].sort((a, b) => b[1] - a[1])[0][0]);
  }
  return indice;
}

// Palavras que abrem a descrição mas não identificam ninguém sozinhas: dois
// "posto" diferentes não são o mesmo lugar.
const GENERICOS = new Set(['posto','mercado','supermercado','super','loja','lojas','farmacia','drogaria',
  'restaurante','padaria','bar','auto','centro','comercio','servicos','distribuidora','casa','pag','pagamento']);

/**
 * Casa pelos tokens INICIAIS, não pela string inteira: o mesmo lugar aparece
 * como "IFOOD *RESTAURANTE" num mês e "IFOOD *OUTRO" no outro, e comparar
 * texto completo perdia isso. Vence quem compartilha mais tokens.
 */
function buscarNoIndice(indice, nucleo) {
  if (!nucleo) return null;
  if (indice.has(nucleo)) return indice.get(nucleo);

  const tokens = nucleo.split(' ');
  let melhor = null, melhorN = 0;
  for (const [k, catId] of indice) {
    const kt = k.split(' ');
    let n = 0;
    while (n < tokens.length && n < kt.length && tokens[n] === kt[n]) n++;
    if (n === 0) continue;
    // Um token só decide quando é específico o bastante
    if (n === 1 && (GENERICOS.has(tokens[0]) || tokens[0].length < 4)) continue;
    if (n > melhorN) { melhorN = n; melhor = catId; }
  }
  return melhor;
}

/**
 * Sugere a categoria de UM lançamento. Devolve o id ou null.
 * `cats` são as categorias do usuário; nada é criado aqui.
 */
export function sugerirCategoria(tx, indice, cats) {
  if (tx.categoria_id) return tx.categoria_id;
  const tipoAlvo = tipoDaCategoria(tx);
  const daCategoria = id => cats.find(c => c.id === id);

  // 1. o que você já categorizou
  const doHistorico = buscarNoIndice(indice, nucleoDescricao(tx.descricao));
  if (doHistorico) {
    const c = daCategoria(doHistorico);
    // Só aproveita se o tipo bater — categoria de receita não serve p/ despesa
    if (c && c.tipo === tipoAlvo) return doHistorico;
  }

  // 2. padrões conhecidos
  const texto = ' ' + semAcento(tx.descricao).toLowerCase() + ' ';
  for (const p of PADROES) {
    if (p.tipo !== tipoAlvo) continue;
    if (!p.re.test(texto)) continue;
    const alvo = semAcento(p.cat).toLowerCase();
    const c = cats.find(x => x.tipo === tipoAlvo && semAcento(x.nome).toLowerCase() === alvo);
    if (c) return c.id;
  }
  return null;
}

/** Aplica a sugestão a uma lista, sem tocar em quem já tem categoria. */
export function categorizarLote(txs, indice, cats) {
  let categorizados = 0;
  const saida = txs.map(tx => {
    if (tx.categoria_id) return tx;
    const id = sugerirCategoria(tx, indice, cats);
    if (!id) return tx;
    categorizados++;
    return { ...tx, categoria_id: id };
  });
  return { txs: saida, categorizados };
}
