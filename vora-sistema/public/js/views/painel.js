// Painel geral — visão do administrador e da equipe.
import { store, esc, br, brl, isAdmin, state, mesRef } from '../core.js';
import { cabecalho } from '../app.js';
import { ETAPAS_FUNIL, FECHADOS, CANAIS, badgePrazo } from '../lib/dominio.js';
import { diasRestantes } from '../lib/prazos.js';

export async function render(el) {
  const [clientes, analises, prazos, colid, vendas, tarefas, processos] = await Promise.all(
    ['clientes', 'analises', 'prazos', 'colidencias', 'vendas', 'tarefas', 'processos'].map(c => store.list(c, true)));
  const mes = mesRef();
  const d30 = Date.now() - 30 * 86400000;
  const novos30 = clientes.filter(c => new Date(c._criado) >= d30).length;
  const aguardCaio = analises.filter(a => a.status === 'aguardando_caio');
  const revisar = analises.filter(a => a.status === 'revisao_colaborador');
  const prazosAtivos = prazos.filter(p => !['cumprido', 'cancelado'].includes(p.status)).sort((a, b) => String(a.dataFatal).localeCompare(String(b.dataFatal)));
  const urgentes = prazosAtivos.filter(p => (diasRestantes(p.dataFatal) ?? 0) <= 15);
  const colNovas = colid.filter(c => c.status === 'detectada');
  const recebido = vendas.flatMap(v => v.parcelas || []).filter(p => p.pago && String(p.dataPago).startsWith(mes)).reduce((s, p) => s + +p.valor, 0);
  const prontos = clientes.filter(c => c.etapa === 'pronto');
  const minhas = tarefas.filter(t => t.responsavel === state.user.nome && t.coluna !== 'feito');
  const an = clientes.filter(c => analises.some(a => a.clienteId === c.id)).length;
  const fe = clientes.filter(c => FECHADOS.includes(c.etapa)).length;
  const porEtapa = ETAPAS_FUNIL.map(e => ({ ...e, n: clientes.filter(c => (c.etapa || 'novo') === e.id).length }));
  const maxE = Math.max(1, ...porEtapa.map(e => e.n));
  const pendNotif = processos.filter(p => p.atualizacaoPendente).length;
  const hora = new Date().getHours();

  el.innerHTML = cabecalho(`${hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite'}, ${esc(state.user.nome.split(' ')[0])}`,
    isAdmin() ? 'Sua visão de CEO: o que precisa da sua validação, os prazos fatais e a saúde do caixa.' : 'Suas prioridades de hoje: leads, conferências, documentos e follow-ups.',
    '<a class="btn neon" href="#/funil">Abrir funil</a>', `${new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}`)
    + `<div class="grid g4">
      <div class="card kpi"><div class="sys-tag">Novos leads · 30 dias</div><div class="v">${novos30}</div><div class="d">${clientes.length} no total</div></div>
      <div class="card kpi ${aguardCaio.length ? 'alert' : ''}"><div class="sys-tag">${isAdmin() ? 'Pareceres p/ validar' : 'Pareceres p/ conferir'}</div><div class="v">${isAdmin() ? aguardCaio.length : revisar.length}</div><div class="d">fluxo D4</div></div>
      <div class="card kpi ${urgentes.length ? 'danger' : ''}"><div class="sys-tag">Prazos em até 15 dias</div><div class="v">${urgentes.length}</div><div class="d">${prazosAtivos.length} prazos ativos</div></div>
      <div class="card kpi ${colNovas.length ? 'alert' : ''}"><div class="sys-tag">Colidências novas</div><div class="v">${colNovas.length}</div><div class="d">oportunidades de oposição</div></div>
      <div class="card kpi good"><div class="sys-tag">Recebido no mês</div><div class="v">${brl(recebido)}</div><div class="d">${mes}</div></div>
      <div class="card kpi"><div class="sys-tag">Fechamentos ÷ análises</div><div class="v">${an ? ((fe / an) * 100).toFixed(0) : 0}%</div><div class="d">${fe} de ${an}</div></div>
      <div class="card kpi ${prontos.length ? 'alert' : ''}"><div class="sys-tag">Prontos p/ protocolo</div><div class="v">${prontos.length}</div><div class="d">exclusivo de Caio</div></div>
      <div class="card kpi"><div class="sys-tag">Carteira INPI</div><div class="v">${processos.length}</div><div class="d">${pendNotif} cliente(s) a notificar</div></div>
    </div>
    <div class="grid g2" style="margin-top:16px">
      <div class="card"><div class="row between"><h2 style="margin:0">Prazos fatais</h2><a class="small" href="#/prazos">ver todos →</a></div><div class="stack" style="margin-top:12px">
        ${prazosAtivos.slice(0, 7).map(p => `<a class="file-row" href="#/prazos" style="color:inherit;text-decoration:none"><span class="mono small">${esc(br(p.dataFatal))}</span>${badgePrazo(diasRestantes(p.dataFatal))}<span><b>${esc(p.marca || '')}</b> · ${esc(p.tipoNome || '')}</span><span class="faint small" style="margin-left:auto">${esc(p.responsavel || '—')}</span></a>`).join('') || '<div class="empty">Sem prazos abertos.</div>'}</div></div>
      <div class="card"><div class="row between"><h2 style="margin:0">${isAdmin() ? 'Aguardando sua validação' : 'Para conferir'}</h2><a class="small" href="#/analises">quadro →</a></div><div class="stack" style="margin-top:12px">
        ${(isAdmin() ? aguardCaio : revisar).slice(0, 7).map(a => `<a class="file-row" href="#/analises/${a.id}" style="color:inherit;text-decoration:none"><b>${esc(a.marca)}</b><span class="faint small">${(a.colidencias || []).length} anterioridade(s)</span><span class="badge amber" style="margin-left:auto">${esc(a.viabilidade || 'a definir')}</span></a>`).join('') || '<div class="empty">Nada pendente. ✨</div>'}
        ${isAdmin() && prontos.length ? `<div class="hr"></div><b class="small">Prontos para protocolo</b>${prontos.map(c => `<a class="file-row" href="#/clientes/${c.id}" style="color:inherit;text-decoration:none"><b>${esc(c.marca)}</b><span class="badge lime" style="margin-left:auto">protocolar</span></a>`).join('')}` : ''}</div></div>
      <div class="card"><h2>Funil por etapa</h2><div class="bars">${porEtapa.map(e => `<div class="b"><span class="small">${esc(e.titulo)}</span><div class="progress"><i style="width:${(e.n / maxE) * 100}%"></i></div><span class="small right">${e.n}</span></div>`).join('')}</div></div>
      <div class="card"><div class="row between"><h2 style="margin:0">Minhas tarefas</h2><a class="small" href="#/tarefas">quadro →</a></div><div class="stack" style="margin-top:12px">
        ${minhas.slice(0, 7).map(t => `<div class="file-row"><span class="badge ${t.prioridade === 'alta' ? 'red' : ''}">${esc(t.prioridade || 'normal')}</span><span>${esc(t.titulo)}</span><span class="faint small" style="margin-left:auto">${esc(br(t.prazo))}</span></div>`).join('') || '<div class="empty">Sem tarefas pendentes.</div>'}</div>
        <div class="hr"></div><h3>Leads por canal</h3><div class="row">${Object.entries(CANAIS).map(([k, n]) => `<span class="badge" title="${esc(n)}">${k}: ${clientes.filter(c => c.origem === k).length}</span>`).join('')}</div></div>
    </div>`;
}
