// Validação e adequação da logomarca ao padrão do e-Marcas (Etapa 8.2):
// .JPG/.JPEG, fundo branco, quadrada, mín. 945×945 px (8×8 cm a 300 DPI), 300 DPI, até 2 MB.

function lerDpiJfif(buf) {
  const b = new Uint8Array(buf);
  if (b[0] !== 0xFF || b[1] !== 0xD8) return null;
  let i = 2;
  while (i < b.length - 18) {
    if (b[i] !== 0xFF) return null;
    const marker = b[i + 1], len = (b[i + 2] << 8) + b[i + 3];
    if (marker === 0xE0 && String.fromCharCode(b[i + 4], b[i + 5], b[i + 6], b[i + 7]) === 'JFIF') {
      const unid = b[i + 11], x = (b[i + 12] << 8) + b[i + 13];
      return unid === 1 ? x : unid === 2 ? Math.round(x * 2.54) : null;
    }
    if (marker === 0xE1) { // EXIF: procura XResolution de forma simplificada
      const s = String.fromCharCode(...b.slice(i + 4, i + 8));
      if (s === 'Exif') return null;
    }
    i += 2 + len;
  }
  return null;
}

const carregarImagem = (url) => new Promise((ok, erro) => { const im = new Image(); im.onload = () => ok(im); im.onerror = () => erro(new Error('Imagem inválida')); im.src = url; });

function fundoBranco(im) {
  const c = document.createElement('canvas');
  const s = 200;
  c.width = s; c.height = s;
  const ctx = c.getContext('2d');
  ctx.drawImage(im, 0, 0, s, s);
  const d = ctx.getImageData(0, 0, s, s).data;
  let tot = 0, brancos = 0, transp = 0;
  const amostra = (x, y) => {
    const k = (y * s + x) * 4;
    tot++;
    if (d[k + 3] < 250) transp++;
    else if (d[k] > 242 && d[k + 1] > 242 && d[k + 2] > 242) brancos++;
  };
  for (let i = 0; i < s; i += 4) { amostra(i, 0); amostra(i, s - 1); amostra(0, i); amostra(s - 1, i); }
  return { branco: brancos / tot >= 0.9, transparente: transp > 0 };
}

export async function validarLogo(file) {
  const res = { ok: true, itens: [] };
  const add = (ok, txt) => { res.itens.push({ ok, txt }); if (!ok) res.ok = false; };
  const tipoOk = /image\/jpe?g/.test(file.type) || /\.jpe?g$/i.test(file.name);
  add(tipoOk, `Formato .JPG/.JPEG (${file.type || file.name.split('.').pop()})`);
  add(file.size <= 2 * 1024 * 1024, `Tamanho até 2 MB (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
  const url = URL.createObjectURL(file);
  try {
    const im = await carregarImagem(url);
    res.largura = im.naturalWidth; res.altura = im.naturalHeight;
    add(im.naturalWidth === im.naturalHeight, `Proporção quadrada (${im.naturalWidth}×${im.naturalHeight} px)`);
    add(Math.min(im.naturalWidth, im.naturalHeight) >= 945, 'Mínimo 945×945 px (8×8 cm a 300 DPI)');
    const fb = fundoBranco(im);
    add(!fb.transparente, 'Sem transparência');
    add(fb.branco, 'Fundo branco nas bordas');
    const dpi = tipoOk ? lerDpiJfif(await file.arrayBuffer()) : null;
    res.dpi = dpi;
    add(dpi !== null && dpi >= 300, `Resolução mínima de 300 DPI (${dpi ?? 'não declarada'})`);
  } finally { URL.revokeObjectURL(url); }
  res.itens.push({ ok: null, txt: 'Conferir manualmente: arte sem os símbolos ® ou ™' });
  return res;
}

// Gera uma versão adequada: quadrada, fundo branco, ≥945 px, JPG, 300 DPI, ≤2 MB.
export async function adequarLogo(file) {
  const url = URL.createObjectURL(file);
  try {
    const im = await carregarImagem(url);
    const lado = Math.max(945, Math.min(2000, Math.max(im.naturalWidth, im.naturalHeight)));
    const c = document.createElement('canvas');
    c.width = lado; c.height = lado;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, lado, lado);
    const margem = lado * 0.06;
    const esc = Math.min((lado - 2 * margem) / im.naturalWidth, (lado - 2 * margem) / im.naturalHeight);
    const w = im.naturalWidth * esc, h = im.naturalHeight * esc;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(im, (lado - w) / 2, (lado - h) / 2, w, h);
    let q = 0.92, blob;
    do { blob = await new Promise(ok => c.toBlob(ok, 'image/jpeg', q)); q -= 0.08; } while (blob.size > 2 * 1024 * 1024 && q > 0.4);
    const buf = new Uint8Array(await blob.arrayBuffer());
    // ajusta densidade do cabeçalho JFIF para 300 DPI
    if (buf[2] === 0xFF && buf[3] === 0xE0 && String.fromCharCode(buf[6], buf[7], buf[8], buf[9]) === 'JFIF') {
      buf[13] = 1; buf[14] = 300 >> 8; buf[15] = 300 & 255; buf[16] = 300 >> 8; buf[17] = 300 & 255;
    }
    const nome = file.name.replace(/\.[^.]+$/, '') + ' - padrao INPI.jpg';
    return new File([buf], nome, { type: 'image/jpeg' });
  } finally { URL.revokeObjectURL(url); }
}
