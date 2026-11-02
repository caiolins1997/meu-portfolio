// Etapas 12–13 — Banco de Dados dos Clientes Vora (carteira antiga + nova, D9):
// processos no INPI, despachos, relatórios mensais e mensagens de atualização (10.9).
import { store, api, esc, br, tabs, kanban, modal, campos, lerForm, toast, falha, getConfig, csvParse, csvGerar, baixarTexto, confirmar, isAdmin } from '../core.js';
import { cabecalho } from '../app.js';
import { FASES_INPI, faseDoDespacho, regraPorDespacho, calcularPrazo, REGRAS_PADRAO } from '../lib/prazos.js';
import { apenasDigitos } from '../lib/texto.js';
import { abrirDocumento } from '../lib/timbrado.js';
import { relatorioMensal } from '../lib/modelos.js';
import { enviarMensagem, nomesEquipe } from './comum.js';

let aba = 'kanban';
let busca = '';
const faseNome = (id) => FASES_INPI.find(f => f.id === id)?.titulo || id || '—';

export async function render(el) {
  const [procs, clientes] = await Promise.all([store.list('processos', true), store.list('clientes')]);
  const pend = procs.filter(p => p.atualizacaoPendente).length;
  el.innerHTML = cabecalho('Carteira INPI', 'Todos os processos defendidos pela Vora. A leitura semanal da RPI atualiza os despachos automaticamente; avise o cliente e gere o relatório mensal com o Resumo de Vigilância.',
    `<button class="btn" data-a="csv">Exportar CSV</button><button class="btn neon" data-a="novo">+ Processo</button>`, `Etapas 12–13 · ${procs.length} processos`)
    + (pend ? `<div class="card" style="margin-bottom:16px;border-color:rgba(204,255,0,.4)"><b class="lime">${pend} processo(s) com movimentação nova na RPI</b> — avise os clientes (mensagens 10.9) e marque como notificado.</div>` : '')
    + tabs([['kanban', 'Kanban por fase'], ['tabela', 'Tabela'], ['importar', 'Importar carteira antiga']], aba) + '<div id="c"></div>';
  el.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { aba = b.dataset.tab; render(el); });
  el.querySelector('[data-a=novo]').onclick = async () => { if (await editar({}, clientes)) render(el); };
  el.querySelector('[data-a=csv]').onclick = () => baixarTexto('carteira-vora.csv', csvGerar([
    ['Processo', 'Marca', 'Titular', 'Classe', 'Apresentação', 'Fase', 'Situação', 'Depósito', 'Concessão', 'Vigência', 'Última RPI', 'Monitorar'],
    ...procs.map(p => [p.numero, p.marca, p.titular, p.classe, p.apresentacao, faseNome(p.fase), p.situacao, br(p.dataDeposito), br(p.dataConcessao), br(p.vigencia), p.ultimaRpi, p.monitorar === false ? 'não' : 'sim'])]), 'text/csv;charset=utf-8');
  const box = el.querySelector('#c');
  const abrir = async (p) => { await detalhe(p, clientes); render(el); };

  if (aba === 'kanban') {
    kanban(box, {
      colunas: FASES_INPI, itens: procs, campo: 'fase',
      card: (p) => `<div class="kt">${esc(p.marca)}</div><div class="km mono">${esc(p.numero || 'sem nº')}</div>
        <div class="km" style="margin-top:6px"><span class="badge">NCL ${esc(p.classe || '?')}</span>${p.atualizacaoPendente ? '<span class="badge lime">novo despacho</span>' : ''}${p.origemCarteira === 'antiga' ? '<span class="badge">carteira antiga</span>' : ''}</div>
        <div class="km" style="margin-top:4px"><span class="faint">${esc(p.titular || '')}</span></div>`,
      onOpen: abrir,
      onMove: async (p, para) => { await store.patch('processos', p.id, { fase: para }); toast(`Fase: ${faseNome(para)}`); render(el); },
    });
  } else if (aba === 'tabela') {
    box.innerHTML = `<div class="card"><input class="search" placeholder="Buscar processo, marca ou titular…" id="q" value="${esc(busca)}"><div class="table-wrap" style="margin-top:12px"><table class="t"><thead><tr><th>Processo</th><th>Marca</th><th>Titular</th><th>Classe</th><th>Fase</th><th>Situação</th><th>Última RPI</th></tr></thead><tbody id="tb"></tbody></table></div></div>`;
    const desenhar = () => {
      const q = busca.toLowerCase();
      box.querySelector('#tb').innerHTML = procs.filter(p => !q || `${p.numero} ${p.marca} ${p.titular}`.toLowerCase().includes(q)).map(p => `<tr class="click" data-id="${p.id}"><td class="mono">${esc(p.numero)}</td><td><b>${esc(p.marca)}</b></td><td>${esc(p.titular || '')}</td><td>${esc(p.classe || '')}</td><td><span class="badge">${esc(faseNome(p.fase))}</span></td><td class="small">${esc(p.situacao || '')}</td><td>${esc(p.ultimaRpi || '')}</td></tr>`).join('') || '<tr><td colspan="7"><div class="empty">Nenhum processo.</div></td></tr>';
      box.querySelectorAll('tr[data-id]').forEach(tr => tr.onclick = () => abrir(procs.find(p => p.id === tr.dataset.id)));
    };
    desenhar();
    box.querySelector('#q').oninput = (e) => { busca = e.target.value; desenhar(); };
  } else {
    box.innerHTML = `<div class="card"><h2>Importar carteira antiga (CSV)</h2><p class="sub">Exporte a planilha atual em CSV com cabeçalhos como: <span class="mono">processo, marca, titular, classe, apresentacao, situacao, deposito, concessao, vigencia, email, telefone</span>. Os processos entram na vigilância semanal automaticamente.</p>
      <input type="file" accept=".csv,text/csv" id="f"><div id="prev" style="margin-top:14px"></div></div>`;
    box.querySelector('#f').onchange = async (e) => {
      const linhas = csvParse(await e.target.files[0].text());
      const cab = linhas.shift().map(h => h.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim());
      const idx = (...n) => cab.findIndex(h => n.some(x => h.includes(x)));
      const m = { numero: idx('processo', 'numero'), marca: idx('marca'), titular: idx('titular', 'cliente'), classe: idx('classe', 'ncl'), apresentacao: idx('apresenta'), situacao: idx('situa', 'status'), dataDeposito: idx('deposito'), dataConcessao: idx('concess'), vigencia: idx('vigen'), email: idx('mail'), telefone: idx('telefone', 'whats', 'fone') };
      const conv = (v) => { const x = String(v || '').match(/(\d{2})\/(\d{2})\/(\d{4})/); return x ? `${x[3]}-${x[2]}-${x[1]}` : v; };
      const itens = linhas.map(l => {
        const o = {}; Object.entries(m).forEach(([k, i]) => { if (i >= 0) o[k] = (l[i] || '').trim(); });
        o.numero = apenasDigitos(o.numero); ['dataDeposito', 'dataConcessao', 'vigencia'].forEach(k => { if (o[k]) o[k] = conv(o[k]); });
        o.fase = faseDoDespacho(o.situacao || '') || 'protocolado'; o.monitorar = true; o.origemCarteira = 'antiga'; o.despachos = [];
        return o;
      }).filter(o => o.marca);
      const existentes = new Set(procs.map(p => p.numero));
      const novos = itens.filter(o => !o.numero || !existentes.has(o.numero));
      box.querySelector('#prev').innerHTML = `<p>${itens.length} linha(s) lidas · <b>${novos.length}</b> novas (duplicados por nº de processo ignorados).</p>
        <div class="table-wrap"><table class="t"><tr><th>Processo</th><th>Marca</th><th>Titular</th><th>Classe</th><th>Fase</th></tr>${novos.slice(0, 15).map(o => `<tr><td>${esc(o.numero)}</td><td>${esc(o.marca)}</td><td>${esc(o.titular || '')}</td><td>${esc(o.classe || '')}</td><td>${esc(faseNome(o.fase))}</td></tr>`).join('')}</table></div>
        <button class="btn neon" id="imp" style="margin-top:12px">Importar ${novos.length} processo(s)</button>`;
      box.querySelector('#imp').onclick = async () => { await store.bulk('processos', novos); toast(`${novos.length} processo(s) importados.`); aba = 'tabela'; render(el); };
    };
  }
}

const CAMPOS = (clientes, equipe) => [
  { k: 'numero', l: 'Nº do processo (9 dígitos)' }, { k: 'marca', l: 'Marca', req: true },
  { k: 'clienteId', l: 'Cliente vinculado', tipo: 'select', opcoes: [['', '— nenhum —'], ...clientes.map(c => [c.id, `${c.marca} · ${c.nome || ''}`])] },
  { k: 'titular', l: 'Titular' }, { k: 'classe', l: 'Classe(s) NCL' },
  { k: 'apresentacao', l: 'Apresentação', tipo: 'select', opcoes: ['', 'Nominativa', 'Mista', 'Figurativa', 'Tridimensional'] },
  { k: 'fase', l: 'Fase', tipo: 'select', opcoes: FASES_INPI.map(f => [f.id, f.titulo]) }, { k: 'situacao', l: 'Situação (texto do INPI)' },
  { k: 'dataDeposito', l: 'Depósito', tipo: 'date' }, { k: 'dataConcessao', l: 'Concessão', tipo: 'date' }, { k: 'vigencia', l: 'Vigência até', tipo: 'date' },
  { k: 'responsavel', l: 'Responsável', tipo: 'select', opcoes: [['', '—'], ...equipe] },
  { k: 'monitorar', l: 'Incluir na vigilância semanal (RPI)', tipo: 'check' }, { k: 'meusProcessos', l: 'Cadastrado em “Meus Processos” no INPI (alerta por e-mail)', tipo: 'check' },
  { k: 'origemCarteira', l: 'Carteira', tipo: 'select', opcoes: [['nova', 'Nova'], ['antiga', 'Antiga']] },
];

async function editar(p, clientes) {
  const equipe = await nomesEquipe();
  const d = await modal({
    titulo: p.id ? `Processo ${p.numero || ''}` : 'Novo processo', grande: true,
    corpo: `<div class="grid g3">${campos(CAMPOS(clientes, equipe), { monitorar: true, fase: 'protocolado', origemCarteira: 'nova', ...p })}</div>`,
    acoes: [{ label: 'Cancelar', valor: null }, {
      label: 'Salvar', cls: 'neon', onClick: (b) => {
        const x = lerForm(b);
        if (x.numero && apenasDigitos(x.numero).length !== 9) { toast('O nº do processo deve ter 9 dígitos.', true); return false; }
        return x;
      },
    }],
  });
  if (!d) return null;
  d.numero = apenasDigitos(d.numero);
  const c = clientes.find(x => x.id === d.clienteId);
  if (c && !d.titular) d.titular = c.titular || c.nome;
  return store.save('processos', { ...p, ...d, despachos: p.despachos || [] });
}

async function detalhe(p, clientes) {
  const [cfg, rpis, colid] = await Promise.all([getConfig(), store.list('rpis', true), store.list('colidencias')]);
  const c = clientes.find(x => x.id === p.clienteId) || { nome: p.titular, marca: p.marca, telefone: p.telefone, email: p.email };
  const ult = (p.despachos || []).slice(-1)[0];
  await modal({
    titulo: `${p.marca} · ${p.numero || 'sem nº'}`, sub: `${esc(faseNome(p.fase))} · ${esc(p.situacao || '')}`, grande: true,
    corpo: `<div class="grid g4" style="margin-bottom:14px">
        <div><div class="faint tiny mono">TITULAR</div>${esc(p.titular || '—')}</div><div><div class="faint tiny mono">CLASSE</div>${esc(p.classe || '—')}</div>
        <div><div class="faint tiny mono">DEPÓSITO</div>${esc(br(p.dataDeposito) || '—')}</div><div><div class="faint tiny mono">VIGILÂNCIA</div>${p.monitorar === false ? 'desligada' : '<span class="lime">ativa</span>'} ${p.meusProcessos ? '· Meus Processos ✓' : ''}</div></div>
      <h3>Despachos publicados</h3>
      <div class="table-wrap"><table class="t"><tr><th>RPI</th><th>Data</th><th>Código</th><th>Despacho / complemento</th></tr>
      ${(p.despachos || []).slice().reverse().map(d => `<tr><td class="mono">${esc(d.rpi)}</td><td>${esc(br(d.data))}</td><td class="mono small">${esc(d.codigo || '')}</td><td>${esc(d.despacho)}${d.complemento ? `<div class="faint small">${esc(d.complemento)}</div>` : ''}</td></tr>`).join('') || '<tr><td colspan="4" class="faint">Nenhum despacho registrado.</td></tr>'}</table></div>
      <div class="row" style="margin-top:12px"><a class="btn sm" target="_blank" rel="noopener" href="https://busca.inpi.gov.br/pePI/jsp/Base_pesquisa.jsp">Conferir no pePI ↗</a></div>`,
    acoes: [
      { label: 'Editar', onClick: async () => { await editar(p, clientes); } },
      { label: '+ Despacho manual', onClick: async () => { await novoDespacho(p, cfg); } },
      {
        label: 'Relatório mensal (12.1)', onClick: () => {
          const desde = Date.now() - 30 * 86400000;
          const stats = {
            fase: faseNome(p.fase), rpis: rpis.filter(r => new Date(r.processadoEm) >= desde).length,
            tentativas: colid.filter(x => x.marcaCliente === p.marca && new Date(x._criado) >= desde && x.status !== 'descartada').length, ultimaRpi: cfg.vigilancia?.ultimaRpi,
          };
          abrirDocumento({ titulo: `Relatorio Mensal - ${p.marca}`, kicker: 'Relatório mensal', empresa: cfg.empresa, html: relatorioMensal(p, c, stats), clienteId: p.clienteId, pasta: '05' });
          return false;
        },
      },
      ...(isAdmin() ? [{ label: 'Excluir', cls: 'danger', onClick: async () => { if (await confirmar('Excluir processo', 'Remover este processo da carteira?')) await store.remove('processos', p.id); else return false; } }] : []),
      {
        label: 'Avisar cliente (10.9)', cls: 'neon', onClick: async () => {
          const fase = FASES_INPI.find(f => f.id === p.fase);
          const prazos = await store.list('prazos');
          const pz = prazos.find(x => x.processoId === p.id && !['cumprido', 'cancelado'].includes(x.status));
          await enviarMensagem({ cliente: c, codigo: fase?.msg || '10.9-protocolo', categoria: 'Atualização INPI', extra: { processo: p.numero, rpi: ult?.rpi || p.ultimaRpi, prazo: pz ? br(pz.dataFatal) : '', fase: faseNome(p.fase), marca: p.marca }, onEnviado: () => store.patch('processos', p.id, { atualizacaoPendente: false, notificadoEm: new Date().toISOString() }) });
          return false;
        },
      },
    ],
  });
}

async function novoDespacho(p, cfg) {
  const d = await modal({
    titulo: 'Registrar despacho', sub: 'Use quando a movimentação vier por e-mail (“Meus Processos”) ou conferência manual.',
    corpo: `<div class="grid g3">${campos([{ k: 'rpi', l: 'Nº RPI (4 dígitos)', req: true }, { k: 'data', l: 'Data da RPI', tipo: 'date', req: true }, { k: 'codigo', l: 'Código (ex.: IPAS009)' }, { k: 'despacho', l: 'Despacho (texto exato)', cls: 'span2', req: true }, { k: 'complemento', l: 'Complemento', tipo: 'textarea', cls: 'span2' }], { data: new Date().toISOString().slice(0, 10), rpi: cfg.vigilancia?.ultimaRpi })}</div>`,
    acoes: [{ label: 'Cancelar', valor: null }, { label: 'Salvar', cls: 'neon', onClick: (b) => { const x = lerForm(b); if (!/^\d{4}$/.test(x.rpi) || !x.despacho) { toast('Informe RPI (4 dígitos) e despacho.', true); return false; } return x; } }],
  });
  if (!d) return;
  const fase = faseDoDespacho(d.despacho) || p.fase;
  await store.patch('processos', p.id, { despachos: [...(p.despachos || []), d], situacao: d.despacho, fase, ultimaRpi: d.rpi, atualizacaoPendente: true });
  const regra = regraPorDespacho(`${d.despacho} ${d.complemento}`, cfg.regrasPrazo || REGRAS_PADRAO, 'proprio');
  if (regra?.dias) {
    await store.save('prazos', { processoId: p.id, clienteId: p.clienteId || '', numero: p.numero, marca: p.marca, tipo: regra.id, tipoNome: regra.nome, rpi: d.rpi, dataPublicacao: d.data, dias: regra.dias, dataFatal: calcularPrazo(d.data, regra.dias, cfg.feriadosExtras || []), despacho: d.despacho, status: 'revisar', origem: 'manual' });
    toast(`Prazo “${regra.nome}” criado para revisão.`);
  } else toast('Despacho registrado.');
}
