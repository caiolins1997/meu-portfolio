// Componentes compartilhados entre telas: cadastro de lead, envio de mensagens, análise vinculada.
import { store, state, esc, formModal, modal, preencher, waLink, gmailLink, copiar, toast, getConfig, usuarios, br } from '../core.js';
import { CANAIS } from '../lib/dominio.js';

export const CAMPOS_LEAD = (resp = []) => [
  { k: 'nome', l: 'Nome', req: true },
  { k: 'marca', l: 'Nome da marca', req: true },
  { k: 'email', l: 'E-mail', tipo: 'email' },
  { k: 'telefone', l: 'Telefone / WhatsApp (+55)', ph: '+55 82 9…' },
  { k: 'tipoPessoa', l: 'Pessoa', tipo: 'select', opcoes: [['PF', 'Pessoa Física'], ['PJ', 'Pessoa Jurídica']] },
  { k: 'cpfCnpj', l: 'CPF / CNPJ' },
  { k: 'localidade', l: 'Localidade (cidade, UF, país)' },
  { k: 'origem', l: 'Canal de origem', tipo: 'select', opcoes: Object.entries(CANAIS) },
  { k: 'responsavel', l: 'Responsável', tipo: 'select', opcoes: [['', '—'], ...resp.map(r => [r, r])] },
  { k: 'numClasses', l: 'Nº estimado de marcas/classes', tipo: 'number' },
  { k: 'valorEstimado', l: 'Ticket estimado (R$)', tipo: 'number' },
  { k: 'indicadoPor', l: 'Indicado por (boca a boca / contador)' },
  { k: 'descricao', l: 'Atividade (produto/serviço e canais de venda)', tipo: 'textarea', cls: 'span2' },
];

export async function nomesEquipe() {
  try { return (await usuarios()).filter(u => u.ativo).map(u => u.nome); } catch { return [state.user.nome]; }
}

export async function novoLead(base = {}) {
  const resp = await nomesEquipe();
  const d = await formModal({ titulo: 'Novo lead', sub: 'Entrada manual (WhatsApp, indicação, e-mail, evento…)', lista: CAMPOS_LEAD(resp), obj: { tipoPessoa: 'PF', origem: 'B', responsavel: state.user.nome, ...base }, grande: true });
  if (!d) return null;
  const c = await store.save('clientes', { ...d, etapa: 'novo', entrada: 'manual', numClasses: +d.numClasses || 1, valorEstimado: +d.valorEstimado || 0 });
  toast('Lead cadastrado no funil.');
  return c;
}

// Cria (se não existir) a análise de viabilidade vinculada ao cliente — fluxo D4.
export async function garantirAnalise(c) {
  const lista = await store.list('analises');
  const existente = lista.find(a => a.clienteId === c.id);
  if (existente) return existente;
  return store.save('analises', { clienteId: c.id, marca: c.marca, status: 'rascunho_ia', termos: [], buscas: [], colidencias: [], classesAlvo: [], parecer: '', responsavel: c.responsavel || state.user.nome });
}

export function varsCliente(c = {}, cfg = {}, extra = {}) {
  const e = cfg.empresa || {};
  const link = cfg.linkFormulario || `${location.origin}/formulario`;
  return {
    nome: (c.nome || '').split(' ')[0], marca: c.marca, empresa: c.marca, responsavel: state.user?.nome?.split(' ')[0],
    link_formulario: link, whatsapp: e.whatsapp, viabilidade: c.viabilidade, valor: extra.valor,
    documentos: c.tipoPessoa === 'PJ' ? 'cartão CNPJ, contrato social/certificado MEI e RG/CNH do representante' : 'RG/CNH e CPF',
    ...extra,
  };
}

// Modal para escolher um modelo do playbook, preencher variáveis e enviar por WhatsApp / Gmail.
export async function enviarMensagem({ cliente = {}, codigo = '', categoria = '', extra = {}, onEnviado } = {}) {
  const [msgs, cfg] = await Promise.all([store.list('mensagens'), getConfig()]);
  const lista = msgs.filter(m => !categoria || m.categoria === categoria).sort((a, b) => a.codigo.localeCompare(b.codigo, 'pt', { numeric: true }));
  let atual = lista.find(m => m.codigo === codigo) || lista[0];
  const vars = varsCliente(cliente, cfg, extra);
  const render = (b) => {
    const txt = preencher(atual?.texto || '', vars);
    b.querySelector('textarea[name=texto]').value = txt;
    b.querySelector('#m-falt').innerHTML = (txt.match(/\[[\w.]+\]/g) || []).length ? `<span class="badge amber">Complete os campos entre colchetes</span>` : '';
  };
  return modal({
    titulo: 'Enviar mensagem do playbook', sub: `${esc(cliente.nome || '')} · ${esc(cliente.telefone || '')} · ${esc(cliente.email || '')}`, grande: true,
    corpo: `<div class="grid g3"><label class="f"><span>Modelo</span><select name="modelo">${lista.map(m => `<option value="${m.id}" ${m.id === atual?.id ? 'selected' : ''}>${esc(m.codigo)} · ${esc(m.titulo)}</option>`).join('')}</select></label>
      <label class="f"><span>WhatsApp</span><input name="tel" value="${esc(cliente.telefone || '')}"></label><label class="f"><span>E-mail</span><input name="mail" value="${esc(cliente.email || '')}"></label></div>
      <div id="m-falt" style="margin:10px 0"></div><label class="f"><span>Texto (editável)</span><textarea name="texto" rows="12"></textarea></label>`,
    onOpen: (b) => { render(b); b.querySelector('[name=modelo]').onchange = (e) => { atual = lista.find(m => m.id === e.target.value); render(b); }; },
    acoes: [
      { label: 'Copiar', onClick: (b) => { copiar(b.querySelector('[name=texto]').value); return false; } },
      { label: 'Abrir Gmail', onClick: (b) => { window.open(gmailLink(b.querySelector('[name=mail]').value, preencher(atual?.assunto || `Vora · ${cliente.marca || ''}`, vars), b.querySelector('[name=texto]').value), '_blank'); onEnviado?.(atual, 'email'); } },
      { label: 'Abrir WhatsApp', cls: 'neon', onClick: (b) => { window.open(waLink(b.querySelector('[name=tel]').value, b.querySelector('[name=texto]').value), '_blank'); onEnviado?.(atual, 'whatsapp'); } },
    ],
  });
}

export function linhaHistorico(h) {
  return `<div class="file-row"><span class="mono tiny faint nowrap">${esc(br(h.data) || h.data)}</span><span>${esc(h.texto)}</span><span class="faint tiny" style="margin-left:auto">${esc(h.por || '')}</span></div>`;
}

export async function registrarHistorico(c, texto) {
  const hist = [...(c.historico || []), { data: new Date().toISOString().slice(0, 10), texto, por: state.user.nome }];
  return store.patch('clientes', c.id, { historico: hist });
}
