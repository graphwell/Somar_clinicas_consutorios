"use client";
import React, { useState } from 'react';
import { useNicho } from '@/context/NichoContext';
import { fetchWithAuth } from '@/lib/api-utils';
import OdontogramaDigital from '@/components/dashboard/OdontogramaDigital';

type Paciente = { id: string; nome: string; telefone: string; tenantId?: string };
type Prontuario = { id: string; createdAt: string; queixaPrincipal?: string; profissional?: { nome: string } };

export default function OdontogramaPage() {
  const { labels } = useNicho();
  const [search, setSearch] = useState('');
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [selectedPaciente, setSelectedPaciente] = useState<Paciente | null>(null);
  const [prontuarios, setProntuarios] = useState<Prontuario[]>([]);
  const [selectedProntuario, setSelectedProntuario] = useState<Prontuario | null>(null);
  const [loadingPront, setLoadingPront] = useState(false);
  const [criandoProntuario, setCriandoProntuario] = useState(false);
  const [tenantId, setTenantId] = useState('');

  React.useEffect(() => {
    try {
      const u = localStorage.getItem('synka-user');
      if (u) setTenantId(JSON.parse(u).tenantId || '');
    } catch {}
  }, []);

  const searchPacientes = async (q: string) => {
    setSearch(q);
    if (!q.trim()) { setPacientes([]); return; }
    try {
      const res = await fetchWithAuth(`/api/patients?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setPacientes(Array.isArray(data) ? data : []);
    } catch {}
  };

  const selectPaciente = async (p: Paciente) => {
    setSelectedPaciente(p);
    setSelectedProntuario(null);
    setPacientes([]);
    setSearch('');
    setLoadingPront(true);
    try {
      const res = await fetchWithAuth(`/api/prontuario?pacienteId=${p.id}`);
      const data = await res.json();
      const odonto = (Array.isArray(data) ? data : []).filter((r: any) => r.tipo === 'ODONTOLOGICO');
      setProntuarios(odonto);
      if (odonto.length > 0) setSelectedProntuario(odonto[0]);
    } catch {}
    finally { setLoadingPront(false); }
  };

  const criarProntuario = async () => {
    if (!selectedPaciente) return;
    setCriandoProntuario(true);
    try {
      const res = await fetchWithAuth('/api/prontuario', {
        method: 'POST',
        body: JSON.stringify({
          pacienteId: selectedPaciente.id,
          tipo: 'ODONTOLOGICO',
          queixaPrincipal: 'Avaliação inicial',
        }),
      });
      const data = await res.json();
      if (data.success) {
        await selectPaciente(selectedPaciente);
      }
    } catch {}
    finally { setCriandoProntuario(false); }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-10 pb-40 animate-premium">

      {/* Header */}
      <div className="bg-white border border-card-border p-10 rounded-[3rem] shadow-sm flex items-center gap-6">
        <div className="w-14 h-14 rounded-3xl bg-primary text-white flex items-center justify-center text-3xl shadow-xl shadow-primary/20">🦷</div>
        <div>
          <h2 className="text-2xl font-black italic uppercase tracking-tighter text-text-main">
            Odontograma Digital
          </h2>
          <p className="text-[10px] font-black text-text-placeholder uppercase tracking-[0.25em] mt-1 opacity-60">
            Mapa dental interativo — ISO 3950
          </p>
        </div>
      </div>

      {/* Seleção de paciente */}
      <div className="bg-white border border-card-border p-8 rounded-[2.5rem] shadow-sm space-y-4">
        <label className="text-[9px] font-black uppercase tracking-[0.25em] text-text-placeholder">
          Selecione o Paciente
        </label>
        <div className="relative">
          <input
            value={search}
            onChange={e => searchPacientes(e.target.value)}
            placeholder="Buscar por nome ou telefone..."
            className="input-premium w-full py-4 text-sm"
          />
          {pacientes.length > 0 && (
            <div className="absolute top-full left-0 right-0 bg-white border border-card-border rounded-2xl shadow-xl z-20 mt-1 overflow-hidden">
              {pacientes.map(p => (
                <button key={p.id} onClick={() => selectPaciente(p)}
                  className="w-full px-6 py-4 text-left hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0">
                  <p className="font-black text-text-main text-sm uppercase tracking-tight">{p.nome}</p>
                  <p className="text-[10px] text-text-muted font-mono mt-0.5">{p.telefone}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        {selectedPaciente && (
          <div className="flex items-center justify-between bg-primary-soft border border-primary/10 rounded-2xl px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center font-black text-sm">
                {selectedPaciente.nome.charAt(0)}
              </div>
              <div>
                <p className="font-black text-text-main text-sm uppercase tracking-tight">{selectedPaciente.nome}</p>
                <p className="text-[10px] text-text-muted font-mono">{selectedPaciente.telefone}</p>
              </div>
            </div>
            {prontuarios.length > 0 && (
              <select
                value={selectedProntuario?.id || ''}
                onChange={e => setSelectedProntuario(prontuarios.find(p => p.id === e.target.value) || null)}
                className="input-premium py-2 text-xs max-w-[200px]">
                {prontuarios.map(p => (
                  <option key={p.id} value={p.id}>
                    {new Date(p.createdAt).toLocaleDateString('pt-BR')} — {p.queixaPrincipal?.slice(0, 20) || 'Registro'}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}
      </div>

      {/* Odontograma */}
      {selectedPaciente && (
        loadingPront ? (
          <div className="py-20 text-center text-[10px] font-black uppercase tracking-widest text-text-placeholder animate-pulse">
            Carregando prontuários...
          </div>
        ) : selectedProntuario ? (
          <OdontogramaDigital
            prontuarioId={selectedProntuario.id}
            pacienteId={selectedPaciente.id}
            tenantId={tenantId}
          />
        ) : (
          <div className="bg-white border border-card-border rounded-[2.5rem] p-16 text-center shadow-sm space-y-6">
            <p className="text-5xl">🦷</p>
            <div>
              <p className="font-black text-text-main text-lg uppercase tracking-tight">Nenhum prontuário odontológico</p>
              <p className="text-sm text-text-muted mt-2">Crie o primeiro prontuário para iniciar o odontograma deste paciente.</p>
            </div>
            <button onClick={criarProntuario} disabled={criandoProntuario} className="btn-primary mx-auto px-8 py-4 text-[10px]">
              {criandoProntuario ? 'Criando...' : 'Criar Prontuário Odontológico'}
            </button>
          </div>
        )
      )}

      {!selectedPaciente && (
        <div className="bg-white border border-card-border rounded-[2.5rem] py-24 text-center shadow-sm opacity-30">
          <p className="text-5xl mb-4">🦷</p>
          <p className="font-black text-text-placeholder text-xs uppercase tracking-[0.3em]">Selecione um paciente para ver o odontograma</p>
        </div>
      )}
    </div>
  );
}
