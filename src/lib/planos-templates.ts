// Templates prontos para ativar com 1 clique.
// O dono ativa e personaliza depois.

export interface ServicoTemplate {
  /** Para templates genéricos: preenchido dinamicamente com IDs reais da clínica.
   *  Para templates de nicho: nome do serviço para busca case-insensitive. */
  nome?:       string;
  servicoId?:  string;
  nomeServico?: string;
  tipo:        'ilimitado' | 'limitado';
  quantidade:  number | null;
}

export interface PlanoTemplate {
  templateTipo:          'basico' | 'premium' | 'vip' | 'corte_mensal' | 'combo_corte_barba' | 'black_ilimitado';
  /** null = vale para todos os nichos; 'barbearia' | 'clinica' = exclusivo do nicho */
  nichoAlvo:             'barbearia' | 'clinica' | null;
  nome:                  string;
  descricao:             string;
  valor:                 number;
  periodicidade:         string;
  agendamentoPrioritario: boolean;
  descontoProdutos:      number | null;
  descontoServicosExtras: number | null;
  /** Strings: 'seg'|'ter'|'qua'|'qui'|'sex'|'sab'|'dom'. Vazio = sem restrição. */
  diasPermitidos:        string[];
  servicos:              ServicoTemplate[];
  preview: {
    titulo:  string;
    exemplo: string[];
  };
}

export const PLANOS_TEMPLATES: Record<string, PlanoTemplate> = {

  // ── Genéricos (todos os nichos) ─────────────────────────────────────────────

  basico: {
    templateTipo:           'basico',
    nichoAlvo:              null,
    nome:                   'Plano Essencial',
    descricao:              'Ideal para começar',
    valor:                  89.90,
    periodicidade:          'mensal',
    agendamentoPrioritario: false,
    descontoProdutos:       null,
    descontoServicosExtras: 5,
    diasPermitidos:         [],
    servicos:               [],
    preview: {
      titulo:  'Plano Essencial',
      exemplo: [
        '2× por serviço por mês',
        '5% OFF em serviços extras',
        'Agendamento normal',
      ],
    },
  },

  premium: {
    templateTipo:           'premium',
    nichoAlvo:              null,
    nome:                   'Plano Premium',
    descricao:              'O mais escolhido',
    valor:                  149.90,
    periodicidade:          'mensal',
    agendamentoPrioritario: true,
    descontoProdutos:       10,
    descontoServicosExtras: 10,
    diasPermitidos:         [],
    servicos:               [],
    preview: {
      titulo:  'Plano Premium',
      exemplo: [
        '4× por serviço por mês',
        'Agendamento prioritário',
        '10% OFF em extras e produtos',
      ],
    },
  },

  vip: {
    templateTipo:           'vip',
    nichoAlvo:              null,
    nome:                   'Plano VIP',
    descricao:              'Para clientes especiais',
    valor:                  249.90,
    periodicidade:          'mensal',
    agendamentoPrioritario: true,
    descontoProdutos:       20,
    descontoServicosExtras: 15,
    diasPermitidos:         [],
    servicos:               [],
    preview: {
      titulo:  'Plano VIP',
      exemplo: [
        'Serviços ilimitados',
        'Agendamento exclusivo',
        '20% OFF em produtos',
        '15% OFF em extras',
      ],
    },
  },

  // ── Exclusivos para barbearia ────────────────────────────────────────────────

  corte_mensal: {
    templateTipo:           'corte_mensal',
    nichoAlvo:              'barbearia',
    nome:                   'Corte Mensal',
    descricao:              '2 cortes por mês com desconto em extras',
    valor:                  69.90,
    periodicidade:          'mensal',
    agendamentoPrioritario: false,
    descontoProdutos:       0,
    descontoServicosExtras: 10,
    diasPermitidos:         [],
    servicos: [
      { nome: 'Corte', tipo: 'limitado', quantidade: 2 },
    ],
    preview: {
      titulo:  'Corte Mensal',
      exemplo: [
        '2 cortes por mês',
        '10% OFF em serviços extras',
        'Qualquer dia da semana',
      ],
    },
  },

  combo_corte_barba: {
    templateTipo:           'combo_corte_barba',
    nichoAlvo:              'barbearia',
    nome:                   'Combo Corte + Barba',
    descricao:              '4 cortes e 4 barbas por mês',
    valor:                  129.90,
    periodicidade:          'mensal',
    agendamentoPrioritario: false,
    descontoProdutos:       10,
    descontoServicosExtras: 10,
    diasPermitidos:         [],
    servicos: [
      { nome: 'Corte', tipo: 'limitado', quantidade: 4 },
      { nome: 'Barba', tipo: 'limitado', quantidade: 4 },
    ],
    preview: {
      titulo:  'Combo Corte + Barba',
      exemplo: [
        '4 cortes por mês',
        '4 barbas por mês',
        '10% OFF em produtos e extras',
      ],
    },
  },

  black_ilimitado: {
    templateTipo:           'black_ilimitado',
    nichoAlvo:              'barbearia',
    nome:                   'Plano Black Ilimitado',
    descricao:              'Corte e barba ilimitados de seg a sex',
    valor:                  199.90,
    periodicidade:          'mensal',
    agendamentoPrioritario: true,
    descontoProdutos:       15,
    descontoServicosExtras: 15,
    diasPermitidos:         ['seg', 'ter', 'qua', 'qui', 'sex'],
    servicos: [
      { nome: 'Corte', tipo: 'ilimitado', quantidade: null },
      { nome: 'Barba', tipo: 'ilimitado', quantidade: null },
    ],
    preview: {
      titulo:  'Plano Black Ilimitado',
      exemplo: [
        'Cortes ilimitados',
        'Barbas ilimitadas',
        'Válido de seg a sex',
        '15% OFF em produtos e extras',
      ],
    },
  },
};

/** Templates genéricos (todos os nichos) */
export const TEMPLATES_GENERICOS = Object.values(PLANOS_TEMPLATES).filter(
  t => t.nichoAlvo === null
);

/** Templates exclusivos de barbearia */
export const TEMPLATES_BARBEARIA = Object.values(PLANOS_TEMPLATES).filter(
  t => t.nichoAlvo === 'barbearia'
);
