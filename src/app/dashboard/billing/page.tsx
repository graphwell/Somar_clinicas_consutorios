"use client";
import React, { useState } from 'react';

export default function BillingPage() {
  const [invoices] = useState<any[]>([]); // Sem invoices reais no momento do onboarding
  
  return (
    <div className="max-w-4xl mx-auto space-y-10 pb-40">
      
      {/* Header Planos */}
      <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[3rem] p-10 overflow-hidden relative group">
         <div className="absolute top-0 right-0 p-10 text-6xl opacity-10 grayscale group-hover:grayscale-0 transition-all rotate-12">⭐</div>
         <div className="relative z-10">
            <h2 className="text-3xl font-black italic uppercase tracking-tighter">🚀 Plano <span className="text-[var(--accent)]">Professional</span></h2>
            <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mt-2 opacity-60">Status: Assinatura Ativa (Modo Estelar)</p>
            <div className="mt-8 flex gap-4">
               <div className="bg-[var(--accent)] text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-[var(--accent)]/20">Pago Vencimento: 10/Abril</div>
               <div className="bg-white/5 border border-white/10 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-[var(--foreground)]">💳 Cartão: **** 4421</div>
            </div>
         </div>
      </div>

      {/* Grid de Informações Financeiras do Sistema */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
         <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[3rem] p-10">
            <h3 className="text-xs font-black uppercase tracking-widest mb-6 opacity-40">Benefícios Ativos</h3>
            <ul className="space-y-4">
               <li className="flex items-center gap-3 text-[10px] font-bold uppercase"><span className="text-emerald-500">✓</span> Agenda Ilimitada</li>
               <li className="flex items-center gap-3 text-[10px] font-bold uppercase"><span className="text-emerald-500">✓</span> IA Agent (Maya) 24/7</li>
               <li className="flex items-center gap-3 text-[10px] font-bold uppercase"><span className="text-emerald-500">✓</span> CRM de Clientes Avançado</li>
               <li className="flex items-center gap-3 text-[10px] font-bold uppercase"><span className="text-emerald-500">✓</span> Portal de Booking Customizado</li>
            </ul>
         </div>

         <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[3rem] p-10 border-dashed border-gray-600/30 flex flex-col justify-center items-center text-center">
            <p className="text-3xl mb-4">🎁</p>
            <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-4">Tem um cupom de desconto?</p>
            <button className="px-6 py-3 bg-[var(--foreground)]/5 border border-[var(--border)] rounded-xl text-[9px] font-black uppercase hover:bg-[var(--accent)] hover:text-white transition-all">Resgatar Código</button>
         </div>
      </div>

      {/* Tabela de Invoices Reais */}
      <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[3rem] overflow-hidden">
         <div className="p-8 border-b border-[var(--border)] flex justify-between items-center">
            <h3 className="text-xs font-black uppercase tracking-widest">Histórico de Pagamentos</h3>
         </div>
         <div className="p-20 text-center">
            {invoices.length === 0 ? (
               <div className="space-y-4">
                  <p className="text-4xl opacity-10">📄</p>
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-20 italic">Dados de faturamento em processamento pelo Stripe...</p>
               </div>
            ) : (
               <p>Listagem Real de Faturas</p>
            )}
         </div>
      </div>

    </div>
  );
}
