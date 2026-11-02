// Módulo 5.1 — Gestão de prazos do INPI: recebe a publicação (RPI/e-mail), cadastra, revisa a contagem,
// delega ao responsável e acompanha até o protocolo final.
import { store, esc, br, tabs, kanban, modal, campos, lerForm, toast, getConfig, saveConfig, isAdmin } from '../core.js';
import { cabecalho } from '../app.js';
import { STATUS_PRAZO, badgePrazo } from '../lib/dominio.js';
import { REGRAS_PADRAO, calcularPrazo, diasRestantes, feriados } from '../lib/prazos.js';
import { nomesEquipe } from './comum.js';

let aba = 'lista';

export async function render(el) {
  const [prazos, processos, cfg, equipe] = await Promise.all([store.list('prazos', true), store.list('processos'), getConfig(), nomesEquipe()]);
  const regras = cfg.regrasPrazo || REGRAS_PADRAO;
  const extras = cfg.feriadosExtras || [];
  const ativos = prazos.filter(p => !['cumprido', 'cancelado'].includes(p.status)).sort((a, b) => String(a.dataFatal).localeCompare(String(b.dataFatal)));
  const venc7 = ativos.filter(p => (diasRestantes(p.dataFatal) ?? 0) <= 7).length;
  el.innerHTML = cabecalho('Prazos INPI', 'Contagem pela LPI (arts. 221–222: prazos contínuos, exclui o dia do começo e inclui o do vencimento; vencimento em dia sem expediente prorroga para o próximo dia útil). Prazos criados pela RPI entram como “a revisar”.',
    '<button class="btn neon" data-a="novo">+ Prazo</button>', `Módulo 5 · ${ativos.length} ativos · ${venc7} em até 7 dias`)
    + tabs([['lista', 'Agenda de prazos'], ['kanban', 'Kanban de execução'], ['calc', 'Calculadora & regras']], aba) + '<div id="c"></div>';
  el.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { aba = b.dataset.tab; render(el); });
  el.querySelector('[data-a=novo]').onclick = async () => { if (await editar({}, { processos, regras, extras, equipe })) render(el); };
  const box = el.querySelector('#c');
  const abrir = async (p) => { if (await editar(p, { processos, regras, extras, equipe })) render(el); };

  if (aba === 'lista') {
    box.innerHTML = `<div class="card"><div class="table-wrap"><table class="t"><thead><tr><th>Data fatal</th><th>Restam</th><th>Prazo</th><th>Processo / marca</th><th>Publicação</th><th>Responsável</th><th>Status</th></tr></thead><tbody>
      ${ativos.map(p => `<tr class="click" data-id="${p.id}"><td class="mono nowrap"><b>${esc(br(p.dataFatal))}</b></td><td>${badgePrazo(diasRestantes(p.dataFatal))}</td><td>${esc(p.tipoNome || p.tipo)}</td>
        <td><span class="mono">${esc(p.numero || '')}</span> · <b>${esc(p.marca || '')}</b></td><td class="small">RPI ${esc(p.rpi || '—')} · ${esc(br(p.dataPublicacao))}</td>
        <td>${esc(p.responsavel || '—')}</td><td><span class="badge ${p.status === 'revisar' ? 'amber' : ''}">${esc(STATUS_PRAZO.find(s => s.id === p.status)?.titulo || p.status)}</span></td></tr>`).join('')
        || '<tr><td colspan="7"><div class="empty">Nenhum prazo em aberto. 🎉</div></td></tr>'}</tbody></table></div></div>
      ${prazos.length > ativos.length ? `<details class="card"><summary class="muted">Histórico (${prazos.length - ativos.length} encerrados)</summary><table class="t" style="margin-top:10px">${prazos.filter(p => !ativos.includes(p)).map(p => `<tr><td>${esc(br(p.dataFatal))}</td><td>${esc(p.tipoNome)}</td><td>${esc(p.marca)}</td><td>${esc(p.status)}</td></tr>`).join('')}</table></details>` : ''}`;
    box.querySelectorAll('tr[data-id]').forEach(tr => tr.onclick = () => abrir(prazos.find(p => p.id === tr.dataset.id)));
  } else if (aba === 'kanban') {
    kanban(box, {
      colunas: STATUS_PRAZO, itens: prazos, campo: 'status',
      card: (p) => `<div class="kt">${esc(p.tipoNome || p.tipo)}</div><div class="km"><b>${esc(p.marca || '')}</b> <span class="mono">${esc(p.numero || '')}</span></div>
        <div class="km" style="margin-top:6px"><span class="badge">${esc(br(p.dataFatal))}</span>${badgePrazo(diasRestantes(p.dataFatal))}</div><div class="km"><span class="faint">${esc(p.responsavel || 'sem responsável')}</span></div>`,
      onOpen: abrir,
      onMove: async (p, para) => {
        if (para === 'cumprido' && !isAdmin()) { toast('Somente Caio confirma o protocolo final do prazo.', true); return render(el); }
        await store.patch('prazos', p.id, { status: para, ...(para === 'cumprido' ? { cumpridoEm: new Date().toISOString() } : {}) }); render(el);
      },
    });
  } else {
    const ano = new Date().getFullYear();
    box.innerHTML = `<div class="grid g2"><div class="card"><h2>Calculadora de prazo</h2><div class="grid g3">${campos([
      { k: 'inicio', l: 'Data da publicação (RPI)', tipo: 'date' }, { k: 'dias', l: 'Dias', tipo: 'number' },
      { k: 'regra', l: 'Regra', tipo: 'select', opcoes: [['', '—'], ...regras.map(r => [r.id, `${r.nome} (${r.dias}d)`])] }], { inicio: new Date().toISOString().slice(0, 10), dias: 60 })}</div>
      <div id="resc" class="kpi" style="margin-top:14px"></div></div>
      <div class="card"><h2>Feriados considerados (${ano})</h2><p class="sub">Nacionais + Carnaval + Sexta-feira Santa + Corpus Christi. Adicione pontos facultativos/recessos do INPI abaixo.</p>
      <div class="row">${[...feriados(ano, extras)].sort().map(d => `<span class="badge">${br(d)}</span>`).join('')}</div>
      ${isAdmin() ? `<label class="f" style="margin-top:12px"><span>Datas extras (AAAA-MM-DD, separadas por vírgula)</span><input id="fx" value="${esc(extras.join(', '))}"></label><button class="btn sm" data-a="fx" style="margin-top:8px">Salvar feriados</button>` : ''}</div>
      <div class="card span2"><h2>Regras de prazo por despacho</h2><p class="sub">O gatilho (expressão regular) é comparado ao texto do despacho publicado na RPI. “Próprio” = processos da carteira; “Terceiro” = vigilância/colidências.</p>
      <div class="table-wrap"><table class="t"><tr><th>Prazo</th><th>Dias</th><th>Aplica a</th><th>Gatilho no despacho</th></tr>
      ${regras.map((r, i) => `<tr><td>${esc(r.nome)}</td><td>${isAdmin() ? `<input data-rd="${i}" type="number" value="${r.dias}" style="width:80px">` : r.dias}</td><td>${r.aplica === 'proprio' ? 'Próprio' : 'Terceiro'}</td><td class="mono small">${isAdmin() ? `<input data-rg="${i}" value="${esc(r.gatilho)}">` : esc(r.gatilho || '— manual —')}</td></tr>`).join('')}</table></div>
      ${isAdmin() ? '<div class="row" style="margin-top:10px"><button class="btn sm" data-a="regras">Salvar regras</button><button class="btn sm ghost" data-a="reset">Restaurar padrão</button></div>' : ''}</div></div>`;
    const calc = () => {
      const d = lerForm(box.querySelector('.card'));
      const r = regras.find(x => x.id === d.regra);
      if (r && document.activeElement?.name === 'regra') box.querySelector('[name=dias]').value = r.dias;
      const dias = +box.querySelector('[name=dias]').value;
      const fatal = calcularPrazo(d.inicio, dias, extras);
      box.querySelector('#resc').innerHTML = fatal ? `<div class="faint tiny mono">DATA FATAL</div><div class="v lime">${br(fatal)}</div><div class="d">${dias} dias corridos a partir de ${br(d.inicio)} · ${badgePrazo(diasRestantes(fatal))}</div>` : '';
    };
    box.querySelectorAll('.card:first-child [name]').forEach(i => i.addEventListener('input', calc));
    calc();
    box.querySelector('[data-a=fx]')?.addEventListener('click', async () => { await saveConfig({ feriadosExtras: box.querySelector('#fx').value.split(/[,;\s]+/).filter(x => /^\d{4}-\d{2}-\d{2}$/.test(x)) }); toast('Feriados salvos.'); render(el); });
    box.querySelector('[data-a=regras]')?.addEventListener('click', async () => {
      const novas = regras.map((r, i) => ({ ...r, dias: +box.querySelector(`[data-rd="${i}"]`).value, gatilho: box.querySelector(`[data-rg="${i}"]`).value }));
      await saveConfig({ regrasPrazo: novas }); toast('Regras salvas.');
    });
    box.querySelector('[data-a=reset]')?.addEventListener('click', async () => { await saveConfig({ regrasPrazo: null }); toast('Regras padrão restauradas.'); render(el); });
  }
}

async function editar(p, { processos, regras, extras, equipe }) {
  const obj = { status: 'revisar', dataPublicacao: new Date().toISOString().slice(0, 10), ...p };
  const d = await modal({
    titulo: p.id ? `Prazo · ${p.tipoNome || ''}` : 'Novo prazo', sub: p.despacho ? `Despacho: ${esc(p.despacho)}` : 'Cadastre a publicação recebida pela RPI ou por e-mail do INPI.', grande: true,
    corpo: `<div class="grid g3">${campos([
      { k: 'processoId', l: 'Processo da carteira', tipo: 'select', opcoes: [['', '— outro / terceiro —'], ...processos.map(x => [x.id, `${x.numero || 's/n'} · ${x.marca}`])] },
      { k: 'numero', l: 'Nº do processo' }, { k: 'marca', l: 'Marca' },
      { k: 'tipo', l: 'Tipo de prazo', tipo: 'select', opcoes: regras.map(r => [r.id, r.nome]) },
      { k: 'rpi', l: 'RPI (4 dígitos)' }, { k: 'dataPublicacao', l: 'Data da publicação', tipo: 'date', req: true },
      { k: 'dias', l: 'Dias', tipo: 'number' }, { k: 'dataFatal', l: 'Data fatal (calculada — confira)', tipo: 'date' },
      { k: 'responsavel', l: 'Delegar para', tipo: 'select', opcoes: [['', '—'], ...equipe] },
      { k: 'status', l: 'Status', tipo: 'select', opcoes: STATUS_PRAZO.map(s => [s.id, s.titulo]) },
      { k: 'obs', l: 'Observações / estratégia', tipo: 'textarea', cls: 'span2' },
    ], obj)}</div><label class="chk"><input type="checkbox" name="criarTarefa" ${p.id ? '' : 'checked'}><span>Criar tarefa no quadro da equipe para o responsável</span></label>`,
    onOpen: (b) => {
      const g = (n) => b.querySelector(`[name=${n}]`);
      const recalc = () => { g('dataFatal').value = calcularPrazo(g('dataPublicacao').value, +g('dias').value, extras); };
      g('tipo').onchange = () => { const r = regras.find(x => x.id === g('tipo').value); if (r) g('dias').value = r.dias; recalc(); };
      g('dias').oninput = recalc; g('dataPublicacao').oninput = recalc;
      g('processoId').onchange = () => { const x = processos.find(k => k.id === g('processoId').value); if (x) { g('numero').value = x.numero || ''; g('marca').value = x.marca || ''; } };
      if (!p.id) { g('dias').value = regras.find(x => x.id === g('tipo').value)?.dias || 60; recalc(); }
    },
    acoes: [
      ...(p.id && isAdmin() ? [{ label: 'Excluir', cls: 'danger', onClick: async () => { await store.remove('prazos', p.id); return 'del'; } }] : []),
      { label: 'Cancelar', valor: null },
      { label: 'Salvar', cls: 'neon', onClick: (b) => lerForm(b) },
    ],
  });
  if (!d || d === 'del') return d;
  const { criarTarefa, ...dados } = d;
  if (dados.status === 'cumprido' && !isAdmin() && p.status !== 'cumprido') { toast('Somente Caio confirma o protocolo final.', true); dados.status = p.status || 'execucao'; }
  dados.tipoNome = regras.find(r => r.id === dados.tipo)?.nome || dados.tipo;
  dados.dias = +dados.dias;
  if (dados.responsavel && dados.status === 'revisar') dados.status = 'aberto';
  const salvo = await store.save('prazos', { ...p, ...dados });
  if (criarTarefa && dados.responsavel) {
    await store.save('tarefas', { titulo: `${dados.tipoNome} — ${dados.marca} (${dados.numero})`, responsavel: dados.responsavel, prazo: dados.dataFatal, coluna: 'afazer', prioridade: 'alta', origem: 'prazo', prazoId: salvo.id, descricao: dados.obs || '' });
  }
  toast('Prazo salvo.');
  return salvo;
}
