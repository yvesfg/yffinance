import React from 'react';
import { T } from '../constants.js';
import Icon from '../components/Icon.jsx';

// Escolha do perfil. No celular os dois cartões de 200px lado a lado passavam
// da tela (cortava "Pessoal" e "Empresa" nas bordas) e o logo de 48px também;
// agora o layout mora em .yf-splash* (index.css) e empilha abaixo de 520px.
const PERFIS = [
  { perfil: 'pessoal', icon: 'user',     title: 'Pessoal', desc: 'Finanças pessoais, gastos do dia a dia e cartões' },
  { perfil: 'empresa', icon: 'building', title: 'Empresa', desc: 'YFGroup Transportes — receitas, despesas e DRE' },
];

export default function Splash({ onSelect }) {
  return (
    <div className="yf-splash">
      <div className="yf-splash__logo">
        <span style={{ color: T.txt }}>YF</span><span style={{ color: T.green }}>Finance</span>
      </div>
      <div className="yf-splash__tag">Sistema financeiro pessoal &amp; empresarial</div>
      <div className="yf-splash__opcoes">
        {PERFIS.map(({ perfil, icon, title, desc }) => (
          <button type="button" key={perfil} className="yf-splash__card" onClick={() => onSelect(perfil)}>
            <span className="yf-splash__ico"><Icon n={icon} s={22} /></span>
            <span className="yf-splash__titulo">{title}</span>
            <span className="yf-splash__desc">{desc}</span>
          </button>
        ))}
      </div>
      <div className="yf-splash__rodape">by YFGroup</div>
    </div>
  );
}
