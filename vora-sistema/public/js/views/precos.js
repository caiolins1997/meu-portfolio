// Etapa 10 + Módulo 3 — tabela de honorários por classe/processo, faixas por quantidade de classes e simulador de proposta.
// Valores calibrados pela pesquisa de mercado de nov/2026 (assessorias online, tabelas OAB-AL/BA/PE/SP/RS e tabela de retribuições do INPI).
import { store, esc, brl, modal, campos, lerForm, toast, isAdmin, getConfig, confirmar } from '../core.js';
import { cabecalho } from '../app.js';
import { abrirDocumento } from '../lib/timbrado.js';

// Política de pagamento (custos do Asaas: Pix/boleto R$ 1,59; crédito à vista 2,99%, 2–6x 3,49%, 7–12x 3,99% + R$ 0,49).
export const PAGAMENTO = { descontoPix: 5, cartaoSemJuros: 6, cartaoMax: 12, acrescimoCartao7a12: 4, boletoMax: 4 };

// Valor da n-ésima classe/processo: 1ª = preço cheio, 2ª = adicional, 3ª em diante = aPartir3.
export function valorClasse(s, i) {
  if (i === 1) return +s.preco || 0;
  if (i === 2) return +(s.adicional || s.preco) || 0;
  return +(s.aPartir3 || s.adicional || s.preco) || 0;
}

export async function render(el) {
  const [lista, cfg, clientes] = await Promise.all([store.list('servicos', true), getConfig(), store.list('clientes')]);
  const servicos = lista.slice().sort((a, b) => (a.ordem ?? 99) - (b.ordem ?? 99) || String(a.nome).localeCompare(b.nome));
  const cats = [...new Set(servicos.map(s => s.categoria))];
  const P = PAGAMENTO;
  el.innerHTML = cabecalho('Preços & propostas', 'Honorários por classe/processo com faixas por quantidade. As taxas federais do INPI (GRU) são pagas pelo titular, à parte, e aparecem na proposta como estimativa.',
    isAdmin() ? '<button class="btn neon" data-a="novo">+ Serviço</button>' : '', 'Etapa 10 · Decisão D3')
    + `<div class="card" style="margin-bottom:16px"><b class="small">Tabela de referência — pesquisa de mercado nov/2026.</b> <span class="small muted">Registro de marca no mercado: R$ 860 a R$ 3.500 por classe (média nacional ≈ R$ 1.760); tabela mínima da OAB-AL 2026 para depósito: R$ 2.801,82. A Vora se posiciona no meio do mercado, abaixo da referência da OAB-AL e com viabilidade grátis e vigilância incluídas. Somente o administrador edita.</span></div>
    <div class="grid g2"><div class="stack">${cats.map(c => `<div class="card"><h2>${esc(c)}</h2><div class="table-wrap"><table class="t"><tr><th>Serviço</th><th>1ª</th><th>2ª</th><th>3ª em diante</th><th>GRU INPI*</th><th></th></tr>
      ${servicos.filter(s => s.categoria === c).map(s => `<tr><td><b>${esc(s.nome)}</b>${s.recorrente ? ` <span class="badge">${esc(s.recorrente)}</span>` : ''}${s.inclui ? `<div class="faint small">${esc(s.inclui)}</div>` : ''}${s.descontoCliente ? `<div class="faint tiny">${s.descontoCliente}% de desconto para cliente Vora</div>` : ''}</td>
        <td class="nowrap">${brl(s.preco)}</td><td class="nowrap">${s.adicional ? brl(s.adicional) : '—'}</td><td class="nowrap">${s.aPartir3 ? brl(s.aPartir3) : '—'}</td>
        <td class="nowrap small">${s.taxaInpi ? `${brl(s.taxaInpiDesc)} / ${brl(s.taxaInpi)}` : '—'}</td><td>${isAdmin() ? `<button class="btn xs" data-ed="${s.id}">Editar</button>` : ''}</td></tr>`).join('')}</table></div></div>`).join('')}
      <p class="faint small">* GRU por classe/processo: com desconto de 50% (pessoa física, MEI, ME, EPP, cooperativas, entidades sem fins lucrativos e instituições de ensino) / valor cheio (demais empresas). Tabela do INPI vigente (Portaria GM/MDIC 110/2025 e INPI/PR 10/2025): não há mais taxa de concessão.</p></div>
    <div class="card" style="align-self:start;position:sticky;top:16px"><h2>Simulador de proposta</h2>
      <div class="grid g2">${campos([
        { k: 'servico', l: 'Serviço', tipo: 'select', opcoes: servicos.map(s => [s.id, s.nome]) }, { k: 'classes', l: 'Nº de classes / processos', tipo: 'number' },
        { k: 'porte', l: 'Titular', tipo: 'select', opcoes: [['desc', 'PF, MEI, ME ou EPP (GRU com 50%)'], ['cheio', 'Demais empresas (GRU cheia)']] },
        { k: 'cliente', l: 'Já é cliente Vora?', tipo: 'select', opcoes: [['nao', 'Não'], ['sim', 'Sim']] }, { k: 'descExtra', l: 'Desconto negociado (%)', tipo: 'number' },
        { k: 'clienteId', l: 'Proposta para', tipo: 'select', opcoes: [['', '—'], ...clientes.map(c => [c.id, `${c.marca} · ${c.nome || ''}`])] }], { classes: 1, descExtra: 0 })}</div>
      <div id="sim" style="margin-top:14px"></div>
      <div class="row" style="margin-top:12px"><button class="btn" data-a="prop">Gerar proposta timbrada</button></div>
      <p class="faint small" style="margin-top:12px">Pagamento dos honorários: Pix à vista com ${P.descontoPix}% de desconto · cartão em até ${P.cartaoSemJuros}x sem juros ou até ${P.cartaoMax}x com acréscimo · boleto em até ${P.boletoMax}x. A GRU é paga à vista pelo titular, direto à União.</p></div></div>`;

  const calc = () => {
    const d = lerForm(el.querySelector('#sim').closest('.card'));
    const s = servicos.find(x => x.id === d.servico) || servicos[0];
    if (!s) return null;
    const n = Math.max(1, +d.classes || 1);
    const linhas = [];
    for (let i = 1; i <= n; i++) linhas.push({ i, v: valorClasse(s, i) });
    const bruto = linhas.reduce((t, l) => t + l.v, 0);
    const descCli = d.cliente === 'sim' ? +(s.descontoCliente || 0) : 0;
    const desc = bruto * ((descCli + (+d.descExtra || 0)) / 100);
    const total = bruto - desc;
    const gru = (d.porte === 'cheio' ? +s.taxaInpi || 0 : +s.taxaInpiDesc || 0) * (s.taxaInpi ? n : 0);
    const pix = total * (1 - P.descontoPix / 100);
    const cartao12 = total * (1 + P.acrescimoCartao7a12 / 100);
    el.querySelector('#sim').innerHTML = `<table class="t">${linhas.map(l => `<tr><td>${l.i === 1 ? '1ª classe/processo' : `${l.i}ª classe/processo`}</td><td class="right">${brl(l.v)}</td></tr>`).join('')}
      ${desc ? `<tr><td>Descontos (${descCli ? `cliente Vora ${descCli}% + ` : ''}${+d.descExtra || 0}%)</td><td class="right">− ${brl(desc)}</td></tr>` : ''}
      <tr><td><b>Total de honorários</b></td><td class="right"><b class="lime" style="font-size:20px">${brl(total)}</b></td></tr>
      <tr><td class="faint">Pix à vista (−${P.descontoPix}%)</td><td class="right faint">${brl(pix)}</td></tr>
      <tr><td class="faint">Cartão ${P.cartaoSemJuros}x sem juros</td><td class="right faint">${P.cartaoSemJuros}× ${brl(total / P.cartaoSemJuros)}</td></tr>
      <tr><td class="faint">Cartão ${P.cartaoMax}x (com acréscimo)</td><td class="right faint">${P.cartaoMax}× ${brl(cartao12 / P.cartaoMax)}</td></tr>
      <tr><td class="faint">Boleto ${P.boletoMax}x</td><td class="right faint">${P.boletoMax}× ${brl(total / P.boletoMax)}</td></tr>
      ${gru ? `<tr><td>GRU do INPI (estimativa, paga à parte)</td><td class="right">${brl(gru)}</td></tr><tr><td class="faint">Investimento total estimado</td><td class="right faint">${brl(total + gru)}</td></tr>` : ''}</table>`;
    return { s, linhas, total, desc, n, gru, pix, cartao12, cliente: clientes.find(c => c.id === d.clienteId) };
  };
  el.querySelectorAll('.card [name]').forEach(i => i.addEventListener('input', calc));
  calc();
  el.querySelector('[data-a=prop]').onclick = () => {
    const r = calc(); if (!r) return;
    abrirDocumento({
      titulo: `Proposta - ${r.cliente?.marca || r.s.nome}`, kicker: 'Proposta comercial', empresa: cfg.empresa, clienteId: r.cliente?.id || '', pasta: '04',
      html: `<div class="kicker">Proposta comercial</div><h1>Proposta — ${esc(r.s.nome)}</h1>
        <p>Prezado(a) ${esc(r.cliente?.nome || '')}, apresentamos a proposta de ${esc(r.s.nome.toLowerCase())} da marca <b>${esc(r.cliente?.marca || '')}</b> em ${r.n} classe(s)/processo(s).</p>
        ${r.s.inclui ? `<div class="box alto"><b>Incluso:</b> ${esc(r.s.inclui)}.</div>` : ''}
        <table>${r.linhas.map(l => `<tr><th>${l.i}ª classe/processo</th><td>${brl(l.v)}</td></tr>`).join('')}${r.desc ? `<tr><th>Descontos</th><td>− ${brl(r.desc)}</td></tr>` : ''}<tr><th>Total de honorários</th><td><b>${brl(r.total)}</b></td></tr></table>
        <h2>Formas de pagamento dos honorários</h2>
        <table><tr><th>Pix à vista (${P.descontoPix}% de desconto)</th><td>${brl(r.pix)}</td></tr>
          <tr><th>Cartão de crédito em até ${P.cartaoSemJuros}x sem juros</th><td>${P.cartaoSemJuros}× ${brl(r.total / P.cartaoSemJuros)}</td></tr>
          <tr><th>Cartão de crédito em até ${P.cartaoMax}x</th><td>${P.cartaoMax}× ${brl(r.cartao12 / P.cartaoMax)}</td></tr>
          <tr><th>Boleto em até ${P.boletoMax}x</th><td>${P.boletoMax}× ${brl(r.total / P.boletoMax)}</td></tr></table>
        ${r.gru ? `<h2>Taxas federais do INPI (GRU)</h2><p>Estimativa: <b>${brl(r.gru)}</b>, emitida no CPF/CNPJ do titular e paga à vista diretamente à União. Não há taxa de concessão na tabela vigente do INPI.</p>` : ''}
        <p><b>Não incluso:</b> peças contenciosas eventuais (oposição, manifestação, recurso), orçadas à parte com desconto de cliente Vora.</p>
        <p class="small">Proposta válida por 15 dias. Desistência conforme os Termos de Uso (vorapi.com.br/termos): possível em até 7 dias enquanto a GRU não for emitida. Dados tratados conforme a LGPD.</p>`,
    });
  };
  const editar = async (s = {}) => {
    const r = await modal({
      titulo: s.id ? s.nome : 'Novo serviço', corpo: `<div class="grid g2">${campos([{ k: 'nome', l: 'Nome', req: true }, { k: 'categoria', l: 'Categoria', req: true },
        { k: 'preco', l: '1ª classe/processo (R$)', tipo: 'number', step: '0.01' }, { k: 'adicional', l: '2ª classe (R$)', tipo: 'number', step: '0.01' },
        { k: 'aPartir3', l: 'Cada classe a partir da 3ª (R$)', tipo: 'number', step: '0.01' }, { k: 'descontoCliente', l: 'Desconto cliente Vora (%)', tipo: 'number' },
        { k: 'taxaInpiDesc', l: 'GRU por classe com desconto (R$)', tipo: 'number', step: '0.01' }, { k: 'taxaInpi', l: 'GRU por classe cheia (R$)', tipo: 'number', step: '0.01' },
        { k: 'recorrente', l: 'Recorrência', tipo: 'select', opcoes: [['', 'Não'], ['mensal', 'Mensal'], ['anual', 'Anual']] }, { k: 'ordem', l: 'Ordem na lista', tipo: 'number' },
        { k: 'inclui', l: 'O que inclui', tipo: 'textarea', cls: 'span2' }], s)}</div>`,
      acoes: [...(s.id ? [{ label: 'Excluir', cls: 'danger', onClick: async () => { if (!await confirmar('Excluir', 'Excluir este serviço?')) return false; await store.remove('servicos', s.id); return 'del'; } }] : []), { label: 'Cancelar', valor: null }, { label: 'Salvar', cls: 'neon', onClick: (b) => lerForm(b) }],
    });
    const num = (v) => +v || 0;
    if (r && r !== 'del') { await store.save('servicos', { ...s, ...r, preco: num(r.preco), adicional: num(r.adicional), aPartir3: num(r.aPartir3), descontoCliente: num(r.descontoCliente), taxaInpi: num(r.taxaInpi), taxaInpiDesc: num(r.taxaInpiDesc), ordem: r.ordem === '' ? 99 : num(r.ordem) }); toast('Serviço salvo.'); }
    if (r) render(el);
  };
  el.querySelector('[data-a=novo]')?.addEventListener('click', () => editar());
  el.querySelectorAll('[data-ed]').forEach(b => b.onclick = () => editar(servicos.find(s => s.id === b.dataset.ed)));
}
