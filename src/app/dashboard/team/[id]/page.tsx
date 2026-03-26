"use client";
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useNicho } from '@/context/NichoContext';
import { fetchWithAuth } from '@/lib/api-utils';
import { 
  Service, Profissional, Appointment, 
  generateSmartSlots, STATUS_MAP, WEEKDAYS_SHORT, MONTHS, 
  formatTime, formatDate, isSameDay 
} from '@/lib/agenda-utils';
import HourCell from '@/components/dashboard/HourCell';

export default function SpecialistPage() {
  const { id } = useParams();
  const router = useRouter();
  const { labels } = useNicho();
  
  const [activeTab, setActiveTab] = useState<'dia' | 'semana' | 'mes'>('dia');
  const [professional, setProfessional] = useState<Profissional | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [clinica, setClinica] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  const [showModal, setShowModal] = useState(false);
  const [selectedHour, setSelectedHour] = useState('');
  const [tipoAtendimento, setTipoAtendimento] = useState<'particular' | 'convenio'>('particular');

  const fetchData = useCallback(async () => {
    try {
      const [teamRes, apptsRes, servRes, settingsRes] = await Promise.all([
        fetchWithAuth(`/api/team`),
        fetchWithAuth(`/api/appointments`),
        fetchWithAuth(`/api/services`),
        fetchWithAuth(`/api/settings`)
      ]);
      
      const team = await teamRes.json();
      const prof = team.find((p: any) => p.id === id);
      setProfessional(prof || null);
      
      const appts = await apptsRes.json();
      const allAppts = Array.isArray(appts) ? appts : appts.appointments || [];
      setAppointments(allAppts.filter((a: any) => a.profissional?.id === id));
      
      const servs = await servRes.json();
      setServices(Array.isArray(servs) ? servs : []);
      
      const settings = await settingsRes.json();
      setClinica(settings.clinica || null);
    } catch (e) {
      console.error("Error fetching specialist data:", e);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const smartSlots = useMemo(() => {
    if (!clinica || !professional) return [];
    const dayOfWeek = selectedDate.getDay();
    const escala = professional.escalas?.find((e: any) => e.diaSemana === dayOfWeek && e.ativo);
    const targetServ = services[0]; // Default to first service for slot calculation
    
    return generateSmartSlots(
      escala?.horaInicio || clinica.openingTime, 
      escala?.horaFim || clinica.closingTime, 
      targetServ,
      appointments.filter(a => isSameDay(new Date(a.dataHora), selectedDate)),
      selectedDate
    );
  }, [clinica, professional, services, appointments, selectedDate]);

  if (loading) return <div className="p-20 text-center font-black uppercase tracking-[0.5em] text-[10px] animate-pulse">Sincronizando Perfil...</div>;
  if (!professional) return <div className="p-20 text-center font-black uppercase tracking-widest text-xs text-status-error">Especialista não encontrado</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 pb-40 animate-premium space-y-12">
      
      {/* 🔙 Breadcrumb & Voltar */}
      <div className="flex items-center justify-between">
        <button onClick={() => router.back()} className="flex items-center gap-3 px-6 py-3 bg-white border border-card-border rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all text-text-muted">
          ← Voltar para Equipe
        </button>
        <div className="text-right">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Perfil do Especialista</p>
          <h1 className="text-2xl font-black italic uppercase tracking-tighter text-text-main">{professional.nome}</h1>
        </div>
      </div>

      {/* 🧑‍💼 Perfil Resumo */}
      <div className="bg-white border border-card-border p-10 rounded-[3.5rem] shadow-premium flex flex-col md:flex-row items-center gap-10 relative overflow-hidden">
        <div className="absolute top-0 inset-x-0 h-1.5 opacity-50" style={{ backgroundColor: professional.color || '#3B82F6' }} />
        <div className="w-40 h-40 rounded-ultra p-1.5 bg-slate-50 border border-card-border shadow-2xl relative">
          {professional.fotoUrl ? (
            <img src={professional.fotoUrl} alt={professional.nome} className="w-full h-full object-cover rounded-ultra bg-white" />
          ) : (
            <div className="w-full h-full bg-white rounded-ultra flex items-center justify-center text-6xl font-black italic" style={{ color: professional.color || '#3B82F6' }}>
              {professional.nome.charAt(0)}
            </div>
          )}
        </div>
        <div className="flex-1 text-center md:text-left space-y-4">
          <h2 className="text-3xl font-black italic uppercase tracking-tighter text-text-main leading-none">{professional.nome}</h2>
          <p className="text-xs font-black text-primary uppercase tracking-[0.2em]">{professional.especialidade || labels.termoProfissional}</p>
          <p className="text-sm text-text-muted font-medium italic opacity-70 leading-relaxed max-w-2xl">{professional.bio || 'Sem biografia disponível.'}</p>
        </div>
      </div>

      {/* 📅 Agenda do Especialista */}
      <div className="space-y-8">
        <div className="flex flex-col xl:flex-row justify-between items-center gap-6 bg-white border border-card-border p-6 rounded-[2.5rem] shadow-premium sticky top-4 z-[50] backdrop-blur-xl bg-white/90">
           <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-2xl bg-primary text-white flex items-center justify-center text-xl shadow-lg italic font-black">A</div>
              <h3 className="text-xl font-black italic uppercase tracking-tighter text-text-main">Agenda <span className="text-primary opacity-30 text-sm">Especialista</span></h3>
           </div>

           <div className="bg-slate-100 p-1.5 rounded-[1.5rem] flex gap-1 border border-slate-200 shadow-inner overflow-x-auto no-scrollbar">
              {['dia', 'semana', 'mes'].map(t => (
                <button 
                  key={t} 
                  onClick={() => setActiveTab(t as any)} 
                  className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap 
                    ${activeTab === t ? 'bg-white text-primary shadow-premium' : 'text-text-muted hover:text-text-main hover:bg-white/50'}`}
                >
                  {t === 'dia' ? 'Hoje' : t === 'semana' ? 'Semana' : 'Mês'}
                </button>
              ))}
           </div>

           <div className="flex bg-white border border-slate-200 rounded-xl p-1 shadow-sm items-center">
              <button onClick={() => {
                const d = new Date(selectedDate);
                if (activeTab === 'mes') d.setMonth(d.getMonth() - 1);
                else if (activeTab === 'semana') d.setDate(d.getDate() - 7);
                else d.setDate(d.getDate() - 1);
                setSelectedDate(d);
              }} className="px-3 py-1.5 text-slate-400 hover:text-primary transition-colors">‹</button>
              <span className="px-6 py-1.5 text-[11px] font-black uppercase text-text-main min-w-[140px] text-center">
                {formatDate(selectedDate.toISOString())}
              </span>
              <button onClick={() => {
                const d = new Date(selectedDate);
                if (activeTab === 'mes') d.setMonth(d.getMonth() + 1);
                else if (activeTab === 'semana') d.setDate(d.getDate() + 7);
                else d.setDate(d.getDate() + 1);
                setSelectedDate(d);
              }} className="px-3 py-1.5 text-slate-400 hover:text-primary transition-colors">›</button>
           </div>
        </div>

        {/* Visões */}
        {activeTab === 'dia' && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4 animate-premium">
            {smartSlots.map(h => {
              const appt = appointments.find(a => isSameDay(new Date(a.dataHora), selectedDate) && formatTime(a.dataHora) === h);
              return (
                <button 
                  key={h} 
                  onClick={() => { setSelectedHour(h); setShowModal(true); }}
                  className={`py-6 rounded-3xl border text-center transition-all flex flex-col items-center justify-center gap-2 group
                    ${appt ? 'bg-primary border-primary text-white shadow-xl scale-95 opacity-50' : 'bg-white border-card-border hover:border-primary/40 hover:scale-105 shadow-sm hover:shadow-xl'}`}
                  disabled={!!appt}
                >
                  <span className={`text-lg font-black italic tracking-tighter ${appt ? 'text-white' : 'text-text-main'}`}>{h}</span>
                  <span className={`text-[8px] font-black uppercase tracking-widest ${appt ? 'text-white/60' : 'text-text-placeholder'}`}>
                    {appt ? 'Ocupado' : 'Disponível'}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {activeTab === 'semana' && (
          <div className="bg-white border border-card-border rounded-[3rem] p-6 shadow-premium overflow-x-auto">
            <div className="min-w-[1000px] grid grid-cols-7 gap-4">
              {Array.from({ length: 7 }).map((_, i) => {
                const day = new Date(selectedDate);
                day.setDate(day.getDate() - day.getDay() + i);
                const dayAppts = appointments.filter(a => isSameDay(new Date(a.dataHora), day));
                
                return (
                  <div key={i} className={`space-y-4 p-4 rounded-[2rem] border transition-all ${isSameDay(day, new Date()) ? 'bg-primary-soft/30 border-primary/20 shadow-inner' : 'bg-slate-50 border-slate-100'}`}>
                    <div className="text-center pb-2 border-b border-slate-200">
                      <p className="text-[10px] font-black text-text-placeholder uppercase tracking-widest">{WEEKDAYS_SHORT[i]}</p>
                      <p className={`text-xl font-black italic tracking-tighter ${isSameDay(day, new Date()) ? 'text-primary' : 'text-text-main'}`}>{day.getDate()}</p>
                    </div>
                    <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1 no-scrollbar">
                      {dayAppts.length === 0 ? (
                        <div className="py-10 text-center opacity-20 italic text-[10px] font-black uppercase tracking-widest">Livre</div>
                      ) : dayAppts.sort((a,b) => a.dataHora.localeCompare(b.dataHora)).map(a => (
                        <div key={a.id} className="p-3 bg-white border border-card-border rounded-2xl shadow-sm hover:shadow-md transition-all cursor-pointer group" style={{ borderLeft: `4px solid ${STATUS_MAP[a.status]?.bg || '#ccc'}` }}>
                           <p className="text-[10px] font-black text-text-main leading-tight truncate">{a.paciente.nome}</p>
                           <p className="text-[8px] font-black text-primary uppercase tracking-widest mt-1">{formatTime(a.dataHora)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'mes' && (
          <div className="bg-white border border-card-border rounded-[3rem] p-10 shadow-premium">
            <div className="grid grid-cols-7 gap-4 mb-6">
              {WEEKDAYS_SHORT.map(w => <div key={w} className="text-center text-[9px] font-black text-text-placeholder uppercase tracking-[0.3em]">{w}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-4">
              {(() => {
                const firstDay = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
                const lastDay = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);
                const prevLastDay = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 0);
                const days = [];
                for (let i = firstDay.getDay(); i > 0; i--) {
                  days.push({ day: prevLastDay.getDate() - i + 1, current: false, date: new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1, prevLastDay.getDate() - i + 1) });
                }
                for (let i = 1; i <= lastDay.getDate(); i++) {
                  days.push({ day: i, current: true, date: new Date(selectedDate.getFullYear(), selectedDate.getMonth(), i) });
                }
                return days.map((d, i) => {
                  const dayAppts = appointments.filter(a => isSameDay(new Date(a.dataHora), d.date));
                  return (
                    <div key={i} onClick={() => { setSelectedDate(d.date); setActiveTab('dia'); }} className={`aspect-square p-4 rounded-3xl border transition-all cursor-pointer flex flex-col items-center justify-between ${d.current ? 'bg-slate-50 border-slate-100 hover:border-primary/30' : 'bg-white opacity-20 border-transparent'} ${isSameDay(d.date, new Date()) ? 'ring-2 ring-primary ring-offset-4' : ''}`}>
                       <span className={`text-sm font-black italic tracking-tighter ${d.current ? 'text-text-main' : 'text-text-placeholder'}`}>{d.day}</span>
                       {dayAppts.length > 0 && d.current && (
                         <div className="flex -space-x-1">
                            {dayAppts.slice(0, 3).map((a, idx) => (
                              <div key={idx} className="w-2.5 h-2.5 rounded-full border border-white shadow-sm" style={{ backgroundColor: STATUS_MAP[a.status]?.bg || '#ccc' }} />
                            ))}
                         </div>
                       )}
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        )}
      </div>

      {/* Booking Modal (Inline for now) */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xl z-[200] flex items-center justify-center p-4 animate-premium" onClick={() => setShowModal(false)}>
          <div className="bg-white border border-card-border rounded-[3.5rem] p-12 w-full max-w-xl shadow-2xl relative" onClick={e => e.stopPropagation()}>
            <h3 className="text-2xl font-black italic uppercase tracking-tighter text-text-main mb-8">Novo Agendamento</h3>
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
                  profissionalId: id,
                  tipoAtendimento,
                  convenio: d.get('convenio'),
                  observacoes: d.get('observacoes')
                })
              });
              fetchData(); setLoading(false); setShowModal(false);
            }} className="space-y-4">
              <input name="nome" required placeholder={`Nome do ${labels.termoPaciente}`} className="input-premium w-full bg-slate-50 py-4 px-6 rounded-xl" />
              <input name="telefone" required placeholder="WhatsApp" className="input-premium w-full bg-slate-50 py-4 px-6 rounded-xl" />
              <div className="grid grid-cols-2 gap-4">
                <input name="date" type="date" defaultValue={selectedDate.toISOString().split('T')[0]} className="input-premium py-4 px-6 rounded-xl" />
                <select name="hour" defaultValue={selectedHour} className="input-premium py-4 px-6 rounded-xl">
                  {selectedHour && <option value={selectedHour}>{selectedHour}</option>}
                  {smartSlots.filter(h => h !== selectedHour).map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
              <select name="serv" required className="input-premium w-full py-4 px-6 rounded-xl bg-slate-50">
                <option value="">Selecione o {labels.termoServico}...</option>
                {services.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
              </select>
              <button type="submit" disabled={loading} className="btn-primary w-full py-5 text-[10px] font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-primary/30 mt-4">{loading ? '...' : 'Confirmar'}</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
