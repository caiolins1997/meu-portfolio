// Módulo 6 — Afazeres únicos: modelos de documentos no timbrado Vora + Pasta Modelo do Google Drive.
import { store, esc, getConfig, copiar, campos, lerForm } from '../core.js';
import { cabecalho } from '../app.js';
import { MODELOS } from '../lib/modelos.js';
import { PASTAS } from '../lib/dominio.js';
import { gerarModeloCliente } from './clientes.js';

export async function render(el, [modeloId, clienteId, colidId]) {
  const [clientes, cfg] = await Promise.all([store.list('clientes'), getConfig()]);
  const grupos = [...new Set(MODELOS.map(m => m.grupo))];
  el.innerHTML = cabecalho('Modelos de documentos', 'Procurações, contratos, termos, notificação e acervo de peças técnicas perante o INPI — todos no timbrado Vora (mesma identidade de vorapi.com.br) e com cláusula LGPD. Minutas-base para revisão do responsável técnico.', '', 'Módulo 6 · Afazeres únicos')
    + `<div class="card" style="margin-bottom:16px"><div class="grid g3">${campos([{ k: 'cliente', l: 'Gerar para o cliente', tipo: 'select', opcoes: [['', '— modelo em branco —'], ...clientes.map(c => [c.id, `${c.marca} · ${c.titular || c.nome || ''}`])] }], { cliente: clienteId || '' })}
      <div class="small muted span2" style="align-self:end">Os campos do cadastro são preenchidos automaticamente; o que faltar aparece destacado e pode ser editado no próprio documento antes de imprimir/salvar em PDF e enviar ao ZapSign/Autentique.</div></div></div>
    <div class="grid g3">${grupos.map(g => `<div class="card"><h2>${esc(g)}</h2><div class="stack" style="gap:6px">${MODELOS.filter(m => m.grupo === g).map(m => `<button class="btn sm" style="justify-content:flex-start;text-align:left;white-space:normal" data-m="${m.id}"><span class="mono lime">${esc(m.id)}</span> ${esc(m.titulo)}</button>`).join('')}</div></div>`).join('')}
      <div class="card"><h2>Relatórios automáticos</h2><div class="stack small muted">
        <div>2.1 Relatório Cadastral → <a href="#/clientes">Cliente</a> › Relatório cadastral</div><div>2. Relatório e Parecer de Viabilidade → <a href="#/analises">Análises</a></div>
        <div>12.1 Relatório mensal com Resumo de Vigilância → <a href="#/carteira">Carteira INPI</a></div><div>12.2.2 Alerta de colidência timbrado → <a href="#/vigilancia">Vigilância RPI</a></div>
        <div>7.1 Cláusula de prova social → já incluída nos contratos 4.0/4.1 (Cláusula 7ª)</div></div></div></div>
    <div class="card" style="margin-top:16px"><h2>Pasta Modelo no Google Drive</h2><p class="sub">Estrutura padrão de cada cliente. Use o script abaixo no <a href="https://script.google.com/" target="_blank" rel="noopener">Google Apps Script</a> para criar a pasta de um cliente com todas as subpastas de uma vez.</p>
      <div class="grid g2"><div class="stack">${PASTAS.map(([id, n]) => `<div class="file-row" style="${id.includes('.') ? 'margin-left:24px' : ''}">📁 ${esc(n)}</div>`).join('')}</div>
      <div><pre class="msg-text mono small" style="max-height:300px;overflow:auto" id="gs">${esc(appsScript())}</pre><button class="btn sm" id="cp">Copiar script</button></div></div></div>`;
  const cliSel = () => clientes.find(c => c.id === el.querySelector('[name=cliente]').value) || {};
  const gerar = async (id, extra = {}) => gerarModeloCliente(MODELOS.find(m => m.id === id), cliSel(), cfg, extra);
  el.querySelectorAll('[data-m]').forEach(b => b.onclick = () => gerar(b.dataset.m));
  el.querySelector('#cp').onclick = () => copiar(appsScript());
  if (modeloId && MODELOS.some(m => m.id === modeloId)) {
    let extra = {};
    if (colidId) {
      const x = (await store.list('colidencias')).find(k => k.id === colidId);
      if (x) extra = { processoTerceiro: x.processoTerceiro, marcaTerceiro: x.marcaTerceiro, classe: x.classes, rpi: x.rpi, dataRpi: x.dataRpi, processoAnterior: '' };
    }
    gerar(modeloId, extra);
  }
}

function appsScript() {
  return `// Vora Propriedade Industrial — cria a Pasta Modelo do cliente no Google Drive
// Uso: altere NOME_CLIENTE e execute criarPastaCliente().
const NOME_CLIENTE = 'MARCA - Nome do Cliente';
const PASTA_RAIZ_ID = ''; // opcional: ID da pasta "Clientes Vora"

function criarPastaCliente() {
  const raiz = PASTA_RAIZ_ID ? DriveApp.getFolderById(PASTA_RAIZ_ID) : DriveApp.getRootFolder();
  const cli = raiz.createFolder(NOME_CLIENTE);
  cli.createFolder('01. Documentos Pessoais e Societários');
  const analise = cli.createFolder('02. Análise de Viabilidade');
  analise.createFolder('Pesquisa Banco INPI');
  cli.createFolder('03. Contrato e Procuração');
  cli.createFolder('04. Financeiro e Comprovantes');
  cli.createFolder('05. Processos INPI');
  cli.createFolder('06. Vigilância e Colidências');
  Logger.log('Pasta criada: ' + cli.getUrl());
}`;
}
