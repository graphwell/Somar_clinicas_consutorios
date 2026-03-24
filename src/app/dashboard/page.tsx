"use client";
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNicho } from '@/context/NichoContext';
import { fetchWithAuth } from '@/lib/api-utils';

const HOURS = ['08:00','08:30', '09:00','09:30', '10:00','10:30', '11:00','11:30', '12:00','12:30', '13:00','13:30', '14:00','14:30', '15:00','15:30', '16:00','16:30', '17:00','17:30', '18:00'];
const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
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
  preco?: number;
}

interface Profissional {
  id: string;
  nome: string;
  color?: string;
  especialidade?: string;
}

const STATUS_MAP: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  confirmado: { label: 'Confirmado', bg: 'bg-status-success-bg', text: 'text-status-success', dot: 'bg-status-success' },
  pendente:   { label: 'Pendente',   bg: 'bg-status-pending-bg', text: 'text-status-pending', dot: 'bg-status-pending' },
  cancelado:  { label: 'Cancelado',  bg: 'bg-status-error-bg',   text: 'text-status-error',   dot: 'bg-status-error' },
  done:       { label: 'Concluído',  bg: 'bg-slate-50',          text: 'text-slate-500',      dot: 'bg-slate-400' },
};

const Badge = ({ status }: { status: string }) => {
  const s = STATUS_MAP[status] || { label: status, bg: 'bg-slate-50', text: 'text-slate-400', dot: 'bg-slate-300' };
  return (
    <span className={`inline-flex items-center gap-1.5 text-[8px] px-2.5 py-1 rounded-full font-black uppercase tracking-widest border border-black/5 ${s.bg} ${s.text}`}>
      <span className={`w-1 h-1 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
};

function formatTime(iso: string) { return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); }
function formatDate(iso: string) { return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }); }
function isSameDay(a: Date, b: Date) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }

function TimeGridSlot({ hour, appt, onClick, onAction }: { hour: string, appt?: Appointment, onClick: () => void, onAction: (id: string, s: string) => void }) {
  const serviceColor = appt?.servico?.color || '#3B82F6';
  const profColor = appt?.profissional?.color || '#cbd5e1';

  return (
    <div className={`group relative flex items-center justify-between p-6 rounded-2xl border transition-all overflow-hidden
      ${appt ? 'bg-white border-card-border shadow-sm' : 'bg-background border-transparent hover:border-primary/20 cursor-pointer hover:bg-white'}`}
      onClick={() => !appt && onClick()}
      style={appt ? { backgroundColor: `${serviceColor}08` } : {}}
    >
      {appt && <div className="absolute left-0 top-0 bottom-0 w-1.5" style={{ backgroundColor: profColor }} title="Cor do Profissional" />}

      <div className="flex items-center gap-10">
        <span className={`text-xl font-black tracking-tight w-20 ${appt ? 'text-text-main' : 'text-text-placeholder opacity-30'}`}>{hour}</span>
        {appt ? (
          <div>
            <div className="flex items-center gap-3">
              <p className="font-black text-[14px] text-text-main uppercase italic">{appt.paciente.nome}</p>
              <Badge status={appt.status} />
            </div>
            <div className="flex items-center gap-2 mt-1.5">
               <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest">{appt.servico?.nome}</p>
               <span className="text-[10px] text-text-placeholder">|</span>
               <span className="text-[10px] font-black text-primary italic">R$ {appt.servico?.preco || 0}</span>
            </div>
          </div>
        ) : (
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-text-placeholder opacity-20 group-hover:opacity-40 transition-opacity">Espaço Disponível</p>
        )}
      </div>

      <div className="flex items-center gap-3">
        {appt ? (
           <div className="flex gap-2 invisible group-hover:visible transition-all">
             <button onClick={(e) => { e.stopPropagation(); onAction(appt.id, 'done'); }} className="w-10 h-10 rounded-xl bg-status-success-bg text-status-success border border-status-success/10 flex items-center justify-center text-sm shadow-sm hover:scale-105 transition-transform">✓</button>
             <button onClick={(e) => { e.stopPropagation(); onAction(appt.id, 'cancelado'); }} className="w-10 h-10 rounded-xl bg-status-error-bg text-status-error border border-status-error/10 flex items-center justify-center text-sm shadow-sm hover:scale-105 transition-transform">✕</button>
           </div>
        ) : (
           <span className="w-10 h-10 rounded-xl bg-white border border-card-border text-primary flex items-center justify-center font-black text-lg shadow-sm invisible group-hover:visible transition-all">+</span>
        )}
      </div>
    </div>
  );
}

export default function AgendaPage() {
  const { labels } = useNicho();
  const [activeTab, setActiveTab] = useState<'grade' | 'panoramica' | 'profissionais'>('grade');
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
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleAction = async (id: string, status: string) => {
    await fetchWithAuth(`/api/bot/appointments/${id}`, { method: 'PUT', body: JSON.stringify({ status }) });
    fetchAll();
  };

  const handleCreate = async (data: any) => {
    await fetchWithAuth('/api/bot/appointments', { method: 'POST', body: JSON.stringify({ ...data, pacienteTelefone: data.telefone, pacienteNome: data.nome }) });
    fetchAll();
  };

  const dayAppts = useMemo(() => appointments.filter(a => isSameDay(new Date(a.dataHora), selectedDate)), [appointments, selectedDate]);

  return (
    <div className="max-w-7xl mx-auto space-y-12 pb-40 animate-premium">
      
      {/* Search & Action Bar */}
      <div className="bg-white border border-card-border p-10 rounded-[3rem] shadow-sm flex flex-col md:flex-row justify-between items-center gap-8">
        <div className="flex items-center gap-6">
           <div className="w-14 h-14 rounded-3xl bg-primary text-white flex items-center justify-center text-2xl shadow-xl shadow-primary/20">📅</div>
           <div>
              <h2 className="text-2xl font-black italic uppercase tracking-tighter text-text-main">Gestão de <span className="text-primary">Agenda</span></h2>
              <p className="text-[10px] font-black text-text-placeholder uppercase tracking-[0.2em] mt-1 opacity-60">{labels.profissional} • V2.2 Official</p>
           </div>
        </div>
        <div className="flex gap-4 w-full md:w-auto">
          <button onClick={() => { setSelectedHour(''); setShowModal(true); }} className="flex-1 md:flex-none px-10 py-5 bg-primary text-white rounded-[1.5rem] text-[11px] font-black uppercase tracking-[0.2em] shadow-2xl shadow-primary/30 hover:scale-105 transition-all">+ Nova Consulta</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        
        {/* Sidebar Nav */}
        <div className="lg:col-span-3 space-y-8">
           <div className="premium-card p-10 bg-white">
              <div className="flex items-center justify-between mb-8">
                 <button onClick={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth()-1, 1))} className="text-text-placeholder hover:text-text-main transition-colors text-xl">‹</button>
                 <span className="text-[11px] font-black uppercase tracking-widest text-text-main">{MONTHS[selectedDate.getMonth()]} {selectedDate.getFullYear()}</span>
                 <button onClick={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth()+1, 1))} className="text-text-placeholder hover:text-text-main transition-colors text-xl">›</button>
              </div>
              <div className="grid grid-cols-7 gap-1">
                 {['D','S','T','Q','Q','S','S'].map(d => <div key={d} className="text-center text-[9px] font-black uppercase text-text-placeholder mb-4">{d}</div>)}
                 {Array.from({length: new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1).getDay()}).map((_,i) => <div key={i}/>)}
                 {Array.from({length: new Date(selectedDate.getFullYear(), selectedDate.getMonth()+1, 0).getDate()}).map((_,i) => {
                    const day = i + 1;
                    const isSelected = isSameDay(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), day), selectedDate);
                    return <button key={day} onClick={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), day))} className={`w-8 h-8 rounded-xl text-[10px] font-bold transition-all ${isSelected ? 'bg-primary text-white shadow-xl scale-110' : 'text-text-muted hover:bg-slate-50'}`}>{day}</button>
                 })}
              </div>
           </div>

           <div className="flex flex-col gap-3">
              <button onClick={() => setActiveTab('grade')} className={`w-full py-4 px-6 rounded-2xl text-[10px] font-black uppercase tracking-widest text-left transition-all ${activeTab === 'grade' ? 'bg-primary text-white shadow-lg' : 'bg-white border border-card-border text-text-muted hover:bg-slate-50'}`}>Grade Diária</button>
              <button onClick={() => setActiveTab('profissionais')} className={`w-full py-4 px-6 rounded-2xl text-[10px] font-black uppercase tracking-widest text-left transition-all ${activeTab === 'profissionais' ? 'bg-primary text-white shadow-lg' : 'bg-white border border-card-border text-text-muted hover:bg-slate-50'}`}>Por Profissional</button>
           </div>
        </div>

        {/* Content */}
        <div className="lg:col-span-9 animate-premium">
           {activeTab === 'grade' && (
              <div className="bg-white border border-card-border rounded-[3rem] p-10 shadow-sm space-y-10">
                <div className="flex justify-between items-center px-4">
                   <h3 className="text-2xl font-black italic uppercase tracking-tighter text-text-main">Horários de <span className="text-primary">Hoje</span></h3>
                   <span className="text-[10px] font-black uppercase tracking-widest text-text-placeholder bg-slate-50 px-4 py-2 rounded-full border border-card-border">{formatDate(selectedDate.toISOString())}</span>
                </div>
                <div className="grid grid-cols-1 gap-3">
                   {HOURS.map(h => {
                      const appt = dayAppts.find(a => formatTime(a.dataHora) === h);
                      return <TimeGridSlot key={h} hour={h} appt={appt} onAction={handleAction} onClick={() => { setSelectedHour(h); setShowModal(true); }} />
                   })}
                </div>
              </div>
           )}

           {activeTab === 'profissionais' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 {profissionais.map(p => (
                   <div key={p.id} className="premium-card p-10 bg-white space-y-8">
                      <div className="flex items-center gap-5 border-b border-slate-50 pb-6">
                         <div className="w-14 h-14 rounded-2xl bg-primary-soft text-primary flex items-center justify-center font-black text-lg border border-primary/20">{p.nome[0]}</div>
                         <div>
                            <h4 className="text-base font-black text-text-main italic uppercase tracking-tighter">{p.nome}</h4>
                            <p className="text-[10px] font-black text-primary uppercase tracking-widest">{p.especialidade || labels.profissional}</p>
                         </div>
                      </div>
                      <div className="space-y-4">
                         {dayAppts.filter(a => a.profissional?.id === p.id).map(a => (
                           <div key={a.id} className="p-5 bg-slate-50 rounded-2xl border border-card-border relative pl-8 group overflow-hidden">
                              <div className="absolute left-0 top-0 bottom-0 w-1.5" style={{ backgroundColor: a.servico?.color || '#3B82F6' }} />
                              <div className="flex justify-between">
                                 <p className="text-lg font-black text-text-main tracking-tighter">{formatTime(a.dataHora)}</p>
                                 <Badge status={a.status} />
                              </div>
                              <p className="text-[11px] font-black text-text-muted uppercase italic mt-1">{a.paciente.nome}</p>
                           </div>
                         ))}
                         {dayAppts.filter(a => a.profissional?.id === p.id).length === 0 && <p className="text-[9px] font-black uppercase text-text-placeholder text-center py-10 tracking-[0.3em]">Sem compromissos</p>}
                      </div>
                   </div>
                 ))}
              </div>
           )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/10 backdrop-blur-md z-[200] flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
           <div className="bg-white border border-card-border rounded-[3rem] p-12 w-full max-w-xl shadow-2xl scale-in" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between mb-10">
                 <h3 className="text-xl font-black italic uppercase tracking-tighter text-text-main">📦 Novo Agendamento</h3>
                 <button onClick={() => setShowModal(false)} className="text-text-placeholder hover:text-text-main">✕</button>
              </div>
              <form onSubmit={async (e) => { e.preventDefault(); const d = new FormData(e.currentTarget); await handleCreate({ nome: d.get('nome'), telefone: d.get('telefone'), dataHora: `${d.get('date')}T${d.get('hour')}:00`, servicoId: d.get('serv'), profissionalId: d.get('prof') }); setShowModal(false); }} className="space-y-6">
                 <div className="grid grid-cols-1 gap-6">
                    <input name="nome" required placeholder="Nome do Cliente" className="input-premium py-4" />
                    <input name="telefone" required placeholder="WhatsApp (00) 00000-0000" className="input-premium py-4" />
                 </div>
                 <div className="grid grid-cols-2 gap-6">
                    <input name="date" type="date" defaultValue={new Date().toISOString().split('T')[0]} className="input-premium" />
                    <select name="hour" defaultValue={selectedHour || '09:00'} className="input-premium">
                       {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                 </div>
                 <select name="serv" required className="input-premium w-full appearance-none">
                    <option value="">Selecione o Serviço...</option>
                    {services.map(s => <option key={s.id} value={s.id}>{s.nome} — R$ {s.preco}</option>)}
                 </select>
                 <select name="prof" className="input-premium w-full">
                    <option value="">Indiferente / Auto</option>
                    {profissionais.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                 </select>
                 <button type="submit" className="btn-primary w-full py-5 text-[11px] mt-4">Confirmar Agendamento Premium</button>
              </form>
           </div>
        </div>
      )}
    </div>
  );
}
