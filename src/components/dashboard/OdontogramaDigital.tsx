"use client";
import React, { useState, useEffect } from 'react';

export type StatusDente =
  | 'HIGIDO'
  | 'CARIE'
  | 'RESTAURADO'
  | 'EXTRACAO_INDICADA'
  | 'EXTRAIDO'
  | 'COROA'
  | 'IMPLANTE'
  | 'CANAL'
  | 'FRATURA';

export interface DenteData {
  numeroDente: number;
  status: StatusDente;
  facesAfetadas?: string[];
  observacao?: string;
}

interface OdontogramaDigitalProps {
  prontuarioId: string;
  pacienteId: string;
  tenantId: string;
  readOnly?: boolean;
}

const STATUS_CONFIG: Record<StatusDente, { label: string; color: string; bg: string; }> = {
  HIGIDO:           { label: 'Hígido',              color: '#64748b', bg: '#f8fafc' },
  CARIE:            { label: 'Cárie',                color: '#dc2626', bg: '#fef2f2' },
  RESTAURADO:       { label: 'Restaurado',           color: '#2563eb', bg: '#eff6ff' },
  EXTRACAO_INDICADA:{ label: 'Extração Indicada',    color: '#7c3aed', bg: '#f5f3ff' },
  EXTRAIDO:         { label: 'Extraído / Ausente',   color: '#94a3b8', bg: '#f1f5f9' },
  COROA:            { label: 'Coroa',                color: '#d97706', bg: '#fffbeb' },
  IMPLANTE:         { label: 'Implante',             color: '#059669', bg: '#f0fdf4' },
  CANAL:            { label: 'Canal',                color: '#ea580c', bg: '#fff7ed' },
  FRATURA:          { label: 'Fratura',              color: '#92400e', bg: '#fef3c7' },
};

const FACES = ['Oclusal', 'Vestibular', 'Lingual', 'Mesial', 'Distal'];

// Dentes por quadrante (ISO 3950)
const QUADRANTES = {
  superiorDireito:   [18, 17, 16, 15, 14, 13, 12, 11],
  superiorEsquerdo:  [21, 22, 23, 24, 25, 26, 27, 28],
  inferiorEsquerdo:  [31, 32, 33, 34, 35, 36, 37, 38],
  inferiorDireito:   [48, 47, 46, 45, 44, 43, 42, 41],
};

function DenteSVG({ numero, status, onClick, small = false }: {
  numero: number;
  status: StatusDente;
  onClick: () => void;
  small?: boolean;
}) {
  const cfg = STATUS_CONFIG[status];
  const isExtraido = status === 'EXTRAIDO';
  const sz = small ? 32 : 40;

  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1 group"
      title={`Dente ${numero} — ${cfg.label}`}
    >
      <svg width={sz} height={sz} viewBox="0 0 40 40" className="transition-transform group-hover:scale-110">
        {isExtraido ? (
          <>
            <rect x="4" y="4" width="32" height="32" rx="6" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="1.5" />
            <line x1="10" y1="10" x2="30" y2="30" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="30" y1="10" x2="10" y2="30" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" />
          </>
        ) : (
          <>
            <rect x="4" y="4" width="32" height="32" rx="6" fill={cfg.bg} stroke={cfg.color} strokeWidth="1.5" />
            {/* Raízes estilizadas */}
            <rect x="14" y="26" width="5" height="10" rx="2" fill={cfg.color} opacity="0.25" />
            <rect x="21" y="26" width="5" height="10" rx="2" fill={cfg.color} opacity="0.25" />
            {/* Coroa */}
            <rect x="8" y="6" width="24" height="20" rx="4" fill={cfg.color} opacity="0.15" />
            {/* Status indicator */}
            {status !== 'HIGIDO' && (
              <circle cx="20" cy="16" r="6" fill={cfg.color} opacity="0.7" />
            )}
            {status === 'CANAL' && (
              <line x1="17" y1="26" x2="17" y2="34" stroke={cfg.color} strokeWidth="3" strokeLinecap="round" opacity="0.5" />
            )}
            {status === 'COROA' && (
              <rect x="9" y="7" width="22" height="18" rx="3" fill={cfg.color} opacity="0.3" />
            )}
            {status === 'IMPLANTE' && (
              <line x1="20" y1="26" x2="20" y2="36" stroke={cfg.color} strokeWidth="3" strokeLinecap="round" opacity="0.6" />
            )}
          </>
        )}
      </svg>
      <span className="text-[8px] font-black text-slate-500">{numero}</span>
    </button>
  );
}

function PainelDente({ numero, data, onSave, onClose }: {
  numero: number;
  data: DenteData;
  onSave: (d: Partial<DenteData>) => void;
  onClose: () => void;
}) {
  const [status, setStatus] = useState<StatusDente>(data.status);
  const [faces, setFaces] = useState<string[]>(data.facesAfetadas || []);
  const [obs, setObs] = useState(data.observacao || '');
  const [saving, setSaving] = useState(false);

  const toggleFace = (f: string) => {
    setFaces(prev => prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f]);
  };

  const handleSave = async () => {
    setSaving(true);
    await onSave({ status, facesAfetadas: faces, observacao: obs });
    setSaving(false);
  };

  const cfg = STATUS_CONFIG[status];

  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white border-l border-card-border shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300">
      <div className="p-6 border-b border-slate-50 flex items-center justify-between">
        <div>
          <h3 className="text-xl font-black italic uppercase tracking-tighter text-text-main">Dente {numero}</h3>
          <p className="text-[10px] font-black text-text-placeholder uppercase tracking-widest mt-0.5">Odontograma Digital</p>
        </div>
        <button onClick={onClose} className="w-10 h-10 rounded-xl hover:bg-slate-50 flex items-center justify-center text-text-placeholder font-black">✕</button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8 no-scrollbar">
        {/* Status */}
        <div className="space-y-3">
          <p className="text-[9px] font-black uppercase tracking-widest text-text-placeholder">Status do Dente</p>
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(STATUS_CONFIG) as StatusDente[]).map(s => {
              const c = STATUS_CONFIG[s];
              const active = status === s;
              return (
                <button key={s} onClick={() => setStatus(s)}
                  className={`p-3 rounded-2xl border-2 text-left transition-all ${active ? 'border-current shadow-sm scale-[1.02]' : 'border-transparent bg-slate-50 opacity-60 hover:opacity-100'}`}
                  style={active ? { backgroundColor: c.bg, borderColor: c.color, color: c.color } : {}}>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: c.color }} />
                    <span className="text-[10px] font-black uppercase tracking-tight">{c.label}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Faces afetadas (só para cárie/restauração) */}
        {(status === 'CARIE' || status === 'RESTAURADO' || status === 'FRATURA') && (
          <div className="space-y-3">
            <p className="text-[9px] font-black uppercase tracking-widest text-text-placeholder">Faces Afetadas</p>
            <div className="flex flex-wrap gap-2">
              {FACES.map(f => (
                <button key={f} onClick={() => toggleFace(f)}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border-2 ${faces.includes(f) ? 'bg-primary text-white border-primary shadow-sm' : 'bg-slate-50 text-text-muted border-transparent hover:border-slate-200'}`}>
                  {f}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Observação */}
        <div className="space-y-2">
          <p className="text-[9px] font-black uppercase tracking-widest text-text-placeholder">Observação</p>
          <textarea rows={3} value={obs} onChange={e => setObs(e.target.value)}
            placeholder="Anotações sobre este dente..."
            className="input-premium w-full py-3 text-sm resize-none" />
        </div>

        {/* Preview visual */}
        <div className="flex items-center justify-center py-4 bg-slate-50 rounded-2xl border border-card-border">
          <DenteSVG numero={numero} status={status} onClick={() => {}} />
          <div className="ml-4 text-left">
            <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: cfg.color }}>
              {cfg.label}
            </p>
            {faces.length > 0 && (
              <p className="text-[9px] text-text-muted mt-1">{faces.join(', ')}</p>
            )}
          </div>
        </div>
      </div>

      <div className="p-6 border-t border-slate-50">
        <button onClick={handleSave} disabled={saving}
          className="btn-primary w-full py-4 text-[10px]">
          {saving ? 'Salvando...' : 'Salvar Alteração'}
        </button>
      </div>
    </div>
  );
}

export default function OdontogramaDigital({ prontuarioId, pacienteId, tenantId, readOnly = false }: OdontogramaDigitalProps) {
  const [dentes, setDentes] = useState<Record<number, DenteData>>({});
  const [selectedDente, setSelectedDente] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!prontuarioId) return;
    fetch(`/api/odontograma?prontuarioId=${prontuarioId}`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('synka-token')}` }
    })
      .then(r => r.json())
      .then((data: DenteData[]) => {
        const map: Record<number, DenteData> = {};
        data.forEach(d => { map[d.numeroDente] = d; });
        setDentes(map);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [prontuarioId]);

  const getDente = (n: number): DenteData => dentes[n] || { numeroDente: n, status: 'HIGIDO' };

  const handleSave = async (numero: number, updates: Partial<DenteData>) => {
    const current = getDente(numero);
    const payload = { prontuarioId, pacienteId, numeroDente: numero, ...current, ...updates };
    try {
      const res = await fetch('/api/odontograma', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('synka-token')}`
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setDentes(prev => ({ ...prev, [numero]: { ...current, ...updates, numeroDente: numero } }));
      }
    } catch {}
    setSelectedDente(null);
  };

  if (loading) return (
    <div className="py-12 text-center text-[10px] font-black uppercase tracking-widest text-text-placeholder animate-pulse">
      Carregando odontograma...
    </div>
  );

  const renderQuadrante = (numeros: number[], label: string) => (
    <div className="space-y-1">
      <p className="text-[8px] font-black uppercase tracking-widest text-text-placeholder text-center opacity-60">{label}</p>
      <div className="flex gap-1 justify-center">
        {numeros.map(n => (
          <DenteSVG key={n} numero={n} status={getDente(n).status}
            onClick={() => !readOnly && setSelectedDente(n)} small />
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Grade de dentes */}
      <div className="bg-white border border-card-border rounded-[2rem] p-6 overflow-x-auto">
        <div className="min-w-[600px] space-y-4">
          {/* Superior */}
          <div className="grid grid-cols-2 gap-1 border-b-2 border-dashed border-slate-200 pb-4">
            <div className="text-right pr-4">
              {renderQuadrante(QUADRANTES.superiorDireito, 'Superior Direito (1)')}
            </div>
            <div className="text-left pl-4 border-l-2 border-dashed border-slate-200">
              {renderQuadrante(QUADRANTES.superiorEsquerdo, 'Superior Esquerdo (2)')}
            </div>
          </div>

          {/* Linha central horizontal */}
          <div className="flex items-center justify-center gap-2">
            <span className="text-[8px] font-black uppercase tracking-widest text-text-placeholder opacity-40">D</span>
            <div className="flex-1 h-px bg-slate-100" />
            <span className="text-[8px] font-black uppercase tracking-widest text-primary opacity-60">Odontograma ISO 3950</span>
            <div className="flex-1 h-px bg-slate-100" />
            <span className="text-[8px] font-black uppercase tracking-widest text-text-placeholder opacity-40">E</span>
          </div>

          {/* Inferior */}
          <div className="grid grid-cols-2 gap-1 border-t-2 border-dashed border-slate-200 pt-4">
            <div className="text-right pr-4">
              {renderQuadrante(QUADRANTES.inferiorDireito, 'Inferior Direito (4)')}
            </div>
            <div className="text-left pl-4 border-l-2 border-dashed border-slate-200">
              {renderQuadrante(QUADRANTES.inferiorEsquerdo, 'Inferior Esquerdo (3)')}
            </div>
          </div>
        </div>
      </div>

      {/* Legenda */}
      <div className="bg-white border border-card-border rounded-2xl p-5">
        <p className="text-[9px] font-black uppercase tracking-widest text-text-placeholder mb-3">Legenda</p>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(STATUS_CONFIG) as StatusDente[]).map(s => {
            const c = STATUS_CONFIG[s];
            const count = Object.values(dentes).filter(d => d.status === s).length;
            return (
              <div key={s} className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-card-border bg-slate-50">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: c.color }} />
                <span className="text-[9px] font-black uppercase tracking-tight text-text-muted">{c.label}</span>
                {count > 0 && (
                  <span className="text-[8px] font-black px-1.5 py-0.5 rounded-md text-white" style={{ backgroundColor: c.color }}>
                    {count}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Painel lateral de edição */}
      {selectedDente !== null && (
        <>
          <div className="fixed inset-0 bg-slate-900/10 backdrop-blur-sm z-40" onClick={() => setSelectedDente(null)} />
          <PainelDente
            numero={selectedDente}
            data={getDente(selectedDente)}
            onSave={(updates) => handleSave(selectedDente, updates)}
            onClose={() => setSelectedDente(null)}
          />
        </>
      )}
    </div>
  );
}
