export interface PlanoInfo {
  id: string;
  nome: string;
  descricao: string;
  precoBRL: number;
  stripePriceId: string;
  features: string[];
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
  starter: {
    id: 'starter',
    nome: 'Starter',
    descricao: 'Para profissionais solo e pequenas clínicas começando a crescer',
    precoBRL: 147.00,
    stripePriceId: process.env.STRIPE_PRICE_STARTER || '',
    features: ['Agendamento (Até 3 Profissionais)', 'WhatsApp Bot Básico', 'Relatórios Financeiros', 'Lembretes SMS/Email']
  },
  pro: {
    id: 'pro',
    nome: 'Pro',
    descricao: 'O padrão para a maioria das clínicas estruturadas',
    precoBRL: 297.00,
    stripePriceId: process.env.STRIPE_PRICE_PRO || '',
    features: ['Até 10 Profissionais', 'WhatsApp Bot IA Avançado (Maya)', 'Integrações de Cartão/PIX', 'Odontograma e Prontuários Customizados']
  },
  enterprise: {
    id: 'enterprise',
    nome: 'Enterprise',
    descricao: 'Clínicas grandes com múltiplos polos ou redes',
    precoBRL: 597.00,
    stripePriceId: process.env.STRIPE_PRICE_MAX || '', // Ensure STRIPE_PRICE_MAX in env if needed
    features: ['Profissionais Ilimitados', 'WhatsApp Múltiplas Linhas', 'API Dedicada', 'Consultor Exclusivo Synka']
  }
};

export function getPlanoInfo(planoId: string): PlanoInfo {
  return PLANOS[planoId.toLowerCase()] || PLANOS['trial'];
}
