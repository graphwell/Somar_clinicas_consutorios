"use client";
import React, { useState } from 'react';

const NICHES = [
  "Clínica Médica",
  "Clínica de Estética",
  "Fisioterapia",
  "Pilates",
  "Salão de Beleza / Barbearia",
  "Outros"
];

export default function SettingsPage() {
  const [niche, setNiche] = useState("Clínica Médica");
  const [primaryColor, setPrimaryColor] = useState("#4a4ae2");

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-medium tracking-tight">Configurações Whitelabel</h2>
        <button className="px-5 py-2.5 bg-[#4a4ae2] hover:bg-[#3a3ab2] rounded-xl text-sm font-medium transition-all shadow-[0_4px_20px_rgba(74,74,226,0.3)]">
          Salvar Alterações
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Seção 1: Dados da Empresa */}
        <div className="col-span-1 md:col-span-2 bg-[#0a0a20]/40 backdrop-blur-md border border-white/5 rounded-2xl p-8 space-y-6">
          <h3 className="text-lg font-medium border-b border-white/5 pb-4">Dados da Empresa</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
               <label className="text-sm text-gray-400">Nome / Razão Social</label>
               <input type="text" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#4a4ae2] transition-colors" placeholder="Razão Social Ltda" />
            </div>
            <div className="space-y-2">
               <label className="text-sm text-gray-400">CPF / CNPJ</label>
               <input type="text" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#4a4ae2] transition-colors" placeholder="00.000.000/0000-00" />
            </div>
            <div className="space-y-2 md:col-span-2">
               <label className="text-sm text-gray-400">Endereço Completo</label>
               <input type="text" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#4a4ae2] transition-colors" placeholder="Rua Exemplo, 123 - Cidade, Estado" />
            </div>
            <div className="space-y-2">
               <label className="text-sm text-gray-400">WhatsApp do Administrador</label>
               <input type="text" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#4a4ae2] transition-colors" placeholder="55 11 99999-9999" />
            </div>
          </div>
        </div>

        {/* Seção 2: Conexão WhatsApp e Bot Controls */}
        <div className="bg-[#0a0a20]/40 backdrop-blur-md border border-white/5 rounded-2xl p-8 space-y-6">
          <div className="flex justify-between items-center border-b border-white/5 pb-4">
            <h3 className="text-lg font-medium">Motor de Atendimento (WhatsApp)</h3>
            <div className="flex items-center gap-2">
               <span className="w-3 h-3 rounded-full bg-green-500 shadow-[0_0_10px_#22c55e]"></span>
               <span className="text-xs font-semibold text-green-500 uppercase tracking-widest">Online</span>
            </div>
          </div>
          
          <div className="flex flex-col items-center justify-center p-6 border border-dashed border-white/10 rounded-xl bg-white/5">
             {/* Mock do QR Code */}
             <div className="w-40 h-40 bg-white rounded-lg flex items-center justify-center p-2 mb-4">
                <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=ConecteSeuZap`} alt="QR Code" className="opacity-80" />
             </div>
             <p className="text-sm text-gray-400 text-center mb-6">Leia o QR Code para conectar a instância UltraMsg/Z-API ao seu número oficial.</p>
             
             <div className="flex flex-col w-full gap-3">
                <button className="w-full flex items-center justify-center gap-2 py-3 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 text-red-500 rounded-lg font-medium transition-all">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect></svg>
                  PARAR Inteligência Artificial
                </button>
                <button className="w-full flex items-center justify-center gap-2 py-3 bg-green-500/20 hover:bg-green-500/30 border border-green-500/50 text-green-500 rounded-lg font-medium transition-all">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                  INICIAR Atendimento Automático
                </button>
             </div>
          </div>
        </div>

        {/* Seção 3 e 4: Identidade da Clínica e Cérebro da IA */}
        <div className="space-y-8">
          <div className="bg-[#0a0a20]/40 backdrop-blur-md border border-white/5 rounded-2xl p-8 space-y-6">
            <h3 className="text-lg font-medium border-b border-white/5 pb-4">Identidade Visual</h3>
            
            <div className="space-y-3">
              <label className="text-sm text-gray-400">Logomarca da Clínica</label>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl bg-white/5 border border-dashed border-white/20 flex flex-col items-center justify-center cursor-pointer hover:bg-white/10 transition-colors">
                  <span className="text-xs text-gray-500">Upload</span>
                </div>
                <p className="text-xs text-gray-500 max-w-[200px]">Essa logo aparecerá no topo esquerdo do painel.</p>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-sm text-gray-400">Cor Principal (Branding)</label>
              <div className="flex items-center gap-4">
                <input 
                  type="color" 
                  value={primaryColor} 
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-10 h-10 rounded border-0 bg-transparent cursor-pointer" 
                />
                <span className="font-mono text-sm uppercase text-gray-300">{primaryColor}</span>
              </div>
            </div>
          </div>

          <div className="bg-[#0a0a20]/40 backdrop-blur-md border border-white/5 rounded-2xl p-8 space-y-6">
            <h3 className="text-lg font-medium border-b border-white/5 pb-4">Cérebro da IA</h3>
            
            <div className="space-y-2">
              <label className="text-sm text-gray-400">Nicho de Atuação</label>
              <select 
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#4a4ae2] transition-colors appearance-none"
              >
                {NICHES.map(n => (
                  <option key={n} value={n} className="bg-[#0a0a20] text-white">{n}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2 mt-4">
              <label className="text-sm text-gray-400">Instruções Extras</label>
              <textarea rows={3} className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm focus:outline-none focus:border-[#4a4ae2] transition-colors resize-none" />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
