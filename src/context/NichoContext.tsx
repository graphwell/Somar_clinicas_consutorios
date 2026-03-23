"use client";
import React, { createContext, useContext, useEffect, useState } from 'react';

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

// Termos Padrão (Fallback) se a clínica não tiver um nicho que bate explícito, ou durante o load
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

export function NichoProvider({ children, tenantId }: { children: React.ReactNode, tenantId: string }) {
  const [nicho, setNicho] = useState('Clínica Médica');
  const [labels, setLabels] = useState<NichoLabels>(defaultLabels);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/tenant/nicho-config?tenantId=${tenantId}`)
      .then(r => r.json())
      .then(data => {
        if (data.nicho) setNicho(data.nicho);
        if (data.labels) setLabels(data.labels);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [tenantId]);

  return (
    <NichoContext.Provider value={{ nicho, labels, loading }}>
        {children}
    </NichoContext.Provider>
  );
}

export const useNicho = () => useContext(NichoContext);
