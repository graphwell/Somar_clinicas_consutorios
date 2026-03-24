"use client";
import React, { useState, useEffect } from 'react';
import { useNicho } from '@/context/NichoContext';

const TENANT_ID = 'clinica_id_default';

type Paciente = {
  id: string;
  nome: string;
  telefone: string;
  createdAt: string;
  _count: { agendamentos: number };
  agendamentos: { id: string; dataHora: string; status: string; servico?: { nome: string } }[];
};

// ─── Componente de Prontuário (Slide-over) ───────────────────────────────
function PatientChart({ patient, onClose }: { patient: Paciente; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[100] flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in" />
      <div 
        className="relative w-full max-w-2xl bg-[var(--card-bg)] h-full shadow-2xl border-l border-[var(--border)] flex flex-col animate-in slide-in-from-right duration-500"
        onClick={e => e.stopPropagation()}
      >
        {/* Header do Prontuário */}
        <div className="p-8 border-b border-[var(--border)] flex justify-between items-center bg-white/[0.02]">
           <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-[var(--accent)]/10 text-[var(--accent)] flex items-center justify-center text-xl font-black">
                {patient.nome.charAt(0)}
              </div>
              <div>
                 <h3 className="text-xl font-black italic uppercase tracking-tighter">{patient.nome}</h3>
                 <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mt-1">🩺 Prontuário & Evolução Clínica</p>
              </div>
           </div>
           <button onClick={onClose} className="p-3 rounded-xl hover:bg-white/5 text-gray-400 font-black">✕</button>
        </div>

        {/* Conteúdo do Prontuário */}
        <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
           
           {/* Info Rápida */}
           <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-white/5 border border-white/10 rounded-2xl text-center">
                 <p className="text-[8px] font-black uppercase text-gray-500 mb-1">Total Visitas</p>
                 <p className="text-xl font-black text-white">{patient._count.agendamentos}</p>
              </div>
              <div className="p-4 bg-white/5 border border-white/10 rounded-2xl text-center">
                 <p className="text-[8px] font-black uppercase text-gray-500 mb-1">Desde</p>
                 <p className="text-sm font-black text-white">{new Date(patient.createdAt).getFullYear()}</p>
              </div>
              <div className="p-4 bg-white/5 border border-white/10 rounded-2xl text-center">
                 <p className="text-[8px] font-black uppercase text-gray-500 mb-1">Status</p>
                 <p className="text-[10px] font-black text-emerald-500 uppercase">Ativo</p>
              </div>
           </div>

           {/* Timeline de Evolução */}
           <div className="space-y-6">
              <div className="flex justify-between items-center">
                 <h4 className="text-[10px] font-black uppercase tracking-widest text-[var(--accent)]">Linha do Tempo</h4>
                 <button className="text-[9px] font-black uppercase tracking-widest bg-[var(--accent)]/10 text-[var(--accent)] px-3 py-1 rounded-md">➕ Nova Evolução</button>
              </div>

              <div className="space-y-4">
                 {patient.agendamentos && patient.agendamentos.length > 0 ? (
                    patient.agendamentos.map(a => (
                       <div key={a.id} className="relative pl-8 pb-8 border-l border-[var(--border)] last:border-0">
                          <div className="absolute left-[-5px] top-1 w-2 h-2 rounded-full bg-[var(--accent)] shadow-[0_0_10px_var(--accent)]" />
                          <div className="p-5 bg-white/[0.03] border border-white/10 rounded-3xl group hover:border-[var(--accent)]/30 transition-all">
                             <div className="flex justify-between items-start mb-2">
                                <span className="text-[9px] font-black text-white bg-white/10 px-2 py-0.5 rounded uppercase tracking-widest">{new Date(a.dataHora).toLocaleDateString('pt-BR')}</span>
                                <span className="text-[8px] font-black uppercase text-[var(--text-muted)]">{a.status}</span>
                             </div>
                             <p className="text-xs font-black text-[var(--foreground)] uppercase truncate">{a.servico?.nome || 'Atendimento Geral'}</p>
                             <div className="mt-4 p-4 bg-black/20 rounded-2xl border border-white/5 italic text-[11px] text-[var(--text-muted)] line-clamp-3 group-hover:line-clamp-none transition-all">
                                Evolução automática gerada pelo sistema: Paciente realizou o procedimento de {a.servico?.nome || 'atendimento'}. Sem intercorrências relatadas.
                             </div>
                          </div>
                       </div>
                    ))
                 ) : (
                    <p className="text-center py-10 text-[10px] font-black uppercase opacity-20">Nenhum registro encontrado</p>
                 )}
              </div>
           </div>
        </div>

        {/* Footer do Slide-over */}
        <div className="p-8 border-t border-[var(--border)] bg-black/10">
           <button className="w-full py-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all">Imprimir Prontuário Digital</button>
        </div>
      </div>
    </div>
  );
}

// ─── Página Principal ─────────────────────────────────────────────────────
export default function PatientsPage() {
  const [search, setSearch] = useState('');
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPatient, setSelectedPatient] = useState<Paciente | null>(null);
  const { labels } = useNicho();

  useEffect(() => {
    fetch(`/api/patients?tenantId=${TENANT_ID}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setPacientes(data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = pacientes.filter(p => 
    p.nome.toLowerCase().includes(search.toLowerCase()) || 
    p.telefone.includes(search)
  );

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 bg-[var(--card-bg)] border border-[var(--border)] p-8 rounded-[2.5rem] shadow-sm">
        <div>
          <h2 className="text-3xl font-black italic uppercase tracking-tighter">👥 Gestão de <span className="text-[var(--accent)]">{labels.cliente}s</span></h2>
          <p className="text-[var(--text-muted)] text-[10px] mt-1 font-black uppercase tracking-widest opacity-60">Base de dados unificada e prontuário digital</p>
        </div>
        <a href="/dashboard" className="px-8 py-4 bg-[var(--accent)] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-[var(--accent)]/20 active:scale-95 inline-block text-center">
          <span>➕ Novo {labels.cliente.toUpperCase()}</span>
        </a>
      </div>

      <div className="relative group">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={`Buscar por nome ou telefone...`}
          className="w-full bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl px-6 py-5 text-sm focus:outline-none focus:border-[var(--accent)] transition-all pl-14 font-medium"
        />
        <svg className="absolute left-6 top-5.5 w-5 h-5 text-gray-500 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
      </div>

      {loading ? (
        <div className="flex justify-center p-20 text-[var(--text-muted)] font-black uppercase tracking-widest text-xs opacity-20">
          Processando Clientes...
        </div>
      ) : pacientes.length === 0 ? (
        <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[2.5rem] p-16 text-center shadow-sm">
          <p className="text-7xl mb-6 opacity-30 grayscale">👥</p>
          <p className="font-black text-[var(--foreground)] text-lg uppercase tracking-tight italic">Base de {labels.cliente.toLowerCase()}s vazia</p>
          <p className="text-[9px] mt-2 font-black uppercase tracking-widest opacity-40">Os registros aparecem conforme você agenda no sistema.</p>
        </div>
      ) : (
        <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[3rem] overflow-hidden shadow-sm">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-white/[0.02] text-[var(--text-muted)] border-b border-[var(--border)] uppercase text-[9px] font-black tracking-[0.2em]">
                <tr>
                  <th className="px-10 py-8">Nome do {labels.cliente}</th>
                  <th className="px-10 py-8">WhatsApp</th>
                  <th className="px-10 py-8 text-center">Visitas</th>
                  <th className="px-10 py-8">Última Atividade</th>
                  <th className="px-10 py-8 text-right">Ações Operacionais</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {filtered.map(p => (
                  <tr key={p.id} className="hover:bg-white/[0.01] transition-colors group">
                    <td className="px-10 py-6">
                       <p className="font-black text-[var(--foreground)] text-sm uppercase italic group-hover:text-[var(--accent)] transition-all">{p.nome}</p>
                       <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest mt-1">ID: {p.id.slice(-6)}</p>
                    </td>
                    <td className="px-10 py-6 text-[var(--text-muted)] font-bold">{p.telefone}</td>
                    <td className="px-10 py-6 text-center">
                      <span className="bg-[var(--accent)]/5 text-[var(--accent)] px-4 py-1.5 rounded-xl font-black text-[10px] border border-[var(--accent)]/10">{p._count.agendamentos}</span>
                    </td>
                    <td className="px-10 py-6 text-[var(--text-muted)] font-bold text-xs">
                      {p.agendamentos && p.agendamentos.length > 0 
                        ? new Date(p.agendamentos[0].dataHora).toLocaleDateString('pt-BR') 
                        : '--'}
                    </td>
                    <td className="px-10 py-6 text-right">
                       <button 
                         onClick={() => setSelectedPatient(p)}
                         className="px-6 py-3 bg-[var(--foreground)]/5 text-[var(--text-muted)] rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-[var(--accent)] hover:text-white transition-all border border-transparent shadow-sm"
                        >
                         🩺 Ver Prontuário
                       </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedPatient && <PatientChart patient={selectedPatient} onClose={() => setSelectedPatient(null)} />}
    </div>
  );
}
