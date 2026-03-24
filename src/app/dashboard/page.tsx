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

const STATUS_MAP: Record<string, { label: string; bg: string; text: string }> = {
  confirmado: { label: 'Confirmado', bg: 'bg-[#10B981]', text: 'text-white' },
  pendente:   { label: 'Pendente',   bg: 'bg-[#F59E0B]', text: 'text-white' },
  cancelado:  { label: 'Cancelado',  bg: 'bg-[#F43F5E]', text: 'text-white' },
  done:       { label: 'Concluído',  bg: 'bg-slate-500', text: 'text-white' },
};

function formatTime(iso: string) { return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); }
function formatDate(iso: string) { return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }); }
function isSameDay(a: Date, b: Date) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }

function HourCell({ hour, appt, onClick, onAction }: { hour: string, appt?: Appointment, onClick: () => void, onAction: (id: string, s: string) => void }) {
  if (appt) {
    const s = STATUS_MAP[appt.status] || { label: appt.status, bg: 'bg-slate-400', text: 'text-white' };
    return (
      <div className={`relative group p-4 rounded-2xl ${s.bg} ${s.text} shadow-lg transition-all hover:scale-[1.03] cursor-pointer overflow-hidden border border-white/10`}>
        <div className="flex flex-col h-full justify-between">
          <div className="flex justify-between items-start">
            <span className="text-[14px] font-black italic">{hour}</span>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button 
                onClick={(e) => { e.stopPropagation(); onAction(appt.id, 'done'); }}
                className="w-6 h-6 rounded-lg bg-white/20 hover:bg-white/40 flex items-center justify-center text-[10px]"
              >✓</button>
            </div>
          </div>
          <p className="text-[11px] font-black uppercase truncate mt-2 leading-none tracking-tighter">{appt.paciente.nome}</p>
          <p className="text-[8px] font-bold opacity-70 uppercase tracking-widest mt-1 truncate">{appt.servico?.nome}</p>
        </div>
      </div>
    );
  }

  return (
    <button 
      onClick={onClick}
      className="p-5 rounded-2xl bg-white border border-card-border shadow-sm hover:border-primary hover:shadow-premium transition-all group flex flex-col items-center justify-center gap-1"
    >
      <span className="text-lg font-black text-text-main group-hover:text-primary transition-colors">{hour}</span>
      <span className="text-[8px] font-black text-text-placeholder uppercase tracking-[0.2em] group-hover:text-primary/50 transition-colors">Livre</span>
    </button>
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
    <div className="max-w-7xl mx-auto pb-40 px-4 animate-premium space-y-8">
      
      {/* Header Premium Simplified */}
      <div className="bg-white border border-card-border p-8 rounded-[2.5rem] shadow-premium flex flex-col lg:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-6">
           <div className="w-14 h-14 rounded-2xl bg-primary text-white flex items-center justify-center text-3xl shadow-xl shadow-primary/20">📅</div>
           <div>
              <h2 className="text-xl font-black italic uppercase tracking-tighter text-text-main">Gestão de <span className="text-primary">Agenda</span></h2>
              <p className="text-[10px] font-black text-text-placeholder uppercase tracking-[0.3em] mt-1">{labels.profissional} • V2.3</p>
           </div>
        </div>

        <div className="flex items-center gap-4 bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
           <button onClick={() => setSelectedDate(new Date(selectedDate.setDate(selectedDate.getDate()-1)))} className="w-10 h-10 rounded-xl hover:bg-white flex items-center justify-center text-slate-400 hover:text-primary transition-all shadow-sm">‹</button>
           <span className="px-6 py-2 text-[11px] font-black uppercase text-text-main bg-white rounded-xl shadow-sm border border-slate-100">{formatDate(selectedDate.toISOString())}</span>
           <button onClick={() => setSelectedDate(new Date(selectedDate.setDate(selectedDate.getDate()+1)))} className="w-10 h-10 rounded-xl hover:bg-white flex items-center justify-center text-slate-400 hover:text-primary transition-all shadow-sm">›</button>
        </div>

        <button onClick={() => { setSelectedHour(''); setShowModal(true); }} className="btn-primary px-10 shadow-2xl shadow-primary/30">
          + NOVO AGENDAMENTO
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Sidebar Nav */}
        <div className="lg:col-span-3 space-y-6">
           <div className="bg-white border border-card-border p-8 rounded-[2rem] shadow-sm">
              <div className="flex flex-col gap-2">
                 <button onClick={() => setActiveTab('grade')} className={`w-full py-4 px-6 rounded-xl text-[10px] font-black uppercase tracking-widest text-left transition-all ${activeTab === 'grade' ? 'bg-primary text-white shadow-lg' : 'text-text-muted hover:bg-slate-50'}`}>Grade de Horários</button>
                 <button onClick={() => setActiveTab('profissionais')} className={`w-full py-4 px-6 rounded-xl text-[10px] font-black uppercase tracking-widest text-left transition-all ${activeTab === 'profissionais' ? 'bg-primary text-white shadow-lg' : 'text-text-muted hover:bg-slate-50'}`}>Por Profissional</button>
              </div>
           </div>
           
           <div className="bg-primary/5 border border-primary/10 p-6 rounded-[1.5rem] flex items-center gap-4">
               <div className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center text-sm">PRO</div>
               <div>
                  <p className="text-[10px] font-black text-primary uppercase leading-tight">Sistema Ativo</p>
                  <p className="text-[8px] font-bold text-primary/60 uppercase">Cloud Base V2.3</p>
               </div>
           </div>
        </div>

        {/* Dynamic Grid Content */}
        <div className="lg:col-span-9 animate-premium">
           {activeTab === 'grade' && (
              <div className="bg-white border border-card-border rounded-[3rem] p-10 shadow-sm space-y-10">
                 <div className="flex justify-between items-center border-b border-slate-50 pb-6">
                    <h3 className="text-lg font-black italic uppercase tracking-tighter text-text-main">Horários Disponíveis <span className="text-primary italic">Hoje</span></h3>
                    <div className="flex gap-1.5">
                       <div className="w-2 h-2 rounded-full bg-status-success" />
                       <div className="w-2 h-2 rounded-full bg-slate-200" />
                    </div>
                 </div>
                 
                 {/* GRID MODEL - LADO A LADO */}
                 <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {HOURS.map(h => {
                       const appt = dayAppts.find(a => formatTime(a.dataHora) === h);
                       return (
                         <HourCell 
                           key={h} 
                           hour={h} 
                           appt={appt} 
                           onAction={handleAction} 
                           onClick={() => { setSelectedHour(h); setShowModal(true); }} 
                         />
                       )
                    })}
                 </div>
              </div>
           )}

           {activeTab === 'profissionais' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 {profissionais.map(p => (
                   <div key={p.id} className="bg-white border border-card-border p-8 rounded-[2.5rem] shadow-sm space-y-6">
                      <div className="flex items-center gap-4 border-b border-slate-50 pb-5">
                         <div className="w-12 h-12 rounded-xl bg-slate-100 text-primary flex items-center justify-center font-black">{p.nome[0]}</div>
                         <div>
                            <h4 className="text-sm font-black text-text-main uppercase italic">{p.nome}</h4>
                            <p className="text-[9px] font-black text-primary uppercase opacity-60">{p.especialidade || labels.profissional}</p>
                         </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                         {dayAppts.filter(a => a.profissional?.id === p.id).map(a => (
                           <div key={a.id} className={`p-3 rounded-xl border border-card-border ${a.status === 'confirmado' ? 'bg-[#10B981] text-white' : 'bg-slate-50 text-text-main'}`}>
                              <span className="text-[10px] font-black">{formatTime(a.dataHora)}</span>
                              <p className="text-[8px] font-bold uppercase truncate">{a.paciente.nome}</p>
                           </div>
                         ))}
                      </div>
                   </div>
                 ))}
              </div>
           )}
        </div>
      </div>

      {/* Modal Premium */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[200] flex items-center justify-center p-4 animate-premium" onClick={() => setShowModal(false)}>
           <div className="bg-white border border-card-border rounded-[3rem] p-12 w-full max-w-lg shadow-2xl relative" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-10">
                 <h3 className="text-xl font-black italic uppercase tracking-tighter text-text-main">📦 Novo Agendamento</h3>
                 <button onClick={() => setShowModal(false)} className="w-10 h-10 rounded-full hover:bg-slate-50 flex items-center justify-center text-slate-400">✕</button>
              </div>
              
              <form onSubmit={async (e) => { 
                  e.preventDefault(); 
                  const d = new FormData(e.currentTarget); 
                  setLoading(true);
                  await fetchWithAuth('/api/bot/appointments', { 
                    method: 'POST', 
                    body: JSON.stringify({ 
                      nome: d.get('nome'),
                      pacienteTelefone: d.get('telefone'),
                      pacienteNome: d.get('nome'),
                      dataHora: `${d.get('date')}T${d.get('hour')}:00`, 
                      servicoId: d.get('serv'), 
                      profissionalId: d.get('prof') 
                    }) 
                  }); 
                  fetchAll();
                  setLoading(false);
                  setShowModal(false); 
                }} className="space-y-6">
                
                <input name="nome" required placeholder="Nome do Cliente" className="input-premium w-full bg-slate-50 py-4 px-6 rounded-xl" />
                <input name="telefone" required placeholder="Telefone / WhatsApp" className="input-premium w-full bg-slate-50 py-4 px-6 rounded-xl" />

                <div className="grid grid-cols-2 gap-4">
                  <input name="date" type="date" defaultValue={new Date().toISOString().split('T')[0]} className="input-premium py-4 rounded-xl px-4" />
                  <select name="hour" defaultValue={selectedHour || '09:00'} className="input-premium py-4 rounded-xl px-4">
                    {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>

                <select name="serv" required className="input-premium w-full py-4 rounded-xl px-4 appearance-none mb-4">
                  <option value="">Selecione o Serviço...</option>
                  {services.map(s => <option key={s.id} value={s.id}>{s.nome} — R$ {s.preco}</option>)}
                </select>

                <select name="prof" className="input-premium w-full py-4 rounded-xl px-4 appearance-none">
                  <option value="">Profissional: Automático</option>
                  {profissionais.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                </select>

                <button type="submit" disabled={loading} className="btn-primary w-full py-5 text-[10px] mt-6 shadow-2xl shadow-primary/30">
                  {loading ? 'AGUARDE...' : 'CONFIRMAR AGENDAMENTO'}
                </button>
              </form>
           </div>
        </div>
      )}
    </div>
  );
}
