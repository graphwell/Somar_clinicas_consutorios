"use client";
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { fetchWithAuth } from '@/lib/api-utils';

const NICHOS = [
  { id: 'CLINICA_MEDICA', label: 'Clínica Médica', icon: '🏥' },
  { id: 'ODONTOLOGIA', label: 'Odontologia', icon: '🦷' },
  { id: 'CLINICA_ESTETICA', label: 'Estética', icon: '💆' },
  { id: 'SALAO_BELEZA', label: 'Salão / Barbearia', icon: '✂️' },
  { id: 'FISIOTERAPIA', label: 'Fisioterapia', icon: '🧘' },
  { id: 'NUTRICAO', label: 'Nutricionista', icon: '🥗' },
  { id: 'CLINICA_MULTI', label: 'Multiespecialidades', icon: '🏨' },
  { id: 'OUTRO', label: 'Outro', icon: '🏢' },
];

const DAYS = [
  { id: 1, label: 'Seg' }, { id: 2, label: 'Ter' }, { id: 3, label: 'Qua' },
  { id: 4, label: 'Qui' }, { id: 5, label: 'Sex' }, { id: 6, label: 'Sáb' }, { id: 7, label: 'Dom' },
];

function ProgressBar({ step, total }: { step: number; total: number }) {
  return (
    <div className="w-full mb-8">
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs text-slate-300 font-medium">Passo {step} de {total}</span>
        <span className="text-xs text-slate-300">{Math.round((step / total) * 100)}%</span>
      </div>
      <div className="h-1.5 bg-warm-200 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${(step / total) * 100}%`, background: 'linear-gradient(135deg,#40916C,#2D6A4F)' }}
        />
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Passo 1 — Perfil
  const [perfilNome, setPerfilNome] = useState('');
  const [perfilSobrenome, setPerfilSobrenome] = useState('');
  const [perfilTelefone, setPerfilTelefone] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const avatarRef = useRef<HTMLInputElement>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);

  // Passo 2 — Clínica
  const [nomeClinica, setNomeClinica] = useState('');
  const [nicho, setNicho] = useState('');
  const [telefoneClinica, setTelefoneClinica] = useState('');
  const [multiProfissional, setMultiProfissional] = useState(false);

  // Passo 3 — Horários
  const [openingTime, setOpeningTime] = useState('08:00');
  const [closingTime, setClosingTime] = useState('18:00');
  const [workingDays, setWorkingDays] = useState('1,2,3,4,5');

  // Passo 4 — Finalização
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const logoRef = useRef<HTMLInputElement>(null);

  const [tenantId, setTenantId] = useState('');

  useEffect(() => {
    // Pré-preencher com dados do usuário logado
    try {
      const userStr = localStorage.getItem('synka-user');
      if (userStr) {
        const user = JSON.parse(userStr);
        if (user.tenantId) setTenantId(user.tenantId);
      }
    } catch {}

    fetchWithAuth('/api/settings/profile')
      .then(r => r.json())
      .then(u => {
        if (u.nome) setPerfilNome(u.nome);
        if (u.sobrenome) setPerfilSobrenome(u.sobrenome);
        if (u.telefone) setPerfilTelefone(u.telefone);
        if (u.avatarUrl) setAvatarUrl(u.avatarUrl);
      })
      .catch(() => {});

    fetchWithAuth('/api/settings')
      .then(r => r.json())
      .then(d => {
        if (d.clinica?.nome) setNomeClinica(d.clinica.nome);
        if (d.clinica?.nicho) setNicho(d.clinica.nicho);
        if (d.clinica?.adminPhone) setTelefoneClinica(d.clinica.adminPhone);
        if (d.clinica?.openingTime) setOpeningTime(d.clinica.openingTime);
        if (d.clinica?.closingTime) setClosingTime(d.clinica.closingTime);
        if (d.clinica?.workingDays) setWorkingDays(d.clinica.workingDays);
        if (d.clinica?.configBranding?.logoUrl) setLogoUrl(d.clinica.configBranding.logoUrl);
      })
      .catch(() => {});
  }, []);

  const toggleDay = (id: number) => {
    const arr = workingDays.split(',').filter(Boolean).map(Number);
    setWorkingDays(arr.includes(id) ? arr.filter(d => d !== id).join(',') : [...arr, id].sort().join(','));
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarUploading(true);
    const fd = new FormData();
    fd.append('avatar', file);
    try {
      const res = await fetchWithAuth('/api/upload/avatar', { method: 'POST', body: fd });
      const data = await res.json();
      if (res.ok) setAvatarUrl(data.avatarUrl);
    } finally {
      setAvatarUploading(false);
      e.target.value = '';
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoUploading(true);
    const fd = new FormData();
    fd.append('logo', file);
    try {
      const res = await fetchWithAuth('/api/upload/logo', { method: 'POST', body: fd });
      const data = await res.json();
      if (res.ok) setLogoUrl(data.logoUrl);
    } finally {
      setLogoUploading(false);
      e.target.value = '';
    }
  };

  const handleNext = async () => {
    setError('');

    if (step === 1) {
      if (!perfilNome.trim()) { setError('Nome é obrigatório.'); return; }
      // Salvar perfil
      await fetchWithAuth('/api/settings/profile', {
        method: 'PUT',
        body: JSON.stringify({ nome: perfilNome.trim() }),
      }).catch(() => {});
      setStep(2);
    } else if (step === 2) {
      if (!nomeClinica.trim()) { setError('Nome da clínica é obrigatório.'); return; }
      if (!nicho) { setError('Selecione o segmento.'); return; }
      setStep(3);
    } else if (step === 3) {
      setStep(4);
    } else {
      // Passo 4 — Finalizar
      setLoading(true);
      try {
        const tid = tenantId || (JSON.parse(localStorage.getItem('synka-user') || '{}').tenantId);
        await fetchWithAuth('/api/onboarding', {
          method: 'POST',
          body: JSON.stringify({
            tenantId: tid,
            nicho,
            nomeClinica,
            telefoneClinica,
            openingTime,
            closingTime,
            workingDays,
            multiProfissional,
          }),
        });
        router.push('/dashboard');
      } catch (err: any) {
        setError(err.message || 'Erro ao salvar.');
        setLoading(false);
      }
    }
  };

  const headerGradient = 'linear-gradient(160deg, #1B3A2D 0%, #40916C 100%)';

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#F5F0E8' }}>
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-xl overflow-hidden border border-warm-200">

        {/* Header */}
        <div className="px-8 pt-8 pb-6" style={{ background: headerGradient }}>
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center text-white font-bold">S</div>
            <span className="text-white font-semibold">Synka</span>
          </div>
          <ProgressBar step={step} total={4} />
          <h1 className="text-xl font-bold text-white">
            {step === 1 && 'Sobre você'}
            {step === 2 && 'Sua clínica'}
            {step === 3 && 'Funcionamento'}
            {step === 4 && 'Tudo pronto! 🎉'}
          </h1>
          <p className="text-white/60 text-sm mt-1">
            {step === 1 && 'Confirme suas informações pessoais.'}
            {step === 2 && 'Conte sobre seu negócio.'}
            {step === 3 && 'Configure os horários de atendimento.'}
            {step === 4 && 'Adicione a logo e comece a usar.'}
          </p>
        </div>

        {/* Corpo */}
        <div className="p-8 space-y-5">
          {error && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm">⚠️ {error}</div>
          )}

          {/* PASSO 1 — Perfil */}
          {step === 1 && (
            <div className="space-y-5">
              {/* Avatar */}
              <div className="flex flex-col items-center gap-3">
                <div
                  className="w-20 h-20 rounded-full overflow-hidden cursor-pointer relative ring-2 ring-warm-200 hover:ring-sage-400 transition-all"
                  onClick={() => avatarRef.current?.click()}
                >
                  {avatarUrl ? (
                    <img src={avatarUrl} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white text-2xl font-bold"
                      style={{ background: 'linear-gradient(135deg,#40916C,#2D6A4F)' }}>
                      {(perfilNome || 'U').charAt(0).toUpperCase()}
                    </div>
                  )}
                  {avatarUploading && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <svg className="w-5 h-5 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                      </svg>
                    </div>
                  )}
                </div>
                <button type="button" onClick={() => avatarRef.current?.click()}
                  className="text-xs text-sage-600 font-medium hover:text-sage-700">
                  📷 Adicionar foto (opcional)
                </button>
                <input ref={avatarRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleAvatarUpload} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300 uppercase tracking-wider">Nome *</label>
                  <input value={perfilNome} onChange={e => setPerfilNome(e.target.value)}
                    className="input-premium w-full" placeholder="João" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300 uppercase tracking-wider">Sobrenome</label>
                  <input value={perfilSobrenome} onChange={e => setPerfilSobrenome(e.target.value)}
                    className="input-premium w-full" placeholder="Silva" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300 uppercase tracking-wider">Telefone pessoal</label>
                <input value={perfilTelefone} onChange={e => setPerfilTelefone(e.target.value)}
                  className="input-premium w-full" placeholder="(85) 99999-0000" inputMode="tel" />
              </div>
            </div>
          )}

          {/* PASSO 2 — Clínica */}
          {step === 2 && (
            <div className="space-y-5">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300 uppercase tracking-wider">Nome da clínica *</label>
                <input value={nomeClinica} onChange={e => setNomeClinica(e.target.value)}
                  className="input-premium w-full" placeholder="Clínica Sorriso" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-300 uppercase tracking-wider">Segmento *</label>
                <div className="grid grid-cols-4 gap-2">
                  {NICHOS.map(n => (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => setNicho(n.id)}
                      className={`flex flex-col items-center gap-1 p-2 rounded-xl border text-center transition-all h-16 ${
                        nicho === n.id
                          ? 'border-sage-500 bg-sage-50 shadow-sm'
                          : 'border-warm-200 hover:border-warm-300 opacity-60 hover:opacity-100'
                      }`}
                    >
                      <span className="text-xl">{n.icon}</span>
                      <span className="text-[9px] font-medium text-slate-700 leading-tight">{n.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300 uppercase tracking-wider">Telefone da clínica</label>
                <input value={telefoneClinica} onChange={e => setTelefoneClinica(e.target.value)}
                  className="input-premium w-full" placeholder="(85) 3333-0000" inputMode="tel" />
              </div>
              <label className="flex items-start gap-3 p-3 bg-warm-100 rounded-xl cursor-pointer border border-warm-200">
                <input type="checkbox" checked={multiProfissional} onChange={e => setMultiProfissional(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded accent-sage-500" />
                <div>
                  <p className="text-sm font-medium text-slate-700">Mais de um profissional atendendo?</p>
                  <p className="text-xs text-slate-300">Ativa agendas individuais por profissional.</p>
                </div>
              </label>
            </div>
          )}

          {/* PASSO 3 — Horários */}
          {step === 3 && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300 uppercase tracking-wider">Abertura</label>
                  <input type="time" value={openingTime} onChange={e => setOpeningTime(e.target.value)}
                    className="input-premium w-full" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300 uppercase tracking-wider">Fechamento</label>
                  <input type="time" value={closingTime} onChange={e => setClosingTime(e.target.value)}
                    className="input-premium w-full" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-300 uppercase tracking-wider">Dias de funcionamento</label>
                <div className="flex flex-wrap gap-2">
                  {DAYS.map(d => {
                    const active = workingDays.split(',').includes(String(d.id));
                    return (
                      <button key={d.id} type="button" onClick={() => toggleDay(d.id)}
                        className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all border ${
                          active
                            ? 'text-white border-sage-500'
                            : 'text-slate-300 border-warm-200 hover:border-warm-300'
                        }`}
                        style={active ? { background: 'linear-gradient(135deg,#40916C,#2D6A4F)' } : {}}>
                        {d.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* PASSO 4 — Finalização */}
          {step === 4 && (
            <div className="space-y-5">
              {/* Logo upload */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-300 uppercase tracking-wider">Logo da clínica (opcional)</label>
                <div
                  onClick={() => logoRef.current?.click()}
                  className="w-full h-28 rounded-2xl border-2 border-dashed border-warm-300 flex items-center justify-center cursor-pointer hover:border-sage-400 transition-all overflow-hidden relative"
                  style={logoUrl ? {
                    backgroundImage: "linear-gradient(45deg,#e0e0e0 25%,transparent 25%),linear-gradient(-45deg,#e0e0e0 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#e0e0e0 75%),linear-gradient(-45deg,transparent 75%,#e0e0e0 75%)",
                    backgroundSize: "12px 12px",
                    backgroundPosition: "0 0,0 6px,6px -6px,-6px 0px",
                    backgroundColor: "#f8f8f8"
                  } : {}}
                >
                  {logoUrl ? (
                    <img src={logoUrl} className="h-16 object-contain" />
                  ) : (
                    <div className="text-center">
                      <p className="text-2xl mb-1">🖼️</p>
                      <p className="text-xs text-slate-300">PNG, JPG ou SVG · máx 2MB</p>
                    </div>
                  )}
                  {logoUploading && (
                    <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                      <svg className="w-6 h-6 animate-spin text-sage-500" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                      </svg>
                    </div>
                  )}
                </div>
                <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
              </div>

              {/* Próximos passos */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-slate-300 uppercase tracking-wider">Próximos passos sugeridos</p>
                {[
                  { icon: '👥', text: 'Adicionar primeiro profissional', href: '/dashboard/team' },
                  { icon: '📦', text: 'Cadastrar serviços oferecidos', href: '/dashboard/services' },
                  { icon: '📅', text: 'Ver minha agenda', href: '/dashboard' },
                ].map(item => (
                  <a key={item.href} href={item.href}
                    className="flex items-center gap-3 p-3 bg-warm-100 rounded-xl border border-warm-200 hover:bg-warm-200 transition-colors text-sm text-slate-700">
                    <span>{item.icon}</span>
                    <span>{item.text}</span>
                    <span className="ml-auto text-slate-100">→</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Botões de navegação */}
          <div className="flex gap-3 pt-2">
            {step > 1 && (
              <button type="button" onClick={() => setStep(s => s - 1)}
                className="flex-1 h-11 rounded-xl border border-warm-300 text-slate-300 text-sm font-medium hover:bg-warm-100 transition-colors">
                ← Voltar
              </button>
            )}
            <button
              type="button"
              onClick={handleNext}
              disabled={loading}
              className="flex-1 h-11 rounded-xl text-white text-sm font-semibold transition-all disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg,#40916C,#2D6A4F)' }}
            >
              {loading ? 'Salvando...' : step === 4 ? 'Ir para o dashboard →' : 'Próximo →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
