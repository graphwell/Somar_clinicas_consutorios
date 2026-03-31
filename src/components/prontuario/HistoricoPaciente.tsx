"use client";
import React, { useState, useEffect, useCallback } from "react";
import { fetchWithAuth } from "@/lib/api-utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Evolucao {
  id: string;
  createdAt: string;
  tipo: string;
  queixaPrincipal?: string;
  hipoteseDiagnostica?: string;
  cidCodigo?: string;
  conduta?: string;
  profissional?: { id: string; nome: string };
  pressaoSistolica?: number;
  peso?: number;
  imc?: number;
}

interface Metricas {
  vitais: { createdAt: string; pressaoSistolica?: number }[];
  medidas: { createdAt: string; peso?: number; imc?: number }[];
}

interface Paciente {
  id: string;
  nome: string;
  dataNascimento?: string;
  telefone: string;
  createdAt?: string;
}

interface Alergia {
  id: string;
  descricao: string;
  gravidade: string;
}

interface Medicamento {
  id: string;
  nome: string;
  dosagem?: string;
  ativo: boolean;
}

interface HistoricoPacienteProps {
  pacienteId: string;
  pacienteNome: string;
  onFechar: () => void;
}

// ─── Sparkline SVG puro ───────────────────────────────────────────────────────

function Sparkline({
  values,
  color = "#4a4ae2",
  width = 80,
  height = 28,
}: {
  values: number[];
  color?: string;
  width?: number;
  height?: number;
}) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const pts = values.map((v, i) => ({
    x: (i / (values.length - 1)) * width,
    y: height - 4 - ((v - min) / range) * (height - 8),
  }));
  const d = pts
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(" ");
  const last = pts[pts.length - 1];
  return (
    <svg width={width} height={height} className="overflow-visible">
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.7"
      />
      <circle cx={last.x} cy={last.y} r="2.5" fill={color} />
    </svg>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function HistoricoPaciente({
  pacienteId,
  pacienteNome,
  onFechar,
}: HistoricoPacienteProps) {
  const [evolucoes, setEvolucoes] = useState<Evolucao[]>([]);
  const [metricas, setMetricas] = useState<Metricas | null>(null);
  const [alergias, setAlergias] = useState<Alergia[]>([]);
  const [medicamentos, setMedicamentos] = useState<Medicamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [paciente, setPaciente] = useState<Paciente | null>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const [ctxRes, evRes, metRes] = await Promise.all([
        fetchWithAuth(`/api/prontuario/${pacienteId}`),
        fetchWithAuth(`/api/prontuario/${pacienteId}/evolucoes`),
        fetchWithAuth(`/api/prontuario/${pacienteId}/metricas`),
      ]);
      const [ctx, evs, met] = await Promise.all([ctxRes.json(), evRes.json(), metRes.json()]);

      if (ctx.paciente) setPaciente(ctx.paciente);
      if (ctx.alergias) setAlergias(ctx.alergias);
      if (ctx.medicamentos) setMedicamentos(ctx.medicamentos);
      if (Array.isArray(evs)) setEvolucoes(evs);
      if (met?.vitais) setMetricas(met);
    } catch {
      // silencioso
    } finally {
      setLoading(false);
    }
  }, [pacienteId]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  // Calcular idade
  const idade = paciente?.dataNascimento
    ? Math.floor(
        (Date.now() - new Date(paciente.dataNascimento).getTime()) /
          (1000 * 60 * 60 * 24 * 365.25),
      )
    : null;

  // Tempo como paciente
  const tempoComoPaciente = paciente?.createdAt
    ? Math.floor(
        (Date.now() - new Date(paciente.createdAt).getTime()) / (1000 * 60 * 60 * 24 * 30),
      )
    : null;

  // Dados para gráficos
  const pesos = (metricas?.medidas ?? []).filter((m) => m.peso).map((m) => m.peso!);
  const sistolicas = (metricas?.vitais ?? [])
    .filter((v) => v.pressaoSistolica)
    .map((v) => v.pressaoSistolica!);
  const imcs = (metricas?.medidas ?? []).filter((m) => m.imc).map((m) => m.imc!);

  // Alergias graves
  const alergiasGraves = alergias.filter((a) => a.gravidade === "GRAVE");
  const medicamentosAtivos = medicamentos.filter((m) => m.ativo);

  // Badge de gravidade de alergia
  const gravidadeColor: Record<string, string> = {
    GRAVE: "bg-red-100 text-red-700 border-red-200",
    MODERADA: "bg-amber-50 text-amber-700 border-amber-200",
    LEVE: "bg-green-50 text-green-700 border-green-200",
  };

  // Tipo badge color
  const tipoBadge: Record<string, string> = {
    CLINICO: "bg-blue-100 text-blue-700",
    ODONTOLOGICO: "bg-purple-100 text-purple-700",
    NUTRICIONAL: "bg-green-100 text-green-700",
    PSICOLOGICO: "bg-pink-100 text-pink-700",
    ESTETICO: "bg-orange-100 text-orange-700",
    ADENDO: "bg-slate-100 text-slate-600",
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-50"
        onClick={onFechar}
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white border-l border-slate-100 shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 shrink-0">
          <div className="flex items-start justify-between gap-3">
            {/* Avatar + info */}
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-[var(--primary,#4a4ae2)] text-white flex items-center justify-center text-lg font-black shrink-0">
                {pacienteNome.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-black text-slate-800 text-sm uppercase tracking-tight">
                  {pacienteNome}
                </p>
                <div className="flex items-center gap-2 flex-wrap mt-0.5">
                  {idade !== null && (
                    <span className="text-[9px] text-slate-400 font-black">{idade} anos</span>
                  )}
                  {tempoComoPaciente !== null && (
                    <span className="text-[9px] text-slate-400">
                      · Paciente há {tempoComoPaciente}m
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button
              id="historico-fechar-btn"
              type="button"
              onClick={onFechar}
              className="w-8 h-8 rounded-xl hover:bg-slate-50 flex items-center justify-center text-slate-400 font-black shrink-0 transition-colors"
            >
              ✕
            </button>
          </div>

          {/* Badges alergias e medicamentos */}
          <div className="flex flex-wrap gap-1.5 mt-3">
            {alergiasGraves.length > 0 && (
              <span className="text-[9px] px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200 font-black">
                ⚠️ {alergiasGraves.length} alergia(s) grave(s)
              </span>
            )}
            {medicamentosAtivos.length > 0 && (
              <span className="text-[9px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-black">
                💊 {medicamentosAtivos.length} medicamento(s) contínuo(s)
              </span>
            )}
            {alergias.length === 0 && medicamentosAtivos.length === 0 && (
              <span className="text-[9px] text-slate-300 font-black">Sem alertas registrados</span>
            )}
          </div>
        </div>

        {/* Scroll area */}
        <div className="flex-1 overflow-y-auto no-scrollbar">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <svg className="w-6 h-6 animate-spin text-[var(--primary,#4a4ae2)]" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" opacity="0.25" />
                <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
              </svg>
            </div>
          ) : (
            <div className="p-4 space-y-4 pb-8">
              {/* Gráficos de evolução */}
              {(pesos.length >= 2 || sistolicas.length >= 2 || imcs.length >= 2) && (
                <div className="bg-white border border-slate-100 rounded-2xl p-4 space-y-3">
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                    Evolução Clínica
                  </p>
                  {pesos.length >= 2 && (
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[9px] font-black text-slate-500 uppercase">Peso</p>
                        <p className="text-sm font-black text-slate-700">
                          {pesos[pesos.length - 1]} kg
                        </p>
                      </div>
                      <Sparkline values={pesos} color="#4a4ae2" />
                    </div>
                  )}
                  {sistolicas.length >= 2 && (
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[9px] font-black text-slate-500 uppercase">PA Sistólica</p>
                        <p
                          className={`text-sm font-black ${
                            sistolicas[sistolicas.length - 1] > 140
                              ? "text-red-600"
                              : "text-slate-700"
                          }`}
                        >
                          {sistolicas[sistolicas.length - 1]} mmHg
                        </p>
                      </div>
                      <Sparkline
                        values={sistolicas}
                        color={sistolicas[sistolicas.length - 1] > 140 ? "#dc2626" : "#4a4ae2"}
                      />
                    </div>
                  )}
                  {imcs.length >= 2 && (
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[9px] font-black text-slate-500 uppercase">IMC</p>
                        <p
                          className={`text-sm font-black ${
                            imcs[imcs.length - 1] > 30
                              ? "text-amber-600"
                              : "text-slate-700"
                          }`}
                        >
                          {imcs[imcs.length - 1].toFixed(1)}
                        </p>
                      </div>
                      <Sparkline
                        values={imcs}
                        color={imcs[imcs.length - 1] > 30 ? "#d97706" : "#059669"}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Alertas consolidados */}
              {(alergias.length > 0 || medicamentosAtivos.length > 0) && (
                <div className="space-y-2">
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                    Alertas Clínicos
                  </p>
                  {alergias.map((a) => (
                    <div
                      key={a.id}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${
                        gravidadeColor[a.gravidade] || gravidadeColor.MODERADA
                      }`}
                    >
                      <span className="text-[9px] font-black">{a.gravidade === "GRAVE" ? "🔴" : a.gravidade === "MODERADA" ? "🟠" : "🟡"}</span>
                      <p className="text-[10px] font-black">{a.descricao}</p>
                      <span className="text-[8px] ml-auto opacity-60">{a.gravidade.toLowerCase()}</span>
                    </div>
                  ))}
                  {medicamentosAtivos.map((m) => (
                    <div
                      key={m.id}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl border bg-blue-50 border-blue-200"
                    >
                      <span className="text-[9px]">💊</span>
                      <p className="text-[10px] font-black text-blue-700">
                        {m.nome}
                        {m.dosagem ? ` — ${m.dosagem}` : ""}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* Timeline de consultas */}
              <div className="space-y-2">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                  Histórico de Consultas ({evolucoes.length})
                </p>

                {evolucoes.length === 0 && (
                  <p className="text-[9px] text-slate-300 text-center py-8 font-black uppercase opacity-50">
                    Sem consultas anteriores
                  </p>
                )}

                {evolucoes.map((ev) => {
                  const expanded = expandedId === ev.id;
                  return (
                    <div
                      key={ev.id}
                      className="border border-slate-100 rounded-2xl bg-white overflow-hidden"
                    >
                      <button
                        id={`historico-ev-${ev.id}`}
                        type="button"
                        onClick={() => setExpandedId(expanded ? null : ev.id)}
                        className="w-full px-4 py-3 text-left hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-[9px] text-slate-400 font-black">
                                {new Date(ev.createdAt).toLocaleDateString("pt-BR", {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                })}
                              </p>
                              {ev.tipo && (
                                <span
                                  className={`text-[8px] px-1.5 py-0.5 rounded-full font-black ${
                                    tipoBadge[ev.tipo] || "bg-slate-100 text-slate-600"
                                  }`}
                                >
                                  {ev.tipo}
                                </span>
                              )}
                            </div>
                            {ev.profissional && (
                              <p className="text-[9px] text-slate-400 mt-0.5">
                                {ev.profissional.nome}
                              </p>
                            )}
                            {ev.queixaPrincipal && (
                              <p className="text-[10px] font-black text-slate-700 mt-1 line-clamp-2">
                                {ev.queixaPrincipal}
                              </p>
                            )}
                          </div>
                          <div className="shrink-0 flex flex-col items-end gap-1">
                            {ev.cidCodigo && (
                              <span className="text-[8px] font-black px-1.5 py-0.5 bg-[var(--primary-soft,#eeeeff)] text-[var(--primary,#4a4ae2)] rounded-lg font-mono border border-[var(--primary,#4a4ae2)]/10">
                                {ev.cidCodigo}
                              </span>
                            )}
                            <span className="text-[8px] text-slate-300">{expanded ? "▲" : "▼"}</span>
                          </div>
                        </div>
                      </button>

                      {expanded && (
                        <div className="px-4 pb-3 border-t border-slate-50 space-y-2 animate-in slide-in-from-top-1 duration-200">
                          {ev.hipoteseDiagnostica && (
                            <div className="pt-2">
                              <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">
                                Hipótese Diagnóstica
                              </p>
                              <p className="text-[10px] text-slate-700 mt-0.5 leading-relaxed">
                                {ev.hipoteseDiagnostica}
                              </p>
                            </div>
                          )}
                          {ev.conduta && (
                            <div>
                              <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">
                                Conduta
                              </p>
                              <p className="text-[10px] text-slate-700 mt-0.5 leading-relaxed">
                                {ev.conduta}
                              </p>
                            </div>
                          )}
                          {ev.pressaoSistolica && (
                            <span className="inline-block text-[8px] font-black bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                              PA: {ev.pressaoSistolica} mmHg
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
