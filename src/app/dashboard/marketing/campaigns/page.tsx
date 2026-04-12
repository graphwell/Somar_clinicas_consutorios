"use client";
import React, { useState, useEffect, useRef } from 'react';
import { useNicho } from '@/context/NichoContext';
import { fetchWithAuth } from '@/lib/api-utils';
import { processarTemplate, TEMPLATE_LEMBRETE_PADRAO, TEMPLATE_ANIVERSARIO_PADRAO, TEMPLATE_COMBO_PADRAO } from '@/lib/marketing-utils';

// ─── Types ────────────────────────────────────────────────────────
type Agendamento = {
  id: string; dataHora: string;
  paciente: { nome: string; telefone: string | null };
  servico: string | null; profissional: string | null;
  lembreteEnviado: boolean;
};
type Aniversariante = { id: string; nome: string; telefone: string | null; dataNascimento: string; mensagemEnviada: boolean };
type Combo = {
  id: string; nome: string; descricao: string | null; servicos: string[];
  gatilhoServico: string | null; precoOriginal: string | null; precoCombo: string;
  descontoPct: number | null; ativo: boolean; validadeDias: number; templateWhatsapp: string | null;
};
type Campanha = {
  id: string; nome: string; tipo: string | null; status: string;
  totalDestinatarios: number; totalEnviados: number; totalErros: number;
  template: string; criadoEm: string; concluidoEm: string | null;
};
type Config = {
  lembreteAtivo: boolean; lembreteAntecedenciaHoras: number; lembreteHorario: string; lembreteTemplate: string | null;
  aniversarioAtivo: boolean; aniversarioHorario: string; aniversarioDescontoPct: number; aniversarioTemplate: string | null;
  confirmacaoAtivo: boolean; confirmacaoTemplate: string | null;
  cancelamentoAtivo: boolean; cancelamentoTemplate: string | null;
  remarcacaoAtivo: boolean; remarcacaoTemplate: string | null;
  linkConfirmacao: string | null; nomeClinica: string | null;
  wasenderApiKey: string | null; _temApiKey: boolean;
  _instanciaStatus?: 'instancia' | 'propria' | 'demo' | 'nenhuma';
  _forceDemo?: boolean;
  _temDemo?: boolean;
  _demoPhone?: string | null;
};
type WaInstance = { status: string; numeroWa: string | null } | null;
type Envio = {
  id: string; tipo: string; clienteNome: string | null; clienteTelefone: string;
  mensagemEnviada: string | null; status: string; erroDetalhe: string | null; enviadoEm: string;
};

// ─── WhatsApp Preview ─────────────────────────────────────────────
function WhatsAppBubble({ mensagem }: { mensagem: string }) {
  if (!mensagem) return null;
  return (
    <div className="bg-[#128C7E]/5 border border-[#128C7E]/20 rounded-2xl p-4 space-y-3">
      <p className="text-[9px] font-black text-[#128C7E] uppercase tracking-widest flex items-center gap-2">
        Pré-visualização WhatsApp
      </p>
      <div className="bg-[#DCF8C6] rounded-2xl rounded-tl-none px-4 py-3 max-w-[90%] shadow-sm">
        <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed font-medium">{mensagem}</p>
        <p className="text-[10px] text-gray-400 text-right mt-1">09:00 ✓✓</p>
      </div>
    </div>
  );
}

// ─── Toggle ───────────────────────────────────────────────────────
function Toggle({ value, onChange, color = 'bg-[var(--accent)]' }: { value: boolean; onChange: (v: boolean) => void; color?: string }) {
  return (
    <button onClick={() => onChange(!value)} className={`relative w-14 h-7 rounded-full transition-all ${value ? color : 'bg-[var(--foreground)]/10'}`}>
      <span className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-all ${value ? 'left-8' : 'left-1'}`} />
    </button>
  );
}

// ─── Page ─────────────────────────────────────────────────────────
export default function MarketingPage() {
  const { labels } = useNicho();
  const [tab, setTab] = useState<'lembretes' | 'aniversarios' | 'combos' | 'campanhas' | 'config' | 'log'>('lembretes');

  // Data
  const [config, setConfig] = useState<Config | null>(null);
  const [localConfig, setLocalConfig] = useState<Partial<Config>>({});
  const [waInstance, setWaInstance] = useState<WaInstance>(null);
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [aniversariantes, setAniversariantes] = useState<Aniversariante[]>([]);
  const [combos, setCombos] = useState<Combo[]>([]);
  const [campanhas, setCampanhas] = useState<Campanha[]>([]);
  const [envios, setEnvios] = useState<Envio[]>([]);
  const [totalEnvios, setTotalEnvios] = useState(0);
  const [pageLog, setPageLog] = useState(1);
  const [totalPagesLog, setTotalPagesLog] = useState(1);
  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // UI state
  const [savingConfig, setSavingConfig] = useState(false);
  const [testandoConexao, setTestandoConexao] = useState(false);
  const [statusConexao, setStatusConexao] = useState<'idle' | 'conectado' | 'erro' | 'nao_configurado'>('idle');
  const [testandoDemo, setTestandoDemo] = useState(false);
  const [statusDemo, setStatusDemo] = useState<'idle' | 'ok' | 'erro'>('idle');
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [sendingAll, setSendingAll] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  // Campanhas
  const [showNovaCampanha, setShowNovaCampanha] = useState(false);
  const [novaCamp, setNovaCamp] = useState({ nome: '', tipo: 'todos', filtroServico: '', filtroInativoDias: '30', template: '' });
  const [alcance, setAlcance] = useState<number | null>(null);
  const [estimando, setEstimando] = useState(false);
  const [dispatchingId, setDispatchingId] = useState<string | null>(null);
  const [dispatchProgress, setDispatchProgress] = useState<{ enviados: number; erros: number; total: number; nome: string } | null>(null);

  // Combos
  const [showNovoCombo, setShowNovoCombo] = useState(false);
  const [editCombo, setEditCombo] = useState<Combo | null>(null);
  const [comboForm, setComboForm] = useState({
    nome: '', descricao: '', servicos: [] as string[], servicoInput: '',
    gatilhoServico: '', precoOriginal: '', precoCombo: '',
    descontoPct: '', validadeDias: '30', templateWhatsapp: ''
  });
  const [savingCombo, setSavingCombo] = useState(false);
  const [showEnviarCombo, setShowEnviarCombo] = useState<Combo | null>(null);
  const [comboPacienteBusca, setComboPacienteBusca] = useState('');
  const [comboPacientes, setComboPacientes] = useState<any[]>([]);
  const [comboPacienteSel, setComboPacienteSel] = useState<any>(null);

  // Pré-visualização
  const [previewLembrete, setPreviewLembrete] = useState(false);
  const [previewAniv, setPreviewAniv] = useState(false);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  // ── Load inicial ────────────────────────────────────────────────
  useEffect(() => {
    Promise.all([
      fetchWithAuth('/api/marketing/config').then(r => r.json()),
      fetchWithAuth('/api/marketing/agendamentos-pendentes').then(r => r.json()),
      fetchWithAuth('/api/marketing/aniversariantes').then(r => r.json()),
      fetchWithAuth('/api/marketing/combos').then(r => r.json()),
      fetchWithAuth('/api/marketing/campanhas').then(r => r.json()),
    ]).then(([cfg, ags, anivs, cbs, camps]) => {
      if (cfg.config) { setConfig(cfg.config); setLocalConfig(cfg.config); }
      if (cfg.instance) setWaInstance(cfg.instance);
      if (Array.isArray(ags)) setAgendamentos(ags);
      if (Array.isArray(anivs)) setAniversariantes(anivs);
      if (Array.isArray(cbs)) setCombos(cbs);
      if (Array.isArray(camps)) setCampanhas(camps);
    }).finally(() => setLoading(false));
  }, []);

  // ── Load log ────────────────────────────────────────────────────
  useEffect(() => {
    if (tab !== 'log') return;
    const params = new URLSearchParams({ page: String(pageLog) });
    if (filtroTipo) params.set('tipo', filtroTipo);
    if (filtroStatus) params.set('status', filtroStatus);
    fetchWithAuth(`/api/marketing/metrics?${params}`).then(r => r.json()).then(d => {
      if (d.envios) setEnvios(d.envios);
      if (d.totalCount !== undefined) setTotalEnvios(d.totalCount);
      if (d.totalPages !== undefined) setTotalPagesLog(d.totalPages);
      setMetrics(d);
    });
  }, [tab, pageLog, filtroTipo, filtroStatus]);

  // ── Salvar config ────────────────────────────────────────────────
  const handleSaveConfig = async () => {
    setSavingConfig(true);
    try {
      const res = await fetchWithAuth('/api/marketing/config', { method: 'PATCH', body: JSON.stringify(localConfig) });
      if (res.ok) showToast('Configurações salvas!');
      else showToast('Erro ao salvar', false);
    } finally { setSavingConfig(false); }
  };

  // ── Testar conexão ───────────────────────────────────────────────
  const handleTestarConexao = async () => {
    setTestandoConexao(true);
    try {
      const res = await fetchWithAuth('/api/marketing/testar-conexao');
      const data = await res.json();
      setStatusConexao(data.status === 'conectado' ? 'conectado' : data.status === 'nao_configurado' ? 'nao_configurado' : 'erro');
    } finally { setTestandoConexao(false); }
  };

  // ── Enviar lembrete individual ────────────────────────────────────
  const handleEnviarLembrete = async (agendamentoId: string) => {
    setSendingId(agendamentoId);
    try {
      const res = await fetchWithAuth('/api/marketing/send-lembrete', { method: 'POST', body: JSON.stringify({ agendamentoId }) });
      const data = await res.json();
      if (data.success) {
        showToast('Lembrete enviado!');
        setAgendamentos(prev => prev.map(a => a.id === agendamentoId ? { ...a, lembreteEnviado: true } : a));
      } else showToast(data.error || 'Erro ao enviar', false);
    } finally { setSendingId(null); }
  };

  const handleEnviarTodosLembretes = async () => {
    setSendingAll(true);
    const pendentes = agendamentos.filter(a => !a.lembreteEnviado && a.paciente.telefone);
    let ok = 0;
    for (const ag of pendentes) {
      const res = await fetchWithAuth('/api/marketing/send-lembrete', { method: 'POST', body: JSON.stringify({ agendamentoId: ag.id }) });
      const data = await res.json();
      if (data.success) { ok++; setAgendamentos(prev => prev.map(a => a.id === ag.id ? { ...a, lembreteEnviado: true } : a)); }
      await new Promise(r => setTimeout(r, 300));
    }
    showToast(`${ok}/${pendentes.length} lembretes enviados`);
    setSendingAll(false);
  };

  // ── Enviar aniversário ────────────────────────────────────────────
  const handleEnviarAniversario = async (pacienteId: string) => {
    setSendingId(pacienteId);
    try {
      const res = await fetchWithAuth('/api/marketing/send-aniversario', { method: 'POST', body: JSON.stringify({ pacienteId }) });
      const data = await res.json();
      if (data.success) {
        showToast('Mensagem enviada!');
        setAniversariantes(prev => prev.map(a => a.id === pacienteId ? { ...a, mensagemEnviada: true } : a));
      } else showToast(data.error || 'Erro ao enviar', false);
    } finally { setSendingId(null); }
  };

  const handleEnviarTodosAniversarios = async () => {
    setSendingAll(true);
    const pendentes = aniversariantes.filter(a => !a.mensagemEnviada && a.telefone);
    let ok = 0;
    for (const a of pendentes) {
      const res = await fetchWithAuth('/api/marketing/send-aniversario', { method: 'POST', body: JSON.stringify({ pacienteId: a.id }) });
      const data = await res.json();
      if (data.success) { ok++; setAniversariantes(prev => prev.map(x => x.id === a.id ? { ...x, mensagemEnviada: true } : x)); }
      await new Promise(r => setTimeout(r, 300));
    }
    showToast(`${ok}/${pendentes.length} enviados`);
    setSendingAll(false);
  };

  // ── Combos ────────────────────────────────────────────────────────
  const openNovoCombo = () => {
    setEditCombo(null);
    setComboForm({ nome: '', descricao: '', servicos: [], servicoInput: '', gatilhoServico: '', precoOriginal: '', precoCombo: '', descontoPct: '', validadeDias: '30', templateWhatsapp: '' });
    setShowNovoCombo(true);
  };

  const openEditCombo = (c: Combo) => {
    setEditCombo(c);
    setComboForm({
      nome: c.nome, descricao: c.descricao ?? '', servicos: c.servicos,
      servicoInput: '', gatilhoServico: c.gatilhoServico ?? '',
      precoOriginal: c.precoOriginal ?? '', precoCombo: c.precoCombo,
      descontoPct: String(c.descontoPct ?? ''), validadeDias: String(c.validadeDias),
      templateWhatsapp: c.templateWhatsapp ?? ''
    });
    setShowNovoCombo(true);
  };

  const addServico = () => {
    if (!comboForm.servicoInput.trim()) return;
    setComboForm(prev => ({ ...prev, servicos: [...prev.servicos, prev.servicoInput.trim()], servicoInput: '' }));
  };

  const removeServico = (i: number) => setComboForm(prev => ({ ...prev, servicos: prev.servicos.filter((_, idx) => idx !== i) }));

  // Calcula desconto automático
  useEffect(() => {
    const orig = Number(comboForm.precoOriginal);
    const combo = Number(comboForm.precoCombo);
    if (orig > 0 && combo > 0 && combo < orig) {
      setComboForm(prev => ({ ...prev, descontoPct: String(Math.round((1 - combo / orig) * 100)) }));
    }
  }, [comboForm.precoOriginal, comboForm.precoCombo]);

  const handleSaveCombo = async () => {
    if (!comboForm.nome || !comboForm.precoCombo || comboForm.servicos.length === 0) return;
    setSavingCombo(true);
    try {
      const body = { nome: comboForm.nome, descricao: comboForm.descricao || null, servicos: comboForm.servicos, gatilhoServico: comboForm.gatilhoServico || null, precoOriginal: comboForm.precoOriginal || null, precoCombo: comboForm.precoCombo, descontoPct: comboForm.descontoPct || null, validadeDias: comboForm.validadeDias, templateWhatsapp: comboForm.templateWhatsapp || null };
      if (editCombo) {
        const res = await fetchWithAuth(`/api/marketing/combos/${editCombo.id}`, { method: 'PATCH', body: JSON.stringify(body) });
        if (res.ok) { const updated = await res.json(); setCombos(prev => prev.map(c => c.id === editCombo.id ? updated : c)); showToast('Combo atualizado!'); }
      } else {
        const res = await fetchWithAuth('/api/marketing/combos', { method: 'POST', body: JSON.stringify(body) });
        if (res.ok) { const novo = await res.json(); setCombos(prev => [novo, ...prev]); showToast('Combo criado!'); }
        else showToast('Erro ao criar combo', false);
      }
      setShowNovoCombo(false);
    } finally { setSavingCombo(false); }
  };

  const handleDeleteCombo = async (id: string) => {
    if (!confirm('Excluir este combo?')) return;
    await fetchWithAuth(`/api/marketing/combos/${id}`, { method: 'DELETE' });
    setCombos(prev => prev.filter(c => c.id !== id));
    showToast('Combo excluído');
  };

  const handleToggleCombo = async (c: Combo) => {
    await fetchWithAuth(`/api/marketing/combos/${c.id}`, { method: 'PATCH', body: JSON.stringify({ ativo: !c.ativo }) });
    setCombos(prev => prev.map(x => x.id === c.id ? { ...x, ativo: !c.ativo } : x));
  };

  // Busca pacientes para enviar combo
  useEffect(() => {
    if (comboPacienteBusca.length < 2) { setComboPacientes([]); return; }
    const t = setTimeout(() => {
      fetchWithAuth(`/api/patients?q=${encodeURIComponent(comboPacienteBusca)}`).then(r => r.json()).then(d => setComboPacientes(Array.isArray(d) ? d : []));
    }, 350);
    return () => clearTimeout(t);
  }, [comboPacienteBusca]);

  const handleEnviarCombo = async () => {
    if (!showEnviarCombo || !comboPacienteSel) return;
    setSendingId(showEnviarCombo.id);
    const res = await fetchWithAuth(`/api/marketing/combos/${showEnviarCombo.id}`, { method: 'POST', body: JSON.stringify({ pacienteId: comboPacienteSel.id }) });
    const data = await res.json();
    if (data.success) { showToast('Combo enviado!'); setShowEnviarCombo(null); setComboPacienteSel(null); setComboPacienteBusca(''); }
    else showToast(data.error || 'Erro', false);
    setSendingId(null);
  };

  // ── Campanhas ─────────────────────────────────────────────────────
  const handleEstimarAlcance = async () => {
    setEstimando(true);
    try {
      const res = await fetchWithAuth('/api/marketing/alcance', { method: 'POST', body: JSON.stringify({ tipo: novaCamp.tipo, filtroServico: novaCamp.filtroServico, filtroInativoDias: novaCamp.filtroInativoDias }) });
      const data = await res.json();
      setAlcance(data.total ?? 0);
    } finally { setEstimando(false); }
  };

  const handleCriarCampanha = async () => {
    if (!novaCamp.nome || !novaCamp.template) return;
    const res = await fetchWithAuth('/api/marketing/campanhas', { method: 'POST', body: JSON.stringify({ nome: novaCamp.nome, tipo: novaCamp.tipo, filtroServico: novaCamp.filtroServico || null, filtroInativoDias: novaCamp.tipo === 'inativos' ? Number(novaCamp.filtroInativoDias) : null, template: novaCamp.template }) });
    if (res.ok) {
      const nova = await res.json();
      setCampanhas(prev => [nova, ...prev]);
      setShowNovaCampanha(false);
      setNovaCamp({ nome: '', tipo: 'todos', filtroServico: '', filtroInativoDias: '30', template: '' });
      setAlcance(null);
      showToast('Campanha criada!');
    }
  };

  const handleDispatch = async (campanhaId: string) => {
    setDispatchingId(campanhaId);
    setDispatchProgress(null);
    const token = typeof window !== 'undefined' ? localStorage.getItem('synka_token') : null;
    const res = await fetch(`/api/marketing/campanhas/${campanhaId}/dispatch`, { method: 'POST', headers: { Authorization: token ? `Bearer ${token}` : '' } });
    if (!res.body) { setDispatchingId(null); return; }
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      for (const line of dec.decode(value).split('\n')) {
        if (!line.startsWith('data: ')) continue;
        try {
          const d = JSON.parse(line.slice(6));
          if (d.type === 'progress') setDispatchProgress({ enviados: d.enviados, erros: d.erros, total: d.total, nome: d.nome });
          if (d.type === 'done') { setCampanhas(prev => prev.map(c => c.id === campanhaId ? { ...c, status: 'concluida', totalEnviados: d.enviados, totalErros: d.erros } : c)); setDispatchProgress(null); showToast(`Campanha concluída — ${d.enviados} enviados`); }
        } catch {}
      }
    }
    setDispatchingId(null);
  };

  // ── Helpers visuais ───────────────────────────────────────────────
  const conexaoInfo = {
    conectado: { label: 'Conectado', cls: 'text-emerald-500 bg-emerald-500/10', dot: 'bg-emerald-500' },
    erro: { label: 'Erro de conexão', cls: 'text-red-400 bg-red-400/10', dot: 'bg-red-400' },
    nao_configurado: { label: 'Não configurado', cls: 'text-yellow-500 bg-yellow-500/10', dot: 'bg-yellow-500' },
    idle: { label: 'Testar conexão', cls: 'text-[var(--text-muted)] bg-[var(--foreground)]/5', dot: 'bg-[var(--text-muted)]' },
  };

  const waStatus = waInstance
    ? (waInstance.status === 'EM_USO' || waInstance.status === 'AGUARDANDO' ? 'conectado' : 'erro')
    : (config?._temApiKey ? 'idle' : 'nao_configurado');

  const TABS = [
    { id: 'lembretes', label: 'Lembretes' },
    { id: 'aniversarios', label: 'Aniversários' },
    { id: 'combos', label: 'Combos' },
    { id: 'campanhas', label: 'Campanhas' },
    { id: 'config', label: 'Configurações' },
    { id: 'log', label: 'Log' },
  ] as const;

  const lembretePreview = processarTemplate(
    localConfig.lembreteTemplate || TEMPLATE_LEMBRETE_PADRAO,
    { nome: 'Maria', data: '28/03/2026', hora: '14:30', servico: 'Consulta', profissional: 'Dr. Silva', profissional_linha: ' com Dr. Silva', clinica: localConfig.nomeClinica || 'Clínica', link: '' }
  );

  const anivPreview = processarTemplate(
    localConfig.aniversarioTemplate || TEMPLATE_ANIVERSARIO_PADRAO,
    { nome: 'João', desconto: String(localConfig.aniversarioDescontoPct ?? 15), clinica: localConfig.nomeClinica || 'Clínica' }
  );

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12 animate-in fade-in duration-500">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-[200] px-6 py-4 rounded-2xl text-sm font-black shadow-2xl animate-in slide-in-from-top-4 duration-300 ${toast.ok ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[var(--card-bg)] border border-[var(--border)] p-8 rounded-[2.5rem] shadow-sm">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-[var(--foreground)]">Central de Marketing</h2>
          <p className="text-[var(--text-muted)] mt-1 font-medium italic">Automações WhatsApp, combos e campanhas para sua clínica.</p>
        </div>
        <div className={`flex items-center gap-3 px-5 py-3 rounded-2xl border ${waStatus === 'conectado' ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-yellow-500/30 bg-yellow-500/5'}`}>
          <span className={`w-2.5 h-2.5 rounded-full animate-pulse ${conexaoInfo[waStatus].dot}`} />
          <span className={`text-xs font-black uppercase tracking-widest ${conexaoInfo[waStatus].cls.split(' ')[0]}`}>WhatsApp {conexaoInfo[waStatus].label}</span>
          {waInstance?.numeroWa && <span className="text-[10px] text-[var(--text-muted)]">{waInstance.numeroWa}</span>}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main */}
        <div className="lg:col-span-3 space-y-5">

          {/* Tabs */}
          <div className="flex gap-1 p-1 bg-[var(--foreground)]/5 border border-[var(--border)] rounded-[1.5rem] overflow-x-auto">
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex-1 min-w-max px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${tab === t.id ? 'bg-[var(--accent)] text-white shadow-lg shadow-[var(--accent)]/20' : 'text-[var(--text-muted)] hover:text-[var(--foreground)]'}`}>
                {t.label}
              </button>
            ))}
          </div>

          {/* ══ Aba: Lembretes ═══════════════════════════════════════ */}
          {tab === 'lembretes' && (
            <div className="space-y-5">
              <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[2.5rem] p-8 space-y-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-black text-lg text-[var(--foreground)] tracking-tight">Lembrete automático de consulta</h3>
                    <p className="text-xs text-[var(--text-muted)] font-medium mt-1">Envia via WhatsApp X horas antes do agendamento</p>
                  </div>
                  <Toggle value={!!localConfig.lembreteAtivo} onChange={v => setLocalConfig(p => ({ ...p, lembreteAtivo: v }))} />
                </div>
                {localConfig.lembreteAtivo && (
                  <div className="space-y-5 pt-2 border-t border-[var(--border)]">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest pl-1">Antecedência</label>
                        <select value={localConfig.lembreteAntecedenciaHoras ?? 24} onChange={e => setLocalConfig(p => ({ ...p, lembreteAntecedenciaHoras: Number(e.target.value) }))}
                          className="w-full bg-[var(--foreground)]/5 border border-[var(--border)] rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-[var(--accent)] font-medium">
                          {[1, 2, 4, 6, 12, 24, 48].map(h => <option key={h} value={h}>{h === 1 ? '1 hora antes' : `${h}h antes`}</option>)}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest pl-1">Horário do cron</label>
                        <input type="time" value={localConfig.lembreteHorario ?? '09:00'} onChange={e => setLocalConfig(p => ({ ...p, lembreteHorario: e.target.value }))}
                          className="w-full bg-[var(--foreground)]/5 border border-[var(--border)] rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-[var(--accent)] font-medium" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest pl-1">Template</label>
                        <button onClick={() => setPreviewLembrete(p => !p)} className="text-[9px] font-black text-[var(--accent)] uppercase tracking-widest">{previewLembrete ? 'Ocultar preview' : 'Ver preview'}</button>
                      </div>
                      <p className="text-[10px] text-[var(--text-muted)] pl-1">Variáveis: <code className="bg-[var(--foreground)]/5 px-1 rounded">{'{nome}'}</code> <code className="bg-[var(--foreground)]/5 px-1 rounded">{'{data}'}</code> <code className="bg-[var(--foreground)]/5 px-1 rounded">{'{hora}'}</code> <code className="bg-[var(--foreground)]/5 px-1 rounded">{'{servico}'}</code> <code className="bg-[var(--foreground)]/5 px-1 rounded">{'{clinica}'}</code></p>
                      <textarea rows={6} value={localConfig.lembreteTemplate ?? TEMPLATE_LEMBRETE_PADRAO} onChange={e => setLocalConfig(p => ({ ...p, lembreteTemplate: e.target.value }))}
                        className="w-full bg-[var(--foreground)]/5 border border-[var(--border)] rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-[var(--accent)] font-medium resize-none leading-relaxed" />
                      {previewLembrete && <WhatsAppBubble mensagem={lembretePreview} />}
                    </div>
                  </div>
                )}
              </div>

              {/* Lista de agendamentos pendentes */}
              <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[2.5rem] overflow-hidden shadow-sm">
                <div className="p-6 border-b border-[var(--border)] flex justify-between items-center">
                  <div>
                    <h4 className="font-black text-[var(--foreground)] tracking-tight">Agendamentos nas próximas 48h</h4>
                    <p className="text-xs text-[var(--text-muted)] font-medium mt-0.5">{agendamentos.filter(a => !a.lembreteEnviado).length} aguardando lembrete</p>
                  </div>
                  {agendamentos.filter(a => !a.lembreteEnviado).length > 0 && (
                    <button onClick={handleEnviarTodosLembretes} disabled={sendingAll}
                      className="px-5 py-2.5 bg-[var(--accent)] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest disabled:opacity-50 shadow-lg shadow-[var(--accent)]/20 transition-all">
                      {sendingAll ? 'Enviando...' : `Enviar todos (${agendamentos.filter(a => !a.lembreteEnviado).length})`}
                    </button>
                  )}
                </div>
                {agendamentos.length === 0 ? (
                  <div className="p-12 text-center text-xs text-[var(--text-muted)] font-black uppercase opacity-50">Nenhum agendamento nas próximas 48h</div>
                ) : (
                  <div className="divide-y divide-[var(--border)]">
                    {agendamentos.map(ag => (
                      <div key={ag.id} className="flex items-center justify-between px-6 py-4 hover:bg-[var(--foreground)]/[0.01] transition-colors">
                        <div className="space-y-0.5">
                          <p className="font-black text-[var(--foreground)] text-sm">{ag.paciente.nome}</p>
                          <p className="text-xs text-[var(--text-muted)] font-medium">
                            {new Date(ag.dataHora).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })} às {new Date(ag.dataHora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            {ag.servico && ` · ${ag.servico}`}
                          </p>
                          {!ag.paciente.telefone && <p className="text-[10px] text-red-400 font-medium">Sem telefone cadastrado</p>}
                        </div>
                        {ag.lembreteEnviado ? (
                          <span className="text-[10px] font-black text-emerald-500 bg-emerald-500/10 px-3 py-1.5 rounded-xl">Enviado</span>
                        ) : (
                          <button onClick={() => handleEnviarLembrete(ag.id)} disabled={sendingId === ag.id || !ag.paciente.telefone}
                            className="px-4 py-2 bg-[var(--accent)]/10 hover:bg-[var(--accent)]/20 text-[var(--accent)] rounded-xl text-[10px] font-black uppercase tracking-widest disabled:opacity-40 transition-all">
                            {sendingId === ag.id ? '...' : 'Enviar'}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button onClick={handleSaveConfig} disabled={savingConfig}
                className="w-full py-4 bg-[var(--accent)] text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-[var(--accent)]/20 disabled:opacity-60 transition-all">
                {savingConfig ? 'Salvando...' : 'Salvar configurações de lembrete'}
              </button>
            </div>
          )}

          {/* ══ Aba: Aniversários ════════════════════════════════════ */}
          {tab === 'aniversarios' && (
            <div className="space-y-5">
              <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[2.5rem] p-8 space-y-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-black text-lg text-[var(--foreground)] tracking-tight">Parabéns automático no aniversário</h3>
                    <p className="text-xs text-[var(--text-muted)] font-medium mt-1">Enviado no dia do aniversário com desconto especial</p>
                  </div>
                  <Toggle value={!!localConfig.aniversarioAtivo} onChange={v => setLocalConfig(p => ({ ...p, aniversarioAtivo: v }))} color="bg-emerald-500" />
                </div>
                {localConfig.aniversarioAtivo && (
                  <div className="space-y-5 pt-2 border-t border-[var(--border)]">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest pl-1">Horário do envio</label>
                        <input type="time" value={localConfig.aniversarioHorario ?? '08:00'} onChange={e => setLocalConfig(p => ({ ...p, aniversarioHorario: e.target.value }))}
                          className="w-full bg-[var(--foreground)]/5 border border-[var(--border)] rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-[var(--accent)] font-medium" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest pl-1">Desconto ({localConfig.aniversarioDescontoPct ?? 15}%)</label>
                        <input type="range" min={0} max={50} step={5} value={localConfig.aniversarioDescontoPct ?? 15} onChange={e => setLocalConfig(p => ({ ...p, aniversarioDescontoPct: Number(e.target.value) }))}
                          className="w-full mt-4 accent-emerald-500" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest pl-1">Template</label>
                        <button onClick={() => setPreviewAniv(p => !p)} className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">{previewAniv ? 'Ocultar preview' : 'Ver preview'}</button>
                      </div>
                      <p className="text-[10px] text-[var(--text-muted)] pl-1">Variáveis: <code className="bg-[var(--foreground)]/5 px-1 rounded">{'{nome}'}</code> <code className="bg-[var(--foreground)]/5 px-1 rounded">{'{desconto}'}</code> <code className="bg-[var(--foreground)]/5 px-1 rounded">{'{clinica}'}</code></p>
                      <textarea rows={7} value={localConfig.aniversarioTemplate ?? TEMPLATE_ANIVERSARIO_PADRAO} onChange={e => setLocalConfig(p => ({ ...p, aniversarioTemplate: e.target.value }))}
                        className="w-full bg-[var(--foreground)]/5 border border-[var(--border)] rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-[var(--accent)] font-medium resize-none leading-relaxed" />
                      {previewAniv && <WhatsAppBubble mensagem={anivPreview} />}
                    </div>
                  </div>
                )}
              </div>

              {/* Aniversariantes de hoje */}
              <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[2.5rem] overflow-hidden shadow-sm">
                <div className="p-6 border-b border-[var(--border)] flex justify-between items-center">
                  <div>
                    <h4 className="font-black text-[var(--foreground)] tracking-tight">Aniversariantes de hoje</h4>
                    <p className="text-xs text-[var(--text-muted)] font-medium mt-0.5">{aniversariantes.length} {labels.cliente.toLowerCase()}{aniversariantes.length !== 1 ? 's' : ''}</p>
                  </div>
                  {aniversariantes.filter(a => !a.mensagemEnviada).length > 0 && (
                    <button onClick={handleEnviarTodosAniversarios} disabled={sendingAll}
                      className="px-5 py-2.5 bg-emerald-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest disabled:opacity-50 shadow-lg shadow-emerald-500/20">
                      {sendingAll ? 'Enviando...' : 'Enviar para todos'}
                    </button>
                  )}
                </div>
                {aniversariantes.length === 0 ? (
                  <div className="p-12 text-center text-xs text-[var(--text-muted)] font-black uppercase opacity-50">Nenhum aniversariante hoje</div>
                ) : (
                  <div className="divide-y divide-[var(--border)]">
                    {aniversariantes.map(a => (
                      <div key={a.id} className="flex items-center justify-between px-6 py-4">
                        <div>
                          <p className="font-black text-[var(--foreground)] text-sm">{a.nome}</p>
                          <p className="text-xs text-[var(--text-muted)] font-medium">{a.telefone || 'Sem telefone'}</p>
                        </div>
                        {a.mensagemEnviada ? (
                          <span className="text-[10px] font-black text-emerald-500 bg-emerald-500/10 px-3 py-1.5 rounded-xl">Enviado</span>
                        ) : (
                          <button onClick={() => handleEnviarAniversario(a.id)} disabled={sendingId === a.id || !a.telefone}
                            className="px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 rounded-xl text-[10px] font-black uppercase disabled:opacity-40 transition-all">
                            {sendingId === a.id ? '...' : 'Enviar'}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button onClick={handleSaveConfig} disabled={savingConfig}
                className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-emerald-500/20 disabled:opacity-60 transition-all">
                {savingConfig ? 'Salvando...' : 'Salvar configurações de aniversário'}
              </button>
            </div>
          )}

          {/* ══ Aba: Notificações Transacionais ═════════════════════ */}
          {tab === 'aniversarios' && (
            <div className="space-y-4 mt-4">
              {/* Confirmação imediata */}
              <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[2rem] p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-black text-sm text-[var(--foreground)] tracking-tight">Confirmacao imediata</h3>
                    <p className="text-[11px] text-[var(--text-muted)] font-medium mt-0.5">Enviado ao paciente assim que o agendamento e criado</p>
                  </div>
                  <Toggle
                    value={!!localConfig.confirmacaoAtivo}
                    onChange={v => setLocalConfig(p => ({ ...p, confirmacaoAtivo: v }))}
                    color="bg-blue-500"
                  />
                </div>
                {localConfig.confirmacaoAtivo && (
                  <div>
                    <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest pl-1">Template (opcional)</label>
                    <textarea
                      rows={5}
                      value={localConfig.confirmacaoTemplate ?? ''}
                      onChange={e => setLocalConfig(p => ({ ...p, confirmacaoTemplate: e.target.value || null }))}
                      placeholder={'Ola {nome}!\n\nAgendamento recebido:\nServico: {servico}\nData: {data} as {hora}\n\nPara CONFIRMAR responda: SIM\nPara CANCELAR responda: NAO'}
                      className="w-full mt-1 p-3 text-xs font-medium bg-[var(--input-bg)] border border-[var(--border)] rounded-xl resize-none focus:outline-none focus:border-[var(--accent)]"
                    />
                    <p className="text-[9px] text-[var(--text-muted)] mt-1 opacity-60">Deixe vazio para usar o template padrao do sistema</p>
                  </div>
                )}
              </div>

              {/* Cancelamento */}
              <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[2rem] p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-black text-sm text-[var(--foreground)] tracking-tight">Aviso de cancelamento</h3>
                    <p className="text-[11px] text-[var(--text-muted)] font-medium mt-0.5">Enviado ao paciente quando o agendamento e cancelado</p>
                  </div>
                  <Toggle
                    value={!!localConfig.cancelamentoAtivo}
                    onChange={v => setLocalConfig(p => ({ ...p, cancelamentoAtivo: v }))}
                    color="bg-red-500"
                  />
                </div>
                {localConfig.cancelamentoAtivo && (
                  <div>
                    <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest pl-1">Template (opcional)</label>
                    <textarea
                      rows={5}
                      value={localConfig.cancelamentoTemplate ?? ''}
                      onChange={e => setLocalConfig(p => ({ ...p, cancelamentoTemplate: e.target.value || null }))}
                      placeholder={'Ola {nome},\n\nAgendamento cancelado:\n{servico}\n{data} as {hora}\n\nPara reagendar entre em contato.'}
                      className="w-full mt-1 p-3 text-xs font-medium bg-[var(--input-bg)] border border-[var(--border)] rounded-xl resize-none focus:outline-none focus:border-[var(--accent)]"
                    />
                    <p className="text-[9px] text-[var(--text-muted)] mt-1 opacity-60">Deixe vazio para usar o template padrao do sistema</p>
                  </div>
                )}
              </div>

              {/* Remarcação */}
              <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[2rem] p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-black text-sm text-[var(--foreground)] tracking-tight">Aviso de remarcacao</h3>
                    <p className="text-[11px] text-[var(--text-muted)] font-medium mt-0.5">Enviado ao paciente quando o horario e alterado</p>
                  </div>
                  <Toggle
                    value={!!localConfig.remarcacaoAtivo}
                    onChange={v => setLocalConfig(p => ({ ...p, remarcacaoAtivo: v }))}
                    color="bg-amber-500"
                  />
                </div>
              </div>

              <button
                onClick={() => salvarConfig({
                  confirmacaoAtivo: localConfig.confirmacaoAtivo,
                  confirmacaoTemplate: localConfig.confirmacaoTemplate,
                  cancelamentoAtivo: localConfig.cancelamentoAtivo,
                  cancelamentoTemplate: localConfig.cancelamentoTemplate,
                  remarcacaoAtivo: localConfig.remarcacaoAtivo,
                })}
                disabled={savingConfig}
                className="w-full py-4 bg-[var(--accent)] text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-[var(--accent)]/20 disabled:opacity-60 transition-all">
                {savingConfig ? 'Salvando...' : 'Salvar configuracoes de notificacoes'}
              </button>
            </div>
          )}

          {/* ══ Aba: Combos ══════════════════════════════════════════ */}
          {tab === 'combos' && (
            <div className="space-y-5">
              <div className="flex justify-between items-center">
                <p className="text-sm text-[var(--text-muted)] font-medium">{combos.length} combo{combos.length !== 1 ? 's' : ''} cadastrado{combos.length !== 1 ? 's' : ''}</p>
                <button onClick={openNovoCombo} className="px-6 py-3 bg-[var(--accent)] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-[var(--accent)]/20 hover:opacity-90 transition-all">
                  + Novo Combo
                </button>
              </div>

              {combos.length === 0 ? (
                <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[2.5rem] p-14 text-center">
                  <div className="mb-4 flex justify-center opacity-20"><svg width="40" height="40" viewBox="0 0 40 40" fill="none"><path d="M20 5l3.09 9.51H33l-8.09 5.88 3.09 9.51L20 24.02l-8 6.88 3.09-9.51L7 15.51h9.91L20 5z" stroke="#40916C" strokeWidth="2" strokeLinejoin="round"/></svg></div>
                  <p className="font-black text-[var(--text-muted)] uppercase tracking-widest text-xs">Nenhum combo criado</p>
                  <p className="text-xs text-[var(--text-muted)] mt-2 font-medium">Crie combos de serviços com desconto para oferecer aos {labels.cliente.toLowerCase()}s</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {combos.map(c => (
                    <div key={c.id} className={`bg-[var(--card-bg)] border rounded-[2rem] p-6 space-y-3 shadow-sm transition-all ${c.ativo ? 'border-[var(--border)] hover:border-[var(--accent)]/30' : 'border-[var(--border)] opacity-60'}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-black text-[var(--foreground)] tracking-tight truncate">{c.nome}</h4>
                          {c.descricao && <p className="text-xs text-[var(--text-muted)] font-medium mt-0.5 line-clamp-2">{c.descricao}</p>}
                        </div>
                        <Toggle value={c.ativo} onChange={() => handleToggleCombo(c)} />
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {c.servicos.map((s, i) => <span key={i} className="text-[9px] font-black bg-[var(--accent)]/10 text-[var(--accent)] px-2 py-1 rounded-lg uppercase tracking-wide">{s}</span>)}
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          {c.precoOriginal && <p className="text-[10px] text-[var(--text-muted)] line-through">R$ {Number(c.precoOriginal).toFixed(2)}</p>}
                          <p className="text-lg font-black text-[var(--foreground)]">R$ {Number(c.precoCombo).toFixed(2)}</p>
                          {c.descontoPct && <p className="text-[10px] font-black text-emerald-500">{c.descontoPct}% OFF · {c.validadeDias} dias</p>}
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => setShowEnviarCombo(c)} className="p-2.5 bg-[var(--accent)]/10 hover:bg-[var(--accent)]/20 text-[var(--accent)] rounded-xl transition-all" title="Enviar para cliente"><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1 1l12 6-12 6V8.5l8-1.5-8-1.5V1z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
                          <button onClick={() => openEditCombo(c)} className="p-2.5 bg-[var(--foreground)]/5 hover:bg-[var(--foreground)]/10 rounded-xl transition-all" title="Editar"><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9.917 1.75l2.333 2.333L4.083 12.25H1.75V9.917L9.917 1.75z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
                          <button onClick={() => handleDeleteCombo(c.id)} className="p-2.5 bg-red-500/5 hover:bg-red-500/10 text-red-400 rounded-xl transition-all" title="Excluir"><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1.167 3.5h11.667M5.25 3.5V2.333h3.5V3.5M4.667 9.917V5.833M9.333 9.917V5.833M2.917 3.5l.583 8.167h7l.583-8.167" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ══ Aba: Campanhas ══════════════════════════════════════ */}
          {tab === 'campanhas' && (
            <div className="space-y-5">
              <div className="flex justify-between items-center">
                <p className="text-sm text-[var(--text-muted)] font-medium">{campanhas.length} campanha{campanhas.length !== 1 ? 's' : ''}</p>
                <button onClick={() => setShowNovaCampanha(true)} className="px-6 py-3 bg-[var(--accent)] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-[var(--accent)]/20 hover:opacity-90 transition-all">
                  + Nova Campanha
                </button>
              </div>

              {campanhas.length === 0 ? (
                <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[2.5rem] p-14 text-center">
                  <div className="mb-4 flex justify-center opacity-20"><svg width="40" height="40" viewBox="0 0 40 40" fill="none"><path d="M5 15h5l15-8v26L10 25H5a3 3 0 01-3-3v-4a3 3 0 013-3z" stroke="#40916C" strokeWidth="2" strokeLinejoin="round"/><path d="M10 25v8" stroke="#40916C" strokeWidth="2" strokeLinecap="round"/></svg></div>
                  <p className="font-black text-[var(--text-muted)] uppercase tracking-widest text-xs">Nenhuma campanha criada</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {campanhas.map(c => {
                    const statusMap: Record<string, string> = { rascunho: 'bg-[var(--foreground)]/10 text-[var(--text-muted)]', enviando: 'bg-yellow-500/10 text-yellow-500', concluida: 'bg-emerald-500/10 text-emerald-500', erro: 'bg-red-500/10 text-red-400' };
                    const tipoMap: Record<string, string> = { todos: 'Todos', aniversariantes: 'Aniversariantes', inativos: 'Inativos', servico: 'Serviço' };
                    return (
                      <div key={c.id} className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[2rem] p-6 space-y-4 shadow-sm hover:border-[var(--accent)]/30 transition-all">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="space-y-1.5">
                            <h4 className="font-black text-[var(--foreground)] tracking-tight">{c.nome}</h4>
                            <div className="flex gap-2 flex-wrap">
                              <span className="text-[9px] font-black bg-[var(--foreground)]/5 px-2 py-1 rounded-lg text-[var(--text-muted)]">{tipoMap[c.tipo ?? 'todos'] ?? c.tipo}</span>
                              <span className={`text-[9px] font-black px-2 py-1 rounded-lg uppercase ${statusMap[c.status] ?? statusMap.rascunho}`}>{c.status}</span>
                            </div>
                          </div>
                          {c.status !== 'concluida' && c.status !== 'enviando' && (
                            <button onClick={() => handleDispatch(c.id)} disabled={!!dispatchingId}
                              className="px-5 py-2.5 bg-[var(--accent)]/10 hover:bg-[var(--accent)]/20 text-[var(--accent)] rounded-xl text-[10px] font-black uppercase disabled:opacity-50 transition-all">
                              {dispatchingId === c.id ? 'Disparando...' : '▶ Disparar'}
                            </button>
                          )}
                        </div>
                        {dispatchingId === c.id && dispatchProgress && (
                          <div className="space-y-2">
                            <div className="flex justify-between text-[10px] font-medium text-[var(--text-muted)]">
                              <span>Enviando para {dispatchProgress.nome}…</span>
                              <span>{dispatchProgress.enviados + dispatchProgress.erros}/{dispatchProgress.total}</span>
                            </div>
                            <div className="h-2 bg-[var(--foreground)]/5 rounded-full overflow-hidden">
                              <div className="h-full bg-[var(--accent)] rounded-full transition-all" style={{ width: `${((dispatchProgress.enviados + dispatchProgress.erros) / Math.max(1, dispatchProgress.total)) * 100}%` }} />
                            </div>
                            <p className="text-[10px] text-emerald-500 font-medium">{dispatchProgress.enviados} enviados{dispatchProgress.erros > 0 ? ` · ${dispatchProgress.erros} erros` : ''}</p>
                          </div>
                        )}
                        {c.status === 'concluida' && (
                          <p className="text-xs font-medium">
                            <span className="text-emerald-500 font-black">{c.totalEnviados} enviados</span>
                            {c.totalErros > 0 && <span className="text-red-400 font-black ml-3">{c.totalErros} erros</span>}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ══ Aba: Configurações ══════════════════════════════════ */}
          {tab === 'config' && (
            <div className="space-y-5">
              <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[2.5rem] p-8 space-y-6 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <h3 className="font-black text-[var(--foreground)] tracking-tight">Configurações da API WhatsApp</h3>
                  {/* Badge de instância ativa */}
                  {config && (() => {
                    const s = config._instanciaStatus;
                    const badges = {
                      instancia: { icon: '●', label: 'Instância vinculada', cls: 'bg-emerald-500/10 text-emerald-600 border-emerald-200' },
                      propria:   { icon: '●', label: 'API Key própria', cls: 'bg-emerald-500/10 text-emerald-600 border-emerald-200' },
                      demo:      { icon: '●', label: 'Instância demo', cls: 'bg-amber-500/10 text-amber-600 border-amber-200' },
                      nenhuma:   { icon: '●', label: 'Não configurada', cls: 'bg-red-500/10 text-red-600 border-red-200' },
                    };
                    const b = badges[s ?? 'nenhuma'];
                    return (
                      <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl border ${b.cls} shrink-0`}>
                        {b.icon} {b.label}
                      </span>
                    );
                  })()}
                </div>

                {/* Aviso de modo demo */}
                {config?._forceDemo && (
                  <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-500/10 rounded-2xl border border-amber-200 dark:border-amber-500/30">
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="shrink-0 text-amber-500"><path d="M9 1.5L16.5 15H1.5L9 1.5z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M9 7v3M9 12h.008" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                    <div>
                      <p className="text-[10px] font-black text-amber-700 dark:text-amber-400 uppercase tracking-widest">Modo Demo Forçado</p>
                      <p className="text-[11px] text-amber-600 dark:text-amber-500 mt-0.5">MARKETING_DEMO_MODE=true — todos os envios usam a instância demo, ignorando API Keys de clínicas.</p>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest pl-1">WaSender API Key</label>
                  <div className="flex gap-3">
                    <WaSenderKeyInput value={localConfig.wasenderApiKey ?? ''} onChange={v => setLocalConfig(p => ({ ...p, wasenderApiKey: v }))} temKey={!!config?._temApiKey} />
                    <button onClick={handleTestarConexao} disabled={testandoConexao}
                      className="px-5 py-3 bg-[var(--foreground)]/5 hover:bg-[var(--foreground)]/10 border border-[var(--border)] rounded-2xl text-[10px] font-black uppercase tracking-widest disabled:opacity-50 whitespace-nowrap transition-all">
                      {testandoConexao ? '...' : 'Testar'}
                    </button>
                  </div>
                  {statusConexao !== 'idle' && (
                    <div className={`flex items-center gap-2 mt-2 px-4 py-3 rounded-2xl text-xs font-black ${conexaoInfo[statusConexao].cls}`}>
                      <span className={`w-2 h-2 rounded-full ${conexaoInfo[statusConexao].dot}`} />
                      {conexaoInfo[statusConexao].label}
                    </div>
                  )}
                </div>

                {/* Card: Instância Demo */}
                {config?._temDemo && (
                  <div className="border border-dashed border-amber-300 dark:border-amber-500/40 rounded-2xl p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest">Instância Demo Compartilhada</p>
                        <p className="text-[11px] text-[var(--text-muted)] mt-0.5">Use apenas para homologação. Não envie mensagens reais de pacientes por esta instância.</p>
                      </div>
                    </div>
                    {config._demoPhone && (
                      <p className="text-[10px] text-[var(--text-muted)]">Número demo: <code className="bg-[var(--foreground)]/5 px-1.5 py-0.5 rounded-lg font-mono">{config._demoPhone}</code></p>
                    )}
                    <button
                      onClick={async () => {
                        setTestandoDemo(true); setStatusDemo('idle');
                        try {
                          const r = await fetchWithAuth('/api/marketing/testar-demo', { method: 'POST' });
                          const d = await r.json();
                          setStatusDemo(d.status === 'ok' ? 'ok' : 'erro');
                          showToast(d.message, d.status === 'ok');
                        } catch { setStatusDemo('erro'); }
                        finally { setTestandoDemo(false); }
                      }}
                      disabled={testandoDemo}
                      className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors disabled:opacity-50"
                    >
                      {testandoDemo ? 'Enviando...' : 'Testar instância demo'}
                    </button>
                    {statusDemo === 'ok' && <p className="text-[10px] font-black text-emerald-600">Mensagem de teste enviada!</p>}
                    {statusDemo === 'erro' && <p className="text-[10px] font-black text-red-500">Erro ao enviar. Verifique os logs.</p>}
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest pl-1">Nome da Clínica (usado nos templates)</label>
                  <input value={localConfig.nomeClinica ?? ''} onChange={e => setLocalConfig(p => ({ ...p, nomeClinica: e.target.value }))}
                    placeholder="Ex: Clínica Bella Vita" className="w-full bg-[var(--foreground)]/5 border border-[var(--border)] rounded-2xl px-5 py-4 text-sm focus:outline-none focus:border-[var(--accent)] font-medium" />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest pl-1">Link de confirmação de agendamento</label>
                  <input value={localConfig.linkConfirmacao ?? ''} onChange={e => setLocalConfig(p => ({ ...p, linkConfirmacao: e.target.value }))}
                    placeholder="https://sua-clinica.com/confirmar" className="w-full bg-[var(--foreground)]/5 border border-[var(--border)] rounded-2xl px-5 py-4 text-sm focus:outline-none focus:border-[var(--accent)] font-medium" />
                </div>

                <button onClick={handleSaveConfig} disabled={savingConfig}
                  className="w-full py-5 bg-[var(--accent)] text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-[var(--accent)]/20 disabled:opacity-60 transition-all">
                  {savingConfig ? 'Salvando...' : 'Salvar configurações'}
                </button>
              </div>
            </div>
          )}

          {/* ══ Aba: Log ════════════════════════════════════════════ */}
          {tab === 'log' && (
            <div className="space-y-4">
              <div className="flex gap-3 flex-wrap">
                <select value={filtroTipo} onChange={e => { setFiltroTipo(e.target.value); setPageLog(1); }}
                  className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl px-4 py-2.5 text-xs font-black focus:outline-none focus:border-[var(--accent)]">
                  <option value="">Todos os tipos</option>
                  <option value="lembrete">Lembrete</option>
                  <option value="aniversario">Aniversário</option>
                  <option value="combo">Combo</option>
                  <option value="campanha">Campanha</option>
                </select>
                <select value={filtroStatus} onChange={e => { setFiltroStatus(e.target.value); setPageLog(1); }}
                  className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl px-4 py-2.5 text-xs font-black focus:outline-none focus:border-[var(--accent)]">
                  <option value="">Todos os status</option>
                  <option value="enviado">Enviado</option>
                  <option value="erro">Erro</option>
                </select>
                <span className="text-xs text-[var(--text-muted)] font-medium self-center">{totalEnvios} registro{totalEnvios !== 1 ? 's' : ''}</span>
              </div>

              <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[2.5rem] overflow-hidden shadow-sm">
                {envios.length === 0 ? (
                  <div className="p-14 text-center text-xs text-[var(--text-muted)] font-black uppercase opacity-50">Nenhum envio registrado</div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-[var(--foreground)]/[0.02] text-[var(--text-muted)] text-[9px] uppercase font-black tracking-widest">
                          <tr>
                            <th className="px-5 py-4">Tipo</th>
                            <th className="px-5 py-4">Cliente</th>
                            <th className="px-5 py-4">Telefone</th>
                            <th className="px-5 py-4">Status</th>
                            <th className="px-5 py-4">Data/Hora</th>
                            <th className="px-5 py-4">Mensagem</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border)]">
                          {envios.map(e => {
                            return (
                              <tr key={e.id} className="hover:bg-[var(--foreground)]/[0.01] transition-colors">
                                <td className="px-5 py-3.5">
                                  <span className="text-[9px] font-black bg-[var(--foreground)]/5 px-2 py-1 rounded-lg">{e.tipo}</span>
                                </td>
                                <td className="px-5 py-3.5 text-xs font-medium text-[var(--foreground)]">{e.clienteNome || '—'}</td>
                                <td className="px-5 py-3.5 text-xs text-[var(--text-muted)] font-medium">{e.clienteTelefone}</td>
                                <td className="px-5 py-3.5">
                                  <span className={`text-[9px] font-black px-2 py-1 rounded-lg ${e.status === 'enviado' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-400'}`}>
                                    {e.status}
                                  </span>
                                  {e.erroDetalhe && <p className="text-[9px] text-red-400 mt-1 max-w-[120px] truncate" title={e.erroDetalhe}>{e.erroDetalhe}</p>}
                                </td>
                                <td className="px-5 py-3.5 text-[10px] text-[var(--text-muted)] font-medium whitespace-nowrap">
                                  {new Date(e.enviadoEm).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} {new Date(e.enviadoEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                </td>
                                <td className="px-5 py-3.5 text-[10px] text-[var(--text-muted)] font-medium max-w-[180px]">
                                  <span className="line-clamp-2">{e.mensagemEnviada || '—'}</span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    {/* Paginação */}
                    {totalPagesLog > 1 && (
                      <div className="flex items-center justify-between p-5 border-t border-[var(--border)]">
                        <button onClick={() => setPageLog(p => Math.max(1, p - 1))} disabled={pageLog === 1}
                          className="px-4 py-2 bg-[var(--foreground)]/5 rounded-xl text-[10px] font-black disabled:opacity-40">← Anterior</button>
                        <span className="text-[10px] text-[var(--text-muted)] font-black">{pageLog} / {totalPagesLog}</span>
                        <button onClick={() => setPageLog(p => Math.min(totalPagesLog, p + 1))} disabled={pageLog === totalPagesLog}
                          className="px-4 py-2 bg-[var(--foreground)]/5 rounded-xl text-[10px] font-black disabled:opacity-40">Próxima →</button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[2.5rem] p-6 shadow-sm">
            <h4 className="font-black text-[10px] uppercase tracking-widest text-[var(--text-muted)] mb-5 opacity-70">Resumo Geral</h4>
            <div className="space-y-4">
              {[
                { label: 'Total enviados', value: metrics?.totalEnviados ?? 0, color: 'text-[var(--accent)]' },
                { label: 'Lembretes', value: metrics?.summary?.lembrete?.enviado ?? 0, color: 'text-blue-400' },
                { label: 'Aniversários', value: metrics?.summary?.aniversario?.enviado ?? 0, color: 'text-emerald-500' },
                { label: 'Combos', value: metrics?.summary?.combo?.enviado ?? 0, color: 'text-purple-400' },
                { label: 'Campanhas', value: metrics?.campanhasConcluidas ?? 0, color: 'text-yellow-500' },
              ].map(item => (
                <div key={item.label} className="flex justify-between items-center">
                  <span className="text-xs text-[var(--text-muted)] font-medium">{item.label}</span>
                  <span className={`text-xl font-black ${item.color}`}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gradient-to-br from-[var(--sidebar-bg)] to-[var(--card-bg)] border border-[var(--border)] rounded-[2.5rem] p-6 space-y-3 shadow-sm">
            <p className="font-black text-[10px] uppercase tracking-widest text-[var(--text-muted)] opacity-70">Ações Rápidas</p>
            {[
              { label: 'Ver lembretes pendentes', action: () => setTab('lembretes') },
              { label: 'Ver aniversariantes', action: () => setTab('aniversarios') },
              { label: 'Nova campanha', action: () => { setTab('campanhas'); setShowNovaCampanha(true); } },
              { label: 'Novo combo', action: () => { setTab('combos'); openNovoCombo(); } },
            ].map(item => (
              <button key={item.label} onClick={item.action}
                className="w-full p-3.5 bg-[var(--foreground)]/5 hover:bg-[var(--foreground)]/10 text-left rounded-2xl text-[10px] text-[var(--text-muted)] hover:text-[var(--foreground)] transition-all border border-[var(--border)] font-black uppercase tracking-widest">
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ══ Modal: Novo / Editar Combo ═══════════════════════════════ */}
      {showNovoCombo && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setShowNovoCombo(false)} />
          <div className="relative w-full max-w-lg bg-[var(--card-bg)] border border-[var(--border)] rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto space-y-5">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-black text-[var(--foreground)]">{editCombo ? 'Editar Combo' : 'Novo Combo'}</h3>
              <button onClick={() => setShowNovoCombo(false)} className="w-10 h-10 flex items-center justify-center rounded-2xl hover:bg-[var(--foreground)]/5 text-[var(--text-muted)]"><svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M9 3L3 9M3 3l6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg></button>
            </div>

            {[
              { label: 'Nome do combo', key: 'nome', placeholder: 'Ex: Corte + Hidratação' },
              { label: 'Descrição', key: 'descricao', placeholder: 'Breve descrição para o cliente' },
              { label: 'Serviço gatilho (opcional)', key: 'gatilhoServico', placeholder: 'Serviço que dispara a sugestão' },
            ].map(field => (
              <div key={field.key} className="space-y-1.5">
                <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest pl-1">{field.label}</label>
                <input value={(comboForm as any)[field.key]} onChange={e => setComboForm(p => ({ ...p, [field.key]: e.target.value }))}
                  placeholder={field.placeholder} className="w-full bg-[var(--foreground)]/5 border border-[var(--border)] rounded-2xl px-4 py-3.5 text-sm focus:outline-none focus:border-[var(--accent)] font-medium" />
              </div>
            ))}

            {/* Serviços */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest pl-1">Serviços incluídos</label>
              <div className="flex gap-2">
                <input value={comboForm.servicoInput} onChange={e => setComboForm(p => ({ ...p, servicoInput: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addServico())}
                  placeholder="Digite e pressione Enter" className="flex-1 bg-[var(--foreground)]/5 border border-[var(--border)] rounded-2xl px-4 py-3.5 text-sm focus:outline-none focus:border-[var(--accent)] font-medium" />
                <button onClick={addServico} className="px-4 py-3 bg-[var(--accent)] text-white rounded-2xl text-sm font-black">+</button>
              </div>
              <div className="flex flex-wrap gap-2 mt-1">
                {comboForm.servicos.map((s, i) => (
                  <span key={i} className="flex items-center gap-1.5 bg-[var(--accent)]/10 text-[var(--accent)] px-3 py-1.5 rounded-xl text-[10px] font-black">
                    {s} <button onClick={() => removeServico(i)} className="hover:text-red-400 transition-colors">×</button>
                  </span>
                ))}
              </div>
            </div>

            {/* Preços */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Preço original', key: 'precoOriginal', placeholder: '0.00' },
                { label: 'Preço combo', key: 'precoCombo', placeholder: '0.00' },
                { label: 'Desconto %', key: 'descontoPct', placeholder: 'Auto' },
              ].map(field => (
                <div key={field.key} className="space-y-1.5">
                  <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest pl-1">{field.label}</label>
                  <input type="number" value={(comboForm as any)[field.key]} onChange={e => setComboForm(p => ({ ...p, [field.key]: e.target.value }))}
                    placeholder={field.placeholder} className="w-full bg-[var(--foreground)]/5 border border-[var(--border)] rounded-2xl px-3 py-3.5 text-sm focus:outline-none focus:border-[var(--accent)] font-medium" />
                </div>
              ))}
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest pl-1">Validade (dias)</label>
              <input type="number" value={comboForm.validadeDias} onChange={e => setComboForm(p => ({ ...p, validadeDias: e.target.value }))}
                className="w-full bg-[var(--foreground)]/5 border border-[var(--border)] rounded-2xl px-4 py-3.5 text-sm focus:outline-none focus:border-[var(--accent)] font-medium" />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest pl-1">Template WhatsApp (opcional)</label>
              <p className="text-[10px] text-[var(--text-muted)] pl-1">Variáveis: <code className="bg-[var(--foreground)]/5 px-1 rounded">{'{nome}'}</code> <code className="bg-[var(--foreground)]/5 px-1 rounded">{'{combo_nome}'}</code> <code className="bg-[var(--foreground)]/5 px-1 rounded">{'{preco_combo}'}</code> <code className="bg-[var(--foreground)]/5 px-1 rounded">{'{desconto}'}</code></p>
              <textarea rows={4} value={comboForm.templateWhatsapp} onChange={e => setComboForm(p => ({ ...p, templateWhatsapp: e.target.value }))}
                placeholder={`Deixe vazio para usar o padrão:\n${TEMPLATE_COMBO_PADRAO.slice(0, 80)}...`}
                className="w-full bg-[var(--foreground)]/5 border border-[var(--border)] rounded-2xl px-4 py-3.5 text-sm focus:outline-none focus:border-[var(--accent)] font-medium resize-none leading-relaxed" />
            </div>

            <button onClick={handleSaveCombo} disabled={savingCombo || !comboForm.nome || !comboForm.precoCombo || comboForm.servicos.length === 0}
              className="w-full py-4 bg-[var(--accent)] text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-[var(--accent)]/20 disabled:opacity-50 transition-all">
              {savingCombo ? 'Salvando...' : editCombo ? 'Atualizar Combo' : 'Criar Combo'}
            </button>
          </div>
        </div>
      )}

      {/* ══ Modal: Enviar Combo para Cliente ════════════════════════ */}
      {showEnviarCombo && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => { setShowEnviarCombo(null); setComboPacienteSel(null); setComboPacienteBusca(''); }} />
          <div className="relative w-full max-w-md bg-[var(--card-bg)] border border-[var(--border)] rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in-95 space-y-5">
            <h3 className="text-xl font-black text-[var(--foreground)]">Enviar "{showEnviarCombo.nome}"</h3>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest pl-1">Buscar {labels.cliente.toLowerCase()}</label>
              <input value={comboPacienteBusca} onChange={e => { setComboPacienteBusca(e.target.value); setComboPacienteSel(null); }}
                placeholder="Nome ou telefone..." className="w-full bg-[var(--foreground)]/5 border border-[var(--border)] rounded-2xl px-4 py-4 text-sm focus:outline-none focus:border-[var(--accent)] font-medium" />
              {comboPacientes.length > 0 && !comboPacienteSel && (
                <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-xl">
                  {comboPacientes.slice(0, 5).map(p => (
                    <button key={p.id} onClick={() => { setComboPacienteSel(p); setComboPacienteBusca(p.nome); setComboPacientes([]); }}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[var(--foreground)]/5 transition-colors text-left">
                      <div className="w-8 h-8 rounded-xl bg-[var(--accent)]/10 flex items-center justify-center text-[var(--accent)] font-black text-xs">{p.nome[0]}</div>
                      <div><p className="text-sm font-black text-[var(--foreground)]">{p.nome}</p><p className="text-[10px] text-[var(--text-muted)]">{p.telefone}</p></div>
                    </button>
                  ))}
                </div>
              )}
              {comboPacienteSel && (
                <div className="flex items-center gap-3 p-4 bg-[var(--accent)]/5 border border-[var(--accent)]/20 rounded-2xl">
                  <div className="w-10 h-10 rounded-xl bg-[var(--accent)]/10 flex items-center justify-center text-[var(--accent)] font-black">{comboPacienteSel.nome[0]}</div>
                  <div><p className="font-black text-[var(--foreground)] text-sm">{comboPacienteSel.nome}</p><p className="text-[10px] text-[var(--text-muted)]">{comboPacienteSel.telefone}</p></div>
                </div>
              )}
            </div>
            <button onClick={handleEnviarCombo} disabled={!comboPacienteSel || sendingId === showEnviarCombo.id}
              className="w-full py-4 bg-[var(--accent)] text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-[var(--accent)]/20 disabled:opacity-50 transition-all">
              {sendingId === showEnviarCombo.id ? 'Enviando...' : 'Enviar via WhatsApp'}
            </button>
          </div>
        </div>
      )}

      {/* ══ Modal: Nova Campanha ════════════════════════════════════ */}
      {showNovaCampanha && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => { setShowNovaCampanha(false); setAlcance(null); }} />
          <div className="relative w-full max-w-lg bg-[var(--card-bg)] border border-[var(--border)] rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in-95 duration-200 space-y-5">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-black text-[var(--foreground)]">Nova Campanha</h3>
              <button onClick={() => { setShowNovaCampanha(false); setAlcance(null); }} className="w-10 h-10 flex items-center justify-center rounded-2xl hover:bg-[var(--foreground)]/5 text-[var(--text-muted)]"><svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M9 3L3 9M3 3l6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg></button>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest pl-1">Nome da campanha</label>
              <input value={novaCamp.nome} onChange={e => setNovaCamp(p => ({ ...p, nome: e.target.value }))}
                placeholder="Ex: Promoção de Inverno" className="w-full bg-[var(--foreground)]/5 border border-[var(--border)] rounded-2xl px-4 py-4 text-sm focus:outline-none focus:border-[var(--accent)] font-medium" />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest pl-1">Público-alvo</label>
              <select value={novaCamp.tipo} onChange={e => { setNovaCamp(p => ({ ...p, tipo: e.target.value })); setAlcance(null); }}
                className="w-full bg-[var(--foreground)]/5 border border-[var(--border)] rounded-2xl px-4 py-4 text-sm focus:outline-none focus:border-[var(--accent)] font-medium">
                <option value="todos">Todos os {labels.cliente.toLowerCase()}s</option>
                <option value="aniversariantes">Aniversariantes de hoje</option>
                <option value="inativos">Inativos há X dias</option>
                <option value="servico">Por serviço</option>
              </select>
            </div>

            {novaCamp.tipo === 'inativos' && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest pl-1">Inativo há (dias)</label>
                <input type="number" value={novaCamp.filtroInativoDias} onChange={e => { setNovaCamp(p => ({ ...p, filtroInativoDias: e.target.value })); setAlcance(null); }}
                  className="w-full bg-[var(--foreground)]/5 border border-[var(--border)] rounded-2xl px-4 py-4 text-sm focus:outline-none focus:border-[var(--accent)] font-medium" min={1} />
              </div>
            )}

            {novaCamp.tipo === 'servico' && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest pl-1">Nome do serviço</label>
                <input value={novaCamp.filtroServico} onChange={e => { setNovaCamp(p => ({ ...p, filtroServico: e.target.value })); setAlcance(null); }}
                  placeholder="Ex: Limpeza de pele" className="w-full bg-[var(--foreground)]/5 border border-[var(--border)] rounded-2xl px-4 py-4 text-sm focus:outline-none focus:border-[var(--accent)] font-medium" />
              </div>
            )}

            {/* Estimar alcance */}
            <div className="flex items-center gap-3">
              <button onClick={handleEstimarAlcance} disabled={estimando}
                className="px-5 py-2.5 bg-[var(--foreground)]/5 hover:bg-[var(--foreground)]/10 border border-[var(--border)] rounded-2xl text-[10px] font-black uppercase tracking-widest disabled:opacity-50 transition-all">
                {estimando ? 'Estimando...' : 'Estimar alcance'}
              </button>
              {alcance !== null && (
                <div className="flex items-center gap-2 px-4 py-2.5 bg-[var(--accent)]/10 border border-[var(--accent)]/20 rounded-2xl">
                  <span className="text-[var(--accent)] font-black text-lg">{alcance}</span>
                  <span className="text-[10px] font-black text-[var(--accent)] uppercase tracking-widest">{labels.cliente.toLowerCase()}{alcance !== 1 ? 's' : ''}</span>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest pl-1">Mensagem</label>
              <p className="text-[10px] text-[var(--text-muted)] pl-1">Variáveis: <code className="bg-[var(--foreground)]/5 px-1 rounded">{'{nome}'}</code> <code className="bg-[var(--foreground)]/5 px-1 rounded">{'{clinica}'}</code></p>
              <textarea rows={5} value={novaCamp.template} onChange={e => setNovaCamp(p => ({ ...p, template: e.target.value }))}
                placeholder="Olá {nome}! Temos uma novidade especial para você..." className="w-full bg-[var(--foreground)]/5 border border-[var(--border)] rounded-2xl px-4 py-4 text-sm focus:outline-none focus:border-[var(--accent)] font-medium resize-none leading-relaxed" />
            </div>

            <button onClick={handleCriarCampanha} disabled={!novaCamp.nome || !novaCamp.template}
              className="w-full py-4 bg-[var(--accent)] text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-[var(--accent)]/20 disabled:opacity-50 transition-all">
              Criar Campanha
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── WaSender Key Input (com toggle mostrar/ocultar) ───────────────
function WaSenderKeyInput({ value, onChange, temKey }: { value: string; onChange: (v: string) => void; temKey: boolean }) {
  const [show, setShow] = useState(false);
  return (
    <div className="flex-1 relative">
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={temKey ? '••••••••••••••••••••••••••••••••' : 'sk-...'}
        className="w-full bg-[var(--foreground)]/5 border border-[var(--border)] rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-[var(--accent)] font-medium pr-12"
      />
      <button type="button" onClick={() => setShow(p => !p)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--foreground)] text-sm transition-colors p-1">
        {show ? (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1.75 7s2.333-3.5 5.25-3.5S12.25 7 12.25 7s-2.333 3.5-5.25 3.5S1.75 7 1.75 7z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/><line x1="1.75" y1="12.25" x2="12.25" y2="1.75" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1.75 7s2.333-3.5 5.25-3.5S12.25 7 12.25 7s-2.333 3.5-5.25 3.5S1.75 7 1.75 7z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/><circle cx="7" cy="7" r="1.458" stroke="currentColor" strokeWidth="1.3"/></svg>
        )}
      </button>
    </div>
  );
}
