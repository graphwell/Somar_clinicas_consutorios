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
        <a href="/api/backup/export?tenantId=clinica_id_default" className="px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-medium transition-all">
          ⬇ Exportar CSV
        </a>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map(s => (
          <div key={s.label} className="bg-[#0a0a20]/40 border border-white/5 rounded-2xl p-5">
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">{s.label}</p>
            <p className="text-3xl font-bold text-white">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-[#0a0a20]/40 border border-white/5 rounded-2xl p-8 text-center text-gray-400">
        <p className="text-4xl mb-3">📊</p>
        <p className="font-medium text-white">Relatórios detalhados em breve.</p>
        <p className="text-sm mt-1">Use o botão de exportar CSV para ver todos os seus dados agora.</p>
      </div>
    </div>
  );
}
