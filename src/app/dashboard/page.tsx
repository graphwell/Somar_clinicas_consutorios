"use client";
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNicho } from '@/context/NichoContext';
import { fetchWithAuth } from '@/lib/api-utils';

const SLOT_INTERVAL = 10;
const getTimesForDay = () => {
  const times = [];
  const startHour = 8;
  const endHour = 20;
  for (let h = startHour; h <= endHour; h++) {
    for (let m = 0; m < 60; m += SLOT_INTERVAL) {
      if (h === endHour && m > 0) break;
      times.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
    }
  }
  return times;
};
const HOURS = getTimesForDay();
const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const WEEKDAYS_SHORT = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];

interface Service {
  id: string;
  nome: string;
  preco: number;
  duracaoMinutos: number;
  bufferTimeMinutes: number;
}

interface Appointment {
  id: string;
  dataHora: string;
  fimDataHora?: string;
  durationMinutes?: number;
  status: string;
  paciente: { nome: string; telefone: string };
  profissional?: { id: string; nome: string; color?: string };
  servico?: Service | null;
  tipoAtendimento?: string;
  convenio?: string;
  observacoes?: string;
}

interface Profissional {
  id: string;
  nome: string;
  color?: string;
  especialidade?: string;
}

const STATUS_MAP: Record<string, { label: string; bg: string; text: string }> = {
  confirmado: { label: 'Confirmado', bg: '#22C55E', text: 'white' },
  pendente:   { label: 'Pendente',   bg: '#F59E0B', text: 'white' },
  cancelado:  { label: 'Cancelado',  bg: '#EF4444', text: 'white' },
  available:  { label: 'Livre',      bg: '#FFFFFF', text: '#1E293B' },
  done:       { label: 'Concluído',  bg: '#1E293B', text: 'white' },
  reagendado: { label: 'Reagendado', bg: '#6366F1', text: 'white' },
};

function formatTime(iso: string) { return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); }
function formatDate(iso: string) { return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }); }
function isSameDay(a: Date, b: Date) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }

// Componente de Célula (Hoje - Grade de Botões)
function HourCell({ hour, appt, onClick, onAction }: { hour: string, appt?: Appointment, onClick: () => void, onAction: (id: string, s: string) => void }) {
  const status = appt ? appt.status : 'available';
  const config = STATUS_MAP[status] || STATUS_MAP.available;

  return (
    <button 
      onClick={onClick} 
      className={`relative group transition-all duration-300 rounded-xl border flex flex-col items-center justify-center gap-1 overflow-hidden h-[54px] w-full
        ${appt ? 'shadow-md scale-[0.98]' : 'hover:border-primary/30 hover:bg-slate-50 border-slate-100'}
      `}
      style={{ backgroundColor: config.bg, color: config.text }}
    >
      <span className="text-[10px] font-black opacity-40 group-hover:opacity-100 transition-opacity uppercase tracking-tighter">
        {hour}
      </span>
      {appt ? (
        <div className="flex flex-col h-full justify-between items-center py-1">
          <p className="text-[9px] font-black uppercase truncate max-w-[80px] leading-none tracking-tighter">{appt.paciente.nome.split(' ')[0]}</p>
          <div className="flex gap-1 items-center">
             <span className="text-[8px]">{appt.tipoAtendimento === 'convenio' ? '🏥' : '💎'}</span>
          </div>
        </div>
      ) : (
        <span className="text-[8px] font-black opacity-0 group-hover:opacity-20 uppercase tracking-[0.2em] mt-1">Livre</span>
      )}
    </button>
  );
}

export default function AgendaPage() {
  const { labels } = useNicho();
  const [activeTab, setActiveTab] = useState<'dia' | 'semana' | 'mes' | 'profissionais'>('dia');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [convenios, setConvenios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showModal, setShowModal] = useState(false);
  const [selectedHour, setSelectedHour] = useState('');
  const [tipoAtendimento, setTipoAtendimento] = useState<'particular' | 'convenio'>('particular');

  const fetchAll = useCallback(async () => {
    try {
      const [apptsRes, teamRes, servRes, convRes] = await Promise.all([
        fetchWithAuth('/api/appointments'),
        fetchWithAuth('/api/team'),
        fetchWithAuth('/api/services'),
        fetchWithAuth('/api/convenios')
      ]);
      const appts = await apptsRes.json(); setAppointments(Array.isArray(appts) ? appts : appts.appointments || []);
      const team = await teamRes.json(); setProfissionais(Array.isArray(team) ? team : []);
      const servs = await servRes.json(); setServices(Array.isArray(servs) ? servs : []);
      const convs = await convRes.json(); setConvenios(Array.isArray(convs) ? convs : []);
    } catch (e) {
      console.error("Error fetching agenda data:", e);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleAction = async (id: string, status: string) => {
    await fetchWithAuth(`/api/bot/appointments/${id}`, { method: 'PUT', body: JSON.stringify({ status }) });
    fetchAll();
  };

  // Lógica Semanal
  const weekDays = useMemo(() => {
    const start = new Date(selectedDate);
    start.setDate(selectedDate.getDate() - selectedDate.getDay());
    return Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [selectedDate]);

  // Lógica Mensal
  const monthCells = useMemo(() => {
    const firstDay = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
    const lastDay = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);
    const start = new Date(firstDay);
    start.setDate(firstDay.getDate() - firstDay.getDay());
    const cells = [];
    const current = new Date(start);
    while (cells.length < 42) {
      cells.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    return cells;
  }, [selectedDate]);

  const dayAppts = appointments.filter(a => isSameDay(new Date(a.dataHora), selectedDate));

  return (
    <div className="max-w-full px-4 lg:px-8 pb-40 animate-premium space-y-6">
      
      {/* Header Premium - Estilo Google Pro */}
      <div className="bg-white border border-card-border p-6 rounded-[2rem] shadow-premium flex flex-col xl:flex-row justify-between items-center gap-6 sticky top-4 z-[50] backdrop-blur-xl bg-white/90">
            <div className="flex items-center gap-4">
               <div className="w-10 h-10 rounded-2xl bg-primary text-white flex items-center justify-center text-xl shadow-lg italic font-black">A</div>
               <h2 className="text-xl font-black italic uppercase tracking-tighter text-text-main">Agenda</h2>
            </div>

        {/* Tab Switcher Google Style */}
        <div className="bg-slate-100 p-1.5 rounded-[1.5rem] flex gap-1 border border-slate-200 shadow-inner">
          {[
            { id: 'dia', label: 'Dia' },
            { id: 'semana', label: 'Semana' },
            { id: 'mes', label: 'Mês' },
            { id: 'profissionais', label: 'Equipe' }
          ].map(tab => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)} 
              className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab.id ? 'bg-white text-primary shadow-premium' : 'text-text-muted hover:text-text-main hover:bg-white/50'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-4">
           {/* Mini Nav Date */}
           <div className="flex bg-white border border-slate-200 rounded-xl p-1 shadow-sm items-center">
              <button onClick={() => {
                const d = new Date(selectedDate);
                if (activeTab === 'mes') d.setMonth(d.getMonth() - 1);
                else if (activeTab === 'semana') d.setDate(d.getDate() - 7);
                else d.setDate(d.getDate() - 1);
                setSelectedDate(d);
              }} className="px-3 py-1.5 text-slate-400 hover:text-primary transition-colors">‹</button>
              <span className="px-4 py-1.5 text-[11px] font-black uppercase text-text-main min-w-[140px] text-center">
                {activeTab === 'mes' ? `${MONTHS[selectedDate.getMonth()]} ${selectedDate.getFullYear()}` : formatDate(selectedDate.toISOString())}
              </span>
              <button onClick={() => {
                const d = new Date(selectedDate);
                if (activeTab === 'mes') d.setMonth(d.getMonth() + 1);
                else if (activeTab === 'semana') d.setDate(d.getDate() + 7);
                else d.setDate(d.getDate() + 1);
                setSelectedDate(d);
              }} className="px-3 py-1.5 text-slate-400 hover:text-primary transition-colors">›</button>
           </div>
           <button onClick={() => { setSelectedHour(''); setShowModal(true); }} className="btn-primary py-4 px-10 shadow-2xl shadow-primary/30 hidden md:block">
              + AGENDAR
           </button>
        </div>
      </div>

      {/* Main Content Areas */}
      <div className="animate-premium mt-8">
        
        {/* VIEW: DIA (GRADE DE BOTÕES) */}
        {activeTab === 'dia' && (
          <div className="bg-white border border-card-border rounded-[3rem] p-10 shadow-premium space-y-10">
             <div className="flex justify-between items-center border-b border-slate-50 pb-6">
                <h3 className="text-xl font-black italic uppercase tracking-tighter text-text-main">Grade <span className="text-primary italic">10 min</span></h3>
                <div className="flex gap-2">
                   <div className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
                   <div className="w-2.5 h-2.5 rounded-full bg-slate-200" />
                </div>
             </div>
             <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-2">
                {HOURS.map(h => {
                  const [hH, hM] = h.split(':').map(Number);
                  const slotDate = new Date(selectedDate);
                  slotDate.setHours(hH, hM, 0, 0);

                  const appt = dayAppts.find(a => {
                    const start = new Date(a.dataHora);
                    // Duração real ou fallback para 30min
                    const dur = a.durationMinutes || (a.servico?.duracaoMinutos ?? 30);
                    const end = a.fimDataHora ? new Date(a.fimDataHora) : new Date(start.getTime() + dur * 60000);
                    
                    // Comparação via timestamp para ignorar variações de objeto Date e fuso
                    const sT = slotDate.getTime();
                    const aT = start.getTime();
                    const eT = end.getTime();
                    
                    return sT >= aT && sT < eT;
                  });

                  return (
                    <HourCell 
                      key={h} 
                      hour={h} 
                      appt={appt} 
                      onAction={handleAction} 
                      onClick={() => { setSelectedHour(h); setShowModal(true); }} 
                    />
                  );
                })}
             </div>
          </div>
        )}

        {/* VIEW: SEMANA (GOOGLE STYLE GRID) */}
        {activeTab === 'semana' && (
          <div className="bg-white border border-card-border rounded-[3rem] shadow-premium overflow-hidden h-[calc(100vh-250px)] min-h-[700px] flex flex-col">
             {/* Header Semana */}
             <div className="flex border-b border-slate-100 bg-slate-50/50 backdrop-blur-md sticky top-0 z-20">
                <div className="w-20 lg:w-24 flex-shrink-0 border-r border-slate-100 p-4" />
                <div className="flex-1 flex border-r border-slate-100">
                   {weekDays.map(d => {
                     const isToday = isSameDay(d, new Date());
                     return (
                       <div key={d.toString()} className={`flex-1 min-w-[120px] p-4 text-center border-r border-slate-100 last:border-0 ${isToday ? 'bg-primary/5' : ''}`}>
                          <span className={`text-[10px] font-black uppercase mb-1 block ${isToday ? 'text-primary' : 'text-text-placeholder'}`}>{WEEKDAYS_SHORT[d.getDay()]}</span>
                          <span className={`text-[20px] font-black ${isToday ? 'text-primary' : 'text-text-main'}`}>{d.getDate()}</span>
                       </div>
                     )
                   })}
                </div>
             </div>
             {/* Grid Semana */}
             <div className="flex-1 overflow-y-auto no-scrollbar relative bg-[linear-gradient(to_bottom,transparent_49px,#f1f5f9_50px)] bg-[length:100%_50px]">
                <div className="flex min-h-full">
                   <div className="w-20 lg:w-24 flex-shrink-0 border-r border-slate-100 bg-white/80 sticky left-0 z-10">
                      {HOURS.map(h => (
                         <div key={h} className="h-[50px] flex items-center justify-center pr-2">
                            <span className="text-[10px] font-black text-text-placeholder opacity-60 uppercase">{h}</span>
                         </div>
                      ))}
                   </div>
                   <div className="flex-1 flex">
                      {weekDays.map(d => (
                         <div key={d.toString()} className="flex-1 min-w-[120px] border-r border-slate-100 last:border-0 relative">
                            {appointments.filter(a => isSameDay(new Date(a.dataHora), d)).map(a => {
                               const pos = HOURS.indexOf(formatTime(a.dataHora));
                               if (pos === -1) return null;
                               return (
                                 <div key={a.id} className={`absolute inset-x-1.5 p-2 rounded-xl text-white text-[9px] font-black border-l-4 border-white/20 shadow-md transform hover:scale-[1.05] transition-all z-10 ${STATUS_MAP[a.status]?.bg || 'bg-slate-400'}`} style={{ top: pos * 50 + 2, height: 46 }}>
                                    <div className="truncate">{a.paciente.nome}</div>
                                    <div className="opacity-70 truncate uppercase text-[7px] mt-0.5">{a.servico?.nome}</div>
                                 </div>
                               )
                            })}
                         </div>
                      ))}
                   </div>
                </div>
             </div>
          </div>
        )}

        {/* VIEW: MÊS (CALENDÁRIO COMPLETO) */}
        {activeTab === 'mes' && (
          <div className="bg-white border border-card-border rounded-[3rem] shadow-premium overflow-hidden">
             <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/50">
                {WEEKDAYS_SHORT.map(d => <div key={d} className="p-4 text-center text-[10px] font-black text-text-placeholder uppercase tracking-widest">{d}</div>)}
             </div>
             <div className="grid grid-cols-7 grid-rows-6 h-[700px]">
                {monthCells.map(d => {
                  const isCurrentMonth = d.getMonth() === selectedDate.getMonth();
                  const isToday = isSameDay(d, new Date());
                  const dayAppts = appointments.filter(a => isSameDay(new Date(a.dataHora), d));
                  return (
                    <div key={d.toString()} className={`border-r border-b border-slate-100 p-4 transition-all hover:bg-slate-50 cursor-pointer flex flex-col gap-2 ${isCurrentMonth ? '' : 'bg-slate-50/30'}`} onClick={() => { setSelectedDate(d); setActiveTab('dia'); }}>
                       <div className="flex justify-between items-center">
                          <span className={`text-[12px] font-black ${isToday ? 'bg-primary text-white w-7 h-7 rounded-lg flex items-center justify-center shadow-lg' : isCurrentMonth ? 'text-text-main' : 'text-text-placeholder opacity-40'}`}>{d.getDate()}</span>
                          {dayAppts.length > 0 && <span className="text-[10px] font-black text-primary bg-primary/10 px-2 py-0.5 rounded-full">{dayAppts.length}</span>}
                       </div>
                       <div className="space-y-1 overflow-hidden">
                          {dayAppts.slice(0, 3).map(a => (
                             <div key={a.id} className="text-[8px] font-bold text-white bg-[#10B981] rounded px-1.5 py-0.5 truncate shadow-sm">
                                {formatTime(a.dataHora)} {a.paciente.nome}
                             </div>
                          ))}
                          {dayAppts.length > 3 && <div className="text-[7px] font-black text-text-placeholder text-center uppercase mt-1">+{dayAppts.length - 3} mais</div>}
                       </div>
                    </div>
                  )
                })}
             </div>
          </div>
        )}

        {/* VIEW: EQUIPE (CARDS POR PROFISSIONAL) */}
        {activeTab === 'profissionais' && (
           <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
              {profissionais.map(p => (
                 <div key={p.id} className="bg-white border border-card-border p-8 rounded-[2.5rem] shadow-premium space-y-8 hover:scale-[1.02] transition-transform cursor-pointer group">
                    <div className="flex items-center gap-5 border-b border-slate-50 pb-6">
                       <div className="w-14 h-14 rounded-2xl bg-primary text-white flex items-center justify-center font-black text-2xl shadow-lg group-hover:bg-primary/90">{p.nome[0].toUpperCase()}</div>
                       <div>
                          <h4 className="text-base font-black text-text-main uppercase italic italic leading-tight tracking-tighter">{p.nome}</h4>
                          <p className="text-[9px] font-black text-primary uppercase tracking-[0.2em] mt-1">{p.especialidade || labels.profissional}</p>
                       </div>
                    </div>
                    <div className="space-y-3">
                       {appointments.filter(a => isSameDay(new Date(a.dataHora), selectedDate) && a.profissional?.id === p.id).map(a => (
                          <div key={a.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center group/item hover:bg-white hover:shadow-md transition-all">
                             <div>
                                <span className="text-sm font-black text-text-main">{formatTime(a.dataHora)}</span>
                                <p className="text-[10px] font-bold text-text-placeholder uppercase mt-0.5">{a.paciente.nome}</p>
                             </div>
                             <div className={`w-3 h-3 rounded-full ${STATUS_MAP[a.status]?.bg || 'bg-slate-300'}`} />
                          </div>
                       ))}
                       {appointments.filter(a => isSameDay(new Date(a.dataHora), selectedDate) && a.profissional?.id === p.id).length === 0 && (
                          <p className="py-10 text-center text-[9px] font-black text-text-placeholder uppercase tracking-[0.3em] bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">Sem agendamentos</p>
                       )}
                    </div>
                 </div>
              ))}
           </div>
        )}

      </div>

      {/* FAB Mobile Style for New Appointment */}
      <button 
        onClick={() => setShowModal(true)} 
        className="fixed bottom-10 right-10 w-16 h-16 rounded-[2rem] bg-primary text-white shadow-2xl shadow-primary/40 flex items-center justify-center text-3xl font-light hover:scale-110 active:scale-90 transition-all z-[100] md:hidden"
      >
        +
      </button>

      {/* Modal Agendamento Expert */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xl z-[200] flex items-center justify-center p-4 animate-premium" onClick={() => setShowModal(false)}>
           <div className="bg-white border border-card-border rounded-[3.5rem] p-12 md:p-16 w-full max-w-xl shadow-2xl relative" onClick={e => e.stopPropagation()}>
              <div className="absolute top-0 left-0 w-full h-2 bg-primary rounded-t-full" />
              <div className="flex justify-between items-center mb-10">
                 <div>
                    <h3 className="text-2xl font-black italic uppercase tracking-tighter text-text-main">📌 Novo Agendamento <span className="text-primary">PRO</span></h3>
                    <p className="text-[10px] font-black text-text-placeholder uppercase mt-2 tracking-widest">Preencha os dados com precisão</p>
                 </div>
                 <button onClick={() => setShowModal(false)} className="w-12 h-12 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 transition-colors">✕</button>
              </div>

              <form onSubmit={async (e) => { 
                  e.preventDefault(); 
                  const d = new FormData(e.currentTarget); 
                  setLoading(true);
                  // Converte data/hora local para ISO com offset correto
                  const localDateStr = `${d.get('date')}T${d.get('hour')}:00`;
                  const localDateObj = new Date(localDateStr);
                  
                  await fetchWithAuth('/api/bot/appointments', { 
                    method: 'POST', 
                    body: JSON.stringify({ 
                      nome: d.get('nome'),
                      pacienteTelefone: d.get('telefone'),
                      pacienteNome: d.get('nome'),
                      dataHora: localDateObj.toISOString(), // Envia como UTC para o banco
                      servicoId: d.get('serv'), 
                      profissionalId: d.get('prof'),
                      tipoAtendimento: tipoAtendimento,
                      convenio: d.get('convenio'),
                      observacoes: d.get('observacoes')
                     }) 
                  }); 
                  fetchAll();
                  setLoading(false);
                  setShowModal(false); 
                }} className="space-y-6">
                
                <div className="space-y-4">
                  <input name="nome" required placeholder={`Nome Completo do ${labels.cliente}`} className="input-premium w-full bg-slate-50 py-5 px-8 rounded-2xl" />
                  <input name="telefone" required placeholder="WhatsApp (00) 00000-0000" className="input-premium w-full bg-slate-50 py-5 px-8 rounded-2xl" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <input name="date" type="date" defaultValue={new Date().toISOString().split('T')[0]} className="input-premium py-4 px-6 rounded-xl" />
                  <select name="hour" defaultValue={selectedHour || '09:00'} className="input-premium py-4 px-6 rounded-xl">
                    {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>

                 <div className="space-y-4 pt-2">
                   <div className="flex gap-4 p-1 bg-slate-50 rounded-2xl border border-slate-100 mb-2">
                      <button type="button" onClick={() => setTipoAtendimento('particular')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${tipoAtendimento === 'particular' ? 'bg-white shadow-sm text-primary' : 'text-text-placeholder'}`}>💎 PARTICULAR</button>
                      <button type="button" onClick={() => setTipoAtendimento('convenio')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${tipoAtendimento === 'convenio' ? 'bg-white shadow-sm text-primary' : 'text-text-placeholder'}`}>🏥 CONVÊNIO</button>
                   </div>

                   {tipoAtendimento === 'convenio' && (
                     <select name="convenio" required className="input-premium w-full py-5 px-8 rounded-2xl appearance-none bg-slate-50 cursor-pointer animate-in fade-in slide-in-from-top-2 border-primary/20">
                       <option value="">Escolha o Convênio...</option>
                       {convenios.map(c => <option key={c.id} value={c.nomeConvenio}>{c.nomeConvenio}</option>)}
                     </select>
                   )}

                   <select name="serv" required className="input-premium w-full py-5 px-8 rounded-2xl appearance-none bg-slate-50 cursor-pointer">
                     <option value="">Selecione o Serviço...</option>
                     {services.map(s => <option key={s.id} value={s.id}>{s.nome} — R$ {s.preco}</option>)}
                   </select>

                   <select name="prof" className="input-premium w-full py-5 px-8 rounded-2xl appearance-none bg-slate-50 cursor-pointer">
                     <option value="">{labels.profissional}: Automático / Livre</option>
                     {profissionais.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                   </select>

                   <textarea name="observacoes" placeholder="Observações e notas adicionais..." className="input-premium w-full bg-slate-50 py-5 px-8 rounded-2xl min-h-[100px] resize-none"></textarea>
                 </div>

                <button type="submit" disabled={loading} className="btn-primary w-full py-6 text-[10px] mt-6 shadow-2xl shadow-primary/30 rounded-[2rem] hover:scale-[1.02] transition-all">
                  {loading ? 'PROCESSANDO...' : 'CONFIRMAR AGENDAMENTO PREMIUM'}
                </button>
              </form>
           </div>
        </div>
      )}
    </div>
  );
}
