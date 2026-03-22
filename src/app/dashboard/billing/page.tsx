"use client";
import React, { useState } from 'react';

const StatusBadge = ({ status }: { status: string }) => {
  const colors: Record<string, string> = {
    active: 'bg-green-500/20 text-green-400',
    trial: 'bg-yellow-500/20 text-yellow-400',
    past_due: 'bg-red-500/20 text-red-400',
    canceled: 'bg-gray-500/20 text-gray-400',
  };
  const labels: Record<string, string> = { active: 'Ativo', trial: 'Trial', past_due: 'Pagamento Pendente', canceled: 'Cancelado' };
  return <span className={`text-xs px-3 py-1 rounded-full font-bold ${colors[status] || colors.trial}`}>{labels[status] || status}</span>;
};

const PLANS = [
  { id: 'starter', name: 'Starter', price: 'R$ 97/mês', features: ['1 clínica', '300 agendamentos/mês', 'IA WhatsApp', 'Suporte por email'] },
  { id: 'pro', name: 'Pro', price: 'R$ 197/mês', features: ['3 clínicas', 'Agendamentos ilimitados', 'IA WhatsApp avançada', 'Suporte prioritário', 'Relatórios avançados'], highlighted: true },
  { id: 'enterprise', name: 'Enterprise', price: 'Sob consulta', features: ['Ilimitado', 'Multi-unidade', 'SLA garantido', 'Onboarding dedicado', 'API personalizada'] },
];

export default function BillingPage() {
  const [loading, setLoading] = useState<string | null>(null);
  const currentPlan = 'trial';
  const mockInvoices = [
    { id: 'INV-001', date: '2025-03-01', amount: 'R$ 97,00', status: 'Pago' },
    { id: 'INV-002', date: '2025-02-01', amount: 'R$ 97,00', status: 'Pago' },
  ];

  const handleCheckout = async (plano: string) => {
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
    <div className="max-w-5xl mx-auto space-y-10">
      <div>
        <h2 className="text-2xl font-bold">Plano & Faturamento</h2>
        <p className="text-gray-400 text-sm mt-1">Gerencie sua assinatura e histórico de pagamentos.</p>
      </div>

      {/* Status atual */}
      <div className="bg-[#0a0a20]/40 border border-white/5 rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <p className="text-sm text-gray-400">Seu plano atual</p>
          <div className="flex items-center gap-3 mt-1">
            <h3 className="text-xl font-bold">Plano Starter</h3>
            <StatusBadge status={currentPlan} />
          </div>
          <p className="text-sm text-gray-400 mt-1">Próxima cobrança: <span className="text-white">01/04/2025</span> — R$ 97,00</p>
        </div>
        <button className="px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-medium transition-all">
          Gerenciar Assinatura →
        </button>
      </div>

      {/* Planos disponíveis */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Planos Disponíveis</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PLANS.map(plan => (
            <div key={plan.id} className={`relative rounded-2xl p-6 flex flex-col gap-4 border ${plan.highlighted ? 'bg-[#4a4ae2]/10 border-[#4a4ae2]/40 ring-1 ring-[#4a4ae2]/30' : 'bg-[#0a0a20]/40 border-white/5'}`}>
              {plan.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#4a4ae2] text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">Mais Popular</div>
              )}
              <div>
                <h4 className="font-bold text-lg">{plan.name}</h4>
                <p className="text-2xl font-bold mt-1">{plan.price}</p>
              </div>
              <ul className="flex flex-col gap-2 text-sm text-gray-300 flex-1">
                {plan.features.map(f => <li key={f} className="flex items-center gap-2"><span className="text-[#8080ff]">✓</span>{f}</li>)}
              </ul>
              <button 
                onClick={() => plan.id !== 'enterprise' && handleCheckout(plan.id)}
                disabled={loading === plan.id}
                className={`w-full py-3 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 ${plan.highlighted ? 'bg-[#4a4ae2] hover:bg-[#3a3ab2] shadow-[0_4px_20px_rgba(74,74,226,0.3)]' : 'bg-white/5 hover:bg-white/10 border border-white/10'}`}
              >
                {loading === plan.id ? 'Abrindo...' : plan.id === 'enterprise' ? 'Falar com equipe' : 'Assinar agora'}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Histórico de faturas */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Histórico de Faturas</h3>
        <div className="bg-[#0a0a20]/40 border border-white/5 rounded-2xl overflow-hidden">
          <div className="grid grid-cols-4 px-6 py-3 text-xs text-gray-400 uppercase tracking-widest border-b border-white/5">
            <span>Fatura</span><span>Data</span><span>Valor</span><span>Status</span>
          </div>
          {mockInvoices.map(inv => (
            <div key={inv.id} className="grid grid-cols-4 px-6 py-4 text-sm border-b border-white/5 last:border-0 hover:bg-white/2 transition-colors">
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
