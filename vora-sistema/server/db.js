import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { MENSAGENS, SERVICOS, CONFIG, POSTS_IDEIAS } from '../public/js/lib/seeds.js';

export const DATA_DIR = process.env.DATA_DIR || path.resolve('data');
export const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

export const db = new DatabaseSync(path.join(DATA_DIR, 'vora.db'));
db.exec(`
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  senha_hash TEXT NOT NULL,
  papel TEXT NOT NULL DEFAULT 'colaborador',
  ativo INTEGER NOT NULL DEFAULT 1,
  criado_em TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expira_em INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS docs (
  id TEXT PRIMARY KEY,
  col TEXT NOT NULL,
  data TEXT NOT NULL,
  criado_em TEXT NOT NULL,
  atualizado_em TEXT NOT NULL,
  criado_por TEXT,
  atualizado_por TEXT
);
CREATE INDEX IF NOT EXISTS docs_col ON docs(col);
CREATE TABLE IF NOT EXISTS files (
  id TEXT PRIMARY KEY,
  cliente_id TEXT,
  pasta TEXT,
  nome TEXT NOT NULL,
  mime TEXT,
  tamanho INTEGER,
  criado_em TEXT NOT NULL,
  criado_por TEXT
);
CREATE INDEX IF NOT EXISTS files_cliente ON files(cliente_id);
CREATE TABLE IF NOT EXISTS log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  em TEXT NOT NULL DEFAULT (datetime('now')),
  usuario TEXT,
  acao TEXT,
  col TEXT,
  doc_id TEXT,
  resumo TEXT
);
`);

export const uid = () => crypto.randomBytes(9).toString('base64url');
export const agora = () => new Date().toISOString();

export function hashSenha(senha) {
  const salt = crypto.randomBytes(16).toString('hex');
  const h = crypto.scryptSync(senha, salt, 64).toString('hex');
  return `${salt}:${h}`;
}
export function conferirSenha(senha, hash) {
  const [salt, h] = String(hash).split(':');
  if (!salt || !h) return false;
  const calc = crypto.scryptSync(senha, salt, 64);
  return crypto.timingSafeEqual(calc, Buffer.from(h, 'hex'));
}

// ---------- documentos genéricos ----------
const rowToDoc = r => r && ({ ...JSON.parse(r.data), id: r.id, _criado: r.criado_em, _atualizado: r.atualizado_em, _por: r.atualizado_por });

export function listar(col, filtros = {}) {
  let sql = 'SELECT * FROM docs WHERE col = ?';
  const args = [col];
  for (const [k, v] of Object.entries(filtros)) {
    if (!/^[a-zA-Z_]\w*$/.test(k)) continue;
    sql += ` AND json_extract(data, '$.${k}') = ?`;
    args.push(v);
  }
  sql += ' ORDER BY criado_em DESC';
  return db.prepare(sql).all(...args).map(rowToDoc);
}
export function obter(col, id) {
  return rowToDoc(db.prepare('SELECT * FROM docs WHERE col = ? AND id = ?').get(col, id));
}
export function criar(col, data, usuario = 'sistema') {
  const id = data.id && /^[\w-]{4,40}$/.test(data.id) ? data.id : uid();
  const { id: _i, _criado, _atualizado, _por, ...limpo } = data;
  const t = agora();
  db.prepare('INSERT INTO docs (id, col, data, criado_em, atualizado_em, criado_por, atualizado_por) VALUES (?,?,?,?,?,?,?)')
    .run(id, col, JSON.stringify(limpo), t, t, usuario, usuario);
  return obter(col, id);
}
export function atualizar(col, id, patch, usuario = 'sistema') {
  const atual = obter(col, id);
  if (!atual) return null;
  const { id: _i, _criado, _atualizado, _por, ...base } = { ...atual, ...patch };
  db.prepare('UPDATE docs SET data = ?, atualizado_em = ?, atualizado_por = ? WHERE col = ? AND id = ?')
    .run(JSON.stringify(base), agora(), usuario, col, id);
  return obter(col, id);
}
export function remover(col, id) {
  return db.prepare('DELETE FROM docs WHERE col = ? AND id = ?').run(col, id).changes > 0;
}
export function registrarLog(usuario, acao, col, docId, resumo = '') {
  db.prepare('INSERT INTO log (usuario, acao, col, doc_id, resumo) VALUES (?,?,?,?,?)').run(usuario, acao, col, docId, String(resumo).slice(0, 300));
}
export function transacao(fn) {
  db.exec('BEGIN');
  try { const r = fn(); db.exec('COMMIT'); return r; } catch (e) { db.exec('ROLLBACK'); throw e; }
}

// ---------- configuração (documento único) ----------
export function getConfig() {
  return obter('config', 'principal') || criar('config', { id: 'principal', ...CONFIG });
}

// Preenche só os campos da empresa que estiverem vazios (nunca sobrescreve o que foi salvo na tela de Configurações).
function completarConfig() {
  const cfg = getConfig();
  const empresa = { ...(cfg.empresa || {}) };
  let mudou = false;
  for (const [k, v] of Object.entries(CONFIG.empresa)) if (v && !empresa[k]) { empresa[k] = v; mudou = true; }
  const patch = { empresa };
  if (!cfg.linkFormulario && CONFIG.linkFormulario) { patch.linkFormulario = CONFIG.linkFormulario; mudou = true; }
  if (mudou) atualizar('config', 'principal', patch);
}

// ---------- seed ----------
export function seed() {
  const n = db.prepare('SELECT COUNT(*) AS n FROM users').get().n;
  let senhaInicial = null;
  if (n === 0) {
    const email = (process.env.ADMIN_EMAIL || 'caio@vorapi.com.br').toLowerCase();
    senhaInicial = process.env.ADMIN_PASSWORD || crypto.randomBytes(9).toString('base64url');
    db.prepare('INSERT INTO users (nome, email, senha_hash, papel) VALUES (?,?,?,?)')
      .run('Caio Lins', email, hashSenha(senhaInicial), 'admin');
    fs.writeFileSync(path.join(DATA_DIR, 'SENHA_INICIAL_ADMIN.txt'), `Usuário: ${email}\nSenha: ${senhaInicial}\nTroque a senha no primeiro acesso.\n`);
    console.log(`[seed] admin criado: ${email} (senha em ${DATA_DIR}/SENHA_INICIAL_ADMIN.txt)`);
  }
  completarConfig();
  if (!listar('mensagens').length) transacao(() => MENSAGENS.forEach(m => criar('mensagens', m)));
  if (!listar('servicos').length) transacao(() => SERVICOS.forEach(s => criar('servicos', s)));
  if (!listar('posts').length) {
    const hoje = new Date();
    transacao(() => POSTS_IDEIAS.forEach((p, i) => {
      const d = new Date(hoje); d.setDate(d.getDate() + i * 2 + 1);
      criar('posts', { ...p, data: d.toISOString().slice(0, 10), status: 'ideia', legenda: '' });
    }));
  }
  return senhaInicial;
}

// ---------- cópia de segurança automática ----------
// Uma cópia consistente do banco por dia em /data/backups (mantém as 14 mais recentes).
// Os arquivos enviados (uploads) ficam no mesmo volume; para cópia fora da VPS, use o botão de backup em Configurações.
export const BACKUP_DIR = path.join(DATA_DIR, 'backups');
export function backupDiario() {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const dia = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Maceio' });
  const destino = path.join(BACKUP_DIR, `vora-${dia}.db`);
  if (!fs.existsSync(destino)) {
    db.exec(`VACUUM INTO '${destino.replace(/'/g, "''")}'`);
    console.log(`[backup] ${destino}`);
  }
  const antigos = fs.readdirSync(BACKUP_DIR).filter(f => /^vora-\d{4}-\d{2}-\d{2}\.db$/.test(f)).sort().reverse().slice(14);
  for (const f of antigos) fs.rmSync(path.join(BACKUP_DIR, f), { force: true });
}
export function agendarBackup() {
  const tick = () => { try { backupDiario(); } catch (e) { console.error('[backup] falhou:', e.message); } };
  setTimeout(tick, 60 * 1000);
  setInterval(tick, 60 * 60 * 1000);
}
