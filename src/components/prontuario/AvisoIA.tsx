"use client";
import React from "react";

interface AvisoIAProps {
  nivel: "baixo" | "medio" | "alto";
  mensagem: string;
  className?: string;
}

const IcoInfo = () => <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5.833" stroke="currentColor" strokeWidth="1.3"/><path d="M7 5.833v3.334M7 4.667h.008" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>;
const IcoWarn = () => <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1.167L12.833 11.083H1.167L7 1.167z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/><path d="M7 5.833v2.334M7 10h.008" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>;
const IcoAlert = () => <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5.833" stroke="currentColor" strokeWidth="1.3"/><path d="M7 4.083v3.5M7 10.208h.008" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>;

const CONFIG = {
  baixo: {
    bg: "bg-blue-50",
    border: "border-blue-200",
    icon: <IcoInfo />,
    iconColor: "text-blue-500",
    label: "IA",
    labelBg: "bg-blue-100",
    labelText: "text-blue-600",
    textColor: "text-blue-700",
  },
  medio: {
    bg: "bg-amber-50",
    border: "border-amber-200",
    icon: <IcoWarn />,
    iconColor: "text-amber-500",
    label: "Revisar",
    labelBg: "bg-amber-100",
    labelText: "text-amber-700",
    textColor: "text-amber-800",
  },
  alto: {
    bg: "bg-red-50",
    border: "border-red-200",
    icon: <IcoAlert />,
    iconColor: "text-red-500",
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
      <span className={`shrink-0 leading-none mt-0.5 ${c.iconColor}`}>{c.icon}</span>
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
