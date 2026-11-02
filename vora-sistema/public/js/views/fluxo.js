// Mapa Organizacional / Fluxo Operacional (Etapas 1–13) + Mapa Mental (Módulo 5.3).
import { tabs } from '../core.js';
import { cabecalho } from '../app.js';

let aba = 'fluxo';
const QUEM = { ia: ['Agente de IA', 'sky'], col: ['Colaborador', 'violet'], caio: ['Caio', 'amber'], auto: ['Sistema', 'lime'], cli: ['Cliente', 'green'] };
const tag = (k) => `<span class="badge ${QUEM[k][1]}">${QUEM[k][0]}</span>`;

const ETAPAS = [
  { n: 1, t: 'Lista de disparos JUCEAL e canais de aquisição', q: ['auto', 'col'], tela: 'prospeccao', d: 'Importar planilhas JUCEAL, higienizar (contadores em >2 CNPJs ou termos contábeis → 2º plano) e medir a conversão de cada canal A–E.', e: 'Base limpa e taxa de conversão por canal.' },
  { n: 2, t: 'Prospecção ativa e follow-up', q: ['col', 'auto'], tela: 'prospeccao', d: 'Disparo personalizado pelo Sócio-Administrador + nome fantasia; resposta rápida levando ao WhatsApp/formulário; calendário do Instagram; régua 7/15/30/60/90/120 dias.', e: 'Leads respondendo e entrando no funil.' },
  { n: 3, t: 'Formulário de coleta', q: ['cli', 'auto'], tela: 'funil', d: 'Formulário próprio com a identidade Vora e consentimento LGPD. A entrada cai automaticamente no funil como “Novo lead”.', e: 'Dados essenciais da marca.' },
  { n: 4, t: 'Entrada e primeiro contato', q: ['col'], tela: 'mensagens', d: 'Mensagens 10.1 a 10.6 no WhatsApp oficial compartilhado. Perguntar a origem do lead.', e: 'Lead acolhido e formulário preenchido.' },
  { n: 5, t: 'Análise da marca (D4)', q: ['ia', 'col', 'caio'], tela: 'analises', d: 'IA extrai os dados → busca pePI Exata + Radical + fonéticas → PDFs P.1, P.2… → filtro por ramo/classe/status → 17 dados → relatório timbrado → conferência do colaborador → validação de Caio (2 min) → envio.', e: 'Relatório e parecer de viabilidade aprovado.' },
  { n: 6, t: 'Resposta pronta para fechamento', q: ['col'], tela: 'mensagens', d: 'Mensagem 10.8: contrato, procuração, documentos e pagamento.', e: 'Cliente decidido.' },
  { n: 7, t: 'Reunião (D5)', q: ['col', 'caio'], tela: 'funil', d: '1 marca simples: fechamento direto no WhatsApp (PDF + áudio). Ticket alto (múltiplas marcas/classes, grupos): reunião online ou presencial em Maceió.', e: 'Negociação concluída.' },
  { n: 8, t: 'Documentos, 2º relatório (CNAE), contrato e procuração', q: ['col', 'auto'], tela: 'clientes', d: 'Coletar CPF/CNPJ e documentos; extrair CNAEs do cartão CNPJ (Art. 128, §1º); adequar a logo ao e-Marcas; assinatura no ZapSign/Autentique.', e: 'Relatório cadastral + contrato e procuração assinados.' },
  { n: 9, t: 'Pagamento (Asaas), GRU e dashboard (D6)', q: ['col', 'auto'], tela: 'financeiro', d: 'Honorários via Asaas; GRU emitida no e-INPI no CPF/CNPJ do titular; baixa automática e comissão conforme liquidação.', e: 'Honorários e GRU quitados.' },
  { n: 10, t: 'Precificação por classe', q: ['col'], tela: 'precos', d: 'Valor cheio no 1º pedido e desconto progressivo/pacotes nos demais.', e: 'Proposta coerente com a tabela.' },
  { n: 11, t: 'Conferência, trava da GRU e protocolo', q: ['col', 'caio'], tela: 'clientes', d: 'Checklist de 10 itens; VEDADO protocolar sem a compensação efetiva da GRU; protocolo exclusivo de Caio no e-Marcas; comprovante na pasta 05.', e: 'Pedido protocolado e na carteira.' },
  { n: 12, t: 'Acompanhamento e vigilância via RPI', q: ['auto', 'col'], tela: 'vigilancia', d: 'Toda terça: RPI Seção V (XML) + “Meus Processos” por e-mail. Relatório mensal com Resumo de Vigilância. Colidência → alerta timbrado → oposição ou termo de declínio.', e: 'Cliente informado e oportunidades de oposição.' },
  { n: 13, t: 'Gestão de despachos e banco de dados', q: ['auto', 'col', 'caio'], tela: 'prazos', d: 'Todo despacho (exigência, oposição, indeferimento…) vira prazo contado, delegado e acompanhado até o protocolo final.', e: 'Nenhum prazo perdido.' },
];

const MAPA = [
  { t: 'Captação', c: 'var(--sky)', i: ['JUCEAL (e-mail + WhatsApp)', 'Instagram e site vorapi.com.br', 'Indicações (boca a boca)', 'Polos empresariais de AL', 'Contadores e permutas (2º plano)'] },
  { t: 'Atendimento — Colaborador', c: 'var(--violet)', i: ['WhatsApp oficial compartilhado', 'Mensagens 10.1–10.8', 'Formulário de análise', 'Agendamentos e reuniões', 'Coleta e conferência de documentos'] },
  { t: 'Técnico — IA + Colaborador', c: 'var(--sky)', i: ['Busca pePI Exata/Radical/fonética', 'PDFs P.1, P.2… no Drive', '17 dados obrigatórios', 'Relatório timbrado', 'CNAE × classe · logo .JPG'] },
  { t: 'Validação — Caio', c: 'var(--amber)', i: ['Aprovar parecer (2 min)', 'Protocolo no e-Marcas', 'Revisão de prazos e peças', 'Permutas de mídia', 'Configurações e metas'] },
  { t: 'Financeiro', c: 'var(--emerald)', i: ['Asaas (PIX, cartão, boleto)', 'GRU paga pelo cliente', 'Comissão 15–25% por liquidação', 'Repasse a contadores', 'Dashboard e inadimplência'] },
  { t: 'Pós-protocolo', c: 'var(--lime)', i: ['RPI semanal (XML)', 'Meus Processos (e-mail)', 'Prazos e despachos', 'Relatório mensal', 'Monitoramento recorrente pós-concessão'] },
  { t: 'Governança', c: 'var(--red)', i: ['Contrato 100% Vora (D1)', 'Endereço institucional ≠ escritório (D2)', 'LGPD em todos os pontos', 'Identidade visual vorapi.com.br', 'Caio no OFF na captação'] },
];

export async function render(el) {
  el.innerHTML = cabecalho('Fluxo operacional & mapa mental', 'Passo a passo, responsabilidades e entregas de cada etapa da Vora. Clique em uma etapa para abrir a tela correspondente.', '', 'Mapa organizacional · Módulo 5.3')
    + tabs([['fluxo', 'Fluxo etapas 1–13'], ['mapa', 'Mapa mental'], ['raci', 'Matriz de responsabilidades']], aba) + '<div id="c"></div>';
  el.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { aba = b.dataset.tab; render(el); });
  const box = el.querySelector('#c');
  if (aba === 'fluxo') {
    box.innerHTML = `<div class="card"><div class="row" style="margin-bottom:18px">${Object.keys(QUEM).map(tag).join('')}</div><div class="flow">${ETAPAS.map(s => `<div class="flow-step"><div class="num">${String(s.n).padStart(2, '0')}</div><div class="body">
      <a href="#/${s.tela}" style="color:inherit;text-decoration:none"><h3>${s.t} <span class="faint small">→</span></h3></a><div class="who">${s.q.map(tag).join('')}</div>
      <p class="muted" style="margin:8px 0 4px">${s.d}</p><div class="small"><span class="lime mono tiny">ENTREGA ›</span> ${s.e}</div></div></div>`).join('')}</div></div>`;
  } else if (aba === 'mapa') {
    box.innerHTML = `<div class="card mind"><div class="mind-center">Vora Propriedade Industrial</div><div class="mind-branches">${MAPA.map(b => `<div class="branch" style="--c:${b.c}"><h4>${b.t}</h4><ul>${b.i.map(x => `<li>${x}</li>`).join('')}</ul></div>`).join('')}</div></div>`;
  } else {
    const papeis = ['ia', 'col', 'caio', 'auto'];
    box.innerHTML = `<div class="card"><div class="table-wrap"><table class="t"><tr><th>Etapa</th>${papeis.map(p => `<th>${QUEM[p][0]}</th>`).join('')}<th>Entrega</th></tr>
      ${ETAPAS.map(s => `<tr><td><b>${s.n}.</b> ${s.t}</td>${papeis.map(p => `<td>${s.q.includes(p) ? (s.q[0] === p ? '<span class="badge lime">R</span>' : '<span class="badge">A</span>') : ''}</td>`).join('')}<td class="small muted">${s.e}</td></tr>`).join('')}</table></div>
      <p class="small faint" style="margin-top:10px">R = responsável principal · A = atua/apoia. Validações finais (parecer, protocolo, prazos) são sempre de Caio.</p></div>`;
  }
}
