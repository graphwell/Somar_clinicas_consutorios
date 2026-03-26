"use client";
import React, { createContext, useContext, useEffect, useState } from 'react';
import { fetchWithAuth } from '@/lib/api-utils';

import { getNomenclature, NichoLabels } from '@/lib/nomenclatures';

type NichoContextType = {
  nicho: string;
  labels: NichoLabels;
  onboardingCompleted: boolean;
  loading: boolean;
};

const NichoContext = createContext<NichoContextType>({
  nicho: 'CLINICA_MEDICA',
  labels: getNomenclature('CLINICA_MEDICA'),
  onboardingCompleted: true,
  loading: true
});

export function NichoProvider({ children }: { children: React.ReactNode }) {
  const [nicho, setNicho] = useState('CLINICA_MEDICA');
  const [labels, setLabels] = useState<NichoLabels>(getNomenclature('CLINICA_MEDICA'));
  const [onboardingCompleted, setOnboardingCompleted] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('synka-token') : null;
    if (!token) {
      setLoading(false);
      return;
    }

    fetchWithAuth('/api/tenant/nicho-config')
      .then(r => r.json())
      .then(data => {
        if (data.nicho) {
          setNicho(data.nicho);
          setLabels(getNomenclature(data.nicho));
        }
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
