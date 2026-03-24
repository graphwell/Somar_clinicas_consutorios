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

const STATUS_MAP: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  confirmado: { label: 'Confirmado', bg: 'bg-[#10B981]', text: 'text-white', dot: 'bg-white' },
  pendente:   { label: 'Pendente',   bg: 'bg-[#F59E0B]', text: 'text-white', dot: 'bg-white' },
  cancelado:  { label: 'Cancelado',  bg: 'bg-[#F43F5E]', text: 'text-white', dot: 'bg-white' },
  done:       { label: 'Concluído',  bg: 'bg-slate-500', text: 'text-white', dot: 'bg-white' },
};

const CompactBadge = ({ status }: { status: string }) => {
  const s = STATUS_MAP[status] || { label: status, bg: 'bg-slate-400', text: 'text-white', dot: 'bg-white' };
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-tighter ${s.bg} ${s.text}`}>
      {s.label}
    </span>
  );
};

function formatTime(iso: string) { return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); }
function formatDate(iso: string) { return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }); }
function isSameDay(a: Date, b: Date) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }

export default function AgendaPage() {
  const { labels } = useNicho();
  const [activeTab, setActiveTab] = useState<'grade' | 'semanal'>('grade');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showModal, setShowModal] = useState(false);
  const [selectedHour, setSelectedHour] = useState('');
  const [selectedProfId, setSelectedProfId] = useState('');

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

  const dayAppts = useMemo(() => appointments.filter(a => isSameDay(new Date(a.dataHora), selectedDate)), [appointments, selectedDate]);

  const handleAction = async (id: string, status: string) => {
    await fetchWithAuth(`/api/bot/appointments/${id}`, { method: 'PUT', body: JSON.stringify({ status }) });
    fetchAll();
  };

  return (
    <div className="max-w-full px-2 md:px-6 pb-20 animate-premium space-y-6">
      
      {/* Header Compact - Estilo Moderno */}
      <div className="bg-white border border-card-border p-6 rounded-[2rem] shadow-premium flex flex-col lg:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-5">
           <div className="w-12 h-12 rounded-2xl bg-primary text-white flex items-center justify-center text-xl shadow-lg">📅</div>
           <div>
              <h2 className="text-lg font-black uppercase tracking-tighter italic leading-tight">Painel de <span className="text-primary italic font-bold">Agenda</span></h2>
              <p className="text-[9px] font-black text-text-placeholder uppercase tracking-[0.2em]">{formatDate(selectedDate.toISOString())}</p>
           </div>
        </div>

        {/* Tab Control Estilo Google */}
        <div className="bg-slate-100 p-1 rounded-2xl flex gap-1 border border-slate-200">
          <button 
            onClick={() => setActiveTab('grade')} 
            className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'grade' ? 'bg-white text-primary shadow-sm' : 'text-text-muted hover:text-text-main'}`}
          >
            Visão Equipe
          </button>
          <button 
            onClick={() => setActiveTab('semanal')} 
            className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'semanal' ? 'bg-white text-primary shadow-sm' : 'text-text-muted hover:text-text-main'}`}
          >
            Visão Semanal
          </button>
        </div>

        <div className="flex items-center gap-4">
           {/* Date Picker Micro */}
           <div className="flex bg-slate-50 border border-slate-200 rounded-xl overflow-hidden p-1 shadow-sm">
             <button onClick={() => setSelectedDate(new Date(selectedDate.setDate(selectedDate.getDate()-1)))} className="px-3 py-1 text-slate-400 hover:text-primary transition-colors hover:bg-white rounded-md">‹</button>
             <span className="px-4 py-1 text-[10px] font-black uppercase flex items-center text-text-main bg-white rounded-lg shadow-sm">Hoje</span>
             <button onClick={() => setSelectedDate(new Date(selectedDate.setDate(selectedDate.getDate()+1)))} className="px-3 py-1 text-slate-400 hover:text-primary transition-colors hover:bg-white rounded-md">›</button>
           </div>
           <button onClick={() => { setSelectedHour(''); setShowModal(true); }} className="btn-primary py-4 px-10 shadow-2xl shadow-primary/40">+ AGENDAR</button>
        </div>
      </div>

      {/* GRADE MULTI-COLUNA (Estilo Google Calendar) */}
      <div className="bg-white border border-card-border rounded-[2.5rem] shadow-premium overflow-hidden flex flex-col h-[calc(100vh-250px)] min-h-[600px]">
        
        {/* Header da Grade */}
        <div className="flex border-b border-slate-100 bg-slate-50/50 backdrop-blur-sm sticky top-0 z-20">
           {/* Célula de Canto (Horários) */}
           <div className="w-20 lg:w-28 flex-shrink-0 border-r border-slate-100 p-4" />
           
           {/* Colunas (Profissionais ou Dias) */}
           <div className="flex-1 flex overflow-x-auto no-scrollbar">
              {activeTab === 'grade' ? (
                profissionais.map(p => (
                  <div key={p.id} className="flex-1 min-w-[200px] border-r border-slate-100 p-4 text-center group cursor-pointer hover:bg-primary/5 transition-colors">
                    <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 mx-auto text-primary flex items-center justify-center font-black text-sm mb-2 shadow-sm group-hover:bg-primary group-hover:text-white transition-all">{p.nome[0].toUpperCase()}</div>
                    <span className="text-[11px] font-black uppercase text-text-main tracking-tighter group-hover:text-primary transition-colors">{p.nome}</span>
                    <p className="text-[8px] font-bold text-text-placeholder uppercase mt-0.5">{p.especialidade || labels.profissional}</p>
                  </div>
                ))
              ) : (
                ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map((d, i) => (
                  <div key={d} className="flex-1 min-w-[150px] border-r border-slate-100 p-4 text-center">
                    <span className="text-[10px] font-black uppercase text-text-placeholder block mb-1">{d}</span>
                    <span className="text-[14px] font-black text-text-main">2{i + 4}</span> {/* Placeholder para dias do mês */}
                  </div>
                ))
              )}
           </div>
        </div>

        {/* Corpo da Grade Scrollable */}
        <div className="flex-1 overflow-y-auto relative no-scrollbar bg-[linear-gradient(to_bottom,transparent_49px,#f1f5f9_50px)] bg-[length:100%_50px]">
          
          <div className="flex min-h-full">
             {/* Eixo de Tempo (Fixado à esquerda via CSS flex) */}
             <div className="w-20 lg:w-28 flex-shrink-0 border-r border-slate-100 bg-white/80 sticky left-0 z-10">
                {HOURS.map(h => (
                   <div key={h} className="h-[50px] flex items-center justify-center pr-2">
                      <span className="text-[10px] font-black text-text-placeholder opacity-60 uppercase">{h}</span>
                   </div>
                ))}
             </div>

             {/* Grade de Conteúdo */}
             <div className="flex-1 flex relative">
                {activeTab === 'grade' && profissionais.map(p => (
                  <div key={p.id} className="flex-1 min-w-[200px] border-r border-slate-100 relative group">
                     {/* Slots de Agendamento Vazio (Hover Effect) */}
                     {HOURS.map(h => (
                       <button 
                         key={h} 
                         onClick={() => { setSelectedHour(h); setSelectedProfId(p.id); setShowModal(true); }}
                         className="absolute w-full h-[50px] hover:bg-primary/[0.03] transition-colors border-b border-slate-50 cursor-pointer flex items-center justify-center opacity-0 hover:opacity-100 text-primary font-black text-lg"
                         style={{ top: HOURS.indexOf(h) * 50 }}
                       >
                         +
                       </button>
                     ))}

                     {/* Agendamentos Existentes */}
                     {dayAppts.filter(a => a.profissional?.id === p.id).map(a => {
                        const h = formatTime(a.dataHora);
                        const pos = HOURS.indexOf(h);
                        if (pos === -1) return null;
                        return (
                          <div 
                            key={a.id} 
                            className={`absolute inset-x-1.5 p-3 rounded-2xl shadow-premium border-l-[6px] backdrop-blur-sm cursor-pointer hover:scale-[1.02] active:scale-95 transition-all z-10 group/card
                              ${a.status === 'confirmado' ? 'bg-[#10B981] border-[#065F46]/20' : 'bg-white border-primary border-l-primary shadow-sm'}`}
                            style={{ top: pos * 50 + 2.5, height: 45 }}
                            title={`${a.paciente.nome} - Click para ver mais`}
                          >
                             <div className="flex justify-between items-start gap-2">
                                <div className="min-w-0">
                                   <p className={`text-[10px] font-black uppercase truncate leading-none ${a.status === 'confirmado' ? 'text-white' : 'text-text-main'}`}>{a.paciente.nome}</p>
                                   <div className="flex items-center gap-1.5 mt-1">
                                      {a.status !== 'confirmado' && <CompactBadge status={a.status} />}
                                      <p className={`text-[8px] font-bold uppercase opacity-70 ${a.status === 'confirmado' ? 'text-white' : 'text-primary'}`}>
                                        {a.servico?.nome}
                                      </p>
                                   </div>
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover/card:opacity-100 transition-opacity">
                                   {a.status !== 'done' && <button onClick={(e) => { e.stopPropagation(); handleAction(a.id, 'done'); }} className="p-1 rounded-md bg-white/20 text-white hover:bg-white/40">✓</button>}
                                   <button onClick={(e) => { e.stopPropagation(); handleAction(a.id, 'cancelado'); }} className="p-1 rounded-md bg-white/20 text-white hover:bg-white/40">✕</button>
                                </div>
                             </div>
                          </div>
                        )
                     })}
                  </div>
                ))}

                {activeTab === 'semanal' && Array.from({length: 7}).map((_, i) => (
                   <div key={i} className="flex-1 min-w-[150px] border-r border-slate-100 relative bg-slate-50/20" />
                ))}
             </div>
          </div>
        </div>
      </div>

      {/* FAB Mobile Style for Global New Appointment */}
      <button 
        onClick={() => setShowModal(true)} 
        className="fixed bottom-10 right-10 w-16 h-16 rounded-full bg-primary text-white shadow-2xl shadow-primary/40 flex items-center justify-center text-3xl font-light hover:scale-110 active:scale-90 transition-all z-[100] md:hidden"
      >
        +
      </button>

      {/* Novo Modal de Agendamento - Mais Elegante */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xl z-[200] flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
           <div className="bg-white border border-card-border rounded-[3rem] p-10 md:p-14 w-full max-w-xl shadow-2xl relative animate-premium" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-10">
                 <div>
                    <h3 className="text-xl font-black italic uppercase tracking-tighter text-text-main leading-tight">📦 Agendamento <span className="text-primary italic">Expert</span></h3>
                    <p className="text-[10px] font-bold text-text-placeholder uppercase mt-1">Prencha os dados abaixo com precisão</p>
                 </div>
                 <button onClick={() => setShowModal(false)} className="w-12 h-12 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 transition-colors font-light">✕</button>
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
                
                <div className="space-y-4">
                  <div className="relative">
                    <span className="absolute left-5 top-1/2 -translate-y-1/2 text-primary text-lg">👤</span>
                    <input name="nome" required placeholder="Nome Completo do Cliente" className="input-premium w-full pl-14 py-5 rounded-2xl" />
                  </div>
                  <div className="relative">
                    <span className="absolute left-5 top-1/2 -translate-y-1/2 text-primary text-lg">📱</span>
                    <input name="telefone" required placeholder="WhatsApp (00) 00000-0000" className="input-premium w-full pl-14 py-5 rounded-2xl" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] font-black uppercase text-text-placeholder ml-2 tracking-widest">Data</label>
                    <input name="date" type="date" defaultValue={new Date().toISOString().split('T')[0]} className="input-premium py-4 rounded-xl" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] font-black uppercase text-text-placeholder ml-2 tracking-widest">Horário</label>
                    <select name="hour" defaultValue={selectedHour || '09:00'} className="input-premium py-4 rounded-xl">
                      {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                </div>

                <div className="space-y-4 pt-2">
                   <select name="serv" required className="input-premium w-full py-5 rounded-2xl appearance-none bg-slate-50 cursor-pointer">
                      <option value="">Selecione o Procedimento / Serviço</option>
                      {services.map(s => <option key={s.id} value={s.id}>{s.nome} — R$ {s.preco}</option>)}
                   </select>

                   <select name="prof" defaultValue={selectedProfId || ''} className="input-premium w-full py-5 rounded-2xl appearance-none bg-slate-50 cursor-pointer">
                      <option value="">Preferência: Automático / Livre</option>
                      {profissionais.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                   </select>
                </div>

                <button type="submit" disabled={loading} className="btn-primary w-full py-6 text-[10px] mt-6 shadow-2xl shadow-primary/30 rounded-3xl transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50">
                  {loading ? 'PROCESSANDO...' : 'CONFIRMAR AGENDAMENTO NA GRADE'}
                </button>
              </form>
           </div>
        </div>
      )}
    </div>
  );
}
