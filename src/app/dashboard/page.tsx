"use client";
import React from 'react';
import CalendarView from '@/components/CalendarView';
import PatientList from '@/components/PatientList';

export default function DashboardPage() {
  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header com Stats Rápidos */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard title="Total Pacientes" value="152" trend="+5 este mês" />
        <StatCard title="Agendamentos" value="28" trend="Hoje: 4" color="text-[#4a4ae2]" />
        <StatCard title="Confirmados" value="92%" trend="WhatsApp" color="text-green-400" />
        <StatCard title="Cancelamentos" value="4%" trend="-2% vs sem. passada" color="text-red-400" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Coluna Principal: Calendário e Gestão de Pacientes */}
        <div className="lg:col-span-2 space-y-8">
          <CalendarView />
          <PatientList />
        </div>

        {/* Coluna Lateral: Notificações e Próximos */}
        <div className="space-y-6">
          <div className="bg-[#0a0a20]/40 backdrop-blur-md border border-white/5 rounded-2xl p-6">
            <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              Notificações WhatsApp
            </h3>
            <div className="space-y-3">
              <NotificationItem title="Confirmação de Alan" time="2 min atrás" status="Sucesso" />
              <NotificationItem title="Lembrete enviado (Julia)" time="15 min atrás" status="Sucesso" />
              <NotificationItem title="Telefone inválido (Carlos)" time="1h atrás" status="Erro" color="text-red-400" />
            </div>
          </div>

          <div className="bg-[#0a0a20]/40 backdrop-blur-md border border-white/5 rounded-2xl p-6">
             <h3 className="text-sm font-medium mb-4">Ações Rápidas</h3>
             <button className="w-full py-3 bg-[#4a4ae2] hover:bg-[#3a3ab2] rounded-xl text-sm font-medium transition-all shadow-[0_4px_20px_rgba(74,74,226,0.3)]">
               Novo Agendamento
             </button>
             <button className="w-full py-3 mt-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-medium transition-all">
               Cadastrar Paciente
             </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, trend, color = "text-white" }: any) {
  return (
    <div className="bg-[#0a0a20]/40 backdrop-blur-md border border-white/5 p-5 rounded-2xl">
      <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">{title}</p>
      <h4 className={`text-3xl font-bold mt-2 ${color}`}>{value}</h4>
      <p className="text-xs text-gray-400 mt-2">{trend}</p>
    </div>
  );
}

function NotificationItem({ title, time, status, color = "text-green-400" }: any) {
  return (
    <div className="flex justify-between items-center text-xs p-2 hover:bg-white/5 rounded-lg transition-colors">
      <div>
        <p className="font-medium">{title}</p>
        <p className="text-gray-500">{time}</p>
      </div>
      <span className={color}>{status}</span>
    </div>
  );
}
