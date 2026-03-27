"use client";
import React, { useState, useEffect, useRef } from 'react';
import { fetchWithAuth } from '@/lib/api-utils';
import { useNicho } from '@/context/NichoContext';
import { generateSmartSlots } from '@/lib/agenda-utils';

interface Patient {
  id: string;
  nome: string;
  telefone: string;
  dataNascimento?: string | null;
  convenio?: string | null;
}

interface QuickAppointmentFormProps {
  clinica: any;
  profissionais: any[];
  services: any[];
  onSuccess: () => void;
  onCancel: () => void;
  initialDate?: Date;
  initialHour?: string;
  initialProfId?: string;
}

export default function QuickAppointmentForm({ 
  clinica,
  profissionais, 
  services, 
  onSuccess, 
  onCancel,
  initialDate,
  initialHour,
  initialProfId
}: QuickAppointmentFormProps) {
  const { labels } = useNicho();
  
  // Search State
  const [search, setSearch] = useState('');
  const [suggestions, setSuggestions] = useState<Patient[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Form State
  const [form, setForm] = useState({
    nome: '',
    telefone: '',
    dataNascimento: '',
    dataAgendamento: initialDate ? initialDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    horario: initialHour || '',
    profissionalId: initialProfId || '',
    servicoId: '',
    categoria: 'consulta' as 'primeira' | 'consulta' | 'retorno',
    temPlano: false,
    plano: '',
    observacoes: ''
  });

  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [slotStatus, setSlotStatus] = useState<'loading' | 'no_prof' | 'no_date' | 'no_escala' | 'empty' | 'ok'>('no_prof');

  // Debounce Search
  useEffect(() => {
    if (search.length < 2) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoadingSearch(true);
      try {
        const res = await fetchWithAuth(`/api/patients?q=${encodeURIComponent(search)}`);
        const data = await res.json();
        if (Array.isArray(data)) {
          setSuggestions(data.slice(0, 5));
          setShowSuggestions(true);
        }
      } catch (err) {
        console.error('Erro na busca:', err);
      } finally {
        setLoadingSearch(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

  // Available Slots Logic V5.9 (Flexível)
  useEffect(() => {
    if (!form.dataAgendamento) {
      setSlotStatus('no_date');
      setAvailableSlots([]);
      return;
    }
    if (!form.profissionalId) {
      setSlotStatus('no_prof');
      setAvailableSlots([]);
      return;
    }

    const targetProf = profissionais.find(p => p.id === form.profissionalId);
    if (!targetProf) {
      setSlotStatus('no_prof');
      return;
    }

    // Parse resiliente de data para evitar problemas de fuso horário no getDay
    const [year, month, day] = form.dataAgendamento.split('-').map(Number);
    const dateObj = new Date(year, month - 1, day); 
    const dayOfWeek = dateObj.getDay();
    
    const escala = targetProf.escalas?.find((e: any) => e.diaSemana === dayOfWeek && e.ativo);

    if (!escala) {
      setSlotStatus('no_escala');
      setAvailableSlots([]);
      return;
    }

    const clinicStart = clinica?.openingTime || "08:00";
    const clinicEnd = clinica?.closingTime || "18:00";
    
    let finalStart = escala.horaInicio || clinicStart;
    let finalEnd = escala.horaFim || clinicEnd;

    if (finalStart < clinicStart) finalStart = clinicStart;
    if (finalEnd > clinicEnd) finalEnd = clinicEnd;

    const targetServ = services.find(s => s.id === form.servicoId);
    const metadata = targetProf.horariosJson as any;

    const slots = generateSmartSlots(
      finalStart,
      finalEnd,
      targetServ,
      [], // Por enquanto não filtra agendamentos existentes para simplificar
      dateObj,
      metadata?.sessionDuration,
      metadata?.sessionBuffer,
      escala?.lunchStart,
      escala?.lunchEnd
    );

    if (slots.length === 0) {
      setSlotStatus('empty');
    } else {
      setSlotStatus('ok');
    }
    
    setAvailableSlots(slots);
  }, [form.dataAgendamento, form.profissionalId, form.servicoId, profissionais, services, clinica]);

  // Click outside to close results (V5.6 restored)
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectPatient = (p: Patient) => {
    setForm(prev => ({
      ...prev,
      nome: p.nome,
      telefone: p.telefone,
      dataNascimento: p.dataNascimento ? new Date(p.dataNascimento).toISOString().split('T')[0] : '',
      temPlano: !!p.convenio && p.convenio !== 'particular',
      plano: p.convenio || ''
    }));
    setShowSuggestions(false);
    setSearch('');
  };

  const calculateAge = (birthDate: string) => {
    if (!birthDate) return null;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  };

  const handlePhoneChange = (val: string) => {
    const raw = val.replace(/\D/g, '');
    let masked = raw;
    if (raw.length > 2) masked = `(${raw.slice(0, 2)}) ${raw.slice(2)}`;
    if (raw.length > 7) masked = `(${raw.slice(0, 2)}) ${raw.slice(2, 7)}-${raw.slice(7, 11)}`;
    setForm({ ...form, telefone: masked });
  };

  const validate = () => {
    const newErrors: Record<string, boolean> = {};
    if (!form.nome) newErrors.nome = true;
    if (!form.telefone) newErrors.telefone = true;
    if (!form.dataAgendamento) newErrors.dataAgendamento = true;
    if (!form.horario) newErrors.horario = true;
    if (!form.profissionalId) newErrors.profissionalId = true;
    if (form.temPlano && !form.plano) newErrors.plano = true;
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    try {
      const res = await fetchWithAuth('/api/bot/appointments', {
        method: 'POST',
        body: JSON.stringify({
          pacienteNome: form.nome,
          pacienteTelefone: form.telefone,
          dataNascimento: form.dataNascimento,
          dataHora: `${form.dataAgendamento}T${form.horario}:00`,
          profissionalId: form.profissionalId,
          servicoId: form.servicoId,
          categoria: form.categoria,
          convenio: form.temPlano ? form.plano : 'particular',
          observacoes: form.observacoes
        })
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || 'Erro ao agendar');
      } else {
        onSuccess();
      }
    } catch (err) {
      console.error(err);
      alert('Erro interno ao agendar');
    } finally {
      setSaving(false);
    }
  };

  const age = calculateAge(form.dataNascimento);

  const CONVENIOS_LIST = [
    'Unimed', 'Bradesco Saúde', 'Amil', 'SulAmérica', 'Hapvida', 
    'NotreDame Intermédica', 'Porto Seguro', 'Prevent Senior', 'São Francisco', 'Particular'
  ];

  return (
    <div className="space-y-8 animate-premium">
      {/* SECTION: BUSCA RÁPIDA */}
      <div className="relative" ref={searchRef}>
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-black text-text-placeholder uppercase tracking-widest ml-1">Busca Rápida de {labels.termoPaciente}</label>
          <div className="relative group">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              onFocus={() => search.length >= 2 && setShowSuggestions(true)}
              placeholder="Buscar paciente pelo nome ou telefone..."
              className="input-premium w-full py-5 px-8 pl-14 shadow-inner"
            />
            <span className="absolute left-6 top-1/2 -translate-y-1/2 opacity-20 group-focus-within:opacity-100 transition-opacity">🔍</span>
            {loadingSearch && <div className="absolute right-6 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />}
          </div>
        </div>

        {showSuggestions && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-card-border rounded-2xl shadow-2xl z-[50] overflow-hidden animate-in fade-in slide-in-from-top-2">
            {suggestions.length > 0 ? (
              suggestions.map(p => (
                <button
                  key={p.id}
                  onClick={() => selectPatient(p)}
                  className="w-full p-6 text-left hover:bg-slate-50 flex flex-col gap-1 transition-colors border-b border-slate-50 last:border-0"
                >
                  <span className="font-black text-sm text-text-main uppercase italic">{p.nome}</span>
                  <div className="flex gap-4 text-[9px] font-bold text-text-placeholder uppercase tracking-wider">
                    <span>🎂 {p.dataNascimento ? new Date(p.dataNascimento).toLocaleDateString() : '--/--/----'}</span>
                    <span>📱 {p.telefone}</span>
                  </div>
                </button>
              ))
            ) : (
              <div className="p-8 text-center text-[10px] font-black text-text-placeholder uppercase tracking-widest italic opacity-60">
                Paciente não encontrado — preencha os dados manualmente
              </div>
            )}
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Nome */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-text-placeholder uppercase tracking-widest ml-1">Nome Completo *</label>
            <input
              value={form.nome}
              onChange={e => setForm({ ...form, nome: e.target.value })}
              placeholder="Digite o nome completo do paciente"
              className={`input-premium w-full py-5 px-6 ${errors.nome ? 'border-status-error ring-1 ring-status-error/20' : ''}`}
            />
            {errors.nome && <p className="text-[9px] font-bold text-status-error uppercase tracking-wider ml-1">Obrigatório</p>}
          </div>

          {/* Telefone */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-text-placeholder uppercase tracking-widest ml-1">WhatsApp / Telefone *</label>
            <input
              value={form.telefone}
              onChange={e => handlePhoneChange(e.target.value)}
              placeholder="(00) 00000-0000"
              className={`input-premium w-full py-5 px-6 ${errors.telefone ? 'border-status-error ring-1 ring-status-error/20' : ''}`}
            />
            {errors.telefone && <p className="text-[9px] font-bold text-status-error uppercase tracking-wider ml-1">Obrigatório</p>}
          </div>

          {/* Data Nasc */}
          <div className="space-y-2">
            <div className="flex justify-between">
               <label className="text-[10px] font-black text-text-placeholder uppercase tracking-widest ml-1">Data de Nascimento</label>
               {age !== null && age >= 0 && <span className="text-[10px] font-black text-primary uppercase italic">{age} anos</span>}
            </div>
            <input
              type="date"
              value={form.dataNascimento}
              onChange={e => setForm({ ...form, dataNascimento: e.target.value })}
              className="input-premium w-full py-5 px-6"
            />
          </div>

          {/* Tipo de Atendimento */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-text-placeholder uppercase tracking-widest ml-1">Tipo de Atendimento *</label>
            <div className="flex gap-2">
              {[
                { id: 'primeira', label: '1ª Vez' },
                { id: 'consulta', label: 'Consulta' },
                { id: 'retorno', label: 'Retorno' }
              ].map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setForm({ ...form, categoria: t.id as any })}
                  className={`flex-1 py-4 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all 
                    ${form.categoria === t.id ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20 scale-105' : 'bg-white text-text-muted border-slate-100'}`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-slate-50 pt-10">
          {/* Data do Agendamento */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-text-placeholder uppercase tracking-widest ml-1">Data do Agendamento *</label>
            <input
              type="date"
              min={new Date().toISOString().split('T')[0]}
              value={form.dataAgendamento}
              onChange={e => setForm({ ...form, dataAgendamento: e.target.value })}
              className={`input-premium w-full py-5 px-6 ${errors.dataAgendamento ? 'border-status-error ring-1 ring-status-error/20' : ''}`}
            />
          </div>

          {/* Horário */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-text-placeholder uppercase tracking-widest ml-1">Horário *</label>
            <select
              value={form.horario}
              onChange={e => setForm({ ...form, horario: e.target.value })}
              className={`input-premium w-full py-5 px-6 bg-slate-50/50 ${errors.horario ? 'border-status-error ring-1 ring-status-error/20' : ''}`}
            >
              {slotStatus === 'no_prof' && <option value="">Selecione o profissional...</option>}
              {slotStatus === 'no_date' && <option value="">Selecione a data...</option>}
              {slotStatus === 'no_escala' && <option value="">Profissional não atende neste dia</option>}
              {slotStatus === 'empty' && <option value="">Nenhum horário disponível</option>}
              
              {slotStatus === 'ok' && (
                <>
                  <option value="">Selecione o horário...</option>
                  {availableSlots.map(h => <option key={h} value={h}>{h}</option>)}
                </>
              )}
            </select>
          </div>

          {/* Profissional */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-text-placeholder uppercase tracking-widest ml-1">{labels.termoProfissional} *</label>
            <select
              value={form.profissionalId}
              onChange={e => setForm({ ...form, profissionalId: e.target.value })}
              className={`input-premium w-full py-5 px-6 bg-slate-50/50 ${errors.profissionalId ? 'border-status-error ring-1 ring-status-error/20' : ''}`}
            >
              <option value="">Selecione o {labels.termoProfissional}...</option>
              {profissionais.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
          </div>

          {/* Serviço */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-text-placeholder uppercase tracking-widest ml-1">Procedimento / {labels.termoServico}</label>
            <select
              value={form.servicoId}
              onChange={e => setForm({ ...form, servicoId: e.target.value })}
              className="input-premium w-full py-5 px-6 bg-slate-50/50"
            >
              <option value="">Selecione o procedimento...</option>
              {services.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
            </select>
          </div>
        </div>

        {/* Convênio Section */}
        <div className="space-y-6 pt-10 border-t border-slate-50">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-[10px] font-black text-text-placeholder uppercase tracking-widest ml-1">Possui Plano de Saúde?</label>
              <p className="text-[8px] font-bold text-text-muted uppercase mt-1 opacity-60">Marque se o atendimento não for particular</p>
            </div>
            <button 
              type="button"
              onClick={() => setForm({ ...form, temPlano: !form.temPlano })}
              className={`w-14 h-8 rounded-full p-1 transition-all flex items-center ${form.temPlano ? 'bg-primary' : 'bg-slate-200'}`}
            >
              <div className={`w-6 h-6 bg-white rounded-full shadow-sm transition-all ${form.temPlano ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
          </div>

          {form.temPlano && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 animate-in fade-in slide-in-from-top-2">
              {CONVENIOS_LIST.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm({ ...form, plano: c })}
                  className={`px-4 py-3 rounded-xl border text-[8px] font-black uppercase tracking-widest transition-all
                    ${form.plano === c ? 'bg-primary/5 border-primary text-primary shadow-sm' : 'bg-white border-slate-100 text-text-muted hover:border-slate-300'}`}
                >
                  {c}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Observações */}
        <div className="space-y-2 pt-10 border-t border-slate-50">
          <label className="text-[10px] font-black text-text-placeholder uppercase tracking-widest ml-1">Observações</label>
          <textarea
            value={form.observacoes}
            onChange={e => setForm({ ...form, observacoes: e.target.value })}
            placeholder="Alguma informação relevante para o atendimento?"
            rows={3}
            className="input-premium w-full py-5 px-6 resize-none"
          />
        </div>

        <div className="pt-10 flex gap-4">
          <button type="button" onClick={onCancel} className="flex-1 py-5 rounded-[2rem] border border-slate-100 text-[10px] font-black uppercase tracking-[0.3em] text-text-muted hover:bg-slate-50 transition-all italic">Cancelar</button>
          <button 
            type="submit" 
            disabled={saving}
            className="flex-[2] py-5 rounded-[2rem] bg-primary text-white text-[10px] font-black uppercase tracking-[0.3em] shadow-2xl shadow-primary/30 hover:scale-[1.02] active:scale-95 transition-all italic"
          >
            {saving ? 'Processando...' : 'Confirmar Agendamento'}
          </button>
        </div>
      </form>
    </div>
  );
}
