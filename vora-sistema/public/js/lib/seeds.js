// Dados iniciais (carregados no primeiro start do servidor). Tudo é editável no sistema.

const LGPD = 'Seus dados são tratados conforme a Lei Geral de Proteção de Dados (Lei nº 13.709/2018) e usados apenas para este atendimento.';

export const MENSAGENS = [
  // ---- Playbook 10.1 a 10.8 ----
  { codigo: '10.1', categoria: 'Recepção', titulo: 'Boas-vindas ao WhatsApp', texto: `Olá, {{nome}}! Tudo bem? 👋\n\nAqui é {{responsavel}}, da *Vora Propriedade Industrial* — especialistas em registro e proteção de marcas no INPI, com atendimento digital em todo o Brasil.\n\nVou te ajudar a entender se a sua marca está protegida e quais são os riscos hoje. Pode me contar o nome da sua marca?\n\n🔒 ${LGPD}` },
  { codigo: '10.2', categoria: 'Recepção', titulo: 'Você já ouviu falar de registro de marca?', texto: `{{nome}}, você já ouviu falar de registro de marca? 🤔\n\nQuer entender que direito é esse e se você corre o risco de perder a sua marca?\n\nNo Brasil, quem registra primeiro no INPI é o dono da marca — não quem usa primeiro. Ou seja: mesmo usando o nome há anos, outra pessoa pode registrá-lo e te obrigar a mudar fachada, redes sociais e embalagens.` },
  { codigo: '10.3', categoria: 'Recepção', titulo: 'Como funciona o registro no INPI', texto: `Como funciona o registro de marca no INPI, de forma simples:\n\n1️⃣ *Análise de viabilidade* — pesquisamos no banco do INPI se há marcas iguais ou parecidas no seu segmento;\n2️⃣ *Depósito do pedido* — protocolamos o pedido na(s) classe(s) certa(s);\n3️⃣ *Acompanhamento* — monitoramos toda semana a Revista do INPI (prazos, oposições e exigências);\n4️⃣ *Concessão* — com a marca concedida, você tem exclusividade em todo o território nacional por 10 anos, renováveis.\n\nA Vora cuida de todas as etapas para você. ✅` },
  { codigo: '10.4', categoria: 'Recepção', titulo: 'Por que devo me preocupar?', texto: `Por que se preocupar agora, {{nome}}?\n\n⚠️ Sem registro, a marca não é juridicamente sua;\n⚠️ Um concorrente pode registrar o nome e te notificar para parar de usar;\n⚠️ Você pode perder todo o investimento em fachada, Instagram, site e clientela;\n✅ Com o registro, você ganha exclusividade nacional, valoriza o negócio e pode agir contra cópias.\n\nO primeiro passo é saber se a sua marca está livre. A análise é rápida.` },
  { codigo: '10.5', categoria: 'Recepção', titulo: 'Tirar dúvidas', texto: `Fique à vontade para me perguntar o que quiser, {{nome}} 😊\n\nAs dúvidas mais comuns são:\n• Quanto tempo demora? (o INPI leva em média de 12 a 24 meses para decidir, mas a proteção conta desde a data do pedido)\n• Preciso ter CNPJ? (não — pessoa física também pode registrar)\n• Quanto custa? (envio a proposta logo após a análise, com tudo explicado)\n\nQual é a sua principal dúvida?` },
  { codigo: '10.6', categoria: 'Análise', titulo: 'Envio do formulário de análise', texto: `{{nome}}, para fazermos a *análise detalhada e urgente* da sua marca em todo o território nacional, preencha este formulário rápido (leva menos de 2 minutos):\n\n👉 {{link_formulario}}\n\nAssim que recebermos, nossa equipe técnica faz a pesquisa no banco do INPI e te retorna aqui mesmo com os riscos reais e a viabilidade da sua marca.\n\n🔒 ${LGPD}` },
  { codigo: '10.7', categoria: 'Análise', titulo: 'Envio do relatório / análise', texto: `{{nome}}, sua *Análise de Viabilidade da marca {{marca}}* está pronta! 📄\n\nSegue o relatório em PDF. Resumo: viabilidade *{{viabilidade}}*.\n\nNele você encontra as marcas que encontramos no INPI, o nível de risco e a nossa recomendação técnica.\n\nPosso te explicar os pontos principais em um áudio rápido?` },
  { codigo: '10.8', categoria: 'Fechamento', titulo: 'Fechamento: contrato, procuração e pagamento', texto: `Perfeito, {{nome}}! Vamos proteger a marca *{{marca}}* 🚀\n\nPara darmos andamento, são 3 passos simples:\n\n1️⃣ *Assinatura digital* do contrato e da procuração (link a seguir, pelo celular mesmo);\n2️⃣ *Documentos*: {{documentos}};\n3️⃣ *Pagamento dos honorários* ({{valor}}) via PIX, cartão ou boleto — link seguro do Asaas.\n\nAs taxas federais do INPI (GRU) são emitidas no seu nome e pagas diretamente ao governo; eu te envio a guia.\n\nAssim que tudo estiver ok, protocolamos o seu pedido no INPI. 🔒 ${LGPD}` },
  // ---- 10.9 Atualizações por fase do INPI ----
  { codigo: '10.9-protocolo', categoria: 'Atualização INPI', titulo: 'Pedido protocolado', texto: `🎉 {{nome}}, o pedido de registro da marca *{{marca}}* foi protocolado no INPI!\n\nNº do processo: *{{processo}}*\n\nA partir de hoje a sua marca já tem prioridade sobre pedidos posteriores. Seguimos acompanhando semanalmente a Revista do INPI e te avisamos de cada movimentação.` },
  { codigo: '10.9-formal', categoria: 'Atualização INPI', titulo: 'Exame de admissibilidade / formal', texto: `{{nome}}, atualização do processo *{{processo}}* (marca {{marca}}): o pedido está em *exame formal (admissibilidade)* no INPI. É uma fase de conferência documental. Nenhuma ação é necessária da sua parte.` },
  { codigo: '10.9-publicado', categoria: 'Atualização INPI', titulo: 'Publicação para oposição', texto: `{{nome}}, boa notícia! O pedido da marca *{{marca}}* (processo {{processo}}) foi *publicado para oposição* na RPI nº {{rpi}}.\n\nAgora corre o prazo de 60 dias para terceiros se manifestarem. Estamos vigiando e te avisamos se houver qualquer oposição.` },
  { codigo: '10.9-oposicao', categoria: 'Atualização INPI', titulo: 'Oposição recebida — aguardando manifestação', texto: `{{nome}}, atenção: o pedido da marca *{{marca}}* (processo {{processo}}) recebeu uma *oposição* de terceiro, publicada na RPI nº {{rpi}}.\n\nTemos prazo até *{{prazo}}* para apresentar a manifestação à oposição. Vou te enviar a proposta e os detalhes técnicos para defendermos a sua marca.` },
  { codigo: '10.9-merito', categoria: 'Atualização INPI', titulo: 'Exame de mérito', texto: `{{nome}}, o processo *{{processo}}* (marca {{marca}}) entrou em *exame de mérito* no INPI — é a fase em que o examinador decide sobre o registro. Seguimos acompanhando.` },
  { codigo: '10.9-exigencia', categoria: 'Atualização INPI', titulo: 'Exigência formulada', texto: `{{nome}}, o INPI formulou uma *exigência* no processo *{{processo}}* (marca {{marca}}), publicada na RPI nº {{rpi}}. O prazo para cumprimento vai até *{{prazo}}*. Já estamos preparando a resposta e, se precisarmos de algo, te chamo aqui.` },
  { codigo: '10.9-sobrestado', categoria: 'Atualização INPI', titulo: 'Sobrestamento', texto: `{{nome}}, o processo *{{processo}}* (marca {{marca}}) foi *sobrestado* — o INPI aguarda a decisão de outro processo antes de julgar o seu. Isso é comum e seguimos monitorando.` },
  { codigo: '10.9-deferido', categoria: 'Atualização INPI', titulo: 'Deferimento da marca', texto: `🎉 {{nome}}, a marca *{{marca}}* foi *DEFERIDA* pelo INPI (processo {{processo}}, RPI nº {{rpi}})! Vamos às providências finais para a concessão do registro.` },
  { codigo: '10.9-vigor', categoria: 'Atualização INPI', titulo: 'Marca concedida / em vigor', texto: `🏆 Parabéns, {{nome}}! A marca *{{marca}}* está *REGISTRADA e em vigor* (processo {{processo}}). Você tem exclusividade em todo o território nacional por 10 anos.\n\nPara manter a marca protegida contra cópias, recomendamos o *Monitoramento Vora* (vigilância semanal da Revista do INPI). Posso te mandar os detalhes?` },
  { codigo: '10.9-indeferido', categoria: 'Atualização INPI', titulo: 'Indeferimento — prazo de recurso', texto: `{{nome}}, o pedido da marca *{{marca}}* (processo {{processo}}) foi *indeferido* na RPI nº {{rpi}}. Ainda é possível recorrer até *{{prazo}}*. Vou te enviar a análise técnica do despacho e a proposta de recurso.` },
  { codigo: '10.9-recurso', categoria: 'Atualização INPI', titulo: 'Aguardando exame de recurso', texto: `{{nome}}, o recurso do processo *{{processo}}* (marca {{marca}}) está *aguardando exame* pela 2ª instância do INPI. Seguimos acompanhando semanalmente.` },
  { codigo: '10.9-resumo', categoria: 'Atualização INPI', titulo: 'Resumo mensal de vigilância', texto: `📊 *Resumo de Vigilância do Mês — {{marca}}*\n\nStatus do seu processo: *{{fase}}*.\nVigilância Vora nos últimos 30 dias: *{{rpis}} Revistas do INPI (RPIs)* auditadas pela nossa equipe — *{{tentativas}}* tentativas de cópia da sua marca detectadas.\n\nSeguimos protegendo a sua marca. 🛡️ Equipe Vora` },
  // ---- 10.10 Prospecção, follow-up, colidência e declínio ----
  { codigo: '10.10-juceal-email', categoria: 'Prospecção', titulo: 'E-mail de prospecção (JUCEAL)', assunto: '{{socio}}, a marca {{empresa}} já está protegida?', texto: `Olá, {{socio}}, tudo bem?\n\nVi que a {{empresa}} foi aberta recentemente aqui em Alagoas — parabéns pelo novo negócio!\n\nUma dúvida rápida: o nome {{empresa}} já está registrado no INPI? O CNPJ na Junta Comercial não protege a marca. No Brasil, quem registra primeiro no INPI se torna o dono do nome, mesmo que outro já o utilize.\n\nA Vora Propriedade Industrial faz uma análise de viabilidade da sua marca em todo o território nacional, sem custo, e te mostra os riscos reais antes que alguém registre primeiro.\n\nQuer que eu faça a análise? É só responder este e-mail ou chamar no WhatsApp: {{whatsapp}}.\n\nAbraço,\n{{responsavel}}\nVora Propriedade Industrial · vorapi.com.br\n\n${LGPD} Caso não queira receber novos contatos, basta responder "SAIR".` },
  { codigo: '10.10-juceal-whats', categoria: 'Prospecção', titulo: 'WhatsApp de prospecção (JUCEAL)', texto: `Olá, {{socio}}! Tudo bem? Aqui é {{responsavel}}, da Vora Propriedade Industrial.\n\nVi que a *{{empresa}}* foi aberta recentemente — parabéns! 🎉\n\nO nome da empresa já está registrado como marca no INPI? O CNPJ não protege a marca, e quem registra primeiro vira o dono.\n\nPosso fazer uma análise gratuita de viabilidade da sua marca? 🔍` },
  { codigo: '10.10-resposta-email', categoria: 'Prospecção', titulo: 'Resposta rápida a e-mail (direcionar ao WhatsApp)', texto: `Olá, {{nome}}! Obrigado pelo retorno.\n\nPara agilizar, preencha a análise da sua marca neste link (2 minutos): {{link_formulario}}\n\nE se preferir, fale com a gente direto no WhatsApp: {{whatsapp}}. Retornamos com o resultado da análise o mais rápido possível.\n\n{{responsavel}} · Vora Propriedade Industrial` },
  { codigo: 'FU-7', categoria: 'Follow-up', titulo: 'Follow-up 7 dias', texto: `Oi, {{nome}}! Passando para saber se você conseguiu ver a análise da marca *{{marca}}*. Ficou alguma dúvida? Estou por aqui. 😊` },
  { codigo: 'FU-15', categoria: 'Follow-up', titulo: 'Follow-up 15 dias', texto: `{{nome}}, lembrete importante: enquanto a marca *{{marca}}* não for protocolada, qualquer pessoa pode pedir o registro antes de você. Quer que eu reserve a data do seu protocolo esta semana?` },
  { codigo: 'FU-30', categoria: 'Follow-up', titulo: 'Follow-up 30 dias', texto: `Olá, {{nome}}! Já faz um mês da sua análise. Nesse período, o INPI publicou milhares de novos pedidos de marca. Posso refazer a pesquisa da *{{marca}}* para confirmar que ela continua livre?` },
  { codigo: 'FU-60', categoria: 'Follow-up', titulo: 'Follow-up 45/60 dias', texto: `{{nome}}, tudo bem? Tenho uma condição especial de pagamento para protocolar a marca *{{marca}}* este mês (PIX, cartão ou boleto parcelado). Quer que eu te mande os detalhes?` },
  { codigo: 'FU-90', categoria: 'Follow-up', titulo: 'Follow-up 90 dias', texto: `Oi, {{nome}}! Notícia de marca: empresas no Brasil todo têm sido obrigadas a mudar de nome por não terem registro. Não quero que isso aconteça com a *{{marca}}*. Vamos conversar 5 minutos?` },
  { codigo: 'FU-120', categoria: 'Follow-up', titulo: 'Follow-up 120 dias (último)', texto: `{{nome}}, este é meu último contato sobre a marca *{{marca}}*, para não te incomodar. Se quiser protegê-la no futuro, é só me chamar aqui. Desejo muito sucesso para o seu negócio! 🙏` },
  { codigo: '12.2.3', categoria: 'Vigilância', titulo: 'Alerta de colidência (oposição)', texto: `🚨 {{nome}}, *ALERTA DE COLIDÊNCIA* na vigilância Vora!\n\nNa RPI nº {{rpi}} foi publicado o pedido da marca *{{marca_terceiro}}* (processo {{processo_terceiro}}, classe {{classe}}), que pode causar confusão com a sua marca *{{marca}}*.\n\nO prazo para apresentar *oposição* vai até *{{prazo}}*. Segue o alerta técnico em PDF. Recomendamos agir agora para impedir o registro. Posso te enviar a proposta?` },
  { codigo: '12.2.4', categoria: 'Vigilância', titulo: 'Declínio de oposição (registro)', texto: `{{nome}}, conforme conversamos, registramos que você *optou por não apresentar oposição* contra a marca *{{marca_terceiro}}* (processo {{processo_terceiro}}), publicada na RPI nº {{rpi}}.\n\nSegue o Termo de Declínio para sua assinatura. Seguimos monitorando a sua marca *{{marca}}* normalmente. Equipe Vora` },
];

export const SERVICOS = [
  { nome: 'Registro de Marca (1ª classe)', categoria: 'Registro', preco: 1490, adicional: 990, descontoProgressivo: 10, inclui: 'Busca de viabilidade detalhada + depósito + acompanhamento processual + vigilância semanal até o julgamento', recorrente: false },
  { nome: 'Oposição a pedido de registro', categoria: 'Contencioso', preco: 1800, adicional: 0, descontoCliente: 15, recorrente: false },
  { nome: 'Manifestação à oposição', categoria: 'Contencioso', preco: 1800, adicional: 0, descontoCliente: 15, recorrente: false },
  { nome: 'Recurso contra indeferimento', categoria: 'Contencioso', preco: 2200, adicional: 0, descontoCliente: 15, recorrente: false },
  { nome: 'Nulidade de registro (PAN)', categoria: 'Contencioso', preco: 3500, adicional: 0, descontoCliente: 10, recorrente: false },
  { nome: 'Caducidade de registro', categoria: 'Contencioso', preco: 2500, adicional: 0, descontoCliente: 10, recorrente: false },
  { nome: 'Monitoramento de Marca — mensal', categoria: 'Recorrente', preco: 89, adicional: 49, recorrente: 'mensal' },
  { nome: 'Monitoramento de Marca — anual', categoria: 'Recorrente', preco: 890, adicional: 490, recorrente: 'anual' },
  { nome: 'Consultoria em marca (hora)', categoria: 'Consultoria', preco: 450, adicional: 0, recorrente: false },
];

export const CONFIG = {
  empresa: {
    nome: 'Vora',
    razao: 'Vora Assessoria em Propriedade Industrial',
    cnpj: '',
    enderecoContratual: 'Av. da Paz, Jaraguá, Maceió/AL',
    enderecoInstitucional: 'Atendimento digital em todo o Brasil · Maceió/AL',
    whatsapp: '(82) 99996-7696',
    email: 'contato@vorapi.com.br',
    instagram: '@vora.marcas',
    site: 'https://vorapi.com.br',
    diretor: 'Caio César Maia Lins',
    diretorQualificacao: 'Sócio-Administrador / Diretor Técnico',
  },
  linkFormulario: 'https://vorapi.com.br/formulario',
  comissao: {
    faixas: [
      { ate: 4999.99, pct: 15 },
      { ate: 9999.99, pct: 18 },
      { ate: 14999.99, pct: 20 },
      { ate: 24999.99, pct: 22 },
      { ate: null, pct: 25 },
    ],
    metaTrimestral: 30000,
    bonusTrimestral: 2,
    tetoPct: 25,
    regraBoleto: 'proporcional', // proporcional | 50-50
    taxaPadraoAsaas: 3.5,
  },
  vigilancia: { limiarScore: 75, autoRpi: true, ultimaRpi: '' },
  feriadosExtras: [],
  regrasPrazo: null,
  followup: [7, 15, 30, 60, 90, 120],
  portfolio: [
    'Ritz Lagoa da Anta', 'Ritz Suítes', 'Ritz BSM', 'Barrá', 'Braci Resto Bar', 'Ritz Copacabana', 'Ritz Leblon',
    'Singular Hotéis', 'Zena Luxury SPA', 'Zena SPA', 'Lúmina', 'Lune Iluminação', 'Francês FM', 'Jornal da Francês',
    'Francês News', 'Os Cabras da Francês', 'Life Beer', 'RB Régis Barbearia', 'Stil Wear',
  ].map(nome => ({ nome, autorizado: false })),
};

export const POSTS_IDEIAS = [
  { formato: 'Reels', tema: 'CNPJ não é marca: 30 segundos para entender a diferença' },
  { formato: 'Feed', tema: 'Carrossel: 5 sinais de que sua marca corre risco' },
  { formato: 'Feed', tema: 'Caso prático no Brasil: empresa obrigada a trocar de nome' },
  { formato: 'Stories', tema: 'Enquete: sua marca é registrada? Sim / Não / Não sei' },
  { formato: 'Reels', tema: 'Quanto tempo o INPI leva para registrar uma marca?' },
  { formato: 'Feed', tema: 'Notícia de marca da semana + o que aprender com ela' },
  { formato: 'Stories', tema: 'Bastidores: como fazemos a análise de viabilidade' },
  { formato: 'Feed', tema: 'Classes de Nice: em qual classe sua marca entra?' },
];
