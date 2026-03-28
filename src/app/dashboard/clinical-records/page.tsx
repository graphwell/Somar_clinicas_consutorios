"use client";
import React, { useState, useEffect } from 'react';
import { useNicho } from '@/context/NichoContext';
import { fetchWithAuth } from '@/lib/api-utils';

type Registro = {
  id: string;
  tipo: string;
  createdAt: string;
  queixaPrincipal?: string;
  conduta?: string;
  hipoteseDiagnostica?: string;
  historiaMolestia?: string;
  historicoMedico?: string;
  medicamentosUso?: string;
  alergias?: string;
  exameSolicitado?: string;
  exameResultado?: string;
  historicoAlimentar?: string;
  restricoes?: string;
  objetivoPaciente?: string;
  planoAlimentar?: string;
  metas?: string;
  recordatorio24h?: string;
  profissional?: { nome: string };
  medidas?: {
    peso?: number; altura?: number; imc?: number; percGordura?: number;
    circAbdominal?: number; circQuadril?: number; circBraco?: number; circCoxa?: number;
  }[];
};

type Paciente = { id: string; nome: string; telefone: string };

function FormInput({ label, value, onChange, multiline = false, placeholder = '' }: {
  label: string; value: string; onChange: (v: string) => void; multiline?: boolean; placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-[9px] font-black uppercase tracking-[0.25em] text-text-placeholder ml-1">{label}</label>
      {multiline ? (
        <textarea rows={3} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
          className="input-premium w-full py-3 text-sm resize-none" />
      ) : (
        <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
          className="input-premium w-full py-3 text-sm" />
      )}
    </div>
  );
}

function FormNumber({ label, value, onChange, unit = '' }: {
  label: string; value: string; onChange: (v: string) => void; unit?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-[9px] font-black uppercase tracking-[0.25em] text-text-placeholder ml-1">{label}{unit && ` (${unit})`}</label>
      <input type="number" step="0.1" value={value} onChange={e => onChange(e.target.value)}
        className="input-premium w-full py-3 text-sm" />
    </div>
  );
}

export default function ClinicalRecordsPage() {
  const { labels } = useNicho();
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [searchP, setSearchP] = useState('');
  const [selectedPaciente, setSelectedPaciente] = useState<Paciente | null>(null);
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [loadingReg, setLoadingReg] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  // Campos comuns
  const [queixaPrincipal, setQueixaPrincipal] = useState('');
  const [historiaMolestia, setHistoriaMolestia] = useState('');
  const [historicoMedico, setHistoricoMedico] = useState('');
  const [medicamentosUso, setMedicamentosUso] = useState('');
  const [alergias, setAlergias] = useState('');
  const [exameSolicitado, setExameSolicitado] = useState('');
  const [exameResultado, setExameResultado] = useState('');
  const [hipoteseDiagnostica, setHipoteseDiagnostica] = useState('');
  const [conduta, setConduta] = useState('');
  // Nutricional
  const [historicoAlimentar, setHistoricoAlimentar] = useState('');
  const [restricoes, setRestricoes] = useState('');
  const [objetivoPaciente, setObjetivoPaciente] = useState('');
  const [planoAlimentar, setPlanoAlimentar] = useState('');
  const [recordatorio24h, setRecordatorio24h] = useState('');
  const [metas, setMetas] = useState('');
  // Medidas
  const [peso, setPeso] = useState('');
  const [altura, setAltura] = useState('');
  const [percGordura, setPercGordura] = useState('');
  const [circAbdominal, setCircAbdominal] = useState('');
  const [circQuadril, setCircQuadril] = useState('');
  const [circBraco, setCircBraco] = useState('');
  const [circCoxa, setCircCoxa] = useState('');

  const tipo = labels.tipoProntuario || 'CLINICO';

  const imc = peso && altura
    ? (parseFloat(peso) / (parseFloat(altura) * parseFloat(altura))).toFixed(1)
    : '';

  const searchPacientes = async (q: string) => {
    setSearchP(q);
    if (!q.trim()) { setPacientes([]); return; }
    try {
      const res = await fetchWithAuth(`/api/patients?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setPacientes(Array.isArray(data) ? data : []);
    } catch {}
  };

  const selectPaciente = async (p: Paciente) => {
    setSelectedPaciente(p);
    setPacientes([]);
    setSearchP('');
    setLoadingReg(true);
    try {
      const res = await fetchWithAuth(`/api/prontuario?pacienteId=${p.id}`);
      const data = await res.json();
      setRegistros(Array.isArray(data) ? data : []);
    } catch {}
    finally { setLoadingReg(false); }
  };

  const resetForm = () => {
    setQueixaPrincipal(''); setHistoriaMolestia(''); setHistoricoMedico('');
    setMedicamentosUso(''); setAlergias(''); setExameSolicitado('');
    setExameResultado(''); setHipoteseDiagnostica(''); setConduta('');
    setHistoricoAlimentar(''); setRestricoes(''); setObjetivoPaciente('');
    setPlanoAlimentar(''); setRecordatorio24h(''); setMetas('');
    setPeso(''); setAltura(''); setPercGordura('');
    setCircAbdominal(''); setCircQuadril(''); setCircBraco(''); setCircCoxa('');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPaciente) return;
    setSaving(true);
    try {
      await fetchWithAuth('/api/prontuario', {
        method: 'POST',
        body: JSON.stringify({
          pacienteId: selectedPaciente.id,
          tipo,
          queixaPrincipal, historiaMolestia, historicoMedico, medicamentosUso,
          alergias, exameSolicitado, exameResultado, hipoteseDiagnostica, conduta,
          historicoAlimentar, restricoes, objetivoPaciente, planoAlimentar,
          recordatorio24h, metas,
          medidas: tipo === 'NUTRICIONAL' ? { peso, altura, percGordura, circAbdominal, circQuadril, circBraco, circCoxa } : undefined,
        }),
      });
      setShowForm(false);
      resetForm();
      await selectPaciente(selectedPaciente);
    } catch {}
    finally { setSaving(false); }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-10 pb-40 animate-premium">

      {/* Header */}
      <div className="bg-white border border-card-border p-10 rounded-[3rem] shadow-sm flex items-center gap-6">
        <div className="w-14 h-14 rounded-3xl bg-primary text-white flex items-center justify-center text-3xl shadow-xl shadow-primary/20">
          {tipo === 'ODONTOLOGICO' ? '🦷' : tipo === 'NUTRICIONAL' ? '🥗' : '🩺'}
        </div>
        <div>
          <h2 className="text-2xl font-black italic uppercase tracking-tighter text-text-main">
            {labels.termoProntuario}
          </h2>
          <p className="text-[10px] font-black text-text-placeholder uppercase tracking-[0.25em] mt-1 opacity-60">
            Histórico clínico dos {labels.termoPacientePlural.toLowerCase()}
          </p>
        </div>
      </div>

      {/* Busca de paciente */}
      <div className="bg-white border border-card-border p-8 rounded-[2.5rem] shadow-sm space-y-4">
        <label className="text-[9px] font-black uppercase tracking-[0.25em] text-text-placeholder">
          Selecione o {labels.termoPaciente}
        </label>
        <div className="relative">
          <input
            value={searchP}
            onChange={e => searchPacientes(e.target.value)}
            placeholder={`Buscar ${labels.termoPaciente.toLowerCase()} por nome ou telefone...`}
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
            <button onClick={() => { setShowForm(true); resetForm(); }}
              className="btn-primary py-2.5 px-6 text-[10px]">
              + Nova Evolução
            </button>
          </div>
        )}
      </div>

      {/* Formulário novo registro */}
      {showForm && selectedPaciente && (
        <div className="bg-white border border-card-border p-10 rounded-[2.5rem] shadow-sm">
          <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-50">
            <div>
              <h3 className="text-xl font-black italic uppercase tracking-tighter text-text-main">Nova Evolução</h3>
              <p className="text-[10px] text-text-placeholder font-black uppercase tracking-widest mt-1 opacity-60">
                {selectedPaciente.nome} · {tipo}
              </p>
            </div>
            <button onClick={() => { setShowForm(false); resetForm(); }}
              className="w-10 h-10 rounded-xl hover:bg-slate-50 flex items-center justify-center text-text-placeholder">✕</button>
          </div>

          <form onSubmit={handleSave} className="space-y-8">

            {/* CLÍNICO e NUTRICIONAL: campos comuns */}
            {(tipo === 'CLINICO' || tipo === 'NUTRICIONAL' || tipo === 'ODONTOLOGICO') && (
              <div className="space-y-4">
                <FormInput label="Queixa Principal" value={queixaPrincipal} onChange={setQueixaPrincipal} multiline placeholder="Motivo principal da consulta..." />
                <FormInput label="Alergias" value={alergias} onChange={setAlergias} placeholder="Medicamentos, alimentos, outros..." />
                <FormInput label="Medicamentos em Uso" value={medicamentosUso} onChange={setMedicamentosUso} multiline placeholder="Liste os medicamentos atuais..." />
              </div>
            )}

            {/* CLÍNICO */}
            {tipo === 'CLINICO' && (
              <div className="space-y-4 border-t border-slate-50 pt-6">
                <p className="text-[9px] font-black uppercase tracking-widest text-text-placeholder">Avaliação Clínica</p>
                <FormInput label="História da Doença Atual" value={historiaMolestia} onChange={setHistoriaMolestia} multiline />
                <FormInput label="Histórico Médico" value={historicoMedico} onChange={setHistoricoMedico} multiline />
                <FormInput label="Exame Solicitado" value={exameSolicitado} onChange={setExameSolicitado} />
                <FormInput label="Resultado do Exame" value={exameResultado} onChange={setExameResultado} multiline />
                <FormInput label="Hipótese Diagnóstica" value={hipoteseDiagnostica} onChange={setHipoteseDiagnostica} />
                <FormInput label="Conduta / Tratamento" value={conduta} onChange={setConduta} multiline placeholder="Prescrição, orientações, encaminhamentos..." />
              </div>
            )}

            {/* ODONTOLÓGICO */}
            {tipo === 'ODONTOLOGICO' && (
              <div className="space-y-4 border-t border-slate-50 pt-6">
                <p className="text-[9px] font-black uppercase tracking-widest text-text-placeholder">Avaliação Odontológica</p>
                <FormInput label="Histórico de Saúde Geral" value={historicoMedico} onChange={setHistoricoMedico} multiline />
                <FormInput label="Procedimento Realizado" value={conduta} onChange={setConduta} multiline placeholder="Descreva o procedimento realizado nesta sessão..." />
                <FormInput label="Plano de Tratamento" value={hipoteseDiagnostica} onChange={setHipoteseDiagnostica} multiline placeholder="Procedimentos futuros planejados..." />
                <FormInput label="Observações" value={historiaMolestia} onChange={setHistoriaMolestia} multiline />
              </div>
            )}

            {/* NUTRICIONAL */}
            {tipo === 'NUTRICIONAL' && (
              <>
                <div className="space-y-4 border-t border-slate-50 pt-6">
                  <p className="text-[9px] font-black uppercase tracking-widest text-text-placeholder">Avaliação Nutricional</p>
                  <FormInput label="Objetivo do Paciente" value={objetivoPaciente} onChange={setObjetivoPaciente} />
                  <FormInput label="Histórico Alimentar" value={historicoAlimentar} onChange={setHistoricoAlimentar} multiline />
                  <FormInput label="Restrições e Alergias Alimentares" value={restricoes} onChange={setRestricoes} multiline />
                  <FormInput label="Recordatório Alimentar 24h" value={recordatorio24h} onChange={setRecordatorio24h} multiline />
                  <FormInput label="Plano Alimentar do Período" value={planoAlimentar} onChange={setPlanoAlimentar} multiline />
                  <FormInput label="Metas Estabelecidas" value={metas} onChange={setMetas} multiline />
                </div>
                <div className="border-t border-slate-50 pt-6 space-y-4">
                  <p className="text-[9px] font-black uppercase tracking-widest text-text-placeholder">Medidas Corporais</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <FormNumber label="Peso" value={peso} onChange={setPeso} unit="kg" />
                    <FormNumber label="Altura" value={altura} onChange={setAltura} unit="m" />
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black uppercase tracking-[0.25em] text-text-placeholder ml-1">IMC (calculado)</label>
                      <div className="input-premium py-3 text-sm font-black text-primary bg-primary-soft border-primary/20">
                        {imc || '—'}
                      </div>
                    </div>
                    <FormNumber label="% Gordura" value={percGordura} onChange={setPercGordura} unit="%" />
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <FormNumber label="Circ. Abdominal" value={circAbdominal} onChange={setCircAbdominal} unit="cm" />
                    <FormNumber label="Circ. Quadril" value={circQuadril} onChange={setCircQuadril} unit="cm" />
                    <FormNumber label="Circ. Braço" value={circBraco} onChange={setCircBraco} unit="cm" />
                    <FormNumber label="Circ. Coxa" value={circCoxa} onChange={setCircCoxa} unit="cm" />
                  </div>
                </div>
              </>
            )}

            <div className="flex gap-4 pt-4">
              <button type="button" onClick={() => { setShowForm(false); resetForm(); }}
                className="flex-1 py-4 rounded-2xl bg-slate-100 text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all">
                Cancelar
              </button>
              <button type="submit" disabled={saving} className="btn-primary flex-1 py-4 text-[10px]">
                {saving ? 'Salvando...' : 'Registrar Evolução'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista de registros */}
      {selectedPaciente && (
        <div className="space-y-6">
          {loadingReg ? (
            <div className="py-20 text-center text-[10px] font-black uppercase tracking-widest text-text-placeholder animate-pulse">
              Carregando histórico...
            </div>
          ) : registros.length === 0 ? (
            <div className="py-20 text-center bg-white border border-card-border rounded-[2.5rem] text-text-placeholder font-black text-xs uppercase tracking-widest opacity-30">
              Sem registros para este {labels.termoPaciente.toLowerCase()}
            </div>
          ) : (
            registros.map(r => (
              <div key={r.id} className="bg-white border border-card-border rounded-[2.5rem] p-10 space-y-6 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-50 pb-6">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-text-placeholder">
                      {new Date(r.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                    </p>
                    {r.profissional && (
                      <p className="text-[11px] font-black text-text-muted mt-1">
                        {labels.tratamentoProfissional ? `${labels.tratamentoProfissional} ` : ''}{r.profissional.nome}
                      </p>
                    )}
                  </div>
                  <span className="text-[9px] font-black uppercase px-3 py-1.5 bg-primary-soft text-primary rounded-xl border border-primary/10">
                    {r.tipo}
                  </span>
                </div>

                {r.queixaPrincipal && (
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-text-placeholder mb-2">Queixa Principal</p>
                    <p className="text-sm text-text-main font-medium leading-relaxed">{r.queixaPrincipal}</p>
                  </div>
                )}
                {r.conduta && (
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-text-placeholder mb-2">Conduta / Procedimento</p>
                    <p className="text-sm text-text-main font-medium leading-relaxed">{r.conduta}</p>
                  </div>
                )}
                {r.hipoteseDiagnostica && (
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-text-placeholder mb-2">Diagnóstico / Plano de Tratamento</p>
                    <p className="text-sm text-text-main font-medium leading-relaxed">{r.hipoteseDiagnostica}</p>
                  </div>
                )}
                {r.planoAlimentar && (
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-text-placeholder mb-2">Plano Alimentar</p>
                    <p className="text-sm text-text-main font-medium leading-relaxed whitespace-pre-line">{r.planoAlimentar}</p>
                  </div>
                )}
                {r.medidas && r.medidas.length > 0 && (() => {
                  const m = r.medidas[0];
                  return (
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-text-placeholder mb-3">Medidas Corporais</p>
                      <div className="grid grid-cols-4 gap-3">
                        {m.peso && <div className="text-center bg-slate-50 border border-card-border rounded-xl py-3"><p className="text-[8px] font-black uppercase text-text-placeholder mb-1">Peso</p><p className="font-black text-text-main">{m.peso} kg</p></div>}
                        {m.altura && <div className="text-center bg-slate-50 border border-card-border rounded-xl py-3"><p className="text-[8px] font-black uppercase text-text-placeholder mb-1">Altura</p><p className="font-black text-text-main">{m.altura} m</p></div>}
                        {m.imc && <div className="text-center bg-primary-soft border border-primary/10 rounded-xl py-3"><p className="text-[8px] font-black uppercase text-primary mb-1">IMC</p><p className="font-black text-primary">{m.imc}</p></div>}
                        {m.percGordura && <div className="text-center bg-slate-50 border border-card-border rounded-xl py-3"><p className="text-[8px] font-black uppercase text-text-placeholder mb-1">% Gordura</p><p className="font-black text-text-main">{m.percGordura}%</p></div>}
                      </div>
                    </div>
                  );
                })()}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
