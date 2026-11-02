// Utilitários de texto compartilhados entre navegador e servidor:
// normalização, dobra fonética, variantes de busca (pePI) e similaridade de marcas.

export function semAcento(s = '') {
  return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '');
}

const STOP = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'a', 'o', 'as', 'os', 'the', 'and', 'of', 'em', 'by', 'la', 'le', 'el']);

export function tokens(s = '') {
  return semAcento(String(s).toLowerCase())
    .replace(/&/g, ' ')
    .split(/[^a-z0-9]+/)
    .filter(t => t && !STOP.has(t));
}

// Reduz a marca a uma "chave fonética" aproximada do português:
// C/K/Q, S/Z/SS/Ç, I/Y, F/PH, V/W, H mudo e letras dobradas.
export function dobrar(s = '') {
  let t = String(s).toLowerCase().replace(/ç/g, 's');
  t = semAcento(t).replace(/[^a-z0-9]/g, '');
  t = t
    .replace(/ph/g, 'f')
    .replace(/th/g, 't')
    .replace(/qu(?=[ei])/g, 'k')
    .replace(/qu/g, 'k')
    .replace(/q/g, 'k')
    .replace(/c(?=[ei])/g, 's')
    .replace(/ch/g, 'x')
    .replace(/c/g, 'k')
    .replace(/y/g, 'i')
    .replace(/w/g, 'v')
    .replace(/z/g, 's')
    .replace(/(^|[^lnsx])h/g, '$1')
    .replace(/(.)\1+/g, '$1');
  return t;
}

const SUBS = [
  ['c', 'k'], ['k', 'c'], ['qu', 'k'], ['c', 'q'], ['k', 'q'],
  ['s', 'z'], ['z', 's'], ['ss', 'ç'], ['ç', 'ss'], ['s', 'ss'], ['ç', 's'],
  ['i', 'y'], ['y', 'i'], ['f', 'ph'], ['ph', 'f'], ['v', 'w'], ['w', 'v'],
  ['x', 'ch'], ['ch', 'x'],
];

// Variantes fonéticas do radical para a busca no pePI (Etapa 5).
export function variantesFoneticas(marca = '', limite = 24) {
  const base = String(marca).trim().toLowerCase();
  if (!base) return [];
  const out = new Set();
  const aplicar = (txt) => {
    const r = [];
    for (const [de, para] of SUBS) if (txt.includes(de)) r.push(txt.split(de).join(para));
    return r;
  };
  const nivel1 = aplicar(base);
  nivel1.forEach(v => out.add(v));
  for (const v of nivel1) for (const w of aplicar(v)) if (out.size < limite * 3) out.add(w);
  if (base.includes(' ')) out.add(base.replace(/\s+/g, ''));
  const semAc = semAcento(base);
  if (semAc !== base) out.add(semAc);
  out.delete(base);
  // prioriza variantes com chave fonética igual à da marca (soam igual)
  const chave = dobrar(base);
  return [...out]
    .sort((a, b) => (dobrar(a) === chave ? 0 : 1) - (dobrar(b) === chave ? 0 : 1) || a.length - b.length)
    .slice(0, limite)
    .map(v => v.toUpperCase());
}

export function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[b.length];
}

// Compara a marca do cliente com a marca de terceiro.
// Retorna { score 0-100, motivo }.
export function similaridade(marcaCliente, marcaTerceiro) {
  const A = dobrar(marcaCliente), B = dobrar(marcaTerceiro);
  if (!A || !B) return { score: 0, motivo: '' };
  if (A === B) return { score: 100, motivo: 'Idêntica / foneticamente idêntica' };
  let best = { score: 0, motivo: '' };
  const up = (score, motivo) => { if (score > best.score) best = { score: Math.round(score), motivo }; };
  if (A.length >= 4 && B.includes(A)) up(90, 'Reproduz integralmente a marca do cliente');
  if (B.length >= 4 && A.includes(B)) up(78, 'Está contida na marca do cliente');
  const ta = tokens(marcaCliente).map(dobrar).filter(t => t.length >= 4);
  const tb = tokens(marcaTerceiro).map(dobrar).filter(t => t.length >= 3);
  for (const x of ta) for (const y of tb) {
    if (x === y) up(85, 'Elemento nominativo coincidente');
    else if (x.length >= 5 && y.length >= 5) {
      const r = 1 - levenshtein(x, y) / Math.max(x.length, y.length);
      if (r >= 0.8) up(70 + r * 10, 'Elemento nominativo semelhante');
    }
  }
  const ratio = 1 - levenshtein(A, B) / Math.max(A.length, B.length);
  if (ratio >= 0.7 && Math.min(A.length, B.length) >= 3) up(ratio * 100, 'Semelhança fonética/gráfica');
  return best;
}

export function limparRazaoSocial(s = '') {
  return String(s)
    .replace(/\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/g, '')
    .replace(/\b\d{11,14}\b/g, '')
    .replace(/\b(LTDA\.?|LIMITADA|ME|EPP|EIRELI|S\/?A|SLU|MEI|EI|SOCIEDADE UNIPESSOAL)\b\.?/gi, '')
    .replace(/^[\d\s.\-]+/, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/[\s\-.,]+$/, '')
    .trim();
}

export function capitalizar(s = '') {
  const minus = new Set(['de', 'da', 'do', 'das', 'dos', 'e']);
  return String(s).toLowerCase().split(/\s+/).filter(Boolean)
    .map((p, i) => (i > 0 && minus.has(p)) ? p : p[0].toUpperCase() + p.slice(1)).join(' ');
}

export function primeiroNome(s = '') {
  return capitalizar(String(s).trim().split(/\s+/)[0] || '');
}

export function apenasDigitos(s = '') { return String(s).replace(/\D/g, ''); }
