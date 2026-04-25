'use client';
import { useSubscricaoVerificar } from '@/hooks/useSubscricaoVerificar';

interface ExternalData {
  incluso: boolean;
  usosRestantes: number | null;
  planoNome: string | null;
}

interface Props {
  pacienteId: string | null;
  servicoId: string | null;
  /** Passa dados já buscados pelo pai para evitar double-fetch */
  externalData?: ExternalData | null;
  externalLoading?: boolean;
}

export default function BadgePlanoAssinante({
  pacienteId,
  servicoId,
  externalData,
  externalLoading,
}: Props) {
  // Quando externalData é fornecido, o hook não faz fetch (pacienteId/servicoId são null)
  const hook = useSubscricaoVerificar(
    externalData !== undefined
      ? { pacienteId: null, servicoId: null }
      : { pacienteId, servicoId }
  );

  const loading   = externalData !== undefined ? (externalLoading ?? false) : hook.loading;
  const incluso   = externalData !== undefined ? (externalData?.incluso ?? false) : hook.incluso;
  const restantes = externalData !== undefined ? externalData?.usosRestantes ?? null : hook.usosRestantes;
  const nome      = externalData !== undefined ? externalData?.planoNome ?? null : hook.planoNome;

  if (loading) {
    return <div className="h-6 w-52 rounded-full bg-slate-100 animate-pulse" />;
  }

  if (!incluso) return null;

  const labelRestantes =
    restantes === null
      ? 'Ilimitado'
      : restantes === 0
        ? 'Último uso'
        : `${restantes} uso${restantes !== 1 ? 's' : ''} restante${restantes !== 1 ? 's' : ''}`;

  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 w-fit text-xs font-semibold text-emerald-700 select-none">
      <svg
        width="13"
        height="13"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="20 6 9 17 4 12" />
      </svg>
      Incluso no plano
      {nome && <span className="font-normal text-emerald-600">· {nome}</span>}
      <span className="font-normal text-emerald-600">· {labelRestantes}</span>
    </div>
  );
}
