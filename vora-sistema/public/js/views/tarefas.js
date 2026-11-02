// Quadro de tarefas da equipe (Trello unificado — D9): delegação de Caio para colaboradores e agentes de IA.
import { store, esc, br, kanban, formModal, toast, state, isAdmin, confirmar } from '../core.js';
import { cabecalho } from '../app.js';
import { COLUNAS_TAREFAS } from '../lib/dominio.js';
import { nomesEquipe } from './comum.js';

let soMinhas = false;

export async function render(el) {
  const [tarefas, equipe] = await Promise.all([store.list('tarefas', true), nomesEquipe()]);
  const resp = [...equipe, 'Agente de IA (Claude)', 'Agente de IA (Gemini)'];
  el.innerHTML = cabecalho('Tarefas da equipe', 'Delegue rapidamente: o que for automatizável vai para os agentes de IA, o restante para o colaborador. Itens que exigem validação passam pela coluna “Revisão de Caio”.',
    `<label class="chk"><input type="checkbox" id="mi" ${soMinhas ? 'checked' : ''}><span>Só as minhas</span></label><button class="btn neon" data-a="nova">+ Tarefa</button>`, 'Delegação · D9')
    + '<div id="kb"></div>';
  const editar = async (t = {}) => {
    const d = await formModal({
      titulo: t.id ? 'Tarefa' : 'Nova tarefa', grande: true,
      lista: [{ k: 'titulo', l: 'Título', req: true, cls: 'span2' }, { k: 'responsavel', l: 'Responsável', tipo: 'select', opcoes: resp },
        { k: 'prazo', l: 'Prazo', tipo: 'date' }, { k: 'prioridade', l: 'Prioridade', tipo: 'select', opcoes: ['normal', 'alta', 'baixa'] },
        { k: 'etapa', l: 'Etapa do fluxo', tipo: 'select', opcoes: ['', ...Array.from({ length: 13 }, (_, i) => `Etapa ${i + 1}`), 'Administrativo', 'Marketing'] },
        { k: 'coluna', l: 'Coluna', tipo: 'select', opcoes: COLUNAS_TAREFAS.map(c => [c.id, c.titulo]) },
        { k: 'descricao', l: 'Descrição / entrega esperada', tipo: 'textarea', cls: 'span2' }],
      obj: { coluna: 'afazer', prioridade: 'normal', responsavel: state.user.nome, ...t },
    });
    if (d) { await store.save('tarefas', { ...t, ...d, criadoPor: t.criadoPor || state.user.nome }); render(el); }
  };
  kanban(el.querySelector('#kb'), {
    colunas: COLUNAS_TAREFAS, itens: tarefas.filter(t => !soMinhas || t.responsavel === state.user.nome), campo: 'coluna',
    card: (t) => `<div class="kt">${esc(t.titulo)}</div><div class="km"><span class="badge ${t.prioridade === 'alta' ? 'red' : t.prioridade === 'baixa' ? '' : 'sky'}">${esc(t.prioridade || 'normal')}</span>${t.etapa ? `<span class="badge">${esc(t.etapa)}</span>` : ''}${t.prazo ? `<span class="badge">${esc(br(t.prazo))}</span>` : ''}</div>
      <div class="km" style="margin-top:6px"><span class="faint">${esc(t.responsavel || '')}</span></div>`,
    onOpen: editar,
    onMove: async (t, para) => {
      if (para === 'feito' && t.coluna === 'revisao' && !isAdmin()) { toast('Itens em revisão são concluídos por Caio.', true); return render(el); }
      await store.patch('tarefas', t.id, { coluna: para, ...(para === 'feito' ? { concluidoEm: new Date().toISOString() } : {}) }); render(el);
    },
  });
  el.querySelector('#mi').onchange = (e) => { soMinhas = e.target.checked; render(el); };
  el.querySelector('[data-a=nova]').onclick = () => editar();
  const feitas = tarefas.filter(t => t.coluna === 'feito');
  if (feitas.length > 30 && isAdmin()) {
    const b = document.createElement('button'); b.className = 'btn sm ghost'; b.textContent = `Arquivar ${feitas.length} concluídas`; b.style.marginTop = '12px';
    b.onclick = async () => { if (await confirmar('Arquivar', 'Excluir as tarefas concluídas?')) { for (const t of feitas) await store.remove('tarefas', t.id); render(el); } };
    el.appendChild(b);
  }
}
