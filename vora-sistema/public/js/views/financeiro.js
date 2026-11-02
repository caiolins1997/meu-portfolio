// Etapa 9 + Módulo 2.2 — vendas (Asaas), parcelas, inadimplência, previsão, comissões gamificadas e parceiros.
import { store, esc, br, brl, tabs, modal, campos, lerForm, toast, getConfig, mesRef, csvGerar, baixarTexto, isAdmin, state, confirmar } from '../core.js';
import { cabecalho } from '../app.js';
import { CANAIS } from '../lib/dominio.js';
import { FORMAS, liquidoVenda, comissoes, gerarParcelas, trimestre } from '../lib/comissao.js';
import { nomesEquipe } from './comum.js';

let aba = 'painel';
let ref = mesRef();

export async function render(el) {
  const [vendas, despesas, parceiros, clientes, servicos, cfg, equipe] = await Promise.all([
    store.list('vendas', true), store.list('despesas', true).catch(() => []), store.list('parceiros'), store.list('clientes'), store.list('servicos'), getConfig(), nomesEquipe()]);
  el.innerHTML = cabecalho('Financeiro & comissões', 'Honorários via Asaas (PIX, cartão, boleto, boleto parcelado). As GRUs são pagas pelo cliente direto à União e não entram aqui. Comissão 100% variável: 15% a 25% sobre o honorário líquido, liberada conforme a liquidação.',
    `<label class="f" style="width:150px"><span>Mês de referência</span><input type="month" id="ref" value="${ref}"></label><button class="btn neon" data-a="venda">+ Venda</button>`, 'Etapa 9 · D6 · D7')
    + tabs([['painel', 'Dashboard'], ['vendas', 'Vendas & parcelas'], ['comissoes', 'Comissões & gamificação'], ['parceiros', 'Repasses a parceiros'], ['despesas', 'Saídas'], ['asaas', 'Integração Asaas / Sheets']], aba) + '<div id="c"></div>';
  el.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { aba = b.dataset.tab; render(el); });
  el.querySelector('#ref').onchange = (e) => { ref = e.target.value || mesRef(); render(el); };
  const ctx = { vendas, despesas, parceiros, clientes, servicos, cfg, equipe, recarregar: () => render(el) };
  el.querySelector('[data-a=venda]').onclick = async () => { if (await editarVenda({}, ctx)) render(el); };
  ({ painel, vendas: tabVendas, comissoes: tabComissoes, parceiros: tabParceiros, despesas: tabDespesas, asaas: tabAsaas })[aba](el.querySelector('#c'), ctx);
}

const todasParcelas = (vendas) => vendas.flatMap(v => (v.parcelas || []).map(p => ({ ...p, v })));

function painel(box, { vendas, despesas, parceiros }) {
  const ps = todasParcelas(vendas.filter(v => v.forma !== 'permuta'));
  const hoje = new Date().toISOString().slice(0, 10);
  const recebido = ps.filter(p => p.pago && String(p.dataPago).startsWith(ref)).reduce((s, p) => s + +p.valor, 0);
  const vendido = vendas.filter(v => String(v.data).startsWith(ref) && v.forma !== 'permuta').reduce((s, v) => s + +v.valor, 0);
  const inad = ps.filter(p => !p.pago && p.vencimento < hoje);
  const saidas = despesas.filter(d => String(d.data).startsWith(ref)).reduce((s, d) => s + +d.valor, 0);
  const prox = [0, 1, 2, 3].map(i => { const d = new Date(ref + '-01T12:00'); d.setMonth(d.getMonth() + i); const m = mesRef(d); return { m, v: ps.filter(p => !p.pago && String(p.vencimento).startsWith(m)).reduce((s, p) => s + +p.valor, 0) }; });
  const maxP = Math.max(1, ...prox.map(p => p.v));
  const porServ = {};
  vendas.filter(v => String(v.data).startsWith(ref.slice(0, 4))).forEach(v => { porServ[v.servico] = (porServ[v.servico] || 0) + +v.valor; });
  const maxS = Math.max(1, ...Object.values(porServ));
  const permutas = vendas.filter(v => v.forma === 'permuta');
  box.innerHTML = `<div class="grid g4">
    <div class="card kpi good"><div class="sys-tag">Recebido em ${ref}</div><div class="v">${brl(recebido)}</div><div class="d">parcelas liquidadas no mês</div></div>
    <div class="card kpi"><div class="sys-tag">Vendido em ${ref}</div><div class="v">${brl(vendido)}</div><div class="d">${vendas.filter(v => String(v.data).startsWith(ref)).length} contrato(s)</div></div>
    <div class="card kpi ${inad.length ? 'danger' : ''}"><div class="sys-tag">Inadimplência</div><div class="v">${brl(inad.reduce((s, p) => s + +p.valor, 0))}</div><div class="d">${inad.length} parcela(s) vencida(s)</div></div>
    <div class="card kpi"><div class="sys-tag">Resultado do mês</div><div class="v">${brl(recebido - saidas)}</div><div class="d">entradas − saídas (${brl(saidas)})</div></div></div>
  <div class="grid g2" style="margin-top:16px">
    <div class="card"><h2>Previsão de entradas</h2><div class="bars">${prox.map(p => `<div class="b"><span class="mono small">${p.m}</span><div class="progress"><i style="width:${(p.v / maxP) * 100}%"></i></div><span class="small right">${brl(p.v)}</span></div>`).join('')}</div></div>
    <div class="card"><h2>Receita por serviço (${ref.slice(0, 4)})</h2><div class="bars">${Object.entries(porServ).sort((a, b) => b[1] - a[1]).map(([s, v]) => `<div class="b"><span class="small">${esc(s)}</span><div class="progress"><i style="width:${(v / maxS) * 100}%"></i></div><span class="small right">${brl(v)}</span></div>`).join('') || '<div class="faint">Sem vendas no ano.</div>'}</div></div>
    <div class="card span2"><h2>Parcelas vencidas</h2>${inad.length ? `<table class="t"><tr><th>Cliente</th><th>Serviço</th><th>Parcela</th><th>Vencimento</th><th>Valor</th></tr>${inad.map(p => `<tr><td>${esc(p.v.clienteNome || '')}</td><td>${esc(p.v.servico)}</td><td>${p.n}/${p.v.parcelas.length}</td><td>${br(p.vencimento)}</td><td>${brl(p.valor)}</td></tr>`).join('')}</table>` : '<div class="empty">Nenhuma parcela vencida. 👏</div>'}</div>
    ${permutas.length ? `<div class="card span2"><h2>Permutas de mídia (Caio)</h2><p class="sub">Sem comissão sobre o contrato de permuta. Clientes que vierem pelos anúncios geram comissão normal.</p><table class="t">${permutas.map(v => `<tr><td>${esc(v.clienteNome)}</td><td>${esc(v.servico)}</td><td>equivalência ${brl(v.valor)}</td><td>${br(v.data)}</td></tr>`).join('')}</table></div>` : ''}</div>`;
}

function tabVendas(box, ctx) {
  const { vendas, parceiros, recarregar } = ctx;
  box.innerHTML = `<div class="card"><div class="table-wrap"><table class="t"><thead><tr><th>Data</th><th>Cliente / serviço</th><th>Forma</th><th>Bruto</th><th>Líquido Vora</th><th>Parcelas</th><th>Colaborador</th><th>Canal</th></tr></thead><tbody>
    ${vendas.sort((a, b) => String(b.data).localeCompare(String(a.data))).map(v => { const l = liquidoVenda(v, parceiros); const pagas = (v.parcelas || []).filter(p => p.pago).length; return `<tr class="click" data-id="${v.id}"><td class="nowrap">${br(v.data)}</td><td><b>${esc(v.clienteNome || '')}</b><div class="faint small">${esc(v.servico)}${v.recorrente ? ` · recorrente ${esc(v.recorrente)}` : ''}</div></td>
      <td>${esc(FORMAS[v.forma] || v.forma)}</td><td>${brl(l.bruto)}</td><td>${brl(l.liquido)}</td><td><span class="badge ${pagas === (v.parcelas || []).length ? 'green' : 'amber'}">${pagas}/${(v.parcelas || []).length}</span></td><td>${esc(v.colaborador || '—')}</td><td>${esc(v.canal || '')}</td></tr>`; }).join('')
      || '<tr><td colspan="8"><div class="empty">Nenhuma venda registrada.</div></td></tr>'}</tbody></table></div></div>`;
  box.querySelectorAll('tr[data-id]').forEach(tr => tr.onclick = async () => { if (await editarVenda(vendas.find(v => v.id === tr.dataset.id), ctx)) recarregar(); });
}

async function editarVenda(v, { clientes, servicos, parceiros, cfg, equipe }) {
  const obj = { data: new Date().toISOString().slice(0, 10), forma: 'pix', nParcelas: 1, taxaPlataforma: cfg.comissao?.taxaPadraoAsaas ?? 3.5, colaborador: state.user.nome, ...v, nParcelas: (v.parcelas || []).length || 1 };
  let parcelas = v.parcelas ? JSON.parse(JSON.stringify(v.parcelas)) : null;
  const tabelaParcelas = () => `<table class="t">${(parcelas || []).map((p, i) => `<tr><td>${p.n}</td><td>${brl(p.valor)}</td><td>${br(p.vencimento)}</td><td><label class="chk" style="padding:0"><input type="checkbox" data-pg="${i}" ${p.pago ? 'checked' : ''}> pago</label></td><td><input type="date" data-dp="${i}" value="${esc(p.dataPago || '')}" style="width:150px"></td></tr>`).join('')}</table>`;
  const r = await modal({
    titulo: v.id ? 'Venda' : 'Nova venda', sub: 'Registre após o fechamento. Para baixa automática, use a referência externa do Asaas no formato <span class="mono">idVenda:indiceParcela</span>.', grande: true,
    corpo: `<div class="grid g3">${campos([
      { k: 'clienteId', l: 'Cliente', tipo: 'select', opcoes: [['', '—'], ...clientes.map(c => [c.id, `${c.marca} · ${c.nome || ''}`])] },
      { k: 'servico', l: 'Serviço', tipo: 'select', opcoes: servicos.map(s => s.nome), req: true }, { k: 'data', l: 'Data do fechamento', tipo: 'date', req: true },
      { k: 'valor', l: 'Honorários (R$)', tipo: 'number', step: '0.01', req: true }, { k: 'forma', l: 'Forma de pagamento', tipo: 'select', opcoes: Object.entries(FORMAS).filter(([k]) => k !== 'permuta' || isAdmin()) },
      { k: 'nParcelas', l: 'Nº de parcelas', tipo: 'number' }, { k: 'taxaPlataforma', l: 'Taxa Asaas (%)', tipo: 'number', step: '0.01' },
      { k: 'colaborador', l: 'Colaborador (comissão)', tipo: 'select', opcoes: [['', '— sem comissão —'], ...equipe] },
      { k: 'canal', l: 'Canal de origem', tipo: 'select', opcoes: [['', '—'], ...Object.entries(CANAIS)] },
      { k: 'parceiroId', l: 'Parceiro (repasse)', tipo: 'select', opcoes: [['', '— nenhum —'], ...parceiros.filter(p => p.tipo === 'contador').map(p => [p.id, `${p.nome} (${p.percentual}%)`])] },
      { k: 'recorrente', l: 'Assinatura recorrente', tipo: 'select', opcoes: [['', 'Não'], ['mensal', 'Mensal'], ['anual', 'Anual']] },
      { k: 'asaasLink', l: 'Link de cobrança Asaas' }, { k: 'obs', l: 'Observações', tipo: 'textarea', cls: 'span2' }], obj)}</div>
      <div class="row between" style="margin-top:12px"><h3 style="margin:0">Parcelas</h3><button class="btn sm" id="gp">Gerar parcelas</button></div><div id="parc">${parcelas ? tabelaParcelas() : '<p class="faint small">Clique em “Gerar parcelas”.</p>'}</div>`,
    onOpen: (b) => {
      const ligar = () => {
        b.querySelectorAll('[data-pg]').forEach(i => i.onchange = () => { parcelas[+i.dataset.pg].pago = i.checked; if (i.checked && !parcelas[+i.dataset.pg].dataPago) { parcelas[+i.dataset.pg].dataPago = new Date().toISOString().slice(0, 10); b.querySelector(`[data-dp="${i.dataset.pg}"]`).value = parcelas[+i.dataset.pg].dataPago; } });
        b.querySelectorAll('[data-dp]').forEach(i => i.onchange = () => { parcelas[+i.dataset.dp].dataPago = i.value; });
      };
      ligar();
      b.querySelector('#gp').onclick = () => {
        const d = lerForm(b);
        const n = d.forma === 'boleto_parcelado' ? Math.max(1, +d.nParcelas || 1) : 1;
        parcelas = gerarParcelas(+d.valor || 0, n, d.data);
        if (['pix', 'cartao', 'debito'].includes(d.forma)) { parcelas[0].pago = true; parcelas[0].dataPago = d.data; }
        b.querySelector('#parc').innerHTML = tabelaParcelas(); ligar();
      };
      b.querySelector('[name=servico]').onchange = (e) => { const s = servicos.find(x => x.nome === e.target.value); if (s && !b.querySelector('[name=valor]').value) b.querySelector('[name=valor]').value = s.preco; };
    },
    acoes: [
      ...(v.id && isAdmin() ? [{ label: 'Excluir', cls: 'danger', onClick: async () => { if (!await confirmar('Excluir venda', 'Excluir esta venda?')) return false; await store.remove('vendas', v.id); return 'del'; } }] : []),
      { label: 'Cancelar', valor: null },
      { label: 'Salvar', cls: 'neon', onClick: (b) => { const d = lerForm(b); if (!d.servico || !d.valor) { toast('Informe serviço e valor.', true); return false; } return d; } },
    ],
  });
  if (!r || r === 'del') return r;
  const { nParcelas, ...d } = r;
  if (!parcelas) { parcelas = gerarParcelas(+d.valor, ['boleto_parcelado'].includes(d.forma) ? Math.max(1, +nParcelas) : 1, d.data); if (['pix', 'cartao', 'debito'].includes(d.forma)) { parcelas[0].pago = true; parcelas[0].dataPago = d.data; } }
  const c = clientes.find(x => x.id === d.clienteId);
  const salvo = await store.save('vendas', { ...v, ...d, valor: +d.valor, taxaPlataforma: +d.taxaPlataforma || 0, parcelas, clienteNome: c ? `${c.marca} · ${c.nome || ''}` : (v.clienteNome || '') });
  if (c && !v.id && ['novo', 'contato', 'analise', 'parecer_enviado', 'negociacao', 'documentacao'].includes(c.etapa)) await store.patch('clientes', c.id, { etapa: 'pagamento' });
  toast('Venda salva.');
  return salvo;
}

function tabComissoes(box, { vendas, parceiros, cfg }) {
  const cc = cfg.comissao || {};
  const res = comissoes(vendas, parceiros, cc, ref);
  const tri = trimestre(ref);
  const equipeTri = Object.values(res).reduce((s, r) => s + r.trimestre, 0);
  const meta = +cc.metaTrimestral || 0;
  const visiveis = Object.entries(res).filter(([n]) => isAdmin() || n === state.user.nome);
  box.innerHTML = `<div class="grid g2" style="margin-bottom:16px">
    <div class="card"><h2>Faixas de comissão (mês)</h2><p class="sub">Sobre o honorário líquido da Vora (honorários − taxa Asaas − repasse a parceiro).</p>
      <div class="stack">${(cc.faixas || []).map((f, i, arr) => `<div class="file-row"><span class="badge lime">${f.pct}%</span><span>${i === 0 ? 'até' : 'de ' + brl((+arr[i - 1].ate) + 0.01) + ' até'} ${f.ate ? brl(f.ate) : '∞'}</span></div>`).join('')}</div>
      <p class="small muted" style="margin-top:10px">Bônus trimestral: +${cc.bonusTrimestral || 0} p.p. ao atingir ${brl(meta)} no trimestre (teto ${cc.tetoPct || 25}%). Boleto parcelado: liberação ${cc.regraBoleto === '50-50' ? '50% na entrada + 50% na 2ª parcela' : 'proporcional a cada parcela liquidada'}.</p></div>
    <div class="card"><h2>Meta coletiva do trimestre</h2><p class="sub">${tri[0]} a ${tri[2]} — a equipe ganha junto.</p>
      <div class="kpi"><div class="v lime">${brl(equipeTri)}</div><div class="d">de ${brl(meta)} (${meta ? Math.min(100, (equipeTri / meta) * 100).toFixed(0) : 0}%)</div></div>
      <div class="progress" style="margin-top:10px"><i style="width:${meta ? Math.min(100, (equipeTri / meta) * 100) : 0}%"></i></div>
      <p class="small muted" style="margin-top:10px">Gamificação não tóxica: cada um compete com a própria meta; o progresso coletivo é celebrado em conjunto. Vendas via PIX/cartão liberam a comissão mais rápido.</p></div></div>
    <div class="grid g2">${visiveis.map(([nome, r]) => `<div class="card"><div class="row between"><h2 style="margin:0">${esc(nome)}</h2><span class="badge lime">${r.pct}%</span></div>
      <div class="grid g3" style="margin-top:12px"><div class="kpi"><div class="sys-tag">Vendido (líquido)</div><div class="v" style="font-size:20px">${brl(r.vendido)}</div></div>
      <div class="kpi good"><div class="sys-tag">Liberada em ${ref}</div><div class="v" style="font-size:20px">${brl(r.liberada)}</div></div>
      <div class="kpi"><div class="sys-tag">A liberar</div><div class="v" style="font-size:20px">${brl(r.aLiberar)}</div></div></div>
      ${r.proxFaixa ? `<div class="small" style="margin-top:12px">Faltam <b class="lime">${brl(r.proxFaixa.falta)}</b> para a faixa de ${r.proxFaixa.pct}% 🚀</div><div class="progress" style="margin-top:6px"><i style="width:${Math.min(100, (r.vendido / (r.vendido + r.proxFaixa.falta)) * 100)}%"></i></div>` : '<div class="badge lime" style="margin-top:12px">Faixa máxima atingida 🏆</div>'}
      ${r.detalhes.length ? `<details style="margin-top:10px"><summary class="small muted">Detalhe da liberação (${r.detalhes.length})</summary><table class="t">${r.detalhes.map(d => `<tr><td>${esc(d.v.clienteNome || '')}</td><td class="small">${esc(d.regra)}</td><td>${brl(d.valor)}</td></tr>`).join('')}</table></details>` : ''}</div>`).join('') || '<div class="empty">Nenhuma venda com colaborador atribuído.</div>'}</div>
    ${isAdmin() ? `<div class="row" style="margin-top:14px"><button class="btn" id="exp">Exportar fechamento de comissões (CSV)</button></div>` : ''}`;
  box.querySelector('#exp')?.addEventListener('click', () => baixarTexto(`comissoes-${ref}.csv`, csvGerar([['Colaborador', 'Mês', '% faixa', 'Vendido líquido', 'Comissão gerada', 'Liberada no mês', 'A liberar'], ...Object.entries(res).map(([n, r]) => [n, ref, r.pct, r.vendido.toFixed(2), r.gerada.toFixed(2), r.liberada.toFixed(2), r.aLiberar.toFixed(2)])]), 'text/csv;charset=utf-8'));
}

function tabParceiros(box, { vendas, parceiros }) {
  const linhas = parceiros.map(p => {
    const vs = vendas.filter(v => v.parceiroId === p.id);
    const devido = vs.reduce((s, v) => s + liquidoVenda(v, parceiros).repasse, 0);
    const doMes = vs.filter(v => String(v.data).startsWith(ref)).reduce((s, v) => s + liquidoVenda(v, parceiros).repasse, 0);
    return { p, vs, devido, doMes };
  });
  box.innerHTML = `<div class="card"><h2>Repasses a parceiros</h2><p class="sub">Contadores: % sobre o valor líquido que o cliente indicado deixou em contrato. Cadastre parceiros em Prospecção › Polos & parcerias.</p>
    <table class="t"><tr><th>Parceiro</th><th>Tipo</th><th>%</th><th>Clientes indicados</th><th>Repasse em ${ref}</th><th>Repasse acumulado</th></tr>
    ${linhas.map(l => `<tr><td><b>${esc(l.p.nome)}</b></td><td>${esc(l.p.tipo)}</td><td>${esc(l.p.percentual || 0)}%</td><td>${l.vs.length}</td><td>${brl(l.doMes)}</td><td>${brl(l.devido)}</td></tr>`).join('') || '<tr><td colspan="6"><div class="empty">Sem parceiros.</div></td></tr>'}</table></div>`;
}

function tabDespesas(box, { despesas, recarregar }) {
  box.innerHTML = `<div class="card"><div class="row between"><h2 style="margin:0">Saídas</h2>${isAdmin() ? '<button class="btn sm neon" id="nd">+ Saída</button>' : ''}</div>
    <table class="t" style="margin-top:12px"><tr><th>Data</th><th>Descrição</th><th>Categoria</th><th>Valor</th></tr>
    ${despesas.sort((a, b) => String(b.data).localeCompare(String(a.data))).map(d => `<tr><td>${br(d.data)}</td><td>${esc(d.descricao)}</td><td>${esc(d.categoria)}</td><td>${brl(d.valor)}</td></tr>`).join('') || '<tr><td colspan="4"><div class="empty">Nenhuma saída registrada.</div></td></tr>'}</table></div>`;
  box.querySelector('#nd')?.addEventListener('click', async () => {
    const r = await modal({ titulo: 'Nova saída', corpo: `<div class="grid g2">${campos([{ k: 'data', l: 'Data', tipo: 'date', req: true }, { k: 'valor', l: 'Valor', tipo: 'number', step: '0.01', req: true }, { k: 'descricao', l: 'Descrição', req: true }, { k: 'categoria', l: 'Categoria', tipo: 'select', opcoes: ['Comissões', 'Pró-labore', 'Ferramentas (Trello, Tally, ZapSign…)', 'Marketing / anúncios', 'Contabilidade', 'Impostos (Simples)', 'Espaço físico', 'Outros'] }], { data: new Date().toISOString().slice(0, 10) })}</div>`, acoes: [{ label: 'Cancelar', valor: null }, { label: 'Salvar', cls: 'neon', onClick: (b) => lerForm(b) }] });
    if (r) { await store.save('despesas', { ...r, valor: +r.valor }); recarregar(); }
  });
}

function tabAsaas(box, { vendas, parceiros }) {
  box.innerHTML = `<div class="grid g2"><div class="card"><h2>Asaas — baixa automática</h2><ol class="small muted" style="padding-left:18px">
    <li>No Asaas, crie a cobrança e preencha a <b>Referência externa</b> como <span class="mono">ID-DA-VENDA:0</span> (0 = 1ª parcela, 1 = 2ª…). O ID aparece na URL da venda.</li>
    <li>Em Integrações › Webhooks, aponte para <span class="mono">${esc(location.origin)}/api/webhooks/asaas</span> e defina um token de autenticação.</li>
    <li>O mesmo token deve estar na variável <span class="mono">ASAAS_WEBHOOK_TOKEN</span> do servidor.</li>
    <li>Eventos <span class="mono">PAYMENT_RECEIVED</span> e <span class="mono">PAYMENT_CONFIRMED</span> marcam a parcela como paga e liberam a comissão.</li></ol>
    <a class="btn" target="_blank" rel="noopener" href="https://www.asaas.com/">Abrir Asaas ↗</a></div>
    <div class="card"><h2>Dashboard Financeiro no Google Sheets</h2><p class="sub">Exporte a base consolidada e importe na planilha geral (Arquivo › Importar). Cada cliente pode ter sua aba/planilha individual na pasta 04 do Drive.</p>
    <div class="row"><button class="btn" id="e1">Exportar vendas (CSV)</button><button class="btn" id="e2">Exportar parcelas (CSV)</button></div></div></div>`;
  box.querySelector('#e1').onclick = () => baixarTexto('vora-vendas.csv', csvGerar([['id', 'data', 'cliente', 'servico', 'forma', 'bruto', 'taxa', 'repasse', 'liquido', 'colaborador', 'canal', 'recorrente'], ...vendas.map(v => { const l = liquidoVenda(v, parceiros); return [v.id, v.data, v.clienteNome, v.servico, v.forma, l.bruto, l.taxa.toFixed(2), l.repasse.toFixed(2), l.liquido.toFixed(2), v.colaborador, v.canal, v.recorrente]; })]), 'text/csv;charset=utf-8');
  box.querySelector('#e2').onclick = () => baixarTexto('vora-parcelas.csv', csvGerar([['venda', 'cliente', 'parcela', 'valor', 'vencimento', 'pago', 'data_pagamento'], ...todasParcelas(vendas).map(p => [p.v.id, p.v.clienteNome, p.n, p.valor, p.vencimento, p.pago ? 'sim' : 'não', p.dataPago])]), 'text/csv;charset=utf-8');
}
