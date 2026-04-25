'use client';

interface ServicoPlano {
  servicoId:   string;
  nomeServico?: string;
  nome?:        string;
  tipo:         string;
  quantidade:   number | null;
}

interface PlanoAtivoProps {
  planoAtivo: {
    nome:        string;
    servicos:    ServicoPlano[];
    contadorUso: Record<string, { usado: number; limite: number | null }>;
    dataFim:     string | null;
  } | null;
}

function fmtData(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

export default function PlanoAtivoCard({ planoAtivo }: PlanoAtivoProps) {
  if (!planoAtivo) return null;

  const { nome, servicos, contadorUso, dataFim } = planoAtivo;

  return (
    <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-white bg-emerald-600 px-2.5 py-1 rounded-full">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Assinante ativo
          </span>
        </div>
        {dataFim && (
          <span className="text-[10px] text-emerald-600">
            Renova em {fmtData(dataFim)}
          </span>
        )}
      </div>

      <p className="text-sm font-bold text-emerald-800 mb-3">{nome}</p>

      {/* Serviços com uso */}
      {servicos.length > 0 && (
        <div className="space-y-2">
          {servicos.map(s => {
            const nomeExibir  = s.nomeServico ?? s.nome ?? '—';
            const ilimitado   = s.tipo === 'ilimitado';
            const contador    = contadorUso[s.servicoId];
            const usado       = contador?.usado ?? 0;
            const limite      = contador?.limite ?? s.quantidade;
            const pct         = (ilimitado || !limite) ? 0 : Math.min(100, (usado / limite) * 100);
            const atingido    = !ilimitado && limite !== null && usado >= limite;

            return (
              <div key={s.servicoId} className="space-y-0.5">
                <div className="flex justify-between text-xs">
                  <span className="text-emerald-700 font-medium truncate max-w-[140px]">
                    {nomeExibir}
                  </span>
                  <span className={`font-semibold ${atingido ? 'text-amber-600' : 'text-emerald-600'}`}>
                    {ilimitado ? 'Ilimitado' : `${usado} de ${limite ?? '∞'} usos`}
                  </span>
                </div>
                {!ilimitado && limite !== null && (
                  <div className="h-1.5 rounded-full bg-emerald-200 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${pct}%`,
                        background: atingido ? '#F59E0B' : '#10B981',
                      }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
