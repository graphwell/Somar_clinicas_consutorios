"use client";
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNicho } from '@/context/NichoContext';

const TENANT_ID = 'clinica_id_default';
const HOURS = ['08:00','08:30', '09:00','09:30', '10:00','10:30', '11:00','11:30', '12:00','12:30', '13:00','13:30', '14:00','14:30', '15:00','15:30', '16:00','16:30', '17:00','17:30', '18:00'];
const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const WEEKDAYS_LABELS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

interface Service {
  id: string;
  nome: string;
  preco: number;
  color?: string;
  duracaoMinutos?: number;
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

// ─── Modal de Agendamento ────────────────────────────────────────────────
function AppointmentModal({
  onClose, onSave, initial, selectedDate, selectedHour, profissionais, services
}: {
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
  initial?: Appointment | null;
  selectedDate?: Date;
  selectedHour?: string;
  profissionais: Profissional[];
  services: Service[];
}) {
  const { labels } = useNicho();
  const pad = (n: number) => String(n).padStart(2, '0');
  const d = selectedDate || new Date();
  const dateStr = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;

  const [nome, setNome] = useState(initial?.paciente?.nome || '');
  const [telefone, setTelefone] = useState(initial?.paciente?.telefone || '');
  const [date, setDate] = useState(dateStr);
  const [hour, setHour] = useState(initial ? formatTime(initial.dataHora) : selectedHour || '09:00');
  const [profissionalId, setProfissionalId] = useState(initial?.profissional?.id || '');
  const [servicoId, setServicoId] = useState(initial?.servico?.id || initial?.servicoId || '');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const dataHora = `${date}T${hour}:00`;
      await onSave({ nome, telefone, dataHora, profissionalId, servicoId });
      onClose();
    } catch { alert('Erro ao salvar'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[200] p-4" onClick={onClose}>
      <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[3rem] p-10 w-full max-w-xl shadow-2xl" onClick={e => e.stopPropagation()}>
        <h3 className="text-xl font-black uppercase italic mb-8">📅 {initial ? 'Editar' : 'Novo'} Agendamento</h3>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-2">
               <label className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">Paciente</label>
               <input required value={nome} onChange={e => setNome(e.target.value)} className="w-full bg-[var(--foreground)]/5 border border-[var(--border)] rounded-2xl px-5 py-4 text-sm focus:outline-none focus:border-[var(--accent)]" />
             </div>
             <div className="space-y-2">
               <label className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">WhatsApp</label>
               <input required value={telefone} onChange={e => setTelefone(e.target.value)} className="w-full bg-[var(--foreground)]/5 border border-[var(--border)] rounded-2xl px-5 py-4 text-sm focus:outline-none focus:border-[var(--accent)]" />
             </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-2">
               <label className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">Data</label>
               <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full bg-[var(--foreground)]/5 border border-[var(--border)] rounded-2xl px-5 py-4 text-sm focus:outline-none" />
             </div>
             <div className="space-y-2">
               <label className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">Horário</label>
               <select value={hour} onChange={e => setHour(e.target.value)} className="w-full bg-[var(--foreground)]/5 border border-[var(--border)] rounded-2xl px-5 py-4 text-sm appearance-none focus:outline-none">
                 {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
               </select>
             </div>
          </div>
          <div className="space-y-2">
             <label className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">Serviço</label>
             <select required value={servicoId} onChange={e => setServicoId(e.target.value)} className="w-full bg-[var(--foreground)]/5 border border-[var(--border)] rounded-2xl px-5 py-4 text-sm appearance-none focus:outline-none">
                <option value="">Selecione...</option>
                {services.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
             </select>
          </div>
          <div className="space-y-2">
             <label className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">Profissional</label>
             <select value={profissionalId} onChange={e => setProfissionalId(e.target.value)} className="w-full bg-[var(--foreground)]/5 border border-[var(--border)] rounded-2xl px-5 py-4 text-sm appearance-none focus:outline-none">
                <option value="">Qualquer um</option>
                {profissionais.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
             </select>
          </div>
          <div className="flex gap-4 pt-4">
             <button type="button" onClick={onClose} className="flex-1 py-4 bg-[var(--foreground)]/5 rounded-2xl text-[10px] font-black uppercase">Cancelar</button>
             <button type="submit" className="flex-1 py-4 bg-[var(--accent)] text-white rounded-2xl text-[10px] font-black uppercase shadow-xl shadow-[var(--accent)]/20">
               {saving ? 'Gravando...' : 'Confirmar'}
             </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── TimeGrid Slot ───────────────────────────────────────────────────────
function TimeGridSlot({ hour, appt, onClick, onAction }: { hour: string, appt?: Appointment, onClick: () => void, onAction: (id: string, s: string) => void }) {
  return (
    <div className={`p-4 rounded-3xl border transition-all flex items-center justify-between group 
      ${appt ? 'bg-red-500/5 border-red-500/20 shadow-sm' : 'bg-emerald-500/5 border-emerald-500/20 hover:border-emerald-500/40 cursor-pointer hover:scale-[1.01]'}`}
      onClick={() => !appt && onClick()}>
      
      <div className="flex items-center gap-6">
        <span className={`text-lg font-black tracking-tighter ${appt ? 'text-red-400' : 'text-emerald-400 opacity-60'}`}>{hour}</span>
        {appt ? (
          <div>
            <div className="flex items-center gap-2">
              <p className="font-black text-xs text-[var(--foreground)] uppercase truncate max-w-[150px] italic">{appt.paciente.nome}</p>
              <Badge status={appt.status} />
            </div>
            <p className="text-[10px] text-[var(--text-muted)] font-bold mt-0.5">{appt.servico?.nome}</p>
          </div>
        ) : (
          <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400/30">Livre para marcação</p>
        )}
      </div>

      <div className="flex items-center gap-3">
        {appt ? (
           <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
             <button onClick={(e) => { e.stopPropagation(); onAction(appt.id, 'done'); }} className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border border-emerald-500/30">✓</button>
             <button onClick={(e) => { e.stopPropagation(); onAction(appt.id, 'cancelado'); }} className="p-2.5 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/30">✕</button>
           </div>
        ) : (
           <span className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-black opacity-0 group-hover:opacity-100 transition-opacity">+</span>
        )}
      </div>
    </div>
  );
}

// ─── Página Principal ─────────────────────────────────────────────────────
export default function AgendaPage() {
  const { labels } = useNicho();
  const [activeTab, setActiveTab] = useState<'grade' | 'panoramica' | 'profissionais' | 'financeiro'>('grade');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showModal, setShowModal] = useState(false);
  const [selectedHour, setSelectedHour] = useState('');
  const [rescheduleAppt, setRescheduleAppt] = useState<Appointment | null>(null);

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

  const handleAction = async (id: string, status: string) => {
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

  const dayAppts = useMemo(() => appointments.filter(a => isSameDay(new Date(a.dataHora), selectedDate)), [appointments, selectedDate]);

  // Lógica de Semana para Visão Panorâmica
  const currentWeek = useMemo(() => {
    const start = new Date(selectedDate);
    start.setDate(selectedDate.getDate() - selectedDate.getDay());
    return Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [selectedDate]);

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-40 animate-in fade-in duration-700">
      
      {/* Header Premium */}
      <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[3rem] overflow-hidden shadow-sm">
        <div className="p-8 border-b border-[var(--border)] flex justify-between items-center">
          <div>
             <h2 className="text-3xl font-black italic uppercase tracking-tighter">📅 Agenda <span className="text-[var(--accent)] text-lg">V2.1</span></h2>
             <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mt-1 opacity-60">Ambiente de produção operacional</p>
          </div>
          <button onClick={() => { setSelectedHour(''); setShowModal(true); }} className="px-8 py-4 bg-[var(--accent)] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-[var(--accent)]/20 active:scale-95">➕ Novo Agendamento</button>
        </div>
        <div className="flex overflow-x-auto scrollbar-hide">
          <button onClick={() => setActiveTab('grade')} className={`px-8 py-5 text-[10px] font-black uppercase tracking-widest transition-all border-b-2 flex-shrink-0 ${activeTab === 'grade' ? 'border-[var(--accent)] text-[var(--accent)] bg-[var(--accent)]/5' : 'border-transparent text-[var(--text-muted)] hover:bg-[var(--foreground)]/5'}`}>🟩 Grade Diária</button>
          <button onClick={() => setActiveTab('panoramica')} className={`px-8 py-5 text-[10px] font-black uppercase tracking-widest transition-all border-b-2 flex-shrink-0 ${activeTab === 'panoramica' ? 'border-[var(--accent)] text-[var(--accent)] bg-[var(--accent)]/5' : 'border-transparent text-[var(--text-muted)] hover:bg-[var(--foreground)]/5'}`}>🗓️ Visão Panorâmica</button>
          <button onClick={() => setActiveTab('profissionais')} className={`px-8 py-5 text-[10px] font-black uppercase tracking-widest transition-all border-b-2 flex-shrink-0 ${activeTab === 'profissionais' ? 'border-[var(--accent)] text-[var(--accent)] bg-[var(--accent)]/5' : 'border-transparent text-[var(--text-muted)] hover:bg-[var(--foreground)]/5'}`}>👤 Por {labels.profissional}</button>
          <button onClick={() => setActiveTab('financeiro')} className={`px-8 py-5 text-[10px] font-black uppercase tracking-widest transition-all border-b-2 flex-shrink-0 ${activeTab === 'financeiro' ? 'border-[var(--accent)] text-[var(--accent)] bg-[var(--accent)]/5' : 'border-transparent text-[var(--text-muted)] hover:bg-[var(--foreground)]/5'}`}>💰 Financeiro</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Sidebar: Calendário */}
        <div className="lg:col-span-3 space-y-6">
           <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[2.5rem] p-8 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                 <button onClick={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth()-1, 1))} className="text-gray-500 font-black p-2 hover:bg-white/5 rounded-xl">‹</button>
                 <span className="text-[10px] font-black uppercase tracking-widest">{MONTHS[selectedDate.getMonth()]} {selectedDate.getFullYear()}</span>
                 <button onClick={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth()+1, 1))} className="text-gray-500 font-black p-2 hover:bg-white/5 rounded-xl">›</button>
              </div>
              <div className="grid grid-cols-7 gap-1">
                 {['D','S','T','Q','Q','S','S'].map(d => <div key={d} className="text-center text-[8px] font-black uppercase text-gray-600 mb-4">{d}</div>)}
                 {Array.from({length: new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1).getDay()}).map((_,i) => <div key={i}/>)}
                 {Array.from({length: new Date(selectedDate.getFullYear(), selectedDate.getMonth()+1, 0).getDate()}).map((_,i) => {
                    const day = i + 1;
                    const dObj = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), day);
                    const isSelected = isSameDay(dObj, selectedDate);
                    return <button key={day} onClick={() => setSelectedDate(dObj)} className={`w-8 h-8 rounded-xl text-[10px] font-black transition-all ${isSelected ? 'bg-[var(--accent)] text-white shadow-lg' : 'text-gray-400 hover:bg-white/5'}`}>{day}</button>
                 })}
              </div>
           </div>
           
           <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-[2rem] p-6 text-center shadow-sm">
              <p className="text-[10px] font-black uppercase text-emerald-500 mb-1">Status do Dia</p>
              <p className="text-2xl font-black text-[var(--foreground)]">{dayAppts.length} Agendados</p>
           </div>
        </div>

        {/* Content Area */}
        <div className="lg:col-span-9">
           {activeTab === 'grade' && (
              <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[3rem] p-8 shadow-sm animate-in slide-in-from-bottom-4">
                <div className="mb-8 flex justify-between items-center">
                   <h3 className="text-xl font-black italic uppercase tracking-tighter">Grade de Horários <span className="text-[var(--accent)] opacity-40">/ {formatDate(selectedDate.toISOString())}</span></h3>
                   <div className="hidden sm:flex gap-4">
                      <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500"/> <span className="text-[8px] font-black uppercase text-[var(--text-muted)]">Livre</span></div>
                      <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-red-500"/> <span className="text-[8px] font-black uppercase text-[var(--text-muted)]">Ocupado</span></div>
                   </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   {HOURS.map(h => {
                      const appt = dayAppts.find(a => formatTime(a.dataHora) === h);
                      return <TimeGridSlot key={h} hour={h} appt={appt} onAction={handleAction} onClick={() => { setSelectedHour(h); setShowModal(true); }} />
                   })}
                </div>
              </div>
           )}

           {activeTab === 'panoramica' && (
              <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[3rem] p-8 min-h-[700px] overflow-hidden shadow-sm animate-in slide-in-from-bottom-4">
                 {/* Header da Semana */}
                 <div className="grid grid-cols-8 gap-4 mb-8">
                    <div className="h-10 invisible" /> {/* Spacer para a coluna de horários */}
                    {currentWeek.map((d, i) => (
                       <div key={i} className={`text-center p-3 rounded-2xl border transition-all ${isSameDay(d, selectedDate) ? 'bg-[var(--accent)]/10 border-[var(--accent)]' : 'bg-[var(--foreground)]/5 border-transparent opacity-40'}`}>
                          <p className="text-[8px] font-black uppercase tracking-widest text-[var(--text-muted)]">{WEEKDAYS_LABELS[d.getDay()]}</p>
                          <p className={`text-lg font-black ${isSameDay(d, selectedDate) ? 'text-[var(--accent)]' : 'text-white'}`}>{d.getDate()}</p>
                       </div>
                    ))}
                 </div>

                 {/* Grade Semanal Real */}
                 <div className="relative border-t border-[var(--border)] pt-4 overflow-y-auto max-h-[600px] custom-scrollbar">
                    {HOURS.map((h, hIdx) => (
                       <div key={h} className="group flex items-start gap-4 h-16 border-b border-[var(--border)]/10 border-dashed relative">
                          <span className="w-16 text-[10px] font-black text-gray-500 mt-[-6px]">{h}</span>
                          <div className="flex-1 grid grid-cols-7 gap-4 h-full">
                             {currentWeek.map((d, dIdx) => {
                                const appt = appointments.find(a => {
                                  const aDate = new Date(a.dataHora);
                                  return isSameDay(aDate, d) && formatTime(a.dataHora) === h;
                                });
                                if (!appt) return <div key={dIdx} className="h-full border-r border-[var(--border)]/5" />;
                                
                                return (
                                  <div 
                                    key={dIdx} 
                                    className="absolute inset-x-0 mx-[-8px] h-[60px] rounded-xl border-l-[6px] p-3 shadow-xl cursor-pointer hover:brightness-125 transition-all z-10"
                                    style={{ 
                                      backgroundColor: (appt.servico?.color || 'var(--accent)') + '20',
                                      borderColor: appt.servico?.color || 'var(--accent)',
                                      gridColumnStart: dIdx + 2,
                                      marginTop: '2px',
                                      width: '12.5%'
                                    }}
                                    onClick={() => { setRescheduleAppt(appt); setShowModal(true); }}
                                  >
                                    <p className="text-[9px] font-black uppercase tracking-widest text-[var(--foreground)] truncate italic">{appt.paciente.nome}</p>
                                    <p className="text-[8px] font-bold text-[var(--text-muted)] truncate opacity-60">{appt.servico?.nome}</p>
                                  </div>
                                );
                             })}
                          </div>
                       </div>
                    ))}
                 </div>
              </div>
           )}

           {activeTab === 'profissionais' && (
              <div className="flex gap-6 overflow-x-auto pb-4 custom-scrollbar scrollbar-hide">
                {profissionais.map(p => (
                  <div key={p.id} className="w-80 min-w-[320px] bg-[var(--card-bg)] border border-[var(--border)] rounded-[3rem] overflow-hidden shadow-sm flex-shrink-0">
                    <div className="p-6 border-b border-[var(--border)] bg-[var(--foreground)]/[0.01] flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl" style={{ backgroundColor: p.color || 'var(--accent)' }} />
                      <div>
                        <h4 className="text-xs font-black text-[var(--foreground)] tracking-tight uppercase italic">{p.nome}</h4>
                        <p className="text-[8px] text-[var(--accent)] font-black uppercase tracking-widest">{p.especialidade || labels.profissional}</p>
                      </div>
                    </div>
                    <div className="p-4 space-y-4 min-h-[500px]">
                      {dayAppts.filter(a => a.profissional?.id === p.id).map(a => (
                        <div key={a.id} className="p-5 rounded-[2.5rem] border border-[var(--border)] bg-[var(--foreground)]/[0.02] relative pl-10 group transition-all hover:border-[var(--accent)]/40" style={{ backgroundColor: (a.servico?.color || 'var(--accent)') + '08' }}>
                          <div className="absolute left-0 top-0 bottom-0 w-2.5 rounded-l-[2rem]" style={{ backgroundColor: a.servico?.color || 'var(--accent)' }} />
                          <div className="flex justify-between items-start">
                            <div>
                               <p className="text-[12px] font-black text-[var(--foreground)]">{formatTime(a.dataHora)}</p>
                               <p className="text-[10px] font-bold text-[var(--foreground)] mt-1 truncate italic">{a.paciente.nome}</p>
                            </div>
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                               <button onClick={() => handleAction(a.id, 'done')} className="text-emerald-500 font-bold text-[10px] mr-2">✓</button>
                               <button onClick={() => handleAction(a.id, 'cancelado')} className="text-red-500 font-bold text-[10px]">✕</button>
                            </div>
                          </div>
                          <p className="text-[8px] font-black text-[var(--text-muted)] uppercase tracking-widest mt-2">{a.servico?.nome}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
           )}
           
           {activeTab === 'financeiro' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in zoom-in-95 duration-500">
                 <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[3rem] p-10 flex flex-col justify-between h-64 border-l-blue-500/40 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 text-6xl opacity-10 grayscale group-hover:grayscale-0 transition-all">📈</div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-blue-500">Fluxo Projetado</p>
                    <p className="text-5xl font-black text-[var(--foreground)] tracking-tighter italic">R$ {dayAppts.filter(a => a.status !== 'cancelado').reduce((acc, a) => acc + (a.servico?.preco || 0), 0)}</p>
                    <p className="text-[8px] font-black uppercase tracking-[0.3em] opacity-40">Total estimado para hoje</p>
                 </div>
                 <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[3rem] p-10 flex flex-col justify-between h-64 border-l-emerald-500/40 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 text-6xl opacity-10 grayscale group-hover:grayscale-0 transition-all">💰</div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Caixa Realizado</p>
                    <p className="text-5xl font-black text-[var(--foreground)] tracking-tighter italic">R$ {dayAppts.filter(a => a.status === 'done').reduce((acc, a) => acc + (a.servico?.preco || 0), 0)}</p>
                    <p className="text-[8px] font-black uppercase tracking-[0.3em] opacity-40">Consultas concluídas</p>
                 </div>
              </div>
           )}
        </div>

      </div>

      {showModal && (
        <AppointmentModal
          onClose={() => { setShowModal(false); setRescheduleAppt(null); }}
          onSave={rescheduleAppt ? (data) => handleAction(rescheduleAppt.id, 'confirmado') : handleCreate}
          initial={rescheduleAppt}
          selectedDate={selectedDate}
          selectedHour={selectedHour}
          profissionais={profissionais}
          services={services}
        />
      )}
    </div>
  );
}
