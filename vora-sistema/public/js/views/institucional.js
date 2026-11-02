// Módulos 0, 1 e 7 — institucional, governança (D1/D2), CNAEs e Fator R, ecossistema (D8), LGPD, prova social e links oficiais.
import { esc, brl, tabs, getConfig, saveConfig, isAdmin, toast, num } from '../core.js';
import { cabecalho } from '../app.js';
import { abrirDocumento } from '../lib/timbrado.js';
import { MODELOS, variaveis } from '../lib/modelos.js';

let aba = 'empresa';

const CNAES = [
  ['6911-7/03', 'Agente de propriedade industrial', 'Principal', 'Anexo III ou V conforme o Fator R'],
  ['7020-4/00', 'Consultoria em gestão empresarial, exceto consultoria técnica específica', 'Secundário', 'Anexo III ou V conforme o Fator R'],
  ['7490-1/99', 'Outras atividades profissionais, científicas e técnicas não especificadas anteriormente', 'Secundário', 'Anexo III ou V conforme o Fator R'],
  ['8211-3/00', 'Serviços combinados de escritório e apoio administrativo', 'Secundário (otimização)', 'Anexo III nativo (a partir de 6%)'],
];
const FERRAMENTAS = [
  ['Site e identidade visual', 'vorapi.com.br + Instagram', 'https://vorapi.com.br'], ['Gestão e Kanban', 'Este sistema (Trello unificado — D9)', '#/funil'],
  ['Armazenamento e dossiês', 'Google Drive', 'https://drive.google.com'], ['Agentes de IA', 'Claude e Gemini', 'https://claude.ai'],
  ['Comunicação', 'Gmail + 1 WhatsApp oficial compartilhado', 'https://mail.google.com'], ['Formulário de coleta', 'Formulário Vora (substitui Tally/Fillout)', '/formulario'],
  ['Assinatura digital', 'ZapSign ou Autentique', 'https://zapsign.com.br'], ['Pagamentos', 'Asaas + Dashboard financeiro', 'https://www.asaas.com'],
  ['Monitoramento INPI', 'RPI (XML Seção V) + Meus Processos', 'https://revistas.inpi.gov.br/rpi/'],
];
const LINKS = [
  ['Legislação aplicável (INPI)', 'https://www.gov.br/inpi/pt-br/servicos/marcas/legislacao'],
  ['Manual de Marcas (INPI)', 'https://manualdemarcas.inpi.gov.br/projects/manual/wiki/Atualiza%C3%A7%C3%B5es'],
  ['Busca web do INPI (pePI)', 'https://busca.inpi.gov.br/pePI/jsp/Base_pesquisa.jsp'],
  ['Revista da Propriedade Industrial (RPI)', 'https://revistas.inpi.gov.br/rpi/'],
  ['Serviços de marcas (INPI)', 'https://www.gov.br/inpi/pt-br/servicos/marcas'],
  ['Site oficial Vora', 'https://vorapi.com.br/'],
];

export async function render(el) {
  const cfg = await getConfig(true);
  el.innerHTML = cabecalho('Institucional & LGPD', 'Governança, estrutura societária e tributária, ecossistema de ferramentas, conformidade com a LGPD e prova social do site.', '', 'Módulos 0 · 1 · 7')
    + tabs([['empresa', 'Empresa & governança'], ['tributario', 'CNAEs & Fator R'], ['ferramentas', 'Ecossistema (D8)'], ['lgpd', 'LGPD'], ['portfolio', 'Prova social'], ['links', 'Links oficiais']], aba) + '<div id="c"></div>';
  el.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { aba = b.dataset.tab; render(el); });
  const box = el.querySelector('#c');
  const e = cfg.empresa || {};
  if (aba === 'empresa') {
    box.innerHTML = `<div class="grid g2"><div class="card prose"><h2>Vora Propriedade Industrial</h2>
      <p>Empresa em nascimento, criada a partir da atuação autônoma em registro de marcas perante o INPI: registro, oposição, nulidade, caducidade, acompanhamento e consultoria. Atende do MEI a grupos com múltiplos CNPJs e marcas.</p>
      <p>Operação 90% digital e remota: a equipe trabalha de qualquer lugar com internet e computador, e há um espaço físico em Maceió para reuniões.</p>
      <h3>Identidade visual (Módulo 0)</h3><p>Todos os pontos de contato (formulário, relatórios, alertas, e-mails, contratos, procurações e playbook) seguem a linha estética de vorapi.com.br e do Instagram: fundo obsidiana, acento verde-limão <span class="mono lime">#ccff00</span>, tipografia Space Grotesk + JetBrains Mono. Nos documentos impressos, a versão clara usa grafite e marfim.</p></div>
      <div class="stack"><div class="card"><h3>D1 — Contrato e procuração</h3><p class="small muted">Registro de marca não é atividade privativa da advocacia: o contrato é celebrado 100% em nome da Vora (CNPJ). A procuração do INPI outorga poderes à Vora e/ou a ${esc(e.diretor || 'Caio César Maia Lins')} como ${esc(e.diretorQualificacao || 'Sócio-Administrador / Diretor Técnico')}, sem vincular nº de OAB na prospecção.</p></div>
      <div class="card"><h3>D2 — Endereço</h3><p class="small muted">Materiais institucionais e prospecção: <b>${esc(e.enderecoInstitucional || 'atendimento digital nacional')}</b>, sem referência ao escritório de advocacia. Contratos e documentos fiscais: dados exatos do CNPJ (${esc(e.enderecoContratual || 'configure em Configurações')}).</p></div>
      <div class="card"><h3>Papel de Caio</h3><p class="small muted">CEO e Sócio-Administrador, no OFF da captação comercial. Valida pareceres (2 min), realiza os protocolos, revisa prazos e peças e negocia permutas de mídia. Todo o resto é automatizado, delegado à IA ou ao colaborador.</p></div></div></div>`;
  } else if (aba === 'tributario') {
    box.innerHTML = `<div class="grid g2"><div class="card"><h2>CNAEs do CNPJ</h2><table class="t"><tr><th>CNAE</th><th>Descrição</th><th>Tipo</th><th>Simples</th></tr>${CNAES.map(c => `<tr><td class="mono nowrap">${c[0]}</td><td>${c[1]}</td><td>${c[2]}</td><td class="small">${c[3]}</td></tr>`).join('')}</table>
      <p class="small muted" style="margin-top:10px">Planejamento a validar com a contabilidade: a inclusão do 8211-3/00 e a calibragem do Fator R (folha + pró-labore ≥ 28% da receita) buscam evitar a alíquota inicial de 15,5% do Anexo V.</p></div>
      <div class="card"><h2>Calculadora do Fator R</h2><p class="sub">Fator R = folha de salários dos últimos 12 meses (incluindo pró-labore e encargos) ÷ receita bruta dos últimos 12 meses.</p>
        <div class="grid g2"><label class="f"><span>Folha + pró-labore (12 meses)</span><input id="fo" value="24000"></label><label class="f"><span>Receita bruta (12 meses)</span><input id="rb" value="80000"></label></div>
        <div id="fr" class="kpi" style="margin-top:14px"></div></div></div>`;
    const calc = () => {
      const f = num(box.querySelector('#fo').value), r = num(box.querySelector('#rb').value);
      const fr = r ? f / r : 0;
      const ok = fr >= 0.28;
      const prolabMin = Math.max(0, r * 0.28 - f);
      box.querySelector('#fr').innerHTML = `<div class="sys-tag">Fator R</div><div class="v ${ok ? 'lime' : ''}" style="color:${ok ? '' : 'var(--amber)'}">${(fr * 100).toFixed(1)}%</div>
        <div class="d">${ok ? 'Enquadra no <b>Anexo III</b> (alíquota inicial de 6%).' : `Abaixo de 28%: <b>Anexo V</b> (alíquota inicial de 15,5%). Faltam ${brl(prolabMin)} de folha/pró-labore em 12 meses (≈ ${brl(prolabMin / 12)}/mês).`}</div>`;
    };
    box.querySelectorAll('input').forEach(i => i.oninput = calc); calc();
  } else if (aba === 'ferramentas') {
    box.innerHTML = `<div class="grid g3">${FERRAMENTAS.map(([a, b, u]) => `<a class="card" href="${u}" ${u.startsWith('http') ? 'target="_blank" rel="noopener"' : ''} style="color:inherit;text-decoration:none"><div class="sys-tag"><span class="dot"></span>${esc(a)}</div><h3 style="margin:10px 0 0">${esc(b)}</h3></a>`).join('')}</div>`;
  } else if (aba === 'lgpd') {
    box.innerHTML = `<div class="card prose"><h2>Conformidade com a LGPD (Lei nº 13.709/2018)</h2>
      <p>A Vora Propriedade Industrial está de acordo com a Lei Geral de Proteção de Dados e a respeita. Esse compromisso está presente em todos os documentos e canais:</p>
      <ul><li><b>Formulário de coleta</b>: consentimento expresso e registrado (data, hora e IP) antes da análise.</li><li><b>Contratos</b>: cláusula específica de proteção de dados; <b>procurações e termos</b>: menção expressa à LGPD.</li>
      <li><b>Mensagens</b> de boas-vindas, envio de formulário e fechamento informam a finalidade do tratamento.</li><li><b>Documentos timbrados</b>: rodapé “Em conformidade com a LGPD”.</li>
      <li><b>Prospecção por e-mail</b>: opção de descadastro (“SAIR”), registrada como “Pediu para sair” na base.</li><li><b>Acesso restrito</b>: login individual, senhas com hash, sessão segura e registro de auditoria das ações.</li></ul>
      <h3>Bases legais utilizadas</h3><ul><li>Execução de contrato e de procedimentos preliminares a pedido do titular (art. 7º, V);</li><li>Consentimento para a análise de viabilidade solicitada pelo formulário (art. 7º, I);</li><li>Cumprimento de obrigação legal ou regulatória, como a guarda fiscal (art. 7º, II);</li><li>Legítimo interesse na prospecção B2B de dados empresariais públicos, com opção de oposição (art. 7º, IX).</li></ul>
      <h3>Direitos do titular</h3><p>Confirmação, acesso, correção, anonimização, portabilidade, eliminação e revogação do consentimento, solicitados pelos canais oficiais (${esc(e.email || 'e-mail oficial')} / WhatsApp oficial).</p></div>`;
  } else if (aba === 'portfolio') {
    const port = cfg.portfolio || [];
    box.innerHTML = `<div class="card"><h2>Portfólio de clientes — prova social em vorapi.com.br</h2><p class="sub">Exiba no site apenas as marcas com Termo de Autorização (7.0) assinado. Os novos contratos já trazem a cláusula de autorização (7.1).</p>
      <table class="t"><tr><th>Marca</th><th>Autorização</th><th></th></tr>${port.map((p, i) => `<tr><td><b>${esc(p.nome)}</b></td><td>${isAdmin() ? `<label class="chk" style="padding:0"><input type="checkbox" data-au="${i}" ${p.autorizado ? 'checked' : ''}> ${p.autorizado ? '<span class="badge lime">pode exibir</span>' : '<span class="badge amber">pendente</span>'}</label>` : p.autorizado ? '<span class="badge lime">pode exibir</span>' : '<span class="badge amber">pendente</span>'}</td>
        <td><button class="btn xs" data-tm="${i}">Gerar Termo 7.0</button></td></tr>`).join('')}</table>
      ${isAdmin() ? '<div class="row" style="margin-top:12px"><input id="nova" placeholder="Nova marca do portfólio" style="max-width:300px"><button class="btn sm" id="add">Adicionar</button></div>' : ''}</div>`;
    box.querySelectorAll('[data-au]').forEach(i => i.onchange = async () => { port[+i.dataset.au].autorizado = i.checked; await saveConfig({ portfolio: port }); render(el); });
    box.querySelectorAll('[data-tm]').forEach(b => b.onclick = () => {
      const m = MODELOS.find(x => x.id === '7.0');
      abrirDocumento({ titulo: `Termo de Autorizacao - ${port[+b.dataset.tm].nome}`, kicker: 'Termo', empresa: e, html: m.gerar(variaveis({ marca: port[+b.dataset.tm].nome, tipoPessoa: 'PJ' }, cfg)) });
    });
    box.querySelector('#add')?.addEventListener('click', async () => { const n = box.querySelector('#nova').value.trim(); if (!n) return; await saveConfig({ portfolio: [...port, { nome: n, autorizado: false }] }); toast('Marca adicionada.'); render(el); });
  } else {
    box.innerHTML = `<div class="grid g3">${LINKS.map(([t, u]) => `<a class="card" href="${u}" target="_blank" rel="noopener" style="color:inherit;text-decoration:none"><div class="sys-tag"><span class="dot"></span>Oficial</div><h3 style="margin:10px 0 4px">${esc(t)} ↗</h3><div class="faint small" style="word-break:break-all">${esc(u)}</div></a>`).join('')}</div>`;
  }
}
