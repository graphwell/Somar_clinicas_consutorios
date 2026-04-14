export interface PlanoInfo {
  id: string;
  nome: string;
  descricao: string;
  precoBRL: number;
  stripePriceId: string;
  features: string[];
}

export interface UpsellInfo {
  id: string;
  nome: string;
  descricao: string;
  precoBRL: number;
  tipo: 'mensal' | 'unico';
  stripePriceId: string;
}

export const TRIAL_DIAS = 30;

export const PLANOS: Record<string, PlanoInfo> = {
  trial: {
    id: 'trial',
    nome: 'Trial 30 Dias',
    descricao: 'Experimente todas as funções grátis por 30 dias',
    precoBRL: 0,
    stripePriceId: '', // trial não passa pro Stripe
    features: ['Agendamento ilimitado', 'Lembretes via WhatsApp', 'Acesso completo ao Business']
  },
  start: {
    id: 'start',
    nome: 'Start',
    descricao: 'Para começar com o pé direito',
    precoBRL: 37.90,
    stripePriceId: process.env.STRIPE_PRICE_START || '',
    features: [
      '1 profissional cadastrado',
      'Link para clientes agendarem online',
      'Lembretes automáticos via WhatsApp',
      'Confirmação de presença automática',
      'Sem precisar de WhatsApp próprio',
    ]
  },
  solo: {
    id: 'solo',
    nome: 'Solo',
    descricao: 'Para profissionais autônomos e pequenas equipes',
    precoBRL: 79.00,
    stripePriceId: process.env.STRIPE_PRICE_SOLO || '',
    features: [
      'Até 2 profissionais',
      'Link para clientes agendarem online',
      'Lembretes via WhatsApp do seu negócio',
      'Ficha digital dos pacientes/clientes',
      'Controle financeiro básico',
      'Gestão de planos de saúde',
    ]
  },
  pro: {
    id: 'pro',
    nome: 'Pro',
    descricao: 'Para clínicas e salões em crescimento',
    precoBRL: 127.00,
    stripePriceId: process.env.STRIPE_PRICE_PRO || '',
    features: [
      'Até 5 profissionais',
      'Tudo do Solo',
      'Campanhas automáticas no WhatsApp',
      'Combos e ofertas no agendamento',
      'Planos de fidelidade para clientes',
      'Relatórios completos de desempenho',
      'Controle financeiro completo',
    ]
  },
  business: {
    id: 'business',
    nome: 'Business',
    descricao: 'Para clínicas estabelecidas e redes',
    precoBRL: 197.00,
    stripePriceId: process.env.STRIPE_PRICE_BUSINESS || '',
    features: [
      'Até 10 profissionais',
      'Tudo do Pro',
      'Ficha digital com IA e transcrição por voz',
      'Suporte com prioridade',
      'Integração com outros sistemas',
      'Múltiplas unidades/filiais em breve',
    ]
  }
};

export const UPSELLS: Record<string, UpsellInfo> = {
  whatsapp_extra: {
    id: 'whatsapp_extra',
    nome: 'Número adicional de WhatsApp',
    descricao: 'Adicione mais um número para dividir atendimento ou equipe',
    precoBRL: 49.00,
    tipo: 'mensal',
    stripePriceId: process.env.STRIPE_PRICE_ADDON_WA || '',
  },
  automacao_ia: {
    id: 'automacao_ia',
    nome: 'Automação com IA',
    descricao: 'Respostas automáticas inteligentes e confirmação avançada',
    precoBRL: 49.00,
    tipo: 'mensal',
    stripePriceId: process.env.STRIPE_PRICE_ADDON_IA || '',
  },
  setup: {
    id: 'setup',
    nome: 'Setup Inicial',
    descricao: 'Configuramos tudo para você começar rápido',
    precoBRL: 97.00,
    tipo: 'unico',
    stripePriceId: process.env.STRIPE_PRICE_ADDON_SETUP || '',
  }
};

export function getPlanoInfo(planoId: string): PlanoInfo {
  return PLANOS[planoId.toLowerCase()] || PLANOS['trial'];
}

const NICHOS_BELEZA = ['SALAO_BELEZA', 'BARBEARIA', 'CLINICA_ESTETICA'];

export function planoTrialPorNicho(nicho: string): string {
  return NICHOS_BELEZA.includes(nicho) ? 'pro' : 'business';
}

export function getUpsells(upsellIds: string[]): UpsellInfo[] {
  if (!upsellIds || !Array.isArray(upsellIds)) return [];
  return upsellIds.map(id => UPSELLS[id]).filter(Boolean);
}
