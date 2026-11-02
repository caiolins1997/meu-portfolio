// Playbook de mensagens padrão (Itens 10.1 a 10.10) — WhatsApp e e-mail.
import { store, esc, modal, campos, lerForm, toast, copiar, isAdmin, confirmar } from '../core.js';
import { cabecalho } from '../app.js';

let cat = '';

export async function render(el) {
  const msgs = (await store.list('mensagens', true)).sort((a, b) => a.codigo.localeCompare(b.codigo, 'pt', { numeric: true }));
  const cats = [...new Set(msgs.map(m => m.categoria))];
  el.innerHTML = cabecalho('Playbook de mensagens', 'Modelos padrão para WhatsApp e e-mail. Variáveis entre chaves duplas — {{nome}}, {{marca}}, {{processo}}, {{rpi}}, {{prazo}}, {{link_formulario}}… — são preenchidas automaticamente quando a mensagem é enviada de um cliente, processo ou colidência.',
    '<button class="btn neon" data-a="nova">+ Mensagem</button>', 'Itens 10.1 → 10.10')
    + `<div class="tabs"><button data-c="" class="${!cat ? 'on' : ''}">Todas</button>${cats.map(c => `<button data-c="${esc(c)}" class="${cat === c ? 'on' : ''}">${esc(c)}</button>`).join('')}</div>
    <div class="grid g2">${msgs.filter(m => !cat || m.categoria === cat).map(m => `<div class="card"><div class="row between"><div><span class="badge lime">${esc(m.codigo)}</span> <b>${esc(m.titulo)}</b></div><span class="badge">${esc(m.categoria)}</span></div>
      ${m.assunto ? `<div class="small muted" style="margin-top:8px">Assunto: ${esc(m.assunto)}</div>` : ''}
      <div class="msg-text" style="margin-top:10px;max-height:220px;overflow:auto">${esc(m.texto)}</div>
      <div class="row" style="margin-top:10px"><button class="btn sm" data-copy="${m.id}">Copiar</button><button class="btn sm" data-ed="${m.id}">Editar</button></div></div>`).join('')}</div>`;
  el.querySelectorAll('[data-c]').forEach(b => b.onclick = () => { cat = b.dataset.c; render(el); });
  el.querySelectorAll('[data-copy]').forEach(b => b.onclick = () => copiar(msgs.find(m => m.id === b.dataset.copy).texto));
  const editar = async (m = {}) => {
    const r = await modal({
      titulo: m.id ? `${m.codigo} · ${m.titulo}` : 'Nova mensagem', grande: true,
      corpo: `<div class="grid g3">${campos([{ k: 'codigo', l: 'Código', req: true }, { k: 'titulo', l: 'Título', req: true }, { k: 'categoria', l: 'Categoria', req: true }, { k: 'assunto', l: 'Assunto do e-mail (opcional)', cls: 'span2' }], m)}</div>
        <label class="f" style="margin-top:12px"><span>Texto</span><textarea name="texto" rows="14">${esc(m.texto || '')}</textarea></label>`,
      acoes: [...(m.id ? [{ label: 'Excluir', cls: 'danger', onClick: async () => { if (!await confirmar('Excluir', 'Excluir esta mensagem?')) return false; await store.remove('mensagens', m.id); return 'del'; } }] : []),
        { label: 'Cancelar', valor: null }, { label: 'Salvar', cls: 'neon', onClick: (b) => { const d = lerForm(b); if (!d.codigo || !d.titulo || !d.texto) { toast('Preencha código, título e texto.', true); return false; } return d; } }],
    });
    if (r && r !== 'del') { await store.save('mensagens', { ...m, ...r }); toast('Mensagem salva.'); }
    if (r) render(el);
  };
  el.querySelectorAll('[data-ed]').forEach(b => b.onclick = () => editar(msgs.find(m => m.id === b.dataset.ed)));
  el.querySelector('[data-a=nova]').onclick = () => editar({ categoria: cat || 'Recepção' });
}
