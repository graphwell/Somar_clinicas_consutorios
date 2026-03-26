"use client";
import React, { useState, useEffect } from 'react';
import { fetchWithAuth } from '@/lib/api-utils';
import { useNicho } from '@/context/NichoContext';

interface KpiData {
  faturamentoPrevisto: number;
  faturamentoRealizado: number;
  totalAtendimentos: number;
  taxaOcupacao: number;
  horariosLivres: number;
  assinantesAgendados?: number;
  avulsosAgendados?: number;
  conveniosCount?: number;
  particularesCount?: number;
}

const KpiCard = ({ title, value, icon, subtitle, loading }: { title: string, value: string | number, icon: string, subtitle?: string, loading?: boolean }) => (
  <div className="bg-white border border-card-border p-5 rounded-[2rem] shadow-sm w-[200px] h-[100px] flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-all">
    {loading ? (
      <div className="space-y-2 animate-pulse">
        <div className="h-3 w-16 bg-slate-100 rounded"></div>
        <div className="h-6 w-24 bg-slate-200 rounded"></div>
      </div>
    ) : (
      <>
        <div className="flex justify-between items-start">
          <span className="text-[8px] font-black uppercase tracking-widest text-text-placeholder">{title}</span>
          <span className="text-sm opacity-20 group-hover:opacity-100 transition-opacity">{icon}</span>
        </div>
        <div>
          <h4 className="text-lg font-black italic tracking-tighter text-text-main leading-none">{value}</h4>
          {subtitle && <p className="text-[7px] font-bold text-primary uppercase mt-1 tracking-tighter">{subtitle}</p>}
        </div>
      </>
    )}
  </div>
);

export default function KpiSection() {
  const { nicho, labels } = useNicho();
  const [data, setData] = useState<KpiData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchKpis = async () => {
      try {
        const res = await fetchWithAuth('/api/dashboard/kpi');
        const json = await res.json();
        if (json.success) setData(json.data);
      } catch (e) {
        console.error("Failed to fetch KPIs:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchKpis();
    const interval = setInterval(fetchKpis, 60000); // Polling 60s
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-wrap gap-4 mb-10 animate-in fade-in slide-in-from-top-4 duration-700">
      <KpiCard 
        title="Faturamento Previsto" 
        value={data ? `R$ ${data.faturamentoPrevisto.toLocaleString('pt-BR')}` : 'R$ 0'} 
        icon="💰" 
        loading={loading} 
        subtitle="Agendados hoje"
      />
      <KpiCard 
        title="Faturamento Realizado" 
        value={data ? `R$ ${data.faturamentoRealizado.toLocaleString('pt-BR')}` : 'R$ 0'} 
        icon="✅" 
        loading={loading} 
        subtitle="Recebido hoje"
      />
      <KpiCard 
        title={`Total ${labels.termoPacientePlural}`} 
        value={data ? data.totalAtendimentos : 0} 
        icon="👥" 
        loading={loading} 
        subtitle="Atendimentos do dia"
      />
      <KpiCard 
        title="Taxa de Ocupação" 
        value={data ? `${data.taxaOcupacao}%` : '0%'} 
        icon="📊" 
        loading={loading} 
        subtitle={`${data?.horariosLivres || 0} Slots livres`}
      />
      
      {/* Cards Adicionais por Nicho */}
      {(nicho === 'SALAO_BELEZA' || nicho === 'BARBEARIA') && data && (
        <KpiCard 
          title="Mix de Vendas" 
          value={`${data.assinantesAgendados} Assin.`} 
          icon="🎟️" 
          loading={loading} 
          subtitle={`${data.avulsosAgendados} Avulsos hoje`}
        />
      )}
      {(nicho === 'CLINICA_MEDICA' || nicho === 'FISIOTERAPIA') && data && (
        <KpiCard 
          title="Mix de Planos" 
          value={`${data.conveniosCount} Conv.`} 
          icon="🏥" 
          loading={loading} 
          subtitle={`${data.particularesCount} Particulares`}
        />
      )}
    </div>
  );
}
