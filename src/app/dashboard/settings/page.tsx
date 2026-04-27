"use client";
import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { fetchWithAuth } from '@/lib/api-utils';
import AvatarEditor from '@/components/profile/AvatarEditor';

const NICHES = ["Clínica Médica", "Clínica de Estética", "Fisioterapia", "Pilates", "Nutricionista", "Psicólogo", "Salão de Beleza / Barbearia", "Outros"];

export default function SettingsPage() {
  const { theme, setTheme: setAppTheme } = useTheme();
  const [niche, setNiche] = useState("Clínica Médica");
  const [primaryColor, setPrimaryColor] = useState("#3B82F6");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [botActive, setBotActive] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);


  // Perfil do usuário
  const [perfilNome, setPerfilNome] = useState('');
  const [perfilTelefone, setPerfilTelefone] = useState('');
  const [perfilEmail, setPerfilEmail] = useState('');
  const [perfilRole, setPerfilRole] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [perfilSalvo, setPerfilSalvo] = useState(false);

  const [razaoSocial, setRazaoSocial] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [endereco, setEndereco] = useState('');
  const [adminPhone, setAdminPhone] = useState('');
  const [openingTime, setOpeningTime] = useState('08:00');
  const [closingTime, setClosingTime] = useState('18:00');
  const [workingDays, setWorkingDays] = useState('1,2,3,4,5');

  // Resumo diário/semanal
  const [resumoCfg, setResumoCfg] = useState<any>({
    ativo: true, frequencia: 'diario', horaDiario: '07:00',
    diaSemana: 'segunda', horaSemanal: '07:00',
    recebeAdmin: true, recebeRecepcao: false, recebeProfissional: false,
    secaoAgenda: true, secaoOcupacao: true, secaoFinanceiro: true,
    secaoEstoque: true, secaoFilaEspera: true, secaoInsightsIA: true,
    estoqueMinimo: 3,
  });
  const [resumoSalvo, setResumoSalvo] = useState(false);
  const [resumoTestando, setResumoTestando] = useState(false);

  useEffect(() => {
    fetchWithAuth('/api/resumo/config')
      .then(r => r.json())
      .then(data => { if (data && !data.error) setResumoCfg((p: any) => ({ ...p, ...data })) })
      .catch(() => {})
  }, [])

  const handleSaveResumo = async () => {
    try {
      const res = await fetchWithAuth('/api/resumo/config', {
        method: 'PATCH',
        body: JSON.stringify(resumoCfg),
      })
      if (res.ok) { setResumoSalvo(true); setTimeout(() => setResumoSalvo(false), 2000) }
    } catch {}
  }

  const handleTestarResumo = async () => {
    setResumoTestando(true)
    try {
      await fetchWithAuth('/api/resumo/config', { method: 'POST', body: JSON.stringify({ action: 'testar' }) })
      alert('Resumo enviado! Verifique seu WhatsApp ou as notificações internas.')
    } catch {
      alert('Erro ao testar. Tente novamente.')
    } finally { setResumoTestando(false) }
  }

  useEffect(() => {
    fetchWithAuth('/api/settings/profile')
      .then(r => r.json())
      .then(u => {
        if (u.nome) setPerfilNome(u.nome);
        if (u.telefone) setPerfilTelefone(u.telefone);
        if (u.email) setPerfilEmail(u.email);
        if (u.role) setPerfilRole(u.role);
        if (u.avatarUrl) setAvatarUrl(u.avatarUrl);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchWithAuth('/api/settings')
      .then(res => res.json())
      .then(data => {
        if (data.clinica) {
          setRazaoSocial(data.clinica.razaoSocial || '');
          setCnpj(data.clinica.cnpj || '');
          setEndereco(data.clinica.endereco || '');
          setAdminPhone(data.clinica.adminPhone || '');
          setNiche(data.clinica.nicho || 'Clínica Médica');
          if (data.clinica.slug) setSlug(data.clinica.slug);
          setBotActive(data.clinica.botActive ?? true);
          setOpeningTime(data.clinica.openingTime || '08:00');
          setClosingTime(data.clinica.closingTime || '18:00');
          setWorkingDays(data.clinica.workingDays || '1,2,3,4,5');
          if (data.clinica.configBranding) {
            const branding = data.clinica.configBranding as any;
            if (branding.logoUrl) setLogoUrl(branding.logoUrl);
            if (branding.primaryColor) setPrimaryColor(branding.primaryColor);
          }
        }
      });
  }, []);

  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [slug, setSlug] = useState('');
  const [linkCopiado, setLinkCopiado] = useState(false);
 
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadSuccess(false);
    const formData = new FormData();
    formData.append('logo', file);
    try {
      const res = await fetchWithAuth('/api/upload/logo', { method: 'POST', body: formData });
      const data = await res.json();
      if (res.ok) {
        setLogoUrl(data.logoUrl);
        setUploadSuccess(true);
        setTimeout(() => {
          window.location.reload(); 
        }, 1500);
      } else {
        alert(data.error || 'Erro ao subir logo. Verifique se o arquivo tem menos de 2MB.');
      }
    } catch (err: any) {
      alert('Erro de conexão ou tamanho excedido.');
    } finally { setUploading(false); }
  };

  const handleAvatarUpdate = (newUrl: string) => {
    setAvatarUrl(newUrl || null);
    // Propagar atualização para a Sidebar em tempo real
    try {
      const stored = localStorage.getItem('synka-user');
      const user = stored ? JSON.parse(stored) : {};
      user.avatarUrl = newUrl || null;
      localStorage.setItem('synka-user', JSON.stringify(user));
      window.dispatchEvent(new CustomEvent('synka-user-updated'));
    } catch {}
  };

  const handleSavePerfil = async () => {
    try {
      const res = await fetchWithAuth('/api/settings/profile', {
        method: 'PUT',
        body: JSON.stringify({ nome: perfilNome, telefone: perfilTelefone }),
      });
      if (res.ok) {
        setPerfilSalvo(true);
        setTimeout(() => setPerfilSalvo(false), 2000);
        // Atualiza nome no localStorage e notifica Sidebar
        try {
          const stored = localStorage.getItem('synka-user');
          const user = stored ? JSON.parse(stored) : {};
          user.nome = perfilNome;
          localStorage.setItem('synka-user', JSON.stringify(user));
          window.dispatchEvent(new CustomEvent('synka-user-updated'));
        } catch {}
      }
    } catch {}
  };

  const toggleDay = (day: number) => {
    const daysArr = workingDays.split(',').filter(Boolean).map(Number);
    if (daysArr.includes(day)) {
      setWorkingDays(daysArr.filter(d => d !== day).join(','));
    } else {
      setWorkingDays([...daysArr, day].sort().join(','));
    }
  };

  const handleSave = async () => {
    try {
      const res = await fetchWithAuth('/api/settings', {
        method: 'PUT',
        body: JSON.stringify({ razaoSocial, cnpj, endereco, adminPhone, nicho: niche, botActive, openingTime, closingTime, workingDays })
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch {}
  };

  const DAYS = [
    { id: 1, label: 'SEG' },
    { id: 2, label: 'TER' },
    { id: 3, label: 'QUA' },
    { id: 4, label: 'QUI' },
    { id: 5, label: 'SEX' },
    { id: 6, label: 'SÁB' },
    { id: 7, label: 'DOM' }
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-12 pb-40 px-4 animate-premium">

      {/* Widget: Link de Agendamento */}
      {slug && (
        <div className="bg-white border border-warm-200 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#40916C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/>
              <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
            </svg>
            <p className="text-xs uppercase tracking-wider font-semibold text-slate-500">Link de Agendamento Online</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-warm-100 rounded-lg px-3 py-2.5 text-sm text-slate-500 overflow-hidden text-ellipsis whitespace-nowrap border border-warm-200">
              {typeof window !== 'undefined' ? window.location.origin : ''}/agendar/{slug}
            </div>
            <button
              onClick={() => {
                const link = `${window.location.origin}/agendar/${slug}`;
                navigator.clipboard.writeText(link).then(() => {
                  setLinkCopiado(true);
                  setTimeout(() => setLinkCopiado(false), 2000);
                });
              }}
              className="px-3 py-2.5 rounded-lg border border-warm-200 text-sm font-medium text-slate-500 hover:bg-warm-100 transition-colors shrink-0 flex items-center gap-1.5"
            >
              {linkCopiado ? (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#40916C" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                  <span className="text-sage-600">Copiado!</span>
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
                  </svg>
                  Copiar
                </>
              )}
            </button>
          </div>
          <p className="text-xs text-slate-300">
            Cole esse link na saudação do seu WhatsApp Business para que clientes agendem direto pelo celular.
          </p>
        </div>
      )}

      {/* Meu Perfil */}
      <div className="premium-card p-6 bg-white space-y-5">
        <div className="border-b border-slate-50 pb-4">
          <h3 className="text-base font-black text-text-main italic uppercase tracking-tighter">Meu Perfil</h3>
          <p className="text-[8px] font-black text-text-placeholder uppercase tracking-widest mt-0.5 opacity-60">Dados da sua conta</p>
        </div>
        <div className="flex items-center gap-5">
          {/* Avatar — gerenciado pelo AvatarEditor */}
          <div className="shrink-0">
            <AvatarEditor
              currentUrl={avatarUrl}
              nome={perfilNome || perfilEmail || 'U'}
              size={80}
              shape="rounded"
              outputSize={256}
              uploadEndpoint="/api/upload/avatar"
              onUpdate={handleAvatarUpdate}
            />
          </div>

          {/* Campos */}
          <div className="flex-1 min-w-0 space-y-3">
            <div className="space-y-1">
              <label className="text-[8px] font-black uppercase tracking-[0.2em] text-text-placeholder ml-1">Nome</label>
              <input
                value={perfilNome}
                onChange={e => setPerfilNome(e.target.value)}
                placeholder="Seu nome"
                className="input-premium w-full py-2.5 text-sm"
                style={{ fontSize: '16px' }}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[8px] font-black uppercase tracking-[0.2em] text-text-placeholder ml-1">Telefone</label>
              <input
                value={perfilTelefone}
                onChange={e => setPerfilTelefone(e.target.value)}
                placeholder="(XX) XXXXX-XXXX"
                className="input-premium w-full py-2.5 text-sm"
                style={{ fontSize: '16px' }}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[8px] font-black uppercase tracking-[0.2em] text-text-placeholder ml-1">E-mail</label>
                <input value={perfilEmail} disabled className="input-premium w-full py-2.5 text-sm opacity-50 cursor-not-allowed" />
              </div>
              <div className="space-y-1">
                <label className="text-[8px] font-black uppercase tracking-[0.2em] text-text-placeholder ml-1">Função</label>
                <input value={perfilRole} disabled className="input-premium w-full py-2.5 text-sm opacity-50 cursor-not-allowed capitalize" />
              </div>
            </div>
          </div>
        </div>
        <div className="flex justify-end">
          <button
            onClick={handleSavePerfil}
            className="btn-primary px-6"
          >
            {perfilSalvo ? 'Salvo!' : 'Salvar Perfil'}
          </button>
        </div>
      </div>

      {/* Links rápidos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <a
          href="/dashboard/settings/permissoes"
          className="flex items-center justify-between bg-white border border-warm-200 rounded-xl px-5 py-3 shadow-card hover:shadow-card-hover transition-all hover:-translate-y-px"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-sage-50 flex items-center justify-center text-sage-500"><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="2.333" y="6.417" width="9.333" height="6.417" rx="1.5" stroke="currentColor" strokeWidth="1.3"/><path d="M4.667 6.417V4.667a2.333 2.333 0 014.666 0v1.75" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/><circle cx="7" cy="9.333" r="0.875" fill="currentColor"/></svg></div>
            <div>
              <p className="text-sm font-medium text-slate-700">Permissões por função</p>
              <p className="text-[11px] text-slate-100">Controle o que recepção e profissionais podem acessar</p>
            </div>
          </div>
          <span className="text-slate-100 text-sm">→</span>
        </a>
        <a
          href="/dashboard/settings/comissoes"
          className="flex items-center justify-between bg-white border border-warm-200 rounded-xl px-5 py-3 shadow-card hover:shadow-card-hover transition-all hover:-translate-y-px"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary"><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.3"/><path d="M7 4v1.5M7 8.5V10M5.5 5.5a1.5 1.5 0 013 0c0 .828-.672 1.5-1.5 1.5S5.5 7.828 5.5 8.5a1.5 1.5 0 003 0" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg></div>
            <div>
              <p className="text-sm font-medium text-slate-700">Comissões por profissional</p>
              <p className="text-[11px] text-slate-100">Defina percentuais e valores fixos por serviço ou produto</p>
            </div>
          </div>
          <span className="text-slate-100 text-sm">→</span>
        </a>
      </div>

      {/* Header Premium V2.2 - 3x Smaller */}
      <div className="bg-white border border-card-border p-6 rounded-3xl shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-4">
           <div className="w-10 h-10 rounded-2xl bg-primary text-white flex items-center justify-center text-xl shadow-lg shadow-primary/10 italic font-black">C</div>
           <div>
              <h2 className="text-lg font-black italic uppercase tracking-tighter text-text-main">Ajustes de <span className="text-primary">Sistema</span></h2>
              <p className="text-[8px] font-black text-text-placeholder uppercase tracking-[0.2em] mt-0.5 opacity-60">Configurações da empresa</p>
           </div>
        </div>
        <button onClick={handleSave} className="btn-primary flex items-center justify-center gap-3">
           {saved ? 'Sincronizado' : 'Salvar Alterações'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        
        {/* Identidade Corporativa */}
        <div className="lg:col-span-12 space-y-10">
           
           <div className="premium-card p-6 bg-white space-y-6">
              <div className="border-b border-slate-50 pb-4">
                <h3 className="text-base font-black text-text-main italic uppercase tracking-tighter">1. Identidade de Marca</h3>
                <p className="text-[8px] font-black text-text-placeholder uppercase tracking-widest mt-0.5 opacity-60">Logotipo e Presença Visual</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="space-y-3">
                    <label className="text-[8px] font-black uppercase tracking-[0.2em] text-text-placeholder ml-2">Logo da Unidade</label>
                     <div onClick={() => fileRef.current?.click()} className="w-full h-32 rounded-2xl border-2 border-dashed border-card-border flex flex-col items-center justify-center cursor-pointer hover:border-primary/30 transition-all overflow-hidden relative group"
                       style={logoUrl ? {
                         backgroundImage: "linear-gradient(45deg,#e0e0e0 25%,transparent 25%),linear-gradient(-45deg,#e0e0e0 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#e0e0e0 75%),linear-gradient(-45deg,transparent 75%,#e0e0e0 75%)",
                         backgroundSize: "12px 12px",
                         backgroundPosition: "0 0,0 6px,6px -6px,-6px 0px",
                         backgroundColor: "#f8f8f8"
                       } : { backgroundColor: '#f8fafc' }}
                     >
                        {logoUrl ? (
                          <>
                            <img src={logoUrl} className="h-16 object-contain animate-premium" />
                            <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                               <span className="text-[8px] font-black text-white uppercase tracking-widest">Atualizar Marca</span>
                            </div>
                          </>
                        ) : (
                          <div className="text-center italic opacity-30 group-hover:opacity-60 transition-opacity">
                             <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="mx-auto mb-1"><rect x="1.667" y="3.333" width="16.667" height="13.333" rx="2" stroke="currentColor" strokeWidth="1.5"/><circle cx="6.667" cy="7.5" r="1.667" stroke="currentColor" strokeWidth="1.3"/><path d="M1.667 13.333l4.166-3.333 3.334 2.5 3.333-4.167 5 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                             <span className="text-[8px] font-black uppercase text-text-placeholder">Upload (PNG/SVG)</span>
                          </div>
                        )}
                        {uploading && <div className="absolute inset-0 bg-white/90 flex items-center justify-center font-black text-[9px] uppercase text-primary animate-pulse">Processando...</div>}
                        {uploadSuccess && (
                          <div className="absolute inset-0 bg-status-success flex flex-col items-center justify-center text-white animate-in zoom-in duration-300">
                             <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="mb-1"><path d="M16.667 5L8.333 13.333 3.333 8.333" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                             <span className="text-[10px] font-black uppercase tracking-widest text-center">Sucesso!</span>
                          </div>
                        )}
                     </div>
                     <input ref={fileRef} type="file" className="hidden" onChange={handleLogoUpload} />
                 </div>
                  <div className="space-y-3">
                     <label className="text-[8px] font-black uppercase tracking-[0.2em] text-text-placeholder ml-2">Diretrizes de Upload</label>
                     <div className="flex flex-col justify-center p-6 bg-slate-50 border border-card-border rounded-2xl h-32 space-y-2">
                        <div className="flex items-center gap-2">
                           <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                           <p className="text-[9px] font-black text-text-main uppercase tracking-tighter italic">Proporção: <span className="text-primary font-bold">1:1 (Quadrada)</span> ou Horizontal</p>
                        </div>
                        <div className="flex items-center gap-2">
                           <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                           <p className="text-[9px] font-black text-text-main uppercase tracking-tighter italic">Formato: <span className="text-primary font-bold">PNG (Transparente)</span> ou SVG</p>
                        </div>
                        <div className="flex items-center gap-2">
                           <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                           <p className="text-[9px] font-black text-text-main uppercase tracking-tighter italic">Qualidade: Mínimo <span className="text-primary font-bold">512x512px</span></p>
                        </div>
                     </div>
                  </div>
              </div>
           </div>

        </div>

        {/* Informações de Cadastro */}
        <div className="lg:col-span-12 grid grid-cols-1 md:grid-cols-2 gap-10">
           
           <div className="premium-card p-6 bg-white space-y-6 shadow-sm">
              <h3 className="text-base font-black text-text-main italic uppercase tracking-tighter border-b border-slate-50 pb-4">2. Dados da Operação</h3>
              <div className="space-y-4">
                 <div className="space-y-1">
                    <label className="text-[8px] font-black uppercase tracking-[0.2em] text-text-placeholder ml-2">Razão / Fantasia</label>
                    <input value={razaoSocial} onChange={e => setRazaoSocial(e.target.value)} className="input-premium w-full py-3 text-sm" />
                 </div>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                       <label className="text-[8px] font-black uppercase tracking-[0.2em] text-text-placeholder ml-2">CNPJ / CPF</label>
                       <input value={cnpj} onChange={e => setCnpj(e.target.value)} className="input-premium w-full py-3" style={{ fontSize: '16px' }} />
                    </div>
                    <div className="space-y-1">
                       <label className="text-[8px] font-black uppercase tracking-[0.2em] text-text-placeholder ml-2">Telefone</label>
                       <input value={adminPhone} onChange={e => setAdminPhone(e.target.value)} className="input-premium w-full py-3" style={{ fontSize: '16px' }} />
                    </div>
                 </div>
                 <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase tracking-[0.2em] text-text-placeholder ml-2">Endereço da Unidade</label>
                    <input value={endereco} onChange={e => setEndereco(e.target.value)} className="input-premium w-full" />
                 </div>
                 
                 <div className="pt-4 border-t border-slate-50 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[9px] font-black uppercase tracking-[0.2em] text-text-placeholder ml-2">Abertura Unidade</label>
                        <input type="time" value={openingTime} onChange={e => setOpeningTime(e.target.value)} className="input-premium w-full py-2 text-xs" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] font-black uppercase tracking-[0.2em] text-text-placeholder ml-2">Fechamento Unidade</label>
                        <input type="time" value={closingTime} onChange={e => setClosingTime(e.target.value)} className="input-premium w-full py-2 text-xs" />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="text-[9px] font-black uppercase tracking-[0.2em] text-text-placeholder ml-2">Dias de Funcionamento</label>
                      <div className="flex flex-wrap gap-2">
                        {DAYS.map((d) => {
                          const active = workingDays.split(',').includes(String(d.id));
                          return (
                            <button
                              key={d.id}
                              onClick={() => toggleDay(d.id)}
                              className={`h-12 px-4 rounded-2xl text-[10px] font-black transition-all border ${
                                active 
                                  ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20' 
                                  : 'bg-slate-50 text-text-placeholder border-slate-100 opacity-60 hover:opacity-100'
                              }`}
                            >
                              {d.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                 </div>
              </div>
           </div>

           <div className="premium-card p-6 bg-white space-y-6 shadow-sm">
              <h3 className="text-base font-black text-text-main italic uppercase tracking-tighter border-b border-slate-50 pb-4">3. Segmento da Operação</h3>
              <div className="space-y-4">
                <p className="text-[11px] font-medium text-text-muted leading-relaxed">
                  O seu segmento foi definido durante a sua configuração inicial. A Synka adapta automaticamente os módulos, calendários e terminologias de uso com base nesta escolha para não desconfigurar o sistema.
                </p>
                <div className="p-5 bg-slate-50 border border-card-border rounded-2xl flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-white shadow flex items-center justify-center shrink-0">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.1em] text-text-placeholder">Categoria Atual em Operação</p>
                    <p className="text-base font-black text-text-main mt-0.5">{niche.replace('_', ' ')}</p>
                  </div>
                </div>
              </div>
           </div>
        </div>

        {/* IA e Segurança */}
        <div className="lg:col-span-12 grid grid-cols-1 md:grid-cols-2 gap-10">
           
           <div className="premium-card p-6 md:p-12 bg-white space-y-8 shadow-lg">
              <div className="flex items-center justify-between border-b border-slate-50 pb-6">
                 <h3 className="text-base md:text-xl font-black text-text-main italic uppercase tracking-tighter">4. Synka IA (Concierge WhatsApp)</h3>
                 <span className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border ${botActive ? 'bg-status-success-bg text-status-success border-status-success/20' : 'bg-status-error-bg text-status-error border-status-error/20'}`}>
                    {botActive ? 'ACTIVE' : 'IDLE'}
                 </span>
              </div>
              <p className="text-[11px] text-text-muted font-medium leading-relaxed italic opacity-80">
                 A Synka IA gerencia agendamentos, resolve dúvidas e qualifica leads 24h por dia via WhatsApp oficial.
              </p>
              <div className="flex gap-4">
                 <button onClick={() => setBotActive(true)} className={`flex-1 py-5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all ${botActive ? 'bg-primary text-white shadow-xl shadow-primary/20' : 'bg-slate-50 text-text-placeholder border border-card-border'}`}>Habilitar IA</button>
                 <button onClick={() => setBotActive(false)} className={`flex-1 py-5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all ${!botActive ? 'bg-status-error text-white shadow-xl shadow-status-error/20' : 'bg-slate-50 text-text-placeholder border border-card-border'}`}>Suspender</button>
              </div>
           </div>

           <div className="premium-card p-6 md:p-12 bg-white space-y-8 flex flex-col justify-between shadow-lg">
              <div>
                 <h3 className="text-base md:text-xl font-black text-text-main italic uppercase tracking-tighter border-b border-slate-50 pb-6">5. Compliance & Backup</h3>
                 <p className="text-[11px] text-text-muted font-medium mt-4 leading-relaxed opacity-70 italic">Gerencia o banco de dados e exporta prontuários e transações em formato estruturado auditável.</p>
              </div>
              <a href={`/api/export/backup`} download className="btn-secondary w-full py-5 flex items-center justify-center gap-3 text-[10px] shadow-sm hover:border-primary/40 transition-all font-black">
                <span>Exportar todos os dados (Synka Cloud Backup)</span>
              </a>
           </div>

        </div>

        {/* Resumo Diário / Semanal */}
        <div className="lg:col-span-12">
          <div className="premium-card p-6 md:p-10 bg-white space-y-6 shadow-lg">
            <div className="flex items-center justify-between border-b border-slate-50 pb-4">
              <div>
                <h3 className="text-base md:text-lg font-black text-text-main italic uppercase tracking-tighter">6. Resumo via WhatsApp</h3>
                <p className="text-[10px] text-text-muted mt-0.5">Receba um resumo automático de agenda, financeiro e estoque</p>
              </div>
              <button
                onClick={() => setResumoCfg((p: any) => ({ ...p, ativo: !p.ativo }))}
                className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${resumoCfg.ativo ? 'bg-status-success-bg text-status-success border-status-success/20' : 'bg-slate-100 text-text-placeholder border-card-border'}`}
              >
                {resumoCfg.ativo ? 'ATIVO' : 'PAUSADO'}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {/* Frequência */}
              <div className="space-y-2">
                <label className="text-[8px] font-black uppercase tracking-[0.2em] text-text-placeholder ml-1">Frequência</label>
                <select
                  value={resumoCfg.frequencia}
                  onChange={e => setResumoCfg((p: any) => ({ ...p, frequencia: e.target.value }))}
                  className="input-premium w-full py-2.5 text-sm"
                >
                  <option value="diario">Diário</option>
                  <option value="semanal">Semanal</option>
                </select>
              </div>

              {resumoCfg.frequencia === 'diario' ? (
                <div className="space-y-2">
                  <label className="text-[8px] font-black uppercase tracking-[0.2em] text-text-placeholder ml-1">Horário (diário)</label>
                  <input
                    type="time"
                    value={resumoCfg.horaDiario}
                    onChange={e => setResumoCfg((p: any) => ({ ...p, horaDiario: e.target.value }))}
                    className="input-premium w-full py-2.5 text-sm"
                  />
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <label className="text-[8px] font-black uppercase tracking-[0.2em] text-text-placeholder ml-1">Dia da semana</label>
                    <select
                      value={resumoCfg.diaSemana}
                      onChange={e => setResumoCfg((p: any) => ({ ...p, diaSemana: e.target.value }))}
                      className="input-premium w-full py-2.5 text-sm"
                    >
                      {['segunda','terca','quarta','quinta','sexta','sabado','domingo'].map(d => (
                        <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[8px] font-black uppercase tracking-[0.2em] text-text-placeholder ml-1">Horário (semanal)</label>
                    <input
                      type="time"
                      value={resumoCfg.horaSemanal}
                      onChange={e => setResumoCfg((p: any) => ({ ...p, horaSemanal: e.target.value }))}
                      className="input-premium w-full py-2.5 text-sm"
                    />
                  </div>
                </>
              )}

              {/* Estoque mínimo */}
              <div className="space-y-2">
                <label className="text-[8px] font-black uppercase tracking-[0.2em] text-text-placeholder ml-1">Alerta estoque ≤</label>
                <input
                  type="number"
                  min={0}
                  value={resumoCfg.estoqueMinimo}
                  onChange={e => setResumoCfg((p: any) => ({ ...p, estoqueMinimo: Number(e.target.value) }))}
                  className="input-premium w-full py-2.5 text-sm"
                />
              </div>
            </div>

            {/* Destinatários */}
            <div className="space-y-2">
              <p className="text-[8px] font-black uppercase tracking-[0.2em] text-text-placeholder">Quem recebe</p>
              <div className="flex flex-wrap gap-3">
                {[
                  { key: 'recebeAdmin', label: 'Admin' },
                  { key: 'recebeRecepcao', label: 'Recepção' },
                  { key: 'recebeProfissional', label: 'Profissional' },
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setResumoCfg((p: any) => ({ ...p, [key]: !p[key] }))}
                    className={`px-4 py-2 rounded-xl text-[10px] font-bold border transition-all ${resumoCfg[key] ? 'bg-primary text-white border-primary' : 'bg-slate-50 text-text-placeholder border-card-border'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Seções */}
            <div className="space-y-2">
              <p className="text-[8px] font-black uppercase tracking-[0.2em] text-text-placeholder">Seções incluídas</p>
              <div className="flex flex-wrap gap-3">
                {[
                  { key: 'secaoAgenda', label: 'Agenda' },
                  { key: 'secaoOcupacao', label: 'Ocupação' },
                  { key: 'secaoFinanceiro', label: 'Financeiro' },
                  { key: 'secaoEstoque', label: 'Estoque' },
                  { key: 'secaoFilaEspera', label: 'Fila de Espera' },
                  { key: 'secaoInsightsIA', label: 'Insights IA' },
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setResumoCfg((p: any) => ({ ...p, [key]: !p[key] }))}
                    className={`px-4 py-2 rounded-xl text-[10px] font-bold border transition-all ${resumoCfg[key] ? 'bg-primary/10 text-primary border-primary/30' : 'bg-slate-50 text-text-placeholder border-card-border'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleTestarResumo}
                disabled={resumoTestando}
                className="btn-secondary px-6 py-3 text-[10px] font-black uppercase tracking-widest"
              >
                {resumoTestando ? 'Enviando...' : 'Testar agora'}
              </button>
              <button
                onClick={handleSaveResumo}
                className="btn-primary px-6 py-3 text-[10px] font-black uppercase tracking-widest"
              >
                {resumoSalvo ? 'Salvo!' : 'Salvar configuração'}
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
