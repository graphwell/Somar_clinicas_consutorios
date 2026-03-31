"use client";
import React from "react";

interface AvisoIAProps {
  nivel: "baixo" | "medio" | "alto";
  mensagem: string;
  className?: string;
}

const CONFIG = {
  baixo: {
    bg: "bg-blue-50",
    border: "border-blue-200",
    icon: "ℹ️",
    label: "IA",
    labelBg: "bg-blue-100",
    labelText: "text-blue-600",
    textColor: "text-blue-700",
  },
  medio: {
    bg: "bg-amber-50",
    border: "border-amber-200",
    icon: "⚠️",
    label: "Revisar",
    labelBg: "bg-amber-100",
    labelText: "text-amber-700",
    textColor: "text-amber-800",
  },
  alto: {
    bg: "bg-red-50",
    border: "border-red-200",
    icon: "🔴",
    label: "Atenção",
    labelBg: "bg-red-100",
    labelText: "text-red-700",
    textColor: "text-red-800",
  },
} as const;

export default function AvisoIA({ nivel, mensagem, className = "" }: AvisoIAProps) {
  const c = CONFIG[nivel];

  return (
    <div
      className={[
        "flex items-start gap-2 px-3 py-2 rounded-xl border",
        c.bg,
        c.border,
        className,
      ].join(" ")}
      role="alert"
      aria-live="polite"
    >
      <span className="shrink-0 text-sm leading-none mt-0.5">{c.icon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span
            className={[
              "text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full shrink-0",
              c.labelBg,
              c.labelText,
            ].join(" ")}
          >
            Gerado por IA · {c.label}
          </span>
        </div>
        <p className={["text-[11px] leading-relaxed mt-0.5", c.textColor].join(" ")}>
          {mensagem}
        </p>
      </div>
    </div>
  );
}
