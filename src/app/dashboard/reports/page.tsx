"use client";
import React from 'react';

export default function ReportsPage() {
  const stats = [
    { label: 'Agendamentos este mês', value: '–', trend: '' },
    { label: 'Taxa de confirmação', value: '–', trend: '' },
    { label: 'Cancelamentos', value: '–', trend: '' },
    { label: 'Mensagens IA enviadas', value: '–', trend: '' },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Relatórios</h2>
          <p className="text-gray-400 text-sm mt-1">Visão geral do desempenho da clínica.</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#0a0a20]/40 border border-white/5 rounded-2xl p-6 flex flex-col items-center text-center hover:border-white/10 transition-colors">
          <div className="w-12 h-12 bg-indigo-500/10 text-indigo-400 rounded-xl flex items-center justify-center text-2xl mb-4">👥</div>
          <h3 className="text-white font-bold mb-1">Base de Clientes</h3>
          <p className="text-xs text-gray-400 mb-6">Lista completa com telefones e convênios para campanhas.</p>
          <a href="/api/export/clientes?tenantId=clinica_id_default" className="w-full py-2.5 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors">
            ⬇ Baixar .CSV
          </a>
        </div>

        <div className="bg-[#0a0a20]/40 border border-white/5 rounded-2xl p-6 flex flex-col items-center text-center hover:border-white/10 transition-colors">
          <div className="w-12 h-12 bg-green-500/10 text-green-400 rounded-xl flex items-center justify-center text-2xl mb-4">📅</div>
          <h3 className="text-white font-bold mb-1">Histórico de Agendamentos</h3>
          <p className="text-xs text-gray-400 mb-6">Todos os horários, status e profissionais alocados.</p>
          <a href="/api/export/agendamentos?tenantId=clinica_id_default" className="w-full py-2.5 bg-green-500/10 text-green-400 hover:bg-green-500/20 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors">
            ⬇ Baixar .CSV
          </a>
        </div>

        <div className="bg-[#0a0a20]/40 border border-white/5 rounded-2xl p-6 flex flex-col items-center text-center hover:border-white/10 transition-colors">
          <div className="w-12 h-12 bg-orange-500/10 text-orange-400 rounded-xl flex items-center justify-center text-2xl mb-4">🏥</div>
          <h3 className="text-white font-bold mb-1">Planos e Convênios</h3>
          <p className="text-xs text-gray-400 mb-6">Listagem dos convênios habilitados na clínica.</p>
          <a href="/api/export/convenios?tenantId=clinica_id_default" className="w-full py-2.5 bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors">
            ⬇ Baixar .CSV
          </a>
        </div>
      </div>
    </div>
  );
}
