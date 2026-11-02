// Núcleo do front-end: API, cache, utilitários de UI, modal, toast, abas e Kanban.
import { br as brData } from './lib/prazos.js';
import { apenasDigitos } from './lib/texto.js';

export const state = { user: null, cache: {}, config: null };
// O sistema interno é servido em vorapi.com.br/admin; o formulário público fica em /formulario.
export const BASE = '/admin';

export async function api(url, opts = {}) {
  if (url.startsWith('/api')) url = BASE + url;
  const o = { credentials: 'same-origin', ...opts, headers: { ...(opts.headers || {}) } };
  if (o.body && typeof o.body === 'object' && !(o.body instanceof Blob) && !(o.body instanceof ArrayBuffer) && !(o.body instanceof File)) {
    o.body = JSON.stringify(o.body);
    o.headers['Content-Type'] = 'application/json';
  }
  const r = await fetch(url, o);
  let data = null;
  try { data = await r.json(); } catch { /* sem corpo JSON */ }
  if (r.status === 401 && !url.includes('/api/login') && !url.includes('/api/me')) {
    state.user = null; state.cache = {};
    window.dispatchEvent(new Event('vora:refresh'));
    throw new Error(data?.erro || 'Sessão expirada');
  }
  if (!r.ok) { const e = new Error(data?.erro || `Erro ${r.status}`); e.data = data; throw e; }
  return data;
}

// ---------- store (coleções) ----------
export const store = {
  async list(col, force = false) {
    if (!force && state.cache[col]) return state.cache[col];
    state.cache[col] = await api(`/api/c/${col}`);
    return state.cache[col];
  },
  async get(col, id) {
    const l = state.cache[col]?.find(x => x.id === id);
    return l || api(`/api/c/${col}/${id}`);
  },
  async save(col, doc) {
    const r = doc.id && !doc._novo
      ? await api(`/api/c/${col}/${doc.id}`, { method: 'PUT', body: doc })
      : await api(`/api/c/${col}`, { method: 'POST', body: (({ _novo, ...d }) => d)(doc) });
    const arr = state.cache[col];
    if (arr) { const i = arr.findIndex(x => x.id === r.id); i >= 0 ? (arr[i] = r) : arr.unshift(r); }
    return r;
  },
  async patch(col, id, patch) { return this.save(col, { id, ...patch }); },
  async remove(col, id) {
    await api(`/api/c/${col}/${id}`, { method: 'DELETE' });
    if (state.cache[col]) state.cache[col] = state.cache[col].filter(x => x.id !== id);
  },
  async bulk(col, itens) {
    const r = await api(`/api/c/${col}/bulk`, { method: 'POST', body: { itens } });
    delete state.cache[col];
    return r;
  },
  async bulkUpdate(col, itens) {
    const r = await api(`/api/c/${col}/bulk-update`, { method: 'POST', body: { itens } });
    delete state.cache[col];
    return r;
  },
  invalidate(...cols) { cols.forEach(c => delete state.cache[c]); },
};

export async function getConfig(force = false) {
  if (!force && state.config) return state.config;
  state.config = await api('/api/c/config/principal');
  return state.config;
}
export async function saveConfig(patch) {
  state.config = await api('/api/c/config/principal', { method: 'PUT', body: patch });
  return state.config;
}

// ---------- utilitários ----------
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const br = brData;
export const brl = (n) => (Number(n) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export const num = (v) => { const n = Number(String(v ?? '').replace(/\./g, '').replace(',', '.')); return isNaN(n) ? 0 : n; };
export const hojeIso = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
export const dataHora = (s) => s ? new Date(s).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '';
export const isAdmin = () => state.user?.papel === 'admin';
export const iniciais = (n = '') => n.split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0]).join('').toUpperCase();
export function mesRef(d) { const x = d ? new Date(d) : new Date(); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}`; }
export const fmtCpfCnpj = (v = '') => {
  const d = apenasDigitos(v);
  if (d.length === 11) return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  if (d.length === 14) return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  return v;
};
export const fmtProcesso = (v = '') => apenasDigitos(v);

export function preencher(texto = '', vars = {}) {
  return String(texto).replace(/\{\{\s*([\w.]+)\s*\}\}/g, (m, k) => {
    const v = k.split('.').reduce((o, p) => (o == null ? o : o[p]), vars);
    return v === undefined || v === null || v === '' ? `[${k}]` : String(v);
  });
}

export function waLink(telefone, texto) {
  let d = apenasDigitos(telefone);
  if (d && d.length <= 11) d = '55' + d;
  return `https://wa.me/${d}?text=${encodeURIComponent(texto || '')}`;
}
export function gmailLink(para, assunto, corpo) {
  return `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(para || '')}&su=${encodeURIComponent(assunto || '')}&body=${encodeURIComponent(corpo || '')}`;
}
export async function copiar(texto) {
  try { await navigator.clipboard.writeText(texto); toast('Copiado para a área de transferência.'); }
  catch { toast('Não foi possível copiar automaticamente.', true); }
}

// ---------- toast / modal ----------
export function toast(msg, erro = false) {
  let box = document.querySelector('.toasts');
  if (!box) { box = document.createElement('div'); box.className = 'toasts'; document.body.appendChild(box); }
  const t = document.createElement('div');
  t.className = 'toast' + (erro ? ' err' : '');
  t.textContent = msg;
  box.appendChild(t);
  setTimeout(() => t.remove(), erro ? 6500 : 3200);
}
export const falha = (e) => toast(e?.message || String(e), true);

export function modal({ titulo, sub = '', corpo = '', acoes = [], grande = false, onOpen }) {
  return new Promise((resolve) => {
    const bg = document.createElement('div');
    bg.className = 'modal-bg';
    bg.innerHTML = `<div class="modal ${grande ? 'lg' : ''}" role="dialog" aria-modal="true">
      <div class="row between"><div><h2>${esc(titulo)}</h2>${sub ? `<div class="muted small">${sub}</div>` : ''}</div>
      <button class="btn ghost icon" data-x aria-label="Fechar">✕</button></div>
      <div class="hr"></div><div class="mbody">${corpo}</div>
      <div class="acts">${acoes.map((a, i) => `<button class="btn ${a.cls || ''}" data-i="${i}">${esc(a.label)}</button>`).join('')}</div></div>`;
    const fechar = (v) => { bg.remove(); document.removeEventListener('keydown', onKey); resolve(v); };
    const onKey = (e) => { if (e.key === 'Escape') fechar(null); };
    document.addEventListener('keydown', onKey);
    bg.addEventListener('mousedown', (e) => { if (e.target === bg) fechar(null); });
    bg.querySelector('[data-x]').onclick = () => fechar(null);
    bg.querySelectorAll('[data-i]').forEach(b => b.onclick = async () => {
      const a = acoes[+b.dataset.i];
      if (!a.onClick) return fechar(a.valor ?? a.label);
      try { b.disabled = true; const r = await a.onClick(bg.querySelector('.mbody')); if (r !== false) fechar(r ?? true); }
      catch (e) { falha(e); } finally { b.disabled = false; }
    });
    document.body.appendChild(bg);
    onOpen?.(bg.querySelector('.mbody'), fechar);
    bg.querySelector('input,select,textarea')?.focus();
  });
}
export const confirmar = (titulo, texto) => modal({ titulo, corpo: `<p class="muted">${texto}</p>`, acoes: [{ label: 'Cancelar', valor: false }, { label: 'Confirmar', cls: 'neon', valor: true }] });

// Lê os campos [name] de um container -> objeto
export function lerForm(el) {
  const o = {};
  el.querySelectorAll('[name]').forEach(i => {
    if (i.type === 'checkbox') o[i.name] = i.checked;
    else if (i.type === 'radio') { if (i.checked) o[i.name] = i.value; }
    else if (i.type === 'file') return;
    else o[i.name] = i.value.trim();
  });
  return o;
}

// Campos de formulário declarativos
export function campo(c, v = '') {
  const val = v ?? '';
  const ph = c.ph ? ` placeholder="${esc(c.ph)}"` : '';
  const req = c.req ? ' required' : '';
  let input;
  if (c.tipo === 'select') input = `<select name="${c.k}"${req}>${(c.opcoes || []).map(o => { const [ov, ol] = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(ov)}" ${String(ov) === String(val) ? 'selected' : ''}>${esc(ol)}</option>`; }).join('')}</select>`;
  else if (c.tipo === 'textarea') input = `<textarea name="${c.k}" rows="${c.rows || 3}"${ph}${req}>${esc(val)}</textarea>`;
  else if (c.tipo === 'check') return `<label class="chk ${c.cls || ''}"><input type="checkbox" name="${c.k}" ${val ? 'checked' : ''}> <span>${c.l}</span></label>`;
  else input = `<input name="${c.k}" type="${c.tipo || 'text'}" value="${esc(val)}"${ph}${req}${c.step ? ` step="${c.step}"` : ''}>`;
  return `<label class="f ${c.cls || ''}"><span>${c.l}${c.req ? ' *' : ''}</span>${input}${c.dica ? `<small class="faint">${c.dica}</small>` : ''}</label>`;
}
export const campos = (lista, obj = {}) => lista.map(c => campo(c, obj[c.k])).join('');

export async function formModal({ titulo, sub, lista, obj = {}, grande, extra = '', salvarLabel = 'Salvar', onOpen }) {
  return modal({
    titulo, sub, grande, onOpen,
    corpo: `<div class="grid ${grande ? 'g3' : 'g2'}">${campos(lista, obj)}</div>${extra}`,
    acoes: [{ label: 'Cancelar', valor: null }, {
      label: salvarLabel, cls: 'neon', onClick: (b) => {
        const d = lerForm(b);
        const falt = lista.filter(c => c.req && !d[c.k]);
        if (falt.length) { toast('Preencha: ' + falt.map(f => f.l).join(', '), true); return false; }
        return d;
      },
    }],
  });
}

// ---------- abas ----------
export function tabs(lista, ativa) {
  return `<div class="tabs" role="tablist">${lista.map(([id, label]) => `<button data-tab="${id}" class="${id === ativa ? 'on' : ''}">${label}</button>`).join('')}</div>`;
}

// ---------- Kanban genérico (drag & drop + seletor "mover para") ----------
export function kanban(el, { colunas, itens, campo: cmp, card, onMove, onOpen, cor }) {
  el.innerHTML = `<div class="kanban">${colunas.map(c => {
    const lista = itens.filter(i => (i[cmp] || colunas[0].id) === c.id);
    return `<section class="kcol" data-col="${c.id}">
      <header><div class="row" style="gap:8px"><span class="bar" style="background:${c.cor || cor || 'var(--lime)'}"></span><b>${esc(c.titulo)}</b></div><span class="badge n">${lista.length}</span></header>
      <div class="klist">${lista.map(i => `<article class="kcard" draggable="true" data-id="${i.id}">
        ${card(i)}
        <div class="kf"><span></span><select class="mv" data-mv="${i.id}" aria-label="Mover para">${colunas.map(o => `<option value="${o.id}" ${o.id === c.id ? 'selected' : ''}>${esc(o.titulo)}</option>`).join('')}</select></div>
      </article>`).join('') || '<div class="faint small" style="text-align:center;padding:14px 0">—</div>'}</div></section>`;
  }).join('')}</div>`;
  let arrastando = null;
  el.querySelectorAll('.kcard').forEach(k => {
    k.addEventListener('dragstart', (e) => { arrastando = k.dataset.id; k.classList.add('drag'); e.dataTransfer.effectAllowed = 'move'; });
    k.addEventListener('dragend', () => k.classList.remove('drag'));
    k.addEventListener('click', (e) => { if (e.target.closest('select,button,a,input')) return; onOpen?.(itens.find(i => i.id === k.dataset.id)); });
  });
  el.querySelectorAll('.kcol').forEach(col => {
    col.addEventListener('dragover', (e) => { e.preventDefault(); col.classList.add('over'); });
    col.addEventListener('dragleave', () => col.classList.remove('over'));
    col.addEventListener('drop', async (e) => {
      e.preventDefault(); col.classList.remove('over');
      const it = itens.find(i => i.id === arrastando);
      if (it && (it[cmp] || colunas[0].id) !== col.dataset.col) await mover(it, col.dataset.col);
    });
  });
  el.querySelectorAll('[data-mv]').forEach(s => s.addEventListener('change', async () => {
    const it = itens.find(i => i.id === s.dataset.mv);
    await mover(it, s.value);
  }));
  async function mover(it, para) {
    try { await onMove(it, para); } catch (e) { falha(e); }
  }
}

// ---------- arquivos ----------
export async function uploadArquivo(file, { clienteId = '', pasta = '01', nome } = {}) {
  const q = new URLSearchParams({ clienteId, pasta, nome: nome || file.name });
  return api(`/api/files?${q}`, { method: 'POST', body: file, headers: { 'Content-Type': file.type || 'application/octet-stream' } });
}

export function baixarTexto(nome, conteudo, tipo = 'text/plain;charset=utf-8') {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([conteudo], { type: tipo }));
  a.download = nome;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

export function csvParse(texto) {
  const linhas = [];
  const sep = (texto.split('\n')[0].match(/;/g) || []).length >= (texto.split('\n')[0].match(/,/g) || []).length ? ';' : ',';
  let cur = [], campo = '', aspas = false;
  for (let i = 0; i < texto.length; i++) {
    const ch = texto[i];
    if (aspas) {
      if (ch === '"' && texto[i + 1] === '"') { campo += '"'; i++; }
      else if (ch === '"') aspas = false;
      else campo += ch;
    } else if (ch === '"') aspas = true;
    else if (ch === sep) { cur.push(campo); campo = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && texto[i + 1] === '\n') i++;
      cur.push(campo); campo = '';
      if (cur.some(c => c.trim())) linhas.push(cur);
      cur = [];
    } else campo += ch;
  }
  cur.push(campo);
  if (cur.some(c => c.trim())) linhas.push(cur);
  return linhas;
}
export function csvGerar(linhas) {
  return '﻿' + linhas.map(l => l.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(';')).join('\r\n');
}

export function nomeUsuarios(users) { return users.filter(u => u.ativo).map(u => u.nome); }
export async function usuarios() {
  if (!state.cache._users) state.cache._users = await api('/api/users');
  return state.cache._users;
}
