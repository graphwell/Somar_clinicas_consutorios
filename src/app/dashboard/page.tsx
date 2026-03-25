"use client";
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNicho } from '@/context/NichoContext';
import { fetchWithAuth } from '@/lib/api-utils';

const SLOT_INTERVAL_FALLBACK = 30;

interface Service {
  id: string;
  nome: string;
  preco: number;
  duracaoMinutos: number;
  bufferTimeMinutes: number;
}

interface Profissional {
  id: string;
  nome: string;
  color?: string;
  especialidade?: string;
  escalas?: Array<{ diaSemana: number, horaInicio: string, horaFim: string, ativo: boolean }>;
}

interface Appointment {
  id: string;
  dataHora: string;
  fimDataHora?: string;
  durationMinutes?: number;
  status: string;
  paciente: { id: string; nome: string; telefone: string };
  profissional?: Profissional | null;
  servico?: Service | null;
  tipoAtendimento?: string;
  convenio?: string;
  observacoes?: string;
}

const generateSmartSlots = (
  startStr: string = "08:00",
  endStr: string = "18:00",
  service?: Service | null,
  existingAppts: Appointment[] = [],
  selectedDate: Date = new Date()
) => {
  const slots: string[] = [];
  const startParts = (startStr || "08:00").split(':').map(Number);
  const endParts = (endStr || "18:00").split(':').map(Number);
  
  let current = new Date(selectedDate);
  current.setHours(startParts[0], startParts[1], 0, 0);
  
  const end = new Date(selectedDate);
  end.setHours(endParts[0], endParts[1], 0, 0);

  const duration = service?.duracaoMinutos || SLOT_INTERVAL_FALLBACK;
  const buffer = service?.bufferTimeMinutes || 0;
  const totalJump = duration + buffer;

  while (current < end) {
    const timeStr = current.getHours().toString().padStart(2, '0') + ':' + current.getMinutes().toString().padStart(2, '0');
    
    const isSlotOccupied = existingAppts.some(a => {
      const aStart = new Date(a.dataHora).getTime();
      const aDur = a.durationMinutes || (a.servico?.duracaoMinutos ?? 30);
      const aBuf = a.servico?.bufferTimeMinutes ?? 0;
      const aEndWithBuffer = aStart + (aDur + aBuf) * 60000;
      return current.getTime() >= aStart && current.getTime() < aEndWithBuffer;
    });

    if (!isSlotOccupied) {
      slots.push(timeStr);
      current = new Date(current.getTime() + totalJump * 60000);
    } else {
      current = new Date(current.getTime() + 10 * 60000);
    }
  }
  return slots;
};

const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const WEEKDAYS_SHORT = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];

const STATUS_MAP: Record<string, { label: string; bg: string; text: string }> = {
  confirmado: { label: 'Confirmado', bg: '#22C55E', text: 'white' },
  pendente: { label: 'Pendente', bg: '#F59E0B', text: 'white' },
  cancelado: { label: 'Cancelado', bg: '#EF4444', text: 'white' },
  available: { label: 'Livre', bg: '#FFFFFF', text: '#1E293B' },
  done: { label: 'Concluído', bg: '#1E293B', text: 'white' },
  reagendado: { label: 'Reagendado', bg: '#6366F1', text: 'white' },
};

function formatTime(iso: string) { return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); }
function formatDate(iso: string) { return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }); }
function isSameDay(a: Date, b: Date) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }

function HourCell({ hour, appt, onClick }: { hour: string, appt?: Appointment, onClick: () => void }) {
  const status = appt ? appt.status : 'available';
  const config = STATUS_MAP[status] || STATUS_MAP.available;

  return (
    <button
      onClick={onClick}
      className={`relative group transition-all duration-300 rounded-[1.5rem] border flex items-center px-6 gap-6 h-[70px] w-full
        ${appt ? 'shadow-md scale-[0.98]' : 'hover:border-primary/30 hover:bg-slate-50 border-slate-100'}
      `}
      style={{ backgroundColor: config.bg, color: config.text }}
    >
      <div className="flex flex-col items-center border-r border-current/10 pr-6">
        <span className="text-[12px] font-black uppercase tracking-tighter">{hour}</span>
      </div>
      <div className="flex-1 flex justify-between items-center text-left">
        {appt ? (
          <>
            <div>
              <p className="text-[11px] font-black uppercase tracking-tight truncate max-w-[200px] leading-none mb-1">{appt.paciente.nome}</p>
              <p className="text-[8px] font-bold opacity-60 uppercase tracking-widest truncate">{appt.servico?.nome || 'Procedimento'}</p>
            </div>
            <div className="flex gap-2 items-center">
              <span className="text-[10px] bg-white/20 px-3 py-1 rounded-full font-black uppercase tracking-widest">{appt.tipoAtendimento}</span>
            </div>
          </>
        ) : (
          <span className="text-[9px] font-black opacity-30 group-hover:opacity-100 uppercase tracking-[0.2em]">Disponível</span>
        )}
      </div>
    </button>
  );
}

export default function AgendaPage() {
  const { labels } = useNicho();
  const [activeTab, setActiveTab] = useState<'dia' | 'semana' | 'mes' | 'profissionais' | 'servicos'>('dia');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [convenios, setConvenios] = useState<any[]>([]);
  const [clinica, setClinica] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showModal, setShowModal] = useState(false);
  const [selectedHour, setSelectedHour] = useState('');
  const [tipoAtendimento, setTipoAtendimento] = useState<'particular' | 'convenio'>('particular');
  const [selectedProfId, setSelectedProfId] = useState<string>('all');
  const [selectedServId, setSelectedServId] = useState<string>('all');

  const fetchAll = useCallback(async () => {
    try {
      const [apptsRes, teamRes, servRes, convRes, settingsRes] = await Promise.all([
        fetchWithAuth('/api/appointments'),
        fetchWithAuth('/api/team'),
        fetchWithAuth('/api/services'),
        fetchWithAuth('/api/convenios'),
        fetchWithAuth('/api/settings')
      ]);
      const appts = await apptsRes.json(); setAppointments(Array.isArray(appts) ? appts : appts.appointments || []);
      const team = await teamRes.json(); setProfissionais(Array.isArray(team) ? team : []);
      const servs = await servRes.json(); setServices(Array.isArray(servs) ? servs : []);
      const convs = await convRes.json(); setConvenios(Array.isArray(convs) ? convs : []);
      const settings = await settingsRes.json(); setClinica(settings.clinica || null);
    } catch (e) {
      console.error("Error fetching agenda data:", e);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const smartSlots = useMemo(() => {
    if (!clinica) return [];
    const targetProf = profissionais.find(p => p.id === selectedProfId);
    const dayOfWeek = selectedDate.getDay();
    const escala = targetProf?.escalas?.find(e => e.diaSemana === dayOfWeek && e.ativo);
    const targetServ = services.find(s => s.id === selectedServId) || services[0];
    const currentDayAppts = appointments.filter(a => isSameDay(new Date(a.dataHora), selectedDate));
    return generateSmartSlots(
      escala?.horaInicio || clinica.openingTime, 
      escala?.horaFim || clinica.closingTime, 
      targetServ,
      currentDayAppts,
      selectedDate
    );
  }, [clinica, profissionais, services, appointments, selectedDate, selectedProfId, selectedServId]);

  return (
    <div className="max-w-full px-4 lg:px-8 pb-40 animate-premium space-y-6">
      <div className="bg-white border border-card-border p-6 rounded-[2rem] shadow-premium flex flex-col xl:flex-row justify-between items-center gap-6 sticky top-4 z-[50] backdrop-blur-xl bg-white/90">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-2xl bg-primary text-white flex items-center justify-center text-xl shadow-lg italic font-black">A</div>
          <h2 className="text-xl font-black italic uppercase tracking-tighter text-text-main">Agenda</h2>
        </div>
        <div className="bg-slate-100 p-1.5 rounded-[1.5rem] flex gap-1 border border-slate-200 shadow-inner overflow-x-auto no-scrollbar max-w-full">
          {['dia', 'semana', 'mes', 'profissionais', 'servicos'].map(tid => (
            <button key={tid} onClick={() => setActiveTab(tid as any)} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === tid ? 'bg-white text-primary shadow-premium' : 'text-text-muted hover:text-text-main hover:bg-white/50'}`}>
              {tid === 'profissionais' ? 'Equipe' : tid === 'servicos' ? 'Serviços' : tid}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-4">
          <div className="flex bg-white border border-slate-200 rounded-xl p-1 shadow-sm items-center">
            <button onClick={() => {
              const d = new Date(selectedDate);
              if (activeTab === 'mes') d.setMonth(d.getMonth() - 1);
              else if (activeTab === 'semana') d.setDate(d.getDate() - 7);
              else d.setDate(d.getDate() - 1);
              setSelectedDate(d);
            }} className="px-3 py-1.5 text-slate-400 hover:text-primary transition-colors">‹</button>
            <span className="px-4 py-1.5 text-[11px] font-black uppercase text-text-main min-w-[140px] text-center">
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
          <button onClick={() => { setSelectedHour(''); setShowModal(true); }} className="btn-primary py-4 px-10 shadow-2xl shadow-primary/30 hidden md:block">
            + AGENDAR
          </button>
        </div>
      </div>

      <div className="animate-premium mt-8">
        {activeTab === 'dia' && (
          <div className="bg-white border border-card-border rounded-[3rem] p-10 shadow-premium space-y-10">
            <div className="flex flex-col md:flex-row justify-between items-center gap-6 border-b border-slate-50 pb-8">
              <div>
                <h3 className="text-xl font-black italic uppercase tracking-tighter text-text-main">Horários <span className="text-primary italic">Disponíveis</span></h3>
                <p className="text-[10px] font-black text-text-placeholder uppercase mt-2 tracking-widest">Duração + Buffer</p>
              </div>
              <div className="flex gap-4">
                <select value={selectedProfId} onChange={(e) => setSelectedProfId(e.target.value)} className="bg-slate-100 border-none rounded-xl px-4 py-2 text-[10px] font-black uppercase text-text-main cursor-pointer">
                  <option value="all">Todos os Profissionais</option>
                  {profissionais.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                </select>
                <select value={selectedServId} onChange={(e) => setSelectedServId(e.target.value)} className="bg-slate-100 border-none rounded-xl px-4 py-2 text-[10px] font-black uppercase text-text-main cursor-pointer">
                  <option value="all">Serviço Padrão (30m)</option>
                  {services.map(s => <option key={s.id} value={s.id}>{s.nome} ({s.duracaoMinutos}m)</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {smartSlots.map(h => {
                const hourDate = new Date(selectedDate);
                const [hH, hM] = h.split(':').map(Number);
                hourDate.setHours(hH, hM, 0, 0);
                const appt = appointments.find(a => isSameDay(new Date(a.dataHora), selectedDate) && new Date(a.dataHora).getTime() === hourDate.getTime());
                return <HourCell key={h} hour={h} appt={appt} onClick={() => { setSelectedHour(h); setShowModal(true); }} />;
              })}
            </div>
          </div>
        )}

        {activeTab === 'profissionais' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {profissionais.map(p => {
              const scale = p.escalas?.find(e => e.diaSemana === selectedDate.getDay() && e.ativo);
              const pAppts = appointments.filter(a => isSameDay(new Date(a.dataHora), selectedDate) && a.profissional?.id === p.id);
              const pSlots = generateSmartSlots(scale?.horaInicio || clinica?.openingTime, scale?.horaFim || clinica?.closingTime, services[0], pAppts, selectedDate).slice(0, 8);
              return (
                <div key={p.id} className="bg-white border border-card-border p-8 rounded-[2.5rem] shadow-premium space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-primary text-white flex items-center justify-center font-black">{p.nome[0].toUpperCase()}</div>
                    <div>
                      <h4 className="text-sm font-black uppercase italic tracking-tighter">{p.nome}</h4>
                      <p className="text-[8px] font-black text-primary uppercase tracking-widest">{p.especialidade || labels.profissional}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {pSlots.map(h => <div key={h} className="py-2 rounded-xl text-center text-[8px] font-black bg-slate-50 border border-slate-100">{h}</div>)}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'servicos' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map(s => (
              <div key={s.id} className="bg-white border border-card-border p-8 rounded-[2.5rem] shadow-premium space-y-4">
                <h4 className="text-lg font-black uppercase italic tracking-tighter">{s.nome}</h4>
                <div className="flex gap-4 text-[9px] font-black text-text-placeholder uppercase tracking-widest">
                  <span>⏱️ {s.duracaoMinutos} MIN</span>
                  <span>🛡️ {s.bufferTimeMinutes} MIN BUFFER</span>
                </div>
                <button onClick={() => { setSelectedServId(s.id); setActiveTab('dia'); }} className="w-full py-4 rounded-2xl bg-primary text-white text-[9px] font-black uppercase tracking-widest shadow-lg shadow-primary/20">Ver horários</button>
              </div>
            ))}
          </div>
        )}

        {['semana', 'mes'].includes(activeTab) && (
          <div className="bg-white border border-card-border rounded-[3rem] p-20 text-center shadow-premium">
             <span className="text-4xl block mb-6">🗓️</span>
             <h3 className="text-xl font-black uppercase italic tracking-tighter text-text-main">Em Manutenção</h3>
             <p className="text-[10px] font-black text-text-placeholder uppercase tracking-widest mt-4">Use a visão diária para Smart Slots.</p>
          </div>
        )}
      </div>

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
                  profissionalId: d.get('prof'),
                  tipoAtendimento,
                  convenio: d.get('convenio'),
                  observacoes: d.get('observacoes')
                })
              });
              fetchAll(); setLoading(false); setShowModal(false);
            }} className="space-y-4">
              <input name="nome" required placeholder="Nome do Cliente" className="input-premium w-full bg-slate-50 py-4 px-6 rounded-xl" />
              <input name="telefone" required placeholder="WhatsApp" className="input-premium w-full bg-slate-50 py-4 px-6 rounded-xl" />
              <div className="grid grid-cols-2 gap-4">
                <input name="date" type="date" defaultValue={selectedDate.toISOString().split('T')[0]} className="input-premium py-4 px-6 rounded-xl" />
                <select name="hour" defaultValue={selectedHour} className="input-premium py-4 px-6 rounded-xl">
                  {selectedHour && <option value={selectedHour}>{selectedHour}</option>}
                  {smartSlots.filter(h => h !== selectedHour).map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
              <select name="serv" required className="input-premium w-full py-4 px-6 rounded-xl bg-slate-50">
                <option value="">Selecione o Serviço...</option>
                {services.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
              </select>
              <select name="prof" className="input-premium w-full py-4 px-6 rounded-xl bg-slate-50">
                <option value="">Automático / Livre</option>
                {profissionais.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
              </select>
              <button type="submit" disabled={loading} className="btn-primary w-full py-5 text-[10px] font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-primary/30 mt-4">{loading ? '...' : 'Confirmar'}</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
