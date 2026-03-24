"use client";
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNicho } from '@/context/NichoContext';
import { fetchWithAuth } from '@/lib/api-utils';

const HOURS = ['08:00','08:30', '09:00','09:30', '10:00','10:30', '11:00','11:30', '12:00','12:30', '13:00','13:30', '14:00','14:30', '15:00','15:30', '16:00','16:30', '17:00','17:30', '18:00', '18:30', '19:00', '19:30', '20:00'];
const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

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
  profissional?: { id: string; nome: string; color?: string };
  servico?: Service | null;
}

interface Profissional {
  id: string;
  nome: string;
  color?: string;
  especialidade?: string;
}

const STATUS_MAP: Record<string, { label: string; bg: string; text: string; dot: string; border: string }> = {
  confirmado: { label: 'Confirmado', bg: 'bg-[#E1F9EF]', text: 'text-[#065F46]', dot: 'bg-[#10B981]', border: 'border-[#10B981]/20' },
  pendente:   { label: 'Pendente',   bg: 'bg-[#FFF7E6]', text: 'text-[#92400E]', dot: 'bg-[#F59E0B]', border: 'border-[#F59E0B]/20' },
  cancelado:  { label: 'Cancelado',  bg: 'bg-[#FFF1F2]', text: 'text-[#9F1239]', dot: 'bg-[#F43F5E]', border: 'border-[#F43F5E]/20' },
  done:       { label: 'Concluído',  bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400', border: 'border-slate-200' },
};

const StatusBadge = ({ status }: { status: string }) => {
  const s = STATUS_MAP[status] || { label: status, bg: 'bg-slate-50', text: 'text-slate-400', dot: 'bg-slate-300', border: 'border-slate-200' };
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${s.bg} ${s.text} border ${s.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
};

function formatTime(iso: string) { return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); }
function formatDate(iso: string) { return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }); }
function isSameDay(a: Date, b: Date) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }

function AppointmentCard({ appt, onAction }: { appt: Appointment, onAction: (id: string, s: string) => void }) {
  const profColor = appt?.profissional?.color || '#3B82F6';

  return (
    <div className="flex-1 flex items-center justify-between p-5 bg-white border border-card-border rounded-2xl shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
      <div className="absolute left-0 top-0 bottom-0 w-1.5" style={{ backgroundColor: profColor }} />
      <div className="flex items-center gap-6">
        <div className="flex flex-col">
          <div className="flex items-center gap-3">
            <span className="text-[14px] font-black text-text-main uppercase italic tracking-tighter">{appt.paciente.nome}</span>
            <StatusBadge status={appt.status} />
          </div>
          <div className="flex items-center gap-2 mt-1.5 opacity-60">
            <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">{appt.servico?.nome}</span>
            <span className="text-[10px] text-text-placeholder">|</span>
            <span className="text-[10px] font-black text-primary italic">R$ {appt.servico?.preco || 0}</span>
            <span className="text-[10px] text-text-placeholder">|</span>
            <span className="text-[10px] font-bold text-text-main uppercase">{appt.profissional?.nome}</span>
          </div>
        </div>
      </div>
      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={(e) => { e.stopPropagation(); onAction(appt.id, 'done'); }} className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 hover:bg-status-success-bg hover:text-status-success flex items-center justify-center transition-all shadow-sm">✓</button>
        <button onClick={(e) => { e.stopPropagation(); onAction(appt.id, 'cancelado'); }} className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 hover:bg-status-error-bg hover:text-status-error flex items-center justify-center transition-all shadow-sm">✕</button>
      </div>
    </div>
  );
}

function TimeSlot({ hour, appt, onClick, onAction }: { hour: string, appt?: Appointment, onClick: () => void, onAction: (id: string, s: string) => void }) {
  return (
    <div className="flex gap-6 items-center group">
      <div className="w-20 text-center">
        <span className={`text-xl font-black tracking-tight ${appt ? 'text-text-main' : 'text-text-placeholder opacity-20'}`}>{hour}</span>
      </div>
      
      {appt ? (
        <AppointmentCard appt={appt} onAction={onAction} />
      ) : (
        <div 
          onClick={onClick}
          className="flex-1 py-6 px-10 border border-transparent bg-slate-50/50 rounded-[2rem] text-[10px] font-black text-text-placeholder uppercase tracking-[0.3em] cursor-pointer hover:bg-white hover:border-primary/20 hover:shadow-premium transition-all flex items-center justify-between group"
        >
          <span>Espaço Disponível</span>
          <span className="bg-white border border-card-border text-primary w-10 h-10 rounded-2xl flex items-center justify-center font-black text-lg shadow-sm opacity-0 group-hover:opacity-100 transition-all">+</span>
        </div>
      )}
    </div>
  );
}

export default function AgendaPage() {
  const { labels } = useNicho();
  const [activeTab, setActiveTab] = useState<'grade' | 'profissionais'>('grade');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showModal, setShowModal] = useState(false);
  const [selectedHour, setSelectedHour] = useState('');

  const fetchAll = useCallback(async () => {
    try {
      const [apptsRes, teamRes, servRes] = await Promise.all([
        fetchWithAuth('/api/appointments'),
        fetchWithAuth('/api/team'),
        fetchWithAuth('/api/services')
      ]);
      const appts = await apptsRes.json(); setAppointments(Array.isArray(appts) ? appts : appts.appointments || []);
      const team = await teamRes.json(); setProfissionais(Array.isArray(team) ? team : []);
      const servs = await servRes.json(); setServices(Array.isArray(servs) ? servs : []);
    } catch (e) {
      console.error("Error fetching agenda data:", e);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleAction = async (id: string, status: string) => {
    await fetchWithAuth(`/api/bot/appointments/${id}`, { method: 'PUT', body: JSON.stringify({ status }) });
    fetchAll();
  };

  const dayAppts = useMemo(() => appointments.filter(a => isSameDay(new Date(a.dataHora), selectedDate)), [appointments, selectedDate]);

  return (
    <div className="max-w-7xl mx-auto pb-40 px-4 animate-premium space-y-12">
      
      {/* Header Premium */}
      <div className="bg-white border border-card-border p-10 md:p-14 rounded-[3.5rem] shadow-premium flex flex-col lg:flex-row justify-between items-center gap-10 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -mr-32 -mt-32 blur-3xl" />
        <div className="flex items-center gap-8 relative z-10">
           <div className="w-16 h-16 rounded-[2rem] bg-primary text-white flex items-center justify-center text-3xl shadow-xl shadow-primary/20">📅</div>
           <div>
              <h2 className="text-2xl font-black italic uppercase tracking-tighter text-text-main leading-none">Gestão de <span className="text-primary font-bold">Agenda</span></h2>
              <p className="text-[10px] font-black text-text-placeholder uppercase tracking-[0.3em] mt-3 opacity-60">{labels.profissional} • V2.3 Official</p>
           </div>
        </div>
        <div className="flex gap-4 w-full md:w-auto relative z-10">
          <button onClick={() => { setSelectedHour(''); setShowModal(true); }} className="btn-primary py-5 px-12 shadow-2xl shadow-primary/30 w-full md:w-auto">+ NOVA CONSULTA</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        
        {/* Sidebar Nav */}
        <div className="lg:col-span-3 space-y-10">
           {/* Mini Calendar Premium */}
           <div className="bg-white border border-card-border p-8 rounded-[2.5rem] shadow-sm">
              <div className="flex items-center justify-between mb-8 px-2">
                 <button onClick={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth()-1, 1))} className="text-text-placeholder hover:text-text-main transition-colors text-xl">‹</button>
                 <span className="text-[11px] font-black uppercase tracking-widest text-text-main">{MONTHS[selectedDate.getMonth()]} {selectedDate.getFullYear()}</span>
                 <button onClick={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth()+1, 1))} className="text-text-placeholder hover:text-text-main transition-colors text-xl">›</button>
              </div>
              <div className="grid grid-cols-7 gap-1">
                 {['D','S','T','Q','Q','S','S'].map(d => <div key={d} className="text-center text-[9px] font-black uppercase text-text-placeholder mb-4 opacity-40">{d}</div>)}
                 {Array.from({length: new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1).getDay()}).map((_,i) => <div key={i}/>)}
                 {Array.from({length: new Date(selectedDate.getFullYear(), selectedDate.getMonth()+1, 0).getDate()}).map((_,i) => {
                    const day = i + 1;
                    const isSelected = isSameDay(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), day), selectedDate);
                    return <button key={day} onClick={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), day))} className={`w-9 h-9 rounded-xl text-[10px] font-black transition-all ${isSelected ? 'bg-primary text-white shadow-xl scale-110' : 'text-text-muted hover:bg-slate-50'}`}>{day}</button>
                 })}
              </div>
           </div>

           <div className="flex flex-col gap-3">
              <button onClick={() => setActiveTab('grade')} className={`w-full py-5 px-8 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] text-left transition-all ${activeTab === 'grade' ? 'bg-primary text-white shadow-xl' : 'bg-white border border-card-border text-text-muted hover:bg-slate-50'}`}>Grade Diária</button>
              <button onClick={() => setActiveTab('profissionais')} className={`w-full py-5 px-8 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] text-left transition-all ${activeTab === 'profissionais' ? 'bg-primary text-white shadow-xl' : 'bg-white border border-card-border text-text-muted hover:bg-slate-50'}`}>Por Profissional</button>
           </div>
        </div>

        {/* Content Area */}
        <div className="lg:col-span-9 animate-premium">
           {activeTab === 'grade' && (
              <div className="bg-white border border-card-border rounded-[3.5rem] p-10 md:p-14 shadow-sm space-y-12">
                <div className="flex justify-between items-center border-b border-slate-50 pb-8">
                   <h3 className="text-2xl font-black italic uppercase tracking-tighter text-text-main underline decoration-primary decoration-4 underline-offset-8">Horários de <span className="text-primary uppercase">Hoje</span></h3>
                   <span className="text-[10px] font-black uppercase tracking-widest text-text-placeholder bg-slate-50 px-6 py-3 rounded-full border border-card-border shadow-sm">{formatDate(selectedDate.toISOString())}</span>
                </div>
                <div className="grid grid-cols-1 gap-4">
                   {HOURS.map(h => {
                      const appt = dayAppts.find(a => formatTime(a.dataHora) === h);
                      return <TimeSlot key={h} hour={h} appt={appt} onAction={handleAction} onClick={() => { setSelectedHour(h); setShowModal(true); }} />
                   })}
                </div>
              </div>
           )}

           {activeTab === 'profissionais' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                 {profissionais.map(p => (
                   <div key={p.id} className="bg-white border border-card-border p-10 rounded-[3rem] shadow-sm space-y-8 hover:shadow-premium transition-all group">
                      <div className="flex items-center gap-6 border-b border-slate-50 pb-8">
                         <div className="w-14 h-14 rounded-2xl bg-primary-soft text-primary flex items-center justify-center font-black text-xl border border-primary/10 shadow-sm">{p.nome[0]}</div>
                         <div>
                            <h4 className="text-lg font-black text-text-main italic uppercase tracking-tighter leading-tight">{p.nome}</h4>
                            <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mt-1">{p.especialidade || labels.profissional}</p>
                         </div>
                      </div>
                      <div className="space-y-4">
                         {dayAppts.filter(a => a.profissional?.id === p.id).map(a => (
                           <div key={a.id} className="p-6 bg-slate-50 rounded-[1.5rem] border border-card-border relative pl-10 group overflow-hidden hover:bg-white hover:shadow-md transition-all">
                              <div className="absolute left-0 top-0 bottom-0 w-2" style={{ backgroundColor: a.servico?.color || '#3B82F6' }} />
                              <div className="flex justify-between items-start mb-2">
                                 <p className="text-xl font-black text-text-main tracking-tighter leading-none">{formatTime(a.dataHora)}</p>
                                 <StatusBadge status={a.status} />
                              </div>
                              <p className="text-[11px] font-black text-text-muted uppercase italic tracking-tight">{a.paciente.nome}</p>
                           </div>
                         ))}
                         {dayAppts.filter(a => a.profissional?.id === p.id).length === 0 && <p className="text-[9px] font-black uppercase text-text-placeholder text-center py-20 tracking-[0.4em] opacity-30">Vazio</p>}
                      </div>
                   </div>
                 ))}
              </div>
           )}
        </div>
      </div>

      {/* Modal Premium Style - Agendamento Expert */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/10 backdrop-blur-xl z-[200] flex items-center justify-center p-4 animate-premium" onClick={() => setShowModal(false)}>
           <div className="bg-white border border-card-border rounded-[4rem] p-12 md:p-16 w-full max-w-xl shadow-2xl relative overflow-hidden" onClick={e => e.stopPropagation()}>
              <div className="absolute top-0 left-0 w-full h-2 bg-primary" />
              <div className="flex justify-between items-center mb-12">
                 <h3 className="text-2xl font-black italic uppercase tracking-tighter text-text-main leading-tight">📦 Agendamento <span className="text-primary italic">Expert</span></h3>
                 <button onClick={() => setShowModal(false)} className="w-12 h-12 rounded-full hover:bg-slate-50 flex items-center justify-center text-slate-400 transition-colors">✕</button>
              </div>
              <form onSubmit={async (e) => { e.preventDefault(); const d = new FormData(e.currentTarget); await fetchWithAuth('/api/bot/appointments', { method: 'POST', body: JSON.stringify({ nome: d.get('nome'), pacienteTelefone: d.get('telefone'), pacienteNome: d.get('nome'), dataHora: `${d.get('date')}T${d.get('hour')}:00`, servicoId: d.get('serv'), profissionalId: d.get('prof') }) }); setShowModal(false); fetchAll(); }} className="space-y-8">
                 <div className="grid grid-cols-1 gap-4">
                    <input name="nome" required placeholder="Nome Completo do Cliente" className="input-premium py-5 px-8 rounded-2xl" />
                    <input name="telefone" required placeholder="WhatsApp (00) 00000-0000" className="input-premium py-5 px-8 rounded-2xl" />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <input name="date" type="date" defaultValue={new Date().toISOString().split('T')[0]} className="input-premium py-4 px-6 rounded-xl" />
                    <select name="hour" defaultValue={selectedHour || '09:00'} className="input-premium py-4 px-6 rounded-xl">
                       {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                 </div>
                 <div className="space-y-4">
                    <select name="serv" required className="input-premium w-full py-5 px-8 rounded-2xl appearance-none bg-slate-50 cursor-pointer">
                       <option value="">Selecione o Serviço...</option>
                       {services.map(s => <option key={s.id} value={s.id}>{s.nome} — R$ {s.preco}</option>)}
                    </select>
                    <select name="prof" className="input-premium w-full py-5 px-8 rounded-2xl appearance-none bg-slate-50 cursor-pointer">
                       <option value="">Profissional: Automático / Livre</option>
                       {profissionais.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                    </select>
                 </div>
                 <button type="submit" className="btn-primary w-full py-6 text-xs mt-6 shadow-2xl shadow-primary/40 rounded-[2rem] hover:scale-105 transition-all">CONFIRMAR AGENDAMENTO PREMIUM</button>
              </form>
           </div>
        </div>
      )}
    </div>
  );
}
