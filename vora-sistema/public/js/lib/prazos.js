// Contagem de prazos do INPI (compartilhado navegador/servidor).
// LPI Art. 221 (prazos contínuos) e Art. 222 (exclui o dia do começo e inclui o do vencimento).
// Vencimento em dia sem expediente prorroga para o 1º dia útil seguinte.
// ATENÇÃO: os prazos gerados entram como "a revisar" e devem ser conferidos pela equipe.
//
// As regras usam primeiro os CÓDIGOS de despacho da RPI (IPASxxx), calibrados com a RPI 2912 real,
// e só depois o texto (gatilho), útil para despachos lançados manualmente.
// dias = 0 → o prazo é criado sem data fatal, para a equipe conferir no despacho.

export const REGRAS_PADRAO = [
  { id: 'manifestacao_oposicao', nome: 'Manifestação à oposição (Art. 158, §1º LPI)', dias: 60, aplica: 'proprio', codigos: ['IPAS423'], gatilho: 'notifica[cç][aã]o de oposi' },
  { id: 'exigencia', nome: 'Cumprimento de exigência de mérito (Art. 159 LPI)', dias: 60, aplica: 'proprio', codigos: ['IPAS136', 'IPAS267', 'IPAS772'], gatilho: 'exig[eê]ncia de m[eé]rito' },
  { id: 'exigencia_formal', nome: 'Exigência formal / de pagamento (conferir prazo no despacho)', dias: 0, aplica: 'proprio', codigos: ['IPAS005', 'IPAS395', 'IPAS089'], gatilho: 'exig[eê]ncia (formal|de pagamento)' },
  { id: 'recurso', nome: 'Recurso contra indeferimento (Art. 212 LPI)', dias: 60, aplica: 'proprio', codigos: ['IPAS024', 'IPAS658', 'IPAS271', 'IPAS774', 'IPAS337'], gatilho: '^indeferimento' },
  { id: 'contrarrazoes', nome: 'Manifestação sobre recurso de terceiro (Art. 213 LPI)', dias: 60, aplica: 'proprio', codigos: ['IPAS360'], gatilho: 'notifica[cç][aã]o de recurso' },
  { id: 'manif_pan', nome: 'Manifestação ao PAN (Art. 170 LPI)', dias: 60, aplica: 'proprio', codigos: ['IPAS400'], gatilho: 'instaura[cç][aã]o de processo de nulidade' },
  { id: 'caducidade_resp', nome: 'Resposta a pedido de caducidade (Art. 143, §2º LPI)', dias: 60, aplica: 'proprio', codigos: ['IPAS338'], gatilho: 'notifica[cç][aã]o de caducidade' },
  { id: 'oposicao', nome: 'Oposição contra terceiro (Art. 158 LPI)', dias: 60, aplica: 'terceiro', codigos: ['IPAS009', 'IPAS421'], gatilho: 'publica[cç][aã]o de pedido.*oposi|republica[cç][aã]o de pedido' },
  { id: 'pan', nome: 'PAN contra registro de terceiro (Art. 169 LPI)', dias: 180, aplica: 'terceiro', codigos: [], gatilho: '' },
  { id: 'prorrogacao', nome: 'Prorrogação do registro (Art. 133 LPI)', dias: 0, aplica: 'proprio', codigos: [], gatilho: '' },
  { id: 'outro', nome: 'Outro prazo (manual)', dias: 60, aplica: 'proprio', codigos: [], gatilho: '' },
];

// Despachos que abrem prazo de oposição para terceiros (vigilância).
export const CODIGOS_OPOSICAO = ['IPAS009', 'IPAS421'];

const pad = n => String(n).padStart(2, '0');
export const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export function parseData(s) {
  if (!s) return null;
  if (s instanceof Date) return new Date(s.getFullYear(), s.getMonth(), s.getDate());
  let m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
  m = String(s).match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (m) return new Date(+m[3], +m[2] - 1, +m[1]);
  return null;
}
export const br = s => { const d = parseData(s); return d ? `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}` : ''; };

function pascoa(ano) {
  const a = ano % 19, b = Math.floor(ano / 100), c = ano % 100, d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31), dia = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(ano, mes - 1, dia);
}

const cache = {};
export function feriados(ano, extras = []) {
  const k = ano + '|' + extras.join(',');
  if (cache[k]) return cache[k];
  const p = pascoa(ano);
  const rel = n => { const d = new Date(p); d.setDate(d.getDate() + n); return iso(d); };
  const fixos = ['01-01', '04-21', '05-01', '09-07', '10-12', '11-02', '11-15', '11-20', '12-25'].map(x => `${ano}-${x}`);
  const set = new Set([...fixos, rel(-48), rel(-47), rel(-2), rel(60), ...extras.filter(e => e.startsWith(String(ano)))]);
  cache[k] = set;
  return set;
}

export function diaUtil(d, extras = []) {
  const w = d.getDay();
  return w !== 0 && w !== 6 && !feriados(d.getFullYear(), extras).has(iso(d));
}

// Retorna a data fatal (ISO) contando `dias` corridos a partir da publicação.
export function calcularPrazo(inicio, dias, extras = []) {
  const d = parseData(inicio);
  if (!d) return '';
  d.setDate(d.getDate() + Number(dias || 0));
  while (!diaUtil(d, extras)) d.setDate(d.getDate() + 1);
  return iso(d);
}

export function diasRestantes(dataFatal, hoje = new Date()) {
  const f = parseData(dataFatal);
  if (!f) return null;
  const h = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  return Math.round((f - h) / 86400000);
}

export function regraPorDespacho(texto, regras = REGRAS_PADRAO, aplica = 'proprio', codigo = '') {
  const doTipo = regras.filter(r => r.aplica === aplica);
  const cod = String(codigo || '').trim().toUpperCase();
  if (cod) {
    const porCodigo = doTipo.find(r => (r.codigos || []).includes(cod));
    if (porCodigo) return porCodigo;
  }
  const t = String(texto || '');
  return doTipo.find(r => r.gatilho && new RegExp(r.gatilho, 'i').test(t)) || null;
}

// Fase do Kanban da Carteira INPI pelo código do despacho (RPI) — tabela calibrada com a RPI 2912.
const FASE_POR_CODIGO = {
  publicado: ['IPAS009', 'IPAS421'],
  oposicao: ['IPAS423'],
  exigencia: ['IPAS136', 'IPAS267', 'IPAS772', 'IPAS005', 'IPAS395', 'IPAS089'],
  sobrestado: ['IPAS142', 'IPAS771'],
  deferido: ['IPAS029', 'IPAS768', 'IPAS781', 'IPAS237'],
  vigor: ['IPAS158', 'IPAS770'],
  indeferido: ['IPAS024', 'IPAS658', 'IPAS774'],
  recurso: ['IPAS360'],
  arquivado: ['IPAS161', 'IPAS304', 'IPAS139', 'IPAS106', 'IPAS047', 'IPAS033', 'IPAS112', 'IPAS091', 'IPAS289', 'IPAS291', 'IPAS773', 'IPAS409', 'IPAS530'],
};

// Retorna a nova fase, ou null quando o despacho não muda a fase (ex.: petições, certidões, anotações).
export function faseDoDespacho(texto = '', codigo = '') {
  const cod = String(codigo || '').trim().toUpperCase();
  if (cod) {
    for (const [fase, cods] of Object.entries(FASE_POR_CODIGO)) if (cods.includes(cod)) return fase;
    if (/^IPAS\d+$/.test(cod)) return null;
  }
  const t = texto.toLowerCase();
  if (/peti[cç][aã]o|certid[aã]o|segunda via|c[oó]pia oficial|anota[cç][aã]o|designa[cç][aã]o/.test(t)) return null;
  if (/sobrest/.test(t)) return 'sobrestado';
  if (/arquiv|extin|inexistente|cancelamento de of[ií]cio|nulo o registro/.test(t)) return 'arquivado';
  if (/notifica[cç][aã]o de recurso|aguardando.*recurso/.test(t)) return 'recurso';
  if (/indeferi/.test(t)) return 'indeferido';
  if (/exig/.test(t)) return 'exigencia';
  if (/notifica[cç][aã]o de oposi/.test(t)) return 'oposicao';
  if (/publica[cç][aã]o de pedido|republica[cç][aã]o de pedido|prazo de (apresenta[cç][aã]o de )?oposi/.test(t)) return 'publicado';
  if (/m[eé]rito/.test(t)) return 'merito';
  if (/concess[aã]o de registro|em vigor|concedid|prorroga/.test(t)) return 'vigor';
  if (/deferimento do pedido|recurso provido.*deferimento/.test(t)) return 'deferido';
  if (/formal|admissib/.test(t)) return 'formal';
  return null;
}

export const FASES_INPI = [
  { id: 'protocolado', titulo: 'Protocolado', msg: '10.9-protocolo' },
  { id: 'formal', titulo: 'Exame formal / admissibilidade', msg: '10.9-formal' },
  { id: 'publicado', titulo: 'Publicado p/ oposição', msg: '10.9-publicado' },
  { id: 'oposicao', titulo: 'Oposição / manifestação', msg: '10.9-oposicao' },
  { id: 'merito', titulo: 'Exame de mérito', msg: '10.9-merito' },
  { id: 'exigencia', titulo: 'Exigência', msg: '10.9-exigencia' },
  { id: 'sobrestado', titulo: 'Sobrestado', msg: '10.9-sobrestado' },
  { id: 'deferido', titulo: 'Deferido', msg: '10.9-deferido' },
  { id: 'vigor', titulo: 'Registro em vigor', msg: '10.9-vigor' },
  { id: 'indeferido', titulo: 'Indeferido', msg: '10.9-indeferido' },
  { id: 'recurso', titulo: 'Recurso', msg: '10.9-recurso' },
  { id: 'arquivado', titulo: 'Arquivado / extinto', msg: '' },
];
