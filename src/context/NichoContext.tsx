"use client";
import React, { createContext, useContext, useEffect, useState } from 'react';
import { fetchWithAuth } from '@/lib/api-utils';

type NichoLabels = {
  cliente: string;
  servico: string;
  profissional: string;
};

type NichoContextType = {
  nicho: string;
  labels: NichoLabels;
  loading: boolean;
};

const defaultLabels: NichoLabels = {
  cliente: 'Paciente',
  servico: 'Consulta',
  profissional: 'Profissional'
};

const NichoContext = createContext<NichoContextType>({
  nicho: 'Clínica Médica',
  labels: defaultLabels,
  loading: true
});

export function NichoProvider({ children }: { children: React.ReactNode }) {
  const [nicho, setNicho] = useState('Clínica Médica');
  const [labels, setLabels] = useState<NichoLabels>(defaultLabels);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Busca a configuração do nicho da empresa logada (O Middleware injeta o tenantId)
    fetchWithAuth('/api/tenant/nicho-config')
      .then(r => r.json())
      .then(data => {
        if (data.nicho) setNicho(data.nicho);
        if (data.labels) setLabels(data.labels);
      })
      .catch(err => {
        console.error('Falha ao carregar NichoConfig:', err);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <NichoContext.Provider value={{ nicho, labels, loading }}>
        {children}
    </NichoContext.Provider>
  );
}

export const useNicho = () => useContext(NichoContext);
