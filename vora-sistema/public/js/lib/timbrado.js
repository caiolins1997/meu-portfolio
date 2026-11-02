// Gera documentos em papel timbrado Vora (versão clara para impressão/PDF):
// grafite + marfim + acento verde-limão, mesma tipografia do site vorapi.com.br.
import { esc, uploadArquivo, toast, falha } from '../core.js';

const CSS = `
@page { size: A4; margin: 0; }
* { box-sizing: border-box; }
body { margin: 0; background: #e9e7e1; font-family: 'Space Grotesk', Arial, sans-serif; color: #1c1c1c; }
.bar { position: sticky; top: 0; z-index: 5; display: flex; gap: 8px; align-items: center; justify-content: center; padding: 10px; background: #0a0a0a; font-size: 13px; color: #bbb; }
.bar button { font: 600 13px 'Space Grotesk', sans-serif; border-radius: 999px; padding: 8px 16px; border: 1px solid #333; background: #151515; color: #eee; cursor: pointer; }
.bar button.neon { background: #ccff00; color: #000; border-color: #ccff00; }
.page { width: 210mm; min-height: 297mm; margin: 16px auto; background: #faf8f3; position: relative; padding: 30mm 20mm 26mm; box-shadow: 0 10px 40px rgba(0,0,0,.15); }
.head { position: absolute; top: 0; left: 0; right: 0; height: 22mm; background: #141414; display: flex; align-items: center; justify-content: space-between; padding: 0 20mm; color: #f1f1f1; }
.head .lg { display: flex; align-items: center; gap: 10px; }
.head .v { width: 30px; height: 30px; border-radius: 8px; background: #ccff00; color: #000; display: grid; place-items: center; font-weight: 700; font-size: 18px; }
.head b { font-size: 14px; letter-spacing: -.01em; }
.head small { display: block; font: 500 7.5px 'JetBrains Mono', monospace; letter-spacing: .22em; text-transform: uppercase; color: #9a9a9a; }
.head .tag { font: 500 8px 'JetBrains Mono', monospace; letter-spacing: .2em; text-transform: uppercase; color: #ccff00; }
.accent { position: absolute; top: 22mm; left: 0; right: 0; height: 1.6mm; background: #ccff00; }
.foot { position: absolute; bottom: 0; left: 0; right: 0; padding: 5mm 20mm; border-top: 1px solid #ddd8cc; font-size: 8.5px; color: #6b6b6b; display: flex; justify-content: space-between; gap: 10px; }
.foot .mono { font-family: 'JetBrains Mono', monospace; letter-spacing: .08em; }
.doc { font-size: 11.5pt; line-height: 1.6; }
.doc h1 { font-size: 21pt; letter-spacing: -.035em; line-height: 1.1; margin: 4mm 0 2mm; color: #111; }
.doc .kicker { font: 500 8pt 'JetBrains Mono', monospace; letter-spacing: .22em; text-transform: uppercase; color: #6f7f00; }
.doc h2 { font-size: 13pt; margin: 7mm 0 2mm; padding-bottom: 1.5mm; border-bottom: 1.5px solid #1c1c1c; letter-spacing: -.01em; }
.doc h3 { font-size: 11.5pt; margin: 5mm 0 1.5mm; }
.doc p { margin: 0 0 3mm; text-align: justify; }
.doc table { width: 100%; border-collapse: collapse; margin: 2mm 0 4mm; font-size: 9.5pt; page-break-inside: auto; }
.doc th, .doc td { border: 1px solid #d9d4c7; padding: 2mm 2.5mm; text-align: left; vertical-align: top; }
.doc th { background: #ece8dd; font-weight: 600; width: 34%; }
.doc table.grid th { width: auto; }
.doc .box { border: 1px solid #d9d4c7; border-left: 4px solid #1c1c1c; background: #f3f0e8; padding: 3mm 4mm; margin: 3mm 0; border-radius: 2mm; }
.doc .box.alto { border-left-color: #1f9d55; } .doc .box.medio { border-left-color: #d49b00; } .doc .box.baixo { border-left-color: #d64545; }
.doc .pill { display: inline-block; padding: .5mm 3mm; border-radius: 99px; font-size: 8.5pt; font-weight: 600; border: 1px solid #1c1c1c; }
.doc .sign { margin-top: 16mm; display: grid; grid-template-columns: 1fr 1fr; gap: 14mm; }
.doc .sign div { border-top: 1px solid #1c1c1c; padding-top: 2mm; font-size: 9.5pt; text-align: center; }
.doc .small { font-size: 9pt; color: #555; }
.doc img.logo-marca { max-width: 45mm; max-height: 45mm; border: 1px solid #ddd; background: #fff; }
.doc .campo { background: #fff6b3; padding: 0 1mm; }
[contenteditable]:focus { outline: 2px dashed #ccff00; outline-offset: 4mm; }
@media print { body { background: #faf8f3; } .bar { display: none; } .page { margin: 0; box-shadow: none; width: auto; min-height: 297mm; } .doc .campo { background: none; } }
`;

export function abrirDocumento({ titulo, html, empresa = {}, kicker = '', clienteId = '', pasta = '', nomeArquivo = '' }) {
  const w = window.open('', '_blank');
  if (!w) { toast('Permita pop-ups para gerar o documento.', true); return; }
  const rodapeEnd = esc(empresa.enderecoInstitucional || 'Atendimento digital em todo o Brasil');
  w.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${esc(titulo)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@500&display=swap" rel="stylesheet">
  <style>${CSS}</style></head><body>
  <div class="bar"><span>Clique no texto para editar antes de imprimir.</span>
    <button id="b-print" class="neon">Imprimir / Salvar PDF</button>
    ${clienteId ? '<button id="b-save">Salvar cópia na pasta do cliente</button>' : ''}</div>
  <div class="page">
    <div class="head"><div class="lg"><div class="v">V</div><div><b>${esc(empresa.nome || 'Vora Propriedade Industrial')}</b><small>Registro e proteção de marcas · INPI</small></div></div><div class="tag">${esc(kicker || 'Documento')}</div></div>
    <div class="accent"></div>
    <div class="doc" contenteditable="true">${html}</div>
    <div class="foot"><span>${esc(empresa.nome || 'Vora Propriedade Industrial')}${empresa.cnpj ? ' · CNPJ ' + esc(empresa.cnpj) : ''} · ${rodapeEnd} · vorapi.com.br</span>
    <span class="mono">Em conformidade com a LGPD — Lei nº 13.709/2018</span></div>
  </div></body></html>`);
  w.document.close();
  w.document.getElementById('b-print').onclick = () => w.print();
  const bs = w.document.getElementById('b-save');
  if (bs) bs.onclick = async () => {
    try {
      const conteudo = '<!doctype html>' + w.document.documentElement.outerHTML.replace(/<div class="bar">[\s\S]*?<\/div>/, '');
      const file = new File([conteudo], (nomeArquivo || titulo) + '.html', { type: 'text/html' });
      await uploadArquivo(file, { clienteId, pasta: pasta || '01' });
      bs.textContent = 'Salvo ✓';
      toast('Cópia salva na pasta do cliente.');
    } catch (e) { falha(e); }
  };
  return w;
}
