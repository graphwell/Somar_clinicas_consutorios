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
  evolucaoAtendimentos?: number[];
  evolucaoFaturamento?: number[];
  assinantesAgendados?: number;
  avulsosAgendados?: number;
  conveniosCount?: number;
  particularesCount?: number;
}

function Sparkline({ data, color, id }: { data: number[]; color: string; id: string }) {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const w = 80, h = 28;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / (max - min || 1)) * (h - 4) - 2;
    return `${x},${y}`;
  });
  const linePath = `M ${pts.join(' L ')}`;
  const areaPath = `${linePath} L ${w},${h} L 0,${h} Z`;
  const gradId = `spark-${id}`;
  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      fill="none"
      className="absolute bottom-0 right-0 opacity-25"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.5" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradId})`} />
      <path d={linePath} stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const IcoMoney = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <rect x="1.333" y="3.333" width="13.333" height="9.333" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M1.333 6.667h13.333" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <circle cx="8" cy="10" r="1.333" stroke="currentColor" strokeWidth="1.3"/>
  </svg>
);

const IcoCheck = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="8" r="6.333" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M5.333 8l2 2 3.334-3.333" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IcoPeople = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <circle cx="6" cy="5.333" r="2.333" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M1.333 13.333C1.333 11.124 3.457 9.333 6 9.333s4.667 1.791 4.667 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <circle cx="11.333" cy="5.333" r="1.667" stroke="currentColor" strokeWidth="1.3"/>
    <path d="M13.333 12.667c0-1.473-.895-2.727-2.167-3.267" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
  </svg>
);

const IcoChart = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M2 12l3.5-4 2.5 2.5 3-4.5 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M1.333 14.667V1.333" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M1.333 14.667H14.667" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

const IcoTicket = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M1.333 6a2 2 0 000 4v2.667A1.333 1.333 0 002.667 14h10.666A1.333 1.333 0 0014.667 12.667V10a2 2 0 000-4V3.333A1.333 1.333 0 0013.333 2H2.667A1.333 1.333 0 001.333 3.333V6z" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M8 4.667v6.666" stroke="currentColor" strokeWidth="1.3" strokeDasharray="1.5 1.5" strokeLinecap="round"/>
  </svg>
);

const IcoClinic = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M2 14V7l6-5 6 5v7H2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
    <path d="M6.333 14V10h3.334v4" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
    <path d="M6.667 5.333h2.666M8 4v2.667" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
  </svg>
);

interface KpiCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  subtitle?: string;
  loading?: boolean;
  color: string;
  sparkline?: number[];
  sparkId: string;
}

const KpiCard = ({ title, value, icon, subtitle, loading, color, sparkline, sparkId }: KpiCardProps) => (
  <div
    className="bg-white border border-card-border rounded-[2rem] shadow-sm overflow-hidden relative group hover:shadow-md transition-all flex-1"
    style={{ minWidth: '160px' }}
  >
    <div className="h-[3px] w-full" style={{ background: color }} />
    <div className="px-4 pt-3 pb-4">
      {loading ? (
        <div className="space-y-2 animate-pulse">
          <div className="h-3 w-16 bg-slate-100 rounded" />
          <div className="h-6 w-24 bg-slate-200 rounded" />
        </div>
      ) : (
        <>
          <div className="flex justify-between items-start mb-2">
            <span className="text-[8px] font-black uppercase tracking-widest text-text-placeholder leading-tight pr-1">{title}</span>
            <span className="opacity-25 group-hover:opacity-60 transition-opacity shrink-0" style={{ color }}>{icon}</span>
          </div>
          <h4 className="text-lg font-black italic tracking-tighter text-text-main leading-none">{value}</h4>
          {subtitle && <p className="text-[7px] font-bold text-primary uppercase mt-1 tracking-tighter">{subtitle}</p>}
        </>
      )}
    </div>
    {sparkline && (
      <Sparkline data={sparkline} color={color} id={sparkId} />
    )}
  </div>
);

export default function KpiSection({ selectedDate }: { selectedDate: Date }) {
  const { nicho, labels } = useNicho();
  const [data, setData] = useState<KpiData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchKpis = async () => {
      setLoading(true);
      try {
        const dateParam = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth()+1).padStart(2,'0')}-${String(selectedDate.getDate()).padStart(2,'0')}`;
        const res = await fetchWithAuth(`/api/dashboard/kpi?date=${dateParam}`);
        const json = await res.json();
        if (json.success) setData(json.data);
      } catch (e) {
        console.error("Failed to fetch KPIs:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchKpis();
    const interval = setInterval(fetchKpis, 60000);
    return () => clearInterval(interval);
  }, [selectedDate]);

  return (
    <div className="flex flex-wrap gap-3 mb-8 animate-in fade-in slide-in-from-top-4 duration-700">
      <KpiCard
        title="Faturamento Previsto"
        value={data ? `R$ ${data.faturamentoPrevisto.toLocaleString('pt-BR')}` : 'R$ 0'}
        icon={<IcoMoney />}
        loading={loading}
        subtitle="Agendados hoje"
        color="#40916C"
        sparkline={data?.evolucaoFaturamento}
        sparkId="fat-prev"
      />
      <KpiCard
        title="Faturamento Realizado"
        value={data ? `R$ ${data.faturamentoRealizado.toLocaleString('pt-BR')}` : 'R$ 0'}
        icon={<IcoCheck />}
        loading={loading}
        subtitle="Recebido hoje"
        color="#52B788"
        sparkline={data?.evolucaoFaturamento}
        sparkId="fat-real"
      />
      <KpiCard
        title={`Total ${labels.termoPacientePlural}`}
        value={data ? data.totalAtendimentos : 0}
        icon={<IcoPeople />}
        loading={loading}
        subtitle="Atendimentos do dia"
        color="#2D6A4F"
        sparkline={data?.evolucaoAtendimentos}
        sparkId="atend"
      />
      <KpiCard
        title="Taxa de Ocupação"
        value={data ? `${data.taxaOcupacao}%` : '0%'}
        icon={<IcoChart />}
        loading={loading}
        subtitle={`${data?.horariosLivres || 0} slots livres`}
        color="#95D5B2"
        sparkline={data?.evolucaoAtendimentos}
        sparkId="ocup"
      />

      {(nicho === 'SALAO_BELEZA' || nicho === 'BARBEARIA') && data && (
        <KpiCard
          title="Mix de Vendas"
          value={`${data.assinantesAgendados} Assin.`}
          icon={<IcoTicket />}
          loading={loading}
          subtitle={`${data.avulsosAgendados} avulsos hoje`}
          color="#B7E4C7"
          sparkline={data?.evolucaoAtendimentos}
          sparkId="mix"
        />
      )}
      {(nicho === 'CLINICA_MEDICA' || nicho === 'FISIOTERAPIA') && data && (
        <KpiCard
          title="Mix de Planos"
          value={`${data.conveniosCount} Conv.`}
          icon={<IcoClinic />}
          loading={loading}
          subtitle={`${data.particularesCount} particulares`}
          color="#74C69D"
          sparkline={data?.evolucaoAtendimentos}
          sparkId="mix-cli"
        />
      )}
    </div>
  );
}
