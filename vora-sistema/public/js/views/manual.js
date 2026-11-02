// Itens 2.3 / 11.1 / 11.2 — Playbook de vendas (funil, gatilhos e negociação) e Manual operacional do colaborador.
import { tabs } from '../core.js';
import { cabecalho } from '../app.js';

let aba = 'vendas';

const VENDAS = `
<h3>1. A jornada do lead Vora</h3>
<div class="grid g4" style="margin:12px 0">
  <div class="branch" style="--c:var(--sky)"><h4>Descoberta</h4><ul><li>Post / anúncio / e-mail JUCEAL</li><li>Site vorapi.com.br</li><li>Indicação</li></ul></div>
  <div class="branch" style="--c:var(--violet)"><h4>Consciência do risco</h4><ul><li>“CNPJ não é marca”</li><li>Quem registra primeiro é o dono</li><li>Formulário de análise</li></ul></div>
  <div class="branch" style="--c:var(--amber)"><h4>Decisão</h4><ul><li>Parecer em PDF + áudio</li><li>Proposta clara</li><li>Facilidade de pagamento</li></ul></div>
  <div class="branch" style="--c:var(--lime)"><h4>Fidelização</h4><ul><li>Atualizações do INPI</li><li>Relatório mensal</li><li>Monitoramento recorrente</li></ul></div>
</div>
<p>A continuidade visual é parte da venda: o lead vê o mesmo preto, o mesmo verde-limão e a mesma tipografia no Instagram, no site, no formulário e no PDF que recebe no WhatsApp. Isso transmite organização e confiança.</p>

<h3>2. Gatilhos mentais (use com ética e verdade)</h3>
<ul>
  <li><b>Urgência real</b> — “Enquanto o pedido não é protocolado, qualquer pessoa pode registrar antes de você.” A prioridade conta da data do depósito.</li>
  <li><b>Escassez (de exclusividade)</b> — o nome é único na classe: se outro registrar, você perde.</li>
  <li><b>Prova social</b> — clientes como Ritz, Singular Hotéis, Zena SPA, Life Beer, Francês FM (somente marcas com autorização de uso).</li>
  <li><b>Autoridade</b> — análise técnica baseada na LPI e no Manual de Marcas do INPI; vigilância semanal da RPI.</li>
  <li><b>Reciprocidade</b> — a análise de viabilidade gratuita e detalhada entrega valor antes da venda.</li>
  <li><b>Aversão à perda</b> — “Quanto custa trocar fachada, embalagens, Instagram e site?” Compare com o investimento no registro.</li>
  <li><b>Compromisso e coerência</b> — confirme pequenos “sins”: “Você pretende continuar usando esse nome por muitos anos, certo?”</li>
  <li><b>Facilidade</b> — tudo pelo celular: assinatura digital, PIX, cartão ou boleto parcelado.</li>
</ul>
<blockquote>Nunca prometa a concessão do registro. Ela é ato exclusivo do INPI. Venda segurança técnica, acompanhamento e agilidade.</blockquote>

<h3>3. Roteiro de conversa no WhatsApp</h3>
<ol>
  <li><b>Acolher</b> (10.1) e perguntar a origem: “Como você conheceu a Vora?”</li>
  <li><b>Diagnosticar</b>: há quanto tempo usa a marca, onde vende, se tem logo, planos de expansão.</li>
  <li><b>Educar</b> (10.2 a 10.4): o que é o registro, como funciona, por que se preocupar.</li>
  <li><b>Formulário</b> (10.6) — o compromisso do lead começa aqui.</li>
  <li><b>Parecer</b> (10.7) — envie o PDF + áudio curto explicando os 3 pontos principais.</li>
  <li><b>Fechar</b> (10.8) — proposta, assinatura, documentos e pagamento na mesma conversa.</li>
  <li><b>Sem resposta?</b> Régua de follow-up: 7, 15, 30, 60, 90 e 120 dias.</li>
</ol>

<h3>4. Objeções comuns</h3>
<table class="t"><tr><th>Objeção</th><th>Resposta sugerida</th></tr>
<tr><td>“Vou deixar para depois.”</td><td>“Entendo. Só lembro que a prioridade é de quem pede primeiro. Posso reservar o protocolo para esta semana com o pagamento parcelado?”</td></tr>
<tr><td>“Está caro.”</td><td>“Comparado a refazer a identidade inteira, o registro é o seguro mais barato do seu negócio. E dá para parcelar no boleto.”</td></tr>
<tr><td>“Já tenho CNPJ.”</td><td>“O CNPJ registra a empresa na Junta Comercial; a marca só é protegida no INPI. São coisas diferentes.”</td></tr>
<tr><td>“Ninguém usa meu nome.”</td><td>“Hoje. Nossa vigilância encontra cópias toda semana na Revista do INPI. A análise mostra quem já está no seu segmento.”</td></tr>
<tr><td>“Vou fazer sozinho.”</td><td>“Pode, sim. O risco está na classe e na especificação erradas e no acompanhamento de prazos. Cuidamos de tudo e vigiamos a sua marca até a decisão.”</td></tr>
</table>

<h3>5. Negociação e ticket alto (D5)</h3>
<ul>
  <li>1 marca simples → fechamento ágil direto no WhatsApp.</li>
  <li>Múltiplas marcas/classes ou grupos empresariais → reunião online ou presencial em Maceió; use o simulador de preços com desconto progressivo.</li>
  <li>Prefira PIX ou cartão: libera a sua comissão no fechamento do mês. No boleto parcelado, a comissão acompanha as parcelas pagas.</li>
  <li>Pós-venda: ofereça o <b>Monitoramento de Marca</b> recorrente após a concessão e Oposição/Recurso quando houver despacho.</li>
</ul>`;

const OPERACIONAL = `
<h3>1. Busca no INPI (pePI) — Etapa 5</h3>
<ol>
  <li>Acesse <a href="https://busca.inpi.gov.br/pePI/jsp/Base_pesquisa.jsp" target="_blank" rel="noopener">busca.inpi.gov.br/pePI</a> com o <b>seu login individual</b> (crie o seu no INPI) ou entre como anônimo em “Continuar…”. Quando o CNPJ da Vora estiver regularizado, será criado o login corporativo.</li>
  <li>Clique em <b>Continuar »</b> → ícone vermelho <b>® Marca</b> → “Consultar por: <b>Marca</b>”.</li>
  <li>Pesquise o termo exato nas duas formas: <b>Exata</b> e <b>Radical</b>.</li>
  <li>Teste as variações fonéticas (C/K/Q, S/Z/SS/Ç, I/Y, F/PH) e as traduções. O sistema gera a lista na tela da análise.</li>
  <li>Registre o total de processos do título “RESULTADO DA PESQUISA… Foram encontrados xx processos… Mostrando página x de x”.</li>
  <li>Salve <b>cada página</b> em PDF com o nome <span class="mono">TERMO P.1</span>, <span class="mono">TERMO P.2</span>… e anexe em <i>02. Análise de Viabilidade › Pesquisa Banco INPI</i>.</li>
  <li>Filtre pelo ramo do cliente e pela Classe de Nice; confira se a marca colidente está <b>Em Vigor</b> ou <b>Em Processo</b>.</li>
  <li>Para cada anterioridade relevante, extraia os <b>17 dados obrigatórios</b> (use “Colar texto do pePI” para preencher automaticamente e confira).</li>
</ol>
<blockquote>Credenciais de acesso nunca devem ser compartilhadas em mensagens, planilhas ou documentos. Cada colaborador usa o próprio login.</blockquote>

<h3>2. CNAE × Classe — Etapa 8 (Art. 128, §1º da LPI)</h3>
<ol>
  <li>Peça o CNPJ antes do fechamento / 2º relatório.</li>
  <li>No cadastro do cliente, clique em <b>Buscar dados do CNPJ</b>: o sistema extrai razão social, endereço, sócios e todos os CNAEs.</li>
  <li>Compare cada CNAE com a(s) classe(s) pretendida(s). A pessoa jurídica só pode registrar marca relativa à atividade que exerce efetiva e licitamente.</li>
  <li>Se houver incompatibilidade, ajuste a classe/especificação ou oriente a inclusão do CNAE com a contabilidade do cliente.</li>
</ol>

<h3>3. Logomarca no padrão e-Marcas — Etapa 8.2</h3>
<ul><li>Formato <b>.JPG/.JPEG</b>, <b>fundo branco</b> (sem transparência);</li><li>Proporção <b>quadrada</b>, mínimo <b>945 × 945 px</b> (8 × 8 cm a 300 DPI);</li><li>Resolução mínima de <b>300 DPI</b>, tamanho máximo de <b>2 MB</b>;</li><li>Sem os símbolos ® ou ™ na arte.</li></ul>
<p>Use <b>Cliente › Pasta do cliente › Validar logo</b>: o sistema confere tudo e gera automaticamente uma versão adequada.</p>

<h3>4. GRU — trava obrigatória antes do protocolo (Etapa 11)</h3>
<ol>
  <li>Emita a GRU no e-INPI, no CPF/CNPJ do <b>titular</b>.</li>
  <li>Envie a guia ao cliente e acompanhe o pagamento.</li>
  <li>Só marque o item 6 do checklist com o <b>comprovante definitivo de compensação</b>, registrando a data e a hora da liquidação bancária.</li>
  <li><b>VEDADO</b> aceitar comprovante de agendamento. <b>VEDADO</b> protocolar no e-Marcas antes da quitação efetiva.</li>
</ol>

<h3>5. Checklist pré-protocolo e entrega para Caio</h3>
<p>Complete os 10 itens em <b>Cliente › Checklist & protocolo</b>. Quando todos os itens obrigatórios estiverem ok, clique em “Enviar para Caio”. O protocolo é feito exclusivamente por Caio, que anexa o comprovante oficial na pasta 05.</p>

<h3>6. Acompanhamento semanal (terças-feiras)</h3>
<ul><li>Confira em <b>Vigilância RPI</b> se a revista da semana foi processada (automático) e trate as colidências.</li><li>Atualize os clientes cujos processos tiveram despacho (Carteira INPI › “Avisar cliente”).</li><li>Revise os prazos “a revisar” e delegue.</li><li>Todo processo novo deve ser cadastrado em “Meus Processos” no INPI.</li></ul>

<h3>7. LGPD no dia a dia</h3>
<ul><li>Colete apenas os dados necessários ao serviço;</li><li>Guarde documentos somente na pasta do cliente (nunca em conversas pessoais);</li><li>Não encaminhe documentos de um cliente a terceiros;</li><li>Atenda pedidos de acesso, correção ou exclusão de dados e avise Caio.</li></ul>

<h3>8. Regras de comunicação institucional</h3>
<ul><li>Contratos e propostas sempre em nome da <b>Vora Propriedade Industrial</b> (D1);</li><li>Não mencione OAB ou escritório de advocacia na captação; use o atendimento digital nacional (D2);</li><li>Use apenas o WhatsApp oficial compartilhado e o Gmail da Vora.</li></ul>`;

export async function render(el) {
  el.innerHTML = cabecalho('Manual & playbook de vendas', 'Capacitação comercial (funil, gatilhos e negociação) e regras operacionais da equipe Vora.', '<button class="btn" id="pr">Imprimir</button>', 'Itens 2.3 · 11.1 · 11.2')
    + tabs([['vendas', 'Playbook de vendas'], ['operacional', 'Manual operacional']], aba)
    + `<div class="card prose">${aba === 'vendas' ? VENDAS : OPERACIONAL}</div>`;
  el.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { aba = b.dataset.tab; render(el); });
  el.querySelector('#pr').onclick = () => window.print();
}
