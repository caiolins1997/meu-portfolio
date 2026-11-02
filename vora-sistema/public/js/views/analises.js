// Etapa 5 — Análise da marca pretendida. Fluxo D4: Agente de IA → Colaborador → Caio → envio.
import { store, api, esc, br, kanban, modal, campos, lerForm, toast, falha, copiar, getConfig, isAdmin, uploadArquivo, state, confirmar } from '../core.js';
import { cabecalho } from '../app.js';
import { STATUS_ANALISE, badgeViab, VIABILIDADE } from '../lib/dominio.js';
import { variantesFoneticas, apenasDigitos } from '../lib/texto.js';
import { sugerirClasses, nomeClasse, NICE } from '../lib/nice.js';
import { abrirDocumento } from '../lib/timbrado.js';
import { relatorioViabilidade, MODELOS, variaveis } from '../lib/modelos.js';
import { enviarMensagem, registrarHistorico } from './comum.js';

const PEPI = 'https://busca.inpi.gov.br/pePI/jsp/Base_pesquisa.jsp';
const PASTA_PESQ = 'Pasta do Cliente › 02. Análise de Viabilidade › Pesquisa Banco INPI';

export async function render(el, [id]) {
  if (id) return detalhe(el, id);
  const [analises, clientes] = await Promise.all([store.list('analises', true), store.list('clientes')]);
  el.innerHTML = cabecalho('Análises de viabilidade', 'Fluxo D4: captura → extração pela IA → busca pePI (Exata + Radical + variações fonéticas) → 17 dados → parecer timbrado → conferência do colaborador → validação de Caio → envio ao cliente.', '', 'Etapa 5 · Decisão D4')
    + '<div id="kb"></div>';
  kanban(el.querySelector('#kb'), {
    colunas: STATUS_ANALISE, itens: analises, campo: 'status',
    card: (a) => {
      const c = clientes.find(x => x.id === a.clienteId);
      return `<div class="kt">${esc(a.marca)}</div><div class="km">${esc(c?.nome || '')}</div>
        <div class="km" style="margin-top:6px">${badgeViab(a.viabilidade)}<span class="badge">${(a.colidencias || []).length} anterioridade(s)</span><span class="badge">${(a.buscas || []).length} busca(s)</span></div>
        <div class="km" style="margin-top:6px"><span class="faint">${esc(a.responsavel || '')}</span></div>`;
    },
    onOpen: (a) => { location.hash = `#/analises/${a.id}`; },
    onMove: async (a, para) => { await mudarStatus(a, para, clientes.find(x => x.id === a.clienteId)); render(el); },
  });
}

async function mudarStatus(a, para, c) {
  if (para === 'aprovado' && !isAdmin()) throw new Error('Somente Caio aprova o parecer (D4).');
  if (para === 'enviado' && !['aprovado', 'enviado'].includes(a.status)) throw new Error('O parecer precisa ser aprovado por Caio antes do envio.');
  if (['revisao_colaborador', 'aguardando_caio', 'aprovado'].includes(para) && !a.viabilidade) throw new Error('Defina a viabilidade e o parecer antes de avançar.');
  const patch = { status: para };
  if (para === 'aguardando_caio') patch.conferidoPor = state.user.nome;
  await store.patch('analises', a.id, patch);
  if (para === 'enviado' && c) {
    await store.patch('clientes', c.id, { etapa: 'parecer_enviado', parecerEnviadoEm: new Date().toISOString().slice(0, 10), viabilidade: VIABILIDADE[a.viabilidade]?.[0] || a.viabilidade, termoRiscoAplicavel: ['baixa', 'media'].includes(a.viabilidade) });
    await registrarHistorico(c, 'Parecer de viabilidade enviado ao cliente');
  }
  toast(`Análise movida para “${STATUS_ANALISE.find(s => s.id === para)?.titulo}”.`);
}

function viabSugerida(a) {
  const ativos = (a.colidencias || []).filter(x => !/arquiv|extint|indeferid/i.test(x.situacao || ''));
  if (ativos.some(x => x.relevancia === 'alta')) return 'baixa';
  if (ativos.some(x => x.relevancia === 'media')) return 'media';
  return 'alta';
}

async function detalhe(el, id) {
  const [a, cfg] = await Promise.all([api(`/api/c/analises/${id}`), getConfig()]);
  const c = a.clienteId ? await api(`/api/c/clientes/${a.clienteId}`).catch(() => ({})) : {};
  const st = STATUS_ANALISE.find(s => s.id === a.status) || STATUS_ANALISE[0];
  const idx = STATUS_ANALISE.indexOf(st);
  const prox = STATUS_ANALISE[idx + 1];
  const sug = sugerirClasses(c.descricao || '');
  const salvar = async (patch) => { Object.assign(a, await store.patch('analises', a.id, patch)); };
  const recarregar = () => detalhe(el, id);

  el.innerHTML = cabecalho(`Análise · ${esc(a.marca)}`, `${esc(c.nome || '')} · ${esc(c.localidade || '')} · responsável ${esc(a.responsavel || '—')}`,
    `<a class="btn" href="#/analises">← Quadro</a>${c.id ? `<a class="btn" href="#/clientes/${c.id}">Cliente</a>` : ''}<button class="btn" data-a="rel">Gerar relatório timbrado</button>`, 'Etapa 5 · D4')
    + `<div class="card" style="margin-bottom:16px"><div class="row between">
        <div class="row">${STATUS_ANALISE.map((s, i) => `<span class="badge ${i < idx ? 'green' : i === idx ? 'lime' : ''}">${i + 1}. ${esc(s.titulo)}</span>`).join('<span class="faint">→</span>')}</div>
        <div class="row">${idx > 0 && a.status !== 'enviado' ? '<button class="btn sm" data-a="voltar">Devolver</button>' : ''}
        ${prox ? `<button class="btn sm neon" data-a="avancar" ${prox.id === 'aprovado' && !isAdmin() ? 'disabled title="Somente Caio aprova"' : ''}>${prox.id === 'aprovado' ? 'Aprovar para envio (Caio)' : prox.id === 'enviado' ? 'Enviar ao cliente (10.7)' : 'Avançar → ' + esc(prox.titulo)}</button>` : ''}</div></div>
        ${a.aprovadoPor ? `<div class="faint small" style="margin-top:8px">Aprovado por ${esc(a.aprovadoPor)} em ${new Date(a.aprovadoEm).toLocaleString('pt-BR')}</div>` : ''}</div>
    <div class="grid g3">
      <div class="card"><h3>Dados do lead</h3><div class="stack small">
        <div><span class="faint">Marca:</span> <b>${esc(a.marca)}</b></div><div><span class="faint">Logo:</span> ${c.temLogo ? 'Sim' : 'Não'} · <span class="faint">Existe há:</span> ${esc(c.tempoMarca || '—')}</div>
        <div><span class="faint">Pessoa:</span> ${esc(c.tipoPessoa || '—')} · <span class="faint">Local:</span> ${esc(c.localidade || '—')}</div>
        <div class="msg-text" style="max-height:160px;overflow:auto">${esc(c.descricao || 'Sem descrição.')}</div></div></div>
      <div class="card"><h3>Classes de Nice alvo</h3><div class="row" id="cls">${(a.classesAlvo || []).map(n => `<span class="badge lime" title="${esc(NICE[n] || '')}">NCL ${esc(n)} <button class="btn xs ghost" data-rmc="${n}">✕</button></span>`).join('') || '<span class="faint small">Nenhuma classe.</span>'}</div>
        ${sug.length ? `<div class="small faint" style="margin:10px 0 6px">Sugestão pela atividade:</div><div class="row">${sug.map(n => `<button class="btn xs" data-addc="${n}" title="${esc(NICE[n])}">+ ${n}</button>`).join('')}</div>` : ''}
        <div class="row" style="margin-top:10px"><select id="selc" style="flex:1">${Object.keys(NICE).map(n => `<option value="${n}">${esc(nomeClasse(n))}</option>`).join('')}</select><button class="btn sm" data-a="addc">Adicionar</button></div></div>
      <div class="card"><h3>Busca no pePI</h3><ol class="small muted" style="padding-left:18px;margin:0">
        <li>Acesse o pePI com seu login individual (ou “Continuar…” anônimo) → <b>Continuar »</b> → ícone <b>® Marca</b>.</li><li>Consultar por <b>Marca</b> → pesquise <b>Exata</b> e <b>Radical</b> para cada termo.</li>
        <li>Salve cada página em PDF como <span class="mono">TERMO P.1, P.2…</span> e anexe abaixo.</li></ol>
        <div class="row" style="margin-top:12px"><a class="btn sm neon" target="_blank" rel="noopener" href="${PEPI}">Abrir pePI ↗</a></div>
        <div class="faint tiny" style="margin-top:8px">Destino: ${PASTA_PESQ}</div></div>
    </div>

    <div class="card"><div class="row between"><h2 style="margin:0">Termos pesquisados</h2><div class="row"><button class="btn sm" data-a="fon">Gerar variações fonéticas (C/K/Q, S/Z/SS/Ç, I/Y, F/PH)</button><button class="btn sm" data-a="termo">+ Termo / tradução</button></div></div>
      <div class="table-wrap" style="margin-top:12px"><table class="t"><thead><tr><th>Termo</th><th>Origem</th><th>Exata</th><th>Radical</th><th>PDFs (Pesquisa Banco INPI)</th><th></th></tr></thead><tbody>
      ${(a.termos || []).map((t, i) => {
        const bx = (a.buscas || []).filter(b => b.termo === t.termo);
        const cel = (tipo) => { const b = bx.find(x => x.tipo === tipo); return b ? `<span class="badge green">${esc(b.total ?? '?')} result.</span> <span class="faint tiny">${esc(b.paginas || 0)} pág.</span>` : `<button class="btn xs" data-busca="${i}|${tipo}">Registrar</button>`; };
        const pags = Math.max(0, ...bx.map(b => +b.paginas || 0));
        return `<tr><td><b>${esc(t.termo)}</b></td><td class="small">${esc(t.origem || '')}</td><td>${cel('Exata')}</td><td>${cel('Radical')}</td>
          <td class="small">${pags ? Array.from({ length: Math.min(pags, 6) }, (_, k) => `<span class="mono tiny">${esc(t.termo)} P.${k + 1}</span>`).join(', ') + (pags > 6 ? '…' : '') : '—'} <button class="btn xs" data-pdf="${i}">Anexar PDFs</button></td>
          <td><button class="btn xs ghost" data-rmt="${i}">✕</button></td></tr>`;
      }).join('') || '<tr><td colspan="6"><div class="empty">Adicione o termo exato da marca e as variações.</div></td></tr>'}</tbody></table></div></div>

    <div class="card"><div class="row between"><div><h2 style="margin:0">Anterioridades encontradas · 17 dados obrigatórios</h2><div class="muted small">Priorize as do mesmo segmento/classe e verifique se estão Em Vigor ou Em Processo.</div></div><button class="btn sm neon" data-a="col">+ Anterioridade</button></div>
      <div class="table-wrap" style="margin-top:12px"><table class="t"><thead><tr><th>Processo</th><th>Marca</th><th>Situação</th><th>Apres.</th><th>Classe</th><th>Titular</th><th>Risco</th><th></th></tr></thead><tbody>
      ${(a.colidencias || []).map((x, i) => `<tr class="click" data-col="${i}"><td class="mono">${esc(x.numero)}</td><td><b>${esc(x.marca)}</b></td><td class="small">${esc(x.situacao)}</td><td>${esc(x.apresentacao || '')}</td><td>${esc(x.classe || '')}</td><td class="small">${esc(x.titulares || '')}</td>
        <td><span class="badge ${x.relevancia === 'alta' ? 'red' : x.relevancia === 'media' ? 'amber' : 'green'}">${esc(x.relevancia || '—')}</span></td><td><button class="btn xs ghost" data-rmcol="${i}">✕</button></td></tr>`).join('')
        || '<tr><td colspan="8"><div class="empty">Nenhuma anterioridade registrada.</div></td></tr>'}</tbody></table></div></div>

    <div class="card"><div class="row between"><h2 style="margin:0">Parecer</h2><div class="row"><button class="btn sm" data-a="prompt">Copiar prompt para Agente de IA</button><a class="btn sm" href="https://claude.ai/new" target="_blank" rel="noopener">Claude ↗</a><a class="btn sm" href="https://gemini.google.com/app" target="_blank" rel="noopener">Gemini ↗</a></div></div>
      <div class="grid g3" style="margin-top:12px">
        <label class="f"><span>Viabilidade (sugerida: ${esc(VIABILIDADE[viabSugerida(a)][0])})</span><select name="viabilidade"><option value="">—</option>${Object.entries(VIABILIDADE).map(([k, [l]]) => `<option value="${k}" ${a.viabilidade === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
        <label class="f span2"><span>Resumo de uma linha (vai em destaque no relatório)</span><input name="resumo" value="${esc(a.resumo || '')}"></label>
        <label class="f span2" style="grid-column:1/-1"><span>Parecer técnico (LPI + Manual de Marcas)</span><textarea name="parecer" rows="10">${esc(a.parecer || '')}</textarea></label>
        <label class="f"><span>Dados atualizados até (rodapé)</span><input type="date" name="atualizadoAte" value="${esc(a.atualizadoAte || '')}"></label>
        <label class="f"><span>Nº da revista (RPI, 4 dígitos)</span><input name="revista" value="${esc(a.revista || cfg.vigilancia?.ultimaRpi || '')}" maxlength="4"></label>
        <label class="f"><span>Observações internas</span><input name="obs" value="${esc(a.obs || '')}"></label>
      </div>
      <div class="row" style="margin-top:12px;justify-content:flex-end">${['baixa', 'media'].includes(a.viabilidade) ? '<button class="btn" data-a="risco">Termo de Ciência de Risco</button>' : ''}<button class="btn neon" data-a="salvarp">Salvar parecer</button></div></div>`;

  const q = (s) => el.querySelector(s);
  const on = (sel, fn) => el.querySelectorAll(sel).forEach(b => b.addEventListener('click', async (e) => { try { await fn(b, e); } catch (er) { falha(er); } }));

  on('[data-a=avancar]', async () => {
    if (prox.id === 'enviado') {
      await enviarMensagem({ cliente: { ...c, viabilidade: VIABILIDADE[a.viabilidade]?.[0] }, codigo: '10.7', categoria: 'Análise' });
      if (!await confirmar('Confirmar envio', 'A mensagem e o relatório foram enviados ao cliente? A análise será marcada como “Enviado”.')) return;
    }
    await mudarStatus(a, prox.id, c); recarregar();
  });
  on('[data-a=voltar]', async () => { await store.patch('analises', a.id, { status: STATUS_ANALISE[idx - 1].id }); toast('Análise devolvida para a etapa anterior.'); recarregar(); });
  on('[data-a=rel]', () => abrirDocumento({ titulo: `Viabilidade_Registro_Marca_${a.marca}`, kicker: 'Análise de viabilidade', empresa: cfg.empresa, html: relatorioViabilidade(lerParecer(), c), clienteId: c.id, pasta: '02', nomeArquivo: `Viabilidade_Registro_Marca_${a.marca}` }));
  on('[data-addc]', async (b) => { await salvar({ classesAlvo: [...new Set([...(a.classesAlvo || []), b.dataset.addc])] }); recarregar(); });
  on('[data-a=addc]', async () => { await salvar({ classesAlvo: [...new Set([...(a.classesAlvo || []), q('#selc').value])] }); recarregar(); });
  on('[data-rmc]', async (b) => { await salvar({ classesAlvo: (a.classesAlvo || []).filter(x => x !== b.dataset.rmc) }); recarregar(); });
  on('[data-a=fon]', async () => {
    const atuais = new Set((a.termos || []).map(t => t.termo));
    const novos = [];
    if (!atuais.has(a.marca.toUpperCase())) novos.push({ termo: a.marca.toUpperCase(), origem: 'Termo exato' });
    variantesFoneticas(a.marca, 12).forEach(v => { if (!atuais.has(v)) novos.push({ termo: v, origem: 'Variação fonética' }); });
    await salvar({ termos: [...(a.termos || []), ...novos] });
    toast(`${novos.length} termo(s) adicionado(s).`); recarregar();
  });
  on('[data-a=termo]', async () => {
    const r = await modal({ titulo: 'Adicionar termo', corpo: `<div class="grid g2">${campos([{ k: 'termo', l: 'Termo', req: true }, { k: 'origem', l: 'Origem', tipo: 'select', opcoes: ['Termo exato', 'Variação fonética', 'Tradução', 'Radical', 'Elemento da marca'] }])}</div>`, acoes: [{ label: 'Cancelar', valor: null }, { label: 'Adicionar', cls: 'neon', onClick: (b) => lerForm(b) }] });
    if (r?.termo) { await salvar({ termos: [...(a.termos || []), { termo: r.termo.toUpperCase(), origem: r.origem }] }); recarregar(); }
  });
  on('[data-rmt]', async (b) => { const t = a.termos[+b.dataset.rmt]; await salvar({ termos: a.termos.filter((_, i) => i !== +b.dataset.rmt), buscas: (a.buscas || []).filter(x => x.termo !== t.termo) }); recarregar(); });
  on('[data-busca]', async (b) => {
    const [i, tipo] = b.dataset.busca.split('|');
    const t = a.termos[+i];
    const r = await modal({
      titulo: `Busca ${tipo} · ${t.termo}`, sub: 'Copie do título: “Foram encontrados xx processos… Mostrando página x de x”',
      corpo: `<div class="grid g3">${campos([{ k: 'total', l: 'Nº de processos encontrados', tipo: 'number', req: true }, { k: 'paginas', l: 'Nº de páginas', tipo: 'number' }, { k: 'data', l: 'Data/hora da pesquisa', tipo: 'datetime-local' }], { data: new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) })}</div>`,
      acoes: [{ label: 'Cancelar', valor: null }, { label: 'Registrar', cls: 'neon', onClick: (bb) => lerForm(bb) }],
    });
    if (r) { await salvar({ buscas: [...(a.buscas || []), { termo: t.termo, tipo, total: +r.total, paginas: +r.paginas || 0, data: r.data }] }); recarregar(); }
  });
  on('[data-pdf]', (b) => {
    const t = a.termos[+b.dataset.pdf];
    const inp = document.createElement('input'); inp.type = 'file'; inp.multiple = true; inp.accept = 'application/pdf,image/*';
    inp.onchange = async () => {
      const lista = [...inp.files].sort((x, y) => x.name.localeCompare(y.name, 'pt', { numeric: true }));
      if (!c.id) return toast('Análise sem cliente vinculado.', true);
      let n = 0;
      for (const f of lista) { n++; await uploadArquivo(f, { clienteId: c.id, pasta: '02.1', nome: `${t.termo} P.${n}.${f.name.split('.').pop()}` }); }
      toast(`${n} arquivo(s) salvos como “${t.termo} P.1…P.${n}” em Pesquisa Banco INPI.`);
    };
    inp.click();
  });
  on('[data-col]', async (tr, e) => { if (e.target.closest('button')) return; await editarAnterioridade(a, +tr.dataset.col, c, cfg); recarregar(); });
  on('[data-rmcol]', async (b) => { await salvar({ colidencias: a.colidencias.filter((_, i) => i !== +b.dataset.rmcol) }); recarregar(); });
  on('[data-a=col]', async () => { await editarAnterioridade(a, -1, c, cfg); recarregar(); });
  const lerParecer = () => ({ ...a, ...lerForm(el.querySelector('[name=parecer]').closest('.card')) });
  on('[data-a=salvarp]', async () => { await salvar(lerForm(el.querySelector('[name=parecer]').closest('.card'))); toast('Parecer salvo.'); recarregar(); });
  on('[data-a=prompt]', () => copiar(promptIA(lerParecer(), c)));
  on('[data-a=risco]', () => {
    const m = MODELOS.find(x => x.id === '2.2');
    abrirDocumento({ titulo: `Termo de Ciência de Risco - ${a.marca}`, kicker: 'Termo', empresa: cfg.empresa, html: m.gerar(variaveis({ ...c, viabilidade: VIABILIDADE[a.viabilidade]?.[0] }, cfg, { motivo: a.resumo })), clienteId: c.id, pasta: '05' });
  });
}

// ----- formulário dos 17 dados (Item 5.3.1) + leitor de texto copiado do pePI -----
const CAMPOS17 = [
  { k: 'numero', l: '1. Nº do Processo (9 dígitos)', req: true }, { k: 'marca', l: '2. Marca (termo exato)', req: true },
  { k: 'situacao', l: '3. Situação (exata)' }, { k: 'apresentacao', l: '4. Apresentação', tipo: 'select', opcoes: ['', 'Nominativa', 'Mista', 'Figurativa', 'Tridimensional'] },
  { k: 'classe', l: '5. Classe de Nice — NCL (xx) xx' }, { k: 'titulares', l: '7. Titular(es)' },
  { k: 'especificacao', l: '6. Especificação (texto integral)', tipo: 'textarea', cls: 'span2' },
  { k: 'procurador', l: '8. Procurador (quando houver)' }, { k: 'deposito', l: '9. Data de depósito', tipo: 'date' },
  { k: 'concessao', l: '10. Data de concessão', tipo: 'date' }, { k: 'vigencia', l: '11. Data de vigência', tipo: 'date' },
  { k: 'publicacoesTxt', l: '12–14. Publicações: uma por linha “RPI · dd/mm/aaaa · despacho”', tipo: 'textarea', cls: 'span2' },
  { k: 'inteiroTeor', l: '15. Inteiro teor (arquivo/observação)' }, { k: 'complemento', l: '16. Complemento do despacho', tipo: 'textarea' },
  { k: 'atualizadoAte', l: '17. Dados atualizados até', tipo: 'date' }, { k: 'revista', l: '17. Nº da Revista (4 dígitos)' },
  { k: 'mesmoSegmento', l: 'Mesmo segmento do cliente?', tipo: 'select', opcoes: [['', '—'], ['sim', 'Sim'], ['nao', 'Não']] },
  { k: 'relevancia', l: 'Risco de colidência', tipo: 'select', opcoes: [['', '—'], ['alta', 'Alto'], ['media', 'Médio'], ['baixa', 'Baixo']] },
  { k: 'comentario', l: 'Comentário técnico', tipo: 'textarea', cls: 'span2' },
];

export function lerTextoPepi(txt) {
  const t = txt.replace(/\r/g, '');
  const pega = (re) => { const m = t.match(re); return m ? m[1].trim() : ''; };
  const data = (s) => { const m = s.match(/(\d{2})\/(\d{2})\/(\d{4})/); return m ? `${m[3]}-${m[2]}-${m[1]}` : ''; };
  const o = {
    numero: apenasDigitos(pega(/N[ºo°]\s*do\s*Processo:?\s*([\d\s.]+)/i)).slice(0, 9),
    marca: pega(/\bMarca:\s*([^\n]+)/i),
    situacao: pega(/Situa[cç][aã]o:\s*([^\n]+)/i),
    apresentacao: (pega(/Apresenta[cç][aã]o:\s*([^\n]+)/i).match(/Nominativa|Mista|Figurativa|Tridimensional/i) || [''])[0].replace(/^./, s => s.toUpperCase()),
    classe: pega(/(NCL\s*\(\d+\)\s*\d+)/i),
    especificacao: pega(/Especifica[cç][aã]o:\s*([\s\S]+?)(?:\n\s*(?:Status|Titular|Classifica|Representante|Procurador|Data de)|$)/i),
    titulares: pega(/Titular(?:es)?(?:\s*\(\d+\))?:\s*([^\n]+)/i),
    procurador: pega(/(?:Procurador|Representante Legal):\s*([^\n]+)/i),
    deposito: data(pega(/Data de dep[oó]sito:\s*([^\n]+)/i)),
    concessao: data(pega(/Data de concess[aã]o:\s*([^\n]+)/i)),
    vigencia: data(pega(/(?:Data de )?Vig[eê]ncia:\s*([^\n]+)/i)),
  };
  const pubs = [...t.matchAll(/^\s*(\d{4})\s+(\d{2}\/\d{2}\/\d{4})\s+(?:[A-Z]{3,5}\d{2,4}\s+)?([^\n]+)$/gm)].map(m => `${m[1]} · ${m[2]} · ${m[3].trim()}`);
  if (pubs.length) o.publicacoesTxt = pubs.join('\n');
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v));
}

async function editarAnterioridade(a, i, c, cfg) {
  const atual = i >= 0 ? { ...a.colidencias[i] } : { atualizadoAte: new Date().toISOString().slice(0, 10), revista: cfg.vigilancia?.ultimaRpi || '' };
  atual.publicacoesTxt = (atual.publicacoes || []).map(p => `${p.rpi} · ${br(p.data) || p.data} · ${p.despacho}`).join('\n');
  let imagem = null;
  const r = await modal({
    titulo: i >= 0 ? `Anterioridade ${atual.numero}` : 'Nova anterioridade', sub: 'Cole o texto da página do processo no pePI para preencher automaticamente.', grande: true,
    corpo: `<details style="margin-bottom:12px"><summary class="btn sm">Colar texto do pePI</summary><textarea id="cola" rows="6" style="margin-top:8px" placeholder="Selecione tudo na página do processo (Ctrl+A), copie e cole aqui"></textarea><button class="btn sm" id="ler" style="margin-top:6px">Extrair dados</button></details>
      <div class="grid g3" id="f17">${campos(CAMPOS17, atual)}</div>
      <label class="f" style="margin-top:12px"><span>4.1. Imagem exata (apresentação mista)</span><input type="file" id="img" accept="image/*"></label>
      ${atual.imagemUrl ? `<img src="${esc(atual.imagemUrl)}" style="max-height:110px;margin-top:8px;border-radius:8px;background:#fff">` : ''}`,
    onOpen: (b) => {
      b.querySelector('#ler').onclick = () => {
        const d = lerTextoPepi(b.querySelector('#cola').value);
        Object.entries(d).forEach(([k, v]) => { const inp = b.querySelector(`[name=${k}]`); if (inp) inp.value = v; });
        toast(`${Object.keys(d).length} campo(s) extraído(s). Confira antes de salvar.`);
      };
      b.querySelector('#img').onchange = (e) => { imagem = e.target.files[0]; };
    },
    acoes: [{ label: 'Cancelar', valor: null }, {
      label: 'Salvar', cls: 'neon', onClick: (b) => {
        const d = lerForm(b.querySelector('#f17'));
        if (apenasDigitos(d.numero).length !== 9) { toast('O nº do processo deve ter 9 dígitos.', true); return false; }
        if (d.revista && !/^\d{4}$/.test(d.revista)) { toast('O nº da RPI deve ter 4 dígitos.', true); return false; }
        return d;
      },
    }],
  });
  if (!r) return;
  r.numero = apenasDigitos(r.numero);
  r.publicacoes = String(r.publicacoesTxt || '').split('\n').map(l => l.split('·').map(s => s.trim())).filter(p => p[0]).map(([rpi, data, ...d]) => ({ rpi, data, despacho: d.join(' · ') }));
  delete r.publicacoesTxt;
  r.imagemUrl = atual.imagemUrl || '';
  if (imagem && c.id) {
    const up = await uploadArquivo(imagem, { clienteId: c.id, pasta: '02', nome: `Anterioridade ${r.numero} - ${r.marca}.${imagem.name.split('.').pop()}` });
    r.imagemUrl = `${location.origin}/api/files/${up.id}`;
  }
  const lista = [...(a.colidencias || [])];
  if (i >= 0) lista[i] = r; else lista.push(r);
  await store.patch('analises', a.id, { colidencias: lista });
}

function promptIA(a, c) {
  return `Você é o Agente de IA de análise de marcas da Vora Propriedade Industrial. Redija o PARECER TÉCNICO de viabilidade de registro da marca abaixo perante o INPI, com base na Lei nº 9.279/96 (LPI) — especialmente arts. 122, 123, 124 (incisos V, VI, XIX e XXIII), 125, 126, 128 e 129 — e no Manual de Marcas do INPI (exame de colidência: aspectos gráfico, fonético e ideológico; afinidade mercadológica; princípio da especialidade).

DADOS DO CLIENTE
- Marca pretendida: ${a.marca}
- Pessoa: ${c.tipoPessoa || '-'} | Local: ${c.localidade || '-'} | Logo: ${c.temLogo ? 'sim (mista)' : 'não informada'}
- Atividade: ${c.descricao || '-'}
- Classes NCL analisadas: ${(a.classesAlvo || []).map(n => nomeClasse(n)).join('; ') || '-'}

BUSCAS REALIZADAS NO pePI
${(a.buscas || []).map(b => `- ${b.termo} (${b.tipo}): ${b.total} processos, ${b.paginas} páginas`).join('\n') || '- (nenhuma registrada)'}

ANTERIORIDADES (17 DADOS EXTRAÍDOS)
${(a.colidencias || []).map((x, i) => `${i + 1}) Processo ${x.numero} | Marca: ${x.marca} | Situação: ${x.situacao} | Apresentação: ${x.apresentacao} | Classe: ${x.classe} | Especificação: ${x.especificacao} | Titular: ${x.titulares} | Procurador: ${x.procurador || '-'} | Depósito: ${br(x.deposito)} | Concessão: ${br(x.concessao)} | Vigência: ${br(x.vigencia)} | Publicações: ${(x.publicacoes || []).map(p => `RPI ${p.rpi} ${p.data} ${p.despacho}`).join('; ')} | Complemento: ${x.complemento || '-'} | Mesmo segmento: ${x.mesmoSegmento || '-'} | Risco preliminar: ${x.relevancia || '-'}`).join('\n') || '(nenhuma)'}

INSTRUÇÕES
1. Priorize as marcas do mesmo segmento e classe, e verifique se estão Em Vigor ou Em Processo (antes da concessão ou do indeferimento).
2. Para cada anterioridade relevante, compare os sinais (gráfico, fonético, ideológico) e a afinidade mercadológica.
3. Conclua com a viabilidade (ALTA, MÉDIA ou BAIXA), o resumo de uma linha e recomendações (ex.: classes, apresentação mista, elementos distintivos).
4. Linguagem clara para o empresário, sem juridiquês excessivo, em parágrafos curtos. Não cite nomes de advogados nem número de OAB.
5. Termine com: "Dados atualizados até ${br(a.atualizadoAte) || '[data]'} - Nº da Revista: ${a.revista || '[xxxx]'}".`;
}
