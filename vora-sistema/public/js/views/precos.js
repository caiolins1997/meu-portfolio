// Etapa 10 + Módulo 3 — tabela de preços por classe/processo, descontos progressivos e simulador de proposta.
import { store, esc, brl, modal, campos, lerForm, toast, isAdmin, getConfig, confirmar } from '../core.js';
import { cabecalho } from '../app.js';
import { abrirDocumento } from '../lib/timbrado.js';

export async function render(el) {
  const [servicos, cfg, clientes] = await Promise.all([store.list('servicos', true), getConfig(), store.list('clientes')]);
  const cats = [...new Set(servicos.map(s => s.categoria))];
  el.innerHTML = cabecalho('Preços & propostas', 'Valor cheio no 1º processo/classe e desconto progressivo para pedidos adicionais. Peças contenciosas e GRUs não estão no pacote de registro — cobradas à parte, com desconto de cliente Vora.',
    isAdmin() ? '<button class="btn neon" data-a="novo">+ Serviço</button>' : '', 'Etapa 10 · Decisão D3')
    + `<div class="card" style="margin-bottom:16px;border-color:rgba(245,183,0,.35)"><b class="small">Valores iniciais de exemplo.</b> <span class="small muted">Ajuste conforme a pesquisa de mercado antes de usar com clientes (somente o administrador edita).</span></div>
    <div class="grid g2"><div class="stack">${cats.map(c => `<div class="card"><h2>${esc(c)}</h2><table class="t"><tr><th>Serviço</th><th>1ª classe</th><th>Adicional</th><th>Desconto</th><th></th></tr>
      ${servicos.filter(s => s.categoria === c).map(s => `<tr><td><b>${esc(s.nome)}</b>${s.inclui ? `<div class="faint small">${esc(s.inclui)}</div>` : ''}</td><td>${brl(s.preco)}</td><td>${s.adicional ? brl(s.adicional) : '—'}</td>
        <td class="small">${s.descontoProgressivo ? `${s.descontoProgressivo}% progressivo` : s.descontoCliente ? `${s.descontoCliente}% cliente Vora` : '—'}</td><td>${isAdmin() ? `<button class="btn xs" data-ed="${s.id}">Editar</button>` : ''}</td></tr>`).join('')}</table></div>`).join('')}</div>
    <div class="card" style="align-self:start;position:sticky;top:16px"><h2>Simulador de proposta</h2>
      <div class="grid g2">${campos([
        { k: 'servico', l: 'Serviço', tipo: 'select', opcoes: servicos.map(s => [s.id, s.nome]) }, { k: 'classes', l: 'Nº de classes / processos', tipo: 'number' },
        { k: 'cliente', l: 'Já é cliente Vora?', tipo: 'select', opcoes: [['nao', 'Não'], ['sim', 'Sim']] }, { k: 'descExtra', l: 'Desconto negociado (%)', tipo: 'number' },
        { k: 'clienteId', l: 'Proposta para', tipo: 'select', opcoes: [['', '—'], ...clientes.map(c => [c.id, `${c.marca} · ${c.nome || ''}`])], cls: 'span2' }], { classes: 1, descExtra: 0 })}</div>
      <div id="sim" style="margin-top:14px"></div>
      <div class="row" style="margin-top:12px"><button class="btn" data-a="prop">Gerar proposta timbrada</button></div>
      <p class="faint small" style="margin-top:12px">Taxas federais do INPI (GRU) são pagas pelo cliente diretamente à União e informadas à parte.</p></div></div>`;

  const calc = () => {
    const d = lerForm(el.querySelector('#sim').closest('.card'));
    const s = servicos.find(x => x.id === d.servico) || servicos[0];
    if (!s) return null;
    const n = Math.max(1, +d.classes || 1);
    const linhas = [];
    for (let i = 1; i <= n; i++) {
      let v = i === 1 ? +s.preco : +(s.adicional || s.preco);
      if (i > 1 && s.descontoProgressivo) v *= Math.max(0.5, 1 - ((i - 2) * s.descontoProgressivo) / 100);
      linhas.push({ i, v });
    }
    let total = linhas.reduce((t, l) => t + l.v, 0);
    const descCli = d.cliente === 'sim' ? +(s.descontoCliente || 0) : 0;
    const desc = total * ((descCli + (+d.descExtra || 0)) / 100);
    total -= desc;
    el.querySelector('#sim').innerHTML = `<table class="t">${linhas.map(l => `<tr><td>${l.i === 1 ? '1ª classe (valor cheio)' : `${l.i}ª classe`}</td><td class="right">${brl(l.v)}</td></tr>`).join('')}
      ${desc ? `<tr><td>Descontos (${descCli ? `cliente Vora ${descCli}% + ` : ''}${+d.descExtra || 0}%)</td><td class="right">− ${brl(desc)}</td></tr>` : ''}
      <tr><td><b>Total de honorários</b></td><td class="right"><b class="lime" style="font-size:20px">${brl(total)}</b></td></tr>
      <tr><td class="faint">ou 6× no boleto (Asaas)</td><td class="right faint">${brl(total / 6)}</td></tr></table>`;
    return { s, linhas, total, desc, n, cliente: clientes.find(c => c.id === d.clienteId) };
  };
  el.querySelectorAll('#sim ~ *, .card [name]').forEach(i => i.addEventListener('input', calc));
  calc();
  el.querySelector('[data-a=prop]').onclick = () => {
    const r = calc(); if (!r) return;
    abrirDocumento({
      titulo: `Proposta - ${r.cliente?.marca || r.s.nome}`, kicker: 'Proposta comercial', empresa: cfg.empresa, clienteId: r.cliente?.id || '', pasta: '04',
      html: `<div class="kicker">Proposta comercial</div><h1>Proposta — ${esc(r.s.nome)}</h1>
        <p>Prezado(a) ${esc(r.cliente?.nome || '')}, apresentamos a proposta para ${esc(r.s.nome.toLowerCase())} da marca <b>${esc(r.cliente?.marca || '')}</b> em ${r.n} classe(s).</p>
        ${r.s.inclui ? `<div class="box alto"><b>Incluso:</b> ${esc(r.s.inclui)}.</div>` : ''}
        <table>${r.linhas.map(l => `<tr><th>${l.i === 1 ? '1ª classe' : `${l.i}ª classe`}</th><td>${brl(l.v)}</td></tr>`).join('')}${r.desc ? `<tr><th>Descontos</th><td>− ${brl(r.desc)}</td></tr>` : ''}<tr><th>Total de honorários</th><td><b>${brl(r.total)}</b></td></tr></table>
        <p><b>Formas de pagamento:</b> PIX, cartão de crédito/débito ou boleto (inclusive parcelado), via Asaas.</p>
        <p><b>Não incluso:</b> taxas federais do INPI (GRU), pagas pelo titular diretamente à União; e peças contenciosas eventuais (oposição, manifestação, recurso), orçadas à parte com desconto de cliente Vora.</p>
        <p class="small">Proposta válida por 15 dias. Dados tratados conforme a LGPD.</p>`,
    });
  };
  const editar = async (s = {}) => {
    const r = await modal({
      titulo: s.id ? s.nome : 'Novo serviço', corpo: `<div class="grid g2">${campos([{ k: 'nome', l: 'Nome', req: true }, { k: 'categoria', l: 'Categoria', req: true }, { k: 'preco', l: 'Preço 1ª classe (R$)', tipo: 'number', step: '0.01' }, { k: 'adicional', l: 'Classe adicional (R$)', tipo: 'number', step: '0.01' }, { k: 'descontoProgressivo', l: 'Desconto progressivo (%/classe)', tipo: 'number' }, { k: 'descontoCliente', l: 'Desconto cliente Vora (%)', tipo: 'number' }, { k: 'recorrente', l: 'Recorrência', tipo: 'select', opcoes: [['', 'Não'], ['mensal', 'Mensal'], ['anual', 'Anual']] }, { k: 'inclui', l: 'O que inclui', tipo: 'textarea', cls: 'span2' }], s)}</div>`,
      acoes: [...(s.id ? [{ label: 'Excluir', cls: 'danger', onClick: async () => { if (!await confirmar('Excluir', 'Excluir este serviço?')) return false; await store.remove('servicos', s.id); return 'del'; } }] : []), { label: 'Cancelar', valor: null }, { label: 'Salvar', cls: 'neon', onClick: (b) => lerForm(b) }],
    });
    if (r && r !== 'del') { await store.save('servicos', { ...s, ...r, preco: +r.preco || 0, adicional: +r.adicional || 0, descontoProgressivo: +r.descontoProgressivo || 0, descontoCliente: +r.descontoCliente || 0 }); toast('Serviço salvo.'); }
    if (r) render(el);
  };
  el.querySelector('[data-a=novo]')?.addEventListener('click', () => editar());
  el.querySelectorAll('[data-ed]').forEach(b => b.onclick = () => editar(servicos.find(s => s.id === b.dataset.ed)));
}
