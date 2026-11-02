// Leitura da RPI (Seção V — Marcas) em XML e vigilância automática.
// Fluxo: XML -> processos publicados -> (a) atualiza processos da carteira Vora + gera prazos
//                                       (b) detecta colidências com as marcas monitoradas.
import zlib from 'node:zlib';
import { listar, criar, atualizar, getConfig, transacao, registrarLog } from './db.js';
import { similaridade, dobrar, classesAfins } from '../public/js/lib/texto.js';
import { calcularPrazo, regraPorDespacho, faseDoDespacho, REGRAS_PADRAO, CODIGOS_OPOSICAO, parseData, iso } from '../public/js/lib/prazos.js';

const attr = (tag, nome) => {
  const m = tag.match(new RegExp(`${nome}="([^"]*)"`));
  return m ? decodeXml(m[1]) : '';
};
const decodeXml = s => String(s)
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'")
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&amp;/g, '&');
const texto = (bloco, tag) => {
  const m = bloco.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`));
  return m ? decodeXml(m[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()) : '';
};

export function parseRpiXml(xml) {
  const cab = xml.match(/<revista[^>]*>/);
  const revista = { numero: cab ? attr(cab[0], 'numero') : '', data: cab ? attr(cab[0], 'data') : '' };
  const processos = [];
  const re = /<processo\b([^>]*)>([\s\S]*?)<\/processo>/g;
  let m;
  while ((m = re.exec(xml))) {
    const a = m[1], b = m[2];
    const despachos = [];
    const rd = /<despacho\b([^>]*?)(?:\/>|>([\s\S]*?)<\/despacho>)/g;
    let d;
    while ((d = rd.exec(b))) despachos.push({ codigo: attr(d[1], 'codigo'), nome: attr(d[1], 'nome'), complemento: d[2] ? texto(`<x>${d[2]}</x>`, 'x') : '' });
    const marcaTag = b.match(/<marca\b[^>]*>/);
    const classes = [...b.matchAll(/<classe-nice\b[^>]*codigo="([^"]*)"/g)].map(x => x[1]);
    const titulares = [...b.matchAll(/<titular\b[^>]*>/g)].map(x => attr(x[0], 'nome-razao-social')).filter(Boolean);
    processos.push({
      numero: attr(a, 'numero'),
      deposito: attr(a, 'data-deposito'),
      concessao: attr(a, 'data-concessao'),
      vigencia: attr(a, 'data-vigencia'),
      marca: texto(b, 'nome'),
      apresentacao: marcaTag ? attr(marcaTag[0], 'apresentacao') : '',
      natureza: marcaTag ? attr(marcaTag[0], 'natureza') : '',
      classes,
      especificacao: texto(b, 'especificacao').slice(0, 600),
      titulares,
      procurador: texto(b, 'procurador'),
      despachos,
    });
  }
  return { revista, processos };
}

// Extrai o primeiro .xml de um arquivo ZIP (sem dependências).
export function extrairXmlDoZip(buf) {
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 70000); i--) if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) throw new Error('ZIP inválido');
  const total = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  for (let i = 0; i < total; i++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) break;
    const metodo = buf.readUInt16LE(p + 10), comp = buf.readUInt32LE(p + 20);
    const nl = buf.readUInt16LE(p + 28), el = buf.readUInt16LE(p + 30), cl = buf.readUInt16LE(p + 32);
    const local = buf.readUInt32LE(p + 42);
    const nome = buf.slice(p + 46, p + 46 + nl).toString();
    if (/\.xml$/i.test(nome)) {
      const lnl = buf.readUInt16LE(local + 26), lel = buf.readUInt16LE(local + 28);
      const ini = local + 30 + lnl + lel;
      const dados = buf.slice(ini, ini + comp);
      return (metodo === 0 ? dados : zlib.inflateRawSync(dados)).toString('utf8');
    }
    p += 46 + nl + el + cl;
  }
  throw new Error('Nenhum XML encontrado no ZIP');
}

export async function baixarRpi(numero) {
  const url = `https://revistas.inpi.gov.br/txt/RM${numero}.zip`;
  const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (VoraPI vigilancia)' } });
  if (!r.ok) throw new Error(`RPI ${numero} indisponível (HTTP ${r.status})`);
  return extrairXmlDoZip(Buffer.from(await r.arrayBuffer()));
}

// Marcas defendidas pela Vora = processos da carteira (monitorar != false) + clientes com marca.
function marcasMonitoradas() {
  const lista = [];
  for (const p of listar('processos')) if (p.monitorar !== false && p.marca && p.fase !== 'arquivado')
    lista.push({ marca: p.marca, processoId: p.id, clienteId: p.clienteId || '', numero: p.numero || '', classes: String(p.classe || '').split(/[,;\s]+/).filter(Boolean) });
  for (const c of listar('clientes')) if (c.marca && c.monitorar !== false && !['perdido'].includes(c.etapa))
    if (!lista.some(l => dobrar(l.marca) === dobrar(c.marca))) lista.push({ marca: c.marca, clienteId: c.id, classes: (c.classes || '').split(/[,;\s]+/).filter(Boolean) });
  return lista;
}

export function processarRpi(xml, { origem = 'upload', usuario = 'sistema' } = {}) {
  const cfg = getConfig();
  const regras = cfg.regrasPrazo || REGRAS_PADRAO;
  const extras = cfg.feriadosExtras || [];
  const limiar = Number(cfg.vigilancia?.limiarScore || 75);
  const { revista, processos } = parseRpiXml(xml);
  if (!processos.length) throw new Error('Nenhum processo encontrado no XML (confira se é a Seção V — Marcas).');
  const numeroRpi = revista.numero;
  const dataRpi = iso(parseData(revista.data) || new Date());
  const carteira = listar('processos');
  const porNumero = new Map(carteira.filter(p => p.numero).map(p => [String(p.numero), p]));
  const monitoradas = marcasMonitoradas();
  const jaColid = new Set(listar('colidencias').map(c => `${c.rpi}|${c.processoTerceiro}|${c.marcaCliente}`));
  const res = { rpi: numeroRpi, data: dataRpi, totalProcessos: processos.length, publicacoesOposicao: 0, atualizacoes: 0, prazosCriados: 0, colidencias: 0 };

  transacao(() => {
    for (const pr of processos) {
      const proprio = porNumero.get(String(pr.numero));
      // (a) processos da carteira Vora
      if (proprio) {
        const hist = proprio.despachos || [];
        let mudou = false;
        for (const d of pr.despachos) {
          if (hist.some(h => h.rpi === numeroRpi && h.codigo === d.codigo)) continue;
          hist.push({ rpi: numeroRpi, data: dataRpi, codigo: d.codigo, despacho: d.nome, complemento: d.complemento });
          mudou = true;
          const regra = regraPorDespacho(`${d.nome} ${d.complemento}`, regras, 'proprio', d.codigo);
          if (regra) {
            criar('prazos', {
              processoId: proprio.id, clienteId: proprio.clienteId || '', numero: pr.numero, marca: proprio.marca,
              tipo: regra.id, tipoNome: regra.nome, rpi: numeroRpi, dataPublicacao: dataRpi, dias: regra.dias,
              dataFatal: regra.dias ? calcularPrazo(dataRpi, regra.dias, extras) : '', despacho: d.nome, status: 'revisar', responsavel: '', origem: 'RPI automática',
            }, usuario);
            res.prazosCriados++;
          }
        }
        if (mudou) {
          const ultimo = pr.despachos[pr.despachos.length - 1];
          const fase = pr.despachos.reduce((f, d) => faseDoDespacho(d.nome, d.codigo) || f, proprio.fase);
          atualizar('processos', proprio.id, { despachos: hist, situacao: ultimo?.nome || proprio.situacao, fase, ultimaRpi: numeroRpi, atualizacaoPendente: true }, usuario);
          res.atualizacoes++;
        }
        continue;
      }
      // (b) vigilância: pedidos de terceiros publicados para oposição
      const pubOpos = pr.despachos.some(d => CODIGOS_OPOSICAO.includes(d.codigo) || /publica[cç][aã]o de pedido.*oposi/i.test(d.nome));
      if (!pubOpos || !pr.marca) continue;
      res.publicacoesOposicao++;
      for (const mm of monitoradas) {
        const s = similaridade(mm.marca, pr.marca);
        if (s.score < limiar) continue;
        // princípio da especialidade: com classes conhecidas, só alerta em classe igual/afim (ou marca idêntica)
        const relacoes = mm.classes.length ? pr.classes.flatMap(c => mm.classes.map(k => classesAfins(k, c))) : [];
        const relacao = relacoes.includes('mesma') ? 'mesma' : relacoes.includes('afim') ? 'afim' : null;
        if (mm.classes.length && pr.classes.length && !relacao && s.score < 100) continue;
        const chave = `${numeroRpi}|${pr.numero}|${mm.marca}`;
        if (jaColid.has(chave)) continue;
        jaColid.add(chave);
        const mesmaClasse = mm.classes.length ? relacao === 'mesma' : null;
        criar('colidencias', {
          rpi: numeroRpi, dataRpi, processoTerceiro: pr.numero, marcaTerceiro: pr.marca, apresentacao: pr.apresentacao,
          classes: pr.classes.join(', '), especificacao: pr.especificacao, titular: pr.titulares.join('; '), procurador: pr.procurador,
          despacho: pr.despachos.map(d => d.nome).join(' | '), marcaCliente: mm.marca, clienteId: mm.clienteId, processoId: mm.processoId || '',
          score: s.score, motivo: s.motivo, mesmaClasse, classeAfim: relacao === 'afim', prazoOposicao: calcularPrazo(dataRpi, 60, extras), status: 'detectada',
        }, usuario);
        res.colidencias++;
      }
    }
    const registro = { numero: numeroRpi, data: dataRpi, ...res, origem, processadoEm: new Date().toISOString() };
    const anterior = listar('rpis', { numero: numeroRpi })[0];
    if (anterior) atualizar('rpis', anterior.id, { ...registro, colidencias: anterior.colidencias + res.colidencias, atualizacoes: anterior.atualizacoes + res.atualizacoes, prazosCriados: anterior.prazosCriados + res.prazosCriados }, usuario);
    else criar('rpis', registro, usuario);
    const ult = Number(cfg.vigilancia?.ultimaRpi || 0);
    if (Number(numeroRpi) > ult) atualizar('config', 'principal', { vigilancia: { ...cfg.vigilancia, ultimaRpi: numeroRpi } }, usuario);
  });
  registrarLog(usuario, 'rpi', 'rpis', numeroRpi, JSON.stringify(res));
  return res;
}

// Rotina automática: toda terça (após 10h, horário de Brasília) tenta baixar a próxima RPI.
export function agendarVigilancia() {
  const tick = async () => {
    try {
      const cfg = getConfig();
      if (!cfg.vigilancia?.autoRpi || !cfg.vigilancia?.ultimaRpi) return;
      const agoraBr = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Maceio' }));
      if (agoraBr.getDay() < 2 || agoraBr.getHours() < 10) return; // de terça em diante
      const prox = String(Number(cfg.vigilancia.ultimaRpi) + 1);
      if (listar('rpis').some(r => r.numero === prox)) return;
      const ultimaProc = listar('rpis').find(r => r.numero === cfg.vigilancia.ultimaRpi);
      if (ultimaProc && (Date.now() - new Date(ultimaProc.processadoEm)) < 5 * 86400000) return;
      const xml = await baixarRpi(prox);
      const r = processarRpi(xml, { origem: 'automática' });
      console.log('[vigilancia] RPI processada', r);
    } catch (e) { console.log('[vigilancia]', e.message); }
  };
  setTimeout(tick, 30000);
  setInterval(tick, 60 * 60 * 1000);
}
