export const RECURSOS = [
  'agenda', 'pacientes', 'financeiro', 'relatorios',
  'prontuario', 'equipe', 'marketing', 'configuracoes',
] as const;

export const ACOES = ['ver', 'criar', 'editar', 'deletar'] as const;

export type Recurso = typeof RECURSOS[number];
export type Acao = typeof ACOES[number];

export interface PermissaoItem {
  recurso: string;
  acao: string;
}

export const PERMISSOES_PADRAO: Record<string, PermissaoItem[]> = {
  admin: [
    // Admin tem acesso total (tratado via role === 'admin' no hook)
    ...RECURSOS.flatMap((recurso) =>
      ACOES.map((acao) => ({ recurso, acao }))
    ),
  ],
  recepcao: [
    { recurso: 'agenda',    acao: 'ver'    },
    { recurso: 'agenda',    acao: 'criar'  },
    { recurso: 'agenda',    acao: 'editar' },
    { recurso: 'pacientes', acao: 'ver'    },
    { recurso: 'pacientes', acao: 'criar'  },
    { recurso: 'pacientes', acao: 'editar' },
    { recurso: 'prontuario', acao: 'ver'   },
  ],
  profissional: [
    { recurso: 'agenda',    acao: 'ver'    },
    { recurso: 'pacientes', acao: 'ver'    },
    { recurso: 'prontuario', acao: 'ver'   },
    { recurso: 'prontuario', acao: 'criar' },
    { recurso: 'prontuario', acao: 'editar'},
  ],
};

export const LABELS_RECURSO: Record<string, string> = {
  agenda:         'Agenda',
  pacientes:      'Pacientes',
  financeiro:     'Financeiro',
  relatorios:     'Relatórios',
  prontuario:     'Prontuário',
  equipe:         'Equipe',
  marketing:      'Marketing',
  configuracoes:  'Configurações',
};

export const LABELS_ACAO: Record<string, string> = {
  ver:     'Ver',
  criar:   'Criar',
  editar:  'Editar',
  deletar: 'Deletar',
};
