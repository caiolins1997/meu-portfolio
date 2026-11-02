// Vocabulário do negócio Vora compartilhado entre as telas.

export const ETAPAS_FUNIL = [
  { id: 'novo', titulo: 'Novo lead', cor: 'var(--sky)', etapa: 'Etapa 3–4' },
  { id: 'contato', titulo: 'Primeiro contato', cor: 'var(--sky)', etapa: 'Etapa 4' },
  { id: 'analise', titulo: 'Análise em andamento', cor: 'var(--violet)', etapa: 'Etapa 5' },
  { id: 'parecer_enviado', titulo: 'Parecer enviado', cor: 'var(--violet)', etapa: 'Etapa 5–6' },
  { id: 'negociacao', titulo: 'Negociação / reunião', cor: 'var(--amber)', etapa: 'Etapas 6–7' },
  { id: 'documentacao', titulo: 'Docs, contrato e procuração', cor: 'var(--amber)', etapa: 'Etapa 8' },
  { id: 'pagamento', titulo: 'Pagamento & GRU', cor: 'var(--emerald)', etapa: 'Etapa 9' },
  { id: 'pronto', titulo: 'Pronto p/ protocolo', cor: 'var(--lime)', etapa: 'Etapa 11' },
  { id: 'protocolado', titulo: 'Protocolado', cor: 'var(--lime)', etapa: 'Etapa 11–12' },
  { id: 'perdido', titulo: 'Não fechou (follow-up)', cor: 'var(--red)', etapa: 'Régua 2.4' },
];
export const etapaNome = (id) => ETAPAS_FUNIL.find(e => e.id === id)?.titulo || id || '—';
export const FECHADOS = ['documentacao', 'pagamento', 'pronto', 'protocolado'];

export const CANAIS = {
  A: 'A · Prospecção ativa (e-mail + WhatsApp)',
  B: 'B · Boca a boca (indicação)',
  C: 'C · Parceria / permuta de mídia',
  D: 'D · Instagram, site e redes',
  E: 'E · Polos empresariais (AL)',
  F: 'Parceiro contador',
};

export const STATUS_ANALISE = [
  { id: 'rascunho_ia', titulo: 'Extração IA / rascunho', cor: 'var(--sky)', quem: 'Agente de IA' },
  { id: 'revisao_colaborador', titulo: 'Conferência do colaborador', cor: 'var(--violet)', quem: 'Colaborador' },
  { id: 'aguardando_caio', titulo: 'Validação de Caio (2 min)', cor: 'var(--amber)', quem: 'Caio' },
  { id: 'aprovado', titulo: 'Aprovado p/ envio', cor: 'var(--emerald)', quem: 'Colaborador' },
  { id: 'enviado', titulo: 'Enviado ao cliente', cor: 'var(--lime)', quem: '—' },
];

export const VIABILIDADE = { alta: ['Alta', 'green'], media: ['Média', 'amber'], baixa: ['Baixa', 'red'] };

export const PASTAS = [
  ['01', '01. Documentos Pessoais e Societários'],
  ['02', '02. Análise de Viabilidade'],
  ['02.1', '02. Análise de Viabilidade › Pesquisa Banco INPI (P.1, P.2…)'],
  ['03', '03. Contrato e Procuração'],
  ['04', '04. Financeiro e Comprovantes (Asaas + GRUs quitadas)'],
  ['05', '05. Processos INPI (checklist, logo .JPG, cópias, protocolo)'],
  ['06', '06. Vigilância e Colidências (alertas + termos de declínio)'],
];

export const CHECKLIST = [
  ['c1', 'Relatório Cadastral completo (CNAEs conferidos) e Análise de Viabilidade aprovada'],
  ['c2', 'Contrato de Prestação de Serviços assinado digitalmente'],
  ['c3', 'Procuração específica para marcas (INPI) assinada'],
  ['c4', 'Documentos do titular (RG/CNH, CPF, Cartão CNPJ e Contrato Social / Certificado MEI)'],
  ['c5', 'GRU emitida no CPF/CNPJ do titular'],
  ['c6', 'CONFERÊNCIA OBRIGATÓRIA DE QUITAÇÃO DA GRU — comprovante definitivo de compensação (vedado agendamento)'],
  ['c7', 'Comprovante de pagamento dos honorários no Asaas'],
  ['c8', 'Logomarca validada no padrão INPI (.JPG, 945×945 px, 300 DPI, fundo branco, até 2 MB) — marcas mistas'],
  ['c9', 'Termo de Ciência de Risco assinado — quando aplicável'],
  ['c10', 'Comprovante oficial de protocolo no e-Marcas (anexado por Caio após o depósito)'],
];

export const STATUS_COLID = [
  { id: 'detectada', titulo: 'Detectada', cor: 'var(--red)' },
  { id: 'analise', titulo: 'Em análise técnica', cor: 'var(--amber)' },
  { id: 'alerta_enviado', titulo: 'Alerta enviado ao cliente', cor: 'var(--violet)' },
  { id: 'oposicao_contratada', titulo: 'Oposição contratada', cor: 'var(--emerald)' },
  { id: 'oposicao_protocolada', titulo: 'Oposição protocolada', cor: 'var(--lime)' },
  { id: 'declinada', titulo: 'Declinada (termo 12.2.4)', cor: 'var(--faint)' },
  { id: 'descartada', titulo: 'Falso positivo', cor: 'var(--faint)' },
];

export const STATUS_PRAZO = [
  { id: 'revisar', titulo: 'A revisar (contagem)', cor: 'var(--amber)' },
  { id: 'aberto', titulo: 'Delegado / aberto', cor: 'var(--sky)' },
  { id: 'execucao', titulo: 'Em execução', cor: 'var(--violet)' },
  { id: 'revisao_caio', titulo: 'Revisão de Caio', cor: 'var(--amber)' },
  { id: 'cumprido', titulo: 'Protocolado / cumprido', cor: 'var(--lime)' },
  { id: 'cancelado', titulo: 'Cancelado / sem ação', cor: 'var(--faint)' },
];

export const COLUNAS_TAREFAS = [
  { id: 'afazer', titulo: 'A fazer', cor: 'var(--sky)' },
  { id: 'fazendo', titulo: 'Fazendo', cor: 'var(--violet)' },
  { id: 'revisao', titulo: 'Revisão de Caio', cor: 'var(--amber)' },
  { id: 'feito', titulo: 'Concluído', cor: 'var(--lime)' },
];

export function badgeViab(v) {
  const [l, c] = VIABILIDADE[v] || ['A definir', ''];
  return `<span class="badge ${c}">${l}</span>`;
}

export function badgePrazo(dias) {
  if (dias === null || dias === undefined) return '<span class="badge amber">conferir data</span>';
  if (dias < 0) return `<span class="badge red">vencido há ${-dias}d</span>`;
  if (dias <= 7) return `<span class="badge red">${dias}d</span>`;
  if (dias <= 15) return `<span class="badge amber">${dias}d</span>`;
  return `<span class="badge green">${dias}d</span>`;
}
