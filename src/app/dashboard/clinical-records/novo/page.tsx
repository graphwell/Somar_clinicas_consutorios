"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { fetchWithAuth } from "@/lib/api-utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Paciente {
  id: string;
  nome: string;
  telefone: string;
  dataNascimento?: string;
  ultimaVisita?: string;
}

interface Agendamento {
  id: string;
  dataHora: string;
  servico?: { nome: string };
  status: string;
}

type TipoProntuario = "CLINICO" | "ODONTOLOGICO" | "NUTRICIONAL" | "PSICOLOGICO" | "ESTETICO";

const TIPOS: {
  valor: TipoProntuario;
  emoji: string;
  label: string;
  desc: string;
}[] = [
  { valor: "CLINICO", emoji: "🏥", label: "Médico", desc: "Clínica geral, especialidades" },
  { valor: "ODONTOLOGICO", emoji: "🦷", label: "Odonto", desc: "Odontologia e saúde bucal" },
  { valor: "NUTRICIONAL", emoji: "🥗", label: "Nutrição", desc: "Avaliação nutricional" },
  { valor: "PSICOLOGICO", emoji: "🧠", label: "Psicologia", desc: "Saúde mental e terapia" },
  { valor: "ESTETICO", emoji: "💆", label: "Estético", desc: "Procedimentos estéticos" },
];

// ─── Etapa 1 — Busca de paciente ─────────────────────────────────────────────

function EtapaPaciente({
  onSelecionar,
}: {
  onSelecionar: (p: Paciente) => void;
}) {
  const [query, setQuery] = useState("");
  const [sugestoes, setSugestoes] = useState<Paciente[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const buscar = useCallback(async (q: string) => {
    if (!q.trim()) { setSugestoes([]); return; }
    setLoading(true);
    try {
      const res = await fetchWithAuth(`/api/patients?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setSugestoes(Array.isArray(data) ? data.slice(0, 8) : []);
    } catch {
      setSugestoes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => buscar(val), 350);
  }

  const calcIdade = (dob?: string) => {
    if (!dob) return null;
    return Math.floor((Date.now() - new Date(dob).getTime()) / (1000 * 60 * 60 * 24 * 365.25));
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input
          id="novo-pront-busca-paciente"
          type="text"
          value={query}
          onChange={handleChange}
          placeholder="Buscar paciente pelo nome ou telefone..."
          className="w-full pl-10 pr-4 py-3.5 rounded-2xl border border-slate-200 bg-white text-sm text-slate-700 focus:outline-none focus:border-[var(--primary,#4a4ae2)] transition-colors"
          autoFocus
        />
        {loading && (
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
            <svg className="w-4 h-4 animate-spin text-slate-400" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" opacity="0.25" />
              <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
            </svg>
          </div>
        )}
      </div>

      {/* Resultados */}
      {sugestoes.length > 0 && (
        <div className="space-y-1.5">
          {sugestoes.map((p) => {
            const idade = calcIdade(p.dataNascimento);
            return (
              <button
                key={p.id}
                id={`select-paciente-${p.id}`}
                type="button"
                onClick={() => onSelecionar(p)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl border border-slate-100 bg-white hover:border-[var(--primary,#4a4ae2)] hover:bg-[var(--primary-soft,#eeeeff)] transition-all text-left"
              >
                <div className="w-9 h-9 rounded-xl bg-[var(--primary,#4a4ae2)] text-white flex items-center justify-center font-black text-sm shrink-0">
                  {p.nome.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-black text-slate-800 text-sm uppercase tracking-tight truncate">
                    {p.nome}
                  </p>
                  <p className="text-[9px] text-slate-400 font-mono mt-0.5">
                    {p.telefone}
                    {idade !== null ? ` · ${idade} anos` : ""}
                    {p.ultimaVisita
                      ? ` · Última visita: ${new Date(p.ultimaVisita).toLocaleDateString("pt-BR")}`
                      : ""}
                  </p>
                </div>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-4 h-4 text-slate-300 shrink-0">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            );
          })}
        </div>
      )}

      {query.length >= 2 && !loading && sugestoes.length === 0 && (
        <p className="text-center text-[10px] text-slate-400 py-4 font-black uppercase tracking-widest">
          Nenhum paciente encontrado
        </p>
      )}
    </div>
  );
}

// ─── Etapa 2 — Tipo de prontuário ────────────────────────────────────────────

function EtapaTipo({ onSelecionar }: { onSelecionar: (tipo: TipoProntuario) => void }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {TIPOS.map((t) => (
        <button
          key={t.valor}
          id={`tipo-pront-${t.valor.toLowerCase()}`}
          type="button"
          onClick={() => onSelecionar(t.valor)}
          className="flex flex-col items-center gap-2 p-5 rounded-2xl border-2 border-slate-100 bg-white hover:border-[var(--primary,#4a4ae2)] hover:bg-[var(--primary-soft,#eeeeff)] transition-all group"
        >
          <span className="text-3xl">{t.emoji}</span>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-700 group-hover:text-[var(--primary,#4a4ae2)]">
            {t.label}
          </p>
          <p className="text-[8px] text-slate-400 text-center leading-tight">{t.desc}</p>
        </button>
      ))}
    </div>
  );
}

// ─── Etapa 3 — Vincular agendamento ──────────────────────────────────────────

function EtapaAgendamento({
  pacienteId,
  onSelecionar,
  onPular,
}: {
  pacienteId: string;
  onSelecionar: (a: Agendamento) => void;
  onPular: () => void;
}) {
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const hoje = new Date().toISOString().slice(0, 10);
    fetchWithAuth(`/api/appointments?pacienteId=${pacienteId}&data=${hoje}`)
      .then((r) => r.json())
      .then((data) => setAgendamentos(Array.isArray(data) ? data : []))
      .catch(() => setAgendamentos([]))
      .finally(() => setLoading(false));
  }, [pacienteId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <svg className="w-6 h-6 animate-spin text-[var(--primary,#4a4ae2)]" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" opacity="0.25" />
          <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
        </svg>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {agendamentos.length === 0 ? (
        <div className="text-center py-8 space-y-2">
          <p className="text-sm text-slate-400 font-black uppercase tracking-widest">
            Sem agendamentos hoje
          </p>
          <p className="text-[10px] text-slate-300">O prontuário não será vinculado a um agendamento.</p>
        </div>
      ) : (
        agendamentos.map((ag) => (
          <button
            key={ag.id}
            id={`vincular-ag-${ag.id}`}
            type="button"
            onClick={() => onSelecionar(ag)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl border border-slate-100 bg-white hover:border-[var(--primary,#4a4ae2)] hover:bg-[var(--primary-soft,#eeeeff)] transition-all text-left"
          >
            <div className="w-9 h-9 rounded-xl bg-green-50 border border-green-200 flex items-center justify-center shrink-0">
              <span className="text-base">📅</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black text-slate-700">
                {new Date(ag.dataHora).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                {ag.servico ? ` — ${ag.servico.nome}` : ""}
              </p>
              <p className="text-[9px] text-slate-400">{ag.status}</p>
            </div>
          </button>
        ))
      )}

      <button
        id="pular-agendamento-btn"
        type="button"
        onClick={onPular}
        className="w-full py-3 rounded-2xl border-2 border-dashed border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:border-slate-400 hover:text-slate-600 transition-all"
      >
        Pular — sem vínculo com agendamento
      </button>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function NovoProntuarioPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [etapa, setEtapa] = useState<1 | 2 | 3>(1);
  const [paciente, setPaciente] = useState<Paciente | null>(null);
  const [tipo, setTipo] = useState<TipoProntuario | null>(null);

  // Pré-preencher via URL params (atalho da agenda)
  useEffect(() => {
    const pacienteId = searchParams.get("pacienteId");
    const agendamentoId = searchParams.get("agendamentoId");

    if (pacienteId) {
      fetchWithAuth(`/api/prontuario/${pacienteId}`)
        .then((r) => r.json())
        .then((ctx) => {
          if (ctx.paciente) {
            setPaciente(ctx.paciente);
            setEtapa(2); // pula busca
          }
        })
        .catch(() => {});
    }

    if (agendamentoId) {
      // Se tem agendamentoId, pula etapa 3 diretamente para o form
      // (será preenchido no redirect final)
    }
  }, [searchParams]);

  function handleSelecionarPaciente(p: Paciente) {
    setPaciente(p);
    setEtapa(2);
  }

  function handleSelecionarTipo(t: TipoProntuario) {
    setTipo(t);
    setEtapa(3);
  }

  function irParaFormulario(agendamentoId?: string) {
    if (!paciente || !tipo) return;
    const params = new URLSearchParams({
      pacienteId: paciente.id,
      tipo,
    });
    if (agendamentoId) params.set("agendamentoId", agendamentoId);
    router.push(`/dashboard/clinical-records?${params.toString()}`);
  }

  // Labels de etapa
  const ETAPA_LABEL = ["Selecionar Paciente", "Tipo de Prontuário", "Vincular Agendamento"];

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 pb-20 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          id="voltar-novo-pront-btn"
          type="button"
          onClick={() => {
            if (etapa === 1) router.back();
            else setEtapa((prev) => (prev - 1) as 1 | 2 | 3);
          }}
          className="w-9 h-9 rounded-xl border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:border-slate-400 transition-all"
        >
          ←
        </button>
        <div>
          <h1 className="text-xl font-black italic uppercase tracking-tighter text-slate-800">
            Novo Prontuário
          </h1>
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mt-0.5">
            Etapa {etapa} de 3 — {ETAPA_LABEL[etapa - 1]}
          </p>
        </div>
      </div>

      {/* Barra de progresso */}
      <div className="flex gap-1.5">
        {[1, 2, 3].map((e) => (
          <div
            key={e}
            className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
              e <= etapa ? "bg-[var(--primary,#4a4ae2)]" : "bg-slate-100"
            }`}
          />
        ))}
      </div>

      {/* Paciente selecionado (badge) */}
      {paciente && etapa > 1 && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--primary-soft,#eeeeff)] border border-[var(--primary,#4a4ae2)]/20">
          <div className="w-6 h-6 rounded-lg bg-[var(--primary,#4a4ae2)] text-white flex items-center justify-center text-xs font-black shrink-0">
            {paciente.nome.charAt(0)}
          </div>
          <p className="text-[10px] font-black text-[var(--primary,#4a4ae2)] uppercase tracking-tight truncate">
            {paciente.nome}
          </p>
        </div>
      )}

      {/* Conteúdo por etapa */}
      <div className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm">
        {etapa === 1 && (
          <EtapaPaciente onSelecionar={handleSelecionarPaciente} />
        )}
        {etapa === 2 && (
          <EtapaTipo onSelecionar={handleSelecionarTipo} />
        )}
        {etapa === 3 && paciente && (
          <EtapaAgendamento
            pacienteId={paciente.id}
            onSelecionar={(ag) => irParaFormulario(ag.id)}
            onPular={() => irParaFormulario()}
          />
        )}
      </div>
    </div>
  );
}
