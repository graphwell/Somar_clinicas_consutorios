"use client";
import React, { useState } from 'react';
import { Profissional } from '@/lib/agenda-utils';
import { NichoLabels } from '@/lib/nomenclatures';

interface AgendaSelectionWizardProps {
  profissionais: Profissional[];
  labels: NichoLabels;
  onSelect: (profId: string) => void;
  isMultiSpecialty: boolean;
  onViewGeneral?: () => void;
  isAdmin?: boolean;
}

export default function AgendaSelectionWizard({ 
  profissionais, 
  labels, 
  onSelect, 
  isMultiSpecialty,
  onViewGeneral,
  isAdmin
}: AgendaSelectionWizardProps) {
  const [step, setStep] = useState(isMultiSpecialty ? 'specialty' : 'professional');
  const [selectedSpecialty, setSelectedSpecialty] = useState<string | null>(null);

  const specialties = Array.from(new Set(profissionais.map(p => p.especialidade).filter(Boolean))) as string[];

  const filteredProfs = selectedSpecialty 
    ? profissionais.filter(p => p.especialidade === selectedSpecialty)
    : profissionais;

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 animate-premium">
      <div className="max-w-4xl w-full space-y-12">
        
        <div className="text-center space-y-4">
          <h2 className="text-4xl font-black italic uppercase tracking-tighter text-text-main">
            Vamos começar seu <span className="text-primary italic">agendamento</span>
          </h2>
          <p className="text-[11px] font-black text-text-placeholder uppercase tracking-[0.3em]">
            {step === 'specialty' ? 'Escolha uma especialidade para filtrar' : `Escolha o ${labels.termoProfissional.toLowerCase()} para ver a agenda`}
          </p>
        </div>

        {step === 'specialty' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {specialties.map(spec => (
              <button
                key={spec}
                onClick={() => {
                  setSelectedSpecialty(spec);
                  setStep('professional');
                }}
                className="bg-white border border-card-border p-10 rounded-[3rem] shadow-premium hover:shadow-2xl hover:scale-[1.02] transition-all group flex flex-col items-center text-center space-y-4"
              >
                <div className="w-16 h-16 rounded-3xl bg-primary-soft flex items-center justify-center text-2xl group-hover:rotate-12 transition-transform">
                  🩺
                </div>
                <div>
                  <h4 className="text-lg font-black uppercase italic tracking-tighter text-text-main">{spec}</h4>
                  <p className="text-[8px] font-black text-primary uppercase tracking-[0.2em] mt-1">
                    {profissionais.filter(p => p.especialidade === spec).length} {labels.termoProfissional === 'Médico' ? 'Médicos' : 'Profissionais'}
                  </p>
                </div>
              </button>
            ))}
            {specialties.length === 0 && (
               <div className="col-span-full py-20 text-center opacity-50 italic font-black uppercase tracking-widest text-[10px]">
                  Nenhuma especialidade cadastrada.
               </div>
            )}
          </div>
        )}

        {step === 'professional' && (
          <div className="space-y-8">
            {isMultiSpecialty && selectedSpecialty && (
              <button 
                onClick={() => setStep('specialty')}
                className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline flex items-center gap-2"
              >
                ← Voltar para especialidades
              </button>
            )}
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {filteredProfs.map(p => (
                <button
                  key={p.id}
                  onClick={() => onSelect(p.id)}
                  className="bg-white border border-card-border p-6 rounded-[2.5rem] shadow-premium hover:shadow-2xl hover:scale-[1.05] transition-all group flex flex-col items-center text-center space-y-4"
                >
                  <div className="relative">
                    <div className="w-20 h-20 rounded-full border-4 border-white shadow-xl ring-2 ring-slate-100 overflow-hidden flex items-center justify-center bg-slate-50">
                      {p.fotoUrl ? (
                        <img src={p.fotoUrl} alt={p.nome} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-2xl font-black text-primary/30 uppercase italic">{p.nome[0]}</span>
                      )}
                    </div>
                    {p.color && (
                      <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-4 border-white shadow-sm" style={{ backgroundColor: p.color }} />
                    )}
                  </div>
                  <div>
                    <h4 className="text-[11px] font-black uppercase italic tracking-tighter text-text-main line-clamp-1">{p.nome}</h4>
                    <p className="text-[8px] font-bold text-primary uppercase tracking-widest mt-1 opacity-70">
                      {p.especialidade || labels.termoProfissional}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 🤖 Seção de Sugestões Synka IA */}
        <div className="pt-16 space-y-10 border-t border-slate-100">
           <div className="flex items-center gap-4 justify-center md:justify-start">
              <div className="w-12 h-12 rounded-2x bg-primary flex items-center justify-center text-white text-2xl shadow-lg ring-4 ring-primary/10">🤖</div>
              <div>
                <h4 className="text-sm font-black uppercase tracking-tighter text-text-main italic">Sugestões de Performance <span className="text-primary tracking-widest opacity-60 ml-2">by Synka IA</span></h4>
                <p className="text-[9px] font-black text-text-placeholder uppercase tracking-widest mt-1">Análise inteligente baseada em dados reais</p>
              </div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-gradient-to-br from-white to-slate-50 border border-card-border p-8 rounded-[2.5rem] shadow-sm hover:shadow-xl transition-all group relative overflow-hidden">
                 <div className="absolute top-0 right-0 p-8 text-4xl opacity-10 group-hover:scale-125 transition-transform">📊</div>
                 <h5 className="text-[11px] font-black uppercase tracking-widest text-primary mb-4">Marketing & Retenção</h5>
                 <p className="text-xs font-bold text-text-main leading-relaxed italic pr-10">
                   "Notei que <strong>{labels.termoPacientePlural}</strong> de {labels.termoServico.toLowerCase()}s recorrentes não voltam há 45 dias. Recomendo disparar cupom de fidelidade."
                 </p>
                 <button className="mt-8 text-[9px] font-black bg-white border border-card-border px-6 py-3 rounded-xl uppercase tracking-widest hover:bg-primary hover:text-white transition-all">Ativar Campanha</button>
              </div>

              <div className="bg-gradient-to-br from-white to-slate-50 border border-card-border p-8 rounded-[2.5rem] shadow-sm hover:shadow-xl transition-all group relative overflow-hidden">
                 <div className="absolute top-0 right-0 p-8 text-4xl opacity-10 group-hover:scale-125 transition-transform">⚡</div>
                 <h5 className="text-[11px] font-black uppercase tracking-widest text-emerald-500 mb-4">Otimização de Agenda</h5>
                 <p className="text-xs font-bold text-text-main leading-relaxed italic pr-10">
                   "Sua taxa de ocupação nas quartas-feiras está abaixo da meta (15%). Que tal abrir um horário promocional matutino?"
                 </p>
                 <button className="mt-8 text-[9px] font-black bg-white border border-card-border px-6 py-3 rounded-xl uppercase tracking-widest hover:bg-emerald-500 hover:text-white transition-all">Abrir Horários</button>
              </div>
           </div>
        </div>

        {(isAdmin || onViewGeneral) && (
          <div className="pt-12 border-t border-slate-100 flex flex-col items-center gap-6">
             <p className="text-[9px] font-black text-text-placeholder uppercase tracking-[0.4em]">Ou se preferir gerenciamento avançado</p>
             <button 
               onClick={onViewGeneral}
               className="px-10 py-5 rounded-2xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-[0.2em] shadow-2xl shadow-slate-900/40 hover:scale-105 transition-all active:scale-95"
             >
                Ver Agenda Geral (Consolidada)
             </button>
          </div>
        )}

      </div>
    </div>
  );
}
