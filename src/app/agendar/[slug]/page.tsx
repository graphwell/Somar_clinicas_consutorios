"use client";
import React, { useState, useEffect } from 'react';

interface Servico {
  id: string;
  nome: string;
  preco: number;
  duracaoMinutos: number;
  color?: string;
  descricao?: string;
}

interface Profissional {
  id: string;
  nome: string;
  especialidade?: string;
  fotoUrl?: string;
  color?: string;
  servicos?: { id: string }[];
}

interface ClinicaData {
  nome: string;
  nicho: string;
  tenantId: string;
  branding: any;
  servicos: Servico[];
  profissionais: Profissional[];
}

type Step = 'servico' | 'profissional' | 'data' | 'horario' | 'dados' | 'confirmacao';

const STEPS: Step[] = ['servico', 'profissional', 'data', 'horario', 'dados', 'confirmacao'];
const STEP_LABELS: Record<Step, string> = {
  servico: 'Serviço',
  profissional: 'Profissional',
  data: 'Data',
  horario: 'Horário',
  dados: 'Seus Dados',
  confirmacao: 'Confirmação',
};

function StepIndicator({ current, steps }: { current: Step; steps: Step[] }) {
  const idx = steps.indexOf(current);
  return (
    <div className="flex items-center gap-1 mb-8">
      {steps.map((s, i) => (
        <React.Fragment key={s}>
          <div className={`flex flex-col items-center gap-1 ${i <= idx ? 'opacity-100' : 'opacity-30'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black border-2 transition-all
              ${i < idx ? 'bg-emerald-500 border-emerald-500 text-white' :
                i === idx ? 'bg-primary border-primary text-white shadow-lg shadow-primary/30' :
                'bg-white border-slate-200 text-slate-400'}`}>
              {i < idx ? '✓' : i + 1}
            </div>
            <span className="text-[8px] font-black uppercase tracking-wider text-slate-500 hidden sm:block">{STEP_LABELS[s]}</span>
          </div>
          {i < steps.length - 1 && (
            <div className={`flex-1 h-0.5 mb-4 transition-all ${i < idx ? 'bg-emerald-500' : 'bg-slate-100'}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

export default function AgendarPage({ params }: { params: Promise<{ slug: string }> }) {
  const [slug, setSlug] = useState<string>('');
  const [clinica, setClinica] = useState<ClinicaData | null>(null);
  const [loadingClinica, setLoadingClinica] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [step, setStep] = useState<Step>('servico');
  const [selectedServico, setSelectedServico] = useState<Servico | null>(null);
  const [selectedProfissional, setSelectedProfissional] = useState<Profissional | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedSlot, setSelectedSlot] = useState<string>('');
  const [slots, setSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [saving, setSaving] = useState(false);
  const [agendamentoCriado, setAgendamentoCriado] = useState<any>(null);

  useEffect(() => {
    params.then(p => setSlug(p.slug));
  }, [params]);

  useEffect(() => {
    if (!slug) return;
    fetch(`/api/public/clinic/${slug}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) { setErro('Estabelecimento não encontrado.'); return; }
        setClinica(data);
      })
      .catch(() => setErro('Erro ao carregar dados do estabelecimento.'))
      .finally(() => setLoadingClinica(false));
  }, [slug]);

  const profissionaisDoServico = clinica?.profissionais.filter(p =>
    !selectedServico || !p.servicos?.length || p.servicos.some(s => s.id === selectedServico.id)
  ) || [];

  const minDate = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  };

  const maxDate = () => {
    const d = new Date();
    d.setDate(d.getDate() + 60);
    return d.toISOString().split('T')[0];
  };

  const fetchSlots = async (date: string) => {
    if (!clinica || !date) return;
    setLoadingSlots(true);
    setSlots([]);
    try {
      const params = new URLSearchParams({ date, tenantId: clinica.tenantId });
      if (selectedProfissional) params.append('profissionalId', selectedProfissional.id);
      const res = await fetch(`/api/bot/availability?${params}`);
      const data = await res.json();
      setSlots(data.availableSlots || []);
    } catch {}
    finally { setLoadingSlots(false); }
  };

  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
    setSelectedSlot('');
    fetchSlots(date);
    setStep('horario');
  };

  const handleSubmit = async () => {
    if (!clinica || !selectedSlot || !nome || !telefone) return;
    setSaving(true);
    try {
      const res = await fetch('/api/bot/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: clinica.tenantId,
          pacienteTelefone: telefone.replace(/\D/g, ''),
          pacienteNome: nome,
          dataHora: selectedSlot,
          profissionalId: selectedProfissional?.id || null,
          servicoId: selectedServico?.id || null,
        })
      });
      const data = await res.json();
      if (data.success) {
        setAgendamentoCriado(data.agendamento);
        setStep('confirmacao');
      } else {
        alert(data.error || 'Erro ao criar agendamento.');
      }
    } catch {
      alert('Erro ao conectar com o servidor.');
    } finally {
      setSaving(false);
    }
  };

  if (loadingClinica) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-[11px] font-black uppercase tracking-[0.4em] text-slate-400 animate-pulse">Carregando...</p>
      </div>
    );
  }

  if (erro || !clinica) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <p className="text-5xl mb-4">🔍</p>
          <p className="font-black text-slate-600 uppercase tracking-tight">{erro || 'Estabelecimento não encontrado'}</p>
        </div>
      </div>
    );
  }

  const branding = clinica.branding as any;
  const primaryColor = branding?.primaryColor || '#6366f1';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 shadow-sm">
        <div className="max-w-lg mx-auto px-6 py-5 flex items-center gap-4">
          {branding?.logoUrl ? (
            <img src={branding.logoUrl} alt={clinica.nome} className="h-12 w-auto object-contain rounded-xl" />
          ) : (
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-white text-lg shadow-lg"
              style={{ backgroundColor: primaryColor }}>
              {clinica.nome.charAt(0)}
            </div>
          )}
          <div>
            <h1 className="font-black text-slate-800 text-lg uppercase tracking-tight">{clinica.nome}</h1>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Agendamento Online</p>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-8">
        {step !== 'confirmacao' && (
          <StepIndicator current={step} steps={STEPS.filter(s => s !== 'confirmacao')} />
        )}

        {/* ETAPA 1: Serviço */}
        {step === 'servico' && (
          <div className="space-y-4">
            <div className="mb-6">
              <h2 className="text-2xl font-black uppercase tracking-tight text-slate-800">Escolha o Serviço</h2>
              <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mt-1">Selecione o que deseja agendar</p>
            </div>
            {clinica.servicos.length === 0 && (
              <p className="text-center text-slate-400 font-black uppercase text-xs py-12">Nenhum serviço disponível</p>
            )}
            {clinica.servicos.map(s => (
              <button key={s.id} onClick={() => { setSelectedServico(s); setStep('profissional'); }}
                className="w-full bg-white border-2 border-slate-100 rounded-3xl p-6 text-left hover:border-opacity-60 transition-all hover:-translate-y-0.5 shadow-sm hover:shadow-md"
                style={{ '--hover-border': s.color } as any}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner"
                      style={{ backgroundColor: (s.color || primaryColor) + '20' }}>
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color || primaryColor }} />
                    </div>
                    <div>
                      <p className="font-black text-slate-800 uppercase tracking-tight">{s.nome}</p>
                      {s.descricao && <p className="text-[11px] text-slate-400 mt-0.5 font-medium">{s.descricao}</p>}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-black text-slate-800 text-lg">R$ {s.preco.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    <p className="text-[10px] text-slate-400 font-black">⏱ {s.duracaoMinutos} min</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* ETAPA 2: Profissional */}
        {step === 'profissional' && (
          <div className="space-y-4">
            <div className="mb-6 flex items-center gap-3">
              <button onClick={() => setStep('servico')} className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors">←</button>
              <div>
                <h2 className="text-2xl font-black uppercase tracking-tight text-slate-800">Escolha o Profissional</h2>
                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mt-1">Serviço: {selectedServico?.nome}</p>
              </div>
            </div>
            <button onClick={() => { setSelectedProfissional(null); setStep('data'); }}
              className="w-full bg-white border-2 border-dashed border-slate-200 rounded-3xl p-6 text-left hover:border-slate-300 transition-all shadow-sm">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 font-black text-lg">?</div>
                <div>
                  <p className="font-black text-slate-600 uppercase tracking-tight">Sem preferência</p>
                  <p className="text-[11px] text-slate-400 mt-0.5 font-medium">Qualquer profissional disponível</p>
                </div>
              </div>
            </button>
            {profissionaisDoServico.map(p => (
              <button key={p.id} onClick={() => { setSelectedProfissional(p); setStep('data'); }}
                className="w-full bg-white border-2 border-slate-100 rounded-3xl p-6 text-left hover:border-slate-200 transition-all hover:-translate-y-0.5 shadow-sm hover:shadow-md">
                <div className="flex items-center gap-4">
                  {p.fotoUrl ? (
                    <img src={p.fotoUrl} alt={p.nome} className="w-12 h-12 rounded-2xl object-cover" />
                  ) : (
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-white text-lg shadow-inner"
                      style={{ backgroundColor: p.color || primaryColor }}>
                      {p.nome.charAt(0)}
                    </div>
                  )}
                  <div>
                    <p className="font-black text-slate-800 uppercase tracking-tight">{p.nome}</p>
                    {p.especialidade && <p className="text-[11px] text-slate-400 mt-0.5 font-bold uppercase tracking-widest">{p.especialidade}</p>}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* ETAPA 3: Data */}
        {step === 'data' && (
          <div className="space-y-6">
            <div className="mb-2 flex items-center gap-3">
              <button onClick={() => setStep('profissional')} className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors">←</button>
              <div>
                <h2 className="text-2xl font-black uppercase tracking-tight text-slate-800">Escolha a Data</h2>
                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mt-1">
                  {selectedProfissional?.nome || 'Qualquer profissional'} · {selectedServico?.nome}
                </p>
              </div>
            </div>
            <div className="bg-white border border-slate-100 rounded-3xl p-8 shadow-sm">
              <input
                type="date"
                min={minDate()}
                max={maxDate()}
                onChange={e => handleDateSelect(e.target.value)}
                className="w-full text-center text-2xl font-black text-slate-800 border-0 outline-none bg-transparent cursor-pointer"
              />
              <p className="text-center text-[10px] font-black uppercase tracking-widest text-slate-400 mt-4">Selecione uma data disponível</p>
            </div>
          </div>
        )}

        {/* ETAPA 4: Horário */}
        {step === 'horario' && (
          <div className="space-y-6">
            <div className="mb-2 flex items-center gap-3">
              <button onClick={() => setStep('data')} className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors">←</button>
              <div>
                <h2 className="text-2xl font-black uppercase tracking-tight text-slate-800">Escolha o Horário</h2>
                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mt-1">
                  {selectedDate ? new Date(selectedDate + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' }) : ''}
                </p>
              </div>
            </div>
            {loadingSlots ? (
              <div className="py-16 text-center text-[11px] font-black uppercase tracking-widest text-slate-400 animate-pulse">Buscando horários...</div>
            ) : slots.length === 0 ? (
              <div className="py-16 text-center">
                <p className="text-3xl mb-3">📅</p>
                <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">Sem horários disponíveis nesta data</p>
                <button onClick={() => setStep('data')} className="mt-4 text-[10px] font-black uppercase tracking-widest text-indigo-500 hover:underline">Escolher outra data</button>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {slots.map(slot => {
                  const hora = new Date(slot).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
                  return (
                    <button key={slot} onClick={() => { setSelectedSlot(slot); setStep('dados'); }}
                      className="bg-white border-2 border-slate-100 rounded-2xl py-4 text-center font-black text-slate-700 text-sm hover:border-indigo-300 hover:text-indigo-600 transition-all hover:shadow-sm">
                      {hora}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ETAPA 5: Dados do cliente */}
        {step === 'dados' && (
          <div className="space-y-6">
            <div className="mb-2 flex items-center gap-3">
              <button onClick={() => setStep('horario')} className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors">←</button>
              <div>
                <h2 className="text-2xl font-black uppercase tracking-tight text-slate-800">Seus Dados</h2>
                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mt-1">Para confirmarmos seu agendamento</p>
              </div>
            </div>

            {/* Resumo */}
            <div className="bg-white border border-slate-100 rounded-3xl p-6 space-y-3 shadow-sm">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-3">Resumo do Agendamento</p>
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider">Serviço</span>
                <span className="text-[12px] font-black text-slate-700">{selectedServico?.nome}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider">Profissional</span>
                <span className="text-[12px] font-black text-slate-700">{selectedProfissional?.nome || 'Qualquer'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider">Data & Hora</span>
                <span className="text-[12px] font-black text-slate-700">
                  {new Date(selectedDate + 'T00:00:00').toLocaleDateString('pt-BR')} às{' '}
                  {new Date(selectedSlot).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })}
                </span>
              </div>
              {selectedServico && (
                <div className="flex justify-between items-center pt-3 border-t border-slate-50">
                  <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider">Valor</span>
                  <span className="font-black text-slate-800 text-base">R$ {selectedServico.preco.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Seu Nome Completo</label>
                <input
                  value={nome}
                  onChange={e => setNome(e.target.value)}
                  placeholder="Ex: Maria Silva"
                  className="w-full bg-white border-2 border-slate-100 rounded-2xl px-5 py-4 font-bold text-slate-700 placeholder:text-slate-300 focus:outline-none focus:border-indigo-300 transition-colors"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">WhatsApp</label>
                <input
                  value={telefone}
                  onChange={e => setTelefone(e.target.value)}
                  placeholder="(11) 99999-9999"
                  type="tel"
                  className="w-full bg-white border-2 border-slate-100 rounded-2xl px-5 py-4 font-bold text-slate-700 placeholder:text-slate-300 focus:outline-none focus:border-indigo-300 transition-colors"
                />
              </div>
            </div>

            <button
              onClick={handleSubmit}
              disabled={saving || !nome.trim() || !telefone.trim()}
              className="w-full py-5 rounded-3xl font-black text-white text-sm uppercase tracking-widest shadow-xl transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: primaryColor }}>
              {saving ? 'Confirmando...' : 'Confirmar Agendamento'}
            </button>
          </div>
        )}

        {/* ETAPA 6: Confirmação */}
        {step === 'confirmacao' && agendamentoCriado && (
          <div className="text-center space-y-8 py-8">
            <div className="w-24 h-24 rounded-full bg-emerald-50 border-4 border-emerald-500 flex items-center justify-center text-4xl mx-auto shadow-xl shadow-emerald-100">
              ✓
            </div>
            <div>
              <h2 className="text-3xl font-black uppercase tracking-tight text-slate-800 mb-2">Agendado!</h2>
              <p className="text-slate-500 font-medium">Seu agendamento foi confirmado com sucesso.</p>
            </div>

            <div className="bg-white border border-slate-100 rounded-3xl p-8 text-left space-y-4 shadow-sm">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-4">Detalhes do Agendamento</p>
              <div className="flex justify-between">
                <span className="text-[11px] font-black text-slate-400 uppercase">Estabelecimento</span>
                <span className="text-[12px] font-black text-slate-700">{clinica.nome}</span>
              </div>
              {selectedServico && (
                <div className="flex justify-between">
                  <span className="text-[11px] font-black text-slate-400 uppercase">Serviço</span>
                  <span className="text-[12px] font-black text-slate-700">{selectedServico.nome}</span>
                </div>
              )}
              {selectedProfissional && (
                <div className="flex justify-between">
                  <span className="text-[11px] font-black text-slate-400 uppercase">Profissional</span>
                  <span className="text-[12px] font-black text-slate-700">{selectedProfissional.nome}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-[11px] font-black text-slate-400 uppercase">Data</span>
                <span className="text-[12px] font-black text-slate-700">
                  {new Date(selectedDate + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[11px] font-black text-slate-400 uppercase">Horário</span>
                <span className="text-[12px] font-black text-slate-700">
                  {new Date(selectedSlot).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })}
                </span>
              </div>
              <div className="flex justify-between pt-3 border-t border-slate-50">
                <span className="text-[11px] font-black text-slate-400 uppercase">Status</span>
                <span className="text-[11px] font-black uppercase px-3 py-1 bg-amber-50 text-amber-600 rounded-lg border border-amber-100">Pendente</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 font-medium">
              Você receberá uma confirmação via WhatsApp em breve. Até logo, {nome}!
            </p>

            <button onClick={() => {
              setStep('servico');
              setSelectedServico(null); setSelectedProfissional(null);
              setSelectedDate(''); setSelectedSlot('');
              setNome(''); setTelefone('');
              setAgendamentoCriado(null);
            }}
              className="text-[11px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors underline underline-offset-4">
              Fazer outro agendamento
            </button>
          </div>
        )}
      </div>

      <footer className="py-8 text-center text-[9px] font-black uppercase tracking-widest text-slate-300">
        Powered by Synka
      </footer>
    </div>
  );
}
