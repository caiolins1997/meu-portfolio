// Funil comercial unificado (Trello D9) — Etapas 3 a 11, novos clientes.
import { store, esc, kanban, brl, toast, copiar, getConfig, isAdmin } from '../core.js';
import { cabecalho } from '../app.js';
import { ETAPAS_FUNIL, CANAIS } from '../lib/dominio.js';
import { novoLead, garantirAnalise, enviarMensagem, nomesEquipe } from './comum.js';

const filtros = { resp: '', canal: '', q: '' };

export async function render(el) {
  const [clientes, analises, cfg, equipe] = await Promise.all([store.list('clientes', true), store.list('analises'), getConfig(), nomesEquipe()]);
  const link = cfg.linkFormulario || `${location.origin}/formulario`;
  el.innerHTML = cabecalho('Funil comercial', 'Kanban unificado (D9) do primeiro contato ao protocolo. Arraste os cartões ou use o seletor. Ticket alto (múltiplas marcas/classes) sugere reunião — Decisão D5.',
    `<button class="btn" data-a="link">Copiar link do formulário</button><button class="btn neon" data-a="novo">+ Novo lead</button>`, 'Etapas 3 → 11')
    + `<div class="row" style="margin-bottom:14px">
      <input class="search" placeholder="Buscar marca ou nome…" data-f="q" value="${esc(filtros.q)}">
      <select data-f="resp" style="width:auto"><option value="">Todos os responsáveis</option>${equipe.map(r => `<option ${filtros.resp === r ? 'selected' : ''}>${esc(r)}</option>`).join('')}</select>
      <select data-f="canal" style="width:auto"><option value="">Todos os canais</option>${Object.entries(CANAIS).map(([k, v]) => `<option value="${k}" ${filtros.canal === k ? 'selected' : ''}>${esc(v)}</option>`).join('')}</select>
    </div><div id="kb"></div>`;

  const desenhar = () => {
    const q = filtros.q.toLowerCase();
    const itens = clientes.filter(c => (!filtros.resp || c.responsavel === filtros.resp) && (!filtros.canal || c.origem === filtros.canal)
      && (!q || `${c.marca} ${c.nome}`.toLowerCase().includes(q)));
    kanban(el.querySelector('#kb'), {
      colunas: ETAPAS_FUNIL, itens, campo: 'etapa',
      card: (c) => {
        const an = analises.find(a => a.clienteId === c.id);
        const alto = (+c.numClasses || 1) > 1 || (+c.valorEstimado || 0) >= 3000;
        const dias = Math.floor((Date.now() - new Date(c._criado)) / 86400000);
        return `<div class="kt">${esc(c.marca || '—')}</div>
          <div class="km">${esc(c.nome || '')}</div>
          <div class="km" style="margin-top:6px">
            <span class="badge">${esc(c.origem || '?')}</span>
            ${alto ? '<span class="badge amber" title="Decisão D5">ticket alto · reunião</span>' : ''}
            ${an ? `<span class="badge violet">${esc(an.status === 'aguardando_caio' ? 'aguardando Caio' : an.status.replace('_', ' '))}</span>` : ''}
            ${c.valorEstimado ? `<span class="badge green">${brl(c.valorEstimado)}</span>` : ''}
          </div>
          <div class="km" style="margin-top:6px"><span class="faint">${esc(c.responsavel || 'sem responsável')} · ${dias}d</span></div>`;
      },
      onOpen: (c) => { location.hash = `#/clientes/${c.id}`; },
      onMove: async (c, para) => {
        if (para === 'protocolado') {
          toast(isAdmin() ? 'Abra o cliente e use “Registrar protocolo” (checklist + trava da GRU).' : 'O protocolo é exclusivo de Caio, após o checklist completo.', true);
          return desenhar();
        }
        const patch = { etapa: para };
        if (para === 'parecer_enviado' && !c.parecerEnviadoEm) patch.parecerEnviadoEm = new Date().toISOString().slice(0, 10);
        if (para === 'perdido') patch.perdidoEm = new Date().toISOString().slice(0, 10);
        const atualizado = await store.patch('clientes', c.id, patch);
        Object.assign(c, atualizado);
        if (para === 'analise') { await garantirAnalise(c); toast('Análise de viabilidade criada (fluxo D4: IA → colaborador → Caio).'); }
        if (para === 'contato') enviarMensagem({ cliente: c, codigo: '10.1', categoria: 'Recepção' });
        if (para === 'negociacao') enviarMensagem({ cliente: c, codigo: '10.8', categoria: 'Fechamento' });
        desenhar();
      },
    });
  };
  desenhar();

  el.querySelectorAll('[data-f]').forEach(i => i.addEventListener('input', () => { filtros[i.dataset.f] = i.value; desenhar(); }));
  el.querySelector('[data-a=novo]').onclick = async () => { if (await novoLead()) render(el); };
  el.querySelector('[data-a=link]').onclick = () => copiar(link);
}
