"use client";
import React, { useState, useEffect, useRef } from "react";
import { fetchWithAuth } from "@/lib/api-utils";

interface CidItem {
  codigo: string;
  descricao: string;
  relevancia?: number;
  confirmado?: boolean;
}

interface CIDSelectorProps {
  cidCodigo?: string;
  cidDescricao?: string;
  cidsSugeridos?: CidItem[];
  onChange: (codigo: string, descricao: string) => void;
}

export default function CIDSelector({
  cidCodigo,
  cidDescricao,
  cidsSugeridos = [],
  onChange,
}: CIDSelectorProps) {
  const [query, setQuery] = useState(cidCodigo ? `${cidCodigo} — ${cidDescricao}` : "");
  const [resultados, setResultados] = useState<CidItem[]>([]);
  const [aberto, setAberto] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setAberto(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function buscar(q: string) {
    setQuery(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.length < 2) {
      setResultados([]);
      setAberto(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setCarregando(true);
      try {
        const res = await fetchWithAuth(`/api/prontuario/ia/cid-search?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        setResultados(data.resultados || []);
        setAberto(true);
      } catch {
        setResultados([]);
      } finally {
        setCarregando(false);
      }
    }, 400);
  }

  function selecionar(item: CidItem) {
    setQuery(`${item.codigo} — ${item.descricao}`);
    onChange(item.codigo, item.descricao);
    setAberto(false);
    setResultados([]);
  }

  function limpar() {
    setQuery("");
    onChange("", "");
  }

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => buscar(e.target.value)}
          onFocus={() => {
            if (resultados.length > 0) setAberto(true);
          }}
          placeholder="Buscar CID-10 (ex: gripe, hipertensão, J06.9...)"
          className="w-full h-10 pl-9 pr-9 rounded-lg border border-warm-200 text-sm text-slate-700 bg-white focus:outline-none focus:border-sage-400 focus:ring-2 focus:ring-sage-100 placeholder:text-slate-200"
        />
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-200"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        {query && (
          <button
            onClick={limpar}
            className="absolute right-2.5 top-2.5 w-4 h-4 text-slate-200 hover:text-slate-500"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Dropdown */}
      {aberto && (
        <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-white rounded-xl border border-warm-200 shadow-lg overflow-hidden">
          {carregando ? (
            <div className="p-3 text-sm text-slate-300 text-center animate-pulse">
              Buscando CIDs...
            </div>
          ) : resultados.length === 0 ? (
            <div className="p-3 text-sm text-slate-300 text-center">Nenhum resultado</div>
          ) : (
            <ul className="max-h-52 overflow-y-auto">
              {resultados.map((item) => (
                <li key={item.codigo}>
                  <button
                    onClick={() => selecionar(item)}
                    className="w-full flex items-start gap-2 px-3 py-2 hover:bg-warm-50 text-left transition-colors"
                  >
                    <span className="text-xs font-mono font-medium text-sage-600 mt-0.5 shrink-0">
                      {item.codigo}
                    </span>
                    <span className="text-sm text-slate-700 leading-snug">{item.descricao}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* IA suggestions */}
      {cidsSugeridos.length > 0 && (
        <div className="mt-2">
          <p className="text-[10px] text-slate-300 uppercase tracking-wide mb-1.5">
            Sugestões da IA
          </p>
          <div className="flex flex-wrap gap-1.5">
            {cidsSugeridos.slice(0, 5).map((c) => (
              <button
                key={c.codigo}
                onClick={() => selecionar(c)}
                className="flex items-center gap-1 px-2 py-1 rounded-full bg-sage-50 border border-sage-200 text-[11px] text-sage-700 hover:bg-sage-100 transition-colors"
              >
                <span className="font-mono font-medium">{c.codigo}</span>
                <span className="max-w-[160px] truncate">{c.descricao}</span>
                {c.relevancia && c.relevancia > 0.8 && (
                  <span className="w-1.5 h-1.5 rounded-full bg-sage-500 ml-0.5" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
