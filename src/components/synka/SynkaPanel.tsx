"use client";
import React, { useState, useEffect } from "react";
import { fetchWithAuth } from "@/lib/api-utils";
import { ProfissionalComAgenda } from "@/components/agenda/AgendaConsolidada";
import Card from "@/components/ui/Card";
import { SkeletonLines } from "@/components/ui/Skeleton";
import Link from "next/link";

interface Insight {
  tipo: string;
  mensagem: string;
  acao?: string;
  rotaAcao?: string;
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

    fetchWithAuth("/api/chat", {
      method: "POST",
      body: JSON.stringify({
        message: `Analise a agenda de hoje e me dê exatamente 3 insights acionáveis em português brasileiro. Cada insight deve ter no máximo 2 linhas. Retorne SOMENTE um array JSON válido com objetos {tipo, mensagem, acao, rotaAcao}. Exemplo: [{"tipo":"aviso","mensagem":"3 confirmações pendentes","acao":"Ver pendentes","rotaAcao":"/dashboard"}]. NÃO inclua texto fora do JSON.`,
        contexto,
      }),
    })
      .then((r) => r.json())
      .then((d) => {
        const content = d.response || d.message || d.content || "";
        const match = content.match(/\[[\s\S]*\]/);
        if (match) {
          const parsed = JSON.parse(match[0]);
          setInsights(Array.isArray(parsed) ? parsed.slice(0, 3) : []);
        } else {
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

  const insightIcons: Record<string, string> = {
    aviso: "⚠️",
    sugestao: "💡",
    info: "ℹ️",
    alerta: "🔔",
    default: "💡",
  };

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
            className="w-8 h-8 rounded-xl flex items-center justify-center text-sm shrink-0"
            style={{ background: "linear-gradient(135deg,#40916C,#52B788)" }}
          >
            🤖
          </div>
          <div className="text-left">
            <p className="text-sm font-medium text-slate-700">Synka IA</p>
            {loading ? (
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-sage-500 pulse-dot" />
                <span className="text-[10px] text-slate-100">Analisando…</span>
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
                    <span className="text-sm shrink-0">
                      {insightIcons[ins.tipo] || insightIcons.default}
                    </span>
                    <p className="text-[12px] text-slate-700 leading-relaxed flex-1">
                      {ins.mensagem}
                    </p>
                  </div>
                  {ins.acao && ins.rotaAcao && (
                    <Link
                      href={ins.rotaAcao}
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
              {lembreteLoading ? "Enviando…" : "📲 Enviar lembretes pendentes"}
            </button>
            {lembreteMsg && (
              <p className="text-[11px] text-center text-slate-100">{lembreteMsg}</p>
            )}
            <Link
              href="/dashboard/marketing"
              className="flex items-center justify-center h-9 rounded-lg border border-warm-300 text-slate-300 text-[12px] hover:bg-warm-200 transition-colors"
            >
              📅 Ver aniversariantes
            </Link>
          </div>
        </div>
      )}
    </Card>
  );
}
