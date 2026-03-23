"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { useNicho } from '@/context/NichoContext';

const TENANT_ID = 'clinica_id_default';
const HOURS = ['08:00','08:30','09:00','09:30','10:00','10:30','11:00','11:30','12:00','12:30','13:00','13:30','14:00','14:30','15:00','15:30','16:00','16:30','17:00','17:30','18:00'];

interface Appointment {
  id: string;
  dataHora: string;
  status: string;
  paciente: { nome: string; telefone: string };
  profissional?: { id: string; nome: string };
  tipoAtendimento?: string | null;
  convenio?: string | null;
}

interface Profissional {
  id: string;
  nome: string;
}

interface Convenio {
  id: string;
  nomeConvenio: string;
}

const STATUS_MAP: Record<string, { label: string; color: string; dot: string }> = {
  confirmado: { label: 'Confirmado', color: 'bg-green-500/15 text-green-400 border-green-500/30', dot: 'bg-green-500' },
  pendente:   { label: 'Pendente',   color: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30', dot: 'bg-yellow-500' },
  cancelado:  { label: 'Cancelado',  color: 'bg-red-500/15 text-red-400 border-red-500/30', dot: 'bg-red-500' },
  remarcado:  { label: 'Remarcado', color: 'bg-blue-500/15 text-blue-400 border-blue-500/30', dot: 'bg-blue-500' },
};

const Badge = ({ status }: { status: string }) => {
  const s = STATUS_MAP[status] || { label: status, color: 'bg-white/10 text-gray-300 border-white/10', dot: 'bg-gray-400' };
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-semibold border ${s.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
};

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}
function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}
function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

// ─── Modal de Novo/Editar Agendamento ─────────────────────────────────────
function AppointmentModal({
  onClose, onSave, initial, selectedDate, profissionais, conveniosAtivos
}: {
  onClose: () => void;
  onSave: (data: { nome: string; telefone: string; dataHora: string; origem: string; profissionalId?: string; tipoAtendimento: string; convenio?: string }) => Promise<void>;
  initial?: Appointment | null;
  selectedDate?: Date;
  profissionais: Profissional[];
  conveniosAtivos: Convenio[];
}) {
  const { labels } = useNicho();
  const defaultDate = selectedDate || new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const defaultDateStr = `${defaultDate.getFullYear()}-${pad(defaultDate.getMonth()+1)}-${pad(defaultDate.getDate())}`;

  const [nome, setNome] = useState(initial?.paciente?.nome || '');
  const [telefone, setTelefone] = useState(initial?.paciente?.telefone || '');
  const [date, setDate] = useState(defaultDateStr);
  const [hour, setHour] = useState(initial ? formatTime(initial.dataHora) : '09:00');
  const [origem, setOrigem] = useState('manual');
  const [profissionalId, setProfissionalId] = useState(initial?.profissional?.id || '');
  const [tipoAtendimento, setTipoAtendimento] = useState(initial?.tipoAtendimento || 'particular');
  const [convenio, setConvenio] = useState(initial?.convenio || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const dataHora = `${date}T${hour}:00`;
      await onSave({ 
        nome, telefone, dataHora, origem, 
        profissionalId: profissionalId || undefined,
        tipoAtendimento,
        convenio: tipoAtendimento === 'convenio' ? convenio : undefined
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar agendamento.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-[#0d0d22] border border-white/10 rounded-2xl p-8 w-full max-w-lg shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold">{initial ? 'Remarcar Agendamento' : '📅 Novo Agendamento'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors text-xl">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs text-gray-400 uppercase tracking-widest">Nome do {labels.cliente}</label>
              <input required type="text" value={nome} onChange={e => setNome(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#4a4ae2] transition-colors"
                placeholder="Maria da Silva" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-400 uppercase tracking-widest">Telefone / WhatsApp</label>
              <input required type="text" value={telefone} onChange={e => setTelefone(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#4a4ae2] transition-colors"
                placeholder="55 85 99999-9999" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-400 uppercase tracking-widest">Origem</label>
              <select value={origem} onChange={e => setOrigem(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#4a4ae2] transition-colors appearance-none">
                <option value="manual" className="bg-[#0d0d22]">👤 Recepcionista</option>
                <option value="ia" className="bg-[#0d0d22]">🤖 IA WhatsApp</option>
              </select>
            </div>
            {conveniosAtivos.length > 0 && (
               <div className="space-y-1">
                 <label className="text-xs text-gray-400 uppercase tracking-widest">Tipo de Atendimento</label>
                 <select value={tipoAtendimento} onChange={e => setTipoAtendimento(e.target.value)}
                   className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#4a4ae2] transition-colors appearance-none">
                   <option value="particular" className="bg-[#0d0d22]">💲 Particular</option>
                   <option value="convenio" className="bg-[#0d0d22]">🏥 Convênio/Plano</option>
                 </select>
               </div>
            )}
            {tipoAtendimento === 'convenio' && conveniosAtivos.length > 0 && (
              <div className="space-y-1">
                <label className="text-xs text-gray-400 uppercase tracking-widest">Convênio</label>
                <select value={convenio} onChange={e => setConvenio(e.target.value)} required={tipoAtendimento === 'convenio'}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#4a4ae2] transition-colors appearance-none">
                  <option value="" className="bg-[#0d0d22]">Selecione...</option>
                  {conveniosAtivos.map(c => <option key={c.id} value={c.nomeConvenio} className="bg-[#0d0d22]">{c.nomeConvenio}</option>)}
                </select>
              </div>
            )}
            {profissionais.length > 0 && (
              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs text-gray-400 uppercase tracking-widest">{labels.profissional}</label>
                <select value={profissionalId} onChange={e => setProfissionalId(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#4a4ae2] transition-colors appearance-none">
                  <option value="" className="bg-[#0d0d22]">Nenhum específico</option>
                  {profissionais.map(p => (
                    <option key={p.id} value={p.id} className="bg-[#0d0d22]">{p.nome}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="space-y-1">
              <label className="text-xs text-gray-400 uppercase tracking-widest">Data</label>
              <input required type="date" value={date} onChange={e => setDate(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#4a4ae2] transition-colors" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-400 uppercase tracking-widest">Horário</label>
              <select value={hour} onChange={e => setHour(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#4a4ae2] transition-colors appearance-none">
                {HOURS.map(h => <option key={h} value={h} className="bg-[#0d0d22]">{h}</option>)}
              </select>
            </div>
          </div>
          {error && <p className="text-red-400 text-sm p-3 bg-red-500/10 border border-red-500/20 rounded-xl">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm transition-all">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-3 bg-[#4a4ae2] hover:bg-[#3a3ab2] rounded-xl text-sm font-semibold transition-all disabled:opacity-50 shadow-[0_4px_20px_rgba(74,74,226,0.35)]">
              {saving ? 'Salvando...' : initial ? 'Remarcar' : 'Agendar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Card de Agendamento ──────────────────────────────────────────────────
function AppCard({ appt, onCancel, onReschedule }: {
  appt: Appointment;
  onCancel: (id: string) => void;
  onReschedule: (appt: Appointment) => void;
}) {
  const { labels } = useNicho();
  const [menuOpen, setMenuOpen] = useState(false);
  const isPast = new Date(appt.dataHora) < new Date();

  return (
    <div className="group relative flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-4 hover:bg-white/3 transition-all border-b border-white/5 last:border-0">
      {/* Time pill */}
      <div className="w-16 flex-shrink-0 text-center">
        <span className="text-lg font-bold text-white">{formatTime(appt.dataHora)}</span>
        <p className="text-[10px] text-gray-500 uppercase">{formatDate(appt.dataHora)}</p>
      </div>

      {/* Divider line */}
      <div className="hidden sm:flex flex-col items-center gap-1 w-4">
        <div className="w-px h-full bg-gradient-to-b from-[#4a4ae2]/60 to-transparent min-h-[32px]" />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-semibold text-sm truncate">{appt.paciente?.nome}</p>
          {appt.tipoAtendimento === 'convenio' && appt.convenio && (
             <span className="text-[9px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-500/30 uppercase tracking-wide">
               {appt.convenio}
             </span>
          )}
        </div>
        <p className="text-[10px] text-gray-400 mt-0.5">{appt.paciente?.telefone}</p>
        {appt.profissional && (
          <p className="text-[10px] text-[#8080ff] mt-1 font-bold">👤 {labels.profissional}: {appt.profissional.nome}</p>
        )}
      </div>

      {/* Status + Actions */}
      <div className="flex items-center gap-2 ml-auto">
        <Badge status={appt.status} />
        {!isPast && appt.status !== 'cancelado' && (
          <div className="relative">
            <button onClick={() => setMenuOpen(v => !v)} className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-all text-sm">
              ···
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 bg-[#0d0d22] border border-white/10 rounded-xl overflow-hidden z-10 shadow-2xl min-w-[160px]">
                <button
                  onClick={() => { onReschedule(appt); setMenuOpen(false); }}
                  className="w-full text-left px-4 py-3 text-sm hover:bg-white/5 transition-colors">
                  📅 Remarcar
                </button>
                <button
                  onClick={() => { onCancel(appt.id); setMenuOpen(false); }}
                  className="w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-red-500/10 transition-colors">
                  ✕ Cancelar
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Mini Calendário ──────────────────────────────────────────────────────
function MiniCalendar({
  selected, appointments, onSelect
}: {
  selected: Date;
  appointments: Appointment[];
  onSelect: (d: Date) => void;
}) {
  const [view, setView] = useState<Date>(new Date(selected));
  const firstDay = new Date(view.getFullYear(), view.getMonth(), 1);
  const lastDay = new Date(view.getFullYear(), view.getMonth() + 1, 0);
  const startOffset = firstDay.getDay();
  const days: (Date | null)[] = Array(startOffset).fill(null);
  for (let i = 1; i <= lastDay.getDate(); i++) days.push(new Date(view.getFullYear(), view.getMonth(), i));

  const hasDot = (day: Date) => appointments.some(a => {
    const d = new Date(a.dataHora);
    return isSameDay(d, day) && a.status !== 'cancelado';
  });

  return (
    <div className="bg-[#0a0a20]/60 border border-white/5 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setView(new Date(view.getFullYear(), view.getMonth() - 1, 1))} className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-all">‹</button>
        <span className="text-sm font-semibold">{MONTHS[view.getMonth()]} {view.getFullYear()}</span>
        <button onClick={() => setView(new Date(view.getFullYear(), view.getMonth() + 1, 1))} className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-all">›</button>
      </div>
      <div className="grid grid-cols-7 mb-2">
        {WEEKDAYS.map(d => <div key={d} className="text-center text-[10px] text-gray-500 uppercase font-semibold py-1">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-y-1">
        {days.map((day, i) => {
          if (!day) return <div key={`e${i}`} />;
          const isSelected = isSameDay(day, selected);
          const isToday = isSameDay(day, new Date());
          const dot = hasDot(day);
          return (
            <button key={day.getDate()} onClick={() => onSelect(day)}
              className={`relative flex items-center justify-center text-xs h-8 w-8 mx-auto rounded-lg transition-all font-medium
                ${isSelected ? 'bg-[#4a4ae2] text-white shadow-[0_2px_10px_rgba(74,74,226,0.5)]' : isToday ? 'border border-[#4a4ae2]/50 text-[#8080ff]' : 'text-gray-300 hover:bg-white/10'}`}
            >
              {day.getDate()}
              {dot && <span className={`absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full ${isSelected ? 'bg-white' : 'bg-[#4a4ae2]'}`} />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Grade de Horários Disponíveis ──────────────────────────────────────
function SlotGrid({ date, appointments, onBook }: {
  date: Date;
  appointments: Appointment[];
  onBook: (hour: string) => void;
}) {
  const dayAppts = appointments.filter(a => isSameDay(new Date(a.dataHora), date) && a.status !== 'cancelado');
  const bookedTimes = dayAppts.map(a => formatTime(a.dataHora));

  return (
    <div className="bg-[#0a0a20]/60 border border-white/5 rounded-2xl p-5">
      <h4 className="text-sm font-semibold mb-4 text-gray-300">
        Horários — {date.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
      </h4>
      <div className="grid grid-cols-3 gap-2">
        {HOURS.map(h => {
          const booked = bookedTimes.includes(h);
          return (
            <button key={h} onClick={() => !booked && onBook(h)} disabled={booked}
              className={`py-2 rounded-xl text-xs font-semibold transition-all border
                ${booked
                  ? 'bg-red-500/10 border-red-500/20 text-red-400 cursor-not-allowed'
                  : 'bg-green-500/10 border-green-500/20 text-green-400 hover:bg-green-500/20 hover:shadow-[0_0_12px_rgba(34,197,94,0.2)]'
                }`}>
              {booked ? '🔴 ' : '🟢 '}{h}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Página Principal ─────────────────────────────────────────────────────
export default function AgendaPage() {
  const { labels } = useNicho();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [conveniosAtivos, setConveniosAtivos] = useState<Convenio[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showModal, setShowModal] = useState(false);
  const [rescheduleAppt, setRescheduleAppt] = useState<Appointment | null>(null);
  const [prefilledHour, setPrefilledHour] = useState('09:00');
  const [filter, setFilter] = useState<'todos' | 'confirmado' | 'pendente' | 'cancelado'>('todos');
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const fetchAppointments = useCallback(() => {
    setLoading(true);
    fetch(`/api/appointments?tenantId=${TENANT_ID}`) // <-- Needs to be updated to bot endpoint
      .then(r => r.json())
      .then(data => { if (Array.isArray(data.appointments || data)) setAppointments(data.appointments || data); })
      .catch(() => {})
      .finally(() => setLoading(false));

    fetch(`/api/team?tenantId=${TENANT_ID}`)
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setProfissionais(data.filter((p: any) => p.ativo)); })
      .catch(() => {});

    fetch(`/api/settings/convenios?tenantId=${TENANT_ID}`)
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setConveniosAtivos(data.filter((c: any) => c.ativo)); })
      .catch(() => {});
  }, []);

  useEffect(() => { fetchAppointments(); }, [fetchAppointments]);

  const handleCreate = async (data: { nome: string; telefone: string; dataHora: string; origem: string; profissionalId?: string; tipoAtendimento: string; convenio?: string }) => {
    const res = await fetch('/api/bot/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        pacienteTelefone: data.telefone, 
        pacienteNome: data.nome, 
        dataHora: data.dataHora, 
        tenantId: TENANT_ID,
        profissionalId: data.profissionalId,
        tipoAtendimento: data.tipoAtendimento,
        convenio: data.convenio
      }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Erro ao criar agendamento');
    fetchAppointments();
    showToast('✅ Agendamento criado com sucesso!');
  };

  const handleReschedule = async (data: { nome: string; telefone: string; dataHora: string; origem: string; profissionalId?: string; tipoAtendimento?: string; convenio?: string }) => {
    if (!rescheduleAppt) return;
    const res = await fetch(`/api/bot/appointments/${rescheduleAppt.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        dataHora: data.dataHora, 
        tenantId: TENANT_ID,
        profissionalId: data.profissionalId,
        tipoAtendimento: data.tipoAtendimento,
        convenio: data.convenio
      }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Erro ao remarcar');
    setRescheduleAppt(null);
    fetchAppointments();
    showToast('📅 Agendamento remarcado!');
  };

  const handleCancel = async (id: string) => {
    if (!confirm('Confirmar cancelamento?')) return;
    const res = await fetch(`/api/bot/appointments/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'cancelado', tenantId: TENANT_ID }),
    });
    if (res.ok) { fetchAppointments(); showToast('❌ Agendamento cancelado.'); }
  };

  const onBookSlot = (hour: string) => { setPrefilledHour(hour); setShowModal(true); };

  // Stats
  const todayAppts = appointments.filter(a => isSameDay(new Date(a.dataHora), new Date()));
  const confirmados = appointments.filter(a => a.status === 'confirmado').length;
  const pendentes = appointments.filter(a => a.status === 'pendente').length;

  // Filtered list
  const dayAppts = appointments
    .filter(a => isSameDay(new Date(a.dataHora), selectedDate))
    .filter(a => filter === 'todos' || a.status === filter)
    .filter(a => !search || a.paciente?.nome?.toLowerCase().includes(search.toLowerCase()) || a.paciente?.telefone?.includes(search))
    .sort((a, b) => new Date(a.dataHora).getTime() - new Date(b.dataHora).getTime());

  return (
    <div className="max-w-7xl mx-auto space-y-6">

      {/* Toast */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-[#0d0d22] border border-[#4a4ae2]/30 text-white px-6 py-3 rounded-2xl shadow-2xl text-sm font-medium animate-pulse">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">📅 Agenda</h2>
          <p className="text-gray-400 text-sm mt-1">
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <button
          onClick={() => { setRescheduleAppt(null); setPrefilledHour('09:00'); setShowModal(true); }}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#4a4ae2] hover:bg-[#3a3ab2] rounded-xl text-sm font-semibold transition-all shadow-[0_4px_20px_rgba(74,74,226,0.35)]"
        >
          + Novo Agendamento
        </button>
      </div>

      {/* Mobile-First 3 KPIs Row (Módulo 11.1) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {[
          { 
            label: 'Agendamentos Hoje', 
            value: todayAppts.length, 
            gradient: 'from-[#4a4ae2] to-[#8080ff]', 
            icon: '📅' 
          },
          { 
            label: 'Confirmados', 
            value: todayAppts.filter(a => a.status === 'confirmado').length, 
            gradient: 'from-green-500 to-emerald-400', 
            icon: '✅' 
          },
          { 
            label: 'Caixa Hoje (Previsto)', 
            value: 'R$ --', // Placeholder until financial/service module is fully active
            gradient: 'from-yellow-500 to-orange-400', 
            icon: '💰' 
          },
        ].map((s, idx) => (
          <div key={idx} className="bg-gradient-to-br from-[#0d0d22] to-[#0a0a20] border border-white/10 rounded-3xl p-6 flex flex-col justify-between hover:border-white/20 transition-all shadow-xl relative overflow-hidden group">
            <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${s.gradient} opacity-5 blur-3xl rounded-full group-hover:opacity-10 transition-opacity`} />
            <div className="flex items-start justify-between mb-4 relative z-10">
              <p className="text-sm text-gray-400 uppercase tracking-widest font-bold">{s.label}</p>
              <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center text-xl shadow-inner border border-white/5">
                {s.icon}
              </div>
            </div>
            <p className={`text-5xl font-extrabold tracking-tight bg-gradient-to-r ${s.gradient} bg-clip-text text-transparent relative z-10 drop-shadow-sm`}>
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left: Calendar + Slots */}
        <div className="lg:col-span-1 space-y-4">
          <MiniCalendar selected={selectedDate} appointments={appointments} onSelect={setSelectedDate} />
          <SlotGrid date={selectedDate} appointments={appointments} onBook={onBookSlot} />
        </div>

        {/* Right: Appointment List */}
        <div className="lg:col-span-2">
          <div className="bg-[#0a0a20]/50 border border-white/5 rounded-2xl overflow-hidden">
            {/* Tabs (Abas) Módulo 3 */}
            <div className="flex border-b border-white/5">
              {(['pendente', 'confirmado', 'todos'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`flex-1 py-4 text-sm font-bold uppercase tracking-wider transition-all border-b-2 ${
                    filter === f 
                      ? 'border-[#4a4ae2] text-[#8080ff] bg-[#4a4ae2]/5' 
                      : 'border-transparent text-gray-500 hover:text-gray-300 hover:bg-white/5'
                  }`}
                >
                  {f === 'pendente' ? '⏳ Pendentes' : f === 'confirmado' ? '✅ Confirmados' : '🗂️ Todos'}
                </button>
              ))}
            </div>

            {/* Toolbar */}
            <div className="p-5 border-b border-white/5 flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <input
                  value={search} onChange={e => setSearch(e.target.value)}
                  placeholder={`Buscar ${labels.cliente.toLowerCase()} ou telefone...`}
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-[#4a4ae2] transition-colors"
                />
                <svg className="absolute left-3 top-3 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              </div>
            </div>

            {/* Date selector */}
            <div className="px-5 pt-4 pb-2">
              <h4 className="text-sm font-semibold text-gray-300">
                {selectedDate.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
                <span className="ml-2 text-xs text-gray-500">({dayAppts.length} agendamento{dayAppts.length !== 1 ? 's' : ''})</span>
              </h4>
            </div>

            {/* List */}
            <div className="min-h-[300px]">
              {loading ? (
                <div className="flex items-center justify-center p-16 text-gray-400">
                  <div className="text-center space-y-2">
                    <div className="w-8 h-8 border-2 border-[#4a4ae2] border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-sm">Carregando...</p>
                  </div>
                </div>
              ) : dayAppts.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-16 text-gray-400">
                  <span className="text-5xl mb-4">📭</span>
                  <p className="font-medium text-white">Nenhum agendamento nesta data</p>
                  <p className="text-sm mt-1">Selecione outro dia ou crie um novo agendamento.</p>
                  <button onClick={() => { setRescheduleAppt(null); setShowModal(true); }}
                    className="mt-4 px-4 py-2 bg-[#4a4ae2]/20 hover:bg-[#4a4ae2]/30 border border-[#4a4ae2]/30 rounded-xl text-sm text-[#8080ff] transition-all">
                    + Agendar nesta data
                  </button>
                </div>
              ) : (
                dayAppts.map(a => (
                  <AppCard key={a.id} appt={a} onCancel={handleCancel} onReschedule={apt => { setRescheduleAppt(apt); setShowModal(true); }} />
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showModal && (
        <AppointmentModal
          onClose={() => { setShowModal(false); setRescheduleAppt(null); }}
          onSave={rescheduleAppt ? handleReschedule as any : handleCreate as any}
          initial={rescheduleAppt}
          selectedDate={selectedDate}
          profissionais={profissionais}
          conveniosAtivos={conveniosAtivos}
        />
      )}
    </div>
  );
}
