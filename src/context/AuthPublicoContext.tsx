'use client';
import React, { createContext, useContext, useState, useCallback } from 'react';

interface PlanoAtivo {
  nome:             string;
  descontoProdutos: number;
}

interface AuthPublicoState {
  pacienteId:       string | null;
  pacienteNome:     string | null;
  pacienteTelefone: string | null;
  token:            string | null;
  isAuthenticated:  boolean;
  isAssinante:      boolean;
  planoAtivo:       PlanoAtivo | null;
  isNovoCliente:    boolean;
}

interface AuthPublicoContextValue extends AuthPublicoState {
  login: (token: string, dados: { pacienteId: string; nome: string; telefone?: string; isNovoCliente?: boolean }) => void;
  logout: () => void;
  checkAssinatura: (slug: string, servicoId: string | null) => Promise<void>;
}

const INITIAL: AuthPublicoState = {
  pacienteId: null, pacienteNome: null, pacienteTelefone: null,
  token: null, isAuthenticated: false, isAssinante: false,
  planoAtivo: null, isNovoCliente: false,
};

const AuthPublicoContext = createContext<AuthPublicoContextValue>({
  ...INITIAL,
  login: () => {},
  logout: () => {},
  checkAssinatura: async () => {},
});

export function AuthPublicoProvider({ children, slug }: { children: React.ReactNode; slug: string }) {
  const storageKey = `public_token_${slug}`;

  const [state, setState] = useState<AuthPublicoState>(() => {
    try {
      if (typeof window === 'undefined') return INITIAL;
      const token = sessionStorage.getItem(storageKey);
      if (token) return { ...INITIAL, token, isAuthenticated: true };
    } catch { /* ok */ }
    return INITIAL;
  });

  const login = useCallback((
    token: string,
    dados: { pacienteId: string; nome: string; telefone?: string; isNovoCliente?: boolean },
  ) => {
    try { sessionStorage.setItem(storageKey, token); } catch { /* ok */ }
    setState({
      token,
      pacienteId:       dados.pacienteId,
      pacienteNome:     dados.nome,
      pacienteTelefone: dados.telefone ?? null,
      isAuthenticated:  true,
      isAssinante:      false,
      planoAtivo:       null,
      isNovoCliente:    dados.isNovoCliente ?? false,
    });
  }, [storageKey]);

  const logout = useCallback(() => {
    try { sessionStorage.removeItem(storageKey); } catch { /* ok */ }
    setState(INITIAL);
  }, [storageKey]);

  const checkAssinatura = useCallback(async (slug: string, servicoId: string | null) => {
    if (!state.token) return;
    try {
      const params = new URLSearchParams();
      if (servicoId) params.set('servicoId', servicoId);
      const r = await fetch(`/api/public/clinic/${slug}/assinatura?${params}`, {
        headers: { Authorization: `Bearer ${state.token}` },
      });
      const d = await r.json() as Record<string, unknown>;
      if (d['temPlano']) {
        setState(prev => ({
          ...prev,
          isAssinante: true,
          planoAtivo: {
            nome:             String(d['planoNome'] ?? ''),
            descontoProdutos: typeof d['descontoProdutos'] === 'number' ? d['descontoProdutos'] : 0,
          },
        }));
      }
    } catch { /* silent */ }
  }, [state.token]);

  return (
    <AuthPublicoContext.Provider value={{ ...state, login, logout, checkAssinatura }}>
      {children}
    </AuthPublicoContext.Provider>
  );
}

export const useAuthPublico = () => useContext(AuthPublicoContext);
