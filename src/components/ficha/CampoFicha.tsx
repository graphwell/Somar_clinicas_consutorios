"use client";
import React, { useState, useEffect } from "react";

interface CampoFichaProps {
  label: string;
  valor?: string | null;
  placeholder?: string;
  tipo?: "text" | "textarea" | "date";
  onChange: (v: string) => Promise<void>;
  destaque?: boolean;
}

export function CampoFicha({ label, valor, placeholder, tipo = "text", onChange, destaque = false }: CampoFichaProps) {
  const [editando, setEditando] = useState(false);
  const [valorLocal, setValorLocal] = useState(valor ?? "");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => { setValorLocal(valor ?? ""); }, [valor]);

  async function salvar() {
    if (valorLocal === (valor ?? "")) {
      setEditando(false);
      return;
    }
    setSalvando(true);
    try {
      await onChange(valorLocal);
    } finally {
      setSalvando(false);
      setEditando(false);
    }
  }

  if (!editando) {
    return (
      <div
        onClick={() => setEditando(true)}
        className={`relative rounded-xl p-3 cursor-pointer group transition-colors ${
          destaque && valor
            ? "bg-red-50 border border-red-100 hover:bg-red-100/50"
            : "bg-slate-50 border border-card-border hover:bg-slate-100"
        }`}
      >
        <p className="text-[9px] uppercase tracking-[0.2em] font-black text-text-placeholder mb-1">{label}</p>
        <p className={`text-sm leading-snug ${
          valor
            ? destaque ? "text-red-700 font-medium" : "text-text-main"
            : "text-text-placeholder italic"
        }`}>
          {valor || placeholder || "Clique para preencher"}
        </p>
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M8 1.5l2.5 2.5L3.5 11 1 11.5l.5-2.5L8 1.5z" stroke="#94a3b8" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
    );
  }

  const inputClass = "w-full text-sm text-text-main bg-transparent outline-none placeholder:text-text-placeholder";

  return (
    <div className="rounded-xl p-3 bg-white border-2 border-primary/40">
      <p className="text-[9px] uppercase tracking-[0.2em] font-black text-text-placeholder mb-1">{label}</p>
      {tipo === "textarea" ? (
        <textarea
          autoFocus
          value={valorLocal}
          onChange={e => setValorLocal(e.target.value)}
          onBlur={salvar}
          className={`${inputClass} resize-none min-h-[72px]`}
          placeholder={placeholder}
        />
      ) : tipo === "date" ? (
        <input
          autoFocus
          type="date"
          value={valorLocal}
          onChange={e => setValorLocal(e.target.value)}
          onBlur={salvar}
          className={inputClass}
        />
      ) : (
        <input
          autoFocus
          type="text"
          value={valorLocal}
          onChange={e => setValorLocal(e.target.value)}
          onBlur={salvar}
          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); salvar(); } }}
          className={inputClass}
          placeholder={placeholder}
        />
      )}
      {salvando && <p className="text-[9px] text-primary mt-1">Salvando...</p>}
    </div>
  );
}

interface CampoSelectProps {
  label: string;
  valor?: string | null;
  opcoes: string[];
  onChange: (v: string) => Promise<void>;
}

export function CampoSelect({ label, valor, opcoes, onChange }: CampoSelectProps) {
  const [salvando, setSalvando] = useState(false);

  async function handleChange(v: string) {
    setSalvando(true);
    try { await onChange(v); } finally { setSalvando(false); }
  }

  return (
    <div className="rounded-xl p-3 bg-slate-50 border border-card-border">
      <p className="text-[9px] uppercase tracking-[0.2em] font-black text-text-placeholder mb-1">
        {label}{salvando && <span className="ml-2 normal-case italic font-normal">salvando...</span>}
      </p>
      <select
        value={valor ?? ""}
        onChange={e => handleChange(e.target.value)}
        className="w-full text-sm text-text-main bg-transparent outline-none cursor-pointer"
      >
        <option value="">— Selecionar —</option>
        {opcoes.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}
