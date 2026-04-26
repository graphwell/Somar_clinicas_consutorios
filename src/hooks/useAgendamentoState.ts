'use client';
import { useState, useEffect, useCallback } from 'react';

export interface AgendamentoState {
  slug:              string;
  servicoId:         string | null;
  servicoNome:       string | null;
  servicoPreco:      number | null;
  profissionalId:    string | null;
  profissionalNome:  string | null;
  data:              string | null; // 'YYYY-MM-DD'
  hora:              string | null; // 'HH:mm'
}

const EMPTY = (slug: string): AgendamentoState => ({
  slug, servicoId: null, servicoNome: null, servicoPreco: null,
  profissionalId: null, profissionalNome: null, data: null, hora: null,
});

function storageKey(slug: string) {
  return `agendamento_pendente_${slug}`;
}

function readStorage(slug: string): AgendamentoState {
  try {
    if (typeof window === 'undefined') return EMPTY(slug);
    const raw = sessionStorage.getItem(storageKey(slug));
    if (!raw) return EMPTY(slug);
    return { ...EMPTY(slug), ...JSON.parse(raw) };
  } catch {
    return EMPTY(slug);
  }
}

function writeStorage(state: AgendamentoState): void {
  try {
    if (typeof window === 'undefined') return;
    sessionStorage.setItem(storageKey(state.slug), JSON.stringify(state));
  } catch { /* sessionStorage indisponível */ }
}

export function useAgendamentoState(slug: string) {
  const [state, setState] = useState<AgendamentoState>(() => readStorage(slug));

  // Sincronizar sessionStorage quando estado muda
  useEffect(() => { writeStorage(state); }, [state]);

  const setServico = useCallback((id: string | null, nome: string | null, preco: number | null) => {
    setState(s => ({ ...s, servicoId: id, servicoNome: nome, servicoPreco: preco }));
  }, []);

  const setProfissional = useCallback((id: string | null, nome: string | null) => {
    setState(s => ({ ...s, profissionalId: id, profissionalNome: nome }));
  }, []);

  const setDataHora = useCallback((data: string | null, hora: string | null) => {
    setState(s => ({ ...s, data, hora }));
  }, []);

  const clearAgendamentoPendente = useCallback(() => {
    try {
      if (typeof window !== 'undefined') sessionStorage.removeItem(storageKey(slug));
    } catch { /* ok */ }
    setState(EMPTY(slug));
  }, [slug]);

  const hasSelectionComplete =
    !!state.servicoId &&
    !!state.profissionalId &&
    !!state.data &&
    !!state.hora;

  return {
    state,
    setServico,
    setProfissional,
    setDataHora,
    hasSelectionComplete,
    clearAgendamentoPendente,
  };
}
