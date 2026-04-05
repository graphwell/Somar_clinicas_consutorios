"use client";
import React, { useState } from "react";

interface SecaoFichaProps {
  titulo: string;
  icone?: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export function SecaoFicha({ titulo, icone, children, defaultOpen = true }: SecaoFichaProps) {
  const [aberta, setAberta] = useState(defaultOpen);

  return (
    <div className="bg-white border border-card-border rounded-2xl overflow-hidden">
      <button
        type="button"
        onClick={() => setAberta(a => !a)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          {icone && <span className="text-text-muted">{icone}</span>}
          <span className="text-xs font-black uppercase tracking-[0.2em] text-text-main">{titulo}</span>
        </div>
        <svg
          width="12" height="12" viewBox="0 0 12 12" fill="none"
          className={`transition-transform text-text-placeholder ${aberta ? 'rotate-180' : ''}`}
        >
          <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {aberta && (
        <div className="px-5 pb-5 space-y-3 border-t border-card-border">
          {children}
        </div>
      )}
    </div>
  );
}
