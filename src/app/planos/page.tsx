"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Check, Mail, Smartphone, Globe, ArrowRight, Zap, Target } from 'lucide-react';
import { getAuthToken } from '@/lib/api-utils';

const PLANOS = [
  {
    id: 'solo',
    nome: 'Solo',
    preco: 79,
    indicado: 'Profissionais individuais',
    features: [
      '1 profissional',
      '1 número de WhatsApp',
      'Agendamento completo',
      'Confirmação automática',
      'Painel de controle simples'
    ],
    destaque: false
  },
  {
    id: 'pro',
    nome: 'Pro',
    preco: 127,
    indicado: 'Pequenas equipes',
    features: [
      'Até 5 profissionais',
      '1 número de WhatsApp',
      'Organização de equipe',
      'Confirmações automáticas',
      'Automação básica'
    ],
    destaque: true
  },
  {
    id: 'business',
    nome: 'Business',
    preco: 197,
    indicado: 'Clínicas e salões',
    features: [
      'Até 10 profissionais',
      '1 número de WhatsApp',
      'Automações avançadas',
      'Prioridade de suporte'
    ],
    destaque: false
  }
];

const UPSELLS = [
  { id: 'whatsapp_extra', icon: Smartphone, nome: 'Número adicional de WA', desc: 'Adicione mais um número para dividir atendimento ou equipe', preco: 49, tipo: 'mensal' },
  { id: 'automacao_ia', icon: Globe, nome: 'Automação com IA', desc: 'Respostas automáticas inteligentes e confirmação avançada', preco: 49, tipo: 'mensal' },
  { id: 'setup', icon: Zap, nome: 'Setup inicial', desc: 'Configuramos tudo para você começar rápido', preco: 97, tipo: 'unico' }
];

export default function PricingPage() {
  const router = useRouter();
  const [planoId, setPlanoId] = useState<string>('pro');
  const [upsellsState, setUpsellsState] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Restaurar carrinho do Auth se existir
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem('synka_cart');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.plano) setPlanoId(parsed.plano);
        if (parsed.upsells) setUpsellsState(parsed.upsells);
        
        // Se voltou do login / está logado, disparamos a compra direto
        if (getAuthToken() && parsed.autoCheckout) {
           sessionStorage.removeItem('synka_cart');
           handleSubscribe(parsed.plano, parsed.upsells);
        }
      }
    } catch {}
  }, []);

  const toggleUpsell = (id: string) => {
    setUpsellsState(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const getSomas = () => {
    const p = PLANOS.find(x => x.id === planoId)?.preco || 0;
    const items = UPSELLS.filter(x => upsellsState.includes(x.id));
    
    const mensalUpsell = items.filter(x => x.tipo === 'mensal').reduce((a, b) => a + b.preco, 0);
    const taxaUnica = items.filter(x => x.tipo === 'unico').reduce((a, b) => a + b.preco, 0);

    return {
      mensal: p + mensalUpsell,
      taxaUnica
    };
  };
  const { mensal, taxaUnica } = getSomas();

  const handleSubscribe = async (forcingPlanoId = planoId, forcingUpsells = upsellsState) => {
    setIsProcessing(true);
    const token = getAuthToken();

    // Visitante anônimo
    if (!token) {
      sessionStorage.setItem('synka_cart', JSON.stringify({
        plano: forcingPlanoId,
        upsells: forcingUpsells,
        autoCheckout: true
      }));
      router.push('/auth/login?redirect=/planos');
      return;
    }

    // Já Logado -> Prossegue Checkout Stripe
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ plano: forcingPlanoId, upsells: forcingUpsells })
      });
      
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || 'Erro ao integrar com plataforma de pagamento.');
        setIsProcessing(false);
      }
    } catch (e) {
      alert('Erro inesperado no checkout.');
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#060614] text-white selection:bg-indigo-500/30 font-sans pb-32">
       {/* ── Nav ── */}
       <nav className="relative z-50 w-full bg-white shadow-sm border-b border-gray-100/10 dark:bg-[#060614] dark:border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/">
            <img src="/synka-logo.png" alt="Synka" className="h-10 object-contain invert brightness-0 dark:invert-0" />
          </Link>
          <div className="flex items-center gap-3">
             <Link href="/auth/login" className="text-sm font-semibold text-gray-300 hover:text-white transition-colors">
              Já tenho conta
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative px-6 pt-24 pb-16 text-center max-w-4xl mx-auto">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-indigo-600/20 blur-[120px] rounded-full pointer-events-none" />
        
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-bold mb-6">
          <Target className="w-3 h-3" /> Transparência e Escala
        </div>
        
        <h1 className="text-4xl md:text-6xl font-black mb-6 leading-tight tracking-tight">
          Organize sua agenda e <br className="hidden md:block"/> 
          <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">nunca mais perca clientes</span>
        </h1>
        <p className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto">
          Agendamento automático + confirmação via WhatsApp em um só lugar. Selecione o plano que melhor atende o tamanho da sua equipe.
        </p>
      </section>

      {/* ── Pricing Grid ── */}
      <section className="relative max-w-7xl mx-auto px-6 pb-20 grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        
        {/* Lado Esquerdo: Planos e Upsells */}
        <div className="col-span-1 lg:col-span-8 flex flex-col gap-14">
          
          {/* Cartões de Planos */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {PLANOS.map(p => (
              <div 
                key={p.id} 
                className={`relative flex flex-col rounded-3xl p-6 transition-all cursor-pointer ${
                  planoId === p.id 
                    ? p.destaque 
                        ? 'bg-gradient-to-b from-[#1c1c3c] to-[#121226] border-2 border-indigo-500 shadow-[0_0_40px_-10px_rgba(99,102,241,0.3)] scale-100 md:scale-105 z-10'
                        : 'bg-[#121226] border-2 border-indigo-500/50 scale-100'
                    : 'bg-[#0a0a1a] border border-white/10 hover:border-white/20 hover:bg-[#121226]'
                }`}
                onClick={() => setPlanoId(p.id)}
              >
                {p.destaque && <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-indigo-500 text-white text-[10px] uppercase font-black tracking-widest rounded-full shadow-lg">MAIS ESCOLHIDO</div>}
                
                <h3 className="text-xl font-bold mb-1">{p.nome}</h3>
                <p className="text-xs text-gray-400 mb-6 h-8">{p.indicado}</p>
                
                <div className="mb-6">
                  <span className="text-3xl font-black">R$ {p.preco}</span>
                  <span className="text-sm text-gray-500">/mês</span>
                </div>

                <div className="w-full h-px bg-white/5 mb-6" />

                <ul className="flex-1 space-y-4 mb-8">
                  {p.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-gray-300">
                      <Check className="w-4 h-4 mt-0.5 text-indigo-400 shrink-0" /> {f}
                    </li>
                  ))}
                </ul>

                {/* Botão de Rádio Visual */}
                <div className={`w-full py-3 rounded-xl text-center text-sm font-bold transition-colors ${
                  planoId === p.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25' : 'bg-white/5 text-gray-400'
                }`}>
                  {planoId === p.id ? 'Selecionado' : `Escolher ${p.nome}`}
                </div>
              </div>
            ))}
          </div>

          {/* Upsells */}
          <div>
            <h3 className="text-2xl font-bold mb-2">Potencialize sua assinatura (Opcional)</h3>
            <p className="text-sm text-gray-400 mb-6">Integre ferramentas de automação avançada.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {UPSELLS.map(u => {
                const isSelected = upsellsState.includes(u.id);
                return (
                  <label key={u.id} className={`flex flex-col rounded-2xl p-5 border cursor-pointer transition-all ${
                    isSelected ? 'bg-indigo-500/10 border-indigo-500/50' : 'bg-[#0a0a1a] border-white/10 hover:border-white/20'
                  }`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className={`p-2 rounded-xl shrink-0 ${isSelected ? 'bg-indigo-500/20 text-indigo-400' : 'bg-white/5 text-gray-400'}`}>
                         <u.icon className="w-5 h-5" />
                      </div>
                      <input type="checkbox" className="sr-only" checked={isSelected} onChange={() => toggleUpsell(u.id)} />
                      <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                        isSelected ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-gray-600 bg-transparent'
                      }`}>
                         {isSelected && <Check className="w-3 h-3" />}
                      </div>
                    </div>
                    
                    <h4 className="font-bold text-sm mb-1">{u.nome}</h4>
                    <p className="text-[11px] text-gray-400 mb-4 h-8">{u.desc}</p>
                    
                    <div className="mt-auto flex items-end justify-between">
                      <span className="text-lg font-black text-indigo-300">+R$ {u.preco}</span>
                      <span className="text-[10px] text-gray-500 uppercase font-black">{u.tipo}</span>
                    </div>
                  </label>
                )
              })}
            </div>
          </div>
        </div>

        {/* Lado Direito: Resumo do Carrinho (Fixo em Desktop) */}
        <div className="col-span-1 lg:col-span-4 lg:sticky lg:top-28">
          <div className="bg-gradient-to-b from-[#121226] to-[#0a0a1a] border border-white/10 rounded-3xl p-6 shadow-2xl">
            <h3 className="font-bold text-lg mb-6 border-b border-white/10 pb-4">Resumo da Assinatura</h3>

            {/* Plano Base */}
            <div className="flex justify-between items-center mb-4">
               <div>
                 <p className="font-bold text-gray-200">Plano {PLANOS.find(x => x.id === planoId)?.nome}</p>
                 <p className="text-xs text-gray-500">Cobrança mensal</p>
               </div>
               <span className="font-bold">R$ {PLANOS.find(x => x.id === planoId)?.preco}</span>
            </div>

            {/* Linhas Opcionais */}
            {upsellsState.map(uId => {
              const u = UPSELLS.find(x => x.id === uId);
              if (!u) return null;
              return (
                <div key={u.id} className="flex justify-between items-center mb-4 pt-2">
                  <div>
                    <p className="text-gray-300 text-sm">{u.nome}</p>
                    <p className="text-[10px] text-gray-500 uppercase">{u.tipo}</p>
                  </div>
                  <span className="font-medium text-sm text-gray-300">R$ {u.preco}</span>
                </div>
              )
            })}

            <div className="w-full h-px bg-white/10 my-6" />

            {/* Totais Agrupados */}
            <div className="space-y-3 mb-8">
              {taxaUnica > 0 && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-400">Total Inicial (Único)</span>
                  <span className="font-bold text-gray-200">R$ {taxaUnica}</span>
                </div>
              )}
              <div className="flex justify-between items-end">
                <span className="text-sm font-bold text-gray-300">Total Mensal</span>
                <div className="text-right">
                  <span className="text-3xl font-black text-indigo-400">R$ {mensal}</span>
                  <p className="text-[10px] text-gray-500">/ mês</p>
                </div>
              </div>
            </div>

            <button 
              onClick={() => handleSubscribe()}
              disabled={isProcessing}
              className="w-full flex items-center justify-center gap-2 py-4 px-6 rounded-xl text-white font-bold transition-all shadow-lg hover:shadow-indigo-500/25 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              {isProcessing ? 'Preparando segurança...' : 'Finalizar assinatura'}
              {!isProcessing && <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
            </button>

            <div className="mt-4 flex flex-col items-center gap-2 text-center">
               <p className="text-[10px] text-gray-500">
                 Garantia incondicional de 7 dias ou seu dinheiro de volta. <br/> Cancele a qualquer momento.
               </p>
               <div className="flex gap-2">
                 <img src="https://upload.wikimedia.org/wikipedia/commons/b/ba/Stripe_Logo%2C_revised_2016.svg" alt="Stripe" className="h-4 opacity-50 contrast-0" />
               </div>
            </div>

          </div>
        </div>

      </section>
    </div>
  );
}
