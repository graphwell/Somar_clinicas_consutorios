"use client";
import React, { useState } from 'react';

export default function PatientsPage() {
  const [search, setSearch] = useState('');

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Pacientes</h2>
          <p className="text-gray-400 text-sm mt-1">Histórico e cadastro de pacientes da clínica.</p>
        </div>
        <button className="px-5 py-2.5 bg-[#4a4ae2] hover:bg-[#3a3ab2] rounded-xl text-sm font-semibold transition-all shadow-[0_4px_20px_rgba(74,74,226,0.3)]">
          + Novo Paciente
        </button>
      </div>

      <div className="relative">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nome ou telefone..."
          className="w-full bg-[#0a0a20]/40 border border-white/10 rounded-xl px-5 py-3 text-sm focus:outline-none focus:border-[#4a4ae2] transition-colors pl-10"
        />
        <svg className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
      </div>

      <div className="bg-[#0a0a20]/40 border border-white/5 rounded-2xl p-8 text-center text-gray-400">
        <p className="text-4xl mb-3">👥</p>
        <p className="font-medium text-white">Nenhum paciente cadastrado ainda.</p>
        <p className="text-sm mt-1">Os pacientes aparecem automaticamente quando a IA registra um agendamento via WhatsApp.</p>
      </div>
    </div>
  );
}
