'use client';
import { useEffect, useState } from 'react';
import { fetchWithAuth } from '@/lib/api-utils';

interface Params {
  pacienteId: string | null;
  servicoId: string | null;
}

export interface SubscricaoInfo {
  incluso: boolean;
  usosRestantes: number | null;
  planoNome: string | null;
  loading: boolean;
}

export function useSubscricaoVerificar({ pacienteId, servicoId }: Params): SubscricaoInfo {
  const [incluso, setIncluso] = useState(false);
  const [usosRestantes, setUsosRestantes] = useState<number | null>(null);
  const [planoNome, setPlanoNome] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!pacienteId || !servicoId) {
      setIncluso(false);
      setUsosRestantes(null);
      setPlanoNome(null);
      return;
    }

    let cancelled = false;
    setLoading(true);

    fetchWithAuth(
      `/api/subscriptions/verificar?pacienteId=${encodeURIComponent(pacienteId)}&servicoId=${encodeURIComponent(servicoId)}`
    )
      .then(r => r.json())
      .then((d: Record<string, unknown>) => {
        if (cancelled) return;
        const estaIncluso = !!(d.temPlano && d.servicoIncluso && !d.cobrarNormal);
        setIncluso(estaIncluso);
        setUsosRestantes(typeof d.saldoRestante === 'number' ? d.saldoRestante : null);
        setPlanoNome(typeof d.planoNome === 'string' ? d.planoNome : null);
      })
      .catch(() => {
        if (!cancelled) {
          setIncluso(false);
          setUsosRestantes(null);
          setPlanoNome(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [pacienteId, servicoId]);

  return { incluso, usosRestantes, planoNome, loading };
}
