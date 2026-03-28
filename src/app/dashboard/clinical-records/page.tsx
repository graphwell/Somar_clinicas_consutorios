"use client";
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNicho } from '@/context/NichoContext';
import { fetchWithAuth } from '@/lib/api-utils';

// ─── Types ────────────────────────────────────────────────────────────────────

type Paciente = { id: string; nome: string; telefone: string; dataNascimento?: string; cpf?: string; convenio?: string };
type Alergia = { id: string; descricao: string; gravidade: string };
type Medicamento = { id: string; nome: string; dosagem?: string; frequencia?: string; uso: string; ativo: boolean };
type Evolucao = {
  id: string; createdAt: string; tipo: string;
  queixaPrincipal?: string; evolucao?: string; conduta?: string;
  hipoteseDiagnostica?: string; cidCodigo?: string; cidDescricao?: string;
  pressaoSistolica?: number; pressaoDiastolica?: number; temperatura?: number; saturacao?: number; glicemia?: number;
  retornoEm?: string;
  profissional?: { id: string; nome: string };
  medidas?: { peso?: number; altura?: number; imc?: number }[];
  arquivos?: { id: string; nome: string; tipo: string; url: string }[];
  _count?: { arquivos: number };
};
type Contexto = { paciente: Paciente; alergias: Alergia[]; medicamentos: Medicamento[]; ultimaEvolucao?: Evolucao | null };
type Metricas = {
  vitais: { createdAt: string; pressaoSistolica?: number; pressaoDiastolica?: number; temperatura?: number; saturacao?: number; glicemia?: number }[];
  medidas: { createdAt: string; peso?: number; imc?: number }[];
};
type Template = { id: string; nome: string; isGlobal?: boolean; campos: Record<string, string> };

// ─── CID-10 (top 60 mais comuns) ─────────────────────────────────────────────
const CID_LIST = [
  { code: 'Z00.0', desc: 'Exame médico geral' }, { code: 'Z00.1', desc: 'Triagem de rotina' },
  { code: 'J06', desc: 'Infecção aguda das VAS' }, { code: 'J00', desc: 'Rinofaringite aguda' },
  { code: 'J02', desc: 'Faringite aguda' }, { code: 'J03', desc: 'Amigdalite aguda' },
  { code: 'J18', desc: 'Pneumonia não especificada' }, { code: 'J20', desc: 'Bronquite aguda' },
  { code: 'K21.0', desc: 'Refluxo gastroesofágico com esofagite' }, { code: 'K29', desc: 'Gastrite e duodenite' },
  { code: 'K52', desc: 'Gastroenterite não infecciosa' }, { code: 'K57', desc: 'Doença diverticular' },
  { code: 'I10', desc: 'Hipertensão essencial' }, { code: 'I25', desc: 'Doença isquêmica crônica do coração' },
  { code: 'E11', desc: 'Diabetes mellitus tipo 2' }, { code: 'E10', desc: 'Diabetes mellitus tipo 1' },
  { code: 'E78', desc: 'Dislipidemia' }, { code: 'E66', desc: 'Obesidade' },
  { code: 'M54.5', desc: 'Lombalgia' }, { code: 'M54.2', desc: 'Cervicalgia' },
  { code: 'M54.4', desc: 'Lumbago com ciática' }, { code: 'M79.3', desc: 'Paniculite' },
  { code: 'F32', desc: 'Episódio depressivo' }, { code: 'F41.0', desc: 'Transtorno de pânico' },
  { code: 'F41.1', desc: 'Ansiedade generalizada' }, { code: 'F40', desc: 'Transtorno fóbico-ansioso' },
  { code: 'N39.0', desc: 'Infecção do trato urinário' }, { code: 'N10', desc: 'Pielonefrite aguda' },
  { code: 'N76', desc: 'Inflamação vaginal' }, { code: 'N95.1', desc: 'Menopausa' },
  { code: 'G43', desc: 'Enxaqueca' }, { code: 'G44.3', desc: 'Cefaleia crônica diária' },
  { code: 'G40', desc: 'Epilepsia' }, { code: 'G20', desc: 'Doença de Parkinson' },
  { code: 'J45', desc: 'Asma' }, { code: 'J44', desc: 'DPOC' }, { code: 'J30', desc: 'Rinite alérgica' },
  { code: 'L20', desc: 'Dermatite atópica' }, { code: 'L50', desc: 'Urticária' },
  { code: 'L70', desc: 'Acne' }, { code: 'B34.9', desc: 'Infecção viral inespecífica' },
  { code: 'A09', desc: 'Diarreia e gastroenterite infecciosa' }, { code: 'A90', desc: 'Dengue' },
  { code: 'R05', desc: 'Tosse' }, { code: 'R06', desc: 'Dispneia' }, { code: 'R50', desc: 'Febre' },
  { code: 'R51', desc: 'Cefaleia' }, { code: 'R10', desc: 'Dor abdominal' }, { code: 'R07', desc: 'Dor torácica' },
];

// ─── Sparkline chart ──────────────────────────────────────────────────────────
function Sparkline({ values, color = '#4a4ae2', width = 100, height = 32 }: { values: number[]; color?: string; width?: number; height?: number }) {
  if (values.length < 2) return null;
  const min = Math.min(...values); const max = Math.max(...values); const range = max - min || 1;
  const pts = values.map((v, i) => ({
    x: (i / (values.length - 1)) * width,
    y: height - 4 - ((v - min) / range) * (height - 8),
  }));
  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const last = pts[pts.length - 1];
  const trend = values[values.length - 1] > values[0];
  return (
    <svg width={width} height={height} className="overflow-visible">
      <path d={d} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.7" />
      <circle cx={last.x} cy={last.y} r="2.5" fill={color} />
    </svg>
  );
}

// ─── Coluna Esquerda ──────────────────────────────────────────────────────────
function ColunaEsquerda({ ctx, pacienteId, onContextoUpdate, labels }: {
  ctx: Contexto; pacienteId: string;
  onContextoUpdate: () => void;
  labels: any;
}) {
  const { paciente, alergias, medicamentos } = ctx;
  const [novaAlergia, setNovaAlergia] = useState('');
  const [gravidade, setGravidade] = useState('MODERADA');
  const [showAlergiaForm, setShowAlergiaForm] = useState(false);
  const [novoMed, setNovoMed] = useState('');
  const [dosagemMed, setDosagemMed] = useState('');
  const [showMedForm, setShowMedForm] = useState(false);

  const idade = paciente.dataNascimento
    ? Math.floor((Date.now() - new Date(paciente.dataNascimento).getTime()) / (1000 * 60 * 60 * 24 * 365.25))
    : null;

  const addAlergia = async () => {
    if (!novaAlergia.trim()) return;
    await fetchWithAuth(`/api/prontuario/${pacienteId}/alergias`, {
      method: 'POST', body: JSON.stringify({ descricao: novaAlergia, gravidade }),
    });
    setNovaAlergia(''); setShowAlergiaForm(false); onContextoUpdate();
  };

  const delAlergia = async (id: string) => {
    await fetchWithAuth(`/api/prontuario/${pacienteId}/alergias/${id}`, { method: 'DELETE' });
    onContextoUpdate();
  };

  const addMed = async () => {
    if (!novoMed.trim()) return;
    await fetchWithAuth(`/api/prontuario/${pacienteId}/medicamentos`, {
      method: 'POST', body: JSON.stringify({ nome: novoMed, dosagem: dosagemMed }),
    });
    setNovoMed(''); setDosagemMed(''); setShowMedForm(false); onContextoUpdate();
  };

  const inativarMed = async (id: string) => {
    await fetchWithAuth(`/api/prontuario/${pacienteId}/medicamentos/${id}`, {
      method: 'PUT', body: JSON.stringify({ ativo: false }),
    });
    onContextoUpdate();
  };

  const GRAV_COLOR: Record<string, string> = { GRAVE: 'bg-red-100 text-red-700 border-red-200', MODERADA: 'bg-amber-50 text-amber-700 border-amber-200', LEVE: 'bg-green-50 text-green-700 border-green-200' };

  return (
    <div className="flex flex-col gap-4 h-full overflow-y-auto no-scrollbar pb-4">
      {/* Avatar + info */}
      <div className="bg-white border border-card-border rounded-2xl p-5 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-primary text-white flex items-center justify-center text-xl font-black shrink-0">
            {paciente.nome.charAt(0)}
          </div>
          <div className="min-w-0">
            <p className="font-black text-text-main text-sm uppercase tracking-tight truncate">{paciente.nome}</p>
            <p className="text-[9px] text-text-muted font-mono">{paciente.telefone}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 text-center">
          {idade !== null && (
            <div className="bg-slate-50 rounded-xl py-2">
              <p className="text-base font-black text-text-main">{idade}</p>
              <p className="text-[8px] font-black uppercase text-text-placeholder opacity-60">anos</p>
            </div>
          )}
          {paciente.convenio && (
            <div className="bg-primary-soft rounded-xl py-2">
              <p className="text-[9px] font-black text-primary uppercase tracking-tight">{paciente.convenio}</p>
              <p className="text-[8px] font-black uppercase text-text-placeholder opacity-60">convênio</p>
            </div>
          )}
        </div>
      </div>

      {/* Alergias */}
      <div className={`border rounded-2xl p-4 space-y-2 ${alergias.length > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-card-border'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {alergias.length > 0 && <span className="text-base">⚠️</span>}
            <p className="text-[9px] font-black uppercase tracking-widest text-red-700">Alergias</p>
          </div>
          <button onClick={() => setShowAlergiaForm(!showAlergiaForm)}
            className="text-[9px] font-black text-primary hover:underline uppercase">+ Add</button>
        </div>
        {alergias.length === 0 && !showAlergiaForm && (
          <p className="text-[9px] text-text-placeholder italic">Nenhuma alergia registrada</p>
        )}
        {alergias.map(a => (
          <div key={a.id} className="flex items-center justify-between gap-2">
            <span className={`text-[9px] font-black px-2 py-0.5 rounded-lg border ${GRAV_COLOR[a.gravidade] || GRAV_COLOR.MODERADA}`}>
              {a.descricao}
            </span>
            <button onClick={() => delAlergia(a.id)} className="text-red-300 hover:text-red-600 text-xs font-black">×</button>
          </div>
        ))}
        {showAlergiaForm && (
          <div className="space-y-2 pt-1">
            <input value={novaAlergia} onChange={e => setNovaAlergia(e.target.value)}
              placeholder="Ex: Dipirona" className="input-premium w-full py-2 text-xs" />
            <select value={gravidade} onChange={e => setGravidade(e.target.value)}
              className="input-premium w-full py-2 text-xs">
              <option value="LEVE">Leve</option>
              <option value="MODERADA">Moderada</option>
              <option value="GRAVE">Grave</option>
            </select>
            <div className="flex gap-2">
              <button onClick={addAlergia} className="btn-primary flex-1 py-2 text-[9px]">Salvar</button>
              <button onClick={() => setShowAlergiaForm(false)} className="flex-1 py-2 bg-slate-100 rounded-xl text-[9px] font-black">Cancelar</button>
            </div>
          </div>
        )}
      </div>

      {/* Medicamentos */}
      <div className="bg-white border border-card-border rounded-2xl p-4 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-[9px] font-black uppercase tracking-widest text-text-placeholder">💊 Medicamentos</p>
          <button onClick={() => setShowMedForm(!showMedForm)}
            className="text-[9px] font-black text-primary hover:underline uppercase">+ Add</button>
        </div>
        {medicamentos.length === 0 && !showMedForm && (
          <p className="text-[9px] text-text-placeholder italic">Sem medicamentos ativos</p>
        )}
        {medicamentos.filter(m => m.ativo).map(m => (
          <div key={m.id} className="flex items-start justify-between gap-1">
            <div>
              <p className="text-[10px] font-black text-text-main">{m.nome}</p>
              {m.dosagem && <p className="text-[9px] text-text-muted">{m.dosagem}</p>}
            </div>
            <button onClick={() => inativarMed(m.id)} className="text-[8px] text-text-placeholder hover:text-red-500 font-black shrink-0">×</button>
          </div>
        ))}
        {showMedForm && (
          <div className="space-y-2 pt-1">
            <input value={novoMed} onChange={e => setNovoMed(e.target.value)}
              placeholder="Nome do medicamento" className="input-premium w-full py-2 text-xs" />
            <input value={dosagemMed} onChange={e => setDosagemMed(e.target.value)}
              placeholder="Dosagem (ex: 500mg 2x/dia)" className="input-premium w-full py-2 text-xs" />
            <div className="flex gap-2">
              <button onClick={addMed} className="btn-primary flex-1 py-2 text-[9px]">Salvar</button>
              <button onClick={() => setShowMedForm(false)} className="flex-1 py-2 bg-slate-100 rounded-xl text-[9px] font-black">Cancelar</button>
            </div>
          </div>
        )}
      </div>

      {/* Última consulta */}
      {ctx.ultimaEvolucao && (
        <div className="bg-white border border-card-border rounded-2xl p-4 space-y-1">
          <p className="text-[9px] font-black uppercase tracking-widest text-text-placeholder">Última Consulta</p>
          <p className="text-[10px] font-black text-text-main">
            {new Date(ctx.ultimaEvolucao.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
          </p>
          {ctx.ultimaEvolucao.profissional && (
            <p className="text-[9px] text-text-muted">{labels.tratamentoProfissional} {ctx.ultimaEvolucao.profissional.nome}</p>
          )}
          {ctx.ultimaEvolucao.queixaPrincipal && (
            <p className="text-[9px] text-text-muted italic truncate">"{ctx.ultimaEvolucao.queixaPrincipal}"</p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Vitais strip ─────────────────────────────────────────────────────────────
type VitaisState = { pressaoSistolica: string; pressaoDiastolica: string; temperatura: string; saturacao: string; glicemia: string };

function VitaisStrip({ vitais, onChange }: { vitais: VitaisState; onChange: (k: keyof VitaisState, v: string) => void }) {
  const campos = [
    { k: 'pressaoSistolica' as const, label: 'PA Sist.', unit: 'mmHg', placeholder: '120', warn: (v: number) => v > 140 || v < 90 },
    { k: 'pressaoDiastolica' as const, label: 'PA Diast.', unit: 'mmHg', placeholder: '80', warn: (v: number) => v > 90 || v < 60 },
    { k: 'temperatura' as const, label: 'Temp.', unit: '°C', placeholder: '36.5', warn: (v: number) => v > 37.8 || v < 35.5 },
    { k: 'saturacao' as const, label: 'SpO₂', unit: '%', placeholder: '98', warn: (v: number) => v < 94 },
    { k: 'glicemia' as const, label: 'Glicemia', unit: 'mg/dL', placeholder: '100', warn: (v: number) => v > 126 || v < 70 },
  ];

  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
      {campos.map(({ k, label, unit, placeholder, warn }) => {
        const val = vitais[k];
        const isWarn = val && warn(parseFloat(val));
        return (
          <div key={k} className="shrink-0 space-y-1">
            <label className="text-[8px] font-black uppercase tracking-wider text-text-placeholder block">{label}</label>
            <div className={`relative rounded-xl border ${isWarn ? 'border-amber-400 bg-amber-50' : 'border-card-border bg-slate-50'}`}>
              <input
                type="number" step="0.1" value={val}
                onChange={e => onChange(k, e.target.value)}
                placeholder={placeholder}
                className="w-[72px] py-2 px-2 bg-transparent text-xs font-black text-text-main outline-none"
              />
              <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[8px] text-text-placeholder font-black">{unit}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── CID Search ───────────────────────────────────────────────────────────────
function CIDSearch({ value, descricao, onChange }: {
  value: string; descricao: string;
  onChange: (code: string, desc: string) => void;
}) {
  const [query, setQuery] = useState(value || '');
  const [open, setOpen] = useState(false);
  const results = query.length >= 2
    ? CID_LIST.filter(c => c.code.toLowerCase().includes(query.toLowerCase()) || c.desc.toLowerCase().includes(query.toLowerCase())).slice(0, 8)
    : [];

  return (
    <div className="relative">
      <label className="text-[9px] font-black uppercase tracking-widest text-text-placeholder block mb-1.5">CID-10</label>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input value={query} onChange={e => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            placeholder="Buscar CID-10 (ex: I10, hipertensão...)"
            className="input-premium w-full py-3 text-sm" />
          {open && results.length > 0 && (
            <div className="absolute top-full left-0 right-0 bg-white border border-card-border rounded-2xl shadow-xl z-30 mt-1 overflow-hidden max-h-48 overflow-y-auto no-scrollbar">
              {results.map(r => (
                <button key={r.code} onClick={() => { onChange(r.code, r.desc); setQuery(`${r.code} — ${r.desc}`); setOpen(false); }}
                  className="w-full px-4 py-2.5 text-left hover:bg-slate-50 flex items-center gap-3 border-b border-slate-50 last:border-0">
                  <span className="text-[10px] font-black text-primary font-mono">{r.code}</span>
                  <span className="text-[10px] text-text-muted">{r.desc}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        {value && (
          <button onClick={() => { onChange('', ''); setQuery(''); }}
            className="px-3 py-2 bg-slate-100 rounded-xl text-[10px] font-black text-text-placeholder hover:text-red-500">✕</button>
        )}
      </div>
      {value && <p className="text-[9px] text-primary font-black mt-1">{value} — {descricao}</p>}
    </div>
  );
}

// ─── Modal base ───────────────────────────────────────────────────────────────
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <>
      <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-50" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 w-full max-w-lg bg-white border-l border-card-border shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300">
        <div className="p-6 border-b border-slate-50 flex items-center justify-between shrink-0">
          <h3 className="text-lg font-black italic uppercase tracking-tighter text-text-main">{title}</h3>
          <button onClick={onClose} className="w-9 h-9 rounded-xl hover:bg-slate-50 flex items-center justify-center text-text-placeholder font-black">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto no-scrollbar">{children}</div>
      </div>
    </>
  );
}

// ─── Modal Receita ────────────────────────────────────────────────────────────
function ModalReceita({ pacienteNome, onClose, onSalvar }: { pacienteNome: string; onClose: () => void; onSalvar: (dados: any) => void }) {
  const [linhas, setLinhas] = useState([{ medicamento: '', dosagem: '', posologia: '', qtd: '' }]);
  const [obs, setObs] = useState('');
  const addLinha = () => setLinhas(p => [...p, { medicamento: '', dosagem: '', posologia: '', qtd: '' }]);
  const updateLinha = (i: number, k: string, v: string) => setLinhas(p => p.map((l, idx) => idx === i ? { ...l, [k]: v } : l));
  const remLinha = (i: number) => setLinhas(p => p.filter((_, idx) => idx !== i));

  return (
    <Modal title="Receita Digital" onClose={onClose}>
      <div className="p-6 space-y-6">
        <div className="bg-primary-soft border border-primary/10 rounded-2xl p-4">
          <p className="text-[9px] font-black uppercase tracking-widest text-text-placeholder">Paciente</p>
          <p className="font-black text-text-main text-sm uppercase tracking-tight mt-1">{pacienteNome}</p>
        </div>
        <div className="space-y-4">
          {linhas.map((l, i) => (
            <div key={i} className="border border-card-border rounded-2xl p-4 space-y-3 relative">
              {linhas.length > 1 && (
                <button onClick={() => remLinha(i)} className="absolute top-3 right-3 text-text-placeholder hover:text-red-500 font-black text-xs">×</button>
              )}
              <p className="text-[9px] font-black uppercase tracking-widest text-text-placeholder">Medicamento {i + 1}</p>
              <input value={l.medicamento} onChange={e => updateLinha(i, 'medicamento', e.target.value)}
                placeholder="Nome do medicamento" className="input-premium w-full py-2.5 text-sm" />
              <div className="grid grid-cols-3 gap-2">
                <input value={l.dosagem} onChange={e => updateLinha(i, 'dosagem', e.target.value)}
                  placeholder="Dosagem" className="input-premium py-2 text-xs" />
                <input value={l.posologia} onChange={e => updateLinha(i, 'posologia', e.target.value)}
                  placeholder="Posologia" className="input-premium py-2 text-xs" />
                <input value={l.qtd} onChange={e => updateLinha(i, 'qtd', e.target.value)}
                  placeholder="Qtd" className="input-premium py-2 text-xs" />
              </div>
            </div>
          ))}
          <button onClick={addLinha} className="w-full py-3 border-2 border-dashed border-card-border rounded-2xl text-[10px] font-black uppercase text-text-placeholder hover:border-primary hover:text-primary transition-colors">
            + Adicionar medicamento
          </button>
        </div>
        <div className="space-y-1.5">
          <label className="text-[9px] font-black uppercase tracking-widest text-text-placeholder">Observações</label>
          <textarea rows={2} value={obs} onChange={e => setObs(e.target.value)}
            className="input-premium w-full py-2 text-sm resize-none" />
        </div>
        <button onClick={() => onSalvar({ linhas, obs })} className="btn-primary w-full py-4 text-[10px]">
          Salvar Receita
        </button>
      </div>
    </Modal>
  );
}

// ─── Modal Atestado ───────────────────────────────────────────────────────────
function ModalAtestado({ pacienteNome, cidCodigo, onClose, onSalvar }: { pacienteNome: string; cidCodigo?: string; onClose: () => void; onSalvar: (dados: any) => void }) {
  const [tipo, setTipo] = useState('AFASTAMENTO');
  const [dias, setDias] = useState('');
  const [obs, setObs] = useState('');
  const dataHoje = new Date().toLocaleDateString('pt-BR');

  const TEXTOS: Record<string, string> = {
    AFASTAMENTO: `Atesto que o(a) paciente ${pacienteNome} necessita de afastamento de suas atividades pelo período de ${dias || '__'} dias, a partir de ${dataHoje}${cidCodigo ? `, CID: ${cidCodigo}` : ''}.`,
    COMPARECIMENTO: `Atesto que o(a) paciente ${pacienteNome} esteve em consulta médica nesta data (${dataHoje}).`,
    SAUDE: `Atesto que o(a) paciente ${pacienteNome} encontra-se em bom estado de saúde, apto(a) para suas atividades habituais.`,
  };

  return (
    <Modal title="Atestado Médico" onClose={onClose}>
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-3 gap-2">
          {[['AFASTAMENTO', 'Afastamento'], ['COMPARECIMENTO', 'Comparecimento'], ['SAUDE', 'Aptidão']].map(([v, l]) => (
            <button key={v} onClick={() => setTipo(v)}
              className={`py-3 rounded-2xl text-[10px] font-black uppercase border-2 transition-all ${tipo === v ? 'bg-primary text-white border-primary' : 'bg-slate-50 text-text-muted border-transparent hover:border-slate-200'}`}>
              {l}
            </button>
          ))}
        </div>
        {tipo === 'AFASTAMENTO' && (
          <div className="space-y-1.5">
            <label className="text-[9px] font-black uppercase tracking-widest text-text-placeholder">Dias de afastamento</label>
            <input type="number" value={dias} onChange={e => setDias(e.target.value)} placeholder="Ex: 3"
              className="input-premium w-full py-3 text-sm" />
          </div>
        )}
        <div className="bg-slate-50 border border-card-border rounded-2xl p-4">
          <p className="text-[9px] font-black uppercase tracking-widest text-text-placeholder mb-2">Prévia</p>
          <p className="text-xs text-text-main leading-relaxed">{TEXTOS[tipo]}</p>
        </div>
        <div className="space-y-1.5">
          <label className="text-[9px] font-black uppercase tracking-widest text-text-placeholder">Observações adicionais</label>
          <textarea rows={2} value={obs} onChange={e => setObs(e.target.value)}
            className="input-premium w-full py-2 text-sm resize-none" />
        </div>
        <button onClick={() => onSalvar({ tipo, dias, obs, texto: TEXTOS[tipo] })} className="btn-primary w-full py-4 text-[10px]">
          Salvar Atestado
        </button>
      </div>
    </Modal>
  );
}

// ─── Coluna Direita — Histórico ───────────────────────────────────────────────
function ColunaDireita({ evolucoes, metricas, selectedId, onSelect, labels }: {
  evolucoes: Evolucao[]; metricas: Metricas | null;
  selectedId: string | null; onSelect: (e: Evolucao) => void;
  labels: any;
}) {
  const [filtro, setFiltro] = useState<'TUDO' | 'CONSULTAS' | 'EXAMES'>('TUDO');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtradas = filtro === 'CONSULTAS' ? evolucoes.filter(e => !e._count?.arquivos) : evolucoes;
  const pesos = metricas?.medidas.filter(m => m.peso).map(m => m.peso!) || [];
  const sistolicas = metricas?.vitais.filter(v => v.pressaoSistolica).map(v => v.pressaoSistolica!) || [];
  const glicemias = metricas?.vitais.filter(v => v.glicemia).map(v => v.glicemia!) || [];

  return (
    <div className="flex flex-col h-full gap-4 overflow-y-auto no-scrollbar pb-4">
      {/* Mini charts */}
      {(pesos.length >= 2 || sistolicas.length >= 2 || glicemias.length >= 2) && (
        <div className="bg-white border border-card-border rounded-2xl p-4 space-y-3">
          <p className="text-[9px] font-black uppercase tracking-widest text-text-placeholder">Evolução Clínica</p>
          {pesos.length >= 2 && (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[9px] font-black text-text-muted uppercase">Peso</p>
                <p className="text-sm font-black text-text-main">{pesos[pesos.length - 1]} kg</p>
              </div>
              <Sparkline values={pesos} color="#4a4ae2" />
            </div>
          )}
          {sistolicas.length >= 2 && (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[9px] font-black text-text-muted uppercase">Pressão</p>
                <p className={`text-sm font-black ${sistolicas[sistolicas.length - 1] > 140 ? 'text-red-600' : 'text-text-main'}`}>
                  {sistolicas[sistolicas.length - 1]} mmHg
                </p>
              </div>
              <Sparkline values={sistolicas} color={sistolicas[sistolicas.length - 1] > 140 ? '#dc2626' : '#4a4ae2'} />
            </div>
          )}
          {glicemias.length >= 2 && (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[9px] font-black text-text-muted uppercase">Glicemia</p>
                <p className={`text-sm font-black ${glicemias[glicemias.length - 1] > 126 ? 'text-amber-600' : 'text-text-main'}`}>
                  {glicemias[glicemias.length - 1]} mg/dL
                </p>
              </div>
              <Sparkline values={glicemias} color={glicemias[glicemias.length - 1] > 126 ? '#d97706' : '#059669'} />
            </div>
          )}
        </div>
      )}

      {/* Filtro */}
      <div className="flex gap-1 bg-slate-100 rounded-2xl p-1">
        {([['TUDO', 'Tudo'], ['CONSULTAS', 'Consultas']] as [string, string][]).map(([v, l]) => (
          <button key={v} onClick={() => setFiltro(v as any)}
            className={`flex-1 py-2 rounded-xl text-[9px] font-black uppercase tracking-wide transition-all ${filtro === v ? 'bg-white text-primary shadow-sm' : 'text-text-muted'}`}>
            {l}
          </button>
        ))}
      </div>

      {/* Timeline */}
      <div className="space-y-2">
        {filtradas.length === 0 && (
          <p className="text-[9px] text-text-placeholder text-center py-8 font-black uppercase tracking-widest opacity-50">
            Sem registros anteriores
          </p>
        )}
        {filtradas.map(e => {
          const isSelected = selectedId === e.id;
          const isExpanded = expandedId === e.id;
          return (
            <div key={e.id}
              className={`border rounded-2xl transition-all cursor-pointer ${isSelected ? 'border-primary bg-primary-soft' : 'border-card-border bg-white hover:bg-slate-50'}`}
              onClick={() => { onSelect(e); setExpandedId(isExpanded ? null : e.id); }}>
              <div className="px-4 py-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[9px] font-black text-text-placeholder">
                      {new Date(e.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </p>
                    {e.profissional && (
                      <p className="text-[9px] text-text-muted font-black">{labels.tratamentoProfissional} {e.profissional.nome}</p>
                    )}
                    {e.queixaPrincipal && (
                      <p className="text-[10px] text-text-main font-black mt-1 line-clamp-2">{e.queixaPrincipal}</p>
                    )}
                  </div>
                  <div className="shrink-0 flex flex-col items-end gap-1">
                    {e.cidCodigo && (
                      <span className="text-[8px] font-black px-2 py-0.5 bg-primary-soft text-primary rounded-lg border border-primary/10 font-mono">
                        {e.cidCodigo}
                      </span>
                    )}
                    {e._count?.arquivos ? (
                      <span className="text-[8px] text-text-muted font-black">📎 {e._count.arquivos}</span>
                    ) : null}
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-slate-100 space-y-2 animate-in slide-in-from-top-1 duration-200">
                    {e.conduta && (
                      <div>
                        <p className="text-[8px] font-black uppercase tracking-widest text-text-placeholder">Conduta</p>
                        <p className="text-[10px] text-text-main mt-0.5 leading-relaxed">{e.conduta}</p>
                      </div>
                    )}
                    {(e.pressaoSistolica || e.temperatura || e.saturacao) && (
                      <div className="flex flex-wrap gap-2 mt-1">
                        {e.pressaoSistolica && <span className="text-[8px] font-black bg-slate-50 px-2 py-1 rounded-lg border border-card-border">{e.pressaoSistolica}/{e.pressaoDiastolica} mmHg</span>}
                        {e.temperatura && <span className="text-[8px] font-black bg-slate-50 px-2 py-1 rounded-lg border border-card-border">{e.temperatura}°C</span>}
                        {e.saturacao && <span className="text-[8px] font-black bg-slate-50 px-2 py-1 rounded-lg border border-card-border">SpO₂ {e.saturacao}%</span>}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Página Principal ─────────────────────────────────────────────────────────
const VITAIS_EMPTY: VitaisState = { pressaoSistolica: '', pressaoDiastolica: '', temperatura: '', saturacao: '', glicemia: '' };

export default function ClinicalRecordsPage() {
  const { labels } = useNicho();
  const tipo = labels.tipoProntuario || 'CLINICO';

  // Patient search
  const [search, setSearch] = useState('');
  const [sugestoes, setSugestoes] = useState<Paciente[]>([]);
  const [selectedPaciente, setSelectedPaciente] = useState<Paciente | null>(null);

  // Data
  const [contexto, setContexto] = useState<Contexto | null>(null);
  const [evolucoes, setEvolucoes] = useState<Evolucao[]>([]);
  const [metricas, setMetricas] = useState<Metricas | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);

  // Form state
  const [mode, setMode] = useState<'new' | 'view'>('new');
  const [selectedEvolucao, setSelectedEvolucao] = useState<Evolucao | null>(null);
  const [queixaPrincipal, setQueixaPrincipal] = useState('');
  const [evolucaoText, setEvolucaoText] = useState('');
  const [conduta, setConduta] = useState('');
  const [hipoteseDiagnostica, setHipoteseDiagnostica] = useState('');
  const [historiaMolestia, setHistoriaMolestia] = useState('');
  const [historicoMedico, setHistoricoMedico] = useState('');
  const [exameSolicitado, setExameSolicitado] = useState('');
  const [retornoEm, setRetornoEm] = useState('');
  const [cidCodigo, setCidCodigo] = useState('');
  const [cidDescricao, setCidDescricao] = useState('');
  const [vitais, setVitais] = useState<VitaisState>(VITAIS_EMPTY);
  const [vitaisOpen, setVitaisOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saved' | 'saving'>('idle');
  const [selectedTemplate, setSelectedTemplate] = useState('');

  // Modals
  const [modalReceita, setModalReceita] = useState(false);
  const [modalAtestado, setModalAtestado] = useState(false);

  // Auto-save ref
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef('');

  const resetForm = () => {
    setQueixaPrincipal(''); setEvolucaoText(''); setConduta(''); setHipoteseDiagnostica('');
    setHistoriaMolestia(''); setHistoricoMedico(''); setExameSolicitado(''); setRetornoEm('');
    setCidCodigo(''); setCidDescricao(''); setVitais(VITAIS_EMPTY);
    setSelectedTemplate(''); setSelectedEvolucao(null); setMode('new');
    setAutoSaveStatus('idle');
  };

  const carregarPaciente = useCallback(async (p: Paciente) => {
    setLoading(true);
    try {
      const [ctxRes, evRes, metRes, tplRes] = await Promise.all([
        fetchWithAuth(`/api/prontuario/${p.id}`),
        fetchWithAuth(`/api/prontuario/${p.id}/evolucoes?tipo=${tipo}`),
        fetchWithAuth(`/api/prontuario/${p.id}/metricas`),
        fetchWithAuth('/api/prontuario/templates'),
      ]);
      const [ctx, evs, met, tpls] = await Promise.all([ctxRes.json(), evRes.json(), metRes.json(), tplRes.json()]);
      if (ctx.paciente) setContexto(ctx);
      if (Array.isArray(evs)) setEvolucoes(evs);
      if (met.vitais) setMetricas(met);
      if (Array.isArray(tpls)) setTemplates(tpls);
    } catch {}
    finally { setLoading(false); }
  }, [tipo]);

  const recarregarContexto = useCallback(async () => {
    if (!selectedPaciente) return;
    try {
      const res = await fetchWithAuth(`/api/prontuario/${selectedPaciente.id}`);
      const ctx = await res.json();
      if (ctx.paciente) setContexto(ctx);
    } catch {}
  }, [selectedPaciente]);

  const searchPacientes = async (q: string) => {
    setSearch(q);
    if (!q.trim()) { setSugestoes([]); return; }
    try {
      const res = await fetchWithAuth(`/api/patients?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setSugestoes(Array.isArray(data) ? data : []);
    } catch {}
  };

  const selectPaciente = (p: Paciente) => {
    setSelectedPaciente(p); setSugestoes([]); setSearch('');
    resetForm(); carregarPaciente(p);
  };

  // Template apply
  const applyTemplate = (id: string) => {
    const tpl = templates.find(t => t.id === id);
    if (!tpl) return;
    const c = tpl.campos as Record<string, string>;
    if (c.queixaPrincipal !== undefined) setQueixaPrincipal(c.queixaPrincipal);
    if (c.evolucao !== undefined) setEvolucaoText(c.evolucao);
    if (c.conduta !== undefined) setConduta(c.conduta);
    if (c.historiaMolestia !== undefined) setHistoriaMolestia(c.historiaMolestia);
    if (c.historicoMedico !== undefined) setHistoricoMedico(c.historicoMedico);
    setSelectedTemplate(id);
  };

  // Auto-save (30s)
  const getFormSnapshot = () => JSON.stringify({ queixaPrincipal, evolucaoText, conduta, cidCodigo, vitais });
  useEffect(() => {
    if (mode !== 'new' || !selectedPaciente) return;
    const snapshot = getFormSnapshot();
    if (snapshot === lastSavedRef.current || snapshot === JSON.stringify({ queixaPrincipal: '', evolucaoText: '', conduta: '', cidCodigo: '', vitais: VITAIS_EMPTY })) return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    setAutoSaveStatus('idle');
    autoSaveTimer.current = setTimeout(async () => {
      if (snapshot === lastSavedRef.current) return;
      setAutoSaveStatus('saving');
      // auto-save as draft — store in sessionStorage to avoid DB clutter
      try { sessionStorage.setItem(`pront-draft-${selectedPaciente.id}`, snapshot); } catch {}
      lastSavedRef.current = snapshot;
      setAutoSaveStatus('saved');
      setTimeout(() => setAutoSaveStatus('idle'), 2000);
    }, 30000);
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current); };
  }, [queixaPrincipal, evolucaoText, conduta, cidCodigo, vitais]);

  const handleSave = async () => {
    if (!selectedPaciente) return;
    setSaving(true);
    try {
      const body: any = {
        tipo, queixaPrincipal, evolucao: evolucaoText, conduta, hipoteseDiagnostica,
        historiaMolestia, historicoMedico, exameSolicitado,
        retornoEm: retornoEm || null, cidCodigo, cidDescricao,
        pressaoSistolica: vitais.pressaoSistolica || null,
        pressaoDiastolica: vitais.pressaoDiastolica || null,
        temperatura: vitais.temperatura || null,
        saturacao: vitais.saturacao || null,
        glicemia: vitais.glicemia || null,
      };
      await fetchWithAuth(`/api/prontuario/${selectedPaciente.id}/evolucoes`, {
        method: 'POST', body: JSON.stringify(body),
      });
      resetForm();
      await carregarPaciente(selectedPaciente);
      try { sessionStorage.removeItem(`pront-draft-${selectedPaciente.id}`); } catch {}
    } catch {}
    finally { setSaving(false); }
  };

  const selectEvolucao = (e: Evolucao) => {
    if (selectedEvolucao?.id === e.id) { setSelectedEvolucao(null); setMode('new'); return; }
    setSelectedEvolucao(e);
    setMode('view');
    setQueixaPrincipal(e.queixaPrincipal || '');
    setEvolucaoText(e.evolucao || '');
    setConduta(e.conduta || '');
    setHipoteseDiagnostica(e.hipoteseDiagnostica || '');
    setHistoriaMolestia(e.historiaMolestia || '');
    setCidCodigo(e.cidCodigo || ''); setCidDescricao(e.cidDescricao || '');
    setVitais({
      pressaoSistolica: e.pressaoSistolica?.toString() || '',
      pressaoDiastolica: e.pressaoDiastolica?.toString() || '',
      temperatura: e.temperatura?.toString() || '',
      saturacao: e.saturacao?.toString() || '',
      glicemia: e.glicemia?.toString() || '',
    });
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  if (!selectedPaciente) {
    return (
      <div className="max-w-3xl mx-auto space-y-10 pb-40 animate-premium">
        <div className="bg-white border border-card-border p-10 rounded-[3rem] shadow-sm flex items-center gap-6">
          <div className="w-14 h-14 rounded-3xl bg-primary text-white flex items-center justify-center text-3xl shadow-xl shadow-primary/20">
            {tipo === 'ODONTOLOGICO' ? '🦷' : tipo === 'NUTRICIONAL' ? '🥗' : '🩺'}
          </div>
          <div>
            <h2 className="text-2xl font-black italic uppercase tracking-tighter text-text-main">{labels.termoProntuario}</h2>
            <p className="text-[10px] font-black text-text-placeholder uppercase tracking-[0.25em] mt-1 opacity-60">
              Selecione o {labels.termoPaciente.toLowerCase()} para abrir o prontuário
            </p>
          </div>
        </div>

        <div className="bg-white border border-card-border p-8 rounded-[2.5rem] shadow-sm space-y-4">
          <label className="text-[9px] font-black uppercase tracking-[0.25em] text-text-placeholder">
            Buscar {labels.termoPaciente}
          </label>
          <div className="relative">
            <input value={search} onChange={e => searchPacientes(e.target.value)}
              placeholder={`Nome ou telefone do ${labels.termoPaciente.toLowerCase()}...`}
              className="input-premium w-full py-5 text-sm pl-12" autoFocus />
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-placeholder text-base">🔍</span>
            {sugestoes.length > 0 && (
              <div className="absolute top-full left-0 right-0 bg-white border border-card-border rounded-2xl shadow-xl z-20 mt-1 overflow-hidden">
                {sugestoes.map(p => (
                  <button key={p.id} onClick={() => selectPaciente(p)}
                    className="w-full px-6 py-4 text-left hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0">
                    <p className="font-black text-text-main text-sm uppercase tracking-tight">{p.nome}</p>
                    <p className="text-[10px] text-text-muted font-mono mt-0.5">{p.telefone}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white border border-card-border rounded-[2.5rem] py-24 text-center shadow-sm opacity-30">
          <p className="text-5xl mb-4">🩺</p>
          <p className="font-black text-text-placeholder text-xs uppercase tracking-[0.3em]">
            Selecione um {labels.termoPaciente.toLowerCase()} para iniciar
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-80px)] flex flex-col animate-premium">
      {/* Topbar */}
      <div className="bg-white border-b border-card-border px-6 py-3 flex items-center gap-4 shrink-0">
        <button onClick={() => { setSelectedPaciente(null); resetForm(); }}
          className="text-[9px] font-black uppercase tracking-widest text-text-placeholder hover:text-primary transition-colors flex items-center gap-1">
          ← Voltar
        </button>
        <div className="w-px h-4 bg-card-border" />
        <div className="w-8 h-8 rounded-xl bg-primary text-white flex items-center justify-center text-sm font-black">
          {selectedPaciente.nome.charAt(0)}
        </div>
        <div>
          <p className="text-sm font-black text-text-main uppercase tracking-tight">{selectedPaciente.nome}</p>
          <p className="text-[8px] text-text-muted font-mono">{selectedPaciente.telefone}</p>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          {autoSaveStatus === 'saving' && <p className="text-[9px] text-text-placeholder font-black uppercase tracking-wider animate-pulse">Salvando rascunho...</p>}
          {autoSaveStatus === 'saved' && <p className="text-[9px] text-green-500 font-black uppercase tracking-wider">✓ Rascunho salvo</p>}
          {mode === 'view' && (
            <button onClick={() => { setMode('new'); resetForm(); }}
              className="px-4 py-2 bg-primary-soft text-primary rounded-xl text-[9px] font-black uppercase tracking-wider border border-primary/10">
              + Nova Consulta
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-[10px] font-black uppercase tracking-widest text-text-placeholder animate-pulse">Carregando prontuário...</p>
        </div>
      ) : (
        <div className="flex-1 grid grid-cols-[220px_1fr_260px] gap-0 overflow-hidden">

          {/* ─── Coluna Esquerda ─── */}
          <div className="border-r border-card-border p-4 overflow-y-auto no-scrollbar bg-slate-50/50">
            {contexto && (
              <ColunaEsquerda ctx={contexto} pacienteId={selectedPaciente.id} onContextoUpdate={recarregarContexto} labels={labels} />
            )}
          </div>

          {/* ─── Coluna Central ─── */}
          <div className="flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto no-scrollbar px-6 py-5 space-y-6">
              {/* Status badge */}
              <div className="flex items-center gap-3">
                <span className={`text-[9px] font-black px-3 py-1.5 rounded-xl uppercase tracking-wider border ${mode === 'view' ? 'bg-slate-100 text-text-muted border-card-border' : 'bg-primary-soft text-primary border-primary/10'}`}>
                  {mode === 'view' ? '👁 Visualizando' : '✏️ Nova Consulta'}
                </span>
                {mode === 'view' && selectedEvolucao && (
                  <span className="text-[9px] text-text-placeholder font-black">
                    {new Date(selectedEvolucao.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                    {selectedEvolucao.profissional && ` · ${labels.tratamentoProfissional} ${selectedEvolucao.profissional.nome}`}
                  </span>
                )}
              </div>

              {/* Template selector */}
              {mode === 'new' && templates.length > 0 && (
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-widest text-text-placeholder">Template</label>
                  <select value={selectedTemplate} onChange={e => applyTemplate(e.target.value)}
                    className="input-premium w-full py-3 text-sm">
                    <option value="">— Selecionar template —</option>
                    {templates.map(t => (
                      <option key={t.id} value={t.id}>{t.isGlobal ? '⚡ ' : '⭐ '}{t.nome}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Vitais */}
              <div className="space-y-2">
                <button onClick={() => setVitaisOpen(!vitaisOpen)}
                  className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-text-placeholder hover:text-primary transition-colors">
                  <span>🩺</span> Métricas Vitais
                  <span className="opacity-50">{vitaisOpen ? '▲' : '▼'}</span>
                  {(vitais.pressaoSistolica || vitais.temperatura || vitais.saturacao || vitais.glicemia) && (
                    <span className="ml-2 text-[8px] bg-primary-soft text-primary px-2 py-0.5 rounded-lg border border-primary/10">preenchido</span>
                  )}
                </button>
                {vitaisOpen && (
                  <div className="p-4 bg-slate-50 border border-card-border rounded-2xl animate-in slide-in-from-top-1 duration-200">
                    <VitaisStrip vitais={vitais} onChange={(k, v) => setVitais(prev => ({ ...prev, [k]: v }))} />
                  </div>
                )}
              </div>

              {/* Queixa */}
              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase tracking-widest text-text-placeholder">Queixa Principal</label>
                <textarea rows={2} value={queixaPrincipal} onChange={e => setQueixaPrincipal(e.target.value)}
                  readOnly={mode === 'view'}
                  placeholder="Motivo da consulta..."
                  className="input-premium w-full py-3 text-sm resize-none" />
              </div>

              {/* Evolução / Texto livre */}
              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase tracking-widest text-text-placeholder">Evolução / Anamnese</label>
                <textarea rows={5} value={evolucaoText} onChange={e => setEvolucaoText(e.target.value)}
                  readOnly={mode === 'view'}
                  placeholder="Texto da evolução clínica, achados, observações..."
                  className="input-premium w-full py-3 text-sm resize-none" />
              </div>

              {/* CID-10 */}
              {mode === 'new' ? (
                <CIDSearch value={cidCodigo} descricao={cidDescricao} onChange={(c, d) => { setCidCodigo(c); setCidDescricao(d); }} />
              ) : cidCodigo ? (
                <div className="space-y-1.5">
                  <p className="text-[9px] font-black uppercase tracking-widest text-text-placeholder">CID-10</p>
                  <p className="text-sm font-black text-primary">{cidCodigo} <span className="text-text-muted font-medium">— {cidDescricao}</span></p>
                </div>
              ) : null}

              {/* Conduta */}
              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase tracking-widest text-text-placeholder">Conduta / Tratamento</label>
                <textarea rows={4} value={conduta} onChange={e => setConduta(e.target.value)}
                  readOnly={mode === 'view'}
                  placeholder="Prescrição, orientações, encaminhamentos..."
                  className="input-premium w-full py-3 text-sm resize-none" />
              </div>

              {/* Campos extras clínicos */}
              {tipo === 'CLINICO' && (
                <>
                  {(mode === 'new' || historiaMolestia) && (
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black uppercase tracking-widest text-text-placeholder">História da Doença Atual</label>
                      <textarea rows={3} value={historiaMolestia} onChange={e => setHistoriaMolestia(e.target.value)}
                        readOnly={mode === 'view'} className="input-premium w-full py-3 text-sm resize-none" />
                    </div>
                  )}
                  {(mode === 'new' || hipoteseDiagnostica) && (
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black uppercase tracking-widest text-text-placeholder">Hipótese Diagnóstica</label>
                      <input type="text" value={hipoteseDiagnostica} onChange={e => setHipoteseDiagnostica(e.target.value)}
                        readOnly={mode === 'view'} className="input-premium w-full py-3 text-sm" />
                    </div>
                  )}
                </>
              )}

              {/* Retorno */}
              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase tracking-widest text-text-placeholder">Data de Retorno</label>
                <input type="date" value={retornoEm} onChange={e => setRetornoEm(e.target.value)}
                  readOnly={mode === 'view'} className="input-premium w-full py-3 text-sm" />
              </div>
            </div>

            {/* Bottom action bar */}
            <div className="border-t border-card-border bg-white px-6 py-4 flex items-center gap-3 shrink-0">
              {mode === 'new' ? (
                <>
                  <button onClick={() => setModalReceita(true)}
                    className="px-4 py-2.5 bg-slate-50 border border-card-border rounded-xl text-[9px] font-black uppercase hover:bg-slate-100 transition-colors">
                    📋 Receita
                  </button>
                  <button onClick={() => setModalAtestado(true)}
                    className="px-4 py-2.5 bg-slate-50 border border-card-border rounded-xl text-[9px] font-black uppercase hover:bg-slate-100 transition-colors">
                    📄 Atestado
                  </button>
                  <div className="flex-1" />
                  <button onClick={handleSave} disabled={saving || !queixaPrincipal.trim()}
                    className="btn-primary px-8 py-3 text-[10px] disabled:opacity-40">
                    {saving ? 'Salvando...' : '💾 Salvar Consulta'}
                  </button>
                </>
              ) : (
                <div className="flex items-center gap-2 w-full">
                  <span className="text-[9px] text-text-placeholder font-black uppercase tracking-wider">Consulta salva em {new Date(selectedEvolucao?.createdAt || '').toLocaleDateString('pt-BR')}</span>
                  <div className="flex-1" />
                  <button onClick={() => { setMode('new'); resetForm(); }}
                    className="btn-primary px-8 py-3 text-[10px]">+ Nova Consulta</button>
                </div>
              )}
            </div>
          </div>

          {/* ─── Coluna Direita ─── */}
          <div className="border-l border-card-border p-4 overflow-y-auto no-scrollbar bg-slate-50/30">
            <ColunaDireita
              evolucoes={evolucoes}
              metricas={metricas}
              selectedId={selectedEvolucao?.id || null}
              onSelect={selectEvolucao}
              labels={labels}
            />
          </div>
        </div>
      )}

      {/* Modais */}
      {modalReceita && contexto && (
        <ModalReceita
          pacienteNome={contexto.paciente.nome}
          onClose={() => setModalReceita(false)}
          onSalvar={() => setModalReceita(false)}
        />
      )}
      {modalAtestado && contexto && (
        <ModalAtestado
          pacienteNome={contexto.paciente.nome}
          cidCodigo={cidCodigo}
          onClose={() => setModalAtestado(false)}
          onSalvar={() => setModalAtestado(false)}
        />
      )}
    </div>
  );
}
