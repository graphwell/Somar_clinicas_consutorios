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
    features: ['Agendamento Ilimitado', 'WhatsApp Bot', 'Integração MercadoPago']
  },
  solo: {
    id: 'solo',
    nome: 'Plano Solo',
    descricao: 'Indicado para profissionais individuais',
    precoBRL: 79.00,
    stripePriceId: process.env.STRIPE_PRICE_SOLO || '',
    features: ['1 profissional', '1 número de WhatsApp', 'Agendamento completo', 'Confirmação automática', 'Painel de controle simples']
  },
  pro: {
    id: 'pro',
    nome: 'Plano Pro',
    descricao: 'Indicado para pequenas equipes',
    precoBRL: 127.00,
    stripePriceId: process.env.STRIPE_PRICE_PRO || '',
    features: ['Até 5 profissionais', '1 número de WhatsApp', 'Organização de equipe', 'Confirmações automáticas', 'Automação básica']
  },
  business: {
    id: 'business',
    nome: 'Plano Business',
    descricao: 'Indicado para clínicas e salões',
    precoBRL: 197.00,
    stripePriceId: process.env.STRIPE_PRICE_BUSINESS || '', 
    features: ['Até 10 profissionais', '1 número de WhatsApp', 'Automações avançadas', 'Prioridade de suporte']
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
