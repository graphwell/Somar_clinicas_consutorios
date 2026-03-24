"use client";
import React, { useState } from 'react';

const INTEGRATIONS = [
  { id: 'stripe', name: 'Stripe', logo: '💳', status: 'connected', description: 'Pagamentos internacionais e recorrência automática.' },
  { id: 'mercadopago', name: 'Mercado Pago', logo: '🤝', status: 'pending', description: 'Solução líder para clientes na América Latina.' },
  { id: 'pagseguro', name: 'PagSeguro', logo: '🏦', status: 'pending', description: 'Processamento nativo e taxas competitivas.' },
  { id: 'stone', name: 'Stone', logo: '🟢', status: 'pending', description: 'Conciliação bancária direta com sua conta Stone.' },
];

export default function IntegrationsPage() {
  return (
    <div className="max-w-5xl mx-auto space-y-12 pb-40 animate-premium">
      
      {/* Header V2.2 */}
      <div className="py-10 border-b border-slate-50">
        <h2 className="text-4xl font-black italic uppercase tracking-tighter text-text-main">🔗 Hub de <span className="text-primary">Ecossistema</span></h2>
        <p className="text-[10px] font-black text-text-placeholder uppercase tracking-[0.4em] mt-3 opacity-60">Expanda o poder da sua unidade • V2.2 Official</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        {INTEGRATIONS.map((app) => (
          <div key={app.id} className="premium-card p-12 flex flex-col justify-between group h-96 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl group-hover:scale-150 transition-transform" />
            
            <div>
               <div className="flex justify-between items-start mb-10">
                  <div className="w-20 h-20 rounded-[2rem] bg-slate-50 border border-card-border flex items-center justify-center text-4xl shadow-inner group-hover:rotate-6 transition-all">
                    {app.logo}
                  </div>
                  <span className={`text-[9px] font-black uppercase px-4 py-1.5 rounded-full border shadow-sm ${app.status === 'connected' ? 'bg-status-success-bg text-status-success border-status-success/20' : 'bg-slate-50 text-text-placeholder border-card-border'}`}>
                    {app.status === 'connected' ? '✓ Ativo' : '○ Pendente'}
                  </span>
               </div>
               <h3 className="text-2xl font-black italic uppercase text-text-main tracking-tighter mb-4 underline decoration-primary/5 underline-offset-8 decoration-4">{app.name}</h3>
               <p className="text-xs text-text-muted font-medium leading-relaxed italic opacity-70 max-w-[80%]">{app.description}</p>
            </div>

            <div className="mt-12 flex gap-4 relative z-10">
               {app.status === 'connected' ? (
                 <>
                    <button className="flex-1 py-4 bg-white border border-card-border text-text-main rounded-2xl text-[10px] font-black uppercase hover:border-primary/40 transition-all shadow-sm">Configurações</button>
                    <button className="px-6 py-4 bg-status-error-bg text-status-error rounded-2xl text-[10px] font-black uppercase hover:bg-status-error/10 transition-all border border-status-error/10">Sair</button>
                 </>
               ) : (
                 <button className="btn-primary w-full py-5 text-[10px]">Conectar Infraestrutura</button>
               )}
            </div>
          </div>
        ))}
      </div>

      {/* Roadmap Stellar Card */}
      <div className="p-14 bg-text-main rounded-[4rem] text-white relative overflow-hidden group shadow-2xl">
         <div className="absolute top-0 right-0 p-14 opacity-20 grayscale-0 group-hover:rotate-12 transition-transform text-6xl italic font-black">⚡</div>
         <div className="relative z-10 max-w-xl space-y-6">
            <h4 className="text-3xl font-black italic uppercase tracking-tighter">API de Pagamentos & Pix Nativo</h4>
            <p className="text-sm text-slate-400 font-medium leading-relaxed opacity-80">Estamos finalizando a integração para recebimento instantâneo via Pix com conciliação automática na Agenda e Financeiro.</p>
            <div className="flex gap-6 pt-4">
               <button className="px-10 py-5 bg-white text-text-main rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest shadow-xl hover:scale-105 transition-all">Notificar Lançamento</button>
               <button className="px-10 py-5 bg-white/5 border border-white/10 hover:bg-white/10 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all">Ver Roadmap 2025</button>
            </div>
         </div>
      </div>
    </div>
  );
}
