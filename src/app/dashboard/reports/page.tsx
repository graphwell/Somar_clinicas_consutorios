"use client";
import React, { useState, useEffect } from 'react';
import { useNicho } from '@/context/NichoContext';
import { fetchWithAuth } from '@/lib/api-utils';

type Stats = {
  totalFaturado: number;
  totalAgendamentos: number;
  confirmadosCount: number;
  taxaConfirmacao: number;
  totalPacientes: number;
  topServicos: { nome: string; count: number; faturamento: number }[];
};

export default function ReportsPage() {
  const { labels } = useNicho();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWithAuth('/api/reports/stats')
      .then(res => res.json())
      .then(data => {
        if (!data.error) setStats(data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const kpis = [
    { 
      label: 'Faturamento Mensal', 
      value: stats ? `R$ ${stats.totalFaturado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'R$ 0,00', 
      icon: '💰',
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10'
    },
    { 
      label: 'Taxa de Confirmação', 
      value: stats ? `${stats.taxaConfirmacao.toFixed(1)}%` : '0%', 
      icon: '✅',
      color: 'text-indigo-400',
      bg: 'bg-indigo-500/10'
    },
    { 
      label: 'Base Coletada', 
      value: stats ? `${stats.totalPacientes} ${labels.cliente}s` : `0 ${labels.cliente}s`, 
      icon: '👥',
      color: 'text-orange-400',
      bg: 'bg-orange-500/10'
    },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-10 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
            Gestão & Inteligência
          </h2>
          <p className="text-gray-400 mt-1">Dados reais do mês atual consolidando faturamento e performance.</p>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {loading ? (
          [1, 2, 3].map(i => <div key={i} className="h-32 bg-white/5 animate-pulse rounded-3xl" />)
        ) : (
          kpis.map((k, i) => (
            <div key={i} className="bg-[#0a0a20]/60 border border-white/5 rounded-3xl p-6 flex items-center gap-5 hover:border-white/10 transition-colors">
              <div className={`w-14 h-14 ${k.bg} ${k.color} rounded-2xl flex items-center justify-center text-2xl shadow-inner`}>
                {k.icon}
              </div>
              <div>
                <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest">{k.label}</p>
                <p className={`text-2xl font-black ${k.color} mt-0.5`}>{k.value}</p>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Col: Top Services */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[#0a0a20]/60 border border-white/5 rounded-3xl p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 blur-[100px] pointer-events-none" />
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
              🏆 Faturamento por {labels.servico}
            </h3>
            <div className="space-y-4">
              {loading ? (
                <div className="space-y-3">
                   <div className="h-4 bg-white/5 w-full rounded" />
                   <div className="h-4 bg-white/5 w-[80%] rounded" />
                </div>
              ) : stats?.topServicos.length === 0 ? (
                <p className="text-sm text-gray-500 italic py-4">Nenhum dado financeiro para este mês.</p>
              ) : (
                stats?.topServicos.map((s, i) => (
                  <div key={i} className="flex flex-col gap-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium text-gray-300">{s.nome}</span>
                      <span className="font-mono text-emerald-400">R$ {s.faturamento.toFixed(2)}</span>
                    </div>
                    <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                       <div 
                         className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 transition-all duration-1000" 
                         style={{ width: `${(s.faturamento / stats.totalFaturado) * 100}%` }} 
                       />
                    </div>
                    <p className="text-[10px] text-gray-500 text-right">{s.count} agendamentos</p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-[#0a0a20]/60 border border-white/5 rounded-3xl p-8">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">📂 Arquivos para Exportação</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
               {[
                 { label: 'Relatório de Clientes', desc: 'Base completa em CSV', api: '/api/export/clientes', color: 'bg-indigo-500/10 text-indigo-400' },
                 { label: 'Histórico Mensal', desc: 'Todos os horários e status', api: '/api/export/agendamentos', color: 'bg-emerald-500/10 text-emerald-400' },
                 { label: 'Ranking de Convênios', desc: 'Desempenho por plano', api: '/api/export/convenios', color: 'bg-orange-500/10 text-orange-400' },
                 { label: 'Exportação Financeira', desc: 'Totais faturados por dia', api: '/api/export/financeiro', color: 'bg-rose-500/10 text-rose-400' },
               ].map((exp, i) => (
                 <a key={i} href={exp.api} className="p-4 border border-white/5 bg-white/2 rounded-2xl hover:bg-white/5 transition-all group">
                   <div className="flex items-center justify-between mb-2">
                     <span className={`text-[10px] uppercase font-black px-2 py-0.5 rounded ${exp.color}`}>{exp.label}</span>
                     <span className="opacity-0 group-hover:opacity-100 transition-opacity">⬇</span>
                   </div>
                   <p className="text-xs text-gray-500">{exp.desc}</p>
                 </a>
               ))}
            </div>
          </div>
        </div>

        {/* Right Col: Extra Insight */}
        <div className="space-y-6">
           <div className="bg-gradient-to-br from-[#1a1a40] to-[#0a0a20] border border-[#4a4ae2]/20 rounded-3xl p-6 shadow-xl relative overflow-hidden group">
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-[#4a4ae2]/20 rounded-full blur-3xl" />
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-[#4a4ae2] flex items-center justify-center text-2xl shadow-lg animate-pulse">📊</div>
                <div>
                  <h4 className="font-black text-sm uppercase tracking-wider text-white">Insight da Maya</h4>
                  <p className="text-[10px] text-[#a0a0ff] font-bold tracking-widest">IA ANALYTICS</p>
                </div>
              </div>
              <div className="bg-white/5 p-4 rounded-2xl text-xs text-gray-300 border border-white/5 italic leading-relaxed">
                {stats && stats.taxaConfirmacao < 50 ? (
                  `"Sua taxa de confirmação está em ${stats.taxaConfirmacao.toFixed(1)}%. Sugiro ativar os Lembretes de WhatsApp no Marketing Hub para reduzir as faltas."`
                ) : (
                  `"Ótimo desempenho! Sua base cresceu para ${stats?.totalPacientes} ${labels.cliente}s. Que tal disparar um combo de upsell para os mais ativos?"`
                )}
              </div>
           </div>

           <div className="bg-[#0a0a20]/40 border border-white/5 rounded-3xl p-6 text-center">
             <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest mb-2">Próxima Exportação Automática</p>
             <p className="text-xl font-bold text-white">01 / Abr / 2025</p>
             <button className="mt-4 w-full py-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold transition-all border border-white/10">Agendar Novo Envio</button>
           </div>
        </div>

      </div>
    </div>
  );
}
