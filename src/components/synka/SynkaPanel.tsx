"use client";
import React, { useState, useEffect } from "react";
import { fetchWithAuth } from "@/lib/api-utils";
import { ProfissionalComAgenda } from "@/components/agenda/AgendaConsolidada";
import Card from "@/components/ui/Card";
import { SkeletonLines } from "@/components/ui/Skeleton";
import Link from "next/link";

interface Insight {
  icone: string;
  mensagem: string;
  acao: string;
  rota: string;
}

interface Props {
  profissionais: ProfissionalComAgenda[];
  data: Date;
  collapsed?: boolean;
}

export default function SynkaPanel({ profissionais, data, collapsed = false }: Props) {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [isOpen, setIsOpen] = useState(!collapsed);
  const [lembreteLoading, setLembreteLoading] = useState(false);
  const [lembreteMsg, setLembreteMsg] = useState("");

  const totalAgendamentos = profissionais.reduce(
    (s, p) => s + p.agendamentos.length, 0
  );
  const totalLivres = profissionais.reduce((s, p) => s + p.slotsLivres, 0);
  const pendentes = profissionais
    .flatMap((p) => p.agendamentos)
    .filter((a) => a.status === "pendente").length;
  const taxaOcupacao =
    totalAgendamentos + totalLivres > 0
      ? Math.round((totalAgendamentos / (totalAgendamentos + totalLivres)) * 100)
      : 0;

  useEffect(() => {
    if (!isOpen || profissionais.length === 0) return;
    setLoading(true);
    setError(false);

    const contexto = {
      data: data.toLocaleDateString("pt-BR"),
      totalAgendamentos,
      totalLivres,
      pendentes,
      taxaOcupacao,
      profissionais: profissionais.map((p) => ({
        nome: p.nome,
        agendamentos: p.agendamentos.length,
        livres: p.slotsLivres,
      })),
    };

    const totalProfissionais = profissionais.length;
    const slotsLivres = totalLivres;

    fetchWithAuth("/api/chat", {
      method: "POST",
      body: JSON.stringify({
        message: `Analise os dados da clínica hoje e retorne EXATAMENTE um JSON válido com este formato, sem markdown:\n{"insights":[{"icone":"📅","mensagem":"texto curto do insight","acao":"texto do botão","rota":"/dashboard/rota"}]}\n\nDados de hoje:\n- Agendamentos: ${totalAgendamentos}\n- Slots livres: ${slotsLivres}\n- Taxa ocupação: ${taxaOcupacao}%\n- Profissionais ativos: ${totalProfissionais}\n\nGere 3 insights acionáveis e relevantes em português.\nSe agenda vazia, sugerir criar agendamentos ou campanha.`,
        contexto,
      }),
    })
      .then((r) => r.json())
      .then((d) => {
        const content = d.response || d.message || d.content || "";
        // Tenta parse direto, ou extrai o JSON do texto
        try {
          const match = content.match(/\{[\s\S]*"insights"[\s\S]*\}/);
          const obj = match ? JSON.parse(match[0]) : JSON.parse(content);
          setInsights(Array.isArray(obj.insights) ? obj.insights.slice(0, 3) : []);
        } catch {
          setInsights([]);
        }
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [isOpen, profissionais.length, data.toDateString()]);

  async function enviarLembretes() {
    setLembreteLoading(true);
    setLembreteMsg("");
    try {
      const r = await fetchWithAuth("/api/marketing/agendamentos-pendentes");
      const d = await r.json();
      setLembreteMsg(`${d.total || 0} lembretes agendados para envio.`);
    } catch {
      setLembreteMsg("Erro ao enviar lembretes.");
    } finally {
      setLembreteLoading(false);
    }
  }

  return (
    <Card className="overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 border-b border-warm-200"
      >
        <div className="flex items-center gap-2.5">
          {/* Avatar Synka */}
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-white"
            style={{ background: "linear-gradient(135deg,#40916C,#52B788)" }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <rect x="2" y="5" width="12" height="8" rx="2" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M5 5V4a3 3 0 016 0v1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <circle cx="5.5" cy="9" r="1" fill="currentColor"/>
              <circle cx="10.5" cy="9" r="1" fill="currentColor"/>
              <path d="M6 11.5h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <div className="text-left">
            <p className="text-sm font-medium text-slate-700">Synka IA</p>
            {loading ? (
              <div className="flex items-center gap-1.5">
                <svg className="w-3 h-3 animate-spin text-sage-500" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                <span className="text-[10px] text-slate-100">Synka analisando...</span>
              </div>
            ) : (
              <span className="text-[10px] text-sage-500">
                {insights.length} insights prontos
              </span>
            )}
          </div>
        </div>
        <span className="text-slate-100 text-xs">{isOpen ? "▲" : "▼"}</span>
      </button>

      {isOpen && (
        <div className="p-4 space-y-3">
          {/* Stats rápidos */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Agendados", value: totalAgendamentos, color: "text-slate-700" },
              { label: "Pendentes", value: pendentes, color: pendentes > 0 ? "text-gold-500" : "text-slate-700" },
              { label: "Ocupação", value: `${taxaOcupacao}%`, color: taxaOcupacao > 70 ? "text-sage-500" : "text-slate-700" },
            ].map((s) => (
              <div key={s.label} className="bg-warm-100 rounded-lg px-2 py-2 text-center">
                <p className={`text-base font-medium ${s.color}`}>{s.value}</p>
                <p className="text-[10px] text-slate-100">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Insights */}
          {loading ? (
            <SkeletonLines lines={3} />
          ) : error ? (
            <p className="text-xs text-slate-100 text-center py-2">
              IA temporariamente indisponível
            </p>
          ) : insights.length === 0 ? (
            <p className="text-xs text-slate-100 text-center py-2">
              Sem insights no momento.
            </p>
          ) : (
            <div className="space-y-2">
              {insights.map((ins, i) => (
                <div
                  key={i}
                  className="bg-warm-100 border border-warm-200 rounded-lg p-3"
                >
                  <div className="flex items-start gap-2">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0 mt-0.5 text-sage-500">
                      <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.5"/>
                      <path d="M7 4.5v3M7 9.5h.007" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                    <p className="text-[12px] text-slate-700 leading-relaxed flex-1">
                      {ins.mensagem}
                    </p>
                  </div>
                  {ins.acao && ins.rota && (
                    <Link
                      href={ins.rota}
                      className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-sage-600 hover:text-sage-700 font-medium"
                    >
                      {ins.acao} →
                    </Link>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Ações rápidas */}
          <div className="space-y-2 pt-1">
            <button
              onClick={enviarLembretes}
              disabled={lembreteLoading}
              className="w-full h-9 rounded-lg border border-sage-500/30 text-sage-600 text-[12px] font-medium hover:bg-sage-50 transition-colors disabled:opacity-50"
            >
              {lembreteLoading ? (
                "Enviando…"
              ) : (
                <span className="flex items-center justify-center gap-1.5">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M1 1l10 5-10 5V7.5l7-1.5-7-1.5V1z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Enviar lembretes pendentes
                </span>
              )}
            </button>
            {lembreteMsg && (
              <p className="text-[11px] text-center text-slate-100">{lembreteMsg}</p>
            )}
            <Link
              href="/dashboard/marketing"
              className="flex items-center justify-center h-9 rounded-lg border border-warm-300 text-slate-300 text-[12px] hover:bg-warm-200 transition-colors"
            >
              <span className="flex items-center justify-center gap-1.5">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <rect x="1" y="2" width="10" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
                  <path d="M1 5h10M4 1v2M8 1v2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                </svg>
                Ver aniversariantes
              </span>
            </Link>
          </div>
        </div>
      )}
    </Card>
  );
}
