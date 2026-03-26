"use client";
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNicho } from '@/context/NichoContext';
import { fetchWithAuth } from '@/lib/api-utils';
import KpiSection from '@/components/dashboard/KpiSection';

import { 
  Service, Profissional, Appointment, 
  generateSmartSlots, STATUS_MAP, WEEKDAYS_SHORT, MONTHS, 
  formatTime, formatDate, isSameDay 
} from '@/lib/agenda-utils';
import HourCell from '@/components/dashboard/HourCell';
import AgendaSelectionWizard from '@/components/dashboard/AgendaSelectionWizard';

const SLOT_INTERVAL_FALLBACK = 30;

export default function DashboardPage() {
  const { labels } = useNicho();
  const [activeTab, setActiveTab] = useState<'dia' | 'semana' | 'mes' | 'profissionais' | 'servicos' | 'planos'>('dia');
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
  const [selectedProfId, setSelectedProfId] = useState<string | null>(null);
  const [selectedServId, setSelectedServId] = useState<string>('all');
  const [isGeneralView, setIsGeneralView] = useState(false);
  const [wizardStep, setWizardStep] = useState<'specialty' | 'professional'>('specialty');
  const [user, setUser] = useState<any>(null);

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

  useEffect(() => { 
    fetchAll(); 
    // Recuperar usuário e última seleção
    if (typeof window !== 'undefined') {
      const storedUser = localStorage.getItem('synka-user');
      if (storedUser) {
        const u = JSON.parse(storedUser);
        setUser(u);
        
        // Se profissional, tentar auto-selecionar
        const isProf = ['profissional', 'medico', 'especialista', 'dentista', 'barbeiro'].includes(u.role?.toLowerCase());
        if (isProf) {
          // Tentaremos parear pelo email ou nome assim que os profissionais carregarem
        } else {
          // Se admin/recepcao, recuperar última seleção da sessão se houver
          const lastProf = sessionStorage.getItem('synka-selected-prof');
          if (lastProf) setSelectedProfId(lastProf);
        }
      }
    }
  }, [fetchAll]);

  // Efeito para auto-selecionar profissional logado
  useEffect(() => {
    if (user && profissionais.length > 0 && !selectedProfId) {
      const isProf = ['profissional', 'medico', 'especialista', 'dentista', 'barbeiro', 'esteticista'].includes(user.role?.toLowerCase());
      const isAdmin = ['admin', 'gestor'].includes(user.role?.toLowerCase());
      
      // Se for admin, NUNCA seleciona automaticamente para forçar o Wizard
      if (isAdmin) {
        setSelectedProfId(null);
        return;
      }

      if (isProf) {
        const matched = profissionais.find(p => p.nome.toLowerCase() === user.nome?.toLowerCase() || p.nome.toLowerCase() === user.email?.split('@')[0].toLowerCase());
        if (matched) {
          setSelectedProfId(matched.id);
        }
      }
    }
  }, [user, profissionais, selectedProfId]);

  const handleProfSelect = (id: string) => {
    setSelectedProfId(id);
    setIsGeneralView(false);
    if (typeof window !== 'undefined') sessionStorage.setItem('synka-selected-prof', id);
  };

  const smartSlots = useMemo(() => {
    if (!clinica) return [];
    const targetProf = profissionais.find((p: Profissional) => p.id === selectedProfId);
    if (!targetProf && !isGeneralView) return []; // Não gera slots se não houver prof ou visão geral
    
    const dayOfWeek = selectedDate.getDay();
    const escala = targetProf?.escalas?.find((e: any) => e.diaSemana === dayOfWeek && e.ativo);
    
    // Sincronização Estrita: Se profissional selecionado NÃO tem escala ativa neste dia, não mostramos slots
    if (selectedProfId && !escala) return [];

    const targetServ = services.find((s: Service) => s.id === selectedServId) || services[0];
    const currentDayAppts = appointments.filter((a: Appointment) => isSameDay(new Date(a.dataHora), selectedDate));
    
    return generateSmartSlots(
      escala?.horaInicio || "08:00", 
      escala?.horaFim || "18:00", 
      targetServ,
      currentDayAppts,
      selectedDate
    );
  }, [clinica, profissionais, services, appointments, selectedDate, selectedProfId, selectedServId, isGeneralView]);

  return (
    <div className="max-w-full px-4 lg:px-8 pb-40 animate-premium">
      {/* 📊 Fase 3: KPIs em tempo real */}
      <KpiSection />

      {/* 🚀 Header Inteligente e Dinâmico */}
      <div className="bg-white border border-card-border p-6 rounded-[2rem] shadow-premium flex flex-col xl:flex-row justify-between items-center gap-6 sticky top-4 z-[50] backdrop-blur-xl bg-white/90 mb-8">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-2xl bg-primary text-white flex items-center justify-center text-xl shadow-lg italic font-black">S</div>
          <h2 className="text-xl font-black italic uppercase tracking-tighter text-text-main">
            {(!selectedProfId && !isGeneralView) ? "Início do Agendamento" : labels.termoAgenda}
          </h2>
        </div>

        {/* MODO DINÂMICO: Abas de Fluxo e Navegação */}
        <div className="bg-slate-100 p-1.5 rounded-[1.5rem] flex gap-1 border border-slate-200 shadow-inner overflow-x-auto no-scrollbar max-w-full">
          <button 
            onClick={() => { setSelectedProfId(null); setIsGeneralView(false); setWizardStep('specialty'); setActiveTab('dia'); }} 
            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all 
              ${(!selectedProfId && !isGeneralView && wizardStep === 'specialty') ? 'bg-white text-primary shadow-premium' : 'text-text-muted hover:text-text-main hover:bg-white/50'}`}
          >
            Especialidades
          </button>
          <button 
            onClick={() => { setSelectedProfId(null); setIsGeneralView(false); setWizardStep('professional'); setActiveTab('dia'); }} 
            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all 
              ${(!selectedProfId && !isGeneralView && wizardStep === 'professional') ? 'bg-white text-primary shadow-premium' : 'text-text-muted hover:text-text-main hover:bg-white/50'}`}
          >
            {labels.termoProfissional === 'Médico' ? 'Médicos' : 'Profissionais'}
          </button>

          {(selectedProfId || isGeneralView) && (
            <>
              {/* Divisor Visual */}
              <div className="w-[1px] bg-slate-200 mx-2 self-stretch my-2" />

              {/* Abas Temporais (Aparecem só após a escolha) */}
              {[
                { id: 'dia', label: 'Hoje' },
                { id: 'semana', label: 'Semana' },
                { id: 'mes', label: 'Mês' }
              ].map(tab => (
                <button 
                  key={tab.id} 
                  onClick={() => setActiveTab(tab.id as any)} 
                  className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all 
                    ${activeTab === tab.id ? 'bg-white text-primary shadow-premium' : 'text-text-muted hover:text-text-main hover:bg-white/50'}`}
                >
                  {tab.label}
                </button>
              ))}
            </>
          )}

          <div className="w-[1px] bg-slate-200 mx-2 self-stretch my-2" />
          
          <button 
            onClick={() => setActiveTab('servicos')} 
            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all 
              ${activeTab === 'servicos' ? 'bg-white text-primary shadow-premium' : 'text-text-muted hover:text-text-main hover:bg-white/50'}`}
          >
            {labels.termoServicoPlural}
          </button>
        </div>

        <div className="flex items-center gap-4">
          {(selectedProfId || isGeneralView) && (
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
          )}
          <button onClick={() => { setSelectedHour(''); setShowModal(true); }} className="btn-primary py-4 px-10 shadow-2xl shadow-primary/30 hidden md:block">
            + AGENDAR
          </button>
        </div>
      </div>

      <div className="animate-premium">
        {activeTab === 'dia' && (
          !selectedProfId && !isGeneralView ? (
            <AgendaSelectionWizard 
              profissionais={profissionais}
              labels={labels}
              onSelect={handleProfSelect}
              isMultiSpecialty={labels.temEspecialidades}
              isAdmin={['admin', 'gestor'].includes(user?.role?.toLowerCase())}
              onViewGeneral={() => setIsGeneralView(true)}
              step={wizardStep}
              setStep={setWizardStep}
            />
          ) : (
            <div className="bg-white border border-card-border rounded-[3rem] p-10 shadow-premium space-y-10">
              <div className="flex flex-col md:flex-row justify-between items-center gap-6 border-b border-slate-50 pb-8">
                <div className="flex items-center gap-6">
                  {selectedProfId && !isGeneralView && (
                    <div className="flex items-center gap-4 pr-10 border-r border-slate-100">
                      <div className="w-16 h-16 rounded-full border-4 border-white shadow-xl ring-2 ring-slate-100 overflow-hidden bg-slate-50 flex items-center justify-center">
                         {profissionais.find(p => p.id === selectedProfId)?.fotoUrl ? (
                           <img src={profissionais.find(p => p.id === selectedProfId)?.fotoUrl!} alt="Prof" className="w-full h-full object-cover" />
                         ) : (
                           <span className="text-xl font-black text-primary/30 uppercase italic">{profissionais.find(p => p.id === selectedProfId)?.nome[0]}</span>
                         )}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[11px] font-black uppercase italic tracking-tighter text-text-main">
                          {profissionais.find(p => p.id === selectedProfId)?.nome}
                        </span>
                        <span className="text-[8px] font-black text-primary uppercase tracking-[0.2em]">
                          {profissionais.find(p => p.id === selectedProfId)?.especialidade || labels.termoProfissional}
                        </span>
                        <button onClick={() => setSelectedProfId(null)} className="text-[7px] font-black text-text-placeholder uppercase tracking-widest hover:text-primary mt-1 text-left">
                          Trocar {labels.termoProfissional}
                        </button>
                      </div>
                    </div>
                  )}
                  <div>
                    <h3 className="text-xl font-black italic uppercase tracking-tighter text-text-main">
                      {isGeneralView ? 'Agenda' : 'Linha do'} <span className="text-primary italic">{isGeneralView ? 'Geral' : 'Tempo'}</span>
                    </h3>
                    <p className="text-[10px] font-black text-text-placeholder uppercase mt-2 tracking-widest">{labels.termoServico} + Buffer</p>
                  </div>
                </div>
                <div className="flex gap-4 items-center">
                  <div className="flex items-center gap-4 mr-4 border-r border-slate-100 pr-6">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-status-success"></div>
                      <span className="text-[8px] font-black uppercase text-text-placeholder">Ativo</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-status-warning"></div>
                      <span className="text-[8px] font-black uppercase text-text-placeholder">Pendente</span>
                    </div>
                  </div>
                  <select 
                    value={selectedProfId || 'all'} 
                    onChange={(e) => handleProfSelect(e.target.value)} 
                    className="bg-slate-100 border-none rounded-xl px-4 py-2 text-[10px] font-black uppercase text-text-main cursor-pointer"
                  >
                    <option value="all">Filtro por Especialista</option>
                    {profissionais.map((p: Profissional) => <option key={p.id} value={p.id}>{p.nome}</option>)}
                  </select>
                </div>
              </div>
              {smartSlots.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
                  {smartSlots.map((h: string) => {
                    const [hH, hM] = h.split(':').map(Number);
                    const slotTime = new Date(selectedDate);
                    slotTime.setHours(hH, hM, 0, 0);
                    
                    // Find appointment that COVERS this slot
                    const appt = appointments.find((a: Appointment) => {
                      if (selectedProfId && a.profissional?.id !== selectedProfId) return false;
                      const aStart = new Date(a.dataHora).getTime();
                      const aEnd = aStart + (a.durationMinutes || 30) * 60000;
                      return slotTime.getTime() >= aStart && slotTime.getTime() < aEnd;
                    });

                    return <HourCell key={h} hour={h} appt={appt} onClick={() => { setSelectedHour(h); setShowModal(true); }} />;
                  })}
                </div>
              ) : (
                <div className="py-24 text-center bg-slate-50/50 rounded-[3rem] border-2 border-dashed border-slate-100 flex flex-col items-center justify-center space-y-4">
                   <div className="text-4xl opacity-20">📅</div>
                   <p className="text-[10px] font-black text-text-placeholder uppercase tracking-[0.3em] opacity-60 italic">
                      Este {labels.termoProfissional} não possui horários configurados para este dia
                   </p>
                </div>
              )}
            </div>
          )
        )}

        {activeTab === 'profissionais' && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
            {profissionais.map((p: Profissional) => {
              const scale = p.escalas?.find((e: any) => e.diaSemana === selectedDate.getDay() && e.ativo);
              const pAppts = appointments.filter((a: Appointment) => isSameDay(new Date(a.dataHora), selectedDate) && a.profissional?.id === p.id);
              const isWorking = !!scale;
              const isCurrentlyBusy = pAppts.some((a: Appointment) => {
                const start = new Date(a.dataHora).getTime();
                const end = start + (a.durationMinutes || 30) * 60000;
                const now = new Date().getTime();
                return now >= start && now < end;
              });

              return (
                <div key={p.id} className="bg-white border border-card-border p-4 rounded-[2rem] shadow-sm flex flex-col items-center text-center space-y-3 group hover:shadow-md transition-all relative">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center font-black text-primary text-xl border-2 border-white shadow-sm ring-1 ring-slate-100 overflow-hidden">
                      {p.color ? (
                        <div className="w-full h-full" style={{ backgroundColor: p.color }} />
                      ) : p.nome[0].toUpperCase()}
                    </div>
                    <div className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-white shadow-sm ${!isWorking ? 'bg-slate-300' : (isCurrentlyBusy ? 'bg-status-error' : 'bg-status-success')}`}></div>
                  </div>
                  <div>
                    <h4 className="text-[10px] font-black uppercase italic tracking-tighter text-text-main truncate w-full max-w-[100px]">{p.nome}</h4>
                    <p className="text-[7px] font-bold text-primary uppercase tracking-widest">{p.especialidade || labels.termoProfissional}</p>
                  </div>
                  <div className="pt-2 border-t border-slate-50 w-full">
                    <p className="text-[7px] font-black text-text-placeholder uppercase">{pAppts.length} {labels.termoAgenda}s</p>
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

        {activeTab === 'planos' && (
          <div className="space-y-12">
            <div className="flex justify-between items-center bg-white border border-card-border p-10 rounded-[3rem] shadow-sm">
              <div>
                <h3 className="text-xl font-black italic uppercase tracking-tighter text-text-main">Gestão de <span className="text-primary italic">Assinaturas</span></h3>
                <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mt-1 opacity-60">Status: Sistema de Fidelidade V3.0 Ativo</p>
              </div>
              <div className="flex items-center gap-4 bg-primary-soft px-6 py-3 rounded-2xl border border-primary/10">
                <span className="text-[10px] font-black text-primary uppercase">Plano Ativo:</span>
                <span className="text-[12px] font-black text-primary uppercase italic tracking-tighter animate-pulse">OURO PREMIUM</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Bronze */}
              <div className="bg-white border border-card-border p-10 rounded-[3.5rem] shadow-sm flex flex-col items-center text-center space-y-6 relative overflow-hidden group hover:border-bronze/40 transition-all">
                <div className="w-16 h-16 rounded-3xl bg-amber-100/50 flex items-center justify-center text-3xl">🥉</div>
                <div>
                  <h4 className="text-lg font-black uppercase italic tracking-tighter text-amber-800">Bronze</h4>
                  <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Essencial para iniciar</p>
                </div>
                <div className="text-2xl font-black text-text-main tracking-tighter italic">R$ 49<span className="text-[10px] text-text-muted">/mês</span></div>
                <ul className="space-y-3 w-full text-left">
                  {['Agendamentos Ilimitados', 'Lembretes via WhatsApp', 'Relatórios Básicos'].map(b => (
                    <li key={b} className="text-[9px] font-black uppercase text-text-muted flex items-center gap-3 opacity-60">
                      <span className="text-amber-500">✓</span> {b}
                    </li>
                  ))}
                </ul>
                <button className="w-full py-4 rounded-2xl bg-slate-50 border border-slate-100 text-[9px] font-black uppercase tracking-widest text-text-placeholder">Plano Atual</button>
              </div>

              {/* Prata */}
              <div className="bg-white border-2 border-slate-200 p-10 rounded-[3.5rem] shadow-xl flex flex-col items-center text-center space-y-6 relative overflow-hidden group scale-105 z-10">
                <div className="absolute top-6 right-6 bg-slate-900 text-white text-[8px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest">Mais Popular</div>
                <div className="w-16 h-16 rounded-3xl bg-slate-100 flex items-center justify-center text-3xl">🥈</div>
                <div>
                  <h4 className="text-lg font-black uppercase italic tracking-tighter text-slate-700">Prata Plus</h4>
                  <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Gestão completa</p>
                </div>
                <div className="text-2xl font-black text-text-main tracking-tighter italic">R$ 89<span className="text-[10px] text-text-muted">/mês</span></div>
                <ul className="space-y-4 w-full text-left bg-slate-50/50 p-6 rounded-2xl">
                  {['Tudo do Bronze', 'Ranking de Clientes', 'Filtro de Assinantes ⭐', 'Suporte Prioritário'].map(b => (
                    <li key={b} className="text-[9px] font-black uppercase text-text-main flex items-center gap-3">
                      <span className="text-slate-500">✓</span> {b}
                    </li>
                  ))}
                </ul>
                <button className="w-full py-4 rounded-2xl bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest shadow-xl shadow-slate-900/20 hover:scale-105 transition-all">Migrar Agora</button>
              </div>

              {/* Ouro */}
              <div className="bg-white border border-card-border p-10 rounded-[3.5rem] shadow-sm flex flex-col items-center text-center space-y-6 relative overflow-hidden group hover:border-primary/40 transition-all">
                <div className="w-16 h-16 rounded-3xl bg-primary-soft flex items-center justify-center text-3xl">🥇</div>
                <div>
                  <h4 className="text-lg font-black uppercase italic tracking-tighter text-primary">Ouro VIP</h4>
                  <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Experiência Máxima</p>
                </div>
                <div className="text-2xl font-black text-text-main tracking-tighter italic">R$ 149<span className="text-[10px] text-text-muted">/mês</span></div>
                <ul className="space-y-3 w-full text-left">
                  {['Tudo do Prata', 'Profissionais Ilimitados', 'Acesso Multi-Unidade', 'IA de Atendimento Gold'].map(b => (
                    <li key={b} className="text-[9px] font-black uppercase text-text-muted flex items-center gap-3 opacity-60">
                      <span className="text-primary">✓</span> {b}
                    </li>
                  ))}
                </ul>
                <button className="w-full py-4 rounded-2xl bg-white border border-primary/20 text-primary text-[9px] font-black uppercase tracking-widest hover:bg-primary-soft transition-all">Consultar Upgrade</button>
              </div>
            </div>
          </div>
        )}


        {activeTab === 'semana' && (
          !selectedProfId && !isGeneralView ? (
            <AgendaSelectionWizard 
              profissionais={profissionais}
              labels={labels}
              onSelect={handleProfSelect}
              isMultiSpecialty={labels.temEspecialidades}
              isAdmin={['admin', 'gestor'].includes(user?.role?.toLowerCase())}
              onViewGeneral={() => setIsGeneralView(true)}
              step={wizardStep}
              setStep={setWizardStep}
            />
          ) : (
            <div className="bg-white border border-card-border rounded-[3rem] p-6 shadow-premium overflow-x-auto">
              <div className="min-w-[1000px] grid grid-cols-7 gap-4">
                {Array.from({ length: 7 }).map((_, i) => {
                  const day = new Date(selectedDate);
                  day.setDate(day.getDate() - day.getDay() + i);
                  const dayAppts = appointments.filter(a => isSameDay(new Date(a.dataHora), day) && (isGeneralView || a.profissional?.id === selectedProfId));
                  
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
          )
        )}

        {activeTab === 'mes' && (
          !selectedProfId && !isGeneralView ? (
            <AgendaSelectionWizard 
              profissionais={profissionais}
              labels={labels}
              onSelect={handleProfSelect}
              isMultiSpecialty={labels.temEspecialidades}
              isAdmin={['admin', 'gestor'].includes(user?.role?.toLowerCase())}
              onViewGeneral={() => setIsGeneralView(true)}
              step={wizardStep}
              setStep={setWizardStep}
            />
          ) : (
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
                  
                  // Prefill prev month days
                  for (let i = firstDay.getDay(); i > 0; i--) {
                    days.push({ day: prevLastDay.getDate() - i + 1, current: false, date: new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1, prevLastDay.getDate() - i + 1) });
                  }
                  // Current month
                  for (let i = 1; i <= lastDay.getDate(); i++) {
                    days.push({ day: i, current: true, date: new Date(selectedDate.getFullYear(), selectedDate.getMonth(), i) });
                  }
                  
                  return days.map((d, i) => {
                    const dayAppts = appointments.filter(a => isSameDay(new Date(a.dataHora), d.date) && (isGeneralView || a.profissional?.id === selectedProfId));
                    return (
                      <div key={i} onClick={() => { setSelectedDate(d.date); setActiveTab('dia'); }} className={`aspect-square p-3 rounded-3xl border transition-all cursor-pointer flex flex-col items-center justify-between ${d.current ? 'bg-slate-50 border-slate-100 hover:border-primary/30' : 'bg-white opacity-20 border-transparent'} ${isSameDay(d.date, new Date()) ? 'ring-2 ring-primary ring-offset-4' : ''}`}>
                         <span className={`text-sm font-black italic tracking-tighter ${d.current ? 'text-text-main' : 'text-text-placeholder'}`}>{d.day}</span>
                         {dayAppts.length > 0 && d.current && (
                           <div className="flex -space-x-1">
                              {dayAppts.slice(0, 3).map((a, idx) => (
                                <div key={idx} className="w-2 h-2 rounded-full border border-white shadow-sm" style={{ backgroundColor: STATUS_MAP[a.status]?.bg || '#ccc' }} />
                              ))}
                              {dayAppts.length > 3 && <span className="text-[7px] font-black text-primary pl-1">+{dayAppts.length - 3}</span>}
                           </div>
                         )}
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          )
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xl z-[200] flex items-center justify-center p-4 animate-premium" onClick={() => setShowModal(false)}>
          <div className="bg-white border border-card-border rounded-[3.5rem] p-12 w-full max-w-xl shadow-2xl relative" onClick={e => e.stopPropagation()}>
            <h3 className="text-2xl font-black italic uppercase tracking-tighter text-text-main mb-8">Novo {labels.termoAgenda}</h3>
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
              <select name="prof" required defaultValue={selectedProfId || ''} className="input-premium w-full py-4 px-6 rounded-xl bg-slate-50">
                <option value="">Selecione o {labels.termoProfissional}...</option>
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
