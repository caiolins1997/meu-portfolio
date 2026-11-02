// Configurações (somente administrador): equipe, dados da empresa, metas de comissão, backup e auditoria.
import { BASE, api, esc, tabs, campos, lerForm, toast, falha, getConfig, saveConfig, isAdmin, modal, state, dataHora } from '../core.js';
import { cabecalho } from '../app.js';

let aba = 'equipe';

export async function render(el) {
  if (!isAdmin()) { el.innerHTML = '<div class="card">Acesso restrito ao administrador.</div>'; return; }
  const cfg = await getConfig(true);
  el.innerHTML = cabecalho('Configurações', 'Equipe e acessos, dados da empresa usados nos documentos, metas de comissão, backup e auditoria.', '', 'Administração')
    + tabs([['equipe', 'Equipe & acessos'], ['empresa', 'Empresa'], ['comissao', 'Comissões & metas'], ['backup', 'Backup & auditoria']], aba) + '<div id="c"></div>';
  el.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { aba = b.dataset.tab; render(el); });
  const box = el.querySelector('#c');

  if (aba === 'equipe') {
    const users = await api('/api/users');
    delete state.cache._users;
    box.innerHTML = `<div class="card"><div class="row between"><h2 style="margin:0">Usuários</h2><button class="btn neon sm" id="nu">+ Usuário</button></div>
      <table class="t" style="margin-top:12px"><tr><th>Nome</th><th>E-mail</th><th>Papel</th><th>Status</th><th></th></tr>
      ${users.map(u => `<tr><td><b>${esc(u.nome)}</b></td><td>${esc(u.email)}</td><td><span class="badge ${u.papel === 'admin' ? 'lime' : ''}">${u.papel === 'admin' ? 'Administrador' : 'Colaborador'}</span></td><td>${u.ativo ? '<span class="badge green">ativo</span>' : '<span class="badge red">inativo</span>'}</td>
        <td><button class="btn xs" data-ed="${u.id}">Editar</button></td></tr>`).join('')}</table>
      <p class="small faint" style="margin-top:10px">Colaboradores atendem, conferem e preparam tudo; aprovar parecer, protocolar e alterar configurações são ações exclusivas do administrador.</p></div>`;
    box.querySelector('#nu').onclick = async () => {
      await modal({
        titulo: 'Novo usuário', corpo: `<div class="grid g2">${campos([{ k: 'nome', l: 'Nome', req: true }, { k: 'email', l: 'E-mail', tipo: 'email', req: true }, { k: 'senha', l: 'Senha inicial (mín. 8)', tipo: 'password', req: true }, { k: 'papel', l: 'Papel', tipo: 'select', opcoes: [['colaborador', 'Colaborador'], ['admin', 'Administrador']] }])}</div>`,
        acoes: [{ label: 'Cancelar' }, { label: 'Criar', cls: 'neon', onClick: async (b) => { await api('/api/users', { method: 'POST', body: lerForm(b) }); toast('Usuário criado.'); render(el); } }],
      });
    };
    box.querySelectorAll('[data-ed]').forEach(b => b.onclick = async () => {
      const u = users.find(x => String(x.id) === b.dataset.ed);
      await modal({
        titulo: u.nome, corpo: `<div class="grid g2">${campos([{ k: 'nome', l: 'Nome' }, { k: 'papel', l: 'Papel', tipo: 'select', opcoes: [['colaborador', 'Colaborador'], ['admin', 'Administrador']] }, { k: 'senha', l: 'Nova senha (opcional)', tipo: 'password' }, { k: 'ativo', l: 'Acesso ativo', tipo: 'check' }], { ...u, ativo: !!u.ativo })}</div>`,
        acoes: [{ label: 'Cancelar' }, { label: 'Salvar', cls: 'neon', onClick: async (bb) => { const d = lerForm(bb); if (!d.senha) delete d.senha; await api(`/api/users/${u.id}`, { method: 'PUT', body: d }); toast('Usuário atualizado.'); render(el); } }],
      });
    });
  } else if (aba === 'empresa') {
    const e = cfg.empresa || {};
    box.innerHTML = `<div class="card"><h2>Dados da empresa (usados em contratos, procurações e rodapés)</h2><div class="grid g3">${campos([
      { k: 'nome', l: 'Nome fantasia' }, { k: 'razao', l: 'Razão social (CNPJ)' }, { k: 'cnpj', l: 'CNPJ' },
      { k: 'enderecoContratual', l: 'Endereço do CNPJ (contratos/fiscal — D2)', cls: 'span2' }, { k: 'enderecoInstitucional', l: 'Referência institucional (site/prospecção — D2)' },
      { k: 'whatsapp', l: 'WhatsApp oficial (com DDD)' }, { k: 'email', l: 'E-mail oficial' }, { k: 'site', l: 'Site' },
      { k: 'diretor', l: 'Sócio-Administrador / Diretor Técnico' }, { k: 'diretorQualificacao', l: 'Qualificação na procuração', cls: 'span2' }], e)}</div>
      <label class="f" style="margin-top:12px"><span>Link público do formulário de análise</span><input name="linkFormulario" value="${esc(cfg.linkFormulario || `${location.origin}/formulario`)}"></label>
      <button class="btn neon" id="sv" style="margin-top:14px">Salvar</button></div>`;
    box.querySelector('#sv').onclick = async () => {
      const d = lerForm(box);
      const { linkFormulario, ...empresa } = d;
      try { await saveConfig({ empresa: { ...e, ...empresa }, linkFormulario }); toast('Dados salvos.'); } catch (er) { falha(er); }
    };
  } else if (aba === 'comissao') {
    const c = cfg.comissao || {};
    box.innerHTML = `<div class="grid g2"><div class="card"><h2>Faixas mensais (sobre honorário líquido)</h2><div class="stack" id="fx">${(c.faixas || []).map((f, i) => `<div class="row"><label class="f" style="flex:1"><span>Até (R$) — vazio = sem limite</span><input data-ate="${i}" value="${f.ate ?? ''}"></label><label class="f" style="width:110px"><span>%</span><input data-pct="${i}" type="number" value="${f.pct}"></label></div>`).join('')}</div></div>
      <div class="card"><h2>Regras</h2><div class="grid g2">${campos([
        { k: 'metaTrimestral', l: 'Meta trimestral (R$)', tipo: 'number' }, { k: 'bonusTrimestral', l: 'Bônus trimestral (p.p.)', tipo: 'number' },
        { k: 'tetoPct', l: 'Teto (%)', tipo: 'number' }, { k: 'taxaPadraoAsaas', l: 'Taxa padrão Asaas (%)', tipo: 'number', step: '0.01' },
        { k: 'regraBoleto', l: 'Liberação no boleto parcelado', tipo: 'select', opcoes: [['proporcional', 'Proporcional a cada parcela paga'], ['50-50', '50% na entrada + 50% na 2ª parcela']], cls: 'span2' }], c)}</div></div></div>
      <button class="btn neon" id="sv" style="margin-top:14px">Salvar regras de comissão</button>`;
    box.querySelector('#sv').onclick = async () => {
      const faixas = (c.faixas || []).map((_, i) => ({ ate: box.querySelector(`[data-ate="${i}"]`).value.trim() === '' ? null : +box.querySelector(`[data-ate="${i}"]`).value, pct: +box.querySelector(`[data-pct="${i}"]`).value }));
      const d = lerForm(box.querySelector('.card:last-child'));
      await saveConfig({ comissao: { ...c, faixas, metaTrimestral: +d.metaTrimestral, bonusTrimestral: +d.bonusTrimestral, tetoPct: +d.tetoPct, taxaPadraoAsaas: +d.taxaPadraoAsaas, regraBoleto: d.regraBoleto } });
      toast('Regras salvas.');
    };
  } else {
    const log = await api('/api/log');
    box.innerHTML = `<div class="card"><h2>Backup</h2><p class="sub">Baixe uma cópia completa dos dados (JSON). Os arquivos enviados ficam no volume do servidor.</p><a class="btn neon" href="${BASE}/api/backup">Baixar backup agora</a></div>
      <div class="card"><h2>Auditoria (últimas 400 ações)</h2><div class="table-wrap"><table class="t"><tr><th>Quando</th><th>Usuário</th><th>Ação</th><th>Coleção</th><th>Resumo</th></tr>
      ${log.map(l => `<tr><td class="nowrap small">${dataHora(l.em + 'Z')}</td><td class="small">${esc(l.usuario)}</td><td>${esc(l.acao)}</td><td class="mono small">${esc(l.col || '')}</td><td class="small faint">${esc(l.resumo || '')}</td></tr>`).join('')}</table></div></div>`;
  }
}
