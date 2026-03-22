"use client";
import React, { useState } from 'react';

const StatusBadge = ({ status }: { status: string }) => {
  const colors: Record<string, string> = {
    active: 'bg-green-500/20 text-green-400 border-green-500/30',
    trial: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    past_due: 'bg-red-500/20 text-red-400 border-red-500/30',
    canceled: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  };
  const labels: Record<string, string> = { active: '✅ Ativo', trial: '⏳ Trial', past_due: '⚠️ Pagamento Pendente', canceled: '❌ Cancelado' };
  return <span className={`text-xs px-3 py-1 rounded-full font-bold border ${colors[status] || colors.trial}`}>{labels[status] || status}</span>;
};

const PLANS = [
  {
    id: 'trial',
    emoji: '🟢',
    name: 'Trial',
    price: 'Grátis',
    period: '7 dias',
    badge: 'Comece agora',
    color: 'border-green-500/30 bg-green-500/5',
    btnColor: 'bg-green-500/20 hover:bg-green-500/30 border-green-500/50 text-green-400',
    features: ['IA ativa 🔥 (principal)', '1 usuário', '1 WhatsApp conectado', 'Até 100 mensagens', 'Todas as funções', 'Suporte por email'],
    goal: 'Objetivo: encantar rápido',
  },
  {
    id: 'starter',
    emoji: '🔵',
    name: 'Starter',
    price: 'R$ 97',
    period: '/mês',
    badge: 'Pequeno negócio',
    color: 'border-blue-500/30 bg-blue-500/5',
    btnColor: 'bg-blue-500/20 hover:bg-blue-500/30 border-blue-500/50 text-blue-400',
    features: ['1 usuário', '1 WhatsApp', 'IA ativa', 'Agendamento completo', 'Lembretes automáticos', 'Suporte por email'],
    goal: 'Objetivo: pequeno negócio',
  },
  {
    id: 'pro',
    emoji: '🟣',
    name: 'Pro',
    price: 'R$ 197',
    period: '/mês',
    badge: 'Mais popular',
    highlighted: true,
    color: 'border-[#4a4ae2]/50 bg-[#4a4ae2]/8',
    btnColor: 'bg-[#4a4ae2] hover:bg-[#3a3ab2] text-white shadow-[0_4px_20px_rgba(74,74,226,0.3)]',
    features: ['Até 3 usuários', '1 WhatsApp', 'IA mais treinável', 'Mais automações', 'Relatórios avançados', 'Suporte prioritário'],
    goal: 'Objetivo: clínica estruturada',
  },
  {
    id: 'max',
    emoji: '🔴',
    name: 'Max',
    price: 'R$ 397',
    period: '/mês',
    badge: 'Alto volume',
    color: 'border-orange-500/30 bg-orange-500/5',
    btnColor: 'bg-orange-500/20 hover:bg-orange-500/30 border-orange-500/50 text-orange-400',
    features: ['Até 5 usuários', 'Até 3–5 WhatsApps 🔥', 'Múltiplos atendentes', 'Prioridade no suporte', 'Maior volume de mensagens', 'SLA garantido'],
    goal: 'Objetivo: escala e volume',
  },
];

export default function BillingPage() {
  const [loading, setLoading] = useState<string | null>(null);
  const currentStatus = 'trial';

  const mockInvoices = [
    { id: 'INV-001', date: '01/03/2025', amount: 'R$ 97,00', status: 'Pago' },
    { id: 'INV-002', date: '01/02/2025', amount: 'R$ 97,00', status: 'Pago' },
  ];

  const handleCheckout = async (plano: string) => {
    if (plano === 'trial') return;
    setLoading(plano);
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId: 'clinica_id_default', plano, email: 'admin@clinica.com' }),
      });
      const { url } = await res.json();
      if (url) window.location.href = url;
    } finally { setLoading(null); }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-10">
      <div>
        <h2 className="text-2xl font-bold">Plano & Faturamento</h2>
        <p className="text-gray-400 text-sm mt-1">Gerencie sua assinatura e histórico de pagamentos.</p>
      </div>

      {/* Status atual */}
      <div className="bg-[#0a0a20]/40 border border-white/5 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-sm text-gray-400">Plano atual</p>
          <div className="flex items-center gap-3 mt-1">
            <h3 className="text-xl font-bold">🟢 Trial</h3>
            <StatusBadge status={currentStatus} />
          </div>
          <p className="text-sm text-gray-400 mt-2">7 dias gratuitos. Encerra em <span className="text-white font-medium">29/03/2025</span>. Assine para continuar.</p>
        </div>
        <button className="px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-medium transition-all">
          Gerenciar Assinatura →
        </button>
      </div>

      {/* Planos */}
      <div>
        <h3 className="text-lg font-semibold mb-6">Escolha seu Plano</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {PLANS.map(plan => (
            <div key={plan.id} className={`relative rounded-2xl p-6 flex flex-col gap-4 border ${plan.color} ${plan.highlighted ? 'ring-1 ring-[#4a4ae2]/50' : ''}`}>
              {plan.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#4a4ae2] text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                  {plan.badge}
                </div>
              )}
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">{plan.emoji} {plan.name}</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold">{plan.price}</span>
                  <span className="text-gray-400 text-sm">{plan.period}</span>
                </div>
                <p className="text-xs text-gray-500 mt-1 italic">{plan.goal}</p>
              </div>
              <ul className="flex flex-col gap-2 text-sm text-gray-300 flex-1">
                {plan.features.map(f => <li key={f} className="flex items-start gap-2"><span className="mt-0.5 shrink-0">✓</span><span>{f}</span></li>)}
              </ul>
              <button
                onClick={() => handleCheckout(plan.id)}
                disabled={loading === plan.id}
                className={`w-full py-3 rounded-xl text-sm font-semibold transition-all border disabled:opacity-50 ${plan.btnColor}`}
              >
                {plan.id === 'trial' ? 'Plano Atual' : loading === plan.id ? 'Aguarde...' : `Assinar ${plan.name}`}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Faturas */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Histórico de Faturas</h3>
        <div className="bg-[#0a0a20]/40 border border-white/5 rounded-2xl overflow-hidden">
          <div className="hidden sm:grid grid-cols-4 px-6 py-3 text-xs text-gray-500 uppercase tracking-widest border-b border-white/5">
            <span>Fatura</span><span>Data</span><span>Valor</span><span>Status</span>
          </div>
          {mockInvoices.map(inv => (
            <div key={inv.id} className="grid grid-cols-2 sm:grid-cols-4 px-6 py-4 text-sm border-b border-white/5 last:border-0 hover:bg-white/2 transition-colors gap-y-1">
              <span className="text-[#8080ff] font-mono">{inv.id}</span>
              <span className="text-gray-300">{inv.date}</span>
              <span>{inv.amount}</span>
              <span className="text-green-400 font-semibold">{inv.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
