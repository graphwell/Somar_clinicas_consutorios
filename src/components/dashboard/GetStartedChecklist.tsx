"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { fetchWithAuth } from "@/lib/api-utils";
import Card from "@/components/ui/Card";

export default function GetStartedChecklist() {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const [tasks, setTasks] = useState({
    hasTeam: false,
    hasServices: false,
    hasBot: false
  });

  useEffect(() => {
    setMounted(true);
    // Verifica se já foi descartado localmente
    const dismissed = localStorage.getItem("synka_checklist_dismissed");
    if (dismissed === "true") {
      setLoading(false);
      return; // Se fechou, não carrega
    }

    fetchWithAuth("/api/settings/checklist")
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setTasks({
            hasTeam: data.hasTeam,
            hasServices: data.hasServices,
            hasBot: data.hasBot
          });
          // Mostra sempre que carregar (a menos que já tenha fechado no X antes)
          setVisible(true);
        }
      })
      .catch((e) => console.error("Erro no checklist", e))
      .finally(() => setLoading(false));
  }, []);

  const handleDismiss = () => {
    localStorage.setItem("synka_checklist_dismissed", "true");
    setVisible(false);
  };

  if (!mounted || loading || !visible) return null;

  const completedCount = [tasks.hasTeam, tasks.hasServices, tasks.hasBot].filter(Boolean).length;
  const progressPercent = Math.round((completedCount / 3) * 100);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4" onClick={handleDismiss}>
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
      
      <div 
        className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-warm-200 overflow-hidden fade-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Botão de Fechar */}
        <button 
          onClick={handleDismiss} 
          className="absolute top-4 right-4 text-slate-300 hover:text-slate-600 transition-colors z-10"
          title="Dispensar checklist"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>

        <div className="flex flex-col md:flex-row items-stretch">
          
          {/* Esquerda: Infos e Progresso */}
          <div className="w-full md:w-2/5 p-8 bg-gradient-to-br from-sage-50 to-white flex flex-col justify-center border-b md:border-b-0 md:border-r border-warm-200">
            <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-sage-600 mb-6 border border-sage-100">
               <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
            </div>
            <h3 className="font-display text-2xl font-bold text-slate-700 tracking-tight leading-tight mb-2">
              Primeiros Passos
            </h3>
            <p className="text-sm font-medium text-slate-500 mb-8 leading-relaxed">
              Acelere sua operação! Configure esses três pilares essenciais para deixar a plataforma voando.
            </p>

            <div className="space-y-3 mt-auto">
              <div className="flex items-center justify-between text-xs font-bold text-sage-700 uppercase tracking-widest">
                <span>{progressPercent}% Concluído</span>
                <span>{completedCount} de 3</span>
              </div>
              <div className="h-2.5 w-full bg-warm-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-sage-500 rounded-full transition-all duration-700 ease-out" 
                  style={{ width: `${progressPercent}%` }} 
                />
              </div>
            </div>
          </div>

          {/* Direita: Ações */}
          <div className="w-full md:w-3/5 p-8 bg-white">
            <div className="space-y-4">
              
              {/* Item 1 */}
              <Link href="/dashboard/team" onClick={() => setVisible(false)} className={`group flex items-start gap-4 p-4 rounded-xl border transition-all ${tasks.hasTeam ? 'bg-sage-50/50 border-sage-100 opacity-60' : 'bg-white border-warm-200 hover:border-sage-300 hover:shadow-card-hover'}`}>
                <div className={`mt-0.5 w-7 h-7 shrink-0 rounded-full flex items-center justify-center border-2 transition-colors ${tasks.hasTeam ? 'bg-sage-500 border-sage-500 text-white' : 'border-warm-300 bg-warm-50 text-transparent group-hover:border-sage-400'}`}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <div className="flex-1">
                  <h4 className={`text-base font-bold ${tasks.hasTeam ? 'text-sage-700 line-through' : 'text-slate-700'}`}>
                    1. Cadastrar um Profissional
                  </h4>
                  <p className={`text-xs mt-1 leading-relaxed ${tasks.hasTeam ? 'text-sage-600' : 'text-slate-500'}`}>
                    {tasks.hasTeam ? '✓ Sua equipe já possui um profissional cadastrado.' : 'Adicione quem vai realizar os atendimentos na clínica. Eles terão agendas próprias.'}
                  </p>
                </div>
              </Link>

              {/* Item 2 */}
              <Link href="/dashboard/services" onClick={() => setVisible(false)} className={`group flex items-start gap-4 p-4 rounded-xl border transition-all ${tasks.hasServices ? 'bg-sage-50/50 border-sage-100 opacity-60' : 'bg-white border-warm-200 hover:border-sage-300 hover:shadow-card-hover'}`}>
                <div className={`mt-0.5 w-7 h-7 shrink-0 rounded-full flex items-center justify-center border-2 transition-colors ${tasks.hasServices ? 'bg-sage-500 border-sage-500 text-white' : 'border-warm-300 bg-warm-50 text-transparent group-hover:border-sage-400'}`}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <div className="flex-1">
                  <h4 className={`text-base font-bold ${tasks.hasServices ? 'text-sage-700 line-through' : 'text-slate-700'}`}>
                    2. Cadastrar seus Serviços
                  </h4>
                  <p className={`text-xs mt-1 leading-relaxed ${tasks.hasServices ? 'text-sage-600' : 'text-slate-500'}`}>
                    {tasks.hasServices ? '✓ Seus serviços já estão configurados.' : 'Crie a lista de procedimentos que serão opções para o agendamento.'}
                  </p>
                </div>
              </Link>

              {/* Item 3 */}
              <Link href="/dashboard/integrations" onClick={() => setVisible(false)} className={`group flex items-start gap-4 p-4 rounded-xl border transition-all ${tasks.hasBot ? 'bg-sage-50/50 border-sage-100 opacity-60' : 'bg-white border-warm-200 hover:border-sage-300 hover:shadow-card-hover'}`}>
                <div className={`mt-0.5 w-7 h-7 shrink-0 rounded-full flex items-center justify-center border-2 transition-colors ${tasks.hasBot ? 'bg-sage-500 border-sage-500 text-white' : 'border-warm-300 bg-warm-50 text-transparent group-hover:border-sage-400'}`}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <div className="flex-1">
                  <h4 className={`text-base font-bold ${tasks.hasBot ? 'text-sage-700 line-through' : 'text-slate-700'}`}>
                    3. Ligar o WhatsApp (Robô)
                  </h4>
                  <p className={`text-xs mt-1 leading-relaxed ${tasks.hasBot ? 'text-sage-600' : 'text-slate-500'}`}>
                    {tasks.hasBot ? '✓ Robô com WhatsApp já está ativo.' : 'Ative as comunicações e deixe o robô inteligente confirmar os agendamentos sozinho.'}
                  </p>
                </div>
              </Link>

            </div>
            
            <div className="mt-6 flex justify-end">
               <Link href="/dashboard/help" onClick={() => setVisible(false)} className="text-xs font-bold text-slate-400 hover:text-slate-600 uppercase tracking-widest flex items-center gap-1.5 transition-colors">
                 <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                 Ver Central de Ajuda
               </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
