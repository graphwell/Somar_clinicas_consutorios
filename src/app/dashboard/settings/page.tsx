"use client";
import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { fetchWithAuth } from '@/lib/api-utils';

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

  const [razaoSocial, setRazaoSocial] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [endereco, setEndereco] = useState('');
  const [adminPhone, setAdminPhone] = useState('');
  const [openingTime, setOpeningTime] = useState('08:00');
  const [closingTime, setClosingTime] = useState('18:00');
  const [workingDays, setWorkingDays] = useState('1,2,3,4,5');

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
          setBotActive(data.clinica.botActive ?? true);
          setOpeningTime(data.clinica.openingTime || '08:00');
          setClosingTime(data.clinica.closingTime || '18:00');
          setWorkingDays(data.clinica.workingDays || '1,2,3,4,5');
          if (data.clinica.primaryColor) setPrimaryColor(data.clinica.primaryColor);
          if (data.clinica.logoUrl) setLogoUrl(data.clinica.logoUrl);
        }
      });
  }, []);

  const [uploadSuccess, setUploadSuccess] = useState(false);
 
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
    <div className="max-w-7xl mx-auto space-y-12 pb-40 animate-premium">
      
      {/* Header Premium V2.2 */}
      <div className="bg-white border border-card-border p-10 rounded-[3rem] shadow-sm flex flex-col md:flex-row justify-between items-center gap-8">
        <div className="flex items-center gap-6">
           <div className="w-14 h-14 rounded-3xl bg-primary text-white flex items-center justify-center text-3xl shadow-xl shadow-primary/20 italic font-black">C</div>
           <div>
              <h2 className="text-2xl font-black italic uppercase tracking-tighter text-text-main">Ajustes de <span className="text-primary">Sistema</span></h2>
              <p className="text-[10px] font-black text-text-placeholder uppercase tracking-[0.25em] mt-1 opacity-60">Configuração Estrutural • V2.2 Official</p>
           </div>
        </div>
        <button onClick={handleSave} className="btn-primary flex items-center justify-center gap-3">
           {saved ? '✨ Sincronizado' : 'Salvar Alterações'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        
        {/* Identidade Corporativa */}
        <div className="lg:col-span-12 space-y-10">
           
           <div className="premium-card p-12 bg-white space-y-10">
              <div className="border-b border-slate-50 pb-6">
                <h3 className="text-xl font-black text-text-main italic uppercase tracking-tighter">1. Identidade de Marca</h3>
                <p className="text-[10px] font-black text-text-placeholder uppercase tracking-widest mt-1 opacity-60">Logotipo e Presença Visual</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                 <div className="space-y-4">
                    <label className="text-[9px] font-black uppercase tracking-[0.2em] text-text-placeholder ml-2">Logo da Unidade</label>
                     <div onClick={() => fileRef.current?.click()} className="w-full aspect-video rounded-[2.5rem] bg-slate-50 border-2 border-dashed border-card-border flex flex-col items-center justify-center cursor-pointer hover:border-primary/30 transition-all overflow-hidden relative group">
                        {logoUrl ? (
                          <>
                            <img src={logoUrl} className="h-24 object-contain animate-premium" />
                            <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                               <span className="text-[10px] font-black text-white uppercase tracking-widest">Atualizar Marca</span>
                            </div>
                          </>
                        ) : (
                          <div className="text-center italic opacity-30 group-hover:opacity-60 transition-opacity">
                             <span className="text-4xl mb-2 block">🖼️</span>
                             <span className="text-[10px] font-black uppercase text-text-placeholder">Upload (PNG/SVG)</span>
                          </div>
                        )}
                        {uploading && <div className="absolute inset-0 bg-white/90 flex items-center justify-center font-black text-[10px] uppercase text-primary animate-pulse">Processando...</div>}
                        {uploadSuccess && (
                          <div className="absolute inset-0 bg-status-success flex flex-col items-center justify-center text-white animate-in zoom-in duration-300">
                             <span className="text-4xl mb-2">✅</span>
                             <span className="text-[12px] font-black uppercase tracking-widest">Upload concluído com sucesso!</span>
                             <span className="text-[8px] mt-2 opacity-80">Sincronizando Sidebar...</span>
                          </div>
                        )}
                     </div>
                     <input ref={fileRef} type="file" className="hidden" onChange={handleLogoUpload} />
                 </div>
                 <div className="space-y-4">
                    <label className="text-[9px] font-black uppercase tracking-[0.2em] text-text-placeholder ml-2">Cor Institucional (Foco)</label>
                    <div className="flex items-center gap-8 p-10 bg-slate-50 border border-card-border rounded-[2.5rem] h-full">
                       <input type="color" value={primaryColor} disabled className="w-20 h-20 rounded-2xl border-0 bg-transparent cursor-not-allowed opacity-50 shadow-inner" />
                       <div>
                          <p className="text-2xl font-black text-text-main uppercase tracking-tighter font-mono italic">{primaryColor}</p>
                          <p className="text-[9px] font-black text-primary uppercase tracking-widest mt-2">{theme === 'light-soft' ? 'Premium Light Active' : 'Custom Palette'}</p>
                       </div>
                    </div>
                 </div>
              </div>
           </div>

           {/* Ambientes Disponíveis */}
           <div className="premium-card p-12 bg-white space-y-10 shadow-lg">
              <div className="border-b border-slate-50 pb-6">
                <h3 className="text-xl font-black text-text-main italic uppercase tracking-tighter">2. Universo de Trabalho</h3>
                <p className="text-[10px] font-black text-text-placeholder uppercase tracking-widest mt-1 opacity-60">Escolha a experiência visual do Synka</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-10">
                {[
                  { id: 'light-soft', label: 'Premium Light', colors: ['bg-[#F8FAFC]', 'bg-[#3B82F6]'], emoji: '✨', desc: 'Foco e Clareza Profissional' },
                  { id: 'dark-stellar', label: 'Dark Stellar', colors: ['bg-[#0F172A]', 'bg-[#6366F1]'], emoji: '🌑', desc: 'Alto Contraste Tecnológico' },
                  { id: 'modern-blue', label: 'Classic Blue', colors: ['bg-[#EFF6FF]', 'bg-[#2563EB]'], emoji: '🔹', desc: 'Equilíbrio e Tradição' }
                ].map((p) => (
                  <button key={p.id} onClick={() => setAppTheme(p.id as any)} className={`p-8 rounded-[3rem] border-2 transition-all text-center group relative overflow-hidden ${theme === p.id ? 'border-primary bg-primary-soft shadow-xl' : 'border-slate-50 hover:border-card-border opacity-60 hover:opacity-100'}`}>
                    <div className={`w-full h-32 rounded-[2rem] ${p.colors[0]} border border-card-border flex items-center justify-center mb-6 shadow-inner relative`}>
                       <span className="text-4xl group-hover:scale-125 transition-transform duration-500">{p.emoji}</span>
                       <div className={`absolute bottom-4 right-4 w-8 h-8 rounded-xl ${p.colors[1]} border-2 border-white shadow-lg shadow-black/5`} />
                    </div>
                    <p className={`text-[11px] font-black uppercase tracking-widest ${theme === p.id ? 'text-primary' : 'text-text-placeholder'}`}>{p.label}</p>
                    <p className="text-[8px] font-bold text-text-muted uppercase mt-2 opacity-50">{p.desc}</p>
                  </button>
                ))}
              </div>
           </div>
        </div>

        {/* Informações de Cadastro */}
        <div className="lg:col-span-12 grid grid-cols-1 md:grid-cols-2 gap-10">
           
           <div className="premium-card p-12 bg-white space-y-10 shadow-md">
              <h3 className="text-xl font-black text-text-main italic uppercase tracking-tighter border-b border-slate-50 pb-6">3. Dados da Operação</h3>
              <div className="space-y-6">
                 <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase tracking-[0.2em] text-text-placeholder ml-2">Razão Social / Fantasia</label>
                    <input value={razaoSocial} onChange={e => setRazaoSocial(e.target.value)} className="input-premium w-full py-5 text-base" />
                 </div>
                 <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                       <label className="text-[9px] font-black uppercase tracking-[0.2em] text-text-placeholder ml-2">CNPJ / CPF</label>
                       <input value={cnpj} onChange={e => setCnpj(e.target.value)} className="input-premium w-full" placeholder="00.000.000/0001-00" />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[9px] font-black uppercase tracking-[0.2em] text-text-placeholder ml-2">Telefone Admin</label>
                       <input value={adminPhone} onChange={e => setAdminPhone(e.target.value)} className="input-premium w-full" placeholder="55 85 9..." />
                    </div>
                 </div>
                 <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase tracking-[0.2em] text-text-placeholder ml-2">Endereço da Unidade</label>
                    <input value={endereco} onChange={e => setEndereco(e.target.value)} className="input-premium w-full" />
                 </div>
                 
                 <div className="pt-6 border-t border-slate-50 space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[9px] font-black uppercase tracking-[0.2em] text-text-placeholder ml-2">Abertura Unidade</label>
                        <input type="time" value={openingTime} onChange={e => setOpeningTime(e.target.value)} className="input-premium w-full" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] font-black uppercase tracking-[0.2em] text-text-placeholder ml-2">Fechamento Unidade</label>
                        <input type="time" value={closingTime} onChange={e => setClosingTime(e.target.value)} className="input-premium w-full" />
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

           <div className="premium-card p-12 bg-white space-y-10 shadow-md">
              <h3 className="text-xl font-black text-text-main italic uppercase tracking-tighter border-b border-slate-50 pb-6">4. Segmento Inteligente</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                 {[
                   { id: "Clínica Médica", icon: "🩺" },
                   { id: "Clínica de Estética", icon: "✨" },
                   { id: "Fisioterapia", icon: "🧘" },
                   { id: "Pilates", icon: "🤸" },
                   { id: "Nutricionista", icon: "🍏" },
                   { id: "Psicólogo", icon: "🧠" },
                   { id: "Beleza / Barbearia", icon: "✂️" },
                   { id: "Outros", icon: "🏢" }
                 ].map((n) => (
                   <button key={n.id} onClick={() => setNiche(n.id)} className={`flex flex-col items-center justify-center p-4 rounded-[1.5rem] border transition-all text-center h-28 group ${niche === n.id ? 'border-primary bg-primary-soft shadow-sm ring-4 ring-primary/5' : 'border-slate-50 hover:border-card-border opacity-40 hover:opacity-100'}`}>
                     <span className="text-xl mb-1 grayscale group-hover:grayscale-0 transition-all group-hover:scale-110">{n.icon}</span>
                     <span className="text-[8px] font-black uppercase text-text-main tracking-tighter leading-tight italic">{n.id}</span>
                   </button>
                 ))}
              </div>
              <div className="p-6 bg-primary-soft/50 border border-primary/20 rounded-[2rem] flex items-center gap-4">
                 <span className="text-xl shrink-0">🤖</span>
                 <p className="text-[9px] text-primary font-black uppercase leading-relaxed tracking-wider">
                    O sistema adapta automaticamente labels e fluxos para {niche.toUpperCase()}.
                 </p>
              </div>
           </div>
        </div>

        {/* IA e Segurança */}
        <div className="lg:col-span-12 grid grid-cols-1 md:grid-cols-2 gap-10">
           
           <div className="premium-card p-12 bg-white space-y-8 shadow-lg">
              <div className="flex items-center justify-between border-b border-slate-50 pb-6">
                 <h3 className="text-xl font-black text-text-main italic uppercase tracking-tighter">5. Maya IA (Concierge WhatsApp)</h3>
                 <span className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border ${botActive ? 'bg-status-success-bg text-status-success border-status-success/20' : 'bg-status-error-bg text-status-error border-status-error/20'}`}>
                    {botActive ? 'ACTIVE' : 'IDLE'}
                 </span>
              </div>
              <p className="text-[11px] text-text-muted font-medium leading-relaxed italic opacity-80">
                 A Maya IA gerencia agendamentos, resolve dúvidas e qualifica leads 24h por dia via WhatsApp oficial.
              </p>
              <div className="flex gap-4">
                 <button onClick={() => setBotActive(true)} className={`flex-1 py-5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all ${botActive ? 'bg-primary text-white shadow-xl shadow-primary/20' : 'bg-slate-50 text-text-placeholder border border-card-border'}`}>Habilitar IA</button>
                 <button onClick={() => setBotActive(false)} className={`flex-1 py-5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all ${!botActive ? 'bg-status-error text-white shadow-xl shadow-status-error/20' : 'bg-slate-50 text-text-placeholder border border-card-border'}`}>Suspender</button>
              </div>
           </div>

           <div className="premium-card p-12 bg-white space-y-8 flex flex-col justify-between shadow-lg">
              <div>
                 <h3 className="text-xl font-black text-text-main italic uppercase tracking-tighter border-b border-slate-50 pb-6">6. Compliance & Backup</h3>
                 <p className="text-[11px] text-text-muted font-medium mt-4 leading-relaxed opacity-70 italic">Gerencia o banco de dados e exporta prontuários e transações em formato estruturado auditável.</p>
              </div>
              <a href={`/api/export/backup`} download className="btn-secondary w-full py-5 flex items-center justify-center gap-3 text-[10px] shadow-sm hover:border-primary/40 transition-all font-black">
                <span>📦 Exportar todos os dados (Synka Cloud Backup)</span>
              </a>
           </div>

        </div>

      </div>
    </div>
  );
}
