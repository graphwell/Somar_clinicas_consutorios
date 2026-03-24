"use client";
import React, { useState, useEffect } from 'react';
import { fetchWithAuth } from '@/lib/api-utils';

type Tab = 'overview' | 'whatsapp' | 'n8n' | 'logs';

export default function OpsCenterPage() {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth('/api/admin/ops');
      const json = await res.json();
      setData(json);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    const clock = setInterval(() => setNow(new Date()), 1000);
    return () => { clearInterval(interval); clearInterval(clock); };
  }, []);

  const renderOverview = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <MetricCard label="Uptime Servidor" value={data?.server?.uptime || '---'} sub="estável" highlight="text-status-success" />
        <MetricCard label="Latência API" value={`${data?.server?.apiLatency}ms`} sub="média 5min" highlight="text-primary" />
        <MetricCard label="Instâncias WA" value={`${data?.whatsapp?.activeInstances}/${data?.whatsapp?.totalInstances}`} sub="4 ativas, 1 offline" highlight="text-status-warning" />
        <MetricCard label="Fluxos N8N" value={data?.n8n?.activeWorkflows || 0} sub="todos rodando" highlight="text-status-success" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ServerSection title="Servidor Principal" metrics={[
          { label: 'CPU', value: `${data?.server?.cpuUsage}%`, color: 'bg-status-success' },
          { label: 'Memória', value: `${data?.server?.memUsage}%`, color: 'bg-status-warning' },
          { label: 'Disco', value: `${data?.server?.diskUsage}%`, color: 'bg-status-success' },
          { label: 'Uptime', value: data?.server?.uptime, color: 'text-text-main' }
        ]} />
        <ServerSection title="Banco de Dados Master" metrics={[
          { label: 'Resposta', value: `${data?.masterDb?.latency}ms`, color: 'bg-status-success' },
          { label: 'Conexões', value: `${data?.masterDb?.activeConns}/100`, color: 'bg-status-success' },
          { label: 'SaaS Tenants', value: '4 empresas', color: 'text-primary' },
          { label: 'Última gravação', value: 'há 2min', color: 'text-status-success' }
        ]} />
      </div>

      <div className="bg-white p-8 rounded-3xl border border-card-border shadow-sm">
        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-text-placeholder mb-6">Uptime últimas 24h (segmentos 30min)</h3>
        <div className="space-y-4">
          {['Servidor', 'Banco', 'N8N', 'WhatsApp', 'Pagamentos'].map(service => (
            <div key={service} className="flex items-center gap-4">
              <span className="w-24 text-[10px] font-black text-text-muted uppercase">{service}</span>
              <div className="flex-1 flex gap-1">
                {data?.uptimeHistory?.map((status: string, i: number) => (
                  <div key={i} className={`h-4 flex-1 rounded-sm ${status === 'ok' ? 'bg-status-success/40' : 'bg-status-error/40'}`} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderWhatsApp = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="bg-white rounded-3xl border border-card-border shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-card-border">
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-text-muted">Empresa / ID</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-text-muted">Telefone</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-text-muted">Status</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-text-muted">Enviadas</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-text-muted">Recebidas</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-text-muted text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {[1, 2, 3, 4].map(i => (
              <tr key={i} className="hover:bg-slate-50/50 transition-all">
                <td className="px-6 py-5 font-black text-xs text-text-main">Empresa {i} <span className="block text-[9px] font-bold text-text-placeholder">inst_{i}abc</span></td>
                <td className="px-6 py-5 text-xs text-text-muted">+55 85 99151-610{i}</td>
                <td className="px-6 py-5">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-status-success rounded-full animate-pulse" />
                    <span className="text-[10px] font-black text-status-success uppercase">Conectado</span>
                  </div>
                </td>
                <td className="px-6 py-5 text-xs font-black text-primary">342</td>
                <td className="px-6 py-5 text-xs font-black text-text-muted">128</td>
                <td className="px-6 py-5 text-right">
                  <button className="px-3 py-1.5 bg-white border border-card-border rounded-lg text-[8px] font-black uppercase hover:bg-slate-100 transition-all">Desconectar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderN8N = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-card-border shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-text-placeholder uppercase tracking-widest">Execuções 24h</p>
            <p className="text-2xl font-black text-text-main">847</p>
          </div>
          <div className="w-12 h-12 bg-primary-soft rounded-2xl flex items-center justify-center text-primary font-black">⚡</div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-card-border shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-text-placeholder uppercase tracking-widest">Falhas Hoje</p>
            <p className="text-2xl font-black text-status-error">2</p>
          </div>
          <div className="w-12 h-12 bg-status-error-bg rounded-2xl flex items-center justify-center text-status-error font-black">⚠</div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-card-border shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-text-placeholder uppercase tracking-widest">Fila de Espera</p>
            <p className="text-2xl font-black text-status-success">0</p>
          </div>
          <div className="w-12 h-12 bg-status-success-bg rounded-2xl flex items-center justify-center text-status-success font-black">≋</div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-card-border shadow-sm overflow-hidden">
        <ul className="divide-y divide-slate-50">
          {['Agenda Bot', 'Marketing Blaster', 'Checkout Link Gen', 'AI Context Loader'].map((name, i) => (
            <li key={i} className="px-8 py-6 flex items-center justify-between hover:bg-slate-50/50 transition-all">
              <div className="flex items-center gap-4">
                <div className={`w-3 h-3 rounded-full ${i === 3 ? 'bg-status-warning' : 'bg-status-success'}`} />
                <div>
                  <p className="font-black text-sm text-text-main">{name}</p>
                  <p className="text-[9px] font-bold text-text-placeholder uppercase tracking-widest italic">Última execução: há {i*5+2} min</p>
                </div>
              </div>
              <div className="flex items-center gap-10">
                <div className="text-right">
                   <p className="text-xs font-black text-text-main">{(i+1)*12}ms</p>
                   <p className="text-[8px] font-bold text-text-muted uppercase tracking-widest">Latência Média</p>
                </div>
                <button className="px-4 py-2 bg-white border border-card-border rounded-xl text-[9px] font-black uppercase hover:bg-slate-50 transition-all">Histórico</button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto p-6 md:p-12 space-y-10">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-black tracking-tight text-text-main">
            Synka <span className="text-primary italic">Ops Center</span>
          </h1>
          <div className="flex items-center gap-2 px-3 py-1 bg-slate-50 border border-card-border rounded-full">
            <div className={`w-2 h-2 rounded-full animate-pulse ${data?.stats?.error > 0 ? 'bg-status-error' : 'bg-status-success'}`} />
            <span className="text-[9px] font-black text-text-muted uppercase tracking-widest">
              {data?.stats?.error > 0 ? 'Atenção: Sistemas instáveis' : 'Todos os sistemas operando'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <span className="text-xs font-black text-text-placeholder mono">{now.toLocaleTimeString()}</span>
          <button onClick={fetchData} className="px-5 py-2.5 bg-white border border-card-border rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all">
            ↻ Verificar agora
          </button>
        </div>
      </header>

      <nav className="flex gap-4 p-1.5 bg-slate-50 border border-card-border rounded-2xl w-fit">
        {(['overview', 'whatsapp', 'n8n', 'logs'] as Tab[]).map(t => (
          <button 
            key={t}
            onClick={() => setActiveTab(t)}
            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all
              ${activeTab === t ? 'bg-white text-primary shadow-sm border border-card-border' : 'text-text-placeholder hover:text-text-main'}`}
          >
            {t === 'overview' ? 'Visão Geral' : t === 'whatsapp' ? 'WhatsApp' : t === 'n8n' ? 'N8N' : 'Logs ao Vivo'}
          </button>
        ))}
      </nav>

      {activeTab === 'overview' && renderOverview()}
      {activeTab === 'whatsapp' && renderWhatsApp()}
      {activeTab === 'n8n' && renderN8N()}
      {activeTab === 'logs' && (
        <div className="bg-white p-20 rounded-3xl border border-card-border border-dashed text-center">
          <p className="text-[10px] font-black text-text-placeholder uppercase tracking-[0.5em]">O Feed de Logs em tempo real requer WebSocket.</p>
        </div>
      )}
    </div>
  );
}

const MetricCard = ({ label, value, sub, highlight }: any) => (
  <div className="bg-white p-6 rounded-3xl border border-card-border shadow-sm transform hover:scale-[1.02] transition-all">
    <p className="text-[9px] font-black uppercase tracking-widest text-text-placeholder mb-2">{label}</p>
    <div className="flex items-baseline gap-2">
       <span className={`text-2xl font-black ${highlight}`}>{value}</span>
    </div>
    <p className="text-[8px] font-bold text-text-muted mt-1 uppercase italic">{sub}</p>
  </div>
);

const ServerSection = ({ title, metrics }: any) => (
  <div className="bg-white p-8 rounded-3xl border border-card-border shadow-sm">
    <div className="flex items-center justify-between mb-8">
      <h3 className="text-sm font-black text-text-main uppercase tracking-widest">{title}</h3>
      <span className="px-3 py-1 bg-status-success-bg text-status-success text-[8px] font-black uppercase rounded-full">Online</span>
    </div>
    <div className="grid grid-cols-2 gap-y-6 gap-x-10">
      {metrics.map((m: any, i: number) => (
        <div key={i} className="space-y-2">
          <div className="flex justify-between items-center text-[9px] font-black text-text-placeholder uppercase tracking-widest">
            <span>{m.label}</span>
            <span className="text-text-main">{m.value}</span>
          </div>
          {typeof m.value === 'string' && m.value.includes('%') && (
            <div className="h-1.5 w-full bg-slate-50 rounded-full overflow-hidden">
               <div className={`h-full ${m.color}`} style={{ width: m.value }} />
            </div>
          )}
        </div>
      ))}
    </div>
  </div>
);
