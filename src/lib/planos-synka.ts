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

export const PLANOS: Record<string, PlanoInfo> = {
  trial: {
    id: 'trial',
    nome: 'Trial 15 Dias',
    descricao: 'Experimente todas as funções grátis',
    precoBRL: 0,
    stripePriceId: '', // trial não passa pro Stripe
    features: ['Agendamento Ilimitado', 'WhatsApp Bot', 'Acesso completo ao Business']
  },
  start: {
    id: 'start',
    nome: 'Start',
    descricao: 'Para começar com o pé direito',
    precoBRL: 37.90,
    stripePriceId: process.env.STRIPE_PRICE_START || '',
    features: ['1 profissional', 'Link de agendamento público', 'Lembrete WhatsApp automático', 'Confirmação de presença', 'Instância WhatsApp central']
  },
  solo: {
    id: 'solo',
    nome: 'Solo',
    descricao: 'Para profissionais autônomos',
    precoBRL: 79.00,
    stripePriceId: process.env.STRIPE_PRICE_SOLO || '',
    features: ['Até 2 profissionais', 'WhatsApp próprio conectado', 'Prontuário eletrônico', 'Financeiro básico', 'Convênios']
  },
  pro: {
    id: 'pro',
    nome: 'Pro',
    descricao: 'Para clínicas em crescimento',
    precoBRL: 127.00,
    stripePriceId: process.env.STRIPE_PRICE_PRO || '',
    features: ['Até 5 profissionais', 'Financeiro completo', 'Marketing e campanhas', 'Combos e upsell', 'Planos de assinatura', 'Relatórios completos']
  },
  business: {
    id: 'business',
    nome: 'Business',
    descricao: 'Para clínicas e redes estabelecidas',
    precoBRL: 197.00,
    stripePriceId: process.env.STRIPE_PRICE_BUSINESS || '',
    features: ['Até 10 profissionais', 'Prontuário com IA e voz', 'Suporte prioritário', 'API de integração', 'Multi-unidades em breve']
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

export function getUpsells(upsellIds: string[]): UpsellInfo[] {
  if (!upsellIds || !Array.isArray(upsellIds)) return [];
  return upsellIds.map(id => UPSELLS[id]).filter(Boolean);
}
