"use client";
import React, { useState, useEffect } from 'react';
import { useNicho } from '@/context/NichoContext';
import { fetchWithAuth } from '@/lib/api-utils';

type Paciente = {
  id: string;
  nome: string;
  telefone: string;
  createdAt: string;
  isSubscriber: boolean;
  profissionalPreferidoId?: string;
  _count: { agendamentos: number };
  agendamentos: { id: string; dataHora: string; status: string; servico?: { nome: string } }[];
};

function PatientChart({ patient, onClose }: { patient: Paciente; onClose: () => void }) {
  const { labels } = useNicho();
  
  return (
    <div className="fixed inset-0 z-[100] flex justify-end transition-all" onClick={onClose}>
      <div className="absolute inset-0 bg-slate-900/10 backdrop-blur-md animate-in fade-in" />
      <div 
        className="relative w-full max-w-2xl bg-white h-full shadow-2xl border-l border-card-border flex flex-col animate-in slide-in-from-right duration-500"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-10 border-b border-slate-50 flex justify-between items-center bg-slate-50/20">
           <div className="flex items-center gap-6">
              <div className="w-16 h-16 rounded-ultra bg-primary-soft text-primary flex items-center justify-center text-3xl font-black italic shadow-inner">
                {patient.nome.charAt(0)}
              </div>
              <div>
                 <h3 className="text-2xl font-black italic uppercase tracking-tighter text-text-main">{patient.nome}</h3>
                 <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mt-1 opacity-60">🩺 {labels.termoProntuario} Digital</p>
              </div>
           </div>
           <button onClick={onClose} className="w-11 h-11 rounded-xl hover:bg-slate-100 flex items-center justify-center text-text-placeholder transition-colors italic font-black">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-12 space-y-12 no-scrollbar">
           
           <div className="grid grid-cols-3 gap-6">
              <div className="p-6 bg-slate-50 border border-card-border rounded-premium text-center">
                 <p className="text-[9px] font-black uppercase text-text-muted mb-1 opacity-40">Atendimentos</p>
                 <p className="text-2xl font-black text-text-main tracking-tighter italic">{patient._count.agendamentos}x</p>
              </div>
              <div className="p-6 bg-slate-50 border border-card-border rounded-premium text-center">
                 <p className="text-[9px] font-black uppercase text-text-muted mb-1 opacity-40">Membro Desde</p>
                 <p className="text-2xl font-black text-text-main tracking-tighter italic">{new Date(patient.createdAt).getFullYear()}</p>
              </div>
              <div className="p-6 bg-primary-soft border border-primary/10 rounded-premium text-center">
                 <p className="text-[9px] font-black uppercase text-primary mb-1 opacity-60">Fidelidade</p>
                 <p className="text-[10px] font-black text-primary uppercase">{patient.isSubscriber ? 'PREMIUM' : 'OURO'}</p>
              </div>
           </div>

           <div className="space-y-10">
              <div className="flex justify-between items-center border-b border-slate-50 pb-4">
                 <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-text-placeholder">Evolução de {labels.termoPaciente}</h4>
                 <button className="text-[9px] font-black uppercase px-6 py-2.5 bg-primary text-white rounded-xl shadow-lg shadow-primary/20 hover:scale-105 transition-all">Nova Evolução</button>
              </div>

              <div className="space-y-8">
                 {patient.agendamentos?.map(a => (
                    <div key={a.id} className="relative pl-12 pb-12 border-l-2 border-slate-50 last:border-0 last:pb-0">
                       <div className="absolute left-[-9px] top-1.5 w-4 h-4 rounded-full bg-white border-4 border-primary shadow-sm" />
                       <div className="p-8 bg-white border border-card-border rounded-[2.5rem] group hover:border-primary/20 transition-all shadow-sm">
                          <div className="flex justify-between items-start mb-6">
                             <span className="text-[10px] font-black text-text-muted bg-slate-50 px-4 py-1.5 rounded-full uppercase tracking-wider">{new Date(a.dataHora).toLocaleDateString('pt-BR')}</span>
                             <span className={`text-[9px] font-black uppercase px-3 py-1 rounded-lg ${a.status === 'done' ? 'bg-status-success-bg text-status-success' : 'bg-slate-50 text-text-placeholder'}`}>{a.status}</span>
                          </div>
                          <p className="text-base font-black text-text-main uppercase tracking-tight italic mb-4 underline underline-offset-4 decoration-primary/5">{a.servico?.nome || labels.termoServico}</p>
                          <div className="p-6 bg-slate-50/50 rounded-2xl border border-card-border/50 italic text-xs text-text-muted leading-relaxed font-medium">
                             Histórico de {labels.termoServico.toLowerCase()}: O {labels.termoPaciente.toLowerCase()} compareceu para realizar {a.servico?.nome || 'o procedimento'}. Evolução registrada como estável.
                          </div>
                       </div>
                    </div>
                 ))}
              </div>
           </div>
        </div>

        <div className="p-10 border-t border-card-border bg-slate-50/10">
           <button className="w-full py-5 bg-white border border-card-border rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] text-text-muted hover:border-primary/40 hover:text-primary transition-all shadow-sm">Exportar Ficha Clínica complete (PDF)</button>
        </div>
      </div>
    </div>
  );
}

export default function PatientsPage() {
  const [search, setSearch] = useState('');
  const [filterSubscriber, setFilterSubscriber] = useState<boolean | null>(null);
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPatient, setSelectedPatient] = useState<Paciente | null>(null);
  const { labels } = useNicho();

  useEffect(() => {
    fetchWithAuth('/api/patients')
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setPacientes(data); })
      .finally(() => setLoading(false));
  }, []);

  const filtered = pacientes.filter(p => {
    const matchesSearch = p.nome.toLowerCase().includes(search.toLowerCase()) || p.telefone.includes(search);
    const matchesSub = filterSubscriber === null ? true : p.isSubscriber === filterSubscriber;
    return matchesSearch && matchesSub;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-12 pb-40 animate-premium">
      
      {/* Header & Search */}
      <div className="bg-white border border-card-border p-12 rounded-[3.5rem] shadow-sm flex flex-col gap-12">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="flex items-center gap-6">
             <div className="w-14 h-14 rounded-3xl bg-primary text-white flex items-center justify-center text-3xl shadow-xl shadow-primary/20">👥</div>
             <div>
                <h2 className="text-2xl font-black italic uppercase tracking-tighter text-text-main">Base de <span className="text-primary">{labels.termoPacientePlural}</span></h2>
                <p className="text-[10px] font-black text-text-placeholder uppercase tracking-[0.2em] mt-1 opacity-60">Sincronização Ativa</p>
             </div>
          </div>
          <button onClick={() => window.location.href='/dashboard'} className="btn-primary flex items-center justify-center gap-2">
            <span>➕ NOVO {labels.termoPaciente.toUpperCase()}</span>
          </button>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          <div className="relative group flex-1">
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={`Busca inteligente por nome ou WhatsApp...`}
              className="input-premium w-full py-6 px-10 pl-24 text-base rounded-[2rem] shadow-inner"
            />
            <span className="absolute left-10 top-1/2 -translate-y-1/2 text-2xl grayscale group-focus-within:grayscale-0 transition-all opacity-20 group-focus-within:opacity-100">🔍</span>
          </div>
          
          {labels.temAssinatura && (
            <div className="bg-slate-50 p-2 rounded-[2rem] flex gap-2 border border-slate-100 shadow-inner">
               <button 
                 onClick={() => setFilterSubscriber(null)}
                 className={`px-8 py-4 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${filterSubscriber === null ? 'bg-white text-primary shadow-premium' : 'text-text-placeholder'}`}
               >Todos</button>
               <button 
                 onClick={() => setFilterSubscriber(true)}
                 className={`px-8 py-4 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${filterSubscriber === true ? 'bg-white text-primary shadow-premium' : 'text-text-placeholder'}`}
               >⭐ Assinantes</button>
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="py-40 text-center font-black uppercase text-[10px] text-text-placeholder tracking-[0.5em] animate-pulse">Lendo registros de pacientes...</div>
      ) : (
        <div className="bg-white border border-card-border rounded-[3.5rem] shadow-sm overflow-hidden">
          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-text-placeholder border-b border-slate-50 uppercase text-[9px] font-black tracking-[0.3em]">
                <tr>
                  <th className="px-12 py-8 font-black">Identificação</th>
                  <th className="px-12 py-8 font-black">WhatsApp Business</th>
                  <th className="px-12 py-8 font-black text-center">Frequência</th>
                  <th className="px-12 py-8 font-black">Última Visita</th>
                  <th className="px-12 py-8 font-black text-right">Módulo Prontuário</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map(p => (
                   <tr key={p.id} className="group hover:bg-slate-50/50 transition-all">
                    <td className="px-12 py-10">
                       <div className="flex items-center gap-3">
                        <p className="font-black text-text-main text-lg tracking-tighter uppercase italic group-hover:text-primary transition-colors">{p.nome}</p>
                        {p.isSubscriber && <span className="text-[10px] animate-bounce">⭐</span>}
                       </div>
                       <p className="text-[9px] font-black text-text-placeholder uppercase tracking-widest mt-1 opacity-40">Ref: ID-{p.id.slice(-5)}</p>
                    </td>
                    <td className="px-12 py-10 text-text-muted font-bold font-mono text-sm">{p.telefone}</td>
                    <td className="px-12 py-10 text-center">
                      <span className="bg-primary-soft text-primary px-5 py-2 rounded-full border border-primary/10 font-black text-[10px]">{p._count.agendamentos}x</span>
                    </td>
                    <td className="px-12 py-10 text-text-placeholder font-black text-[11px] uppercase italic">
                      {p.agendamentos?.[0] ? new Date(p.agendamentos[0].dataHora).toLocaleDateString('pt-BR') : 'Sem Visitas'}
                    </td>
                    <td className="px-12 py-10 text-right">
                       <button onClick={() => setSelectedPatient(p)} className="btn-secondary py-3 px-8 text-[9px]">🩺 {labels.prontuario}</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && (
             <div className="p-40 text-center bg-slate-50/20">
                <p className="text-4xl mb-4 grayscale opacity-20">📂</p>
                <p className="font-black text-text-placeholder text-xs uppercase tracking-[0.3em]">Nenhum registro encontrado</p>
             </div>
          )}
        </div>
      )}

      {selectedPatient && <PatientChart patient={selectedPatient} onClose={() => setSelectedPatient(null)} />}
    </div>
  );
}
