// Etapas 1–2 — Lista de disparos JUCEAL, higienização de contadores, prospecção ativa com prioridade ao
// Sócio-Administrador, régua de follow-up, canais de aquisição (A–E), Instagram e polos empresariais.
import { store, api, esc, br, tabs, kanban, modal, campos, lerForm, toast, falha, getConfig, preencher, waLink, gmailLink, csvParse, csvGerar, baixarTexto, formModal, isAdmin, state, confirmar } from '../core.js';
import { cabecalho } from '../app.js';
import { CANAIS, FECHADOS } from '../lib/dominio.js';
import { limparRazaoSocial, primeiroNome, capitalizar, apenasDigitos, semAcento } from '../lib/texto.js';
import { varsCliente } from './comum.js';

let aba = 'base';
const filtro = { q: '', status: 'novo', ano: '', segmento: '', pagina: 0 };
const POR_PAG = 50;
const TERMOS_CONTADOR = /cont[aá]bil|contador|contabilidade|assessoria|fisco|fiscal|escrit[oó]rio/i;
const CADENCIA = [7, 15, 30, 60, 90, 120];

export async function render(el) {
  const [prospects, cfg] = await Promise.all([store.list('prospects'), getConfig()]);
  const disparados = prospects.filter(p => ['disparado', 'respondeu', 'convertido', 'optout'].includes(p.status)).length;
  const respostas = prospects.filter(p => ['respondeu', 'convertido'].includes(p.status)).length;
  el.innerHTML = cabecalho('Prospecção', 'Base de empresas abertas em Alagoas (JUCEAL), separação automática de contadores, disparos personalizados pelo nome do Sócio-Administrador e régua de follow-up. Meça sempre a taxa de conversão de cada canal.', '', `Etapas 1–2 · ${prospects.length} empresas · resposta ${disparados ? ((respostas / disparados) * 100).toFixed(1) : '0'}%`)
    + tabs([['base', 'Base JUCEAL'], ['disparos', 'Disparos & follow-up'], ['contadores', 'Contadores (2º plano)'], ['canais', 'Canais & conversão'], ['instagram', 'Calendário Instagram'], ['polos', 'Polos & parcerias']], aba) + '<div id="c"></div>';
  el.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { aba = b.dataset.tab; filtro.pagina = 0; render(el); });
  const box = el.querySelector('#c');
  const ctx = { el, prospects, cfg, recarregar: () => render(el) };
  ({ base, disparos, contadores, canais, instagram, polos })[aba](box, ctx);
}

// ------- utilidades de personalização -------
function socioAdministrador(socios = '') {
  const partes = String(socios).split(/[;|\n]+|,(?=\s*[A-ZÁÉÍÓÚÂÊÔÃÕÇ]{3,})/).map(s => s.trim()).filter(Boolean);
  const adm = partes.find(s => /administrador/i.test(s)) || partes[0] || '';
  return adm.replace(/\(.*?\)|-\s*s[oó]cio.*$|s[oó]cio[\s-]*administrador|administrador|s[oó]cio/gi, '').replace(/\s{2,}/g, ' ').trim();
}
const nomeEmpresa = (p) => capitalizar(p.fantasia?.trim() || limparRazaoSocial(p.razao || ''));
const saudacao = (p) => primeiroNome(p.socioAdm) || 'tudo bem';
function varsProspect(p, cfg) {
  return { ...varsCliente({}, cfg), socio: saudacao(p), nome: saudacao(p), empresa: nomeEmpresa(p), marca: nomeEmpresa(p) };
}

// ------- Base JUCEAL -------
function base(box, { prospects, recarregar }) {
  const anos = [...new Set(prospects.map(p => p.ano).filter(Boolean))].sort();
  const segs = [...new Set(prospects.map(p => p.segmento).filter(Boolean))].sort();
  box.innerHTML = `<div class="grid g2" style="margin-bottom:16px">
    <div class="card"><h2>Importar planilha JUCEAL (CSV)</h2><p class="sub">Exporte cada planilha (por ano/segmento) em CSV. Colunas reconhecidas: razão social, nome fantasia, CNPJ, e-mail, telefone, endereço, município, sócios/quadro societário, ano/data de abertura, segmento/CNAE.</p>
      <div class="grid g2">${campos([{ k: 'ano', l: 'Ano (se não houver coluna)' }, { k: 'segmento', l: 'Segmento (se não houver coluna)' }])}</div>
      <input type="file" accept=".csv,text/csv" id="f" style="margin-top:10px"><div id="prev"></div></div>
    <div class="card"><h2>Higienização (Etapa 1)</h2><p class="sub">Conta quantas vezes cada e-mail/telefone se repete. Contatos em mais de 2 CNPJs ou com termos como “contábil”, “contador”, “assessoria”, “fisco” vão para a lista de Contadores de Alagoas (2º plano). Os demais seguem para a prospecção ampla, sem lista de bloqueio.</p>
      <button class="btn neon" data-a="hig">Rodar higienização agora</button><div id="hres" style="margin-top:10px"></div></div></div>
    <div class="card"><div class="row" style="margin-bottom:12px"><input class="search" id="q" placeholder="Buscar empresa, sócio, e-mail…" value="${esc(filtro.q)}">
      <select id="fs" style="width:auto">${[['', 'Todos os status'], ['novo', 'Novo'], ['disparado', 'Disparado'], ['respondeu', 'Respondeu'], ['convertido', 'Convertido em lead'], ['optout', 'Pediu para sair'], ['descartado', 'Descartado']].map(([v, l]) => `<option value="${v}" ${filtro.status === v ? 'selected' : ''}>${l}</option>`).join('')}</select>
      <select id="fa" style="width:auto"><option value="">Todos os anos</option>${anos.map(a => `<option ${filtro.ano === a ? 'selected' : ''}>${esc(a)}</option>`).join('')}</select>
      <select id="fg" style="width:auto"><option value="">Todos os segmentos</option>${segs.map(a => `<option ${filtro.segmento === a ? 'selected' : ''}>${esc(a)}</option>`).join('')}</select>
      <span class="faint small" id="cnt"></span>${isAdmin() ? '<button class="btn sm danger" data-a="limpar" style="margin-left:auto">Excluir filtrados</button>' : ''}</div>
      <div class="table-wrap"><table class="t"><thead><tr><th>Empresa</th><th>Sócio-Administrador</th><th>Contato</th><th>Ano · segmento</th><th>Status</th></tr></thead><tbody id="tb"></tbody></table></div>
      <div class="row" style="justify-content:center;margin-top:10px" id="pag"></div></div>`;

  const filtrados = () => {
    const q = semAcento(filtro.q.toLowerCase());
    return prospects.filter(p => !p.contador && (!filtro.status || p.status === filtro.status) && (!filtro.ano || p.ano === filtro.ano) && (!filtro.segmento || p.segmento === filtro.segmento)
      && (!q || semAcento(`${p.razao} ${p.fantasia} ${p.socios} ${p.email}`.toLowerCase()).includes(q)));
  };
  const desenhar = () => {
    const l = filtrados();
    const pg = l.slice(filtro.pagina * POR_PAG, (filtro.pagina + 1) * POR_PAG);
    box.querySelector('#cnt').textContent = `${l.length} empresa(s)`;
    box.querySelector('#tb').innerHTML = pg.map(p => `<tr class="click" data-id="${p.id}"><td><b>${esc(nomeEmpresa(p))}</b><div class="faint small">${esc(p.razao || '')} ${p.cnpj ? '· ' + esc(p.cnpj) : ''}</div></td>
      <td>${esc(p.socioAdm || '—')}</td><td class="small">${esc(p.email || '')}<br>${esc(p.telefone || '')}</td><td class="small">${esc(p.ano || '')} · ${esc(p.segmento || '')}</td><td><span class="badge">${esc(p.status)}</span></td></tr>`).join('')
      || '<tr><td colspan="5"><div class="empty">Importe uma planilha da JUCEAL para começar.</div></td></tr>';
    const tot = Math.ceil(l.length / POR_PAG);
    box.querySelector('#pag').innerHTML = tot > 1 ? `<button class="btn sm" data-p="-1" ${filtro.pagina === 0 ? 'disabled' : ''}>‹</button><span class="small muted">página ${filtro.pagina + 1} de ${tot}</span><button class="btn sm" data-p="1" ${filtro.pagina >= tot - 1 ? 'disabled' : ''}>›</button>` : '';
    box.querySelectorAll('[data-p]').forEach(b => b.onclick = () => { filtro.pagina += +b.dataset.p; desenhar(); });
    box.querySelectorAll('tr[data-id]').forEach(tr => tr.onclick = () => abrirProspect(prospects.find(p => p.id === tr.dataset.id), recarregar));
  };
  desenhar();
  box.querySelector('#q').oninput = (e) => { filtro.q = e.target.value; filtro.pagina = 0; desenhar(); };
  box.querySelector('#fs').onchange = (e) => { filtro.status = e.target.value; filtro.pagina = 0; desenhar(); };
  box.querySelector('#fa').onchange = (e) => { filtro.ano = e.target.value; filtro.pagina = 0; desenhar(); };
  box.querySelector('#fg').onchange = (e) => { filtro.segmento = e.target.value; filtro.pagina = 0; desenhar(); };
  box.querySelector('[data-a=limpar]')?.addEventListener('click', async () => {
    const ids = filtrados().map(p => p.id);
    if (!ids.length || !await confirmar('Excluir empresas', `Excluir ${ids.length} empresa(s) filtrada(s) da base?`)) return;
    await api('/api/c/prospects/bulk-delete', { method: 'POST', body: { ids } }); store.invalidate('prospects'); recarregar();
  });

  box.querySelector('#f').onchange = async (e) => {
    const extra = lerForm(box.querySelector('.card'));
    const linhas = csvParse(await e.target.files[0].text());
    const cab = linhas.shift().map(h => semAcento(h.toLowerCase()).trim());
    const idx = (...n) => cab.findIndex(h => n.some(x => h.includes(x)));
    const socCols = cab.map((h, i) => /socio|quadro|qsa|administrador/.test(h) ? i : -1).filter(i => i >= 0);
    const m = { razao: idx('razao', 'nome empresarial'), fantasia: idx('fantasia'), cnpj: idx('cnpj'), email: idx('mail'), telefone: idx('telefone', 'fone', 'celular', 'whats'), endereco: idx('endereco', 'logradouro'), cidade: idx('municipio', 'cidade'), ano: idx('ano', 'abertura', 'data de inicio'), segmento: idx('segmento', 'cnae', 'atividade') };
    const existentes = new Set(prospects.map(p => apenasDigitos(p.cnpj)).filter(Boolean));
    const itens = linhas.map(l => {
      const o = {}; Object.entries(m).forEach(([k, i]) => { if (i >= 0) o[k] = (l[i] || '').trim(); });
      o.socios = socCols.map(i => l[i]).filter(Boolean).join('; ');
      o.socioAdm = socioAdministrador(o.socios);
      if (o.ano && /\d{4}/.test(o.ano)) o.ano = o.ano.match(/\d{4}/)[0];
      o.ano = o.ano || extra.ano; o.segmento = o.segmento || extra.segmento;
      o.status = 'novo'; o.contador = false;
      return o;
    }).filter(o => (o.razao || o.fantasia) && (o.email || o.telefone) && !(o.cnpj && existentes.has(apenasDigitos(o.cnpj))));
    box.querySelector('#prev').innerHTML = `<p class="small" style="margin-top:10px">${linhas.length} linha(s) · <b>${itens.length}</b> válidas e novas (com e-mail ou telefone, sem CNPJ duplicado). Sócio-Administrador identificado em ${itens.filter(i => i.socioAdm).length}.</p>
      <div class="table-wrap"><table class="t">${itens.slice(0, 6).map(o => `<tr><td>${esc(nomeEmpresa(o))}</td><td>${esc(o.socioAdm || '—')}</td><td>${esc(o.email || '')}</td></tr>`).join('')}</table></div>
      <button class="btn neon" id="imp" style="margin-top:10px">Importar ${itens.length}</button>`;
    box.querySelector('#imp').onclick = async (ev) => {
      ev.target.disabled = true;
      try {
        for (let i = 0; i < itens.length; i += 2000) await store.bulk('prospects', itens.slice(i, i + 2000));
        toast(`${itens.length} empresa(s) importadas. Rode a higienização.`); recarregar();
      } catch (er) { falha(er); ev.target.disabled = false; }
    };
  };

  box.querySelector('[data-a=hig]').onclick = async () => {
    const porEmail = {}, porTel = {};
    for (const p of prospects) {
      const k = apenasDigitos(p.cnpj) || p.id;
      const em = String(p.email || '').toLowerCase().trim();
      const tel = apenasDigitos(p.telefone).slice(-9);
      if (em) (porEmail[em] ||= new Set()).add(k);
      if (tel.length >= 8) (porTel[tel] ||= new Set()).add(k);
    }
    const mudar = [];
    for (const p of prospects) {
      const em = String(p.email || '').toLowerCase().trim();
      const tel = apenasDigitos(p.telefone).slice(-9);
      const rep = Math.max(porEmail[em]?.size || 0, porTel[tel]?.size || 0);
      const termo = TERMOS_CONTADOR.test(`${p.email} ${p.razao} ${p.fantasia}`);
      const ehContador = rep > 2 || termo;
      if (ehContador !== !!p.contador) mudar.push({ id: p.id, contador: ehContador, repeticoes: rep, motivoContador: ehContador ? (termo ? 'termo contábil' : `contato em ${rep} CNPJs`) : '' });
    }
    if (mudar.length) await store.bulkUpdate('prospects', mudar);
    box.querySelector('#hres').innerHTML = `<div class="msg-text">${mudar.filter(x => x.contador).length} contato(s) movidos para Contadores · ${mudar.filter(x => !x.contador).length} devolvidos à prospecção.</div>`;
    toast('Higienização concluída.');
    setTimeout(recarregar, 1200);
  };
}

async function abrirProspect(p, recarregar) {
  const d = await formModal({
    titulo: nomeEmpresa(p), sub: esc(p.razao || ''), grande: true,
    lista: [{ k: 'fantasia', l: 'Nome fantasia' }, { k: 'razao', l: 'Razão social' }, { k: 'cnpj', l: 'CNPJ' }, { k: 'socioAdm', l: 'Sócio-Administrador (prioridade nº 1 na saudação)' }, { k: 'email', l: 'E-mail' }, { k: 'telefone', l: 'Telefone' },
      { k: 'cidade', l: 'Município' }, { k: 'ano', l: 'Ano' }, { k: 'segmento', l: 'Segmento' },
      { k: 'status', l: 'Status', tipo: 'select', opcoes: [['novo', 'Novo'], ['disparado', 'Disparado'], ['respondeu', 'Respondeu'], ['convertido', 'Convertido em lead'], ['optout', 'Pediu para sair'], ['descartado', 'Descartado']] },
      { k: 'contador', l: 'É contador (lista 2º plano)', tipo: 'check' }, { k: 'socios', l: 'Quadro societário', tipo: 'textarea', cls: 'span2' }],
    obj: p,
  });
  if (!d) return;
  await store.patch('prospects', p.id, d);
  if (d.status === 'respondeu' || d.status === 'convertido') await converter({ ...p, ...d });
  recarregar();
}

async function converter(p) {
  if (p.clienteId) return;
  const c = await store.save('clientes', { nome: p.socioAdm ? capitalizar(p.socioAdm) : nomeEmpresa(p), marca: nomeEmpresa(p), email: p.email, telefone: p.telefone, tipoPessoa: 'PJ', cpfCnpj: apenasDigitos(p.cnpj), titular: p.razao, localidade: `${p.cidade || ''}, AL, Brasil`, endereco: p.endereco, origem: 'A', etapa: 'contato', entrada: 'prospeccao', responsavel: state.user.nome, prospectId: p.id });
  await store.patch('prospects', p.id, { status: 'convertido', clienteId: c.id });
  toast('Lead criado no funil comercial (canal A).');
}

// ------- Disparos & follow-up -------
function disparos(box, { prospects, cfg, recarregar }) {
  const msgs = state.cache.mensagens;
  const fila = prospects.filter(p => !p.contador && p.status === 'novo');
  const hoje = Date.now();
  const fus = prospects.filter(p => p.status === 'disparado' && p.dataDisparo).map(p => {
    const feitos = p.followups || [];
    const prox = CADENCIA.find(d => !feitos.includes(d));
    const quando = prox ? new Date(new Date(p.dataDisparo).getTime() + prox * 86400000) : null;
    return { p, prox, quando };
  }).filter(x => x.prox && x.quando <= new Date(hoje + 86400000)).sort((a, b) => a.quando - b.quando);
  box.innerHTML = `<div class="grid g2">
    <div class="card"><h2>Fila de disparo (${fila.length})</h2><p class="sub">Saudação com o nome do Sócio-Administrador + nome fantasia (ou razão social limpa). Selecione um lote para exportar (mala direta) ou dispare um a um.</p>
      <div class="row"><label class="f" style="width:120px"><span>Tamanho do lote</span><input type="number" id="lote" value="50"></label>
      <button class="btn" data-a="csv">Exportar lote (CSV personalizado)</button><button class="btn" data-a="marcar">Marcar lote como disparado</button></div>
      <div class="stack" style="margin-top:12px;max-height:520px;overflow:auto">${fila.slice(0, 40).map(p => `<div class="file-row"><div><b>${esc(nomeEmpresa(p))}</b><div class="faint small">${esc(saudacao(p))} · ${esc(p.email || p.telefone || '')}</div></div>
        <div class="row" style="margin-left:auto">${p.email ? `<button class="btn xs" data-mail="${p.id}">E-mail</button>` : ''}${p.telefone ? `<button class="btn xs" data-wa="${p.id}">WhatsApp</button>` : ''}</div></div>`).join('') || '<div class="empty">Fila vazia.</div>'}</div></div>
    <div class="card"><h2>Follow-up de hoje (${fus.length})</h2><p class="sub">Cadência: 7, 15, 30, 45/60, 90 e 120 dias após o disparo.</p>
      <div class="stack">${fus.map(({ p, prox, quando }) => `<div class="file-row"><span class="badge ${quando < new Date(hoje - 86400000) ? 'amber' : 'lime'}">${prox}d</span><div><b>${esc(nomeEmpresa(p))}</b><div class="faint small">disparo ${br(p.dataDisparo)} · ${esc(saudacao(p))}</div></div>
        <div class="row" style="margin-left:auto"><button class="btn xs" data-fu="${p.id}|${prox}">Enviar</button><button class="btn xs ghost" data-resp="${p.id}">Respondeu</button></div></div>`).join('') || '<div class="empty">Nenhum follow-up pendente.</div>'}</div>
      <div class="hr"></div><h3>Resposta por e-mail (2.2)</h3><p class="small muted">Quando o lead responder: marque “Respondeu” (vira lead no funil, canal A) e envie a resposta rápida direcionando ao WhatsApp e ao formulário.</p></div></div>`;

  const tpl = async (cod) => (state.cache.mensagens || await store.list('mensagens')).find(m => m.codigo === cod);
  const marcar = async (p, canal) => store.patch('prospects', p.id, { status: 'disparado', dataDisparo: new Date().toISOString().slice(0, 10), canalDisparo: canal });
  box.querySelectorAll('[data-mail]').forEach(b => b.onclick = async () => {
    const p = prospects.find(x => x.id === b.dataset.mail); const m = await tpl('10.10-juceal-email'); const v = varsProspect(p, cfg);
    window.open(gmailLink(p.email, preencher(m.assunto, v), preencher(m.texto, v)), '_blank'); await marcar(p, 'email'); b.closest('.file-row').style.opacity = .4;
  });
  box.querySelectorAll('[data-wa]').forEach(b => b.onclick = async () => {
    const p = prospects.find(x => x.id === b.dataset.wa); const m = await tpl('10.10-juceal-whats');
    window.open(waLink(p.telefone, preencher(m.texto, varsProspect(p, cfg))), '_blank'); await marcar(p, 'whatsapp'); b.closest('.file-row').style.opacity = .4;
  });
  const lote = () => fila.slice(0, +box.querySelector('#lote').value || 50);
  box.querySelector('[data-a=csv]').onclick = async () => {
    const m = await tpl('10.10-juceal-email');
    baixarTexto(`lote-disparo-${new Date().toISOString().slice(0, 10)}.csv`, csvGerar([['email', 'telefone', 'socio', 'empresa', 'assunto', 'corpo'],
      ...lote().map(p => { const v = varsProspect(p, cfg); return [p.email, p.telefone, v.socio, v.empresa, preencher(m.assunto, v), preencher(m.texto, v)]; })]), 'text/csv;charset=utf-8');
  };
  box.querySelector('[data-a=marcar]').onclick = async () => {
    const l = lote();
    if (!await confirmar('Marcar lote', `Marcar ${l.length} empresa(s) como disparadas hoje?`)) return;
    const hojeStr = new Date().toISOString().slice(0, 10);
    await store.bulkUpdate('prospects', l.map(p => ({ id: p.id, status: 'disparado', dataDisparo: hojeStr, canalDisparo: 'lote' })));
    toast('Lote marcado. A régua de follow-up começa a contar hoje.'); recarregar();
  };
  box.querySelectorAll('[data-fu]').forEach(b => b.onclick = async () => {
    const [id, d] = b.dataset.fu.split('|');
    const p = prospects.find(x => x.id === id);
    const m = await tpl(`FU-${d}`);
    const txt = preencher(m.texto, { ...varsProspect(p, cfg), marca: nomeEmpresa(p) }).replace(/sua análise|a análise da marca|da sua análise/gi, 'nosso contato');
    window.open(p.telefone ? waLink(p.telefone, txt) : gmailLink(p.email, `${nomeEmpresa(p)} · Vora`, txt), '_blank');
    await store.patch('prospects', id, { followups: [...(p.followups || []), +d] }); b.closest('.file-row').style.opacity = .4;
  });
  box.querySelectorAll('[data-resp]').forEach(b => b.onclick = async () => { const p = prospects.find(x => x.id === b.dataset.resp); await store.patch('prospects', p.id, { status: 'respondeu' }); await converter(p); recarregar(); });
}

// ------- Contadores -------
function contadores(box, { prospects, recarregar }) {
  const l = prospects.filter(p => p.contador);
  box.innerHTML = `<div class="card"><h2>Contadores de Alagoas (${l.length})</h2><p class="sub">Proposta de parceria em 2º plano — priorize quando demonstrarem interesse ou entrarem em contato. Repasse sobre o valor líquido do cliente indicado (ver Financeiro › Parceiros).</p>
    <div class="row" style="margin-bottom:10px"><button class="btn sm" data-a="exp">Exportar CSV</button></div>
    <div class="table-wrap"><table class="t"><thead><tr><th>Escritório / contato</th><th>E-mail</th><th>Telefone</th><th>Motivo</th><th></th></tr></thead><tbody>
    ${l.slice(0, 300).map(p => `<tr><td><b>${esc(nomeEmpresa(p))}</b></td><td>${esc(p.email || '')}</td><td>${esc(p.telefone || '')}</td><td class="small">${esc(p.motivoContador || '')}</td><td><button class="btn xs" data-par="${p.id}">Virar parceiro</button></td></tr>`).join('') || '<tr><td colspan="5"><div class="empty">Rode a higienização na aba Base JUCEAL.</div></td></tr>'}</tbody></table></div></div>`;
  box.querySelector('[data-a=exp]').onclick = () => baixarTexto('contadores-alagoas.csv', csvGerar([['nome', 'email', 'telefone', 'motivo'], ...l.map(p => [nomeEmpresa(p), p.email, p.telefone, p.motivoContador])]), 'text/csv;charset=utf-8');
  box.querySelectorAll('[data-par]').forEach(b => b.onclick = async () => {
    const p = l.find(x => x.id === b.dataset.par);
    await store.save('parceiros', { nome: nomeEmpresa(p), tipo: 'contador', contato: `${p.email || ''} ${p.telefone || ''}`.trim(), percentual: 10, status: 'interessado' });
    toast('Parceiro criado em Polos & parcerias.'); aba = 'polos'; recarregar();
  });
}

// ------- Canais & conversão -------
async function canais(box) {
  const [clientes, analises, prospects] = await Promise.all([store.list('clientes'), store.list('analises'), store.list('prospects')]);
  const linhas = Object.entries(CANAIS).map(([k, nome]) => {
    const cs = clientes.filter(c => c.origem === k);
    const an = cs.filter(c => analises.some(a => a.clienteId === c.id)).length;
    const fe = cs.filter(c => FECHADOS.includes(c.etapa)).length;
    return { k, nome, leads: cs.length, an, fe, taxa: an ? (fe / an) * 100 : 0 };
  });
  const disp = prospects.filter(p => ['disparado', 'respondeu', 'convertido', 'optout'].includes(p.status)).length;
  const resp = prospects.filter(p => ['respondeu', 'convertido'].includes(p.status)).length;
  const max = Math.max(1, ...linhas.map(l => l.leads));
  box.innerHTML = `<div class="grid g4" style="margin-bottom:16px">
    <div class="card kpi"><div class="sys-tag">Disparos (A)</div><div class="v">${disp}</div></div>
    <div class="card kpi"><div class="sys-tag">Respostas ÷ disparos</div><div class="v lime">${disp ? ((resp / disp) * 100).toFixed(1) : '0'}%</div><div class="d">${resp} resposta(s)</div></div>
    <div class="card kpi"><div class="sys-tag">Leads totais</div><div class="v">${clientes.length}</div></div>
    <div class="card kpi"><div class="sys-tag">Fechamentos ÷ análises</div><div class="v lime">${(() => { const a = linhas.reduce((s, l) => s + l.an, 0), f = linhas.reduce((s, l) => s + l.fe, 0); return a ? ((f / a) * 100).toFixed(1) : '0'; })()}%</div></div></div>
    <div class="card"><h2>Conversão por canal</h2><p class="sub">Pergunte sempre a origem no primeiro atendimento (“Como você conheceu a Vora?”) e registre no cadastro do lead.</p>
    <div class="table-wrap"><table class="t"><tr><th>Canal</th><th>Leads</th><th></th><th>Análises</th><th>Fechamentos</th><th>Fech. ÷ análises</th></tr>
    ${linhas.map(l => `<tr><td>${esc(l.nome)}</td><td>${l.leads}</td><td style="width:30%"><div class="progress"><i style="width:${(l.leads / max) * 100}%"></i></div></td><td>${l.an}</td><td>${l.fe}</td><td><b>${l.taxa.toFixed(1)}%</b></td></tr>`).join('')}</table></div>
    <div class="hr"></div><p class="small muted">Link do formulário por canal (para medir a origem): ${Object.keys(CANAIS).map(k => `<span class="mono tiny">/formulario?origem=${k}</span>`).join(' · ')}</p></div>`;
}

// ------- Instagram -------
async function instagram(box, { recarregar }) {
  const posts = await store.list('posts', true);
  const COLS = [{ id: 'ideia', titulo: 'Banco de ideias' }, { id: 'producao', titulo: 'Em produção (arte Vora)' }, { id: 'agendado', titulo: 'Agendado' }, { id: 'publicado', titulo: 'Publicado' }];
  box.innerHTML = `<div class="row" style="margin-bottom:12px"><button class="btn neon" data-a="novo">+ Post</button><span class="muted small">Feed, Stories, Reels, casos práticos no Brasil e notícias de marcas — sempre com a identidade visual de vorapi.com.br. 2º momento: TikTok e LinkedIn.</span></div><div id="kb"></div>`;
  const editar = async (p = {}) => {
    const d = await formModal({ titulo: p.id ? 'Editar post' : 'Novo post', lista: [{ k: 'data', l: 'Data', tipo: 'date', req: true }, { k: 'formato', l: 'Formato', tipo: 'select', opcoes: ['Feed', 'Carrossel', 'Reels', 'Stories', 'TikTok', 'LinkedIn'] }, { k: 'tema', l: 'Tema', req: true, cls: 'span2' }, { k: 'legenda', l: 'Legenda / roteiro', tipo: 'textarea', cls: 'span2' }, { k: 'status', l: 'Status', tipo: 'select', opcoes: COLS.map(c => [c.id, c.titulo]) }], obj: { status: 'ideia', formato: 'Feed', ...p } });
    if (d) { await store.save('posts', { ...p, ...d }); recarregar(); }
  };
  kanban(box.querySelector('#kb'), {
    colunas: COLS, itens: posts.sort((a, b) => String(a.data).localeCompare(String(b.data))), campo: 'status',
    card: (p) => `<div class="kt">${esc(p.tema)}</div><div class="km"><span class="badge violet">${esc(p.formato)}</span><span class="badge">${esc(br(p.data))}</span></div>`,
    onOpen: editar, onMove: async (p, para) => { await store.patch('posts', p.id, { status: para }); recarregar(); },
  });
  box.querySelector('[data-a=novo]').onclick = () => editar();
}

// ------- Polos & parcerias -------
async function polos(box, { recarregar }) {
  const [ps, pars] = await Promise.all([store.list('polos', true), store.list('parceiros', true)]);
  box.innerHTML = `<div class="grid g2"><div class="card"><div class="row between"><h2 style="margin:0">Polos empresariais em Alagoas (E)</h2><button class="btn sm neon" data-a="polo">+ Polo</button></div>
      <p class="sub" style="margin-top:8px">Empresas, entidades, associações e locais que concentram empresários: mapear → analisar viabilidade → refinar estratégia → aproximar.</p>
      <div class="stack">${ps.map(p => `<div class="file-row click" data-polo="${p.id}"><div><b>${esc(p.nome)}</b><div class="faint small">${esc(p.tipo || '')} · ${esc(p.cidade || '')} · ${esc(p.contato || '')}</div></div><span class="badge" style="margin-left:auto">${esc(p.status || 'mapeado')}</span></div>`).join('') || '<div class="empty">Ex.: associações comerciais, CDL, SEBRAE, shoppings, coworkings, feiras e eventos.</div>'}</div></div>
    <div class="card"><div class="row between"><h2 style="margin:0">Parceiros (contadores e mídia)</h2><button class="btn sm neon" data-a="par">+ Parceiro</button></div>
      <p class="sub" style="margin-top:8px">Contadores: repasse % sobre o valor líquido do cliente indicado. Mídia/permuta (C): negociação direta de Caio — sem comissão aos colaboradores sobre a permuta.</p>
      <div class="stack">${pars.map(p => `<div class="file-row click" data-par="${p.id}"><span class="badge ${p.tipo === 'midia' ? 'violet' : 'sky'}">${p.tipo === 'midia' ? 'mídia' : 'contador'}</span><div><b>${esc(p.nome)}</b><div class="faint small">${esc(p.contato || '')}${p.tipo === 'contador' ? ` · repasse ${esc(p.percentual || 0)}%` : ''}</div></div><span class="badge" style="margin-left:auto">${esc(p.status || '')}</span></div>`).join('') || '<div class="empty">Nenhum parceiro.</div>'}</div></div></div>`;
  const ePolo = async (p = {}) => { const d = await formModal({ titulo: p.id ? p.nome : 'Novo polo', lista: [{ k: 'nome', l: 'Nome', req: true }, { k: 'tipo', l: 'Tipo', tipo: 'select', opcoes: ['Associação', 'Entidade de classe', 'Shopping / centro comercial', 'Coworking', 'Feira / evento', 'Empresa âncora', 'Outro'] }, { k: 'cidade', l: 'Cidade' }, { k: 'contato', l: 'Contato' }, { k: 'status', l: 'Status', tipo: 'select', opcoes: ['mapeado', 'analisando viabilidade', 'estratégia definida', 'contato feito', 'parceria ativa', 'descartado'] }, { k: 'notas', l: 'Estratégia / notas', tipo: 'textarea', cls: 'span2' }], obj: p }); if (d) { await store.save('polos', { ...p, ...d }); recarregar(); } };
  const ePar = async (p = {}) => {
    const lista = [{ k: 'nome', l: 'Nome', req: true }, { k: 'tipo', l: 'Tipo', tipo: 'select', opcoes: [['contador', 'Contador'], ...(isAdmin() ? [['midia', 'Mídia / permuta (Caio)']] : [])] }, { k: 'contato', l: 'Contato' }, { k: 'percentual', l: 'Repasse (%) — contador', tipo: 'number' }, { k: 'status', l: 'Status', tipo: 'select', opcoes: ['interessado', 'proposta enviada', 'ativo', 'inativo'] }, { k: 'notas', l: 'Notas', tipo: 'textarea', cls: 'span2' }];
    const d = await formModal({ titulo: p.id ? p.nome : 'Novo parceiro', lista, obj: { tipo: 'contador', percentual: 10, ...p } }); if (d) { await store.save('parceiros', { ...p, ...d, percentual: +d.percentual || 0 }); recarregar(); }
  };
  box.querySelector('[data-a=polo]').onclick = () => ePolo();
  box.querySelector('[data-a=par]').onclick = () => ePar();
  box.querySelectorAll('[data-polo]').forEach(r => r.onclick = () => ePolo(ps.find(p => p.id === r.dataset.polo)));
  box.querySelectorAll('[data-par]').forEach(r => r.onclick = () => ePar(pars.find(p => p.id === r.dataset.par)));
}
