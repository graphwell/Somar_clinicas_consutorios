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
        
        {/* Identidade da Clínica */}
        <div className="bg-[#0a0a20]/40 backdrop-blur-md border border-white/5 rounded-2xl p-8 space-y-6">
          <h3 className="text-lg font-medium border-b border-white/5 pb-4">Identidade da Clínica</h3>
          
          <div className="space-y-2">
            <label className="text-sm text-gray-400">Logomarca</label>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl bg-white/5 border border-dashed border-white/20 flex flex-col items-center justify-center cursor-pointer hover:bg-white/10 transition-colors">
                <span className="text-xs text-gray-500">Upload</span>
              </div>
              <p className="text-xs text-gray-500 max-w-[150px]">Recomendado: fundo transparente, proporção 1:1.</p>
            </div>
          </div>

          <div className="space-y-2">
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
            <p className="text-xs text-gray-500 pt-1">Esta cor modificará a interface do painel e dos botões.</p>
          </div>
        </div>

        {/* Cérebro da Inteligência Artificial */}
        <div className="bg-[#0a0a20]/40 backdrop-blur-md border border-white/5 rounded-2xl p-8 space-y-6">
          <h3 className="text-lg font-medium border-b border-white/5 pb-4">Inteligência Artificial (WhatsApp)</h3>
          
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
            <p className="text-xs text-[#4a4ae2] pt-2">
              Isso ajustará o comportamento, o tom de voz e as sugestões da nossa IA no WhatsApp.
            </p>
          </div>

          <div className="space-y-2 mt-6">
            <label className="text-sm text-gray-400 flex items-center justify-between">
              Instruções Personalizadas (Opcional)
              <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded text-gray-300">Novo</span>
            </label>
            <textarea 
              rows={4}
              placeholder="Ex: Ofereça sempre café quando perguntarem o endereço..."
              className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm focus:outline-none focus:border-[#4a4ae2] transition-colors resize-none"
            />
          </div>
        </div>

      </div>
    </div>
  );
}
