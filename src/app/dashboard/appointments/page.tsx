"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNicho } from "@/context/NichoContext";
import { fetchWithAuth } from "@/lib/api-utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type Agendamento = {
  id: string;
  dataHora: string;
  fimDataHora: string;
  durationMinutes: number;
  status: string;
  categoria?: string;
  tipoAtendimento?: string;
  convenio?: string;
  observacoes?: string;
  paciente: { id: string; nome: string; telefone: string; dataNascimento?: string; convenio?: string };
  profissional?: { id: string; nome: string } | null;
  servico?: { id: string; nome: string; durationMinutes?: number; price?: number; color?: string } | null;
};

type Totais = Record<string, number>;

// ─── Constantes ───────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; border: string; dot: string }> = {
  pendente:   { label: 'Aguardando',  bg: 'bg-amber-50',   text: 'text-amber-700',  border: 'border-amber-200', dot: 'bg-amber-400' },
  confirmado: { label: 'Confirmado',  bg: 'bg-blue-50',    text: 'text-blue-700',   border: 'border-blue-200',  dot: 'bg-blue-500'  },
  done:       { label: 'Concluído',   bg: 'bg-green-50',   text: 'text-green-700',  border: 'border-green-200', dot: 'bg-green-500' },
  cancelado:  { label: 'Cancelado',   bg: 'bg-red-50',     text: 'text-red-600',    border: 'border-red-200',   dot: 'bg-red-400'   },
};

const FLUXO: Record<string, { label: string; nextStatus: string; style: string }[]> = {
  pendente:   [
    { label: 'Confirmar chegada', nextStatus: 'confirmado', style: 'bg-blue-600 text-white hover:bg-blue-700' },
    { label: 'Cancelar',          nextStatus: 'cancelado',  style: 'bg-white border border-red-200 text-red-600 hover:bg-red-50' },
  ],
  confirmado: [
    { label: 'Concluir atendimento', nextStatus: 'done',     style: 'bg-green-600 text-white hover:bg-green-700' },
    { label: 'Cancelar',             nextStatus: 'cancelado', style: 'bg-white border border-red-200 text-red-600 hover:bg-red-50' },
  ],
  done:       [],
  cancelado:  [
    { label: 'Reativar', nextStatus: 'pendente', style: 'bg-white border border-card-border text-text-muted hover:bg-slate-50' },
  ],
};

function fmtHora(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function fmtIdade(dataNascimento?: string) {
  if (!dataNascimento) return null;
  const anos = Math.floor((Date.now() - new Date(dataNascimento).getTime()) / (1000 * 60 * 60 * 24 * 365.25));
  return `${anos}a`;
}

function isAtrasado(ag: Agendamento) {
  if (ag.status !== 'pendente' && ag.status !== 'confirmado') return false;
  return new Date(ag.fimDataHora) < new Date();
}

// ─── Card do Agendamento ─────────────────────────────────────────────────────

function CardAtendimento({
  ag,
  labels,
  onStatusChange,
  updating,
}: {
  ag: Agendamento;
  labels: any;
  onStatusChange: (id: string, status: string) => void;
  updating: string | null;
}) {
  const cfg = STATUS_CONFIG[ag.status] || STATUS_CONFIG.pendente;
  const acoes = FLUXO[ag.status] || [];
  const atrasado = isAtrasado(ag);
  const idade = fmtIdade(ag.paciente.dataNascimento);
  const cor = ag.servico?.color || '#6366f1';
  const isUpdating = updating === ag.id;

  return (
    <div className={`group relative bg-white border rounded-2xl overflow-hidden transition-all duration-200 hover:shadow-md ${atrasado ? 'border-orange-300' : 'border-card-border'}`}>
      {/* Faixa colorida lateral */}
      <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl" style={{ background: cor }} />

      <div className="pl-4 pr-5 py-4 flex items-start gap-4">
        {/* Horário */}
        <div className="shrink-0 text-center w-14">
          <p className="text-lg font-black text-text-main leading-none">{fmtHora(ag.dataHora)}</p>
          <p className="text-[9px] font-black text-text-placeholder uppercase mt-0.5">
            {ag.durationMinutes}min
          </p>
          {atrasado && (
            <span className="mt-1 inline-block text-[8px] font-black text-orange-600 bg-orange-50 border border-orange-200 px-1.5 py-0.5 rounded-lg">
              ATRASADO
            </span>
          )}
        </div>

        {/* Info principal */}
        <div className="flex-1 min-w-0 space-y-1.5">
          {/* Nome + badge status */}
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-black text-text-main text-sm uppercase tracking-tight leading-none">
              {ag.paciente.nome}
            </p>
            {idade && (
              <span className="text-[8px] font-black text-text-placeholder bg-slate-50 px-1.5 py-0.5 rounded-lg border border-card-border">
                {idade}
              </span>
            )}
            <span className={`text-[8px] font-black px-2 py-0.5 rounded-lg border ${cfg.bg} ${cfg.text} ${cfg.border} flex items-center gap-1`}>
              <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
              {cfg.label}
            </span>
          </div>

          {/* Serviço + profissional */}
          <div className="flex items-center gap-3 flex-wrap text-[10px] text-text-muted font-medium">
            {ag.servico && (
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full" style={{ background: cor }} />
                {ag.servico.nome}
              </span>
            )}
            {ag.profissional && (
              <span className="text-text-placeholder">
                {labels.tratamentoProfissional} {ag.profissional.nome}
              </span>
            )}
            {(ag.convenio || ag.paciente.convenio) && (
              <span className="bg-primary-soft text-primary px-2 py-0.5 rounded-lg border border-primary/10 font-black text-[8px]">
                {ag.convenio || ag.paciente.convenio}
              </span>
            )}
          </div>

          {/* Telefone */}
          <p className="text-[10px] font-mono text-text-placeholder">{ag.paciente.telefone}</p>

          {/* Observações */}
          {ag.observacoes && (
            <p className="text-[10px] text-text-muted italic bg-slate-50 px-2 py-1 rounded-lg border border-card-border">
              {ag.observacoes}
            </p>
          )}
        </div>

        {/* Ações */}
        {acoes.length > 0 && (
          <div className="shrink-0 flex flex-col gap-2">
            {acoes.map((a) => (
              <button
                key={a.nextStatus}
                onClick={() => onStatusChange(ag.id, a.nextStatus)}
                disabled={isUpdating}
                className={`text-[8px] font-black uppercase px-3 py-1.5 rounded-lg transition-all whitespace-nowrap ${a.style} disabled:opacity-50`}
              >
                {isUpdating ? '...' : a.label}
              </button>
            ))}
          </div>
        )}

        {/* Done checkmark */}
        {ag.status === 'done' && (
          <div className="shrink-0 w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4">
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="#16a34a" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Página Principal ─────────────────────────────────────────────────────────

export default function AtendimentosHojePage() {
  const { labels } = useNicho();

  const hoje = new Date().toISOString().split('T')[0];
  const [data, setData] = useState(hoje);
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [totais, setTotais] = useState<Totais>({});
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [filtroStatus, setFiltroStatus] = useState<string>('todos');
  const [filtroProfId, setFiltroProfId] = useState<string>('todos');
  const [busca, setBusca] = useState('');
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState<Date>(new Date());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const carregar = useCallback(async (d: string, silent = false) => {
    if (!silent) setLoading(true);
    try {
      const url = `/api/appointments/hoje?data=${d}`;
      const res = await fetchWithAuth(url);
      const json = await res.json();
      if (Array.isArray(json.agendamentos)) {
        setAgendamentos(json.agendamentos);
        setTotais(json.totais || {});
        setUltimaAtualizacao(new Date());
      }
    } catch {}
    finally { if (!silent) setLoading(false); }
  }, []);

  // Carga inicial + auto-refresh a cada 60s
  useEffect(() => {
    carregar(data);
    intervalRef.current = setInterval(() => carregar(data, true), 60000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [data, carregar]);

  const mudarStatus = async (id: string, status: string) => {
    setUpdating(id);
    try {
      const res = await fetchWithAuth('/api/appointments/hoje', {
        method: 'PATCH',
        body: JSON.stringify({ id, status }),
      });
      const atualizado = await res.json();
      if (atualizado.id) {
        setAgendamentos(prev =>
          prev.map(a => a.id === id ? { ...a, ...atualizado } : a)
        );
        // Recalcular totais localmente
        setTotais(prev => {
          const oldStatus = agendamentos.find(a => a.id === id)?.status;
          const novo = { ...prev };
          if (oldStatus) novo[oldStatus] = Math.max(0, (novo[oldStatus] || 0) - 1);
          novo[status] = (novo[status] || 0) + 1;
          return novo;
        });
      }
    } finally {
      setUpdating(null);
    }
  };

  // Profissionais únicos para filtro
  const profissionais = Array.from(
    new Map(
      agendamentos
        .filter(a => a.profissional)
        .map(a => [a.profissional!.id, a.profissional!])
    ).values()
  );

  // Filtrar lista
  const lista = agendamentos.filter(a => {
    if (filtroStatus !== 'todos' && a.status !== filtroStatus) return false;
    if (filtroProfId !== 'todos' && a.profissional?.id !== filtroProfId) return false;
    if (busca.trim()) {
      const q = busca.toLowerCase();
      return a.paciente.nome.toLowerCase().includes(q) ||
        a.paciente.telefone.includes(busca) ||
        (a.servico?.nome.toLowerCase().includes(q) ?? false);
    }
    return true;
  });

  // Separar por status para exibição organizada
  const pendentes   = lista.filter(a => a.status === 'pendente');
  const confirmados = lista.filter(a => a.status === 'confirmado');
  const concluidos  = lista.filter(a => a.status === 'done');
  const cancelados  = lista.filter(a => a.status === 'cancelado');

  const total = agendamentos.length;
  const totalDia = Object.values(totais).reduce((s, v) => s + v, 0);
  const isHoje = data === hoje;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20 animate-premium">

      {/* ── Header ── */}
      <div className="bg-white border border-card-border rounded-[2.5rem] p-8 shadow-sm">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary text-white flex items-center justify-center text-2xl shadow-lg shadow-primary/20">
              📋
            </div>
            <div>
              <h1 className="text-xl font-black italic uppercase tracking-tighter text-text-main">
                Atendimentos do Dia
              </h1>
              <p className="text-[9px] font-black uppercase tracking-[0.25em] text-text-placeholder opacity-60 mt-0.5">
                {isHoje ? 'Hoje · ' : ''}{new Date(data + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Seletor de data */}
            <input
              type="date"
              value={data}
              onChange={e => setData(e.target.value)}
              className="input-premium py-2.5 text-sm"
            />
            {!isHoje && (
              <button onClick={() => setData(hoje)}
                className="text-[9px] font-black uppercase px-4 py-2.5 bg-primary-soft text-primary border border-primary/10 rounded-xl hover:bg-primary/10 transition-colors">
                Hoje
              </button>
            )}
            <button onClick={() => carregar(data)}
              title="Atualizar"
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 border border-card-border text-text-placeholder hover:bg-slate-100 transition-colors">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <path d="M23 4v6h-6M1 20v-6h6" /><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
              </svg>
            </button>
          </div>
        </div>

        {/* ── KPIs ── */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { status: 'todos',     label: 'Total',      count: totalDia, bg: 'bg-slate-50', text: 'text-text-main',  border: 'border-card-border' },
            { status: 'pendente',  label: 'Aguardando', count: totais.pendente || 0,   ...STATUS_CONFIG.pendente  },
            { status: 'confirmado',label: 'Em atend.',  count: totais.confirmado || 0, ...STATUS_CONFIG.confirmado },
            { status: 'done',      label: 'Concluídos', count: totais.done || 0,       ...STATUS_CONFIG.done      },
          ].map(({ status, label, count, bg, text, border }) => (
            <button key={status}
              onClick={() => setFiltroStatus(filtroStatus === status ? 'todos' : status)}
              className={`p-4 rounded-2xl border text-left transition-all ${bg} ${border} ${filtroStatus === status ? 'ring-2 ring-primary/30 shadow-md' : 'hover:shadow-sm'}`}>
              <p className="text-2xl font-black tracking-tighter italic leading-none"
                style={{ color: filtroStatus === status ? 'var(--color-primary)' : undefined }}>
                {count}
              </p>
              <p className={`text-[8px] font-black uppercase tracking-widest mt-1 ${text} opacity-70`}>{label}</p>
            </button>
          ))}
        </div>
      </div>

      {/* ── Filtros ── */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Busca */}
        <div className="relative flex-1 min-w-[180px]">
          <input value={busca} onChange={e => setBusca(e.target.value)}
            placeholder={`Buscar ${labels.termoPaciente.toLowerCase()}...`}
            className="input-premium w-full py-2.5 text-sm pl-9" />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-placeholder text-sm">🔍</span>
        </div>

        {/* Filtro por profissional */}
        {profissionais.length > 1 && (
          <select value={filtroProfId} onChange={e => setFiltroProfId(e.target.value)}
            className="input-premium py-2.5 text-sm">
            <option value="todos">Todos os {labels.termoProfissionalPlural}</option>
            {profissionais.map(p => (
              <option key={p.id} value={p.id}>{labels.tratamentoProfissional} {p.nome}</option>
            ))}
          </select>
        )}

        {/* Status badge de quando foi a última atualização */}
        <p className="text-[9px] font-black text-text-placeholder uppercase tracking-wider ml-auto opacity-60">
          Atualizado às {ultimaAtualizacao.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>

      {/* ── Lista ── */}
      {loading ? (
        <div className="space-y-3">
          {[1,2,3,4].map(i => (
            <div key={i} className="bg-white border border-card-border rounded-2xl h-24 animate-pulse" />
          ))}
        </div>
      ) : lista.length === 0 ? (
        <div className="bg-white border border-card-border rounded-[2.5rem] py-24 text-center">
          <p className="text-4xl mb-3 opacity-20">📋</p>
          <p className="font-black text-text-placeholder text-xs uppercase tracking-[0.3em]">
            {total === 0 ? 'Nenhum atendimento neste dia' : 'Nenhum resultado para este filtro'}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Aguardando / Em atendimento */}
          {(pendentes.length > 0 || confirmados.length > 0) && filtroStatus === 'todos' && (
            <section>
              <h2 className="text-[9px] font-black uppercase tracking-[0.3em] text-text-placeholder mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                Fila de Atendimento — {pendentes.length + confirmados.length} {labels.termoPacientePlural.toLowerCase()}
              </h2>
              <div className="space-y-2">
                {[...confirmados, ...pendentes].map(a => (
                  <CardAtendimento key={a.id} ag={a} labels={labels} onStatusChange={mudarStatus} updating={updating} />
                ))}
              </div>
            </section>
          )}

          {/* Filtrado único */}
          {filtroStatus !== 'todos' && (
            <div className="space-y-2">
              {lista.map(a => (
                <CardAtendimento key={a.id} ag={a} labels={labels} onStatusChange={mudarStatus} updating={updating} />
              ))}
            </div>
          )}

          {/* Concluídos */}
          {concluidos.length > 0 && filtroStatus === 'todos' && (
            <section>
              <h2 className="text-[9px] font-black uppercase tracking-[0.3em] text-text-placeholder mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                Concluídos — {concluidos.length}
              </h2>
              <div className="space-y-2 opacity-70">
                {concluidos.map(a => (
                  <CardAtendimento key={a.id} ag={a} labels={labels} onStatusChange={mudarStatus} updating={updating} />
                ))}
              </div>
            </section>
          )}

          {/* Cancelados */}
          {cancelados.length > 0 && filtroStatus === 'todos' && (
            <section>
              <h2 className="text-[9px] font-black uppercase tracking-[0.3em] text-text-placeholder mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-400" />
                Cancelados — {cancelados.length}
              </h2>
              <div className="space-y-2 opacity-50">
                {cancelados.map(a => (
                  <CardAtendimento key={a.id} ag={a} labels={labels} onStatusChange={mudarStatus} updating={updating} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
