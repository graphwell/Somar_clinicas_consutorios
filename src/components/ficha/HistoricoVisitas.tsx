"use client";
import React from "react";

type Visita = {
  id: string;
  servicoNome: string;
  profissionalNome?: string | null;
  valor?: number | null;
  observacoes?: string | null;
  satisfacao?: number | null;
  fotosIds: string[];
  createdAt: string;
};

interface HistoricoVisitasProps {
  visitas: Visita[];
}

function fmtData(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    timeZone: "America/Fortaleza",
  });
}

function Estrelas({ n }: { n: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <svg key={i} width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path
            d="M5 1l1.2 2.4L9 3.9 7 5.8l.5 2.7L5 7.2 2.5 8.5 3 5.8 1 3.9l2.8-.5L5 1z"
            fill={i <= n ? "#C4973A" : "#EEE9DF"}
          />
        </svg>
      ))}
    </div>
  );
}

export function HistoricoVisitas({ visitas }: HistoricoVisitasProps) {
  if (visitas.length === 0) {
    return (
      <div className="bg-slate-50 border border-card-border rounded-2xl py-10 text-center">
        <p className="text-text-placeholder text-xs font-black uppercase tracking-widest">
          Nenhuma visita registrada
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {visitas.map((v, idx) => (
        <div key={v.id} className="flex gap-3">
          {/* Timeline dot */}
          <div className="flex flex-col items-center pt-1 flex-shrink-0">
            <div className="w-2.5 h-2.5 rounded-full bg-primary/60 flex-shrink-0" />
            {idx < visitas.length - 1 && (
              <div className="w-px flex-1 bg-card-border mt-1" />
            )}
          </div>

          {/* Conteúdo */}
          <div className={`flex-1 pb-5 ${idx < visitas.length - 1 ? "" : ""}`}>
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <p className="text-[10px] text-text-placeholder font-medium">{fmtData(v.createdAt)}</p>
              {v.satisfacao && <Estrelas n={v.satisfacao} />}
            </div>
            <p className="text-sm font-black text-text-main mt-0.5">{v.servicoNome}</p>
            {(v.profissionalNome || v.valor) && (
              <p className="text-[10px] text-text-muted mt-0.5">
                {v.profissionalNome}
                {v.profissionalNome && v.valor ? " · " : ""}
                {v.valor ? `R$ ${v.valor.toFixed(2)}` : ""}
              </p>
            )}
            {v.observacoes && (
              <p className="text-[10px] text-text-muted italic mt-1 bg-slate-50 rounded-lg px-2 py-1 border border-card-border">
                "{v.observacoes}"
              </p>
            )}
            {v.fotosIds.length > 0 && (
              <p className="text-[9px] text-primary font-black mt-1">
                {v.fotosIds.length} foto{v.fotosIds.length > 1 ? "s" : ""} →
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
