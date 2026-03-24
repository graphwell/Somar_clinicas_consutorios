"use client";
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNicho } from '@/context/NichoContext';
import { fetchWithAuth } from '@/lib/api-utils';

const HOURS = ['08:00','08:30', '09:00','09:30', '10:00','10:30', '11:00','11:30', '12:00','12:30', '13:00','13:30', '14:00','14:30', '15:00','15:30', '16:00','16:30', '17:00','17:30', '18:00'];
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

const STATUS_MAP: Record<string, { label: string; bg: string; text: string; dot: string; border: string }> = {
  confirmado: { label: 'Confirmado', bg: 'bg-[#E1F9EF]', text: 'text-[#065F46]', dot: 'bg-[#10B981]', border: 'border-[#10B981]/20' },
  pendente:   { label: 'Pendente',   bg: 'bg-[#FFF7E6]', text: 'text-[#92400E]', dot: 'bg-[#F59E0B]', border: 'border-[#F59E0B]/20' },
  cancelado:  { label: 'Cancelado',  bg: 'bg-[#FFF1F2]', text: 'text-[#9F1239]', dot: 'bg-[#F43F5E]', border: 'border-[#F43F5E]/20' },
  done:       { label: 'Concluído',  bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400', border: 'border-slate-200' },
};

const StatusBadge = ({ status }: { status: string }) => {
  const s = STATUS_MAP[status] || { label: status, bg: 'bg-slate-50', text: 'text-slate-400', dot: 'bg-slate-300', border: 'border-slate-200' };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${s.bg} ${s.text} border ${s.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot} animate-pulse`} />
      {s.label}
    </span>
  );
};

function formatTime(iso: string) { return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); }
function formatDate(iso: string) { return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }); }
function isSameDay(a: Date, b: Date) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }

function AppointmentCard({ appt, onAction }: { appt: Appointment, onAction: (id: string, s: string) => void }) {
  const serviceColor = appt?.servico?.color || '#3B82F6';
  const profColor = appt?.profissional?.color || '#64748B';

  return (
    <div className="flex-1 flex items-center justify-between py-2 px-4 bg-white border border-card-border rounded-xl shadow-sm hover:shadow-md transition-all group overflow-hidden relative">
      <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: profColor }} />
      <div className="flex flex-col">
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-black text-text-main uppercase tracking-tight">{appt.paciente.nome}</span>
          <StatusBadge status={appt.status} />
        </div>
        <div className="flex items-center gap-2 mt-0.5 opacity-70">
          <span className="text-[9px] font-bold text-text-muted uppercase">{appt.servico?.nome}</span>
          <span className="text-[9px] text-text-placeholder">|</span>
          <span className="text-[9px] font-black text-primary">R$ {appt.servico?.preco || 0}</span>
        </div>
      </div>
      <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={(e) => { e.stopPropagation(); onAction(appt.id, 'done'); }} className="p-2 rounded-lg bg-status-success-bg text-status-success hover:scale-110 transition-transform">✓</button>
        <button onClick={(e) => { e.stopPropagation(); onAction(appt.id, 'cancelado'); }} className="p-2 rounded-lg bg-status-error-bg text-status-error hover:scale-110 transition-transform">✕</button>
      </div>
    </div>
  );
}

function TimeSlot({ hour, appt, onClick, onAction }: { hour: string, appt?: Appointment, onClick: () => void, onAction: (id: string, s: string) => void }) {
  return (
    <div className="flex gap-4 items-center group min-h-[50px]">
      <div className="w-16 flex flex-col items-center">
        <span className={`text-[13px] font-black ${appt ? 'text-text-main' : 'text-text-placeholder opacity-40'}`}>{hour}</span>
        <div className="w-0.5 h-full bg-slate-100 min-h-[20px] rounded-full mt-1" />
      </div>
      
      {appt ? (
        <AppointmentCard appt={appt} onAction={onAction} />
      ) : (
        <div 
          onClick={onClick}
          className="flex-1 py-3 px-6 border border-dashed border-slate-200 rounded-xl text-[10px] font-bold text-text-placeholder uppercase tracking-widest cursor-pointer hover:bg-slate-50 hover:border-primary/30 transition-all flex items-center justify-between group"
        >
          <span>Espaço Disponível</span>
          <span className="opacity-0 group-hover:opacity-100 bg-primary text-white w-5 h-5 rounded-full flex items-center justify-center font-black transition-all">+</span>
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
    <div className="max-w-7xl mx-auto pb-40 px-4 md:px-0 animate-premium space-y-8">
      
      {/* Top Premium Bar */}
      <div className="flex flex-col md:flex-row justify-between items-center bg-white p-6 md:p-10 rounded-[2.5rem] border border-card-border shadow-premium gap-6">
        <div className="flex items-center gap-6">
          <div className="w-14 h-14 rounded-2xl bg-primary text-white flex items-center justify-center text-3xl shadow-xl shadow-primary/20">⚡</div>
          <div>
            <h2 className="text-xl font-black uppercase tracking-tighter italic">Gestão de <span className="text-primary font-bold">Agenda</span></h2>
            <p className="text-[9px] font-black text-text-placeholder uppercase tracking-[0.3em] mt-1">{labels.profissional} • V2.3 SaaS PRO</p>
          </div>
        </div>

        {/* Tab Switcher - Segmented Control Style */}
        <div className="bg-slate-50 p-1.5 rounded-2xl border border-slate-100 flex gap-1">
          <button 
            onClick={() => setActiveTab('grade')} 
            className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'grade' ? 'bg-white text-primary shadow-premium' : 'text-text-muted hover:text-text-main'}`}
          >
            Grade Diária
          </button>
          <button 
            onClick={() => setActiveTab('profissionais')} 
            className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'profissionais' ? 'bg-white text-primary shadow-premium' : 'text-text-muted hover:text-text-main'}`}
          >
            Por Equipe
          </button>
        </div>

        <button onClick={() => { setSelectedHour(''); setShowModal(true); }} className="btn-primary flex items-center gap-3 px-10">
          <span>+</span> NOVA CONSULTA
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        
        {/* Compact Calendar Sidebar */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white border border-card-border p-8 rounded-[2rem] shadow-sm">
            <div className="flex items-center justify-between mb-8 px-2">
              <button onClick={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth()-1, 1))} className="text-text-placeholder hover:text-primary transition-colors">‹</button>
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">{MONTHS[selectedDate.getMonth()]}</span>
              <button onClick={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth()+1, 1))} className="text-text-placeholder hover:text-primary transition-colors">›</button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center">
              {['D','S','T','Q','Q','S','S'].map(d => <div key={d} className="text-[8px] font-black text-text-placeholder opacity-50 mb-4">{d}</div>)}
              {Array.from({length: new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1).getDay()}).map((_,i) => <div key={i}/>)}
              {Array.from({length: new Date(selectedDate.getFullYear(), selectedDate.getMonth()+1, 0).getDate()}).map((_,i) => {
                const day = i + 1;
                const isSelected = isSameDay(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), day), selectedDate);
                const hasAppt = appointments.some(a => isSameDay(new Date(a.dataHora), new Date(selectedDate.getFullYear(), selectedDate.getMonth(), day)));
                return (
                  <button 
                    key={day} 
                    onClick={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), day))}
                    className={`relative w-8 h-8 rounded-lg text-[10px] font-bold transition-all flex items-center justify-center ${isSelected ? 'bg-primary text-white shadow-lg' : 'text-text-muted hover:bg-slate-50'}`}
                  >
                    {day}
                    {hasAppt && !isSelected && <div className="absolute bottom-1 w-1 h-1 bg-primary/30 rounded-full" />}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="bg-primary/5 border border-primary/10 p-6 rounded-[1.5rem] flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center text-sm">✓</div>
            <div>
              <p className="text-[10px] font-black text-primary uppercase">Status Ativo</p>
              <p className="text-[8px] font-bold text-primary/60 uppercase">Cloud Sync v2.3</p>
            </div>
          </div>
        </div>

        {/* Dynamic Content */}
        <div className="lg:col-span-9 animate-premium">
          {activeTab === 'grade' && (
            <div className="bg-white border border-card-border rounded-[2.5rem] p-8 shadow-sm space-y-8">
              <div className="flex justify-between items-center border-b border-slate-50 pb-6 px-2">
                <h3 className="text-base font-black uppercase tracking-tighter italic">Horários para <span className="text-primary">{formatDate(selectedDate.toISOString())}</span></h3>
                <div className="flex gap-2">
                   <div className="w-2 h-2 rounded-full bg-slate-200" />
                   <div className="w-2 h-2 rounded-full bg-slate-100" />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-1">
                {HOURS.map(h => {
                  const appt = dayAppts.find(a => formatTime(a.dataHora) === h);
                  return <TimeSlot key={h} hour={h} appt={appt} onAction={handleAction} onClick={() => { setSelectedHour(h); setShowModal(true); }} />
                })}
              </div>
            </div>
          )}

          {activeTab === 'profissionais' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {profissionais.length === 0 && <div className="col-span-full py-20 bg-white rounded-3xl border border-dashed border-slate-200 text-center text-text-placeholder font-bold uppercase text-[10px] tracking-widest">Nenhum profissional cadastrado</div>}
              {profissionais.map(p => (
                <div key={p.id} className="bg-white border border-card-border p-8 rounded-[2rem] shadow-sm space-y-6 hover:shadow-md transition-all">
                  <div className="flex items-center gap-4 border-b border-slate-50 pb-5">
                    <div className="w-12 h-12 rounded-xl bg-slate-50 text-primary flex items-center justify-center font-black text-sm border border-slate-100">{p.nome[0]}</div>
                    <div>
                      <h4 className="text-sm font-black text-text-main uppercase italic">{p.nome}</h4>
                      <p className="text-[9px] font-black text-primary uppercase tracking-widest opacity-60">{p.especialidade || labels.profissional}</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {dayAppts.filter(a => a.profissional?.id === p.id).map(a => (
                      <div key={a.id} className="p-4 bg-slate-50/50 rounded-xl border border-slate-100 relative pl-8 group">
                        <div className="absolute left-0 top-3 bottom-3 w-1.5 rounded-r-lg" style={{ backgroundColor: a.servico?.color || '#3B82F6' }} />
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-black text-text-main tracking-tighter">{formatTime(a.dataHora)}</span>
                          <StatusBadge status={a.status} />
                        </div>
                        <p className="text-[10px] font-bold text-text-muted uppercase mt-1 italic">{a.paciente.nome}</p>
                      </div>
                    ))}
                    {dayAppts.filter(a => a.profissional?.id === p.id).length === 0 && <p className="text-[8px] font-black uppercase text-text-placeholder text-center py-6 tracking-[0.3em] opacity-40">Sem agendamentos</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Premium Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[200] flex items-center justify-center p-4 animate-premium" onClick={() => setShowModal(false)}>
          <div className="bg-white border border-card-border rounded-[2.5rem] p-10 md:p-14 w-full max-w-xl shadow-2xl relative" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-10">
              <h3 className="text-lg font-black italic uppercase tracking-tighter text-text-main">📌 Novo Agendamento <span className="text-primary italic">Clinical</span></h3>
              <button onClick={() => setShowModal(false)} className="w-10 h-10 rounded-full hover:bg-slate-50 flex items-center justify-center transition-colors">✕</button>
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
                setShowModal(false); 
              }} className="space-y-5">
              
              <div className="space-y-4">
                <div className="relative group">
                  <span className="absolute left-5 top-1/2 -translate-y-1/2 text-primary opacity-40 group-focus-within:opacity-100 transition-opacity">👤</span>
                  <input name="nome" required placeholder="Nome do Cliente" className="input-premium w-full pl-12 py-4" />
                </div>
                <div className="relative group">
                  <span className="absolute left-5 top-1/2 -translate-y-1/2 text-primary opacity-40 group-focus-within:opacity-100 transition-opacity">📱</span>
                  <input name="telefone" required placeholder="WhatsApp (00) 00000-0000" className="input-premium w-full pl-12 py-4" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <input name="date" type="date" defaultValue={new Date().toISOString().split('T')[0]} className="input-premium py-4" />
                <select name="hour" defaultValue={selectedHour || '09:00'} className="input-premium py-4">
                  {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>

              <div className="space-y-4">
                <select name="serv" required className="input-premium w-full py-4 appearance-none">
                  <option value="">Selecione o Serviço...</option>
                  {services.map(s => <option key={s.id} value={s.id}>{s.nome} — R$ {s.preco}</option>)}
                </select>
                <select name="prof" className="input-premium w-full py-4">
                  <option value="">Equipe: Automático / Indiferente</option>
                  {profissionais.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                </select>
              </div>

              <button type="submit" disabled={loading} className="btn-primary w-full py-5 text-[10px] mt-6 shadow-xl shadow-primary/30 disabled:opacity-50">
                {loading ? 'PROCESSANDO...' : 'FINALIZAR AGENDAMENTO PREMIUM'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
