// Templates prontos para ativar com 1 clique.
// O dono ativa e personaliza depois.

export interface PlanoTemplate {
  templateTipo:          'basico' | 'premium' | 'vip';
  nome:                  string;
  descricao:             string;
  valor:                 number;
  periodicidade:         string;
  agendamentoPrioritario: boolean;
  descontoProdutos:      number | null;
  descontoServicosExtras: number | null;
  // Preenchido dinamicamente com os serviços reais da clínica:
  servicos:              any[];
  preview: {
    titulo:  string;
    exemplo: string[];
  };
}

export const PLANOS_TEMPLATES: Record<string, PlanoTemplate> = {
  basico: {
    templateTipo:           'basico',
    nome:                   'Plano Essencial',
    descricao:              'Ideal para começar',
    valor:                  89.90,
    periodicidade:          'mensal',
    agendamentoPrioritario: false,
    descontoProdutos:       null,
    descontoServicosExtras: 5,
    servicos: [],
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
    nome:                   'Plano Premium',
    descricao:              'O mais escolhido',
    valor:                  149.90,
    periodicidade:          'mensal',
    agendamentoPrioritario: true,
    descontoProdutos:       10,
    descontoServicosExtras: 10,
    servicos: [],
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
    nome:                   'Plano VIP',
    descricao:              'Para clientes especiais',
    valor:                  249.90,
    periodicidade:          'mensal',
    agendamentoPrioritario: true,
    descontoProdutos:       20,
    descontoServicosExtras: 15,
    servicos: [],
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
};
