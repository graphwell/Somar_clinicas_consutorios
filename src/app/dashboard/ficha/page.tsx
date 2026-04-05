"use client";
import React, { useState, useEffect } from "react";
import { useNicho } from "@/context/NichoContext";
import { fetchWithAuth } from "@/lib/api-utils";
import Link from "next/link";

type ClienteFicha = {
  id: string;
  nome: string;
  telefone: string;
  contagemVisitas: number;
  totalGasto: number;
  ultimaVisita?: string | null;
  createdAt: string;
  fichaCliente?: {
    alertas?: string | null;
    fotos: { id: string }[];
  } | null;
};

function iniciais(nome: string) {
  return nome.split(" ").slice(0, 2).map(p => p[0]).join("").toUpperCase();
}

function fmtData(iso?: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    timeZone: "America/Fortaleza",
  });
}

export default function ListaFichasPage() {
  const { labels } = useNicho();
  const [clientes, setClientes] = useState<ClienteFicha[]>([]);
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<"todos" | "com_alerta" | "com_foto">("todos");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWithAuth(`/api/patients?incluirFicha=true&limite=200`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setClientes(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const listaFiltrada = clientes.filter(c => {
    if (busca.trim()) {
      const q = busca.toLowerCase();
      if (!c.nome.toLowerCase().includes(q) && !c.telefone.includes(busca)) return false;
    }
    if (filtro === "com_alerta") return !!c.fichaCliente?.alertas;
    if (filtro === "com_foto") return (c.fichaCliente?.fotos?.length ?? 0) > 0;
    return true;
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20 animate-premium">
      {/* Header */}
      <div className="bg-white border border-card-border rounded-[2.5rem] p-8 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/20">
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <rect x="3" y="2" width="16" height="18" rx="2" stroke="currentColor" strokeWidth="1.8" />
              <path d="M7 7h8M7 11h8M7 15h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-black italic uppercase tracking-tighter text-text-main">
              Fichas dos {labels.termoPacientePlural}
            </h1>
            <p className="text-[9px] font-black uppercase tracking-[0.25em] text-text-placeholder opacity-60 mt-0.5">
              {clientes.length} {labels.termoPacientePlural.toLowerCase()} cadastrados
            </p>
          </div>
        </div>

        {/* Busca e filtros */}
        <div className="mt-5 flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <input
              value={busca} onChange={e => setBusca(e.target.value)}
              placeholder={`Buscar ${labels.termoPaciente.toLowerCase()}...`}
              className="input-premium w-full py-2.5 text-sm pl-9"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-placeholder">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <circle cx="6" cy="6" r="4" stroke="currentColor" strokeWidth="1.5" />
                <path d="M9.5 9.5l2.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </span>
          </div>
          <div className="flex gap-1">
            {(["todos", "com_alerta", "com_foto"] as const).map(f => (
              <button
                key={f}
                onClick={() => setFiltro(f)}
                className={`text-[9px] font-black uppercase px-3 py-2 rounded-xl border transition-all ${
                  filtro === f
                    ? "bg-primary text-white border-primary"
                    : "bg-white text-text-muted border-card-border hover:border-primary/30"
                }`}
              >
                {f === "todos" ? "Todos" : f === "com_alerta" ? "Com alerta" : "Com foto"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white border border-card-border rounded-2xl h-20 animate-pulse" />
          ))}
        </div>
      ) : listaFiltrada.length === 0 ? (
        <div className="bg-white border border-card-border rounded-[2.5rem] py-20 text-center">
          <p className="text-text-placeholder text-xs font-black uppercase tracking-widest">
            {clientes.length === 0 ? `Nenhum ${labels.termoPaciente.toLowerCase()} cadastrado` : "Nenhum resultado"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {listaFiltrada.map(c => (
            <Link
              key={c.id}
              href={`/dashboard/ficha/${c.id}`}
              className="bg-white border border-card-border rounded-2xl p-4 flex items-center gap-4 hover:shadow-md transition-all group"
            >
              {/* Avatar */}
              <div className="w-11 h-11 rounded-full bg-primary-soft flex items-center justify-center text-primary font-black text-sm flex-shrink-0">
                {iniciais(c.nome)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-black text-text-main text-sm uppercase tracking-tight">{c.nome}</p>
                  {c.fichaCliente?.alertas && (
                    <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded-full bg-red-50 border border-red-200 text-red-600">
                      Alerta
                    </span>
                  )}
                  {(c.fichaCliente?.fotos?.length ?? 0) > 0 && (
                    <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-50 border border-card-border text-text-muted">
                      {c.fichaCliente!.fotos.length} foto{c.fichaCliente!.fotos.length > 1 ? "s" : ""}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                  <p className="text-[10px] font-mono text-text-placeholder">{c.telefone}</p>
                  <p className="text-[10px] text-text-placeholder">
                    {c.contagemVisitas} visita{c.contagemVisitas !== 1 ? "s" : ""}
                  </p>
                  {c.ultimaVisita && (
                    <p className="text-[10px] text-text-placeholder">
                      Última: {fmtData(c.ultimaVisita)}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex-shrink-0 text-text-placeholder group-hover:text-primary transition-colors">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 3l5 5-5 5" />
                </svg>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
