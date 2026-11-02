// Clientes: Relatório Cadastral (2.1), pasta do cliente (Drive 01–06), checklist pré-protocolo
// com trava da GRU (Item 11.3) e protocolo exclusivo de Caio (D6).
import {
  store, api, esc, br, brl, tabs, toast, falha, modal, lerForm, campos, getConfig, isAdmin, fmtCpfCnpj, uploadArquivo, dataHora, confirmar,
} from '../core.js';
import { cabecalho } from '../app.js';
import { ETAPAS_FUNIL, etapaNome, CANAIS, PASTAS, CHECKLIST, badgeViab } from '../lib/dominio.js';
import { apenasDigitos } from '../lib/texto.js';
import { sugerirClasses, nomeClasse, NICE } from '../lib/nice.js';
import { validarLogo, adequarLogo } from '../lib/logo.js';
import { abrirDocumento } from '../lib/timbrado.js';
import { relatorioCadastral, MODELOS, variaveis } from '../lib/modelos.js';
import { novoLead, garantirAnalise, enviarMensagem, linhaHistorico, registrarHistorico, nomesEquipe } from './comum.js';

let abaAtual = 'cadastro';
const listaFiltro = { q: '', etapa: '' };

export async function render(el, [id]) {
  if (id) return detalhe(el, id);
  const clientes = await store.list('clientes', true);
  el.innerHTML = cabecalho('Clientes & protocolo', 'Cadastro único de leads e clientes (carteira antiga e nova). Abra um cliente para o relatório cadastral, a pasta de documentos, o checklist pré-protocolo e o protocolo.',
    '<button class="btn neon" data-a="novo">+ Novo cliente</button>', 'Etapas 8 · 11')
    + `<div class="card"><div class="row" style="margin-bottom:12px"><input class="search" placeholder="Buscar…" data-f="q" value="${esc(listaFiltro.q)}">
      <select data-f="etapa" style="width:auto"><option value="">Todas as etapas</option>${ETAPAS_FUNIL.map(e => `<option value="${e.id}" ${listaFiltro.etapa === e.id ? 'selected' : ''}>${e.titulo}</option>`).join('')}</select>
      <span class="faint small" id="cnt"></span></div><div class="table-wrap"><table class="t"><thead><tr><th>Marca</th><th>Titular / contato</th><th>Etapa</th><th>Canal</th><th>Responsável</th><th>Entrada</th></tr></thead><tbody id="tb"></tbody></table></div></div>`;
  const desenhar = () => {
    const q = listaFiltro.q.toLowerCase();
    const l = clientes.filter(c => (!listaFiltro.etapa || c.etapa === listaFiltro.etapa) && (!q || `${c.marca} ${c.nome} ${c.titular} ${c.email} ${c.cpfCnpj}`.toLowerCase().includes(q)));
    el.querySelector('#cnt').textContent = `${l.length} registro(s)`;
    el.querySelector('#tb').innerHTML = l.map(c => `<tr class="click" data-id="${c.id}"><td><b>${esc(c.marca)}</b></td><td>${esc(c.titular || c.nome)}<div class="faint small">${esc(c.telefone || '')} ${esc(c.email || '')}</div></td>
      <td><span class="badge">${esc(etapaNome(c.etapa))}</span></td><td>${esc(c.origem || '')}</td><td>${esc(c.responsavel || '')}</td><td class="nowrap">${br(c._criado)}</td></tr>`).join('')
      || '<tr><td colspan="6"><div class="empty">Nenhum cliente encontrado.</div></td></tr>';
    el.querySelectorAll('tr[data-id]').forEach(tr => tr.onclick = () => { location.hash = `#/clientes/${tr.dataset.id}`; });
  };
  desenhar();
  el.querySelectorAll('[data-f]').forEach(i => i.addEventListener('input', () => { listaFiltro[i.dataset.f] = i.value; desenhar(); }));
  el.querySelector('[data-a=novo]').onclick = async () => { const c = await novoLead(); if (c) location.hash = `#/clientes/${c.id}`; };
}

async function detalhe(el, id) {
  const [c, cfg, analises, vendas, equipe] = await Promise.all([api(`/api/c/clientes/${id}`), getConfig(), store.list('analises', true), store.list('vendas'), nomesEquipe()]);
  const an = analises.find(a => a.clienteId === id);
  const ABAS = [['cadastro', 'Relatório cadastral'], ['pasta', 'Pasta do cliente'], ['checklist', 'Checklist & protocolo'], ['documentos', 'Documentos'], ['comercial', 'Comercial & histórico']];
  el.innerHTML = cabecalho(esc(c.marca || 'Cliente'), `${esc(c.titular || c.nome || '')} · ${esc(etapaNome(c.etapa))} ${an ? '· análise ' + badgeViab(an.viabilidade) : ''}`,
    `<a class="btn" href="#/clientes">← Clientes</a><button class="btn" data-a="msg">Mensagem</button>
     ${an ? `<a class="btn" href="#/analises/${an.id}">Abrir análise</a>` : '<button class="btn" data-a="analise">Iniciar análise</button>'}`,
    `Cliente · ${esc(CANAIS[c.origem] || c.origem || '')}`)
    + tabs(ABAS, abaAtual) + '<div id="aba"></div>';
  el.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { abaAtual = b.dataset.tab; detalhe(el, id); });
  el.querySelector('[data-a=msg]').onclick = () => enviarMensagem({ cliente: c, onEnviado: (m) => registrarHistorico(c, `Mensagem ${m.codigo} enviada`) });
  el.querySelector('[data-a=analise]')?.addEventListener('click', async () => { const a = await garantirAnalise(c); location.hash = `#/analises/${a.id}`; });
  const box = el.querySelector('#aba');
  const recarregar = () => detalhe(el, id);
  ({ cadastro, pasta, checklist, documentos, comercial })[abaAtual](box, c, { cfg, an, vendas, equipe, recarregar });
}

// ---------------- Relatório cadastral 2.1 ----------------
function cadastro(box, c, { cfg, recarregar, equipe }) {
  const sim = (k, l) => ({ k, l, tipo: 'select', opcoes: [['', '—'], ['sim', 'Sim'], ['nao', 'Não']] });
  const sugest = sugerirClasses(c.descricao || '');
  const toSel = (v) => v === true ? 'sim' : v === false ? 'nao' : '';
  const obj = { ...c, lojaFisica: toSel(c.lojaFisica), lojaDigital: toSel(c.lojaDigital), vendaProdutoFisico: toSel(c.vendaProdutoFisico), temLogo: toSel(c.temLogo), marcaUtilizada: toSel(c.marcaUtilizada), cnaeCompativel: toSel(c.cnaeCompativel) };
  box.innerHTML = `<div class="grid g2">
    <div class="card"><h2>Titular</h2><div class="grid g2">${campos([
      { k: 'nome', l: 'Nome do contato', req: true }, { k: 'tipoPessoa', l: 'Pessoa', tipo: 'select', opcoes: [['PF', 'Pessoa Física'], ['PJ', 'Pessoa Jurídica']] },
      { k: 'titular', l: 'Nome do titular (PF ou razão social)', cls: 'span2' }, { k: 'cpfCnpj', l: 'CPF / CNPJ' }, { k: 'mei', l: 'MEI?', tipo: 'select', opcoes: [['', 'Não'], ['sim', 'Sim']] },
      { k: 'email', l: 'E-mail', tipo: 'email' }, { k: 'telefone', l: 'WhatsApp' },
      { k: 'endereco', l: 'Endereço completo', cls: 'span2' }, { k: 'localidade', l: 'Localidade' },
      { k: 'rg', l: 'RG / órgão (PF)' }, { k: 'nacionalidade', l: 'Nacionalidade' }, { k: 'estadoCivil', l: 'Estado civil' }, { k: 'profissao', l: 'Profissão' },
      { k: 'representante', l: 'Representante legal (PJ)' }, { k: 'representanteCpf', l: 'CPF do representante' }, { k: 'representanteQualif', l: 'Qualificação do representante', cls: 'span2' },
    ], obj)}</div>
    <div class="row" style="margin-top:12px"><button class="btn" data-a="cnpj">Buscar dados do CNPJ (BrasilAPI)</button><span class="faint small">Extrai razão social, endereço, sócios e CNAEs automaticamente.</span></div></div>
    <div class="card"><h2>Marca</h2><div class="grid g2">${campos([
      { k: 'marca', l: 'Marca', req: true }, { k: 'apresentacao', l: 'Apresentação', tipo: 'select', opcoes: [['', '—'], 'Nominativa', 'Mista', 'Figurativa', 'Tridimensional'] },
      { k: 'classes', l: 'Classe(s) NCL (ex.: 25, 35)', dica: sugest.length ? `Sugestão pela atividade: ${sugest.join(', ')}` : '' }, { k: 'responsavel', l: 'Responsável', tipo: 'select', opcoes: [['', '—'], ...equipe] },
      { k: 'especificacao', l: 'Especificação de produtos/serviços', tipo: 'textarea', cls: 'span2' },
      { k: 'descricao', l: 'Atividade desenvolvida', tipo: 'textarea', cls: 'span2' },
      sim('lojaFisica', 'Loja física?'), sim('lojaDigital', 'Loja digital?'), sim('vendaProdutoFisico', 'Venda de produto físico?'), sim('temLogo', 'Existe logomarca?'),
      sim('marcaUtilizada', 'Marca já utilizada?'), { k: 'usoDesde', l: 'Se sim, desde quando?', ph: c.tempoMarca || '' },
      { k: 'origem', l: 'Canal de origem', tipo: 'select', opcoes: Object.entries(CANAIS) }, { k: 'driveUrl', l: 'Link da pasta no Google Drive' },
    ], obj)}</div></div>
    <div class="card span2"><h2>CNAE × Classe (Art. 128, §1º LPI)</h2>
      <p class="sub">Pessoas jurídicas só podem registrar marca relativa à atividade que exercem efetiva e licitamente. Confira os CNAEs do cartão CNPJ contra a(s) classe(s) pretendida(s).</p>
      <div class="grid g2"><div>${(c.cnaes || []).length ? `<table class="t"><tr><th>CNAE</th><th>Descrição</th></tr>${c.cnaes.map(x => `<tr><td class="mono nowrap">${esc(x.codigo)}${x.principal ? ' <span class="badge lime">principal</span>' : ''}</td><td>${esc(x.descricao)}</td></tr>`).join('')}</table>` : `<div class="empty">${c.tipoPessoa === 'PJ' ? 'Sem CNAEs — use “Buscar dados do CNPJ”.' : 'Pessoa física: não se aplica.'}</div>`}</div>
      <div class="stack">${String(c.classes || '').split(/[,;\s]+/).filter(Boolean).map(n => `<div class="file-row">${esc(nomeClasse(n))}</div>`).join('') || '<div class="faint">Nenhuma classe informada.</div>'}
      ${campos([{ k: 'cnaeCompativel', l: 'Resultado da conferência', tipo: 'select', opcoes: [['', 'A conferir'], ['sim', 'Compatível'], ['nao', 'Incompatível — ajustar']] }], obj)}</div></div></div>
  </div>
  <div class="row" style="margin-top:16px;justify-content:flex-end"><button class="btn" data-a="rel">Gerar Relatório Cadastral (timbrado)</button>${isAdmin() ? '<button class="btn danger" data-a="del">Excluir cliente</button>' : ''}<button class="btn neon" data-a="salvar">Salvar cadastro</button></div>`;

  const ler = () => {
    const d = lerForm(box);
    ['lojaFisica', 'lojaDigital', 'vendaProdutoFisico', 'temLogo', 'marcaUtilizada', 'cnaeCompativel'].forEach(k => { d[k] = d[k] === 'sim' ? true : d[k] === 'nao' ? false : null; });
    d.mei = d.mei === 'sim';
    d.cpfCnpj = apenasDigitos(d.cpfCnpj);
    return d;
  };
  box.querySelector('[data-a=salvar]').onclick = async () => { try { await store.patch('clientes', c.id, ler()); toast('Cadastro salvo.'); recarregar(); } catch (e) { falha(e); } };
  box.querySelector('[data-a=rel]').onclick = async () => {
    const files = await api(`/api/files?clienteId=${c.id}`);
    const logo = files.find(f => f.pasta === '05' && /^image\//.test(f.mime));
    abrirDocumento({ titulo: `Relatório Cadastral - ${c.marca}`, kicker: 'Relatório cadastral', empresa: cfg.empresa, html: relatorioCadastral({ ...c, ...ler(), logoUrl: logo ? `${location.origin}/api/files/${logo.id}` : '' }, cfg), clienteId: c.id, pasta: '02' });
  };
  box.querySelector('[data-a=cnpj]').onclick = async () => {
    const cnpj = apenasDigitos(box.querySelector('[name=cpfCnpj]').value);
    if (cnpj.length !== 14) return toast('Informe um CNPJ com 14 dígitos.', true);
    try {
      const r = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`);
      if (!r.ok) throw new Error('CNPJ não encontrado na BrasilAPI.');
      const j = await r.json();
      const cnaes = [{ codigo: String(j.cnae_fiscal).replace(/(\d{4})(\d)(\d{2})/, '$1-$2/$3'), descricao: j.cnae_fiscal_descricao, principal: true },
        ...(j.cnaes_secundarios || []).filter(x => x.codigo).map(x => ({ codigo: String(x.codigo).replace(/(\d{4})(\d)(\d{2})/, '$1-$2/$3'), descricao: x.descricao }))];
      const adm = (j.qsa || []).find(s => /administrador/i.test(s.qualificacao_socio)) || (j.qsa || [])[0];
      const patch = {
        ...ler(), tipoPessoa: 'PJ', cpfCnpj: cnpj, titular: j.razao_social, cnaes, mei: !!j.opcao_pelo_mei,
        endereco: [j.descricao_tipo_de_logradouro, j.logradouro, j.numero, j.complemento, j.bairro, `${j.municipio}/${j.uf}`, `CEP ${j.cep}`].filter(Boolean).join(', '),
        representante: adm?.nome_socio || '', socios: (j.qsa || []).map(s => ({ nome: s.nome_socio, qualificacao: s.qualificacao_socio })), situacaoCnpj: j.descricao_situacao_cadastral,
      };
      await store.patch('clientes', c.id, patch);
      toast(`CNPJ ${j.descricao_situacao_cadastral || ''}: ${cnaes.length} CNAE(s) extraído(s).`);
      recarregar();
    } catch (e) { falha(e); }
  };
  box.querySelector('[data-a=del]')?.addEventListener('click', async () => {
    if (!await confirmar('Excluir cliente', `Excluir definitivamente <b>${esc(c.marca)}</b>? Esta ação não pode ser desfeita.`)) return;
    await store.remove('clientes', c.id); location.hash = '#/clientes';
  });
}

// ---------------- Pasta do cliente (estrutura Drive 01–06) ----------------
async function pasta(box, c, { recarregar }) {
  const files = await api(`/api/files?clienteId=${c.id}`);
  box.innerHTML = `<div class="card" style="margin-bottom:16px"><div class="row between"><div><h2 style="margin:0">Pasta Modelo do cliente</h2><div class="muted small">Mesma estrutura da Pasta Modelo no Google Drive. Arraste arquivos para cada subpasta.</div></div>
    <div class="row">${c.driveUrl ? `<a class="btn" target="_blank" rel="noopener" href="${esc(c.driveUrl)}">Abrir no Google Drive ↗</a>` : '<span class="faint small">Cadastre o link do Drive no cadastro.</span>'}<button class="btn" data-a="logo">Validar logo (padrão INPI)</button></div></div></div>
    <div class="grid g2">${PASTAS.map(([pid, nome]) => {
      const fs = files.filter(f => f.pasta === pid);
      return `<div class="folder"><h4>📁 ${esc(nome)} <span class="badge n">${fs.length}</span></h4>
        <div class="stack" style="gap:6px">${fs.map(f => `<div class="file-row"><span>${/^image\//.test(f.mime) ? '🖼' : /pdf/.test(f.mime) ? '📄' : '📎'}</span>
          <a href="/api/files/${f.id}" target="_blank" rel="noopener">${esc(f.nome)}</a><span class="faint tiny" style="margin-left:auto">${(f.tamanho / 1024).toFixed(0)} KB · ${esc(f.criado_por || '')}</span>
          <button class="btn xs ghost" data-del="${f.id}" title="Excluir">✕</button></div>`).join('')}</div>
        <div class="dropzone" data-pasta="${pid}" style="margin-top:8px">Soltar arquivos aqui ou clicar para enviar</div></div>`;
    }).join('')}</div>`;
  const enviar = async (lista, pid) => {
    for (const f of lista) {
      try { await uploadArquivo(f, { clienteId: c.id, pasta: pid }); } catch (e) { falha(e); }
    }
    toast(`${lista.length} arquivo(s) enviado(s).`);
    recarregar();
  };
  box.querySelectorAll('.dropzone').forEach(z => {
    z.onclick = () => { const i = document.createElement('input'); i.type = 'file'; i.multiple = true; i.onchange = () => enviar([...i.files], z.dataset.pasta); i.click(); };
    z.ondragover = (e) => { e.preventDefault(); z.classList.add('over'); };
    z.ondragleave = () => z.classList.remove('over');
    z.ondrop = (e) => { e.preventDefault(); z.classList.remove('over'); enviar([...e.dataTransfer.files], z.dataset.pasta); };
  });
  box.querySelectorAll('[data-del]').forEach(b => b.onclick = async () => {
    if (!await confirmar('Excluir arquivo', 'Deseja excluir este arquivo?')) return;
    try { await api(`/api/files/${b.dataset.del}`, { method: 'DELETE' }); recarregar(); } catch (e) { falha(e); }
  });
  box.querySelector('[data-a=logo]').onclick = () => modalLogo(c, recarregar);
}

export async function modalLogo(c, depois) {
  let arquivo = null, adequado = null;
  await modal({
    titulo: 'Validação da logomarca — padrão e-Marcas', sub: '.JPG · fundo branco · quadrada · mín. 945×945 px · 300 DPI · até 2 MB · sem ® ou ™', grande: true,
    corpo: `<input type="file" accept="image/*" id="lg"><div id="res" style="margin-top:14px"></div>`,
    onOpen: (b) => {
      b.querySelector('#lg').onchange = async (e) => {
        arquivo = e.target.files[0]; adequado = null;
        if (!arquivo) return;
        const r = await validarLogo(arquivo);
        const prev = URL.createObjectURL(arquivo);
        b.querySelector('#res').innerHTML = `<div class="grid g2"><div class="stack">${r.itens.map(i => `<div class="file-row"><span>${i.ok === true ? '✅' : i.ok === false ? '❌' : '👁'}</span>${esc(i.txt)}</div>`).join('')}
          <div style="margin-top:6px">${r.ok ? '<span class="badge lime">Logo dentro do padrão</span>' : '<span class="badge red">Fora do padrão</span> <button class="btn sm" id="fix">Gerar versão adequada</button>'}</div></div>
          <div><img src="${prev}" style="max-width:100%;max-height:260px;border-radius:12px;background:#fff"><div id="fixed"></div></div></div>`;
        b.querySelector('#fix')?.addEventListener('click', async () => {
          adequado = await adequarLogo(arquivo);
          const r2 = await validarLogo(adequado);
          b.querySelector('#fixed').innerHTML = `<div class="hr"></div><b>Versão adequada:</b> ${adequado.name} (${(adequado.size / 1024).toFixed(0)} KB)<div class="stack" style="margin-top:6px">${r2.itens.map(i => `<div class="small">${i.ok === true ? '✅' : i.ok === false ? '❌' : '👁'} ${esc(i.txt)}</div>`).join('')}</div>`;
        });
      };
    },
    acoes: [{ label: 'Fechar' }, {
      label: 'Salvar na pasta 05 do cliente', cls: 'neon', onClick: async () => {
        const f = adequado || arquivo;
        if (!f) { toast('Selecione uma imagem.', true); return false; }
        await uploadArquivo(f, { clienteId: c.id, pasta: '05' });
        if (adequado || (await validarLogo(f)).ok) await store.patch('clientes', c.id, { checklist: { ...(c.checklist || {}), c8: true }, logoValidadaEm: new Date().toISOString() });
        toast('Logo salva na pasta 05.'); depois?.();
      },
    }],
  });
}

// ---------------- Checklist pré-protocolo + trava da GRU ----------------
async function checklist(box, c, { an, recarregar }) {
  const ck = c.checklist || {};
  const g = c.gru || {};
  const { falta } = await api(`/api/clientes/${c.id}/pendencias`);
  const mista = String(c.apresentacao || '').toLowerCase() === 'mista';
  box.innerHTML = `<div class="grid g2">
    <div class="card"><h2>Checklist obrigatório pré-protocolo</h2><p class="sub">Preenchido pelo colaborador antes de enviar a Caio (Item 11.3).</p>
      ${CHECKLIST.map(([k, l]) => {
        const na = (k === 'c8' && !mista) || (k === 'c9' && !c.termoRiscoAplicavel);
        const trava = k === 'c6';
        return `<label class="chk" style="${trava ? 'border:1px solid rgba(255,92,92,.35);border-radius:12px;padding:10px;margin:6px 0' : ''}"><input type="checkbox" data-ck="${k}" ${ck[k] ? 'checked' : ''} ${k === 'c10' ? 'disabled' : ''}>
          <span>${CHECKLIST.indexOf(CHECKLIST.find(x => x[0] === k)) + 1}. ${esc(l)} ${na ? '<span class="badge">não se aplica</span>' : ''}${trava ? '<br><small class="faint">Só marque após conferir data e hora da liquidação bancária. VEDADO protocolar antes da quitação efetiva.</small>' : ''}</span></label>`;
      }).join('')}
      <label class="chk"><input type="checkbox" data-tr ${c.termoRiscoAplicavel ? 'checked' : ''}><span>Viabilidade baixa/média — exigir Termo de Ciência de Risco (item 9) ${an ? badgeViab(an.viabilidade) : ''}</span></label>
    </div>
    <div class="stack">
      <div class="card"><h2>GRU — Guia de Recolhimento da União</h2><p class="sub">Emitida pelo colaborador no e-INPI, no CPF/CNPJ do titular (D6).</p>
        <div class="grid g2">${campos([
          { k: 'numero', l: 'Nº da GRU / nosso número' }, { k: 'servico', l: 'Código do serviço', ph: 'Ex.: 389 / 394' },
          { k: 'valor', l: 'Valor (R$)', tipo: 'number', step: '0.01' }, { k: 'vencimento', l: 'Vencimento', tipo: 'date' },
          { k: 'status', l: 'Status do pagamento', tipo: 'select', opcoes: [['', '—'], ['emitida', 'Emitida (não paga)'], ['agendada', 'Agendada (NÃO vale)'], ['compensada', 'Compensada / liquidada']] },
          { k: 'liquidadaEm', l: 'Data e hora da liquidação', tipo: 'datetime-local' },
        ], g)}</div>
        <div class="row" style="margin-top:10px"><button class="btn sm" data-a="gru">Salvar GRU</button><a class="btn sm" target="_blank" rel="noopener" href="https://www.gov.br/inpi/pt-br/servicos/marcas">Portal INPI (GRU) ↗</a></div>
      </div>
      <div class="card"><h2>Situação para protocolo</h2>
        ${c.etapa === 'protocolado' ? `<div class="badge lime">Protocolado em ${dataHora(c.protocoladoEm)} por ${esc(c.protocoladoPor || '')}</div>`
          : falta.length ? `<div class="stack">${falta.map(f => `<div class="file-row"><span>⛔</span>${esc(f)}</div>`).join('')}</div>` : '<div class="badge lime">Checklist completo — liberado para o protocolo de Caio</div>'}
        <div class="row" style="margin-top:14px">
          ${c.etapa !== 'protocolado' && !falta.length && c.etapa !== 'pronto' ? '<button class="btn" data-a="pronto">Enviar para Caio (pronto p/ protocolo)</button>' : ''}
          ${isAdmin() && c.etapa !== 'protocolado' ? `<button class="btn neon" data-a="proto" ${falta.length ? 'disabled' : ''}>Registrar protocolo no e-Marcas</button>` : ''}
          <a class="btn" target="_blank" rel="noopener" href="https://www.gov.br/inpi/pt-br/servicos/marcas">e-Marcas (portal INPI) ↗</a>
        </div>
        ${!isAdmin() ? '<p class="faint small" style="margin-top:10px">O protocolo é realizado exclusivamente por Caio.</p>' : ''}
      </div>
    </div></div>`;

  box.querySelectorAll('[data-ck]').forEach(i => i.onchange = async () => {
    if (i.dataset.ck === 'c6' && i.checked) {
      const gg = c.gru || {};
      if (gg.status !== 'compensada' || !gg.liquidadaEm) { i.checked = false; return toast('Trava da GRU: informe status “Compensada” e a data/hora da liquidação antes de marcar o item 6.', true); }
    }
    try { await store.patch('clientes', c.id, { checklist: { ...(c.checklist || {}), [i.dataset.ck]: i.checked } }); recarregar(); } catch (e) { falha(e); }
  });
  box.querySelector('[data-tr]').onchange = async (e) => { await store.patch('clientes', c.id, { termoRiscoAplicavel: e.target.checked }); recarregar(); };
  box.querySelector('[data-a=gru]').onclick = async () => {
    const card = box.querySelector('[data-a=gru]').closest('.card');
    const d = lerForm(card);
    if (d.status === 'agendada') toast('Comprovante de agendamento NÃO libera o protocolo. Aguarde a compensação.', true);
    const patch = { gru: d };
    if (d.status !== 'compensada') patch.checklist = { ...(c.checklist || {}), c6: false };
    await store.patch('clientes', c.id, patch);
    toast('GRU salva.'); recarregar();
  };
  box.querySelector('[data-a=pronto]')?.addEventListener('click', async () => { await store.patch('clientes', c.id, { etapa: 'pronto' }); await registrarHistorico(c, 'Checklist completo — enviado a Caio para protocolo'); toast('Enviado para Caio.'); recarregar(); });
  box.querySelector('[data-a=proto]')?.addEventListener('click', async () => {
    const classes = String(c.classes || '').split(/[,;\s]+/).filter(Boolean);
    const linhas = (classes.length ? classes : ['']).map((cl, i) => `<div class="grid g3" style="margin-bottom:8px"><label class="f"><span>Nº do processo (9 dígitos)</span><input data-n="${i}" inputmode="numeric" maxlength="9"></label>
      <label class="f"><span>Classe</span><input data-c="${i}" value="${esc(cl)}"></label><label class="f"><span>Data do depósito</span><input type="date" data-d="${i}" value="${new Date().toISOString().slice(0, 10)}"></label></div>`).join('');
    await modal({
      titulo: 'Registrar protocolo', sub: 'Um processo por classe. Depois anexe o comprovante oficial na pasta 05.', corpo: linhas,
      acoes: [{ label: 'Cancelar' }, {
        label: 'Confirmar protocolo', cls: 'neon', onClick: async (b) => {
          const pedidos = [...b.querySelectorAll('[data-n]')].map((i) => ({ numero: i.value, classe: b.querySelector(`[data-c="${i.dataset.n}"]`).value, dataDeposito: b.querySelector(`[data-d="${i.dataset.n}"]`).value }));
          try {
            await api(`/api/clientes/${c.id}/protocolar`, { method: 'POST', body: { pedidos } });
          } catch (e) { if (e.data?.falta) toast('Pendências: ' + e.data.falta.join('; '), true); throw e; }
          store.invalidate('processos', 'clientes');
          toast('Protocolo registrado. Processo(s) incluído(s) na Carteira INPI e na vigilância.');
          enviarMensagem({ cliente: c, codigo: '10.9-protocolo', categoria: 'Atualização INPI', extra: { processo: pedidos.map(p => p.numero).join(', ') } });
          recarregar();
        },
      }],
    });
  });
}

// ---------------- Documentos do cliente ----------------
function documentos(box, c, { cfg }) {
  const grupos = [...new Set(MODELOS.map(m => m.grupo))];
  const sugerido = (m) => (c.tipoPessoa === 'PJ' ? (c.mei ? ['3.2', '4.1'] : ['3.3', '4.1']) : ['3.1', '4.0']).includes(m.id);
  box.innerHTML = `<div class="card"><h2>Gerar documentos para ${esc(c.marca)}</h2><p class="sub">Minutas no timbrado Vora, preenchidas com o cadastro. Campos faltantes ficam destacados e podem ser editados antes de imprimir/salvar em PDF. Envie para assinatura no ZapSign / Autentique.</p>
  <div class="grid g3">${grupos.map(g => `<div class="folder"><h4>${esc(g)}</h4><div class="stack" style="gap:6px">${MODELOS.filter(m => m.grupo === g).map(m => `<button class="btn sm" style="justify-content:flex-start;white-space:normal;text-align:left" data-m="${m.id}">${sugerido(m) ? '★ ' : ''}${esc(m.id)} · ${esc(m.titulo)}</button>`).join('')}</div></div>`).join('')}</div>
  <div class="row" style="margin-top:14px"><a class="btn" target="_blank" rel="noopener" href="https://app.zapsign.com.br/">ZapSign ↗</a><a class="btn" target="_blank" rel="noopener" href="https://app.autentique.com.br/">Autentique ↗</a></div></div>`;
  box.querySelectorAll('[data-m]').forEach(b => b.onclick = () => gerarModeloCliente(MODELOS.find(m => m.id === b.dataset.m), c, cfg));
}

export async function gerarModeloCliente(m, c, cfg, extraBase = {}) {
  let extra = { ...extraBase };
  if (m.extras?.length) {
    const r = await modal({
      titulo: m.titulo, sub: 'Dados complementares (opcionais — podem ser editados no documento)',
      corpo: `<div class="grid g2">${campos(m.extras.map(k => ({ k, l: k.replace(/([A-Z])/g, ' $1').toLowerCase(), tipo: /argumentos|conduta|provas|diligencias|planoMidia|pedidos/.test(k) ? 'textarea' : 'text' })), extra)}</div>`,
      acoes: [{ label: 'Cancelar', valor: null }, { label: 'Gerar', cls: 'neon', onClick: (b) => lerForm(b) }],
    });
    if (!r) return;
    extra = { ...extra, ...r };
  }
  abrirDocumento({ titulo: `${m.id} ${m.titulo} - ${c.marca || ''}`, kicker: m.grupo, empresa: cfg.empresa, html: m.gerar(variaveis(c, cfg, extra)), clienteId: c.id, pasta: m.pasta });
}

// ---------------- Comercial & histórico ----------------
function comercial(box, c, { vendas, recarregar }) {
  const vs = vendas.filter(v => v.clienteId === c.id);
  const cadencia = [7, 15, 30, 60, 90, 120];
  const base = c.parecerEnviadoEm || c.perdidoEm;
  const feitos = c.followups || [];
  box.innerHTML = `<div class="grid g2">
    <div class="card"><h2>Vendas / contratos</h2>${vs.length ? `<table class="t"><tr><th>Serviço</th><th>Valor</th><th>Forma</th><th>Status</th></tr>${vs.map(v => `<tr><td>${esc(v.servico)}</td><td>${brl(v.valor)}</td><td>${esc(v.forma)}</td><td>${(v.parcelas || []).filter(p => p.pago).length}/${(v.parcelas || []).length} pagas</td></tr>`).join('')}</table>` : '<div class="empty">Nenhuma venda registrada.</div>'}
      <div class="row" style="margin-top:12px"><a class="btn sm" href="#/financeiro">Registrar venda no Financeiro →</a><a class="btn sm" href="#/precos">Simular proposta →</a></div></div>
    <div class="card"><h2>Régua de follow-up (2.4)</h2><p class="sub">${base ? `Contada a partir de ${br(base)} (parecer enviado / não fechou).` : 'Inicia quando o parecer é enviado.'}</p>
      <div class="stack">${cadencia.map(d => {
        const quando = base ? new Date(new Date(base).getTime() + d * 86400000) : null;
        const feito = feitos.includes(d);
        const vencido = quando && quando < new Date() && !feito;
        return `<div class="file-row"><span class="mono">${d}d</span><span>${quando ? quando.toLocaleDateString('pt-BR') : '—'}</span>
          ${feito ? '<span class="badge lime">enviado</span>' : vencido ? '<span class="badge amber">pendente</span>' : '<span class="badge">agendado</span>'}
          <button class="btn xs" style="margin-left:auto" data-fu="${d}" ${!base || feito ? 'disabled' : ''}>Enviar</button></div>`;
      }).join('')}</div></div>
    <div class="card span2"><div class="row between"><h2 style="margin:0">Histórico</h2><button class="btn sm" data-a="nota">+ Anotação</button></div><div class="stack" style="margin-top:12px">${(c.historico || []).slice().reverse().map(linhaHistorico).join('') || '<div class="faint">Sem registros.</div>'}</div>
      <div class="faint small" style="margin-top:10px">Consentimento LGPD: ${c.consentimento ? `aceito em ${dataHora(c.consentimentoEm) || '—'}` : 'não registrado'}</div></div></div>`;
  box.querySelectorAll('[data-fu]').forEach(b => b.onclick = () => enviarMensagem({
    cliente: c, codigo: `FU-${b.dataset.fu}`, categoria: 'Follow-up',
    onEnviado: async () => { await store.patch('clientes', c.id, { followups: [...feitos, +b.dataset.fu] }); await registrarHistorico({ ...c, followups: [...feitos, +b.dataset.fu] }, `Follow-up de ${b.dataset.fu} dias enviado`); recarregar(); },
  }));
  box.querySelector('[data-a=nota]').onclick = async () => {
    const r = await modal({ titulo: 'Nova anotação', corpo: '<textarea name="t" rows="4"></textarea>', acoes: [{ label: 'Cancelar', valor: null }, { label: 'Salvar', cls: 'neon', onClick: (b) => b.querySelector('textarea').value.trim() || false }] });
    if (r) { await registrarHistorico(c, r); recarregar(); }
  };
}
