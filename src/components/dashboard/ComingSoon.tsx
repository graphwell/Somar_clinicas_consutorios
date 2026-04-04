"use client";
import React from 'react';
import { useNicho } from '@/context/NichoContext';
import { useRouter } from 'next/navigation';

export default function ComingSoonPage({ title, description }: { title: string, description?: string }) {
  const { labels } = useNicho();
  const router = useRouter();

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center space-y-8 animate-premium">
      <div className="w-24 h-24 rounded-[2.5rem] bg-primary-soft text-primary flex items-center justify-center shadow-2xl shadow-primary/20 border border-primary/10">
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
          <path d="M20 5C20 5 28 10 28 20c0 4.418-3.582 8-8 8s-8-3.582-8-8C12 10 20 5 20 5z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
          <path d="M20 33v2M16 35h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          <circle cx="20" cy="20" r="3" fill="currentColor"/>
        </svg>
      </div>
      
      <div className="space-y-2">
        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary opacity-60">Em Desenvolvimento</p>
        <h1 className="text-4xl font-black italic uppercase tracking-tighter text-text-main shrink-0">
          {title}
        </h1>
      </div>

      <p className="max-w-md text-sm text-text-muted font-medium italic leading-relaxed opacity-70">
        {description || `Estamos refinando a experiência de ${title} para garantir o padrão Synka de excelência. Em breve disponível para sua unidade.`}
      </p>

      <button 
        onClick={() => router.push('/dashboard')}
        className="px-10 py-5 bg-white border border-card-border rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm"
      >
        ← Voltar ao Painel
      </button>

      <div className="pt-10 flex gap-4 items-center opacity-30">
        <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
        <div className="w-2 h-2 rounded-full bg-primary animate-pulse delay-75"></div>
        <div className="w-2 h-2 rounded-full bg-primary animate-pulse delay-150"></div>
      </div>
    </div>
  );
}
