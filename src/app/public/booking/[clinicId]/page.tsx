"use client";
import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

export default function PublicBookingPage() {
  const params = useParams();
  const clinicId = params.clinicId as string;

  const [clinic, setClinic] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(1); // 1: Service, 2: Professional, 3: DateTime, 4: Contact/Finish

  // Selection state
  const [selectedService, setSelectedService] = useState<any>(null);
  const [selectedProfessional, setSelectedProfessional] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedTime, setSelectedTime] = useState('');
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!clinicId) return;
    fetch(`/api/public/clinic/${clinicId}`)
      .then(r => r.json())
      .then(data => { setClinic(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [clinicId]);

  const handleFinish = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/bot/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: clinic.tenantId,
          pacienteNome: nome,
          pacienteTelefone: telefone,
          dataHora: `${selectedDate}T${selectedTime}:00`,
          profissionalId: selectedProfessional?.id,
          servicoId: selectedService?.id,
          origem: 'public_portal'
        })
      });
      if (res.ok) setSuccess(true);
    } catch {} finally { setSaving(false); }
  };

  if (loading) return (
    <div className="min-h-screen bg-[#0a0a0c] flex items-center justify-center">
      <div className="w-16 h-16 border-4 border-white/5 border-t-blue-500 rounded-full animate-spin" />
    </div>
  );

  if (!clinic) return (
    <div className="min-h-screen bg-[#0a0a0c] flex items-center justify-center text-white/50 font-black uppercase text-xs tracking-widest">
      404 | Clínica não encontrada
    </div>
  );

  if (success) return (
    <div className="min-h-screen bg-[#0a0a0c] flex flex-col items-center justify-center p-8 text-center animate-in fade-in zoom-in duration-700">
      <div className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center text-4xl shadow-2xl mb-8">✅</div>
      <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter mb-4">Agendamento Realizado!</h2>
      <p className="text-white/60 text-sm max-w-xs leading-relaxed italic border-t border-white/10 pt-6">Você receberá uma confirmação via WhatsApp em instantes. Obrigado pela preferência!</p>
      <div className="mt-12 text-[10px] text-white/30 font-black uppercase tracking-widest">Powered by Synka 2.0</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white selection:bg-blue-500/30">
      {/* Header Estilo Booking Premium */}
      <div className="relative h-64 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-600/20 to-[#0a0a0c] z-10" />
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?q=80&w=2053&auto=format&fit=crop')] bg-cover bg-center grayscale opacity-10" />
        <div className="relative z-20 h-full flex flex-col items-center justify-center p-6 text-center">
           <div className="uppercase font-black text-[10px] tracking-[0.5em] text-blue-500 mb-2">Agendamento Online</div>
           <h1 className="text-4xl font-black italic uppercase tracking-tighter drop-shadow-2xl">{clinic.nome}</h1>
           <div className="mt-4 px-4 py-1.5 bg-white/5 border border-white/10 rounded-full text-[9px] font-black uppercase tracking-widest opacity-60">{clinic.nicho}</div>
        </div>
      </div>

      <div className="max-w-xl mx-auto -mt-12 relative z-30 p-4 pb-20">
        <div className="bg-[#121216] border border-white/5 rounded-[3rem] p-8 shadow-2xl">
          
          {/* Progress Bar */}
          <div className="flex gap-2 mb-10">
            {[1,2,3,4].map(s => (
              <div key={s} className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${step >= s ? 'bg-blue-500' : 'bg-white/5'}`} />
            ))}
          </div>

          {/* Step 1: Services */}
          {step === 1 && (
            <div className="animate-in slide-in-from-right-8 duration-500">
              <h3 className="text-xl font-black italic uppercase mb-8 flex items-center gap-3">
                <span className="text-blue-500">01</span> Escolha o Procedimento
              </h3>
              <div className="space-y-4">
                {clinic.servicos.map((s: any) => (
                  <button key={s.id} onClick={() => { setSelectedService(s); setStep(2); }}
                    className="w-full group flex items-center justify-between p-6 bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 hover:border-blue-500/30 rounded-[2rem] transition-all text-left">
                    <div className="flex items-center gap-4">
                       <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform">📦</div>
                       <div>
                         <p className="font-black italic uppercase text-sm tracking-tight">{s.nome}</p>
                         <p className="text-[10px] text-white/40 font-black uppercase tracking-widest mt-0.5">{s.duracaoMinutos} Minutos</p>
                       </div>
                    </div>
                    <div className="text-right">
                       <p className="text-[10px] text-white/30 font-black uppercase mb-1 tracking-widest">Valor</p>
                       <p className="text-lg font-black text-white italic tracking-tighter">R$ {s.preco}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Professionals */}
          {step === 2 && (
            <div className="animate-in slide-in-from-right-8 duration-500">
              <h3 className="text-xl font-black italic uppercase mb-8 flex items-center gap-3">
                <span className="text-blue-500">02</span> Com quem deseja ser atendido?
              </h3>
              <div className="grid grid-cols-1 gap-4">
                <button onClick={() => { setSelectedProfessional(null); setStep(3); }} 
                  className="w-full p-6 bg-white/[0.02] border border-white/5 rounded-[2rem] text-center font-black uppercase text-[10px] tracking-widest hover:bg-white/[0.05] transition-all italic">Qualquer Profissional</button>
                {clinic.profissionais.map((p: any) => (
                  <button key={p.id} onClick={() => { setSelectedProfessional(p); setStep(3); }}
                    className="w-full flex items-center gap-4 p-6 bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 hover:border-blue-500/30 rounded-[2rem] transition-all text-left">
                    <div className="w-16 h-16 rounded-[1.5rem] overflow-hidden bg-white/5">
                      {p.fotoUrl ? <img src={p.fotoUrl} alt={p.nome} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-xl font-black text-white/20 capitalize">{p.nome.charAt(0)}</div>}
                    </div>
                    <div>
                         <p className="font-black italic uppercase text-sm tracking-tight">{p.nome}</p>
                         <p className="text-[9px] text-blue-500 font-black uppercase tracking-widest mt-0.5">{p.especialidade || clinic.nicho}</p>
                    </div>
                  </button>
                ))}
              </div>
              <button onClick={() => setStep(1)} className="mt-8 text-white/30 font-black uppercase text-[9px] tracking-[0.3em] hover:text-white transition-all w-full underline decoration-blue-500/30 underline-offset-8">Voltar aos serviços</button>
            </div>
          )}

          {/* Step 3: Date/Time */}
          {step === 3 && (
            <div className="animate-in slide-in-from-right-8 duration-500">
              <h3 className="text-xl font-black italic uppercase mb-8 flex items-center gap-3">
                <span className="text-blue-500">03</span> Data e Horário
              </h3>
              <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} min={new Date().toISOString().split('T')[0]}
                className="w-full bg-white/[0.03] border border-white/10 rounded-2xl p-4 text-sm font-black uppercase tracking-widest focus:outline-none focus:border-blue-500 transition-all mb-8" />
              
              <div className="grid grid-cols-3 gap-3">
                {['08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00'].map(h => (
                  <button key={h} onClick={() => { setSelectedTime(h); setStep(4); }}
                    className="py-3 bg-white/[0.02] hover:bg-blue-500 border border-white/5 hover:border-blue-500 rounded-xl text-[10px] font-black transition-all hover:scale-105 active:scale-95">
                    {h}
                  </button>
                ))}
              </div>
              <button onClick={() => setStep(2)} className="mt-12 text-white/30 font-black uppercase text-[9px] tracking-[0.3em] hover:text-white transition-all w-full italic">Voltar ao Profissional</button>
            </div>
          )}

          {/* Step 4: Contact */}
          {step === 4 && (
            <div className="animate-in slide-in-from-right-8 duration-500">
              <h3 className="text-xl font-black italic uppercase mb-8 flex items-center gap-3">
                <span className="text-blue-500">04</span> Quase lá!
              </h3>
              
              <div className="bg-blue-500/10 border border-blue-500/20 p-6 rounded-[2rem] mb-8">
                 <p className="text-[10px] text-blue-500 font-black uppercase tracking-widest mb-3">Resumo</p>
                 <p className="text-white font-black italic uppercase tracking-tighter text-lg">{selectedService.nome}</p>
                 <p className="text-[9px] text-white/60 font-black uppercase tracking-[0.2em] mt-2">📅 {selectedDate.split('-').reverse().join('/')} às {selectedTime}</p>
                 <p className="text-[9px] text-white/60 font-black uppercase tracking-[0.2em] mt-1">👤 {selectedProfessional?.nome || 'Qualquer Profissional'}</p>
              </div>

              <div className="space-y-4">
                <input required placeholder="Seu Nome Completo" value={nome} onChange={e => setNome(e.target.value)}
                  className="w-full bg-white/[0.03] border border-white/10 rounded-2xl p-5 text-sm font-medium focus:outline-none focus:border-blue-500 transition-all" />
                <input required placeholder="Seu WhatsApp (Somente números)" value={telefone} onChange={e => setTelefone(e.target.value)}
                  className="w-full bg-white/[0.03] border border-white/10 rounded-2xl p-5 text-sm font-medium focus:outline-none focus:border-blue-500 transition-all" />
              </div>

              <button disabled={!nome || !telefone || saving} onClick={handleFinish}
                className="w-full mt-10 py-5 bg-blue-500 disabled:opacity-30 text-white rounded-3xl text-sm font-black italic uppercase tracking-widest shadow-2xl shadow-blue-500/30 transition-all hover:scale-[1.02] active:scale-95">
                {saving ? 'PROCESSANDO...' : 'FINALIZAR AGENDAMENTO'}
              </button>
              
              <button onClick={() => setStep(3)} className="mt-6 text-white/30 font-black uppercase text-[9px] tracking-[0.3em] hover:text-white transition-all w-full italic">Trocar Horário</button>
            </div>
          )}

        </div>

        <div className="mt-8 text-center">
           <p className="text-[8px] text-white/20 font-black uppercase tracking-[0.5em]">Segurança & Agilidade • Synka Digital</p>
        </div>
      </div>
    </div>
  );
}
