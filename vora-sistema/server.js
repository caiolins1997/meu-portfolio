import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { pipeline } from 'node:stream/promises';
import {
  db, DATA_DIR, UPLOAD_DIR, uid, agora, hashSenha, conferirSenha, listar, obter, criar, atualizar, remover,
  registrarLog, transacao, getConfig, seed,
  agendarBackup,
} from './server/db.js';
import { processarRpi, baixarRpi, extrairXmlDoZip, agendarVigilancia } from './server/rpi.js';
import { apenasDigitos } from './public/js/lib/texto.js';

const PORT = Number(process.env.PORT || 3000);
const PROD = process.env.NODE_ENV === 'production';
// Sistema interno em vorapi.com.br/admin; formulário público em vorapi.com.br/formulario.
const BASE = '/admin';
const app = express();
const r = express.Router();
app.set('trust proxy', 1);
app.disable('x-powered-by');

// ---------- segurança básica ----------
app.use((req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-Frame-Options': 'SAMEORIGIN',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Content-Security-Policy': [
      "default-src 'self'",
      "script-src 'self'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob:",
      "connect-src 'self' https://brasilapi.com.br",
      "frame-ancestors 'self'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),
  });
  if (PROD) res.set('Strict-Transport-Security', 'max-age=31536000');
  next();
});

const limites = new Map();
function limitar(chave, max, janelaMs) {
  const t = Date.now();
  const arr = (limites.get(chave) || []).filter(x => t - x < janelaMs);
  arr.push(t);
  limites.set(chave, arr);
  return arr.length > max;
}

// ---------- sessão ----------
const COOKIE = 'vora_sid';
const lerCookie = (req, nome) => {
  const m = (req.headers.cookie || '').split(/;\s*/).find(c => c.startsWith(nome + '='));
  return m ? decodeURIComponent(m.slice(nome.length + 1)) : null;
};
function usuarioDaSessao(req) {
  const tok = lerCookie(req, COOKIE);
  if (!tok) return null;
  const s = db.prepare('SELECT u.id, u.nome, u.email, u.papel, u.ativo, s.expira_em FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ?').get(tok);
  if (!s || s.expira_em < Date.now() || !s.ativo) return null;
  return { id: s.id, nome: s.nome, email: s.email, papel: s.papel };
}
const auth = (req, res, next) => {
  const u = usuarioDaSessao(req);
  if (!u) return res.status(401).json({ erro: 'Sessão expirada. Faça login novamente.' });
  req.user = u;
  next();
};
const soAdmin = (req, res, next) => req.user?.papel === 'admin' ? next() : res.status(403).json({ erro: 'Apenas o administrador (Caio) pode realizar esta ação.' });

const json = express.json({ limit: '6mb' });

r.post('/api/login', json, (req, res) => {
  const ip = req.ip;
  if (limitar('login:' + ip, 10, 15 * 60 * 1000)) return res.status(429).json({ erro: 'Muitas tentativas. Aguarde 15 minutos.' });
  const { email, senha } = req.body || {};
  const u = db.prepare('SELECT * FROM users WHERE email = ? AND ativo = 1').get(String(email || '').toLowerCase().trim());
  if (!u || !conferirSenha(String(senha || ''), u.senha_hash)) return res.status(401).json({ erro: 'E-mail ou senha inválidos.' });
  const token = crypto.randomBytes(32).toString('hex');
  const dias = 30;
  db.prepare('INSERT INTO sessions (token, user_id, expira_em) VALUES (?,?,?)').run(token, u.id, Date.now() + dias * 86400000);
  db.prepare('DELETE FROM sessions WHERE expira_em < ?').run(Date.now());
  res.setHeader('Set-Cookie', `${COOKIE}=${token}; Path=${BASE}; HttpOnly; SameSite=Lax; Max-Age=${dias * 86400}${PROD ? '; Secure' : ''}`);
  registrarLog(u.email, 'login', 'users', String(u.id));
  res.json({ id: u.id, nome: u.nome, email: u.email, papel: u.papel });
});
r.post('/api/logout', (req, res) => {
  const tok = lerCookie(req, COOKIE);
  if (tok) db.prepare('DELETE FROM sessions WHERE token = ?').run(tok);
  res.setHeader('Set-Cookie', `${COOKIE}=; Path=${BASE}; HttpOnly; SameSite=Lax; Max-Age=0`);
  res.json({ ok: true });
});
r.get('/api/me', auth, (req, res) => res.json(req.user));
r.post('/api/me/senha', auth, json, (req, res) => {
  const { atual, nova } = req.body || {};
  const u = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!conferirSenha(String(atual || ''), u.senha_hash)) return res.status(400).json({ erro: 'Senha atual incorreta.' });
  if (String(nova || '').length < 8) return res.status(400).json({ erro: 'A nova senha precisa ter ao menos 8 caracteres.' });
  db.prepare('UPDATE users SET senha_hash = ? WHERE id = ?').run(hashSenha(nova), u.id);
  try { fs.unlinkSync(path.join(DATA_DIR, 'SENHA_INICIAL_ADMIN.txt')); } catch { /* já removido */ }
  res.json({ ok: true });
});

// ---------- usuários (admin) ----------
r.get('/api/users', auth, (req, res) => {
  res.json(db.prepare('SELECT id, nome, email, papel, ativo, criado_em FROM users ORDER BY id').all());
});
r.post('/api/users', auth, soAdmin, json, (req, res) => {
  const { nome, email, senha, papel } = req.body || {};
  if (!nome || !email || String(senha || '').length < 8) return res.status(400).json({ erro: 'Informe nome, e-mail e senha (mín. 8 caracteres).' });
  try {
    const r = db.prepare('INSERT INTO users (nome, email, senha_hash, papel) VALUES (?,?,?,?)')
      .run(nome, String(email).toLowerCase().trim(), hashSenha(senha), papel === 'admin' ? 'admin' : 'colaborador');
    registrarLog(req.user.email, 'criar', 'users', String(r.lastInsertRowid), email);
    res.json({ id: Number(r.lastInsertRowid) });
  } catch { res.status(400).json({ erro: 'E-mail já cadastrado.' }); }
});
r.put('/api/users/:id', auth, soAdmin, json, (req, res) => {
  const { nome, papel, ativo, senha } = req.body || {};
  const u = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!u) return res.status(404).json({ erro: 'Usuário não encontrado.' });
  if (u.id === req.user.id && (ativo === false || papel === 'colaborador')) return res.status(400).json({ erro: 'Você não pode remover seu próprio acesso de administrador.' });
  db.prepare('UPDATE users SET nome = ?, papel = ?, ativo = ? WHERE id = ?').run(nome ?? u.nome, papel ?? u.papel, ativo === undefined ? u.ativo : (ativo ? 1 : 0), u.id);
  if (senha) {
    if (String(senha).length < 8) return res.status(400).json({ erro: 'Senha muito curta.' });
    db.prepare('UPDATE users SET senha_hash = ? WHERE id = ?').run(hashSenha(senha), u.id);
    db.prepare('DELETE FROM sessions WHERE user_id = ?').run(u.id);
  }
  if (ativo === false) db.prepare('DELETE FROM sessions WHERE user_id = ?').run(u.id);
  res.json({ ok: true });
});

// ---------- coleções genéricas ----------
const COLS = {
  clientes: {}, analises: {}, processos: {}, prazos: {}, colidencias: {}, rpis: { somenteLeitura: true },
  prospects: { colabRemove: true }, posts: { colabRemove: true }, polos: { colabRemove: true }, parceiros: { colabRemove: true },
  vendas: {}, despesas: { adminEscreve: true }, servicos: { adminEscreve: true }, mensagens: { colabRemove: true }, tarefas: { colabRemove: true },
  modelos: { adminEscreve: true }, config: { adminEscreve: true },
};
const colValida = (req, res, next) => {
  const c = COLS[req.params.col];
  if (!c) return res.status(404).json({ erro: 'Coleção inexistente.' });
  req.colCfg = c;
  next();
};
const podeEscrever = (req, res) => {
  if (req.colCfg.somenteLeitura && req.method !== 'DELETE') { res.status(403).json({ erro: 'Coleção somente leitura.' }); return false; }
  if (req.colCfg.adminEscreve && req.user.papel !== 'admin') { res.status(403).json({ erro: 'Apenas o administrador pode alterar este cadastro.' }); return false; }
  return true;
};

// Regras de negócio (D4 e D6) aplicadas também no servidor.
function validarRegras(col, antigo, novo, user) {
  if (col === 'analises' && novo.status === 'aprovado' && antigo?.status !== 'aprovado') {
    if (user.papel !== 'admin') return 'Somente Caio aprova o parecer para envio (Decisão D4).';
    novo.aprovadoPor = user.nome; novo.aprovadoEm = agora();
  }
  if (col === 'clientes' && novo.etapa === 'protocolado' && antigo?.etapa !== 'protocolado')
    return 'Use o botão "Registrar protocolo" no cadastro do cliente (exclusivo de Caio, com checklist e trava da GRU).';
  if (col === 'config' && (novo.id || antigo?.id) !== 'principal') return 'Configuração inválida.';
  return null;
}

export function pendenciasChecklist(c) {
  const ck = c.checklist || {};
  const falta = [];
  const itens = {
    c1: 'Relatório Cadastral (CNAEs conferidos) e Análise de Viabilidade aprovada',
    c2: 'Contrato assinado digitalmente', c3: 'Procuração INPI assinada', c4: 'Documentos do titular',
    c5: 'GRU emitida no CPF/CNPJ do titular', c7: 'Comprovante de honorários (Asaas)',
  };
  for (const [k, v] of Object.entries(itens)) if (!ck[k]) falta.push(v);
  const g = c.gru || {};
  if (!ck.c6 || g.status !== 'compensada' || !g.liquidadaEm) falta.push('GRU com quitação EFETIVA comprovada (data/hora da liquidação) — agendamento não é aceito');
  else if (new Date(g.liquidadaEm) > new Date()) falta.push('A data/hora de liquidação da GRU está no futuro (parece agendamento)');
  if (String(c.apresentacao || '').toLowerCase() === 'mista' && !ck.c8) falta.push('Logomarca validada no padrão INPI');
  if (c.termoRiscoAplicavel && !ck.c9) falta.push('Termo de Ciência de Risco assinado');
  return falta;
}

r.get('/api/c/:col', auth, colValida, (req, res) => res.json(listar(req.params.col, req.query)));
r.get('/api/c/:col/:id', auth, colValida, (req, res) => {
  const d = obter(req.params.col, req.params.id);
  d ? res.json(d) : res.status(404).json({ erro: 'Não encontrado.' });
});
r.post('/api/c/:col', auth, colValida, json, (req, res) => {
  if (!podeEscrever(req, res)) return;
  const dados = req.body || {};
  const erro = validarRegras(req.params.col, null, dados, req.user);
  if (erro) return res.status(403).json({ erro });
  const d = criar(req.params.col, dados, req.user.nome);
  registrarLog(req.user.email, 'criar', req.params.col, d.id, d.marca || d.nome || d.titulo || '');
  res.json(d);
});
r.post('/api/c/:col/bulk', auth, colValida, express.json({ limit: '30mb' }), (req, res) => {
  if (!podeEscrever(req, res)) return;
  const itens = Array.isArray(req.body?.itens) ? req.body.itens : [];
  if (itens.length > 20000) return res.status(400).json({ erro: 'Máximo de 20.000 itens por importação.' });
  const n = transacao(() => { itens.forEach(i => criar(req.params.col, i, req.user.nome)); return itens.length; });
  registrarLog(req.user.email, 'importar', req.params.col, '', `${n} itens`);
  res.json({ criados: n });
});
r.put('/api/c/:col/:id', auth, colValida, json, (req, res) => {
  if (!podeEscrever(req, res)) return;
  const antigo = obter(req.params.col, req.params.id);
  if (!antigo) {
    if (req.params.col === 'config') return res.json(atualizar('config', getConfig().id, req.body, req.user.nome));
    return res.status(404).json({ erro: 'Não encontrado.' });
  }
  const novo = { ...antigo, ...req.body };
  const erro = validarRegras(req.params.col, antigo, novo, req.user);
  if (erro) return res.status(403).json({ erro });
  const d = atualizar(req.params.col, req.params.id, novo, req.user.nome);
  registrarLog(req.user.email, 'atualizar', req.params.col, d.id, Object.keys(req.body || {}).join(','));
  res.json(d);
});
r.delete('/api/c/:col/:id', auth, colValida, (req, res) => {
  if (req.user.papel !== 'admin' && !req.colCfg.colabRemove) return res.status(403).json({ erro: 'Apenas o administrador pode excluir este registro.' });
  remover(req.params.col, req.params.id);
  registrarLog(req.user.email, 'excluir', req.params.col, req.params.id);
  res.json({ ok: true });
});
r.post('/api/c/:col/bulk-update', auth, colValida, express.json({ limit: '30mb' }), (req, res) => {
  if (!podeEscrever(req, res)) return;
  if (['analises', 'clientes', 'config'].includes(req.params.col)) return res.status(400).json({ erro: 'Atualização em lote não permitida nesta coleção.' });
  const itens = Array.isArray(req.body?.itens) ? req.body.itens : [];
  const n = transacao(() => itens.filter(i => i?.id).map(({ id, ...patch }) => atualizar(req.params.col, id, patch, req.user.nome)).filter(Boolean).length);
  registrarLog(req.user.email, 'atualizar-lote', req.params.col, '', `${n} itens`);
  res.json({ atualizados: n });
});
r.post('/api/c/:col/bulk-delete', auth, colValida, json, (req, res) => {
  if (req.user.papel !== 'admin' && !req.colCfg.colabRemove) return res.status(403).json({ erro: 'Sem permissão.' });
  const ids = Array.isArray(req.body?.ids) ? req.body.ids : [];
  transacao(() => ids.forEach(id => remover(req.params.col, id)));
  res.json({ removidos: ids.length });
});

// ---------- protocolo (exclusivo Caio — Item 11 / D6) ----------
r.post('/api/clientes/:id/protocolar', auth, soAdmin, json, (req, res) => {
  const c = obter('clientes', req.params.id);
  if (!c) return res.status(404).json({ erro: 'Cliente não encontrado.' });
  const falta = pendenciasChecklist(c);
  if (falta.length) return res.status(400).json({ erro: 'Checklist pré-protocolo incompleto.', falta });
  const pedidos = Array.isArray(req.body?.pedidos) ? req.body.pedidos : [];
  if (!pedidos.length) return res.status(400).json({ erro: 'Informe ao menos um nº de processo.' });
  for (const p of pedidos) if (apenasDigitos(p.numero).length !== 9) return res.status(400).json({ erro: `Nº de processo inválido: ${p.numero} (deve ter 9 dígitos).` });
  const criados = transacao(() => {
    const out = pedidos.map(p => criar('processos', {
      numero: apenasDigitos(p.numero), marca: c.marca, clienteId: c.id, titular: c.titular || c.nome, classe: p.classe || c.classes || '',
      apresentacao: c.apresentacao || '', dataDeposito: p.dataDeposito || agora().slice(0, 10), fase: 'protocolado', situacao: 'Pedido protocolado',
      despachos: [], monitorar: true, origemCarteira: 'nova', responsavel: c.responsavel || '',
    }, req.user.nome));
    atualizar('clientes', c.id, { etapa: 'protocolado', protocoladoEm: agora(), protocoladoPor: req.user.nome, checklist: { ...(c.checklist || {}), c10: true } }, req.user.nome);
    return out;
  });
  registrarLog(req.user.email, 'protocolar', 'clientes', c.id, pedidos.map(p => p.numero).join(','));
  res.json({ ok: true, processos: criados });
});
r.get('/api/clientes/:id/pendencias', auth, (req, res) => {
  const c = obter('clientes', req.params.id);
  c ? res.json({ falta: pendenciasChecklist(c) }) : res.status(404).json({ erro: 'Não encontrado.' });
});

// ---------- arquivos (pasta do cliente 01–06) ----------
const PASTAS = ['01', '02', '02.1', '03', '04', '05', '06'];
r.post('/api/files', auth, express.raw({ type: '*/*', limit: '25mb' }), (req, res) => {
  const { clienteId = '', pasta = '01', nome = 'arquivo' } = req.query;
  if (!PASTAS.includes(String(pasta))) return res.status(400).json({ erro: 'Pasta inválida.' });
  if (!req.body?.length) return res.status(400).json({ erro: 'Arquivo vazio.' });
  const id = uid();
  fs.writeFileSync(path.join(UPLOAD_DIR, id), req.body);
  const nomeLimpo = String(nome).replace(/[\\/:*?"<>|]+/g, '_').slice(0, 180);
  db.prepare('INSERT INTO files (id, cliente_id, pasta, nome, mime, tamanho, criado_em, criado_por) VALUES (?,?,?,?,?,?,?,?)')
    .run(id, String(clienteId), String(pasta), nomeLimpo, req.headers['content-type'] || 'application/octet-stream', req.body.length, agora(), req.user.nome);
  registrarLog(req.user.email, 'upload', 'files', id, nomeLimpo);
  res.json({ id, nome: nomeLimpo });
});
r.get('/api/files', auth, (req, res) => {
  const rows = req.query.clienteId
    ? db.prepare('SELECT * FROM files WHERE cliente_id = ? ORDER BY pasta, criado_em').all(String(req.query.clienteId))
    : db.prepare('SELECT * FROM files ORDER BY criado_em DESC LIMIT 500').all();
  res.json(rows);
});
r.get('/api/files/:id', auth, (req, res) => {
  const f = db.prepare('SELECT * FROM files WHERE id = ?').get(req.params.id);
  if (!f) return res.status(404).end();
  const inline = /^(image\/|application\/pdf)/.test(f.mime) && req.query.download === undefined;
  res.set('Content-Type', f.mime);
  res.set('Content-Disposition', `${inline ? 'inline' : 'attachment'}; filename*=UTF-8''${encodeURIComponent(f.nome)}`);
  fs.createReadStream(path.join(UPLOAD_DIR, f.id)).pipe(res);
});
r.delete('/api/files/:id', auth, (req, res) => {
  const f = db.prepare('SELECT * FROM files WHERE id = ?').get(req.params.id);
  if (!f) return res.status(404).json({ erro: 'Arquivo não encontrado.' });
  if (req.user.papel !== 'admin' && f.criado_por !== req.user.nome) return res.status(403).json({ erro: 'Apenas quem enviou ou o administrador pode excluir.' });
  db.prepare('DELETE FROM files WHERE id = ?').run(f.id);
  try { fs.unlinkSync(path.join(UPLOAD_DIR, f.id)); } catch { /* arquivo já ausente */ }
  registrarLog(req.user.email, 'excluir', 'files', f.id, f.nome);
  res.json({ ok: true });
});

// ---------- RPI / vigilância ----------
r.post('/api/rpi/upload', auth, async (req, res) => {
  const tmp = path.join(DATA_DIR, `rpi-${uid()}.tmp`);
  try {
    await pipeline(req, fs.createWriteStream(tmp));
    const buf = fs.readFileSync(tmp);
    if (buf.length > 700 * 1024 * 1024) throw new Error('Arquivo muito grande.');
    const xml = buf[0] === 0x50 && buf[1] === 0x4b ? extrairXmlDoZip(buf) : buf.toString('utf8');
    res.json(processarRpi(xml, { origem: 'upload', usuario: req.user.nome }));
  } catch (e) {
    res.status(400).json({ erro: e.message });
  } finally { fs.rm(tmp, { force: true }, () => {}); }
});
r.post('/api/rpi/baixar', auth, json, async (req, res) => {
  const numero = apenasDigitos(req.body?.numero);
  if (numero.length !== 4) return res.status(400).json({ erro: 'Informe o nº da RPI com 4 dígitos.' });
  try {
    const xml = await baixarRpi(numero);
    res.json(processarRpi(xml, { origem: 'download INPI', usuario: req.user.nome }));
  } catch (e) { res.status(400).json({ erro: e.message }); }
});

// ---------- formulário público (Etapa 3) ----------
r.get('/api/public/info', (req, res) => {
  const cfg = getConfig();
  res.json({ nome: cfg.empresa?.nome, whatsapp: cfg.empresa?.whatsapp || '', site: cfg.empresa?.site || 'https://vorapi.com.br' });
});
r.post('/api/public/formulario', json, (req, res) => {
  if (limitar('form:' + req.ip, 8, 60 * 60 * 1000)) return res.status(429).json({ erro: 'Muitos envios. Tente novamente mais tarde.' });
  const b = req.body || {};
  if (b.website) return res.json({ ok: true }); // honeypot anti-spam
  const obrig = ['nome', 'marca', 'email', 'telefone', 'localidade', 'descricao'];
  const falt = obrig.filter(k => !String(b[k] || '').trim());
  if (falt.length) return res.status(400).json({ erro: 'Preencha os campos obrigatórios.', campos: falt });
  if (!b.consentimento) return res.status(400).json({ erro: 'É necessário aceitar o termo de consentimento (LGPD).' });
  if (!/^\S+@\S+\.\S+$/.test(b.email)) return res.status(400).json({ erro: 'E-mail inválido.' });
  const s = v => String(v || '').trim().slice(0, 2000);
  const cliente = criar('clientes', {
    nome: s(b.nome), marca: s(b.marca), temLogo: !!b.temLogo, tempoMarca: s(b.tempoMarca), email: s(b.email).toLowerCase(),
    telefone: s(b.telefone), tipoPessoa: b.tipoPessoa === 'PJ' ? 'PJ' : 'PF', cpfCnpj: apenasDigitos(b.cnpj).slice(0, 14),
    localidade: s(b.localidade), endereco: s(b.endereco), descricao: s(b.descricao), consentimento: true,
    consentimentoEm: agora(), consentimentoIp: req.ip, origem: ['A', 'B', 'C', 'D', 'E'].includes(b.origem) ? b.origem : 'D',
    etapa: 'novo', entrada: 'formulario',
  }, 'Formulário');
  if (b.logo && typeof b.logo === 'string' && b.logo.startsWith('data:image/')) {
    const m = b.logo.match(/^data:(image\/[a-z+]+);base64,(.+)$/);
    if (m) {
      const buf = Buffer.from(m[2], 'base64');
      if (buf.length <= 5 * 1024 * 1024) {
        const id = uid();
        fs.writeFileSync(path.join(UPLOAD_DIR, id), buf);
        const ext = m[1].split('/')[1].replace('jpeg', 'jpg');
        db.prepare('INSERT INTO files (id, cliente_id, pasta, nome, mime, tamanho, criado_em, criado_por) VALUES (?,?,?,?,?,?,?,?)')
          .run(id, cliente.id, '05', `Logo enviada no formulário - ${cliente.marca}.${ext}`, m[1], buf.length, agora(), 'Formulário');
      }
    }
  }
  registrarLog('formulario', 'criar', 'clientes', cliente.id, cliente.marca);
  res.json({ ok: true });
});

// ---------- webhook Asaas (baixa automática de parcelas) ----------
r.post('/api/webhooks/asaas', json, (req, res) => {
  const tokenEsperado = process.env.ASAAS_WEBHOOK_TOKEN;
  if (!tokenEsperado || req.headers['asaas-access-token'] !== tokenEsperado) return res.status(401).end();
  const { event, payment } = req.body || {};
  if (!['PAYMENT_RECEIVED', 'PAYMENT_CONFIRMED'].includes(event) || !payment?.externalReference) return res.json({ ignorado: true });
  const [vendaId, idx] = String(payment.externalReference).split(':');
  const v = obter('vendas', vendaId);
  if (!v) return res.json({ ignorado: true });
  const parcelas = (v.parcelas || []).map((p, i) => i === Number(idx || 0)
    ? { ...p, pago: true, dataPago: payment.paymentDate || payment.clientPaymentDate || agora().slice(0, 10), asaasId: payment.id } : p);
  atualizar('vendas', v.id, { parcelas }, 'Asaas');
  res.json({ ok: true });
});

// ---------- backup e log ----------
r.get('/api/backup', auth, soAdmin, (req, res) => {
  res.set('Content-Disposition', `attachment; filename="vora-backup-${agora().slice(0, 10)}.json"`);
  res.json({ geradoEm: agora(), docs: db.prepare('SELECT * FROM docs').all(), files: db.prepare('SELECT * FROM files').all() });
});
r.get('/api/log', auth, soAdmin, (req, res) => res.json(db.prepare('SELECT * FROM log ORDER BY id DESC LIMIT 400').all()));
r.get('/api/saude', (req, res) => res.json({ ok: true }));

// ---------- front-end ----------
const PUB = path.resolve('public');
const formulario = (req, res) => res.sendFile(path.join(PUB, 'formulario.html'));
app.get('/formulario', formulario);
r.get('/formulario', formulario);
r.use('/api', (req, res) => res.status(404).json({ erro: 'Rota não encontrada.' }));
r.use(express.static(PUB, { maxAge: PROD ? '1h' : 0, index: 'index.html', redirect: false }));
app.use(BASE, (req, res, next) => (req.originalUrl === BASE ? res.redirect(301, BASE + '/') : next()));
app.use(BASE, r);
app.get('/', (req, res) => res.redirect(BASE + '/'));
app.use((err, req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ erro: err.type === 'entity.too.large' ? 'Arquivo grande demais.' : 'Erro interno.' });
});

seed();
agendarVigilancia();
agendarBackup();
app.listen(PORT, () => console.log(`Vora Sistema rodando na porta ${PORT}`));
