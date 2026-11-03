// Importação da carteira existente (pastas de clientes do Google Drive).
// 1) pacote JSON gerado a partir das pastas (só dados conferidos nos documentos) + 2) a pasta "A - Clientes" do Drive.
// Nada é inventado: campos sem fonte ficam em branco; cada cliente leva a lista de arquivos de origem para conferência.
import { store, esc, toast, falha, uploadArquivo, confirmar } from '../core.js';

const tamanho = (n) => n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.round(n / 1024)} KB`;
const LIMITE = 25 * 1048576;

export function renderImportacao(box) {
  let pacote = null, arquivos = new Map();
  box.innerHTML = `<div class="card"><h2>Importar carteira existente</h2>
    <p class="sub">Use o pacote <b>importacao-clientes-vora.json</b> (pasta Vora Propriedade Intectual no Drive) e selecione a pasta <b>A - Clientes</b> do Google Drive. Clientes já cadastrados (mesma marca e mesmo CPF/CNPJ, ou importados antes) são ignorados.</p>
    <div class="grid g2"><label class="f"><span>1. Pacote de importação (.json)</span><input type="file" accept=".json,application/json" id="pj"></label>
    <label class="f"><span>2. Pasta "A - Clientes" do Google Drive</span><input type="file" id="pd" webkitdirectory directory multiple></label></div>
    <div id="prev" style="margin-top:14px"></div></div>`;
  const prev = box.querySelector('#prev');

  const desenhar = async () => {
    if (!pacote) { prev.innerHTML = ''; return; }
    const existentes = await store.list('clientes', true);
    const linhas = pacote.clientes.map(c => {
      const dup = existentes.find(e => (e.importId && e.importId === c.importId) || (e.marca && e.marca.toLowerCase() === String(c.marca).toLowerCase() && (e.cpfCnpj || '') === (c.cpfCnpj || '')));
      const fs = (c.arquivos || []).map(a => ({ ...a, f: arquivos.get(a.caminho) }));
      return { c, dup, fs };
    });
    prev.innerHTML = `<div class="table-wrap"><table class="t"><tr><th></th><th>Marca</th><th>Titular</th><th>Processos</th><th>Arquivos</th><th>Situação</th></tr>
      ${linhas.map((l, i) => `<tr><td><input type="checkbox" data-i="${i}" ${l.dup ? 'disabled' : 'checked'}></td><td><b>${esc(l.c.marca)}</b><div class="faint tiny">${esc(l.c.pastaDrive || '')}</div></td>
        <td>${esc(l.c.titular || l.c.nome || '—')}<div class="faint tiny">${esc(l.c.cpfCnpj || '')}</div></td><td>${(l.c.processos || []).map(p => `<span class="mono small">${esc(p.numero)}</span> <span class="faint tiny">cl. ${esc(p.classe || '?')}</span>`).join('<br>') || '—'}</td>
        <td>${arquivos.size ? `${l.fs.filter(a => a.f).length}/${l.fs.length} encontrados` : `${l.fs.length} (selecione a pasta)`}</td>
        <td>${l.dup ? '<span class="badge">já cadastrado</span>' : '<span class="badge lime">novo</span>'}${(l.c.pendencias || []).length ? `<div class="faint tiny">${l.c.pendencias.map(esc).join('<br>')}</div>` : ''}</td></tr>`).join('')}</table></div>
      <div class="row" style="margin-top:12px"><button class="btn neon" id="imp">Importar selecionados</button><span class="faint small" id="prog"></span></div>`;
    prev.querySelector('#imp').onclick = async () => {
      const sel = [...prev.querySelectorAll('[data-i]:checked')].map(i => linhas[+i.dataset.i]);
      if (!sel.length) return toast('Nenhum cliente selecionado.', true);
      if (!arquivos.size && !await confirmar('Importar sem arquivos', 'A pasta do Drive não foi selecionada: só os cadastros e processos serão importados. Continuar?')) return;
      const prog = prev.querySelector('#prog');
      let nArq = 0, pulados = [];
      try {
        for (const [k, l] of sel.entries()) {
          prog.textContent = `Importando ${k + 1}/${sel.length}: ${l.c.marca}…`;
          const { processos = [], arquivos: _a, pendencias = [], ...dados } = l.c;
          const hoje = new Date().toISOString().slice(0, 10);
          const historico = [{ data: hoje, por: 'importação', texto: `Importado da pasta do Drive "${dados.pastaDrive || ''}"` }, ...pendencias.map(p => ({ data: hoje, por: 'importação', texto: `Pendência: ${p}` }))];
          // Carteira já protocolada antes do sistema: entra pela importação em lote (registrada na auditoria), com id = importId.
          const cli = { ...dados, id: dados.importId, pendenciasImportacao: pendencias, importadoEm: new Date().toISOString(), historico };
          await store.bulk('clientes', [cli]);
          if (processos.length) await store.bulk('processos', processos.map(p => ({ despachos: [], monitorar: true, origemCarteira: 'antiga', ...p, marca: p.marca || cli.marca, clienteId: cli.id, titular: p.titular || cli.titular || cli.nome || '' })));
          for (const a of l.fs) {
            if (!a.f) continue;
            if (!a.f.size) continue;
            if (a.f.size > LIMITE) { pulados.push(`${a.caminho} (${tamanho(a.f.size)})`); continue; }
            prog.textContent = `Importando ${k + 1}/${sel.length}: ${l.c.marca} — ${a.f.name}`;
            try { await uploadArquivo(a.f, { clienteId: cli.id, pasta: a.pasta || '01', nome: a.nome || a.f.name }); nArq++; } catch (e) { pulados.push(`${a.caminho} (${e.message})`); }
          }
        }
        store.invalidate('clientes', 'processos');
        prog.textContent = '';
        toast(`${sel.length} cliente(s) e ${nArq} arquivo(s) importados.`);
        if (pulados.length) toast(`Arquivos não enviados (continuam no Drive): ${pulados.join('; ')}`, true);
        desenhar();
      } catch (e) { prog.textContent = ''; falha(e); }
    };
  };

  box.querySelector('#pj').onchange = async (e) => {
    try {
      const j = JSON.parse(await e.target.files[0].text());
      if (!Array.isArray(j.clientes)) throw new Error('Pacote inválido: falta a lista de clientes.');
      pacote = j; desenhar();
    } catch (er) { falha(er); }
  };
  box.querySelector('#pd').onchange = (e) => {
    arquivos = new Map();
    for (const f of e.target.files) {
      // webkitRelativePath começa pelo nome da pasta escolhida ("A - Clientes/..."): guardamos o caminho relativo a ela.
      const rel = f.webkitRelativePath.split('/').slice(1).join('/');
      if (rel && !/desktop\.ini$/i.test(rel)) arquivos.set(rel, f);
    }
    toast(`${arquivos.size} arquivo(s) encontrados na pasta.`);
    desenhar();
  };
}
