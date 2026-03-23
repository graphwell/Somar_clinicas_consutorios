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
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">{labels.cliente}s</h2>
          <p className="text-gray-400 text-sm mt-1">Histórico e cadastro de {labels.cliente.toLowerCase()}s da clínica.</p>
        </div>
        <a href="/dashboard" className="px-5 py-2.5 bg-[#4a4ae2] hover:bg-[#3a3ab2] rounded-xl text-sm font-semibold transition-all shadow-[0_4px_20px_rgba(74,74,226,0.3)] inline-block">
          + Novo {labels.cliente} via Agenda
        </a>
      </div>

      <div className="relative">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={`Buscar por nome ou telefone...`}
          className="w-full bg-[#0a0a20]/40 border border-white/10 rounded-xl px-5 py-3 text-sm focus:outline-none focus:border-[#4a4ae2] transition-colors pl-10"
        />
        <svg className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <div className="w-8 h-8 border-2 border-[#4a4ae2] border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : pacientes.length === 0 ? (
        <div className="bg-[#0a0a20]/40 border border-white/5 rounded-2xl p-8 text-center text-gray-400">
          <p className="text-4xl mb-3">👥</p>
          <p className="font-medium text-white">Nenhum {labels.cliente.toLowerCase()} cadastrado ainda.</p>
          <p className="text-sm mt-1">Os {labels.cliente.toLowerCase()}s aparecem automaticamente quando a IA registra um agendamento via WhatsApp.</p>
        </div>
      ) : (
        <div className="bg-[#0a0a20]/40 border border-white/5 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-[#ffffff05] text-gray-400 border-b border-white/10 uppercase text-xs tracking-wider">
                <tr>
                  <th className="px-6 py-4 font-semibold">Nome</th>
                  <th className="px-6 py-4 font-semibold">Telefone</th>
                  <th className="px-6 py-4 font-semibold">Cadastrado em</th>
                  <th className="px-6 py-4 font-semibold text-center">Agendamentos</th>
                  <th className="px-6 py-4 font-semibold">Última Visita</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.map(p => (
                  <tr key={p.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 font-medium text-white">{p.nome}</td>
                    <td className="px-6 py-4 text-gray-300">{p.telefone}</td>
                    <td className="px-6 py-4 text-gray-400">{new Date(p.createdAt).toLocaleDateString('pt-BR')}</td>
                    <td className="px-6 py-4 text-center">
                      <span className="bg-white/10 text-white px-2.5 py-1 rounded-lg font-mono text-xs">{p._count.agendamentos}</span>
                    </td>
                    <td className="px-6 py-4 text-gray-400">
                      {p.agendamentos && p.agendamentos.length > 0 
                        ? new Date(p.agendamentos[0].dataHora).toLocaleDateString('pt-BR') 
                        : '--'}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                      Nenhum resultado encontrado para "{search}"
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
