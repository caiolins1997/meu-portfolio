// Formulário público de coleta inicial (Etapa 3 / Item 5.3.2).
const form = document.getElementById('form');
const $ = (s) => form.querySelector(s);
const origem = new URLSearchParams(location.search).get('origem') || 'D';
let info = {};
fetch('/admin/api/public/info').then(r => r.json()).then(d => { info = d; }).catch(() => {});

// Pré-preenchimento com o que a pessoa já digitou no formulário curto do site (vorapi.com.br/#analise).
try {
  const pre = JSON.parse(sessionStorage.getItem('vora_lead') || 'null');
  if (pre) {
    for (const k of ['nome', 'marca', 'email']) if (pre[k] && form.elements[k]) form.elements[k].value = pre[k];
    const tel = String(pre.whatsapp || pre.telefone || '').replace(/\D/g, '');
    if (tel) form.elements.telefone.value = `+55 ${tel.replace(/^55(?=\d{10,11}$)/, '').replace(/^(\d{2})(\d{4,5})(\d{4})$/, '$1 $2-$3')}`;
    sessionStorage.removeItem('vora_lead');
  }
} catch { /* sem sessionStorage: segue sem pré-preenchimento */ }

form.addEventListener('change', () => {
  document.getElementById('logo-box').hidden = $('input[name=temLogo]:checked').value !== 'sim';
  $('#cnpj').hidden = $('input[name=tipoPessoa]:checked').value !== 'PJ';
});

const lerArquivo = (f) => new Promise((ok, erro) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = erro; r.readAsDataURL(f); });

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(form);
  const obrig = ['nome', 'marca', 'email', 'telefone', 'localidade', 'descricao'];
  let ok = true;
  for (const k of obrig) {
    const el = form.elements[k];
    const vazio = !String(fd.get(k) || '').replace('+55', '').trim();
    el.style.borderColor = vazio ? 'var(--red)' : '';
    if (vazio) ok = false;
  }
  if (!ok) return alertar('Preencha os campos obrigatórios (*).');
  if (!/^\S+@\S+\.\S+$/.test(fd.get('email'))) return alertar('Confira o e-mail informado.');
  if (!form.elements.consentimento.checked) return alertar('É necessário marcar o consentimento para realizarmos a análise.');
  const dados = Object.fromEntries(fd.entries());
  delete dados.logo;
  dados.temLogo = dados.temLogo === 'sim';
  dados.consentimento = true;
  dados.origem = origem;
  const arq = form.elements.logo.files[0];
  if (dados.temLogo && arq) {
    if (arq.size > 3 * 1024 * 1024) return alertar('A imagem da logo deve ter no máximo 3 MB.');
    dados.logo = await lerArquivo(arq);
  }
  const b = document.getElementById('enviar');
  b.disabled = true; b.textContent = 'Enviando…';
  try {
    const r = await fetch('/admin/api/public/formulario', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dados) });
    const j = await r.json();
    if (!r.ok) throw new Error(j.erro || 'Erro ao enviar');
    form.hidden = true;
    document.getElementById('hero').hidden = true;
    document.getElementById('ok').hidden = false;
    if (info.whatsapp) {
      const wa = document.getElementById('wa');
      const num = info.whatsapp.replace(/\D/g, '');
      wa.href = `https://wa.me/${num.length <= 11 ? '55' + num : num}?text=${encodeURIComponent(`Olá! Acabei de preencher o formulário de análise da marca ${dados.marca}.`)}`;
      wa.hidden = false;
    }
    window.scrollTo(0, 0);
  } catch (er) {
    alertar(er.message);
    b.disabled = false; b.textContent = 'Quero minha análise →';
  }
});

function alertar(msg) {
  let t = document.querySelector('.toasts');
  if (!t) { t = document.createElement('div'); t.className = 'toasts'; document.body.appendChild(t); }
  const d = document.createElement('div'); d.className = 'toast err'; d.textContent = msg; t.appendChild(d);
  setTimeout(() => d.remove(), 5000);
}
