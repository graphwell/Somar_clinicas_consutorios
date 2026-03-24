"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { useNicho } from '@/context/NichoContext';

const TENANT_ID = 'clinica_id_default';
const HOURS = ['08:00','08:30','09:00','09:30','10:00','10:30','11:00','11:30','12:00','12:30','13:00','13:30','14:00','14:30','15:00','15:30','16:00','16:30','17:00','17:30','18:00'];

interface Service {
  id: string;
  nome: string;
  preco: number;
  color?: string;
}

interface Appointment {
  id: string;
  dataHora: string;
  status: string;
  paciente: { nome: string; telefone: string };
  profissional?: { id: string; nome: string; color?: string; fotoUrl?: string };
  servico?: Service | null;
  servicoId?: string | null;
  tipoAtendimento?: string | null;
  convenio?: string | null;
  preco?: number;
}

interface Profissional {
  id: string;
  nome: string;
  color?: string;
  especialidade?: string;
  fotoUrl?: string;
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
  done:       { label: 'Concluído', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40', dot: 'bg-emerald-500' },
};

const Badge = ({ status }: { status: string }) => {
  const s = STATUS_MAP[status] || { label: status, color: 'bg-white/10 text-gray-300 border-white/10', dot: 'bg-gray-400' };
  return (
    <span className={`inline-flex items-center gap-1.5 text-[8px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest border ${s.color}`}>
      <span className={`w-1 h-1 rounded-full ${s.dot}`} />
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

// ─── Componentes de Apoio ────────────────────────────────────────────────

function TabButton({ id, label, icon, active, onClick }: { id: string, label: string, icon: string, active: boolean, onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-6 py-4 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all border-b-2 
        ${active ? 'border-[var(--accent)] text-[var(--accent)] bg-[var(--accent)]/5' : 'border-transparent text-[var(--text-muted)] hover:bg-[var(--foreground)]/5'}`}
    >
      <span>{icon}</span>
      {label}
    </button>
  );
}

// ─── Modal de Novo/Editar Agendamento ─────────────────────────────────────
function AppointmentModal({
  onClose, onSave, initial, selectedDate, profissionais, conveniosAtivos, services
}: {
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
  initial?: Appointment | null;
  selectedDate?: Date;
  profissionais: Profissional[];
  conveniosAtivos: Convenio[];
  services: Service[];
}) {
  const { labels } = useNicho();
  const defaultDate = selectedDate || new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const defaultDateStr = `${defaultDate.getFullYear()}-${pad(defaultDate.getMonth()+1)}-${pad(defaultDate.getDate())}`;

  const [nome, setNome] = useState(initial?.paciente?.nome || '');
  const [telefone, setTelefone] = useState(initial?.paciente?.telefone || '');
  const [date, setDate] = useState(defaultDateStr);
  const [hour, setHour] = useState(initial ? formatTime(initial.dataHora) : '09:00');
  const [profissionalId, setProfissionalId] = useState(initial?.profissional?.id || '');
  const [servicoId, setServicoId] = useState(initial?.servico?.id || initial?.servicoId || '');
  const [tipoAtendimento, setTipoAtendimento] = useState(initial?.tipoAtendimento || 'particular');
  const [convenio, setConvenio] = useState(initial?.convenio || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const dataHora = `${date}T${hour}:00`;
      await onSave({ 
        nome, telefone, dataHora, 
        profissionalId: profissionalId || undefined,
        servicoId: servicoId || undefined,
        tipoAtendimento,
        convenio: tipoAtendimento === 'convenio' ? convenio : undefined
      });
      onClose();
    } catch (err: any) { setError(err.message || 'Erro ao salvar.'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[200] p-4" onClick={onClose}>
      <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[3rem] p-10 w-full max-w-xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-xl font-black tracking-tight text-[var(--foreground)] uppercase italic">📅 Agendamento</h3>
          <button onClick={onClose} className="w-10 h-10 rounded-2xl hover:bg-[var(--foreground)]/5 flex items-center justify-center text-gray-400 transition-all">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="col-span-full space-y-2">
            <label className="text-[9px] text-[var(--text-muted)] font-black uppercase tracking-widest">Nome do {labels.cliente}</label>
            <input required type="text" value={nome} onChange={e => setNome(e.target.value)}
              className="w-full bg-[var(--foreground)]/5 border border-[var(--border)] rounded-2xl px-5 py-4 text-sm focus:outline-none focus:border-[var(--accent)] transition-all font-medium" />
          </div>
          <div className="space-y-2">
            <label className="text-[9px] text-[var(--text-muted)] font-black uppercase tracking-widest">WhatsApp</label>
            <input required type="text" value={telefone} onChange={e => setTelefone(e.target.value)}
              className="w-full bg-[var(--foreground)]/5 border border-[var(--border)] rounded-2xl px-5 py-4 text-sm focus:outline-none focus:border-[var(--accent)] font-medium" placeholder="55 85 99999-9999" />
          </div>
          <div className="space-y-2">
            <label className="text-[9px] text-[var(--text-muted)] font-black uppercase tracking-widest">Tipo</label>
            <select value={tipoAtendimento} onChange={e => setTipoAtendimento(e.target.value)}
              className="w-full bg-[var(--foreground)]/5 border border-[var(--border)] rounded-2xl px-5 py-4 text-sm focus:outline-none focus:border-[var(--accent)] appearance-none font-medium">
              <option value="particular">💲 Particular</option>
              <option value="convenio">🏥 Convênio</option>
            </select>
          </div>
          <div className="col-span-full space-y-2">
            <label className="text-[9px] text-[var(--text-muted)] font-black uppercase tracking-widest">{labels.servico}</label>
            <select value={servicoId} onChange={e => setServicoId(e.target.value)} required
              className="w-full bg-[var(--foreground)]/5 border border-[var(--border)] rounded-2xl px-5 py-4 text-sm focus:outline-none focus:border-[var(--accent)] appearance-none font-medium">
              <option value="">Selecione...</option>
              {services.map(s => <option key={s.id} value={s.id}>{s.nome} - R$ {s.preco}</option>)}
            </select>
          </div>
          <div className="col-span-full space-y-2">
            <label className="text-[9px] text-[var(--text-muted)] font-black uppercase tracking-widest">{labels.profissional}</label>
            <select value={profissionalId} onChange={e => setProfissionalId(e.target.value)}
              className="w-full bg-[var(--foreground)]/5 border border-[var(--border)] rounded-2xl px-5 py-4 text-sm focus:outline-none focus:border-[var(--accent)] appearance-none">
              <option value="">Nenhum específico</option>
              {profissionais.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[9px] text-[var(--text-muted)] font-black uppercase tracking-widest">Data</label>
            <input required type="date" value={date} onChange={e => setDate(e.target.value)}
              className="w-full bg-[var(--foreground)]/5 border border-[var(--border)] rounded-2xl px-5 py-4 text-sm focus:outline-none" />
          </div>
          <div className="space-y-2">
            <label className="text-[9px] text-[var(--text-muted)] font-black uppercase tracking-widest">Horário</label>
            <select value={hour} onChange={e => setHour(e.target.value)}
              className="w-full bg-[var(--foreground)]/5 border border-[var(--border)] rounded-2xl px-5 py-4 text-sm appearance-none">
              {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
            </select>
          </div>
          <div className="col-span-full flex gap-4 pt-6">
            <button type="button" onClick={onClose} className="flex-1 py-4 bg-[var(--foreground)]/5 rounded-2xl text-[10px] font-black uppercase tracking-widest">Cancelar</button>
            <button type="submit" disabled={saving} className="flex-1 py-4 bg-[var(--accent)] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-[var(--accent)]/20">
              {saving ? 'SALVANDO...' : 'CONFIRMAR'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Card de Agendamento ──────────────────────────────────────────────────
function AppCard({ appt, onCancel, onReschedule, onDone }: {
  appt: Appointment;
  onCancel: (id: string) => void;
  onReschedule: (appt: Appointment) => void;
  onDone: (id: string) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const isPast = new Date(appt.dataHora) < new Date();

  return (
    <div className="group relative flex items-center gap-6 px-8 py-6 hover:bg-[var(--foreground)]/[0.02] transition-all border-b border-[var(--border)] last:border-0 overflow-hidden">
      {/* Indicador de cor do serviço lateral */}
      <div className="absolute left-0 top-0 bottom-0 w-1.5" style={{ backgroundColor: appt.servico?.color || 'var(--accent)' }} />
      
      <div className="w-16 flex-shrink-0 text-center flex flex-col items-center">
        <span className="text-xl font-black text-[var(--foreground)] tracking-tight">{formatTime(appt.dataHora)}</span>
        <p className="text-[9px] text-[var(--text-muted)] font-black uppercase tracking-widest mt-0.5">{formatDate(appt.dataHora).split(' ')[0]}</p>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-black text-[var(--foreground)] truncate tracking-tight">{appt.paciente?.nome}</p>
          <Badge status={appt.status} />
        </div>
        <div className="flex items-center gap-4 mt-1">
          <p className="text-[10px] text-[var(--text-muted)] font-bold">{appt.paciente?.telefone}</p>
          <span className="text-[9px] font-black text-[var(--accent)] uppercase tracking-widest">• {appt.servico?.nome}</span>
        </div>
        {appt.profissional && (
          <div className="flex items-center gap-2 mt-2 opacity-60">
            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: appt.profissional.color || 'var(--accent)' }} />
            <p className="text-[8px] text-[var(--text-muted)] uppercase font-black tracking-widest">{appt.profissional.nome}</p>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        {appt.status !== 'cancelado' && appt.status !== 'done' && (
          <button onClick={() => setMenuOpen(!menuOpen)} className="w-10 h-10 rounded-2xl hover:bg-[var(--foreground)]/5 text-gray-400 flex items-center justify-center transition-all">⋮</button>
        )}
        {menuOpen && (
          <div className="absolute right-20 top-1/2 -translate-y-1/2 bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl shadow-2xl overflow-hidden z-20 min-w-[140px] animate-in slide-in-from-right-2">
            <button onClick={() => { onDone(appt.id); setMenuOpen(false); }} className="w-full text-left px-5 py-4 text-[9px] font-black uppercase tracking-widest text-emerald-500 hover:bg-emerald-500/5 transition-all">✅ Finalizar</button>
            <button onClick={() => { onReschedule(appt); setMenuOpen(false); }} className="w-full text-left px-5 py-4 text-[9px] font-black uppercase tracking-widest hover:bg-[var(--accent)]/5 border-t border-[var(--border)] transition-all">📅 Remarcar</button>
            <button onClick={() => { onCancel(appt.id); setMenuOpen(false); }} className="w-full text-left px-5 py-4 text-[9px] font-black uppercase tracking-widest text-red-500 hover:bg-red-500/5 border-t border-[var(--border)] transition-all">✕ Cancelar</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Mini Calendário & Slots ─────────────────────────────────────────────
function MiniCalendar({ selected, appointments, onSelect }: { selected: Date, appointments: Appointment[], onSelect: (d: Date) => void }) {
  const [view, setView] = useState<Date>(new Date(selected));
  const firstDay = new Date(view.getFullYear(), view.getMonth(), 1);
  const lastDay = new Date(view.getFullYear(), view.getMonth() + 1, 0);
  const startOffset = firstDay.getDay();
  const days: (Date | null)[] = Array(startOffset).fill(null);
  for (let i = 1; i <= lastDay.getDate(); i++) days.push(new Date(view.getFullYear(), view.getMonth(), i));

  return (
    <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[2.5rem] p-8 shadow-sm">
      <div className="flex items-center justify-between mb-8">
        <button onClick={() => setView(new Date(view.getFullYear(), view.getMonth() - 1, 1))} className="text-[var(--text-muted)] font-black p-2">‹</button>
        <span className="text-[10px] font-black uppercase tracking-widest">{MONTHS[view.getMonth()]} {view.getFullYear()}</span>
        <button onClick={() => setView(new Date(view.getFullYear(), view.getMonth() + 1, 1))} className="text-[var(--text-muted)] font-black p-2">›</button>
      </div>
      <div className="grid grid-cols-7 mb-4">
        {WEEKDAYS.map(d => <div key={d} className="text-center text-[8px] text-[var(--text-muted)] font-black uppercase opacity-40">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-2">
        {days.map((day, i) => {
          if (!day) return <div key={i} />;
          const isSelected = isSameDay(day, selected);
          const isToday = isSameDay(day, new Date());
          return (
            <button key={i} onClick={() => onSelect(day)}
              className={`w-10 h-10 rounded-2xl flex items-center justify-center text-xs font-black transition-all 
                ${isSelected ? 'bg-[var(--accent)] text-white shadow-xl shadow-[var(--accent)]/20' : isToday ? 'bg-[var(--accent)]/10 text-[var(--accent)]' : 'text-[var(--text-muted)] hover:bg-[var(--foreground)]/5'}`}>
              {day.getDate()}
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
  const [activeTab, setActiveTab] = useState<'agenda' | 'profissionais' | 'financeiro' | 'inteligente'>('agenda');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showModal, setShowModal] = useState(false);
  const [rescheduleAppt, setRescheduleAppt] = useState<Appointment | null>(null);
  const [filter, setFilter] = useState('todos');
  const [search, setSearch] = useState('');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [apptsRes, teamRes, servRes] = await Promise.all([
        fetch(`/api/appointments?tenantId=${TENANT_ID}`),
        fetch(`/api/team?tenantId=${TENANT_ID}`),
        fetch(`/api/services?tenantId=${TENANT_ID}`)
      ]);
      const appts = await apptsRes.json();
      const team = await teamRes.json();
      const servs = await servRes.json();
      setAppointments(Array.isArray(appts) ? appts : appts.appointments || []);
      setProfissionais(Array.isArray(team) ? team : []);
      setServices(Array.isArray(servs) ? servs : []);
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleStatusChange = async (id: string, status: string) => {
    await fetch(`/api/bot/appointments/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, tenantId: TENANT_ID }),
    });
    fetchAll();
  };

  const handleCreate = async (data: any) => {
    await fetch('/api/bot/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, tenantId: TENANT_ID, pacienteTelefone: data.telefone, pacienteNome: data.nome }),
    });
    fetchAll();
  };

  const dayAppts = appointments.filter(a => isSameDay(new Date(a.dataHora), selectedDate));
  const filtered = dayAppts.filter(a => filter === 'todos' || a.status === filter)
    .filter(a => !search || a.paciente?.nome?.toLowerCase().includes(search.toLowerCase()))
    .sort((a,b) => new Date(a.dataHora).getTime() - new Date(b.dataHora).getTime());

  // Financeiro V2 Stats
  const realized = dayAppts.filter(a => a.status === 'done').reduce((acc, a) => acc + (a.servico?.preco || 0), 0);
  const projected = dayAppts.filter(a => a.status !== 'cancelado').reduce((acc, a) => acc + (a.servico?.preco || 0), 0);

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20 animate-in fade-in duration-700">
      
      {/* Header com Abas */}
      <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[3rem] overflow-hidden shadow-sm">
        <div className="p-8 border-b border-[var(--border)] flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h2 className="text-3xl font-black tracking-tight uppercase italic flex items-center gap-3">
              📅 Agenda <span className="text-[var(--accent)] text-lg">V2</span>
            </h2>
            <p className="text-[var(--text-muted)] text-[10px] font-black uppercase tracking-widest mt-1">Gestão centralizada e integrada</p>
          </div>
          <button onClick={() => setShowModal(true)} className="px-8 py-4 bg-[var(--accent)] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-[var(--accent)]/20">➕ Novo Agendamento</button>
        </div>
        
        <div className="flex overflow-x-auto scrollbar-hide">
          <TabButton id="agenda" label="Visão Geral" icon="🗂️" active={activeTab === 'agenda'} onClick={() => setActiveTab('agenda')} />
          <TabButton id="profissionais" label={labels.profissional + 's'} icon="👤" active={activeTab === 'profissionais'} onClick={() => setActiveTab('profissionais')} />
          <TabButton id="financeiro" label="Fluxo do Dia" icon="💰" active={activeTab === 'financeiro'} onClick={() => setActiveTab('financeiro')} />
          <TabButton id="inteligente" label="Insights IA" icon="✨" active={activeTab === 'inteligente'} onClick={() => setActiveTab('inteligente')} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Sidebar Esquerda (Calendário e Filtros) */}
        <div className="lg:col-span-3 space-y-6">
          <MiniCalendar selected={selectedDate} appointments={appointments} onSelect={setSelectedDate} />
          
          <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[2.5rem] p-6 space-y-4">
            <h4 className="text-[9px] font-black uppercase tracking-widest text-[var(--accent)] mb-4 pl-1">Status</h4>
            {['todos', 'pendente', 'confirmado', 'done', 'cancelado'].map(f => (
              <button key={f} onClick={() => setFilter(f)} 
                className={`w-full text-left px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all 
                  ${filter === f ? 'bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20' : 'text-[var(--text-muted)] hover:bg-[var(--foreground)]/5'}`}>
                {f === 'done' ? '✅ Concluído' : f === 'pendente' ? '⏳ Pendente' : f === 'confirmado' ? '👍 Confirmado' : f.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Área de Conteúdo Central */}
        <div className="lg:col-span-9">
          {activeTab === 'agenda' && (
            <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[3rem] min-h-[600px] shadow-sm overflow-hidden">
              <div className="p-8 border-b border-[var(--border)] bg-[var(--foreground)]/[0.01]">
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Pesquisar agendamentos..." 
                  className="w-full bg-[var(--foreground)]/5 border border-[var(--border)] rounded-2xl px-6 py-4 text-sm focus:outline-none focus:border-[var(--accent)] font-medium" />
              </div>
              <div className="divide-y divide-[var(--border)]">
                {loading ? (
                  <div className="p-20 text-center font-black uppercase text-[10px] tracking-widest opacity-40">Carregando...</div>
                ) : filtered.length === 0 ? (
                  <div className="p-20 text-center text-[var(--text-muted)] opacity-20 text-5xl">📭</div>
                ) : filtered.map(a => (
                  <AppCard key={a.id} appt={a} onCancel={id => handleStatusChange(id, 'cancelado')} onDone={id => handleStatusChange(id, 'done')} onReschedule={apt => { setRescheduleAppt(apt); setShowModal(true); }} />
                ))}
              </div>
            </div>
          )}

          {activeTab === 'profissionais' && (
            <div className="overflow-x-auto pb-4 custom-scrollbar">
              <div className="flex gap-6 min-w-max">
                {profissionais.map(p => (
                  <div key={p.id} className="w-80 bg-[var(--card-bg)] border border-[var(--border)] rounded-[3rem] overflow-hidden shadow-sm">
                    <div className="p-6 border-b border-[var(--border)] bg-[var(--foreground)]/[0.01] flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl" style={{ backgroundColor: p.color || 'var(--accent)' }} />
                      <div>
                        <h4 className="text-xs font-black text-[var(--foreground)] tracking-tight uppercase">{p.nome}</h4>
                        <p className="text-[8px] text-[var(--accent)] font-black uppercase tracking-widest">{p.especialidade || labels.profissional}</p>
                      </div>
                    </div>
                    <div className="p-4 space-y-4 min-h-[500px]">
                      {dayAppts.filter(a => a.profissional?.id === p.id).map(a => (
                        <div key={a.id} className="p-4 rounded-[2rem] border border-[var(--border)] bg-[var(--foreground)]/[0.02] relative pl-10" style={{ backgroundColor: (a.servico?.color || 'var(--accent)') + '08' }}>
                          <div className="absolute left-0 top-0 bottom-0 w-2 rounded-l-[2rem]" style={{ backgroundColor: a.servico?.color || 'var(--accent)' }} />
                          <p className="text-[12px] font-black text-[var(--foreground)]">{formatTime(a.dataHora)}</p>
                          <p className="text-[10px] font-bold text-[var(--foreground)] mt-1 truncate">{a.paciente.nome}</p>
                          <p className="text-[8px] font-black text-[var(--text-muted)] uppercase tracking-widest mt-0.5">{a.servico?.nome}</p>
                          <div className="mt-3"><Badge status={a.status} /></div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'financeiro' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[3rem] p-8 shadow-sm">
                  <p className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">Previsto Hoje</p>
                  <p className="text-4xl font-black text-blue-500 mt-2">R$ {projected}</p>
                </div>
                <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[3rem] p-8 shadow-sm border-l-emerald-500/20">
                  <p className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">Realizado</p>
                  <p className="text-4xl font-black text-emerald-500 mt-2">R$ {realized}</p>
                </div>
                <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[3rem] p-8 shadow-sm">
                  <p className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">Taxa Ocupação</p>
                  <p className="text-4xl font-black text-[var(--accent)] mt-2">{Math.round((dayAppts.length / (HOURS.length * profissionais.length)) * 100)}%</p>
                </div>
              </div>
              
              <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[3rem] p-10">
                <h3 className="text-lg font-black uppercase italic mb-8">Extrato Detalhado</h3>
                <div className="space-y-4">
                   {dayAppts.filter(a => a.status !== 'cancelado').map(a => (
                     <div key={a.id} className="flex items-center justify-between p-6 bg-[var(--foreground)]/[0.01] border border-[var(--border)] rounded-[2rem]">
                       <div className="flex items-center gap-4">
                         <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 font-black">💰</div>
                         <div>
                           <p className="text-xs font-black uppercase">{a.paciente.nome}</p>
                           <p className="text-[10px] text-[var(--text-muted)] font-black uppercase tracking-widest">{a.servico?.nome}</p>
                         </div>
                       </div>
                       <div className="text-right">
                         <p className="text-sm font-black text-[var(--foreground)]">R$ {a.servico?.preco || 0}</p>
                         <p className={`text-[8px] font-black uppercase tracking-widest ${a.status === 'done' ? 'text-emerald-500' : 'text-yellow-500'}`}>{a.status === 'done' ? 'Recebido' : 'Pendente'}</p>
                       </div>
                     </div>
                   ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'inteligente' && (
            <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[3rem] p-20 flex flex-col items-center justify-center text-center">
              <span className="text-6xl mb-8 animate-bounce">✨</span>
              <h3 className="text-2xl font-black italic uppercase">Brain Synka IA</h3>
              <p className="max-w-md text-[var(--text-muted)] text-sm font-medium mt-4 leading-relaxed italic">Estamos analisando seus dados de atendimento para sugerir os melhores horários de encaixe e estratégias de fidelização.</p>
              <div className="mt-10 px-8 py-4 bg-[var(--foreground)]/5 rounded-2xl text-[10px] font-black uppercase tracking-widest opacity-50 border border-dashed border-[var(--border)]">Em desenvolvimento</div>
            </div>
          )}
        </div>

      </div>

      {showModal && (
        <AppointmentModal
          onClose={() => { setShowModal(false); setRescheduleAppt(null); }}
          onSave={rescheduleAppt ? handleStatusChange : handleCreate}
          initial={rescheduleAppt}
          selectedDate={selectedDate}
          profissionais={profissionais}
          conveniosAtivos={[]}
          services={services}
        />
      )}
    </div>
  );
}
