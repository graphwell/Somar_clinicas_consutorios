"use client";
import React, { useState, useEffect } from 'react';

interface Appointment { id: string; paciente: { nome: string; telefone: string }; dataHora: string; status: string; }

const StatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, { color: string; label: string }> = {
    confirmado: { color: 'bg-green-500/20 text-green-400', label: 'Confirmado' },
    pendente: { color: 'bg-yellow-500/20 text-yellow-400', label: 'Pendente' },
    cancelado: { color: 'bg-red-500/20 text-red-400', label: 'Cancelado' },
    remarcado: { color: 'bg-blue-500/20 text-blue-400', label: 'Remarcado' },
  };
  const s = map[status] || { color: 'bg-gray-500/20 text-gray-400', label: status };
  return <span className={`text-xs px-2 py-1 rounded-full font-semibold ${s.color}`}>{s.label}</span>;
};

export default function DashboardPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const today = new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  useEffect(() => {
    fetch('/api/bot/appointments?tenantId=clinica_id_default')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setAppointments(data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const stats = [
    { label: 'Hoje', value: appointments.filter(a => new Date(a.dataHora).toDateString() === new Date().toDateString()).length, color: 'from-[#4a4ae2] to-[#8080ff]' },
    { label: 'Confirmados', value: appointments.filter(a => a.status === 'confirmado').length, color: 'from-green-500 to-emerald-400' },
    { label: 'Pendentes', value: appointments.filter(a => a.status === 'pendente').length, color: 'from-yellow-500 to-orange-400' },
    { label: 'Total', value: appointments.length, color: 'from-[#00b4d8] to-[#4a4ae2]' },
  ];

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold capitalize">{today}</h2>
        <p className="text-gray-400 text-sm mt-1">Bem-vindo ao painel Synka. Sua agenda de hoje.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map(s => (
          <div key={s.label} className="bg-[#0a0a20]/40 border border-white/5 rounded-2xl p-5">
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">{s.label}</p>
            <p className={`text-4xl font-bold bg-gradient-to-r ${s.color} bg-clip-text text-transparent`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Agendamentos */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Agendamentos Recentes</h3>
        <div className="bg-[#0a0a20]/40 border border-white/5 rounded-2xl overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-400">Carregando agendamentos...</div>
          ) : appointments.length === 0 ? (
            <div className="p-8 text-center text-gray-400">Nenhum agendamento encontrado.</div>
          ) : (
            <div className="divide-y divide-white/5">
              {appointments.slice(0, 10).map(a => (
                <div key={a.id} className="flex flex-col sm:flex-row sm:items-center justify-between px-6 py-4 gap-2 hover:bg-white/2 transition-colors">
                  <div>
                    <p className="font-medium text-sm">{a.paciente?.nome}</p>
                    <p className="text-xs text-gray-400">{a.paciente?.telefone} · {new Date(a.dataHora).toLocaleString('pt-BR')}</p>
                  </div>
                  <StatusBadge status={a.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
