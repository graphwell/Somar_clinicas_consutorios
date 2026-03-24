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
  agendamentos: { dataHora: string }[];
};

export default function PatientsPage() {
  const [search, setSearch] = useState('');
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [loading, setLoading] = useState(true);
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
          <h2 className="text-3xl font-black tracking-tight text-[var(--foreground)]">{labels.cliente}s</h2>
          <p className="text-[var(--text-muted)] text-sm mt-1 font-medium italic">Histórico e cadastro de {labels.cliente.toLowerCase()}s da clínica.</p>
        </div>
        <a href="/dashboard" className="px-8 py-4 bg-[var(--accent)] hover:opacity-90 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-xl shadow-[var(--accent)]/20 active:scale-95 inline-block text-center">
          <span>➕ Novo {labels.cliente} via Agenda</span>
        </a>
      </div>

      <div className="relative group">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={`Buscar por nome ou telefone...`}
          className="w-full bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl px-6 py-4 text-sm focus:outline-none focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent)]/10 transition-all pl-12 font-medium"
        />
        <svg className="absolute left-4 top-4.5 w-5 h-5 text-[var(--text-muted)] opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
      </div>

      {loading ? (
        <div className="flex justify-center p-20 animate-pulse text-[var(--text-muted)] font-black uppercase tracking-widest text-xs">
          Carregando Clientes...
        </div>
      ) : pacientes.length === 0 ? (
        <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[2.5rem] p-16 text-center text-[var(--text-muted)] shadow-sm">
          <p className="text-7xl mb-6 opacity-30">👥</p>
          <p className="font-black text-[var(--foreground)] text-lg uppercase tracking-tight">Nenhum {labels.cliente.toLowerCase()} cadastrado</p>
          <p className="text-xs mt-2 font-medium">Os {labels.cliente.toLowerCase()}s aparecem automaticamente quando a IA registra um agendamento.</p>
        </div>
      ) : (
        <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[2.5rem] overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-[var(--foreground)]/[0.02] text-[var(--text-muted)] border-b border-[var(--border)] uppercase text-[10px] font-black tracking-widest">
                <tr>
                  <th className="px-8 py-6">Nome</th>
                  <th className="px-8 py-6">Telefone</th>
                  <th className="px-8 py-6">Cadastro</th>
                  <th className="px-8 py-6 text-center">Agendamentos</th>
                  <th className="px-8 py-6">Última Visita</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {filtered.map(p => (
                  <tr key={p.id} className="hover:bg-[var(--foreground)]/[0.01] transition-colors group">
                    <td className="px-8 py-5 font-black text-[var(--foreground)] tracking-tight group-hover:text-[var(--accent)] transition-colors">{p.nome}</td>
                    <td className="px-8 py-5 text-[var(--text-muted)] font-bold">{p.telefone}</td>
                    <td className="px-8 py-5 text-[var(--text-muted)] font-medium">{new Date(p.createdAt).toLocaleDateString('pt-BR')}</td>
                    <td className="px-8 py-5 text-center">
                      <span className="bg-[var(--accent)]/10 text-[var(--accent)] px-3 py-1 rounded-lg font-black text-[10px] shadow-inner">{p._count.agendamentos}</span>
                    </td>
                    <td className="px-8 py-5 text-[var(--text-muted)] font-bold">
                      {p.agendamentos && p.agendamentos.length > 0 
                        ? new Date(p.agendamentos[0].dataHora).toLocaleDateString('pt-BR') 
                        : '--'}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-8 py-16 text-center text-[var(--text-muted)] font-black uppercase tracking-widest text-xs opacity-50">
                      Nenhum resultado para "{search}"
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
