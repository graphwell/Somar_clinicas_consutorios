"use client";
import React, { useState, useRef, useEffect } from 'react';

const NICHES = ["Clínica Médica", "Clínica de Estética", "Fisioterapia", "Pilates", "Salão de Beleza / Barbearia", "Outros"];
const TENANT_ID = 'clinica_id_default'; // Em produção, vem do JWT do usuário logado

export default function SettingsPage() {
  const [niche, setNiche] = useState("Clínica Médica");
  const [primaryColor, setPrimaryColor] = useState("#4a4ae2");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [saved, setSaved] = useState(false);
  const [botActive, setBotActive] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);

  // Company fields
  const [razaoSocial, setRazaoSocial] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [endereco, setEndereco] = useState('');
  const [adminPhone, setAdminPhone] = useState('');

  // Load existing data
  useEffect(() => {
    const cached = localStorage.getItem(`synka-logo-${TENANT_ID}`);
    if (cached) setLogoUrl(cached);

    fetch(`/api/settings?tenantId=${TENANT_ID}`)
      .then(res => res.json())
      .then(data => {
        if (data.clinica) {
          setRazaoSocial(data.clinica.razaoSocial || '');
          setCnpj(data.clinica.cnpj || '');
          setEndereco(data.clinica.endereco || '');
          setAdminPhone(data.clinica.adminPhone || '');
          setNiche(data.clinica.nicho || 'Clínica Médica');
          setBotActive(data.clinica.botActive ?? true);
          if (data.clinica.primaryColor) setPrimaryColor(data.clinica.primaryColor);
        }
      })
      .catch(console.error);
  }, []);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError('');
    const formData = new FormData();
    formData.append('logo', file);
    formData.append('tenantId', TENANT_ID);
    try {
      const res = await fetch('/api/upload/logo', { method: 'POST', body: formData });
      const data = await res.json();
      if (res.ok) {
        setLogoUrl(data.logoUrl);
        localStorage.setItem(`synka-logo-${TENANT_ID}`, data.logoUrl);
        window.dispatchEvent(new CustomEvent('synka-logo-updated', { detail: data.logoUrl }));
      } else {
        setUploadError(data.error || 'Erro ao fazer upload');
      }
    } catch {
      setUploadError('Erro de conexão ao fazer upload.');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: TENANT_ID,
          razaoSocial,
          cnpj,
          endereco,
          adminPhone,
          nicho: niche,
          botActive
        })
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => {
          setSaved(false);
          window.location.reload(); // Recarrega dicionários e layouts globais do novo Nicho
        }, 1500);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h2 className="text-2xl font-bold">Configurações da Clínica</h2>
        <button
          onClick={handleSave}
          className="px-5 py-2.5 bg-[#4a4ae2] hover:bg-[#3a3ab2] rounded-xl text-sm font-semibold transition-all shadow-[0_4px_20px_rgba(74,74,226,0.3)]"
        >
          {saved ? '✅ Salvo!' : 'Salvar Alterações'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

        {/* Dados da Empresa */}
        <div className="col-span-1 md:col-span-2 bg-[#0a0a20]/40 backdrop-blur-md border border-white/5 rounded-2xl p-8 space-y-5">
          <h3 className="text-lg font-semibold border-b border-white/5 pb-4">Dados da Empresa</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1">
              <label className="text-sm text-gray-400">Nome / Razão Social</label>
              <input type="text" value={razaoSocial} onChange={e => setRazaoSocial(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#4a4ae2] transition-colors" placeholder="Clínica Exemplo Ltda" />
            </div>
            <div className="space-y-1">
              <label className="text-sm text-gray-400">CPF / CNPJ</label>
              <input type="text" value={cnpj} onChange={e => setCnpj(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#4a4ae2] transition-colors" placeholder="00.000.000/0001-00" />
            </div>
            <div className="space-y-1 md:col-span-2">
              <label className="text-sm text-gray-400">Endereço Completo</label>
              <input type="text" value={endereco} onChange={e => setEndereco(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#4a4ae2] transition-colors" placeholder="Rua Exemplo, 123 — Fortaleza, CE" />
            </div>
            <div className="space-y-1">
              <label className="text-sm text-gray-400">WhatsApp do Administrador</label>
              <input type="text" value={adminPhone} onChange={e => setAdminPhone(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#4a4ae2] transition-colors" placeholder="55 85 99999-9999" />
            </div>
          </div>
        </div>

        {/* Identidade Visual */}
        <div className="bg-[#0a0a20]/40 backdrop-blur-md border border-white/5 rounded-2xl p-8 space-y-6">
          <h3 className="text-lg font-semibold border-b border-white/5 pb-4">Identidade Visual</h3>

          {/* Logo Upload */}
          <div className="space-y-3">
            <label className="text-sm text-gray-400">Logo da Clínica</label>
            <div
              onClick={() => fileRef.current?.click()}
              className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-white/10 rounded-xl p-6 cursor-pointer hover:border-[#4a4ae2]/60 hover:bg-white/2 transition-all"
            >
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="h-20 object-contain" />
              ) : (
                <>
                  <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-2xl">🖼️</div>
                  <p className="text-sm text-gray-400">Clique para fazer upload</p>
                  <p className="text-xs text-gray-500">PNG, JPG, SVG ou WebP — máx. 2MB</p>
                </>
              )}
              {uploading && <p className="text-xs text-[#8080ff] animate-pulse">Fazendo upload...</p>}
              {uploadError && <p className="text-xs text-red-400">{uploadError}</p>}
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
            {logoUrl && (
              <p className="text-xs text-green-400">✅ Logo carregada. Ela aparecerá no topo do seu painel.</p>
            )}
          </div>

          {/* Cor principal */}
          <div className="space-y-3">
            <label className="text-sm text-gray-400">Cor Principal</label>
            <div className="flex items-center gap-4">
              <input type="color" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} className="w-10 h-10 rounded border-0 bg-transparent cursor-pointer" />
              <span className="font-mono text-sm uppercase text-gray-300">{primaryColor}</span>
            </div>
          </div>
        </div>

        {/* IA e WhatsApp */}
        <div className="bg-[#0a0a20]/40 backdrop-blur-md border border-white/5 rounded-2xl p-8 space-y-6">
          <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <h3 className="text-lg font-semibold">Atendimento IA</h3>
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${botActive ? 'bg-green-500 shadow-[0_0_8px_#22c55e]' : 'bg-red-500'}`}></span>
              <span className={`text-xs font-bold uppercase tracking-widest ${botActive ? 'text-green-400' : 'text-red-400'}`}>{botActive ? 'Ativo' : 'Pausado'}</span>
            </div>
          </div>

          <div id="nicho" className="space-y-4 scroll-mt-20">
            <label className="text-sm font-bold text-gray-500 uppercase tracking-widest pl-1">Nicho de Atuação (Dicionário Inteligente)</label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { id: "Clínica Médica", icon: "🩺", desc: "Médicos, Dentistas, Saúde" },
                { id: "Clínica de Estética", icon: "✨", desc: "Beleza, Bem-estar" },
                { id: "Fisioterapia", icon: "🧘", desc: "Reabilitação, Saúde" },
                { id: "Pilates", icon: "🤸", desc: "Estúdios, Movimento" },
                { id: "Salão de Beleza / Barbearia", icon: "✂️", desc: "Cabelo, Barba, Unhas" },
                { id: "Outros", icon: "🏢", desc: "Outros Serviços" }
              ].map((n) => (
                <button
                  key={n.id}
                  onClick={() => setNiche(n.id)}
                  className={`flex flex-col items-start p-4 rounded-2xl border transition-all text-left group ${
                    niche === n.id 
                      ? 'border-[#4a4ae2] bg-[#4a4ae2]/10 ring-2 ring-[#4a4ae2]/20 shadow-lg shadow-[#4a4ae2]/5' 
                      : 'border-white/5 bg-white/2 hover:border-white/20 hover:bg-white/5'
                  }`}
                >
                  <span className={`text-2xl mb-2 transition-transform ${niche === n.id ? 'scale-110' : 'group-hover:scale-110'}`}>{n.icon}</span>
                  <span className={`text-xs font-bold leading-tight ${niche === n.id ? 'text-white' : 'text-gray-300'}`}>{n.id}</span>
                  <span className="text-[10px] text-gray-500 mt-1">{n.desc}</span>
                </button>
              ))}
            </div>
            <p className="text-[10px] text-[#a0a0ff] italic mt-2 animate-pulse">
              * Ao mudar o nicho e salvar, todos os botões e nomes do sistema (ex: Pacientes/Clientes) serão atualizados automaticamente.
            </p>
          </div>

          <div className="flex flex-col gap-3 pt-2">
            <button
              onClick={() => setBotActive(false)}
              className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all ${!botActive ? 'bg-red-500/30 border border-red-500 text-red-400' : 'bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400'}`}
            >
              ⏹ PAUSAR Atendimento Automático
            </button>
            <button
              onClick={() => setBotActive(true)}
              className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all ${botActive ? 'bg-green-500/30 border border-green-500 text-green-400' : 'bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 text-green-400'}`}
            >
              ▶ REATIVAR Atendimento Automático
            </button>
          </div>
        </div>

        {/* Backup */}
        <div className="col-span-1 md:col-span-2 bg-[#0a0a20]/40 backdrop-blur-md border border-white/5 rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-semibold">Backup dos Dados</h3>
            <p className="text-sm text-gray-400 mt-1">Exporta todos os pacientes e agendamentos da sua clínica em formato CSV.</p>
          </div>
          <a
            href={`/api/backup/export?tenantId=${TENANT_ID}`}
            download
            className="px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-medium transition-all whitespace-nowrap"
          >
            ⬇ Baixar Backup CSV
          </a>
        </div>

      </div>
    </div>
  );
}
