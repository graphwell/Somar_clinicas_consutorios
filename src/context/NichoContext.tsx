"use client";
import React, { createContext, useContext, useEffect, useState } from 'react';
import { fetchWithAuth } from '@/lib/api-utils';

type NichoLabels = {
  cliente: string;
  servico: string;
  profissional: string;
  atendimento: string;
  prontuario: string;
};

type NichoContextType = {
  nicho: string;
  labels: NichoLabels;
  onboardingCompleted: boolean;
  loading: boolean;
};

const defaultLabels: NichoLabels = {
  cliente: 'Paciente',
  servico: 'Serviço',
  profissional: 'Profissional',
  atendimento: 'Consulta',
  prontuario: 'Prontuário'
};

const NichoContext = createContext<NichoContextType>({
  nicho: 'Clínica Médica',
  labels: defaultLabels,
  onboardingCompleted: true, // Defaulting to true to avoid flash on public pages
  loading: true
});

export function NichoProvider({ children }: { children: React.ReactNode }) {
  const [nicho, setNicho] = useState('Clínica Médica');
  const [labels, setLabels] = useState<NichoLabels>(defaultLabels);
  const [onboardingCompleted, setOnboardingCompleted] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Só busca se houver sessão ativa
    const token = typeof window !== 'undefined' ? localStorage.getItem('synka-token') : null;
    if (!token) {
      setLoading(false);
      return;
    }

    fetchWithAuth('/api/tenant/nicho-config')
      .then(r => r.json())
      .then(data => {
        if (data.nicho) setNicho(data.nicho);
        if (data.labels) setLabels(data.labels);
        if (data.hasOwnProperty('onboardingCompleted')) {
          setOnboardingCompleted(data.onboardingCompleted);
        }
      })
      .catch(err => {
        console.error('Falha ao carregar NichoConfig:', err);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <NichoContext.Provider value={{ nicho, labels, onboardingCompleted, loading }}>
        {children}
    </NichoContext.Provider>
  );
}

export const useNicho = () => useContext(NichoContext);
