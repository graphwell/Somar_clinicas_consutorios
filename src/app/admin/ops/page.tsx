"use client";
import React, { useState, useEffect, useRef } from 'react';
import { fetchWithAuth } from '@/lib/api-utils';

type Tab = 'overview' | 'whatsapp' | 'n8n' | 'logs';

interface WaInstancia {
  id: string;
  sessionId: string;
  numeroWa: string | null;
  status: string;
  plataforma: string;
  webhookUrl: string | null;
  observacoes: string | null;
  criadoEm: string;
  conectadoEm: string | null;
  ultimoPing: string | null;
  empresa: { nome: string; tenantId: string } | null;
}

export default function OpsCenterPage() {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());

  // WhatsApp tab state
  const [waInstancias, setWaInstancias] = useState<WaInstancia[]>([]);
  const [waLoading, setWaLoading] = useState(false);
  const [qrModal, setQrModal] = useState<{ id: string; sessionId: string; qrCode?: string } | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const waFilterRef = useRef<string>('');
  const waPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  const fetchWaInstancias = async (statusFilter?: string) => {
    setWaLoading(true);
    try {
      const qs = statusFilter ? `?status=${statusFilter}` : '';
      const res = await fetch(`/api/admin/whatsapp${qs}`, {
        headers: { 'Authorization': `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('synka-token') : ''}` }
      });
      if (!res.ok) { setWaLoading(false); return; }
      const json = await res.json();
      setWaInstancias(json.instancias ?? []);
    } catch {
      // silenciar — usuário sem permissão synka_admin
    } finally {
      setWaLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    const clock = setInterval(() => setNow(new Date()), 1000);
    return () => { clearInterval(interval); clearInterval(clock); };
  }, []);

  // Carregar instâncias e iniciar polling ao entrar na aba WA
  useEffect(() => {
    if (activeTab === 'whatsapp') {
      fetchWaInstancias(waFilterRef.current || undefined);
      waPollRef.current = setInterval(() => {
        fetchWaInstancias(waFilterRef.current || undefined);
      }, 30000);
    } else {
      if (waPollRef.current) { clearInterval(waPollRef.current); waPollRef.current = null; }
    }
    return () => { if (waPollRef.current) { clearInterval(waPollRef.current); waPollRef.current = null; } };
  }, [activeTab]);

  const adminFetch = (path: string, options?: RequestInit) =>
    fetch(path, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('synka-token') : ''}`,
        ...(options?.headers ?? {}),
      },
    });

  async function handleReconectar(instancia: WaInstancia) {
    setQrLoading(true);
    setQrModal({ id: instancia.id, sessionId: instancia.sessionId });
    try {
      const res = await adminFetch(`/api/admin/whatsapp/${instancia.id}/reconectar`, { method: 'POST' });
      const json = await res.json();
      setQrModal({ id: instancia.id, sessionId: instancia.sessionId, qrCode: json.qrCode ?? undefined });
    } finally {
      setQrLoading(false);
    }
  }

  async function handleDesvincular(id: string) {
    if (!confirm('Desvincular instância desta empresa? Ela voltará ao pool como LIVRE.')) return;
    await adminFetch(`/api/admin/whatsapp/${id}/desvincular`, { method: 'PUT' });
    fetchWaInstancias(waFilterRef.current || undefined);
  }

  const statusColor = (s: string) => {
    switch (s) {
      case 'EM_USO': return 'text-status-success bg-status-success-bg border-status-success/20';
      case 'LIVRE': return 'text-primary bg-primary-soft border-primary/20';
      case 'AGUARDANDO': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'OFFLINE': return 'text-status-error bg-status-error-bg border-status-error/20';
      case 'DEMO': return 'text-purple-600 bg-purple-50 border-purple-200';
      default: return 'text-text-muted bg-slate-50 border-card-border';
    }
  };

  const pingAge = (ping: string | null) => {
    if (!ping) return '—';
    const diff = Math.floor((Date.now() - new Date(ping).getTime()) / 1000);
    if (diff < 60) return `${diff}s atrás`;
    if (diff < 3600) return `${Math.floor(diff / 60)}min atrás`;
    return `${Math.floor(diff / 3600)}h atrás`;
  };

  // ── Renders ──

  const renderOverview = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <MetricCard label="Uptime Servidor" value={data?.server?.uptime || '---'} sub="estável" highlight="text-status-success" />
        <MetricCard label="Latência API" value={`${data?.server?.apiLatency}ms`} sub="média 5min" highlight="text-primary" />
        <MetricCard
          label="Instâncias WA"
          value={`${data?.whatsapp?.activeInstances ?? '—'}/${data?.whatsapp?.totalInstances ?? '—'}`}
          sub={data?.whatsapp?.alertaEstoque ? '⚠ Estoque baixo' : `${data?.whatsapp?.freeInstances ?? 0} livres`}
          highlight={data?.whatsapp?.alertaEstoque ? 'text-status-error' : 'text-status-success'}
        />
        <MetricCard label="Fluxos N8N" value={data?.n8n?.activeWorkflows || 0} sub="todos rodando" highlight="text-status-success" />
      </div>

      {data?.whatsapp?.alertaEstoque && (
        <div className="flex items-center gap-4 p-5 bg-status-error-bg border border-status-error/20 rounded-2xl">
          <span className="text-status-error text-lg">⚠️</span>
          <p className="text-sm font-black text-status-error">
            Estoque WhatsApp crítico — apenas {data?.whatsapp?.freeInstances} instância(s) livre(s). Adicione novas no WasenderAPI.
          </p>
          <button onClick={() => setActiveTab('whatsapp')} className="ml-auto px-5 py-2 bg-white border border-status-error/20 text-status-error rounded-xl text-[10px] font-black uppercase hover:bg-status-error/5 transition-all">
            Ver Pool
          </button>
        </div>
      )}

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
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Total', value: data?.whatsapp?.totalInstances ?? '—', color: 'text-text-main' },
          { label: 'Livres', value: data?.whatsapp?.freeInstances ?? '—', color: 'text-primary' },
          { label: 'Em Uso', value: data?.whatsapp?.activeInstances ?? '—', color: 'text-status-success' },
          { label: 'Aguardando', value: data?.whatsapp?.waitingInstances ?? '—', color: 'text-yellow-600' },
          { label: 'Offline', value: data?.whatsapp?.offlineInstances ?? '—', color: 'text-status-error' },
        ].map(k => (
          <div key={k.label} className="bg-white p-5 rounded-2xl border border-card-border shadow-sm text-center">
            <p className="text-[9px] font-black uppercase tracking-widest text-text-placeholder mb-1">{k.label}</p>
            <p className={`text-2xl font-black ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Filtro + Refresh */}
      <div className="flex items-center gap-4">
        <div className="flex gap-2">
          {['', 'LIVRE', 'EM_USO', 'AGUARDANDO', 'OFFLINE'].map(f => (
            <button
              key={f}
              onClick={() => { waFilterRef.current = f; fetchWaInstancias(f || undefined); }}
              className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border
                ${waFilterRef.current === f ? 'bg-primary text-white border-primary' : 'bg-white text-text-placeholder border-card-border hover:text-text-main'}`}
            >
              {f || 'Todos'}
            </button>
          ))}
        </div>
        <button
          onClick={() => fetchWaInstancias(waFilterRef.current || undefined)}
          className="ml-auto px-4 py-2 bg-white border border-card-border rounded-xl text-[9px] font-black uppercase hover:bg-slate-50 transition-all"
        >
          {waLoading ? 'Carregando...' : '↻ Atualizar'}
        </button>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-3xl border border-card-border shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-card-border">
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-text-muted">Session / Empresa</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-text-muted">Telefone</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-text-muted">Status</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-text-muted">Último Ping</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-text-muted text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {waLoading && waInstancias.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-[10px] font-black text-text-placeholder uppercase tracking-widest">
                  Carregando instâncias...
                </td>
              </tr>
            ) : waInstancias.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-[10px] font-black text-text-placeholder uppercase tracking-widest">
                  Nenhuma instância encontrada
                </td>
              </tr>
            ) : waInstancias.map(inst => (
              <tr key={inst.id} className="hover:bg-slate-50/50 transition-all">
                <td className="px-6 py-5">
                  <p className="font-black text-xs text-text-main font-mono">{inst.sessionId}</p>
                  <p className="text-[9px] text-text-placeholder mt-0.5">
                    {inst.empresa ? inst.empresa.nome : <span className="italic opacity-60">Sem empresa</span>}
                  </p>
                </td>
                <td className="px-6 py-5 text-xs text-text-muted font-mono">
                  {inst.numeroWa ?? '—'}
                </td>
                <td className="px-6 py-5">
                  <span className={`text-[9px] font-black uppercase px-3 py-1.5 rounded-full border ${statusColor(inst.status)}`}>
                    {inst.status === 'EM_USO' ? '● Ativo' :
                     inst.status === 'LIVRE' ? '○ Livre' :
                     inst.status === 'AGUARDANDO' ? '⏳ Aguardando' :
                     inst.status === 'OFFLINE' ? '✕ Offline' :
                     inst.status === 'DEMO' ? '◆ Demo' : inst.status}
                  </span>
                </td>
                <td className="px-6 py-5 text-[10px] text-text-muted">
                  {pingAge(inst.ultimoPing)}
                </td>
                <td className="px-6 py-5 text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => handleReconectar(inst)}
                      className="px-3 py-1.5 bg-white border border-card-border rounded-lg text-[8px] font-black uppercase hover:bg-slate-100 transition-all"
                    >
                      QR / Reconectar
                    </button>
                    {inst.empresa && (
                      <button
                        onClick={() => handleDesvincular(inst.id)}
                        className="px-3 py-1.5 bg-status-error-bg text-status-error border border-status-error/10 rounded-lg text-[8px] font-black uppercase hover:bg-status-error/10 transition-all"
                      >
                        Desvincular
                      </button>
                    )}
                  </div>
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
                  <p className="text-[9px] font-bold text-text-placeholder uppercase tracking-widest italic">Última execução: há {i * 5 + 2} min</p>
                </div>
              </div>
              <div className="flex items-center gap-10">
                <div className="text-right">
                  <p className="text-xs font-black text-text-main">{(i + 1) * 12}ms</p>
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
            <div className={`w-2 h-2 rounded-full animate-pulse ${data?.whatsapp?.alertaEstoque ? 'bg-status-error' : 'bg-status-success'}`} />
            <span className="text-[9px] font-black text-text-muted uppercase tracking-widest">
              {data?.whatsapp?.alertaEstoque ? 'Atenção: Estoque WA baixo' : 'Todos os sistemas operando'}
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
            {t === 'whatsapp' && data?.whatsapp?.alertaEstoque && (
              <span className="ml-2 w-2 h-2 bg-status-error rounded-full inline-block animate-pulse" />
            )}
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

      {/* Modal QR Code */}
      {qrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl border border-card-border shadow-2xl p-10 w-full max-w-sm space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black uppercase tracking-widest text-text-main">QR Code</h3>
              <button onClick={() => setQrModal(null)} className="text-text-placeholder hover:text-text-main text-lg font-black">✕</button>
            </div>
            <p className="text-[10px] font-black text-text-placeholder uppercase">Session: <span className="font-mono text-text-main">{qrModal.sessionId}</span></p>
            {qrLoading ? (
              <div className="h-40 flex items-center justify-center">
                <p className="text-[10px] font-black text-text-placeholder uppercase animate-pulse">Gerando QR Code...</p>
              </div>
            ) : qrModal.qrCode ? (
              <>
                <img src={qrModal.qrCode} alt="QR Code" className="w-full rounded-2xl border border-card-border" />
                <p className="text-[10px] text-text-placeholder text-center">Escaneie com o WhatsApp → Dispositivos Conectados</p>
              </>
            ) : (
              <p className="text-[10px] font-black text-status-error text-center uppercase">Falha ao gerar QR. Tente novamente.</p>
            )}
            <button onClick={() => setQrModal(null)} className="w-full py-4 bg-white border border-card-border rounded-2xl text-[10px] font-black uppercase hover:bg-slate-50 transition-all">
              Fechar
            </button>
          </div>
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
