"use client";
import React, { useState, useEffect } from 'react';
import { fetchWithAuth } from '@/lib/api-utils';

interface TenantHealth {
  id: string;
  tenantId: string;
  nome: string;
  nicho: string;
  status: 'ok' | 'warn' | 'error';
  message: string;
  latencyMs: number;
  tableCounts: Record<string, number>;
  missingTables: string[];
  lastWrite: string | null;
  plan: string;
}

const StatusCard = ({ label, value, sub, color }: { label: string; value: number; sub: string; color: string }) => (
  <div className="bg-white p-6 rounded-3xl border border-card-border shadow-sm">
    <p className="text-[10px] font-black uppercase tracking-widest text-text-placeholder mb-2">{label}</p>
    <div className="flex items-baseline gap-2">
      <span className={`text-4xl font-black ${color}`}>{value}</span>
      <span className="text-[10px] font-bold text-text-muted italic">{sub}</span>
    </div>
  </div>
);

export default function AdminHealthPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'ok' | 'warn' | 'error'>('all');
  const [lastUpdate, setLastUpdate] = useState(new Date());

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth('/api/admin/health');
      const json = await res.json();
      setData(json);
      setLastUpdate(new Date());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, []);

  const tenants = data?.tenants || [];
  const filteredTenants = tenants.filter((t: any) => filter === 'all' || t.status === filter);

  return (
    <div className="space-y-10 max-w-7xl mx-auto p-6 md:p-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-black tracking-tight text-text-main">
            Saúde dos Bancos <span className="text-text-placeholder font-medium text-lg">— ao vivo</span>
          </h1>
          <div className={`w-3 h-3 rounded-full animate-pulse ${
            data?.stats?.error > 0 ? 'bg-status-error' : data?.stats?.warn > 0 ? 'bg-status-warning' : 'bg-status-success'
          }`} />
        </div>
        <button 
          onClick={fetchData} 
          disabled={loading}
          className="px-6 py-3 bg-white border border-card-border rounded-2xl font-black text-xs hover:bg-slate-50 transition-all flex items-center gap-2"
        >
          {loading ? 'Verificando...' : '↻ Atualizar agora'}
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatusCard label="Empresas Ativas" value={data?.stats?.total || 0} sub="todas as contas" color="text-text-main" />
        <StatusCard label="Bancos OK" value={data?.stats?.ok || 0} sub="conectados e gravando" color="text-status-success" />
        <StatusCard label="Com Alerta" value={data?.stats?.warn || 0} sub="atenção necessária" color="text-status-warning" />
        <StatusCard label="Com Erro" value={data?.stats?.error || 0} sub="requer ação imediata" color="text-status-error" />
      </div>

      {/* Filter & List */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
           <h3 className="text-sm font-black uppercase tracking-widest text-text-placeholder">Empresas Cadastradas</h3>
           <div className="flex gap-2">
             {(['all', 'ok', 'warn', 'error'] as const).map(f => (
               <button 
                 key={f}
                 onClick={() => setFilter(f)}
                 className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all
                   ${filter === f ? 'bg-primary text-white shadow-lg' : 'bg-white border border-card-border text-text-muted hover:bg-slate-50'}`}
               >
                 {f === 'all' ? 'Todos' : f}
               </button>
             ))}
           </div>
        </div>

        <div className="space-y-4">
          {filteredTenants.map((t: TenantHealth) => (
            <div key={t.tenantId} className={`bg-white border rounded-3xl p-6 transition-all hover:shadow-md ${
                t.status === 'error' ? 'border-status-error/30' : t.status === 'warn' ? 'border-status-warning/30' : 'border-card-border'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-5">
                   <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl shadow-sm
                     ${t.status === 'error' ? 'bg-status-error-bg text-status-error' : t.status === 'warn' ? 'bg-status-warning-bg text-status-warning' : 'bg-primary-soft text-primary'}`}>
                     {t.nome.substring(0,2).toUpperCase()}
                   </div>
                   <div>
                     <p className="font-black text-lg text-text-main">{t.nome}</p>
                     <p className="text-[10px] font-bold text-text-placeholder uppercase tracking-widest italic">
                       {t.nicho} • ID: {t.id} • Plano {t.plan}
                     </p>
                   </div>
                </div>

                <div className="flex items-center gap-10">
                   <div className="text-right">
                     <p className={`text-[10px] font-black ${t.latencyMs > 200 ? 'text-status-error' : t.latencyMs > 100 ? 'text-status-warning' : 'text-status-success'}`}>
                       {t.latencyMs}ms
                     </p>
                     <p className="text-[9px] font-bold text-text-placeholder uppercase tracking-widest">Latência</p>
                   </div>

                   <div className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest
                     ${t.status === 'error' ? 'bg-status-error-bg text-status-error border border-status-error/10' : 
                       t.status === 'warn' ? 'bg-status-warning-bg text-status-warning border border-status-warning/10' : 
                       'bg-status-success-bg text-status-success border border-status-success/10'}`}>
                     {t.message}
                   </div>

                   <button className="p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-all border border-card-border text-text-placeholder">
                     {t.status === 'error' ? '🔧' : '▶'}
                   </button>
                </div>
              </div>

              {/* Detail section - Simple preview here, could be expanded */}
              <div className="mt-6 pt-6 border-t border-slate-50 grid grid-cols-2 md:grid-cols-4 gap-4">
                 <div className="space-y-1">
                   <p className="text-[9px] font-bold text-text-placeholder uppercase tracking-widest">Registros Totais</p>
                   <p className="text-xs font-black text-text-main">
                     {Object.values(t.tableCounts).reduce((a, b) => a + b, 0)} items
                   </p>
                 </div>
                 <div className="space-y-1">
                   <p className="text-[9px] font-bold text-text-placeholder uppercase tracking-widest">Última Gravação</p>
                   <p className="text-xs font-black text-text-main">{t.lastWrite ? new Date(t.lastWrite).toLocaleString() : 'Nenhuma'}</p>
                 </div>
                 <div className="col-span-2 flex flex-wrap gap-2">
                   {Object.entries(t.tableCounts).map(([name, count]) => (
                     <span key={name} className="px-2 py-1 bg-slate-50 border border-card-border rounded-lg text-[8px] font-bold text-text-muted uppercase tracking-widest">
                       {name}: <span className="text-primary font-black">{count}</span>
                     </span>
                   ))}
                   {t.missingTables.map(name => (
                     <span key={name} className="px-2 py-1 bg-status-error-bg border border-status-error/10 rounded-lg text-[8px] font-black text-status-error uppercase tracking-widest">
                       {name} MISSING
                     </span>
                   ))}
                 </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <footer className="pt-10 text-center text-[9px] font-bold text-text-placeholder uppercase tracking-widest italic">
        Última verificação oficial: {lastUpdate.toLocaleTimeString()} — Synka Health Guard V2.3
      </footer>
    </div>
  );
}
