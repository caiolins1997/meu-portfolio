// Classificação Internacional de Nice (NCL) — títulos resumidos e sugestão por palavras-chave.
export const NICE = {
  1: 'Produtos químicos para indústria, ciência e agricultura', 2: 'Tintas, vernizes, corantes', 3: 'Cosméticos, perfumaria, higiene e limpeza',
  4: 'Óleos e graxas industriais, combustíveis, velas', 5: 'Produtos farmacêuticos, veterinários, suplementos', 6: 'Metais comuns e produtos metálicos',
  7: 'Máquinas e motores', 8: 'Ferramentas manuais, cutelaria', 9: 'Aparelhos eletrônicos, software, óculos, apps',
  10: 'Aparelhos médicos e odontológicos', 11: 'Iluminação, aquecimento, refrigeração, sanitários', 12: 'Veículos e acessórios',
  13: 'Armas de fogo e fogos de artifício', 14: 'Joias, relógios, bijuterias', 15: 'Instrumentos musicais',
  16: 'Papelaria, impressos, embalagens de papel', 17: 'Borracha, plásticos semiacabados, isolantes', 18: 'Couro, bolsas, malas, artigos de selaria',
  19: 'Materiais de construção não metálicos', 20: 'Móveis, espelhos, molduras', 21: 'Utensílios domésticos e de cozinha, vidraria',
  22: 'Cordas, redes, lonas, sacos', 23: 'Fios para uso têxtil', 24: 'Tecidos, roupa de cama e mesa',
  25: 'Vestuário, calçados e chapelaria', 26: 'Rendas, bordados, aviamentos, cabelos postiços', 27: 'Tapetes, capachos, revestimentos de piso',
  28: 'Jogos, brinquedos, artigos esportivos', 29: 'Carnes, laticínios, conservas, alimentos processados', 30: 'Café, açúcar, pães, doces, massas, sorvetes, temperos',
  31: 'Produtos agrícolas in natura, animais vivos, ração', 32: 'Cervejas, águas, sucos e refrigerantes', 33: 'Bebidas alcoólicas (exceto cervejas)',
  34: 'Tabaco e artigos para fumantes', 35: 'Publicidade, gestão de negócios, comércio varejista/atacadista', 36: 'Seguros, finanças, imobiliário',
  37: 'Construção civil, reparos, instalação', 38: 'Telecomunicações, rádio e TV (transmissão)', 39: 'Transporte, logística, viagens',
  40: 'Tratamento de materiais, impressão sob encomenda', 41: 'Educação, treinamento, entretenimento, esportes, eventos, rádio/TV (programas)', 42: 'Serviços científicos, tecnologia, software (SaaS), design',
  43: 'Restaurantes, bares, hotéis, hospedagem, buffet', 44: 'Serviços médicos, estéticos, salões, spa, barbearia, veterinária', 45: 'Serviços jurídicos, segurança, serviços pessoais e sociais',
};

const MAPA = [
  [/roupa|vestu[aá]rio|moda|camis|cal[cç]ad|t[eê]nis|bon[eé]|lingerie|biqu[ií]ni|fitness wear/i, [25, 35]],
  [/loja|varej|com[eé]rcio|e-?commerce|atacad|distribui|marketplace|revenda/i, [35]],
  [/restaurante|bar\b|lanchonete|hamburg|pizzar|caf[eé]teria|delivery|food|bistr|buffet|hotel|pousada|hostel|hosped/i, [43]],
  [/cerveja|chopp|[aá]gua mineral|suco|refrigerante|energ[eé]tico/i, [32]],
  [/vinho|cacha[cç]a|gin|vodka|whisky|destilad|licor/i, [33]],
  [/doce|bolo|confeit|padaria|p[aã]o|caf[eé]\b|chocolate|sorvete|a[cç]a[ií]/i, [30, 43]],
  [/carne|frios|latic[ií]n|queijo|congelad|marmita/i, [29]],
  [/cosm[eé]tic|perfum|maquiagem|skin ?care|sabonete|shampoo/i, [3]],
  [/sal[aã]o|barbearia|est[eé]tica|spa|cl[ií]nica|odonto|dentista|m[eé]dic|psic[oó]log|fisioter|nutri/i, [44]],
  [/suplement|farm[aá]cia|medicament|manipula/i, [5, 35]],
  [/academia|curso|escola|treinamento|mentoria|evento|show|festa|r[aá]dio|podcast|canal|jornal|not[ií]cia|m[ií]dia|programa/i, [41]],
  [/r[aá]dio|tv\b|televis|streaming|transmiss/i, [38, 41]],
  [/software|aplicativo|\bapp\b|sistema|saas|plataforma|tecnologia|desenvolvimento de sites|ti\b/i, [9, 42]],
  [/joia|bijuteria|rel[oó]gio|semijoia/i, [14]],
  [/bolsa|mochila|carteira|couro|mala/i, [18]],
  [/m[oó]veis|marcenaria|decora[cç][aã]o/i, [20, 35]],
  [/ilumina[cç][aã]o|lumin[aá]ria|l[aâ]mpada|led/i, [11, 35]],
  [/constru[cç][aã]o|reforma|engenharia|instala[cç]/i, [37]],
  [/im[oó]ve|imobili[aá]ria|corretor|financeir|seguro|cr[eé]dito|investimento/i, [36]],
  [/transporte|log[ií]stica|viagem|turismo|frete|mudan[cç]a/i, [39]],
  [/advoca|jur[ií]dic|seguran[cç]a privada|vigil[aâ]ncia/i, [45]],
  [/marketing|publicidade|ag[eê]ncia|consultoria|gest[aã]o|assessoria|contabil/i, [35]],
  [/design|arquitetura|pesquisa|laborat[oó]rio/i, [42]],
  [/brinquedo|esporte|jogo|bicicleta/i, [28]],
  [/pet|ra[cç][aã]o|veterin/i, [31, 44, 35]],
  [/papelaria|gr[aá]fica|livro|revista|embalage/i, [16]],
];

export function sugerirClasses(descricao = '') {
  const out = [];
  for (const [re, cls] of MAPA) if (re.test(descricao)) cls.forEach(c => { if (!out.includes(c)) out.push(c); });
  return out;
}

export const nomeClasse = (n) => NICE[+n] ? `NCL ${String(+n).padStart(2, '0')} — ${NICE[+n]}` : `NCL ${n}`;
