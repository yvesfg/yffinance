// Direção Cabine (set/2026): mesma paleta e fontes do Controle Operacional e do
// Frota Pro. Verde/vermelho seguem sendo entrada/saída; o botão principal é âmbar.
export const T = {
  bg:      '#0c0d10',
  bg2:     '#111316',
  bg3:     '#14161a',
  bg4:     '#1b1e23',
  border:  '#262a31',
  border2: '#30353d',
  border3: '#3a3f48',
  txt:     '#eceae4',
  txt2:    '#8d929c',
  txt3:    '#5d626c',
  green:   '#4fbf8b',
  green2:  '#3a9e70',
  greenGlow: 'rgba(79,191,139,.14)',
  red:     '#ef6a5b',
  red2:    '#c9503f',
  redGlow: 'rgba(239,106,91,.12)',
  blue:    '#4d8eff',
  blueGlow:'rgba(77,142,255,.12)',
  gold:    '#f2c14e',
  goldGlow:'rgba(242,193,78,.1)',
  purple:  '#9b6dff',
  purpleGlow:'rgba(155,109,255,.12)',
  radius:  '14px',
  radius2: '9px',
  radius3: '6px',
};

export const BANCOS = {
  inter:       { nome:'Inter',        logo:'https://logo.clearbit.com/inter.co',            cor:'#ff7a00' },
  bradesco:    { nome:'Bradesco',     logo:'https://logo.clearbit.com/bradesco.com.br',     cor:'#cc092f' },
  santander:   { nome:'Santander',    logo:'https://logo.clearbit.com/santander.com.br',    cor:'#ec0000' },
  itau:        { nome:'Itaú',         logo:'https://logo.clearbit.com/itau.com.br',         cor:'#003087' },
  caixa:       { nome:'Caixa',        logo:'https://logo.clearbit.com/caixa.gov.br',        cor:'#005ca9' },
  mercadopago: { nome:'Mercado Pago', logo:'https://logo.clearbit.com/mercadopago.com.br', cor:'#00b1ea' },
  revolut:     { nome:'Revolut',      logo:'https://logo.clearbit.com/revolut.com',         cor:'#0666eb' },
  picpay:      { nome:'PicPay',       logo:'https://logo.clearbit.com/picpay.com',          cor:'#21c25e' },
  nubank:      { nome:'Nubank',       logo:'https://logo.clearbit.com/nubank.com.br',       cor:'#8a05be' },
  outro:       { nome:'Outro',        logo:'',                                               cor:'#4d8eff' },
};

export const PARSERS = {
  inter:       { sep:';', iD:0, iV:3, iDesc:1, skipHeader:true },
  bradesco:    { sep:';', iD:0, iV:4, iDesc:2, skipHeader:true },
  santander:   { sep:';', iD:0, iV:3, iDesc:1, skipHeader:true },
  itau:        { sep:';', iD:0, iV:2, iDesc:1, skipHeader:true },
  caixa:       { sep:';', iD:0, iV:3, iDesc:1, skipHeader:true },
  mercadopago: { sep:';', iD:0, iV:3, iDesc:1, skipHeader:true },
  nubank:      { sep:',', iD:0, iV:2, iDesc:1, skipHeader:true },
  revolut:     { sep:',', iD:2, iV:5, iDesc:4, skipHeader:true },
  picpay:      { sep:';', iD:0, iV:2, iDesc:1, skipHeader:true },
};

export const CATS_PADRAO = [
  { nome:'Alimentação',   tipo:'despesa',       icone:'🍔' },
  { nome:'Transporte',    tipo:'despesa',       icone:'🚗' },
  { nome:'Moradia',       tipo:'despesa',       icone:'🏠' },
  { nome:'Saúde',         tipo:'despesa',       icone:'💊' },
  { nome:'Educação',      tipo:'despesa',       icone:'📚' },
  { nome:'Lazer',         tipo:'despesa',       icone:'🎮' },
  { nome:'Roupas',        tipo:'despesa',       icone:'👕' },
  { nome:'Serviços',      tipo:'despesa',       icone:'📱' },
  { nome:'Outros',        tipo:'despesa',       icone:'📦' },
  { nome:'Salário',       tipo:'receita',       icone:'💰' },
  { nome:'Freelance',     tipo:'receita',       icone:'💼' },
  { nome:'Investimentos', tipo:'receita',       icone:'📈' },
  { nome:'Outros',        tipo:'receita',       icone:'💵' },
  { nome:'Entre Contas',  tipo:'transferencia', icone:'⇄'  },
];

export const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

export const SB_URL = 'https://nxcpxnbkmdwumbdsmxpf.supabase.co';
export const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54Y3B4bmJrbWR3dW1iZHNteHBmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2NTA2MDEsImV4cCI6MjA5NjIyNjYwMX0.9iMmShZXsYxXpgYrtUPdeXN25fbRgkHvf0hWwmO5414';
