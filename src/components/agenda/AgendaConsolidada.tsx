"use client";
import React, { useState, useEffect, useRef } from "react";
import Avatar from "@/components/ui/Avatar";
import Badge from "@/components/ui/Badge";
import { SkeletonCard } from "@/components/ui/Skeleton";

/* ─── Tipos ─────────────────────────────────────────────── */
export interface AgendamentoItem {
  id: string;
  pacienteNome: string;
  pacienteTelefone: string | null;
  dataHora: string;
  fimDataHora: string;
  durationMinutes: number;
  status: string;
  servico: { nome: string; color: string | null; bufferTimeMinutes?: number } | null;
  convenio: string | null;
  observacoes: string | null;
}

export type TipoSlot = 'livre' | 'ocupado' | 'almoco' | 'folga' | 'fechado' | 'buffer';

export interface SlotOutput {
  horario: string;
  horarioFim: string;
  tipo: TipoSlot;
  agendamento: AgendamentoItem | null;
  clicavel: boolean;
}

export interface ProfissionalComAgenda {
  id: string;
  nome: string;
  especialidade: string | null;
  color: string;
  fotoUrl: string | null;
  horarioInicio: string;
  horarioFim: string;
  lunchStart: string | null;
  lunchEnd: string | null;
  trabalhaNoDia: boolean;
  agendamentos: AgendamentoItem[];
  slots: SlotOutput[];
  slotsOcupados: number;
  slotsLivres: number;
}

interface Props {
  data: Date;
  profissionais: ProfissionalComAgenda[];
  loading: boolean;
  role: string;
  profissionalId?: string | null;
  onDataChange: (d: Date) => void;
  onSlotClick: (profissionalId: string, horario: string) => void;
  onAgendamentoClick: (ag: AgendamentoItem, profissional: ProfissionalComAgenda) => void;
  onNovoAgendamento: () => void;
}

/* ─── Cores por status ──────────────────────────────────── */
const COR_STATUS: Record<string, { bg: string; border: string; text: string; label: string }> = {
  pendente:       { bg: '#FEF3C7', border: '#F59E0B', text: '#92400E', label: 'Pendente' },
  confirmado:     { bg: '#D1FAE5', border: '#10B981', text: '#065F46', label: 'Confirmado' },
  em_atendimento: { bg: '#DBEAFE', border: '#3B82F6', text: '#1E40AF', label: 'Em atendimento' },
  concluido:      { bg: '#F3F4F6', border: '#9CA3AF', text: '#374151', label: 'Concluído' },
  done:           { bg: '#F3F4F6', border: '#9CA3AF', text: '#374151', label: 'Concluído' },
  cancelado:      { bg: '#FEE2E2', border: '#EF4444', text: '#991B1B', label: 'Cancelado' },
};
// Mantido para retrocompatibilidade com Badge em outros locais
const statusVariant: Record<string, "success" | "warning" | "danger" | "neutral"> = {
  confirmado: "success",
  pendente:   "warning",
  cancelado:  "danger",
  concluido:  "neutral",
  done:       "neutral",
};
const statusLabel: Record<string, string> = {
  confirmado:     "Confirmado",
  pendente:       "Pendente",
  cancelado:      "Cancelado",
  concluido:      "Concluído",
  done:           "Concluído",
  em_atendimento: "Em atendimento",
};

/* ─── Helpers de tempo ──────────────────────────────────── */
function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}
function formatTime(iso: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'America/Fortaleza',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(iso));
}
function formatDateHeader(d: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Fortaleza',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(d);
}
function addDays(d: Date, n: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
}
function isToday(d: Date): boolean {
  const fmt = (x: Date) =>
    new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Fortaleza' }).format(x);
  return fmt(d) === fmt(new Date());
}
function nowLocalHHMM(): string {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'America/Fortaleza',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  return formatter.format(new Date());
}

/* ─── CardAgendamento ───────────────────────────────────── */
function CardAgendamento({
  ag,
  prof,
  onClick,
}: {
  ag: AgendamentoItem;
  prof: ProfissionalComAgenda;
  onClick: () => void;
}) {
  const barColor = ag.servico?.color || prof.color;
  const cor = COR_STATUS[ag.status] ?? COR_STATUS['concluido'];

  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-lg shadow-card hover:shadow-card-hover transition-all duration-150 hover:-translate-y-px overflow-hidden relative"
      style={{ minHeight: 56, background: cor.bg, border: `1px solid ${cor.border}` }}
    >
      <div
        className="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg"
        style={{ background: barColor }}
      />
      <div className="pl-3 pr-2 py-2">
        <div className="flex items-start justify-between gap-1">
          <p className="text-[12px] font-medium text-slate-700 truncate">
            {ag.pacienteNome}
          </p>
          <span
            className="shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-full"
            style={{ color: cor.text, background: `${cor.border}22` }}
          >
            {cor.label}
          </span>
        </div>
        <div className="flex items-center gap-1 mt-0.5 min-w-0">
          <span className="text-[11px] text-slate-100 shrink-0">
            {formatTime(ag.dataHora)}
          </span>
          {ag.servico && (
            <span className="text-[11px] text-slate-100 truncate">
              · {ag.servico.nome}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

/* ─── ColunaProfissional ─────────────────────────────────── */
function ColunaProfissional({
  prof,
  isToday: today,
  onSlotClick,
  onAgendamentoClick,
}: {
  prof: ProfissionalComAgenda;
  isToday: boolean;
  onSlotClick: (horario: string) => void;
  onAgendamentoClick: (ag: AgendamentoItem) => void;
}) {
  const nowStr = today ? nowLocalHHMM() : null;

  return (
    <div className="flex-1 min-w-[160px]">
      {/* Header */}
      <div className="px-2 pb-3">
        <div className="flex items-center gap-2">
          <Avatar nome={prof.nome} src={prof.fotoUrl} size="md" color={prof.color} />
          <div className="overflow-hidden">
            <p className="text-[12px] font-medium text-slate-700 truncate">{prof.nome}</p>
            {prof.especialidade && (
              <p className="text-[10px] text-slate-100 truncate">{prof.especialidade}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 mt-2">
          <span className="text-[10px] text-slate-100">
            {prof.slotsOcupados} agend.
          </span>
          {prof.slotsLivres > 0 && (
            <span className="text-[10px] text-sage-500">
              · {prof.slotsLivres} livres
            </span>
          )}
        </div>
      </div>

      {/* Slots */}
      {!prof.trabalhaNoDia ? (
        <div className="mx-2 rounded-lg bg-warm-200 border border-warm-300 flex items-center justify-center py-8">
          <p className="text-[11px] text-slate-100">Folga</p>
        </div>
      ) : (
        <div className="space-y-1 px-1">
          {prof.slots.map((slot) => {
            const isNowSlot =
              today && nowStr
                ? toMinutes(slot.horario) <= toMinutes(nowStr) &&
                  toMinutes(slot.horario) + 30 > toMinutes(nowStr)
                : false;

            return (
              <div key={slot.horario} className="relative">
                {isNowSlot && (
                  <div className="absolute inset-x-0 top-0 h-0.5 bg-red-500 z-10 rounded-full" />
                )}
                {/* Buffer: invisível — ocupa espaço mas sem cor ou label */}
                {slot.tipo === 'buffer' ? (
                  <div style={{
                    height: 32,
                    background: 'transparent',
                    borderTop: '1px dashed #EEE9DF',
                    cursor: 'default',
                    pointerEvents: 'none',
                  }} />
                ) : (
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-slate-100 w-9 shrink-0 text-right truncate">
                    {slot.horario}
                  </span>
                  <div className="flex-1 min-w-0">
                    {slot.tipo === 'ocupado' && slot.agendamento ? (
                      <CardAgendamento
                        ag={slot.agendamento}
                        prof={prof}
                        onClick={() => onAgendamentoClick(slot.agendamento!)}
                      />
                    ) : slot.tipo === 'ocupado' ? (
                      /* Continuação de agendamento — bloco colorido */
                      <div
                        className="h-8 rounded-lg opacity-40 w-full"
                        style={{ background: prof.color }}
                      />
                    ) : slot.tipo === 'almoco' ? (
                      <div className="h-8 rounded-lg bg-warm-200 flex items-center justify-center w-full">
                        <span className="text-[10px] text-slate-100 truncate">Almoço</span>
                      </div>
                    ) : slot.tipo === 'fechado' ? (
                      <div className="h-8 rounded-lg bg-warm-100 opacity-50 w-full" />
                    ) : slot.tipo === 'folga' ? (
                      <div className="h-8 rounded-lg bg-warm-200 opacity-60 w-full" />
                    ) : (
                      /* livre */
                      <button
                        onClick={() => onSlotClick(slot.horario)}
                        className="w-full h-8 rounded-lg border border-dashed border-warm-300 text-slate-100 text-[11px] hover:border-sage-400 hover:bg-sage-50 hover:text-sage-600 transition-all truncate"
                      >
                        +
                      </button>
                    )}
                  </div>
                </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─── Componente principal ───────────────────────────────── */
export default function AgendaConsolidada({
  data,
  profissionais,
  loading,
  role,
  profissionalId,
  onDataChange,
  onSlotClick,
  onAgendamentoClick,
  onNovoAgendamento,
}: Props) {
  const isProfissional = role === "profissional";
  const [selectedProfIdx, setSelectedProfIdx] = useState(0);
  const inputDataRef = useRef<HTMLInputElement>(null);

  const profsVisiveis = isProfissional
    ? profissionais.filter((p) => p.id === profissionalId)
    : profissionais;

  const today = isToday(data);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ── Header: navegação de data + botão Novo ── */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 bg-white border border-warm-300 rounded-xl px-2 py-1.5">
          {/* Seta esquerda */}
          <button
            onClick={() => onDataChange(addDays(data, -1))}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-warm-200 hover:text-slate-700 transition-colors text-sm"
          >
            ←
          </button>

          {/* Data clicável — abre o picker via showPicker() */}
          <div className="relative">
            <button
              onClick={() => {
                const el = inputDataRef.current;
                if (!el) return;
                if (typeof (el as any).showPicker === 'function') {
                  (el as any).showPicker();
                } else {
                  el.click();
                }
              }}
              className="px-2 py-0.5 text-[14px] font-semibold text-slate-700 capitalize rounded-lg hover:bg-warm-100 transition-colors whitespace-nowrap"
            >
              {formatDateHeader(data)}
            </button>
            <input
              ref={inputDataRef}
              type="date"
              value={new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Fortaleza' }).format(data)}
              onChange={(e) => {
                if (!e.target.value) return;
                const [ano, mes, dia] = e.target.value.split('-').map(Number);
                onDataChange(new Date(Date.UTC(ano, mes - 1, dia, 12, 0, 0)));
              }}
              className="absolute opacity-0 pointer-events-none w-0 h-0 top-0 left-0"
            />
          </div>

          {/* Seta direita */}
          <button
            onClick={() => onDataChange(addDays(data, 1))}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-warm-200 hover:text-slate-700 transition-colors text-sm"
          >
            →
          </button>

          {/* Botão Hoje — só aparece quando não é hoje */}
          {!today && (
            <button
              onClick={() => onDataChange(new Date())}
              className="px-2.5 py-1 rounded-lg bg-sage-50 text-sage-600 text-[11px] font-semibold hover:bg-sage-100 transition-colors border border-sage-100 whitespace-nowrap"
            >
              Hoje
            </button>
          )}
        </div>

        <button
          onClick={onNovoAgendamento}
          className="flex items-center gap-1.5 h-9 px-4 rounded-lg bg-sage-500 text-white text-[13px] font-medium hover:bg-sage-700 transition-colors shadow-sage"
        >
          <span>+</span> Novo agendamento
        </button>
      </div>

      {/* ── Seletor mobile de profissional ── */}
      {profsVisiveis.length > 1 && (
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 md:hidden">
          {profsVisiveis.map((prof, idx) => (
            <button
              key={prof.id}
              onClick={() => setSelectedProfIdx(idx)}
              className={[
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full shrink-0 text-[12px] border transition-all",
                idx === selectedProfIdx
                  ? "bg-sage-500 text-white border-sage-500"
                  : "bg-white text-slate-300 border-warm-300",
              ].join(" ")}
            >
              <Avatar nome={prof.nome} size="sm" color={prof.color} />
              {prof.nome.split(" ")[0]}
            </button>
          ))}
        </div>
      )}

      {/* ── Colunas ── */}
      {profsVisiveis.length === 0 ? (
        <div className="bg-white border border-warm-200 rounded-xl p-8 text-center">
          <p className="text-slate-100 text-sm">
            Nenhum profissional ativo encontrado.
          </p>
        </div>
      ) : (
        <>
          {/* Desktop */}
          <div className="hidden md:flex gap-4 overflow-x-auto no-scrollbar">
            {profsVisiveis.map((prof) => (
              <ColunaProfissional
                key={prof.id}
                prof={prof}
                isToday={today}
                onSlotClick={(h) => onSlotClick(prof.id, h)}
                onAgendamentoClick={(ag) => onAgendamentoClick(ag, prof)}
              />
            ))}
          </div>

          {/* Mobile */}
          <div className="md:hidden">
            {profsVisiveis[selectedProfIdx] && (
              <ColunaProfissional
                prof={profsVisiveis[selectedProfIdx]}
                isToday={today}
                onSlotClick={(h) =>
                  onSlotClick(profsVisiveis[selectedProfIdx].id, h)
                }
                onAgendamentoClick={(ag) =>
                  onAgendamentoClick(ag, profsVisiveis[selectedProfIdx])
                }
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}
