// Etapa 12.2 — Vigilância semanal via RPI (Seção V Marcas, XML) + alertas de colidência.
import { store, api, esc, br, tabs, kanban, modal, toast, falha, getConfig, saveConfig, isAdmin, dataHora } from '../core.js';
import { cabecalho } from '../app.js';
import { STATUS_COLID, badgePrazo } from '../lib/dominio.js';
import { diasRestantes } from '../lib/prazos.js';
import { abrirDocumento } from '../lib/timbrado.js';
import { alertaColidencia, MODELOS, variaveis } from '../lib/modelos.js';
import { enviarMensagem } from './comum.js';

let aba = 'colid';

export async function render(el) {
  const [colid, rpis, clientes, cfg] = await Promise.all([store.list('colidencias', true), store.list('rpis', true), store.list('clientes'), getConfig(true)]);
  const vig = cfg.vigilancia || {};
  el.innerHTML = cabecalho('Vigilância RPI', 'Toda terça-feira o sistema lê a Revista da Propriedade Industrial (Seção V — Marcas, arquivo XML), atualiza os processos da carteira, gera prazos e detecta pedidos de terceiros idênticos ou semelhantes às marcas defendidas pela Vora.',
    `<a class="btn" target="_blank" rel="noopener" href="https://revistas.inpi.gov.br/rpi/">Portal da RPI ↗</a>`, `Etapa 12 · última RPI ${esc(vig.ultimaRpi || '—')}`)
    + `<div class="grid g3" style="margin-bottom:16px">
      <div class="card"><h3>Processar RPI</h3><p class="sub">Baixa o XML direto do INPI ou envie o arquivo (.xml ou .zip) da Seção V.</p>
        <div class="row"><input id="num" placeholder="Nº RPI (ex.: ${esc(String((+vig.ultimaRpi || 2800) + 1))})" maxlength="4" style="width:150px"><button class="btn neon" data-a="baixar">Baixar e processar</button></div>
        <div class="row" style="margin-top:10px"><input type="file" id="arq" accept=".xml,.zip"><button class="btn" data-a="up">Enviar arquivo</button></div>
        <div id="res" style="margin-top:10px"></div></div>
      <div class="card"><h3>Automação semanal</h3>
        <label class="chk"><input type="checkbox" id="auto" ${vig.autoRpi ? 'checked' : ''} ${isAdmin() ? '' : 'disabled'}><span>Buscar automaticamente a próxima RPI toda terça (após 10h)</span></label>
        <label class="f" style="margin-top:6px"><span>Última RPI processada (referência)</span><input id="ult" value="${esc(vig.ultimaRpi || '')}" maxlength="4" ${isAdmin() ? '' : 'disabled'}></label>
        <label class="f" style="margin-top:8px"><span>Sensibilidade (score mínimo de semelhança)</span><input id="lim" type="number" min="50" max="100" value="${esc(vig.limiarScore || 75)}" ${isAdmin() ? '' : 'disabled'}></label>
        ${isAdmin() ? '<button class="btn sm" data-a="cfg" style="margin-top:10px">Salvar</button>' : ''}</div>
      <div class="card"><h3>Dupla via de acompanhamento</h3><ol class="small muted" style="padding-left:18px;margin:0">
        <li><b>RPI</b>: XML como caminho principal (precisão) + PDFs 1 e 2 para conferência visual.</li>
        <li><b>E-mail do INPI</b>: todo processo protocolado deve estar em “Meus Processos” no login do INPI para receber as notificações.</li>
        <li>Movimentações por e-mail → registre em <a href="#/carteira">Carteira INPI</a> › “+ Despacho manual”.</li></ol></div>
    </div>`
    + tabs([['colid', `Colidências (${colid.filter(c => c.status === 'detectada').length} novas)`], ['rpis', `RPIs auditadas (${rpis.length})`]], aba) + '<div id="c"></div>';

  el.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { aba = b.dataset.tab; render(el); });
  const mostrar = (r) => {
    el.querySelector('#res').innerHTML = `<div class="msg-text">RPI ${esc(r.rpi)} (${esc(br(r.data))}): ${r.totalProcessos} processos lidos · ${r.publicacoesOposicao} publicações p/ oposição · <b>${r.colidencias}</b> colidência(s) · ${r.atualizacoes} processo(s) da carteira atualizados · ${r.prazosCriados} prazo(s) criados</div>`;
    store.invalidate('colidencias', 'processos', 'prazos', 'rpis');
    toast('RPI processada.');
  };
  el.querySelector('[data-a=baixar]').onclick = async (e) => {
    const b = e.target; b.disabled = true; b.textContent = 'Processando…';
    try { mostrar(await api('/api/rpi/baixar', { method: 'POST', body: { numero: el.querySelector('#num').value } })); setTimeout(() => render(el), 1800); }
    catch (er) { falha(er); } finally { b.disabled = false; b.textContent = 'Baixar e processar'; }
  };
  el.querySelector('[data-a=up]').onclick = async (e) => {
    const f = el.querySelector('#arq').files[0];
    if (!f) return toast('Selecione o arquivo XML/ZIP da RPI.', true);
    const b = e.target; b.disabled = true; b.textContent = 'Enviando…';
    try { mostrar(await api('/api/rpi/upload', { method: 'POST', body: f, headers: { 'Content-Type': 'application/octet-stream' } })); setTimeout(() => render(el), 1800); }
    catch (er) { falha(er); } finally { b.disabled = false; b.textContent = 'Enviar arquivo'; }
  };
  el.querySelector('[data-a=cfg]')?.addEventListener('click', async () => {
    await saveConfig({ vigilancia: { ...vig, autoRpi: el.querySelector('#auto').checked, ultimaRpi: el.querySelector('#ult').value.trim(), limiarScore: +el.querySelector('#lim').value || 75 } });
    toast('Configuração da vigilância salva.');
  });

  const box = el.querySelector('#c');
  if (aba === 'rpis') {
    box.innerHTML = `<div class="card"><div class="table-wrap"><table class="t"><thead><tr><th>RPI</th><th>Data</th><th>Processos lidos</th><th>Publ. p/ oposição</th><th>Colidências</th><th>Atualizações carteira</th><th>Prazos</th><th>Origem</th><th>Processada em</th></tr></thead><tbody>
      ${rpis.map(r => `<tr><td class="mono">${esc(r.numero)}</td><td>${esc(br(r.data))}</td><td>${r.totalProcessos}</td><td>${r.publicacoesOposicao}</td><td>${r.colidencias ? `<span class="badge red">${r.colidencias}</span>` : '0'}</td><td>${r.atualizacoes}</td><td>${r.prazosCriados}</td><td class="small">${esc(r.origem || '')}</td><td class="small">${dataHora(r.processadoEm)}</td></tr>`).join('') || '<tr><td colspan="9"><div class="empty">Nenhuma RPI processada ainda.</div></td></tr>'}</tbody></table></div></div>`;
    return;
  }
  kanban(box, {
    colunas: STATUS_COLID, itens: colid, campo: 'status',
    card: (x) => `<div class="kt">${esc(x.marcaTerceiro)}</div><div class="km">vs <b class="lime">${esc(x.marcaCliente)}</b></div>
      <div class="km" style="margin-top:6px"><span class="badge ${x.score >= 90 ? 'red' : 'amber'}">${x.score}%</span>${x.mesmaClasse ? '<span class="badge red">mesma classe</span>' : `<span class="badge">NCL ${esc(x.classes || '?')}</span>`}${badgePrazo(diasRestantes(x.prazoOposicao))}</div>
      <div class="km" style="margin-top:4px"><span class="faint">RPI ${esc(x.rpi)} · ${esc(x.processoTerceiro)}</span></div>`,
    onOpen: (x) => abrir(x, clientes, cfg, () => render(el)),
    onMove: async (x, para) => { await store.patch('colidencias', x.id, { status: para }); render(el); },
  });
}

async function abrir(x, clientes, cfg, depois) {
  const c = clientes.find(k => k.id === x.clienteId) || { marca: x.marcaCliente };
  const extra = { rpi: x.rpi, marcaTerceiro: x.marcaTerceiro, processoTerceiro: x.processoTerceiro, classe: x.classes, prazo: br(x.prazoOposicao), dataRpi: x.dataRpi };
  await modal({
    titulo: `${x.marcaTerceiro} × ${x.marcaCliente}`, sub: `RPI ${esc(x.rpi)} · processo ${esc(x.processoTerceiro)} · prazo de oposição ${esc(br(x.prazoOposicao))}`, grande: true,
    corpo: `<div class="grid g2"><div class="stack small">
        <div><span class="faint">Semelhança:</span> <b>${x.score}%</b> — ${esc(x.motivo)}</div>
        <div><span class="faint">Apresentação:</span> ${esc(x.apresentacao || '—')} · <span class="faint">Classe(s):</span> ${esc(x.classes || '—')} ${x.mesmaClasse ? '<span class="badge red">mesma classe</span>' : ''}</div>
        <div><span class="faint">Titular:</span> ${esc(x.titular || '—')}</div><div><span class="faint">Procurador:</span> ${esc(x.procurador || '—')}</div>
        <div><span class="faint">Despacho:</span> ${esc(x.despacho || '')}</div></div>
        <div><div class="faint small">Especificação</div><div class="msg-text" style="max-height:180px;overflow:auto">${esc(x.especificacao || '—')}</div></div></div>
      <label class="f" style="margin-top:12px"><span>Avaliação técnica (vai no alerta timbrado)</span><textarea id="par" rows="3">${esc(x.parecer || '')}</textarea></label>`,
    acoes: [
      { label: 'Salvar avaliação', onClick: async (b) => { await store.patch('colidencias', x.id, { parecer: b.querySelector('#par').value, status: x.status === 'detectada' ? 'analise' : x.status }); toast('Salvo.'); } },
      { label: 'Alerta timbrado (12.2.2)', onClick: (b) => { abrirDocumento({ titulo: `Alerta de Colidencia - ${x.marcaCliente} x ${x.marcaTerceiro}`, kicker: 'Alerta de colidência', empresa: cfg.empresa, html: alertaColidencia({ ...x, parecer: b.querySelector('#par').value }, c), clienteId: c.id, pasta: '06' }); return false; } },
      { label: 'Termo de declínio (12.2.4)', onClick: async () => { abrirDocumento({ titulo: `Termo de Declinio - ${x.marcaTerceiro}`, kicker: 'Termo de declínio', empresa: cfg.empresa, html: MODELOS.find(m => m.id === '12.2.4').gerar(variaveis(c, cfg, { ...extra, prazo: x.prazoOposicao })), clienteId: c.id, pasta: '06' }); await store.patch('colidencias', x.id, { status: 'declinada', declinadaEm: new Date().toISOString() }); depois(); } },
      { label: 'Gerar petição de oposição', onClick: () => { location.hash = `#/documentos/9.1/${x.clienteId || ''}/${x.id}`; } },
      { label: 'Enviar alerta ao cliente (12.2.3)', cls: 'neon', onClick: async () => { await enviarMensagem({ cliente: c, codigo: '12.2.3', categoria: 'Vigilância', extra, onEnviado: () => store.patch('colidencias', x.id, { status: 'alerta_enviado', alertaEm: new Date().toISOString() }).then(depois) }); return false; } },
    ],
  });
  depois();
}
