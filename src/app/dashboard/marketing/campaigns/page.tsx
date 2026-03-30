"use client";
import React, { useState, useEffect, useRef } from 'react';
import { useNicho } from '@/context/NichoContext';
import { fetchWithAuth } from '@/lib/api-utils';

// ─── Types ────────────────────────────────────────────────────────────────────
type Service = { id: string; nome: string; preco: number };
type Campanha = {
  id: string; titulo: string; mensagem: string; tipo: string;
  status: string; totalEnviado: number; totalErros: number;
  filtroServico?: string; filtroInativoDias?: number; createdAt: string;
};
type MarketingConfig = {
  lembreteAtivo: boolean; lembreteAntecedencia: number; lembreteTemplate: string | null;
  aniversarioAtivo: boolean; aniversarioDesconto: number; aniversarioTemplate: string | null;
  linkConfirmacao: string | null;
};
type WhatsappInstance = { sessionId: string; numeroWa: string | null; status: string; plataforma: string } | null;
type Metrics = {
  summary: Record<string, { enviado: number; erro: number }>;
  totalEnviados: number; totalErros: number; campanhasConcluidas: number;
  enviosRecentes: any[];
};

const DEFAULT_LEMBRETE = `Olá, {nome}! 👋

Passando para lembrar do seu agendamento:
📅 *{data}* às *{hora}*
💆 {servico} com {profissional}

Para confirmar sua presença, responda *SIM*.
Para cancelar, responda *NÃO*.

_Equipe {clinica}_`;

const DEFAULT_ANIVERSARIO = `🎂 *Feliz Aniversário, {nome}!*

A equipe {clinica} deseja a você um dia muito especial! 🎉

Como presente, preparamos um desconto exclusivo:
🎁 *{desconto}% OFF* na sua próxima visita!

Este desconto é válido por 30 dias. 💖

Com carinho,
_Equipe {clinica}_ 🌟`;

// ─── Component ────────────────────────────────────────────────────────────────
export default function MarketingCentralPage() {
  const { labels } = useNicho();
  const [tab, setTab] = useState<'automacoes' | 'campanhas' | 'combos' | 'historico'>('automacoes');

  // Data
  const [config, setConfig] = useState<MarketingConfig | null>(null);
  const [instance, setInstance] = useState<WhatsappInstance>(null);
  const [campanhas, setCampanhas] = useState<Campanha[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);

  // Automações local state
  const [localConfig, setLocalConfig] = useState<Partial<MarketingConfig>>({});
  const [savingConfig, setSavingConfig] = useState(false);
  const [configSaved, setConfigSaved] = useState(false);

  // Campanhas
  const [showNovaCampanha, setShowNovaCampanha] = useState(false);
  const [novaCampanha, setNovaCampanha] = useState({ titulo: '', mensagem: '', tipo: 'todos', filtroServico: '', filtroInativoDias: '30' });
  const [creatingCampanha, setCreatingCampanha] = useState(false);
  const [dispatchingId, setDispatchingId] = useState<string | null>(null);
  const [dispatchProgress, setDispatchProgress] = useState<{ enviados: number; erros: number; total: number; nome: string } | null>(null);

  // Combos
  const [step, setStep] = useState(1);
  const [selectedMain, setSelectedMain] = useState('');
  const [selectedUpsell, setSelectedUpsell] = useState('');
  const [discount, setDiscount] = useState(15);
  const [showNewServiceModal, setShowNewServiceModal] = useState(false);
  const [newServiceName, setNewServiceName] = useState('');
  const [newServicePrice, setNewServicePrice] = useState('0');

  useEffect(() => {
    Promise.all([
      fetchWithAuth('/api/marketing/config').then(r => r.json()),
      fetchWithAuth('/api/marketing/campanhas').then(r => r.json()),
      fetchWithAuth('/api/marketing/metrics').then(r => r.json()),
      fetchWithAuth('/api/services').then(r => r.json()),
    ]).then(([cfg, camps, met, svcs]) => {
      if (cfg.config) { setConfig(cfg.config); setLocalConfig(cfg.config); }
      if (cfg.instance) setInstance(cfg.instance);
      if (Array.isArray(camps)) setCampanhas(camps);
      if (met.totalEnviados !== undefined) setMetrics(met);
      if (Array.isArray(svcs)) setServices(svcs);
    }).finally(() => setLoading(false));
  }, []);

  // ── Config save ────────────────────────────────────────────────
  const handleSaveConfig = async () => {
    setSavingConfig(true);
    try {
      const res = await fetchWithAuth('/api/marketing/config', {
        method: 'PATCH',
        body: JSON.stringify(localConfig),
      });
      if (res.ok) {
        setConfigSaved(true);
        setTimeout(() => setConfigSaved(false), 2500);
      }
    } finally {
      setSavingConfig(false);
    }
  };

  // ── Criar campanha ─────────────────────────────────────────────
  const handleCreateCampanha = async () => {
    if (!novaCampanha.titulo || !novaCampanha.mensagem) return;
    setCreatingCampanha(true);
    try {
      const res = await fetchWithAuth('/api/marketing/campanhas', {
        method: 'POST',
        body: JSON.stringify({
          ...novaCampanha,
          filtroInativoDias: novaCampanha.tipo === 'inativos' ? Number(novaCampanha.filtroInativoDias) : undefined,
          filtroServico: novaCampanha.tipo === 'servico' ? novaCampanha.filtroServico : undefined,
        }),
      });
      if (res.ok) {
        const nova = await res.json();
        setCampanhas(prev => [nova, ...prev]);
        setShowNovaCampanha(false);
        setNovaCampanha({ titulo: '', mensagem: '', tipo: 'todos', filtroServico: '', filtroInativoDias: '30' });
      }
    } finally {
      setCreatingCampanha(false);
    }
  };

  // ── Disparar campanha (streaming) ──────────────────────────────
  const handleDispatch = async (campanhaId: string) => {
    setDispatchingId(campanhaId);
    setDispatchProgress(null);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('synka_token') : null;
      const res = await fetch(`/api/marketing/campanhas/${campanhaId}/dispatch`, {
        method: 'POST',
        headers: { Authorization: token ? `Bearer ${token}` : '' },
      });
      if (!res.body) return;
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = dec.decode(value);
        for (const line of chunk.split('\n')) {
          if (!line.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === 'progress') {
              setDispatchProgress({ enviados: data.enviados, erros: data.erros, total: data.total, nome: data.nome });
            }
            if (data.type === 'done') {
              setCampanhas(prev => prev.map(c =>
                c.id === campanhaId
                  ? { ...c, status: 'concluida', totalEnviado: data.enviados, totalErros: data.erros }
                  : c
              ));
              setDispatchProgress(null);
            }
          } catch {}
        }
      }
    } finally {
      setDispatchingId(null);
    }
  };

  // ── Combo Builder ──────────────────────────────────────────────
  const mainService = services.find(s => s.id === selectedMain);
  const upsellService = services.find(s => s.id === selectedUpsell);
  const totalPrice = (mainService?.preco || 0) + (upsellService?.preco || 0);
  const savings = (upsellService?.preco || 0) * (discount / 100);
  const finalPrice = totalPrice - savings;

  const handleSaveCombo = async () => {
    if (!selectedMain || !selectedUpsell) return;
    const res = await fetchWithAuth('/api/settings/upsell', {
      method: 'POST',
      body: JSON.stringify({
        servicoGatilhoId: selectedMain,
        servicoOferecidoId: selectedUpsell,
        descricaoOferta: `Aproveite! Adicione ${upsellService?.nome} por apenas R$ ${(upsellService!.preco - savings).toFixed(2)}`,
        desconto: discount,
        ativo: true,
      }),
    });
    if (res.ok) { alert('🚀 Combo ativado!'); window.location.reload(); }
  };

  const handleAddService = async () => {
    if (!newServiceName) return;
    const res = await fetchWithAuth('/api/services', {
      method: 'POST',
      body: JSON.stringify({ nome: newServiceName, preco: Number(newServicePrice) }),
    });
    if (res.ok) {
      const created = await res.json();
      setServices(prev => [...prev, created]);
      setShowNewServiceModal(false);
      setNewServiceName(''); setNewServicePrice('0');
    }
  };

  // ── Helpers ────────────────────────────────────────────────────
  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      rascunho: 'bg-[var(--foreground)]/10 text-[var(--text-muted)]',
      enviando: 'bg-yellow-500/10 text-yellow-500',
      concluida: 'bg-emerald-500/10 text-emerald-500',
      cancelado: 'bg-red-500/10 text-red-500',
    };
    const labels: Record<string, string> = { rascunho: 'Rascunho', enviando: 'Enviando...', concluida: 'Concluída', cancelado: 'Cancelada' };
    return (
      <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wide ${map[status] || map.rascunho}`}>
        {labels[status] || status}
      </span>
    );
  };

  const tipoBadge = (tipo: string) => {
    const map: Record<string, string> = {
      todos: '👥 Todos', aniversariantes: '🎂 Aniversariantes', inativos: '💤 Inativos', servico: '🔧 Serviço',
    };
    return map[tipo] || tipo;
  };

  const instanceStatus = instance ? (
    instance.status === 'EM_USO' || instance.status === 'AGUARDANDO'
      ? { label: 'WhatsApp Conectado', color: 'bg-emerald-500', text: 'text-emerald-500', dot: 'bg-emerald-500' }
      : { label: 'WhatsApp Desconectado', color: 'bg-red-500', text: 'text-red-500', dot: 'bg-red-500' }
  ) : { label: 'WhatsApp não configurado', color: 'bg-yellow-500', text: 'text-yellow-500', dot: 'bg-yellow-500' };

  const TABS = [
    { id: 'automacoes', label: '🤖 Automações' },
    { id: 'campanhas', label: '📢 Campanhas' },
    { id: 'combos', label: '🚀 Combos' },
    { id: 'historico', label: '📋 Histórico' },
  ] as const;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-10 animate-in fade-in duration-500">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-[var(--card-bg)] border border-[var(--border)] p-8 rounded-[2.5rem] shadow-sm">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-[var(--foreground)]">Central de Marketing</h2>
          <p className="text-[var(--text-muted)] mt-1 font-medium italic">
            Automações, campanhas WhatsApp e combos para sua clínica.
          </p>
        </div>
        {/* WhatsApp status */}
        <div className={`flex items-center gap-3 px-6 py-3 rounded-2xl border ${instance?.status === 'EM_USO' || instance?.status === 'AGUARDANDO' ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-yellow-500/30 bg-yellow-500/5'}`}>
          <span className={`w-2.5 h-2.5 rounded-full ${instanceStatus.dot} animate-pulse`} />
          <span className={`text-xs font-black uppercase tracking-widest ${instanceStatus.text}`}>
            {instanceStatus.label}
          </span>
          {instance?.numeroWa && (
            <span className="text-[10px] text-[var(--text-muted)] font-medium">{instance.numeroWa}</span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">

        {/* Main */}
        <div className="lg:col-span-3 space-y-6">

          {/* Tabs */}
          <div className="flex gap-1 p-1.5 bg-[var(--foreground)]/5 border border-[var(--border)] rounded-[1.5rem] overflow-x-auto">
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex-1 min-w-max px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${tab === t.id ? 'bg-[var(--accent)] text-white shadow-lg shadow-[var(--accent)]/20' : 'text-[var(--text-muted)] hover:text-[var(--foreground)]'}`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* ── Tab: Automações ─────────────────────────────────── */}
          {tab === 'automacoes' && (
            <div className="space-y-6">
              {!instance && (
                <div className="bg-yellow-500/5 border border-yellow-500/30 rounded-[2rem] p-6 text-sm text-yellow-500 font-medium">
                  ⚠️ Nenhuma instância WhatsApp configurada. Vá em <strong>Configurações → Integrações</strong> para conectar.
                </div>
              )}

              {/* Lembrete */}
              <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[2.5rem] p-8 space-y-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-[var(--accent)]/10 flex items-center justify-center text-2xl">⏰</div>
                    <div>
                      <h3 className="font-black text-[var(--foreground)] tracking-tight">Lembrete de Consulta</h3>
                      <p className="text-xs text-[var(--text-muted)] font-medium">Envia mensagem automática antes do agendamento</p>
                    </div>
                  </div>
                  {/* Toggle */}
                  <button
                    onClick={() => setLocalConfig(prev => ({ ...prev, lembreteAtivo: !prev.lembreteAtivo }))}
                    className={`relative w-14 h-7 rounded-full transition-all ${localConfig.lembreteAtivo ? 'bg-[var(--accent)]' : 'bg-[var(--foreground)]/10'}`}
                  >
                    <span className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-all ${localConfig.lembreteAtivo ? 'left-8' : 'left-1'}`} />
                  </button>
                </div>

                {localConfig.lembreteAtivo && (
                  <div className="space-y-5 pt-2">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest pl-1">Antecedência</label>
                      <select
                        value={localConfig.lembreteAntecedencia ?? 24}
                        onChange={e => setLocalConfig(prev => ({ ...prev, lembreteAntecedencia: Number(e.target.value) }))}
                        className="w-full max-w-xs bg-[var(--foreground)]/5 border border-[var(--border)] rounded-2xl px-5 py-3 text-sm focus:outline-none focus:border-[var(--accent)] font-medium"
                      >
                        {[1, 2, 4, 6, 12, 24, 48].map(h => (
                          <option key={h} value={h}>{h === 1 ? '1 hora antes' : `${h} horas antes`}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest pl-1">
                        Template da mensagem
                      </label>
                      <p className="text-[10px] text-[var(--text-muted)] pl-1">
                        Variáveis: <code className="bg-[var(--foreground)]/5 px-1 rounded">{'{nome}'}</code> <code className="bg-[var(--foreground)]/5 px-1 rounded">{'{data}'}</code> <code className="bg-[var(--foreground)]/5 px-1 rounded">{'{hora}'}</code> <code className="bg-[var(--foreground)]/5 px-1 rounded">{'{servico}'}</code> <code className="bg-[var(--foreground)]/5 px-1 rounded">{'{profissional}'}</code> <code className="bg-[var(--foreground)]/5 px-1 rounded">{'{clinica}'}</code>
                      </p>
                      <textarea
                        rows={7}
                        value={localConfig.lembreteTemplate ?? DEFAULT_LEMBRETE}
                        onChange={e => setLocalConfig(prev => ({ ...prev, lembreteTemplate: e.target.value }))}
                        className="w-full bg-[var(--foreground)]/5 border border-[var(--border)] rounded-2xl px-5 py-4 text-sm font-medium focus:outline-none focus:border-[var(--accent)] resize-none leading-relaxed"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Aniversário */}
              <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[2.5rem] p-8 space-y-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-2xl">🎂</div>
                    <div>
                      <h3 className="font-black text-[var(--foreground)] tracking-tight">Mensagem de Aniversário</h3>
                      <p className="text-xs text-[var(--text-muted)] font-medium">Parabeniza automaticamente no dia do aniversário</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setLocalConfig(prev => ({ ...prev, aniversarioAtivo: !prev.aniversarioAtivo }))}
                    className={`relative w-14 h-7 rounded-full transition-all ${localConfig.aniversarioAtivo ? 'bg-emerald-500' : 'bg-[var(--foreground)]/10'}`}
                  >
                    <span className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-all ${localConfig.aniversarioAtivo ? 'left-8' : 'left-1'}`} />
                  </button>
                </div>

                {localConfig.aniversarioAtivo && (
                  <div className="space-y-5 pt-2">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest pl-1">Desconto oferecido (%)</label>
                      <div className="flex items-center gap-4">
                        <input
                          type="range" min={0} max={50} step={5}
                          value={localConfig.aniversarioDesconto ?? 15}
                          onChange={e => setLocalConfig(prev => ({ ...prev, aniversarioDesconto: Number(e.target.value) }))}
                          className="flex-1 accent-emerald-500"
                        />
                        <span className="text-2xl font-black text-emerald-500 w-16 text-center">{localConfig.aniversarioDesconto ?? 15}%</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest pl-1">Template da mensagem</label>
                      <p className="text-[10px] text-[var(--text-muted)] pl-1">
                        Variáveis: <code className="bg-[var(--foreground)]/5 px-1 rounded">{'{nome}'}</code> <code className="bg-[var(--foreground)]/5 px-1 rounded">{'{desconto}'}</code> <code className="bg-[var(--foreground)]/5 px-1 rounded">{'{clinica}'}</code>
                      </p>
                      <textarea
                        rows={7}
                        value={localConfig.aniversarioTemplate ?? DEFAULT_ANIVERSARIO}
                        onChange={e => setLocalConfig(prev => ({ ...prev, aniversarioTemplate: e.target.value }))}
                        className="w-full bg-[var(--foreground)]/5 border border-[var(--border)] rounded-2xl px-5 py-4 text-sm font-medium focus:outline-none focus:border-[var(--accent)] resize-none leading-relaxed"
                      />
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={handleSaveConfig}
                disabled={savingConfig}
                className="w-full py-5 bg-[var(--accent)] hover:opacity-90 disabled:opacity-60 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-[var(--accent)]/20 transition-all active:scale-[0.99]"
              >
                {savingConfig ? 'Salvando...' : configSaved ? '✅ Configurações Salvas!' : 'Salvar Configurações'}
              </button>
            </div>
          )}

          {/* ── Tab: Campanhas ──────────────────────────────────── */}
          {tab === 'campanhas' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <p className="text-sm text-[var(--text-muted)] font-medium">{campanhas.length} campanha{campanhas.length !== 1 ? 's' : ''}</p>
                <button
                  onClick={() => setShowNovaCampanha(true)}
                  className="px-6 py-3 bg-[var(--accent)] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-[var(--accent)]/20 hover:opacity-90 transition-all"
                >
                  + Nova Campanha
                </button>
              </div>

              {campanhas.length === 0 ? (
                <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[2.5rem] p-16 text-center">
                  <div className="text-5xl mb-4">📢</div>
                  <p className="font-black text-[var(--text-muted)] uppercase tracking-widest text-xs">Nenhuma campanha criada</p>
                  <p className="text-xs text-[var(--text-muted)] mt-2 font-medium">Crie uma campanha para disparar mensagens em lote</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {campanhas.map(c => (
                    <div key={c.id} className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[2rem] p-6 space-y-4 shadow-sm hover:border-[var(--accent)]/30 transition-all">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <h4 className="font-black text-[var(--foreground)] tracking-tight">{c.titulo}</h4>
                          <div className="flex items-center gap-3 flex-wrap">
                            <span className="text-[10px] font-black text-[var(--text-muted)] bg-[var(--foreground)]/5 px-2 py-1 rounded-lg">{tipoBadge(c.tipo)}</span>
                            {statusBadge(c.status)}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {c.status !== 'concluida' && c.status !== 'enviando' && (
                            <button
                              onClick={() => handleDispatch(c.id)}
                              disabled={!!dispatchingId}
                              className="px-5 py-2.5 bg-[var(--accent)]/10 hover:bg-[var(--accent)]/20 text-[var(--accent)] rounded-xl text-[10px] font-black uppercase tracking-widest disabled:opacity-50 transition-all"
                            >
                              {dispatchingId === c.id ? 'Disparando...' : '▶ Disparar'}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Progress bar durante dispatch */}
                      {dispatchingId === c.id && dispatchProgress && (
                        <div className="space-y-2">
                          <div className="flex justify-between text-[10px] font-black text-[var(--text-muted)]">
                            <span>Enviando para {dispatchProgress.nome}…</span>
                            <span>{dispatchProgress.enviados + dispatchProgress.erros}/{dispatchProgress.total}</span>
                          </div>
                          <div className="h-2 bg-[var(--foreground)]/5 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[var(--accent)] rounded-full transition-all"
                              style={{ width: `${((dispatchProgress.enviados + dispatchProgress.erros) / dispatchProgress.total) * 100}%` }}
                            />
                          </div>
                          <div className="flex gap-4 text-[10px] font-medium">
                            <span className="text-emerald-500">✓ {dispatchProgress.enviados} enviados</span>
                            {dispatchProgress.erros > 0 && <span className="text-red-400">✗ {dispatchProgress.erros} erros</span>}
                          </div>
                        </div>
                      )}

                      {/* Stats pós-envio */}
                      {c.status === 'concluida' && (
                        <div className="flex gap-6 text-[11px] font-medium pt-1">
                          <span className="text-emerald-500 font-black">✓ {c.totalEnviado} enviados</span>
                          {c.totalErros > 0 && <span className="text-red-400 font-black">✗ {c.totalErros} erros</span>}
                        </div>
                      )}

                      <p className="text-xs text-[var(--text-muted)] font-medium line-clamp-2 opacity-60">{c.mensagem}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Tab: Combos ─────────────────────────────────────── */}
          {tab === 'combos' && (
            <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[2.5rem] p-10 space-y-10 relative overflow-hidden shadow-sm">
              <div className="absolute top-0 right-0 w-80 h-80 bg-[var(--accent)]/5 blur-[120px] pointer-events-none" />

              {/* Steps */}
              <div className="flex items-center gap-4">
                {[1, 2, 3].map((n, i) => (
                  <React.Fragment key={n}>
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-xs ${step >= n ? (n === 3 ? 'bg-emerald-500' : 'bg-[var(--accent)]') + ' text-white shadow-lg' : 'bg-[var(--foreground)]/5 text-[var(--text-muted)]'}`}>{n}</div>
                    {i < 2 && <div className={`h-1 flex-1 rounded-full ${step > n ? 'bg-[var(--accent)]' : 'bg-[var(--border)]'}`} />}
                  </React.Fragment>
                ))}
              </div>

              {step === 1 && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-2xl font-black text-[var(--foreground)] tracking-tight">Serviço Principal</h3>
                      <p className="text-[var(--text-muted)] text-sm font-medium">O robô oferecerá o combo quando este item for agendado.</p>
                    </div>
                    <button onClick={() => setShowNewServiceModal(true)} className="px-6 py-3 bg-[var(--foreground)]/5 hover:bg-[var(--foreground)]/10 border border-[var(--border)] rounded-2xl text-[10px] font-black uppercase tracking-widest">+ Novo</button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-72 overflow-y-auto pr-2">
                    {services.map(s => (
                      <button key={s.id} onClick={() => { setSelectedMain(s.id); setStep(2); }}
                        className={`p-6 border rounded-[1.5rem] text-left transition-all ${selectedMain === s.id ? 'border-[var(--accent)] bg-[var(--accent)]/[0.03] ring-4 ring-[var(--accent)]/5' : 'border-[var(--border)] hover:border-[var(--accent)]/40'}`}>
                        <p className="font-black text-[var(--foreground)] text-sm">{s.nome}</p>
                        <p className="text-[10px] font-black text-[var(--accent)] mt-1">R$ {s.preco.toFixed(2)}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-2xl font-black text-[var(--foreground)] tracking-tight">Serviço de Upsell</h3>
                      <p className="text-[var(--text-muted)] text-sm font-medium">O complemento perfeito para o combo.</p>
                    </div>
                    <button onClick={() => setStep(1)} className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">← Voltar</button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-72 overflow-y-auto pr-2">
                    {services.filter(s => s.id !== selectedMain).map(s => (
                      <button key={s.id} onClick={() => { setSelectedUpsell(s.id); setStep(3); }}
                        className={`p-6 border rounded-[1.5rem] text-left transition-all ${selectedUpsell === s.id ? 'border-[var(--accent)] bg-[var(--accent)]/[0.03]' : 'border-[var(--border)] hover:border-[var(--accent)]/40'}`}>
                        <p className="font-black text-[var(--foreground)] text-sm">{s.nome}</p>
                        <p className="text-[10px] font-black text-emerald-500 mt-1">R$ {s.preco.toFixed(2)}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-8">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xl font-black text-[var(--foreground)] tracking-tight">Prévia do Combo</h3>
                    <button onClick={() => setStep(2)} className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">← Voltar</button>
                  </div>
                  <div className="flex flex-col md:flex-row gap-10 items-center justify-center">
                    <div className="w-full max-w-sm bg-[var(--sidebar-bg)] border border-[var(--accent)]/30 rounded-[3rem] p-10 shadow-2xl relative">
                      <div className="absolute -top-4 -right-4 bg-yellow-400 text-black font-black px-5 py-2 rounded-2xl text-[10px] rotate-12 shadow-xl">-{discount}% OFF</div>
                      <div className="flex flex-col items-center text-center space-y-5">
                        <div className="w-20 h-20 bg-gradient-to-tr from-[var(--accent)] to-[var(--accent)]/60 rounded-3xl flex items-center justify-center text-4xl shadow-2xl">✨</div>
                        <h4 className="text-xl font-black italic uppercase tracking-tighter text-[var(--foreground)]">Super Combo</h4>
                        <div>
                          <p className="text-xs text-[var(--text-muted)] line-through opacity-50">R$ {totalPrice.toFixed(2)}</p>
                          <p className="text-4xl font-black text-[var(--foreground)]">R$ {finalPrice.toFixed(2)}</p>
                          <p className="text-[10px] font-black text-emerald-500 uppercase">Economize R$ {savings.toFixed(2)}</p>
                        </div>
                        <div className="w-full space-y-2">
                          {[mainService, upsellService].map((s, i) => s && (
                            <div key={i} className="flex items-center gap-2 text-[10px] font-black uppercase text-[var(--text-muted)] bg-[var(--foreground)]/5 p-3 rounded-2xl border border-[var(--border)]">
                              <span className="text-[var(--accent)]">✔</span> {s.nome}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex-1 space-y-6">
                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Desconto no 2º item</label>
                        <input type="range" min={5} max={50} step={5} value={discount} onChange={e => setDiscount(Number(e.target.value))} className="w-full accent-[var(--accent)]" />
                        <div className="flex justify-between text-[9px] font-black text-[var(--text-muted)] opacity-50">
                          <span>Leve (5%)</span><span>Agressivo (50%)</span>
                        </div>
                      </div>
                      <button onClick={handleSaveCombo} className="w-full py-5 bg-[var(--accent)] text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-[var(--accent)]/20 hover:opacity-90 active:scale-95 transition-all">
                        🚀 Ativar Combo
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Tab: Histórico ──────────────────────────────────── */}
          {tab === 'historico' && (
            <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[2.5rem] overflow-hidden shadow-sm">
              <div className="p-6 border-b border-[var(--border)] bg-[var(--foreground)]/[0.01]">
                <h3 className="font-black text-[var(--foreground)] uppercase tracking-tighter">Histórico de Envios</h3>
                <p className="text-xs text-[var(--text-muted)] font-medium mt-1">Últimas 20 mensagens disparadas pelo sistema</p>
              </div>
              {!metrics?.enviosRecentes?.length ? (
                <div className="p-16 text-center">
                  <p className="text-[var(--text-muted)] font-black uppercase tracking-widest text-xs opacity-50">Nenhum envio registrado</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-[var(--foreground)]/[0.02] text-[var(--text-muted)] text-[10px] uppercase font-black tracking-widest">
                      <tr>
                        <th className="px-6 py-4">Tipo</th>
                        <th className="px-6 py-4">Paciente</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4">Data</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                      {metrics.enviosRecentes.map((e: any) => {
                        const tipoMap: Record<string, string> = { lembrete: '⏰', aniversario: '🎂', combo: '✨', campanha: '📢' };
                        return (
                          <tr key={e.id} className="hover:bg-[var(--foreground)]/[0.02] transition-colors">
                            <td className="px-6 py-4">
                              <span className="text-[10px] font-black bg-[var(--foreground)]/5 px-3 py-1 rounded-lg">
                                {tipoMap[e.tipo] || '📩'} {e.tipo}
                              </span>
                            </td>
                            <td className="px-6 py-4 font-medium text-[var(--foreground)] text-xs">{e.pacienteNome || '—'}</td>
                            <td className="px-6 py-4">
                              <span className={`text-[10px] font-black px-2 py-1 rounded-lg ${e.status === 'enviado' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-400'}`}>
                                {e.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-xs text-[var(--text-muted)] font-medium">
                              {new Date(e.enviadoEm).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Sidebar ────────────────────────────────────────────── */}
        <div className="space-y-6">
          {/* Métricas */}
          <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[2.5rem] p-7 shadow-sm">
            <h4 className="font-black text-[10px] uppercase tracking-widest text-[var(--text-muted)] mb-5 opacity-70">Resumo Geral</h4>
            <div className="space-y-4">
              {[
                { label: 'Total Enviados', value: metrics?.totalEnviados ?? 0, color: 'text-[var(--accent)]' },
                { label: 'Lembretes', value: metrics?.summary?.lembrete?.enviado ?? 0, color: 'text-blue-400' },
                { label: 'Aniversários', value: metrics?.summary?.aniversario?.enviado ?? 0, color: 'text-emerald-500' },
                { label: 'Campanhas OK', value: metrics?.campanhasConcluidas ?? 0, color: 'text-purple-400' },
              ].map(item => (
                <div key={item.label} className="flex justify-between items-center">
                  <span className="text-xs text-[var(--text-muted)] font-medium">{item.label}</span>
                  <span className={`text-xl font-black ${item.color}`}>{item.value}</span>
                </div>
              ))}
              {(metrics?.totalErros ?? 0) > 0 && (
                <div className="flex justify-between items-center pt-2 border-t border-[var(--border)]">
                  <span className="text-xs text-red-400 font-medium">Erros</span>
                  <span className="text-xl font-black text-red-400">{metrics?.totalErros ?? 0}</span>
                </div>
              )}
            </div>
          </div>

          {/* Dicas */}
          <div className="bg-gradient-to-br from-[var(--sidebar-bg)] to-[var(--card-bg)] border border-[var(--border)] rounded-[2.5rem] p-7 space-y-4 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-2xl bg-[var(--accent)] flex items-center justify-center text-xl shadow-lg">💡</div>
              <div>
                <h4 className="font-black text-xs uppercase tracking-widest text-[var(--foreground)]">Dica Synka</h4>
              </div>
            </div>
            <div className="space-y-3 text-[11px] text-[var(--text-muted)] font-medium leading-relaxed">
              <p>📊 Lembretes 24h antes reduzem faltas em até <strong className="text-[var(--foreground)]">40%</strong>.</p>
              <p>🎂 Pacientes que recebem parabéns retornam <strong className="text-[var(--foreground)]">2x mais</strong> no mês seguinte.</p>
              <p>⚡ Campanhas para inativos de <strong className="text-[var(--foreground)]">30 dias</strong> têm a melhor taxa de conversão.</p>
            </div>
          </div>

          {/* Atalhos */}
          <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[2.5rem] p-7 space-y-3 shadow-sm">
            <h4 className="font-black text-[10px] uppercase tracking-widest text-[var(--text-muted)] mb-3 opacity-70">Ações Rápidas</h4>
            <button onClick={() => { setTab('campanhas'); setShowNovaCampanha(true); }}
              className="w-full p-4 bg-[var(--foreground)]/5 hover:bg-[var(--accent)]/10 hover:border-[var(--accent)]/30 text-left rounded-2xl text-[10px] text-[var(--text-muted)] hover:text-[var(--accent)] transition-all border border-[var(--border)] font-black uppercase tracking-widest">
              📢 Nova Campanha
            </button>
            <button onClick={() => setTab('automacoes')}
              className="w-full p-4 bg-[var(--foreground)]/5 hover:bg-[var(--foreground)]/10 text-left rounded-2xl text-[10px] text-[var(--text-muted)] transition-all border border-[var(--border)] font-black uppercase tracking-widest">
              ⚙️ Configurar Automações
            </button>
            <button onClick={() => setTab('combos')}
              className="w-full p-4 bg-[var(--foreground)]/5 hover:bg-[var(--foreground)]/10 text-left rounded-2xl text-[10px] text-[var(--text-muted)] transition-all border border-[var(--border)] font-black uppercase tracking-widest">
              🚀 Criar Combo Upsell
            </button>
          </div>
        </div>
      </div>

      {/* ── Modal: Nova Campanha ─────────────────────────────────── */}
      {showNovaCampanha && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setShowNovaCampanha(false)} />
          <div className="relative w-full max-w-lg bg-[var(--card-bg)] border border-[var(--border)] rounded-[2.5rem] p-10 shadow-2xl animate-in zoom-in-95 duration-200 space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-black text-[var(--foreground)] tracking-tight">Nova Campanha</h3>
              <button onClick={() => setShowNovaCampanha(false)} className="w-10 h-10 flex items-center justify-center rounded-2xl hover:bg-[var(--foreground)]/5 text-[var(--text-muted)] font-black transition-all">✕</button>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest pl-1">Nome da campanha</label>
                <input value={novaCampanha.titulo} onChange={e => setNovaCampanha(p => ({ ...p, titulo: e.target.value }))}
                  placeholder="Ex: Promoção de Inverno" className="w-full bg-[var(--foreground)]/5 border border-[var(--border)] rounded-2xl px-5 py-4 text-sm focus:outline-none focus:border-[var(--accent)] font-medium" />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest pl-1">Público-alvo</label>
                <select value={novaCampanha.tipo} onChange={e => setNovaCampanha(p => ({ ...p, tipo: e.target.value }))}
                  className="w-full bg-[var(--foreground)]/5 border border-[var(--border)] rounded-2xl px-5 py-4 text-sm focus:outline-none focus:border-[var(--accent)] font-medium">
                  <option value="todos">👥 Todos os {labels.cliente.toLowerCase()}s</option>
                  <option value="aniversariantes">🎂 Aniversariantes de hoje</option>
                  <option value="inativos">💤 Inativos (sem visita há X dias)</option>
                  <option value="servico">🔧 Por serviço específico</option>
                </select>
              </div>

              {novaCampanha.tipo === 'inativos' && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest pl-1">Inativo há (dias)</label>
                  <input type="number" value={novaCampanha.filtroInativoDias} onChange={e => setNovaCampanha(p => ({ ...p, filtroInativoDias: e.target.value }))}
                    className="w-full bg-[var(--foreground)]/5 border border-[var(--border)] rounded-2xl px-5 py-4 text-sm focus:outline-none focus:border-[var(--accent)] font-medium" min={1} />
                </div>
              )}

              {novaCampanha.tipo === 'servico' && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest pl-1">Nome do serviço</label>
                  <input value={novaCampanha.filtroServico} onChange={e => setNovaCampanha(p => ({ ...p, filtroServico: e.target.value }))}
                    placeholder="Ex: Limpeza de pele" className="w-full bg-[var(--foreground)]/5 border border-[var(--border)] rounded-2xl px-5 py-4 text-sm focus:outline-none focus:border-[var(--accent)] font-medium" />
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest pl-1">Mensagem</label>
                <p className="text-[10px] text-[var(--text-muted)] pl-1">
                  Variáveis: <code className="bg-[var(--foreground)]/5 px-1 rounded">{'{nome}'}</code> <code className="bg-[var(--foreground)]/5 px-1 rounded">{'{clinica}'}</code>
                </p>
                <textarea rows={5} value={novaCampanha.mensagem} onChange={e => setNovaCampanha(p => ({ ...p, mensagem: e.target.value }))}
                  placeholder="Olá {nome}! Temos uma novidade especial para você..." className="w-full bg-[var(--foreground)]/5 border border-[var(--border)] rounded-2xl px-5 py-4 text-sm focus:outline-none focus:border-[var(--accent)] font-medium resize-none leading-relaxed" />
              </div>
            </div>

            <button onClick={handleCreateCampanha} disabled={creatingCampanha || !novaCampanha.titulo || !novaCampanha.mensagem}
              className="w-full py-5 bg-[var(--accent)] hover:opacity-90 disabled:opacity-50 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-[var(--accent)]/20 transition-all">
              {creatingCampanha ? 'Criando...' : '✅ Criar Campanha'}
            </button>
          </div>
        </div>
      )}

      {/* ── Modal: Novo Serviço ──────────────────────────────────── */}
      {showNewServiceModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setShowNewServiceModal(false)} />
          <div className="relative w-full max-w-md bg-[var(--card-bg)] border border-[var(--border)] rounded-[2.5rem] p-10 shadow-2xl animate-in zoom-in-95 space-y-6">
            <h3 className="text-xl font-black text-[var(--foreground)] tracking-tight italic uppercase">Novo {labels.servico}</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest pl-1">Nome</label>
                <input value={newServiceName} onChange={e => setNewServiceName(e.target.value)} placeholder="Ex: Hidratação profunda"
                  className="w-full bg-[var(--foreground)]/5 border border-[var(--border)] rounded-2xl px-6 py-5 text-sm focus:outline-none focus:border-[var(--accent)] font-medium" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest pl-1">Preço (R$)</label>
                <input type="number" value={newServicePrice} onChange={e => setNewServicePrice(e.target.value)}
                  className="w-full bg-[var(--foreground)]/5 border border-[var(--border)] rounded-2xl px-6 py-5 text-sm focus:outline-none focus:border-[var(--accent)] font-medium" />
              </div>
              <button onClick={handleAddService} className="w-full py-5 bg-[var(--accent)] text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-[var(--accent)]/20">
                Cadastrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
