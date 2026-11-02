import { api, state, esc, iniciais, toast, falha, modal, lerForm, campos, store, isAdmin, getConfig } from './core.js';
import { diasRestantes } from './lib/prazos.js';

const NAV = [
  ['Visão geral', [['painel', '◈', 'Painel']]],
  ['Comercial', [
    ['prospeccao', '✉', 'Prospecção · Etapas 1–2'],
    ['funil', '▦', 'Funil comercial · Kanban'],
    ['mensagens', '☏', 'Playbook de mensagens'],
    ['precos', '¤', 'Preços & propostas'],
  ]],
  ['Técnico INPI', [
    ['analises', '⌕', 'Análises de viabilidade', 'b-analises'],
    ['clientes', '◉', 'Clientes & protocolo'],
    ['carteira', '▤', 'Carteira INPI · Processos'],
    ['vigilancia', '◎', 'Vigilância RPI', 'b-colid'],
    ['prazos', '⏱', 'Prazos INPI', 'b-prazos'],
  ]],
  ['Gestão', [
    ['financeiro', '$', 'Financeiro & comissões'],
    ['tarefas', '☰', 'Tarefas da equipe'],
    ['documentos', '⎙', 'Modelos de documentos'],
  ]],
  ['Conhecimento', [
    ['fluxo', '↯', 'Fluxo operacional & mapa'],
    ['manual', '✦', 'Manual & playbook de vendas'],
    ['institucional', '⌂', 'Institucional & LGPD'],
  ]],
];

const VIEWS = {
  painel: () => import('./views/painel.js'),
  prospeccao: () => import('./views/prospeccao.js'),
  funil: () => import('./views/funil.js'),
  mensagens: () => import('./views/mensagens.js'),
  precos: () => import('./views/precos.js'),
  analises: () => import('./views/analises.js'),
  clientes: () => import('./views/clientes.js'),
  carteira: () => import('./views/carteira.js'),
  vigilancia: () => import('./views/vigilancia.js'),
  prazos: () => import('./views/prazos.js'),
  financeiro: () => import('./views/financeiro.js'),
  tarefas: () => import('./views/tarefas.js'),
  documentos: () => import('./views/documentos.js'),
  fluxo: () => import('./views/fluxo.js'),
  manual: () => import('./views/manual.js'),
  institucional: () => import('./views/institucional.js'),
  config: () => import('./views/config.js'),
};

const root = document.getElementById('root');

function telaLogin() {
  root.innerHTML = `<div class="login-wrap"><div class="login card" style="padding:30px">
    <div class="brand" style="padding:0"><div class="logo">V</div><div><b>Vora</b><small>Propriedade Industrial</small></div></div>
    <h1>Sistema de <span class="grad">gestão</span> Vora</h1>
    <p class="muted" style="margin:0 0 20px">Acesso restrito à equipe.</p>
    <form id="fl" class="stack">
      <label class="f"><span>E-mail</span><input name="email" type="email" autocomplete="username" required></label>
      <label class="f"><span>Senha</span><input name="senha" type="password" autocomplete="current-password" required></label>
      <button class="btn neon" style="margin-top:6px">Entrar</button>
    </form>
    <div class="sys-tag" style="margin-top:20px"><span class="dot pulse"></span>Conexão segura · LGPD</div>
  </div></div>`;
  root.querySelector('#fl').onsubmit = async (e) => {
    e.preventDefault();
    try {
      state.user = await api('/api/login', { method: 'POST', body: lerForm(e.target) });
      location.hash = '#/painel';
      iniciar();
    } catch (er) { falha(er); }
  };
}

function layout() {
  root.innerHTML = `<div class="app">
    <aside class="side" id="side">
      <div class="brand"><div class="logo">V</div><div><b>Vora</b><small>Propriedade Industrial</small></div></div>
      <nav class="nav">${NAV.map(([g, itens]) => `<div class="nav-group">${g}</div>${itens.map(([id, ic, label, badge]) =>
        `<a href="#/${id}" data-nav="${id}"><span class="ic">${ic}</span>${label}${badge ? `<span class="badge n" id="${badge}" hidden></span>` : ''}</a>`).join('')}`).join('')}
        ${isAdmin() ? `<div class="nav-group">Administração</div><a href="#/config" data-nav="config"><span class="ic">⚙</span>Configurações</a>` : ''}
      </nav>
      <div class="side-foot">
        <div class="user-chip"><div class="avatar">${esc(iniciais(state.user.nome))}</div><div><div>${esc(state.user.nome)}</div><div class="faint tiny mono">${state.user.papel === 'admin' ? 'ADMIN · CEO' : 'COLABORADOR'}</div></div></div>
        <div class="row"><button class="btn sm" id="b-senha">Alterar senha</button><button class="btn sm ghost" id="b-sair">Sair</button></div>
      </div>
    </aside>
    <main class="main" id="main"></main>
  </div>`;
  root.querySelector('#b-sair').onclick = async () => { await api('/api/logout', { method: 'POST' }); state.user = null; state.cache = {}; telaLogin(); };
  root.querySelector('#b-senha').onclick = trocarSenha;
}

async function trocarSenha() {
  await modal({
    titulo: 'Alterar senha',
    corpo: `<div class="grid g2">${campos([{ k: 'atual', l: 'Senha atual', tipo: 'password', req: true }, { k: 'nova', l: 'Nova senha (mín. 8)', tipo: 'password', req: true }])}</div>`,
    acoes: [{ label: 'Cancelar' }, { label: 'Salvar', cls: 'neon', onClick: async (b) => { await api('/api/me/senha', { method: 'POST', body: lerForm(b) }); toast('Senha alterada.'); } }],
  });
}

export function cabecalho(titulo, desc = '', acoes = '', tag = '') {
  return `<div class="topbar"><div class="row" style="align-items:flex-start;gap:12px">
    <button class="btn icon burger" data-burger aria-label="Menu">☰</button>
    <div>${tag ? `<div class="sys-tag"><span class="dot"></span>${tag}</div>` : ''}<h1>${titulo}</h1>${desc ? `<p>${desc}</p>` : ''}</div></div>
    <div class="row">${acoes}</div></div>`;
}

async function atualizarBadges() {
  try {
    const [an, pr, co] = await Promise.all([store.list('analises', true), store.list('prazos', true), store.list('colidencias', true)]);
    const set = (id, n) => { const b = document.getElementById(id); if (b) { b.textContent = n; b.hidden = !n; b.className = 'badge n ' + (n ? 'lime' : ''); } };
    set('b-analises', an.filter(a => a.status === (isAdmin() ? 'aguardando_caio' : 'revisao_colaborador')).length);
    set('b-prazos', pr.filter(p => !['cumprido', 'cancelado'].includes(p.status) && (diasRestantes(p.dataFatal) ?? 0) <= 7).length);
    set('b-colid', co.filter(c => c.status === 'detectada').length);
  } catch { /* badges são opcionais */ }
}

let renderId = 0;
async function rotear() {
  if (!state.user) return telaLogin();
  const [, rota = 'painel', ...params] = (location.hash || '#/painel').split('/');
  const nome = VIEWS[rota] ? rota : 'painel';
  if (!document.getElementById('main')) layout();
  document.querySelectorAll('[data-nav]').forEach(a => a.classList.toggle('on', a.dataset.nav === nome));
  document.getElementById('side')?.classList.remove('open');
  const main = document.getElementById('main');
  const meu = ++renderId;
  main.innerHTML = '<div class="muted" style="padding:40px 0">Carregando…</div>';
  try {
    const mod = await VIEWS[nome]();
    if (meu !== renderId) return;
    await mod.render(main, params.map(decodeURIComponent));
    window.scrollTo(0, 0);
  } catch (e) {
    console.error(e);
    main.innerHTML = `<div class="card"><h2>Não foi possível carregar esta tela</h2><p class="muted">${esc(e.message)}</p></div>`;
  }
  atualizarBadges();
}

document.addEventListener('click', (e) => {
  if (e.target.closest('[data-burger]')) document.getElementById('side')?.classList.toggle('open');
});
window.addEventListener('hashchange', rotear);
window.addEventListener('vora:refresh', rotear);

async function iniciar() {
  try { state.user = state.user || await api('/api/me'); } catch { state.user = null; }
  if (!state.user) return telaLogin();
  await getConfig().catch(() => null);
  layout();
  rotear();
}
iniciar();
