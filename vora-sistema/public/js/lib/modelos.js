// Modelos de documentos (Módulo 6). Minutas-base para revisão do responsável técnico antes do uso.
// Campos ausentes aparecem destacados em amarelo (classe .campo) e podem ser editados direto no documento.
import { esc, fmtCpfCnpj, brl } from '../core.js';
import { br } from './prazos.js';
import { nomeClasse } from './nice.js';

const f = (v, ph) => (v === undefined || v === null || String(v).trim() === '') ? `<span class="campo">[${esc(ph)}]</span>` : esc(v);
const hojeExtenso = () => new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });

export function variaveis(cliente = {}, cfg = {}, extra = {}) {
  const e = cfg.empresa || {};
  return {
    c: cliente, e, x: extra,
    data: hojeExtenso(),
    local: extra.local || 'Maceió/AL',
    outorgada: `<b>${f(e.razao || e.nome, 'Razão social da Vora')}</b>, pessoa jurídica de direito privado inscrita no CNPJ sob o nº ${f(e.cnpj, 'CNPJ da Vora')}, com sede em ${f(e.enderecoContratual, 'endereço do CNPJ da Vora')}, neste ato representada por seu ${esc(e.diretorQualificacao || 'Sócio-Administrador / Diretor Técnico')}, <b>${esc(e.diretor || 'Caio César Maia Lins')}</b>`,
  };
}

function qualificacao(c) {
  if (c.tipoPessoa === 'PJ') {
    return `<b>${f(c.titular || c.razaoSocial, 'Razão social do titular')}</b>, pessoa jurídica de direito privado${c.mei ? ' (Microempreendedor Individual — MEI)' : ''}, inscrita no CNPJ sob o nº ${f(fmtCpfCnpj(c.cpfCnpj), 'CNPJ')}, com sede em ${f(c.endereco, 'endereço completo')}, neste ato representada por ${f(c.representante, 'nome do representante legal')}, ${f(c.representanteQualif, 'nacionalidade, estado civil, profissão')}, inscrito(a) no CPF sob o nº ${f(fmtCpfCnpj(c.representanteCpf), 'CPF do representante')}`;
  }
  return `<b>${f(c.titular || c.nome, 'Nome completo')}</b>, ${f(c.nacionalidade, 'nacionalidade')}, ${f(c.estadoCivil, 'estado civil')}, ${f(c.profissao, 'profissão')}, portador(a) do RG nº ${f(c.rg, 'RG / órgão expedidor')}, inscrito(a) no CPF sob o nº ${f(fmtCpfCnpj(c.cpfCnpj), 'CPF')}, residente e domiciliado(a) em ${f(c.endereco, 'endereço completo')}`;
}

const assinatura = (esq, dir) => `<div class="sign"><div>${esq}</div><div>${dir}</div></div>`;
const cabecalhoPeca = (v, titulo) => `<div class="kicker">Ilmo(a). Sr(a). Diretor(a) de Marcas, Desenhos Industriais e Indicações Geográficas do INPI</div><h1>${titulo}</h1>`;

function procuracao(v, tipo) {
  const c = v.c;
  return `<div class="kicker">Instrumento particular de mandato</div><h1>Procuração — ${tipo}</h1>
  <p><b>OUTORGANTE:</b> ${qualificacao(c)}.</p>
  <p><b>OUTORGADA:</b> ${v.outorgada}.</p>
  <p><b>PODERES:</b> Pelo presente instrumento, o(a) OUTORGANTE nomeia e constitui a OUTORGADA sua bastante procuradora, à qual confere poderes para representá-lo(a) perante o <b>Instituto Nacional da Propriedade Industrial — INPI</b>, em todos os assuntos relativos a <b>marcas</b>, podendo, para tanto: requerer e depositar pedidos de registro; apresentar oposições, manifestações, contrarrazões, recursos administrativos e cumprimento de exigências; requerer e acompanhar Processos Administrativos de Nulidade (PAN), pedidos de caducidade, prorrogações, anotações de transferência, alteração de nome e endereço e demais petições; emitir e acompanhar Guias de Recolhimento da União (GRU); receber notificações e intimações; desistir; e <b>substabelecer</b>, com ou sem reserva de poderes, praticando todos os atos necessários ao fiel cumprimento deste mandato.</p>
  <p><b>OBJETO ESPECÍFICO:</b> Marca <b>${f(c.marca, 'marca')}</b>${c.classes ? `, classe(s) ${esc(c.classes)}` : ''}.</p>
  <p>O(A) OUTORGANTE declara-se ciente de que seus dados pessoais serão tratados exclusivamente para a finalidade deste mandato, em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018).</p>
  <p>${esc(v.local)}, ${v.data}.</p>
  ${assinatura(`${f(c.titular || c.nome, 'Outorgante')}<br><span class="small">OUTORGANTE${c.tipoPessoa === 'PJ' ? ' — p/ representante legal' : ''}</span>`, '<span class="small">Assinatura digital (ZapSign / Autentique)</span>')}`;
}

function contrato(v, { permuta = false } = {}) {
  const c = v.c, x = v.x;
  const pf = c.tipoPessoa !== 'PJ';
  return `<div class="kicker">Contrato de prestação de serviços${permuta ? ' com pagamento por permuta' : ''}</div>
  <h1>Contrato de Prestação de Serviços — Registro de Marca${permuta ? ' (Permuta)' : ''}</h1>
  <p><b>CONTRATANTE:</b> ${qualificacao(c)}.</p>
  <p><b>CONTRATADA:</b> ${v.outorgada}.</p>
  <p>As partes acima qualificadas celebram o presente Contrato de Prestação de Serviços, que se regerá pelas cláusulas seguintes.</p>
  <h2>Cláusula 1ª — Do objeto</h2>
  <p>1.1. A CONTRATADA prestará ao(à) CONTRATANTE serviços técnicos de propriedade industrial para o registro da marca <b>${f(c.marca, 'marca')}</b>, apresentação <b>${f(c.apresentacao, 'nominativa/mista')}</b>, na(s) classe(s) <b>${f(c.classes, 'classes NCL')}</b>, perante o Instituto Nacional da Propriedade Industrial — INPI.</p>
  <p>1.2. Estão <b>incluídos</b>: (a) busca de viabilidade detalhada; (b) preparo e depósito do pedido; (c) acompanhamento processual semanal pela Revista da Propriedade Industrial (RPI); (d) vigilância semanal contra pedidos colidentes até o julgamento do pedido.</p>
  <p>1.3. <b>Não</b> estão incluídos e serão orçados à parte, com desconto de cliente Vora: oposição contra terceiros, manifestação à oposição, recurso contra indeferimento, cumprimento de exigências de mérito, nulidade, caducidade e quaisquer peças contenciosas; bem como as <b>taxas federais (GRUs)</b> do INPI.</p>
  <h2>Cláusula 2ª — ${permuta ? 'Da remuneração por permuta' : 'Dos honorários e da forma de pagamento'}</h2>
  ${permuta ? `
  <p>2.1. Em contraprestação aos honorários dos serviços, avaliados em <b>${f(x.valor ? brl(x.valor) : '', 'valor dos honorários')}</b>, o(a) CONTRATANTE veiculará anúncios da CONTRATADA em seus canais (${f(x.canais, 'rádio, site, perfis, canais')}), com <b>equivalência financeira</b> de igual valor, conforme plano de mídia anexo: ${f(x.planoMidia, 'quantidade, formato e período das inserções')}.</p>
  <p>2.2. As <b>Guias de Recolhimento da União (GRUs)</b> são de responsabilidade <b>exclusiva</b> do(a) CONTRATANTE, que deverá quitá-las nos prazos informados, sob pena de não realização do protocolo.</p>
  <p>2.3. O descumprimento do plano de mídia autoriza a CONTRATADA a cobrar o saldo proporcional em dinheiro, pelo valor de tabela.</p>` : `
  <p>2.1. Pelos serviços descritos, o(a) CONTRATANTE pagará à CONTRATADA o valor de <b>${f(x.valor ? brl(x.valor) : '', 'valor dos honorários')}</b>, por meio de <b>${f(x.formaPagamento, 'PIX / cartão / boleto')}</b>${x.parcelas > 1 ? `, em ${x.parcelas} parcelas` : ''}, via plataforma de pagamentos Asaas.</p>
  <p>2.2. As taxas federais do INPI (GRUs) serão emitidas no CPF/CNPJ do titular e pagas diretamente pelo(a) CONTRATANTE. O protocolo somente será realizado após a <b>compensação efetiva</b> da GRU, não sendo aceito comprovante de agendamento.</p>
  <p>2.3. O atraso no pagamento sujeita o(a) CONTRATANTE a multa de 2% e juros de 1% ao mês, podendo a CONTRATADA suspender os serviços até a regularização.</p>`}
  <h2>Cláusula 3ª — Das obrigações</h2>
  <p>3.1. Compete ao(à) CONTRATANTE fornecer informações e documentos verdadeiros e completos (documentos pessoais/societários, ${pf ? 'CPF' : 'cartão CNPJ e contrato social/certificado MEI'}, arquivo da logomarca, quando houver) e assinar a procuração específica para o INPI.</p>
  <p>3.2. Compete à CONTRATADA executar os serviços com zelo técnico, manter o(a) CONTRATANTE informado(a) de cada movimentação relevante e cumprir os prazos administrativos sob sua responsabilidade.</p>
  <h2>Cláusula 4ª — Da natureza da obrigação</h2>
  <p>4.1. A obrigação da CONTRATADA é <b>de meio</b>. A concessão do registro é ato exclusivo do INPI, não havendo garantia de deferimento. A análise de viabilidade reflete o banco de dados do INPI na data da pesquisa.</p>
  <h2>Cláusula 5ª — Da vigência e rescisão</h2>
  <p>5.1. Este contrato vigora até a decisão final de primeira instância do pedido no INPI. Pode ser rescindido por qualquer das partes mediante aviso escrito, sendo devidos os honorários proporcionais aos serviços já executados; após o protocolo do pedido, os honorários da etapa de depósito não são reembolsáveis.</p>
  <h2>Cláusula 6ª — Da proteção de dados (LGPD)</h2>
  <p>6.1. As partes tratarão os dados pessoais envolvidos exclusivamente para a execução deste contrato e o cumprimento de obrigações legais, em conformidade com a Lei nº 13.709/2018 (LGPD), adotando medidas de segurança adequadas. O(A) CONTRATANTE pode solicitar acesso, correção ou eliminação de seus dados pelos canais oficiais da CONTRATADA.</p>
  <h2>Cláusula 7ª — Da divulgação institucional</h2>
  <p>7.1. O(A) CONTRATANTE autoriza a CONTRATADA a exibir o nome empresarial, a marca e a logomarca objeto deste contrato no portfólio de clientes do site vorapi.com.br e em materiais institucionais, sem qualquer ônus, podendo revogar esta autorização a qualquer tempo mediante comunicação escrita.</p>
  <h2>Cláusula 8ª — Do foro</h2>
  <p>8.1. Fica eleito o foro da Comarca de ${esc(v.local)} para dirimir eventuais controvérsias, com renúncia a qualquer outro.</p>
  <p>E, por estarem de acordo, as partes assinam digitalmente o presente instrumento, que produz efeitos a partir da última assinatura.</p>
  <p>${esc(v.local)}, ${v.data}.</p>
  ${assinatura(`${f(c.titular || c.nome, 'Contratante')}<br><span class="small">CONTRATANTE</span>`, `${esc(v.e.razao || v.e.nome || 'Vora Propriedade Industrial')}<br><span class="small">CONTRATADA</span>`)}`;
}

const pecaBase = (v, titulo, corpo) => {
  const c = v.c, x = v.x;
  return `${cabecalhoPeca(v, titulo)}
  <table><tr><th>Processo de referência</th><td>${f(x.processoTerceiro || x.processo, 'nº do processo (9 dígitos)')}</td></tr>
  <tr><th>Marca impugnada / em exame</th><td>${f(x.marcaTerceiro || c.marca, 'marca')}</td></tr>
  <tr><th>Classe NCL</th><td>${f(x.classe || c.classes, 'classe')}</td></tr>
  <tr><th>Requerente / interessado</th><td>${f(c.titular || c.nome, 'titular')}</td></tr>
  <tr><th>Procuradora</th><td>${esc(v.e.razao || v.e.nome || 'Vora Propriedade Industrial')}</td></tr>
  ${x.rpi ? `<tr><th>RPI de publicação</th><td>${esc(x.rpi)} — ${esc(br(x.dataRpi))}</td></tr>` : ''}</table>
  <p>${qualificacao(c)}, por sua procuradora, vem, respeitosamente, apresentar a presente <b>${titulo.toUpperCase()}</b>, pelas razões de fato e de direito a seguir expostas.</p>
  ${corpo}
  <h2>Dos pedidos</h2>
  <p>${x.pedidos || 'Diante do exposto, requer seja a presente petição conhecida e provida, para os fins acima indicados, com a consequente publicação da decisão na Revista da Propriedade Industrial.'}</p>
  <p>Termos em que pede deferimento.</p><p>${esc(v.local)}, ${v.data}.</p>
  ${assinatura(`${esc(v.e.razao || v.e.nome || 'Vora Propriedade Industrial')}<br><span class="small">Procuradora</span>`, `${esc(v.e.diretor || '')}<br><span class="small">${esc(v.e.diretorQualificacao || '')}</span>`)}`;
};

export const MODELOS = [
  { id: '3.1', grupo: 'Procurações', titulo: 'Procuração — Pessoa Física', pasta: '03', gerar: v => procuracao({ ...v, c: { ...v.c, tipoPessoa: 'PF' } }, 'Pessoa Física') },
  { id: '3.2', grupo: 'Procurações', titulo: 'Procuração — Pessoa Jurídica (MEI)', pasta: '03', gerar: v => procuracao({ ...v, c: { ...v.c, tipoPessoa: 'PJ', mei: true } }, 'Pessoa Jurídica (MEI)') },
  { id: '3.3', grupo: 'Procurações', titulo: 'Procuração — Pessoa Jurídica Geral', pasta: '03', gerar: v => procuracao({ ...v, c: { ...v.c, tipoPessoa: 'PJ' } }, 'Pessoa Jurídica') },
  { id: '4.0', grupo: 'Contratos', titulo: 'Contrato de Prestação de Serviços — Pessoa Física', pasta: '03', gerar: v => contrato({ ...v, c: { ...v.c, tipoPessoa: 'PF' } }) },
  { id: '4.1', grupo: 'Contratos', titulo: 'Contrato de Prestação de Serviços — Pessoa Jurídica', pasta: '03', gerar: v => contrato({ ...v, c: { ...v.c, tipoPessoa: 'PJ' } }) },
  { id: '4.2', grupo: 'Contratos', titulo: 'Contrato com pagamento por Permuta — Pessoa Jurídica', pasta: '03', extras: ['valor', 'canais', 'planoMidia'], gerar: v => contrato({ ...v, c: { ...v.c, tipoPessoa: 'PJ' } }, { permuta: true }) },
  {
    id: '2.2', grupo: 'Termos', titulo: 'Termo de Ciência de Risco (viabilidade baixa/média)', pasta: '05', gerar: v => `<div class="kicker">Termo de ciência e assunção de risco</div><h1>Termo de Ciência de Risco</h1>
    <p>Eu, ${qualificacao(v.c)}, declaro que recebi da Vora Propriedade Industrial o <b>Relatório e Parecer de Análise de Viabilidade</b> da marca <b>${f(v.c.marca, 'marca')}</b>, classe(s) ${f(v.c.classes, 'classes')}, no qual foi apontada viabilidade <b>${f(v.x.viabilidade || v.c.viabilidade, 'baixa/média')}</b> de registro, em razão de: ${f(v.x.motivo, 'anterioridades / fundamentos identificados no parecer')}.</p>
    <p>Declaro estar ciente de que: (i) a decisão sobre o registro é exclusiva do INPI; (ii) o pedido poderá sofrer oposição de terceiros e/ou ser indeferido; (iii) eventuais peças de defesa (manifestação, recurso) e as taxas federais não estão incluídas no pacote contratado; e (iv) os honorários da etapa de depósito não serão reembolsados em caso de indeferimento.</p>
    <p>Ainda assim, por livre decisão, <b>autorizo o protocolo do pedido</b>, assumindo os riscos apontados.</p>
    <p>${esc(v.local)}, ${v.data}.</p>${assinatura(`${f(v.c.titular || v.c.nome, 'Titular')}<br><span class="small">Declarante</span>`, '<span class="small">Assinatura digital</span>')}`,
  },
  {
    id: '12.2.4', grupo: 'Termos', titulo: 'Termo de Declínio de Oposição', pasta: '06', gerar: v => `<div class="kicker">Vigilância de marca</div><h1>Termo de Declínio de Oposição</h1>
    <p>Eu, ${qualificacao(v.c)}, titular da marca <b>${f(v.c.marca, 'marca')}</b>, declaro que fui informado(a) pela Vora Propriedade Industrial, por meio de Alerta de Colidência, da publicação na RPI nº ${f(v.x.rpi, 'RPI')} do pedido de registro da marca <b>${f(v.x.marcaTerceiro, 'marca de terceiro')}</b>, processo nº ${f(v.x.processoTerceiro, 'processo')}, com prazo para oposição até ${f(br(v.x.prazo), 'data')}.</p>
    <p>Declaro que, por livre decisão, <b>opto por NÃO apresentar oposição</b>, ciente de que a eventual concessão do registro a terceiro poderá restringir o uso, a expansão ou a proteção da minha marca, isentando a Vora de qualquer responsabilidade decorrente desta decisão.</p>
    <p>${esc(v.local)}, ${v.data}.</p>${assinatura(`${f(v.c.titular || v.c.nome, 'Titular')}<br><span class="small">Declarante</span>`, '<span class="small">Assinatura digital</span>')}`,
  },
  {
    id: '7.0', grupo: 'Termos', titulo: 'Termo de Autorização de Uso de Marca/Logo (prova social no site)', pasta: '03', gerar: v => `<div class="kicker">Autorização de uso de imagem de marca</div><h1>Termo de Autorização de Uso de Marca e Logomarca</h1>
    <p>${qualificacao(v.c)}, titular da marca <b>${f(v.c.marca, 'marca')}</b>, <b>AUTORIZA</b> a ${v.outorgada} a exibir, a título gratuito, o nome empresarial, a marca e a respectiva logomarca no espaço de portfólio/clientes do site <b>vorapi.com.br</b>, no perfil oficial do Instagram e em apresentações institucionais, exclusivamente para fins de divulgação da carteira de clientes (prova social).</p>
    <p>A autorização é concedida por prazo indeterminado e pode ser revogada a qualquer tempo, mediante comunicação escrita, hipótese em que a Vora retirará o conteúdo em até 10 (dez) dias úteis. O uso respeitará a integridade visual da marca, sem alterações. Os dados envolvidos são tratados conforme a LGPD (Lei nº 13.709/2018).</p>
    <p>${esc(v.local)}, ${v.data}.</p>${assinatura(`${f(v.c.titular || v.c.nome, 'Titular')}<br><span class="small">Autorizante</span>`, `${esc(v.e.razao || v.e.nome || 'Vora Propriedade Industrial')}<br><span class="small">Autorizada</span>`)}`,
  },
  {
    id: '8', grupo: 'Procurações', titulo: 'Substabelecimento de Procurador (INPI)', pasta: '03', extras: ['substabelecido', 'reserva'], gerar: v => `<div class="kicker">Instrumento de substabelecimento</div><h1>Substabelecimento</h1>
    <p><b>SUBSTABELECENTE:</b> ${v.outorgada}, na qualidade de procuradora de ${f(v.c.titular || v.c.nome, 'titular')} (CPF/CNPJ ${f(fmtCpfCnpj(v.c.cpfCnpj), 'documento')}), conforme procuração arquivada no INPI.</p>
    <p><b>SUBSTABELECIDO(A):</b> ${f(v.x.substabelecido, 'nome e qualificação completa do substabelecido')}.</p>
    <p>Pelo presente, a SUBSTABELECENTE substabelece, <b>${v.x.reserva === 'sem' ? 'SEM' : 'COM'} reserva de iguais poderes</b>, os poderes que lhe foram conferidos para atuar perante o INPI no(s) processo(s) nº ${f(v.x.processo, 'nº do processo')}, relativo(s) à marca <b>${f(v.c.marca, 'marca')}</b>.</p>
    <p>${esc(v.local)}, ${v.data}.</p>${assinatura(`${esc(v.e.razao || v.e.nome || 'Vora')}<br><span class="small">Substabelecente</span>`, '<span class="small">Substabelecido(a)</span>')}`,
  },
  {
    id: '5', grupo: 'Notificações', titulo: 'Notificação Extrajudicial — Uso indevido de marca', pasta: '06', extras: ['notificado', 'enderecoNotificado', 'conduta', 'prazoDias'], gerar: v => `<div class="kicker">Notificação extrajudicial</div><h1>Notificação Extrajudicial</h1>
    <table><tr><th>Notificante</th><td>${f(v.c.titular || v.c.nome, 'titular da marca')}</td></tr><tr><th>Notificado(a)</th><td>${f(v.x.notificado, 'nome / razão social do notificado')}</td></tr><tr><th>Endereço</th><td>${f(v.x.enderecoNotificado, 'endereço do notificado')}</td></tr></table>
    <p>${qualificacao(v.c)}, por sua procuradora ${esc(v.e.razao || v.e.nome || 'Vora Propriedade Industrial')}, vem NOTIFICAR Vossa Senhoria nos seguintes termos.</p>
    <p>A Notificante é titular da marca <b>${f(v.c.marca, 'marca')}</b>, objeto do processo/registro nº ${f(v.x.processo, 'nº do processo')} junto ao INPI, na classe ${f(v.c.classes, 'classe')}, o que lhe assegura o uso exclusivo em todo o território nacional (art. 129 da Lei nº 9.279/96 — LPI) e o direito de zelar pela sua integridade material e reputação (art. 130, III, LPI).</p>
    <p>Chegou ao conhecimento da Notificante que Vossa Senhoria vem utilizando ${f(v.x.conduta, 'descrição da conduta: sinal, local, canais, desde quando')}, sinal idêntico ou semelhante, apto a causar confusão ou associação indevida junto ao público consumidor, conduta vedada pelos arts. 189 e 195 da LPI.</p>
    <p>Assim, fica Vossa Senhoria NOTIFICADO(A) para, no prazo de <b>${esc(v.x.prazoDias || '10')} dias</b>, cessar integralmente o uso do sinal, retirando-o de fachadas, embalagens, redes sociais, sites e quaisquer materiais, e confirmar por escrito o cumprimento, sob pena da adoção das medidas administrativas, cíveis e criminais cabíveis, inclusive pedido de indenização (arts. 207 a 210 da LPI).</p>
    <p>${esc(v.local)}, ${v.data}.</p>${assinatura(`${esc(v.e.razao || v.e.nome || 'Vora')}<br><span class="small">p/ Notificante</span>`, '')}`,
  },
  { id: '9.0', grupo: 'Peças INPI', titulo: 'Manifestação à Oposição', pasta: '05', extras: ['processo', 'oponente', 'rpi', 'argumentos'], gerar: v => pecaBase(v, 'Manifestação à Oposição', `
    <h2>Da tempestividade</h2><p>A oposição foi publicada na RPI nº ${f(v.x.rpi, 'RPI')}, sendo a presente manifestação apresentada dentro do prazo de 60 (sessenta) dias previsto no art. 158, §1º, da LPI.</p>
    <h2>Síntese da oposição</h2><p>A oponente, ${f(v.x.oponente, 'nome da oponente')}, alega, em síntese, ${f(v.x.argumentos, 'fundamentos da oposição')}.</p>
    <h2>Das razões para a improcedência</h2>
    <p><b>(a) Ausência de colidência.</b> Os sinais, examinados em seu conjunto (aspectos gráfico, fonético e ideológico), apresentam elementos distintivos suficientes para afastar qualquer risco de confusão ou associação indevida, nos termos do Manual de Marcas do INPI.</p>
    <p><b>(b) Diversidade de mercado.</b> Os produtos/serviços assinalados ${f(v.x.diferencas, 'diferenças de segmento, público e canais')}, o que afasta a afinidade mercadológica exigida pelo art. 124, XIX, da LPI.</p>
    <p><b>(c) Convivência de marcas.</b> O próprio INPI admite a convivência de sinais semelhantes quando ausente risco de confusão, havendo registros coexistentes com o mesmo elemento na classe.</p>`) },
  { id: '9.1', grupo: 'Peças INPI', titulo: 'Oposição — Identidade/semelhança (Art. 124, XIX LPI)', pasta: '06', extras: ['processoTerceiro', 'marcaTerceiro', 'classe', 'rpi', 'processoAnterior'], gerar: v => pecaBase(v, 'Oposição', `
    <h2>Da tempestividade</h2><p>O pedido opugnado foi publicado na RPI nº ${f(v.x.rpi, 'RPI')}, sendo esta oposição apresentada no prazo de 60 (sessenta) dias do art. 158 da LPI.</p>
    <h2>Da anterioridade da Opoente</h2><p>A Opoente é titular da marca <b>${f(v.c.marca, 'marca')}</b> (processo nº ${f(v.x.processoAnterior, 'processo anterior')}), anterior ao pedido opugnado, para assinalar ${f(v.c.especificacao, 'produtos/serviços')}.</p>
    <h2>Da colidência — art. 124, XIX, da LPI</h2>
    <p>Não é registrável como marca a reprodução ou imitação, no todo ou em parte, ainda que com acréscimo, de marca alheia registrada, para distinguir produto ou serviço idêntico, semelhante ou afim, suscetível de causar confusão ou associação com marca alheia. A marca <b>${f(v.x.marcaTerceiro, 'marca opugnada')}</b> reproduz o elemento nominativo principal da marca da Opoente, com identidade/semelhança <b>fonética e gráfica</b>, para assinalar atividades do mesmo segmento mercadológico.</p>
    <h2>Do risco de confusão, da concorrência desleal e do desvio de clientela</h2>
    <p>A coexistência dos sinais induzirá o consumidor a erro quanto à origem dos produtos/serviços, gerando associação indevida e desvio de clientela, prática repudiada pelo art. 195, III, da LPI e pelo art. 10 bis da Convenção da União de Paris.</p>`) },
  { id: '9.2', grupo: 'Peças INPI', titulo: 'Oposição — Ausência de distintividade (Art. 124, VI LPI)', pasta: '06', extras: ['processoTerceiro', 'marcaTerceiro', 'classe', 'rpi'], gerar: v => pecaBase(v, 'Oposição', `
    <h2>Da tempestividade</h2><p>Publicado o pedido na RPI nº ${f(v.x.rpi, 'RPI')}, a oposição é tempestiva (art. 158 da LPI).</p>
    <h2>Da irregistrabilidade — art. 124, VI, da LPI</h2>
    <p>Não é registrável como marca o sinal de caráter genérico, necessário, comum, vulgar ou simplesmente descritivo, quando tiver relação com o produto ou serviço a distinguir, ou aquele empregado comumente para designar uma característica do produto ou serviço. O termo <b>${f(v.x.marcaTerceiro, 'marca opugnada')}</b> ${f(v.x.descritividade, 'explicar por que o termo é descritivo/genérico para os serviços')}, não possuindo a distintividade mínima exigida para a apropriação exclusiva.</p>
    <p>Conceder exclusividade sobre tal expressão impediria os demais agentes do mercado — inclusive a Opoente — de utilizar termo de uso comum e necessário, em afronta à livre concorrência.</p>`) },
  { id: '9.3', grupo: 'Peças INPI', titulo: 'Oposição — Precedência por uso anterior (Art. 129, §1º LPI)', pasta: '06', extras: ['processoTerceiro', 'marcaTerceiro', 'classe', 'rpi', 'usoDesde', 'provas'], gerar: v => pecaBase(v, 'Oposição', `
    <h2>Da tempestividade</h2><p>Publicado o pedido na RPI nº ${f(v.x.rpi, 'RPI')}, a oposição é tempestiva (art. 158 da LPI).</p>
    <h2>Do direito de precedência — art. 129, §1º, da LPI</h2>
    <p>Toda pessoa que, de boa-fé, na data da prioridade ou depósito, usava no País, há pelo menos 6 (seis) meses, marca idêntica ou semelhante, para distinguir ou certificar produto ou serviço idêntico, semelhante ou afim, terá direito de precedência ao registro.</p>
    <p>A Opoente utiliza a marca <b>${f(v.c.marca, 'marca')}</b> de forma contínua e de boa-fé desde ${f(v.x.usoDesde, 'data de início do uso')}, conforme demonstram: ${f(v.x.provas, 'notas fiscais, publicações, redes sociais, contratos, fachada')}.</p>
    <p>Em atenção ao art. 158, §2º, da LPI, a Opoente comprova, nesta data, o depósito de seu próprio pedido de registro (processo nº ${f(v.x.processoAnterior, 'nº do pedido da Opoente')}).</p>`) },
  {
    id: '9.4', grupo: 'Peças INPI', titulo: 'Autorização de Uso de Nome Artístico (Art. 124, XVI LPI)', pasta: '05', extras: ['autorizante', 'cpfAutorizante', 'nomeArtistico'], gerar: v => `<div class="kicker">Art. 124, XV e XVI, da Lei nº 9.279/96</div><h1>Autorização de Uso de Nome Artístico</h1>
    <p>Eu, <b>${f(v.x.autorizante, 'nome civil completo')}</b>, inscrito(a) no CPF sob o nº ${f(v.x.cpfAutorizante, 'CPF')}, conhecido(a) artisticamente como <b>${f(v.x.nomeArtistico, 'nome artístico')}</b>, AUTORIZO ${qualificacao(v.c)} a requerer e manter perante o INPI o registro da marca <b>${f(v.c.marca, 'marca')}</b>, que contém meu nome civil/artístico, na(s) classe(s) ${f(v.c.classes, 'classes')}, bem como a utilizá-la para assinalar os produtos/serviços correspondentes.</p>
    <p>${esc(v.local)}, ${v.data}.</p>${assinatura(`${f(v.x.autorizante, 'Autorizante')}<br><span class="small">Autorizante</span>`, '<span class="small">Assinatura digital</span>')}`,
  },
  { id: '9.5', grupo: 'Peças INPI', titulo: 'Recurso contra Indeferimento (Art. 212 LPI)', pasta: '05', extras: ['processo', 'rpi', 'fundamentoIndeferimento', 'anterioridade'], gerar: v => pecaBase(v, 'Recurso contra Indeferimento', `
    <h2>Da tempestividade</h2><p>O indeferimento foi publicado na RPI nº ${f(v.x.rpi, 'RPI')}. O presente recurso é interposto no prazo de 60 (sessenta) dias do art. 212 da LPI, com efeito suspensivo e devolutivo pleno.</p>
    <h2>Da decisão recorrida</h2><p>O pedido foi indeferido com fundamento em ${f(v.x.fundamentoIndeferimento, 'art. 124, inciso ...')}${v.x.anterioridade ? `, em razão da anterioridade ${esc(v.x.anterioridade)}` : ''}.</p>
    <h2>Das razões de reforma</h2>
    <p><b>(a) Distintividade do conjunto marcário.</b> A marca deve ser examinada em seu conjunto; os elementos que a compõem conferem-lhe identidade própria, inconfundível com a anterioridade citada.</p>
    <p><b>(b) Ausência de afinidade mercadológica.</b> ${f(v.x.diferencas, 'diferenças de produtos/serviços, público-alvo e canais de comercialização')}.</p>
    <p><b>(c) Convivência no INPI.</b> Há registros coexistentes na mesma classe contendo o elemento comum, o que demonstra sua diluição e a possibilidade de convivência.</p>`) },
  { id: '9.6', grupo: 'Peças INPI', titulo: 'Processo Administrativo de Nulidade — PAN (Art. 168 LPI)', pasta: '06', extras: ['processoTerceiro', 'marcaTerceiro', 'classe', 'dataConcessao', 'fundamento'], gerar: v => pecaBase(v, 'Requerimento de Processo Administrativo de Nulidade', `
    <h2>Do cabimento e da tempestividade</h2><p>Nos termos dos arts. 168 e 169 da LPI, a nulidade do registro pode ser declarada administrativamente quando concedido com infringência à Lei, podendo o processo ser instaurado no prazo de 180 (cento e oitenta) dias contados da expedição do certificado de registro (concessão em ${f(br(v.x.dataConcessao), 'data da concessão')}).</p>
    <h2>Do vício na concessão</h2><p>O registro da marca <b>${f(v.x.marcaTerceiro, 'marca')}</b> foi concedido em violação a ${f(v.x.fundamento, 'art. 124, XIX / VI / XXIII da LPI')}, porquanto ${f(v.x.argumentos, 'fatos e fundamentos')}.</p>
    <h2>Do interesse da Requerente</h2><p>A Requerente é titular de direito anterior sobre a marca <b>${f(v.c.marca, 'marca')}</b> e é diretamente prejudicada pela manutenção do registro impugnado.</p>`) },
  { id: '9.7', grupo: 'Peças INPI', titulo: 'Pedido de Caducidade de Registro (Arts. 142/143 LPI)', pasta: '06', extras: ['processoTerceiro', 'marcaTerceiro', 'classe', 'dataConcessao'], gerar: v => pecaBase(v, 'Requerimento de Caducidade', `
    <h2>Do cabimento</h2><p>Conforme o art. 143 da LPI, caducará o registro, a requerimento de qualquer pessoa com legítimo interesse, se, decorridos 5 (cinco) anos da sua concessão, na data do requerimento: I — o uso da marca não tiver sido iniciado no Brasil; ou II — o uso tiver sido interrompido por mais de 5 (cinco) anos consecutivos, ou se, no mesmo prazo, a marca tiver sido usada com modificação que implique alteração de seu caráter distintivo original.</p>
    <h2>Dos fatos</h2><p>O registro da marca <b>${f(v.x.marcaTerceiro, 'marca')}</b> foi concedido em ${f(br(v.x.dataConcessao), 'data da concessão')}, há mais de 5 anos. Em diligências realizadas pela Requerente, ${f(v.x.diligencias, 'buscas em sites, redes sociais, juntas comerciais e mercado')}, não foi identificado uso efetivo da marca para os produtos/serviços registrados.</p>
    <h2>Do legítimo interesse</h2><p>A Requerente utiliza/pretende registrar a marca <b>${f(v.c.marca, 'marca')}</b> no mesmo segmento, sendo o registro caduco um obstáculo injustificado ao seu direito. Requer, nos termos do art. 143, §2º, a intimação do titular para comprovar o uso, sob pena de declaração da caducidade.</p>`) },
];

// ---------- relatórios (Etapas 2.1, 5, 12) ----------
export function relatorioCadastral(c, cfg) {
  const s = (b) => b === true ? 'Sim' : b === false ? 'Não' : f('', 'informar');
  return `<div class="kicker">Afazeres 2.1 · antecede o protocolo</div><h1>Relatório Cadastral</h1>
  <p class="small">Marca: <b>${f(c.marca, 'marca')}</b> · Gerado em ${new Date().toLocaleDateString('pt-BR')}</p>
  <h2>Titular</h2><table>
  <tr><th>Nome do titular (${c.tipoPessoa === 'PJ' ? 'PJ' : 'PF'})</th><td>${f(c.titular || c.nome, 'titular')}</td></tr>
  <tr><th>CPF / CNPJ</th><td>${f(fmtCpfCnpj(c.cpfCnpj), 'documento')}</td></tr>
  <tr><th>Endereço da empresa</th><td>${f(c.endereco, 'endereço')}</td></tr>
  <tr><th>Contato</th><td>${esc(c.email || '')} · ${esc(c.telefone || '')}</td></tr></table>
  <h2>Marca</h2><table>
  <tr><th>Forma de apresentação</th><td>${f(c.apresentacao, 'Nominativa / Mista')}</td></tr>
  <tr><th>Classe(s) NCL</th><td>${String(c.classes || '').split(/[,;\s]+/).filter(Boolean).map(n => esc(nomeClasse(n))).join('<br>') || f('', 'classes')}</td></tr>
  <tr><th>Especificações</th><td>${f(c.especificacao, 'especificação de produtos/serviços')}</td></tr>
  <tr><th>Atividade desenvolvida</th><td>${f(c.descricao, 'atividade')}</td></tr>
  <tr><th>CNAE(s) do CNPJ</th><td>${(c.cnaes || []).map(x => `${esc(x.codigo)} — ${esc(x.descricao)}${x.principal ? ' <b>(principal)</b>' : ''}`).join('<br>') || (c.tipoPessoa === 'PJ' ? f('', 'consultar cartão CNPJ') : 'Pessoa física — não se aplica')}</td></tr>
  <tr><th>Compatibilidade CNAE × classe (Art. 128, §1º LPI)</th><td>${c.cnaeCompativel === true ? 'Compatível — conferido' : c.cnaeCompativel === false ? '<b>Incompatível — ajustar classe/atividade</b>' : f('', 'conferir')}</td></tr>
  <tr><th>Loja física?</th><td>${s(c.lojaFisica)}</td></tr><tr><th>Loja digital?</th><td>${s(c.lojaDigital)}</td></tr>
  <tr><th>Venda de produto físico?</th><td>${s(c.vendaProdutoFisico)}</td></tr>
  <tr><th>Existe logomarca?</th><td>${s(c.temLogo)}</td></tr>
  <tr><th>Marca já utilizada?</th><td>${c.marcaUtilizada ? `Sim, desde ${esc(c.usoDesde || c.tempoMarca || '—')}` : s(c.marcaUtilizada)}</td></tr>
  <tr><th>Localidade</th><td>${esc(c.localidade || '')}</td></tr></table>
  ${c.logoUrl ? `<h2>Logomarca (padrão e-Marcas .JPG)</h2><img class="logo-marca" src="${esc(c.logoUrl)}">` : ''}
  <p class="small">Dados tratados conforme a LGPD (Lei nº 13.709/2018).</p>`;
}

const corViab = { alta: 'alto', media: 'medio', baixa: 'baixo' };
export function relatorioViabilidade(a, c) {
  const colid = a.colidencias || [];
  const linhas = (x) => `<table>
    <tr><th>1. Nº do Processo</th><td>${f(x.numero, '9 dígitos')}</td></tr>
    <tr><th>2. Marca</th><td><b>${f(x.marca, 'marca')}</b></td></tr>
    <tr><th>3. Situação</th><td>${f(x.situacao, 'situação')}</td></tr>
    <tr><th>4. Apresentação</th><td>${f(x.apresentacao, 'apresentação')}</td></tr>
    ${x.imagemUrl ? `<tr><th>4.1. Imagem</th><td><img class="logo-marca" src="${esc(x.imagemUrl)}"></td></tr>` : ''}
    <tr><th>5. Classe de Nice</th><td>${f(x.classe, 'NCL')}</td></tr>
    <tr><th>6. Especificação</th><td>${f(x.especificacao, 'especificação')}</td></tr>
    <tr><th>7. Titular(es)</th><td>${f(x.titulares, 'titular')}</td></tr>
    <tr><th>8. Procurador</th><td>${esc(x.procurador || '—')}</td></tr>
    <tr><th>9. Data de Depósito</th><td>${esc(br(x.deposito) || x.deposito || '—')}</td></tr>
    <tr><th>10. Data de Concessão</th><td>${esc(br(x.concessao) || x.concessao || '—')}</td></tr>
    <tr><th>11. Data de Vigência</th><td>${esc(br(x.vigencia) || x.vigencia || '—')}</td></tr>
    <tr><th>12–14. Publicações (RPI · data · despacho)</th><td>${(x.publicacoes || []).map(p => `RPI ${esc(p.rpi)} · ${esc(br(p.data) || p.data || '')} · ${esc(p.despacho || '')}`).join('<br>') || '—'}</td></tr>
    <tr><th>15. Inteiro Teor</th><td>${esc(x.inteiroTeor || '—')}</td></tr>
    <tr><th>16. Complemento do Despacho</th><td>${esc(x.complemento || '—')}</td></tr>
    <tr><th>Análise de risco</th><td><b>${esc((x.relevancia || '').toUpperCase())}</b> — ${esc(x.comentario || '')}</td></tr>
  </table><p class="small">Dados atualizados até ${esc(br(x.atualizadoAte) || x.atualizadoAte || '[data]')} - Nº da Revista: ${esc(x.revista || '[xxxx]')}</p>`;
  return `<div class="kicker">Relatório e parecer técnico</div><h1>Análise de Viabilidade de Registro — ${f(a.marca, 'marca')}</h1>
  <table><tr><th>Interessado(a)</th><td>${f(c?.titular || c?.nome, 'cliente')}</td></tr>
  <tr><th>Marca pretendida</th><td><b>${f(a.marca, 'marca')}</b></td></tr>
  <tr><th>Classe(s) analisada(s)</th><td>${(a.classesAlvo || []).map(n => esc(nomeClasse(n))).join('<br>') || f('', 'classes')}</td></tr>
  <tr><th>Atividade</th><td>${esc(c?.descricao || '')}</td></tr>
  <tr><th>Abrangência</th><td>Banco de dados do INPI — todo o território nacional</td></tr></table>
  <div class="box ${corViab[a.viabilidade] || ''}"><b>Viabilidade: ${esc((a.viabilidade || 'a definir').toUpperCase())}</b><br>${esc(a.resumo || '')}</div>
  <h2>Metodologia</h2>
  <p>Pesquisa no sistema pePI do INPI nas modalidades <b>Exata</b> e <b>Radical</b> para o termo pretendido e suas variações fonéticas (${esc((a.termos || []).map(t => t.termo).join(', ') || '—')}), com filtragem por ramo de atividade, Classe de Nice e situação processual (registros em vigor e pedidos em andamento), à luz da Lei nº 9.279/96 (LPI) e do Manual de Marcas do INPI.</p>
  <table class="grid"><tr><th>Termo</th><th>Tipo</th><th>Resultados</th><th>Páginas salvas</th></tr>
  ${(a.buscas || []).map(b => `<tr><td>${esc(b.termo)}</td><td>${esc(b.tipo)}</td><td>${esc(b.total ?? '')}</td><td>${esc(b.paginas ?? '')}</td></tr>`).join('') || '<tr><td colspan="4">—</td></tr>'}</table>
  <h2>Anterioridades relevantes (${colid.length})</h2>
  ${colid.length ? colid.map((x, i) => `<h3>${i + 1}. ${esc(x.marca || '')} — Processo ${esc(x.numero || '')}</h3>${linhas(x)}`).join('') : '<p>Não foram localizadas anterioridades impeditivas no segmento analisado.</p>'}
  <h2>Parecer</h2><div>${String(a.parecer || '').split(/\n{2,}/).map(p => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`).join('') || f('', 'parecer técnico')}</div>
  <p class="small">Esta análise reflete o banco de dados do INPI na data da pesquisa e não constitui garantia de registro, ato exclusivo do INPI. Documento confidencial, tratado conforme a LGPD.</p>`;
}

export function alertaColidencia(x, c) {
  return `<div class="kicker">Alerta de vigilância · RPI ${esc(x.rpi)}</div><h1>Alerta de Colidência de Marca</h1>
  <div class="box baixo"><b>Atenção:</b> foi publicado na Revista da Propriedade Industrial pedido de registro que pode colidir com a marca <b>${esc(x.marcaCliente)}</b>. Prazo para oposição: <b>${esc(br(x.prazoOposicao))}</b> (60 dias — art. 158 da LPI).</div>
  <h2>Marca protegida (cliente Vora)</h2><table><tr><th>Titular</th><td>${f(c?.titular || c?.nome, 'cliente')}</td></tr><tr><th>Marca</th><td><b>${esc(x.marcaCliente)}</b></td></tr></table>
  <h2>Pedido de terceiro identificado</h2><table>
  <tr><th>Nº do processo</th><td>${esc(x.processoTerceiro)}</td></tr><tr><th>Marca</th><td><b>${esc(x.marcaTerceiro)}</b></td></tr>
  <tr><th>Apresentação</th><td>${esc(x.apresentacao || '—')}</td></tr><tr><th>Classe(s) NCL</th><td>${esc(x.classes || '—')}${x.mesmaClasse ? ' <b>(mesma classe do cliente)</b>' : ''}</td></tr>
  <tr><th>Especificação</th><td>${esc(x.especificacao || '—')}</td></tr><tr><th>Titular</th><td>${esc(x.titular || '—')}</td></tr>
  <tr><th>Procurador</th><td>${esc(x.procurador || '—')}</td></tr><tr><th>Despacho</th><td>${esc(x.despacho || '—')}</td></tr>
  <tr><th>RPI / data</th><td>${esc(x.rpi)} — ${esc(br(x.dataRpi))}</td></tr></table>
  <h2>Avaliação técnica</h2><p>Grau de semelhança: <b>${esc(x.score)}%</b> — ${esc(x.motivo || '')}. ${esc(x.parecer || 'Recomendamos a apresentação de oposição para impedir o registro e preservar a exclusividade da sua marca.')}</p>
  <p class="small">Dados extraídos da RPI nº ${esc(x.rpi)}. Documento tratado conforme a LGPD.</p>`;
}

export function relatorioMensal(p, c, stats) {
  return `<div class="kicker">Relatório de acompanhamento</div><h1>Relatório Mensal — ${esc(p.marca)}</h1>
  <div class="box alto"><b>Resumo de Vigilância do Mês</b><br>Status do seu processo: <b>${esc(stats.fase)}</b>.<br>Vigilância Vora nos últimos 30 dias: <b>${stats.rpis} Revistas do INPI (RPIs)</b> auditadas pela nossa equipe — <b>${stats.tentativas}</b> tentativas de cópia da sua marca detectadas.</div>
  <h2>Dados do processo</h2><table><tr><th>Titular</th><td>${esc(c?.titular || c?.nome || p.titular || '')}</td></tr>
  <tr><th>Nº do processo</th><td>${esc(p.numero || '')}</td></tr><tr><th>Marca</th><td><b>${esc(p.marca)}</b></td></tr>
  <tr><th>Classe</th><td>${esc(p.classe || '')}</td></tr><tr><th>Apresentação</th><td>${esc(p.apresentacao || '')}</td></tr>
  <tr><th>Depósito</th><td>${esc(br(p.dataDeposito))}</td></tr><tr><th>Situação atual</th><td>${esc(p.situacao || '')}</td></tr></table>
  <h2>Últimas publicações</h2><table class="grid"><tr><th>RPI</th><th>Data</th><th>Despacho</th></tr>
  ${(p.despachos || []).slice(-8).reverse().map(d => `<tr><td>${esc(d.rpi)}</td><td>${esc(br(d.data))}</td><td>${esc(d.despacho)}${d.complemento ? `<br><span class="small">${esc(d.complemento)}</span>` : ''}</td></tr>`).join('') || '<tr><td colspan="3">Sem novas publicações no período.</td></tr>'}</table>
  <p class="small">Dados atualizados até ${new Date().toLocaleDateString('pt-BR')} - Nº da Revista: ${esc(stats.ultimaRpi || '—')}</p>`;
}
