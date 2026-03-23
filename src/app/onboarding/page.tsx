"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { SynkaLogo } from '@/components/SynkaLogo';

const NICHOS = [
  'Salão de Beleza',
  'Barbearia',
  'Clínica de Estética',
  'Clínica Médica — Monoespecialidade',
  'Clínica Médica — Multiespecialidades',
  'Clínica de Fisioterapia',
  'Odontologia',
  'Outro',
];

export default function OnboardingPage() {
  const router = useRouter();
  const [nicho, setNicho] = useState('');
  const [outroNicho, setOutroNicho] = useState('');
  const [multiProfissional, setMultiProfissional] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // We are currently using a hardcoded tenantId in the MVP.
  // In a real session-based auth, we'd get this from session.
  const TENANT_ID = 'clinica_id_default';

  const showMultiProfissionalCheck = nicho && nicho !== 'Outro' && !nicho.includes('Monoespecialidade');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const finalNicho = nicho === 'Outro' ? outroNicho : nicho;
    if (!finalNicho) {
      setError('Por favor, selecione ou digite seu nicho de atuação.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: TENANT_ID,
          nicho: finalNicho,
          multiProfissional
        }),
      });

      if (!res.ok) {
        throw new Error('Falha ao salvar as configurações.');
      }

      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050510] text-gray-100 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md bg-[#0a0a20] border border-white/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
        {/* Decorative background glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-[#4a4ae2]/20 blur-[100px] rounded-full pointer-events-none" />
        
        <div className="flex justify-center mb-8 relative z-10">
          <SynkaLogo iconSize={48} nameSize="text-3xl" />
        </div>

        <h1 className="text-2xl font-bold text-center mb-2">Bem-vindo(a) ao Synka!</h1>
        <p className="text-gray-400 text-sm text-center mb-8">
          Antes de começarmos, conte um pouco sobre o seu negócio para personalizarmos sua experiência.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Qual é o seu nicho de atuação?</label>
            <select
              required
              value={nicho}
              onChange={(e) => setNicho(e.target.value)}
              className="w-full bg-[#050510]/50 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#4a4ae2] transition-colors appearance-none"
            >
              <option value="" disabled>Selecione um segmento...</option>
              {NICHOS.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>

          {nicho === 'Outro' && (
            <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Por favor, especifique:</label>
              <input
                required
                type="text"
                value={outroNicho}
                onChange={(e) => setOutroNicho(e.target.value)}
                placeholder="Ex: Clínica Veterinária"
                className="w-full bg-[#050510]/50 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#4a4ae2] transition-colors"
              />
            </div>
          )}

          {showMultiProfissionalCheck && (
            <div className="bg-[#4a4ae2]/10 border border-[#4a4ae2]/20 rounded-xl p-4 animate-in fade-in slide-in-from-top-2">
              <label className="flex items-start gap-3 cursor-pointer">
                <div className="pt-1">
                  <input
                    type="checkbox"
                    checked={multiProfissional}
                    onChange={(e) => setMultiProfissional(e.target.checked)}
                    className="w-5 h-5 rounded border-white/20 bg-[#050510] text-[#4a4ae2] focus:ring-[#4a4ae2] focus:ring-offset-0 transition-colors"
                  />
                </div>
                <div>
                  <span className="text-sm font-semibold text-white block mb-0.5">Você tem mais de um profissional atendendo?</span>
                  <span className="text-xs text-[#a0a0ff]">Isso ativará o modo de agendas individuais por pessoa na sua clínica.</span>
                </div>
              </label>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !nicho}
            className="w-full py-4 bg-gradient-to-r from-[#00c6e0] to-[#4a4ae2] hover:opacity-90 rounded-xl text-sm font-bold shadow-[0_4px_20px_rgba(74,74,226,0.3)] transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-4"
          >
            {loading ? 'Preparando o seu painel...' : 'Acessar o Painel'}
          </button>
        </form>
      </div>
    </div>
  );
}
