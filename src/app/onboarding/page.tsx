"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { SynkaLogo } from '@/components/SynkaLogo';

const NICHOS = [
  'Salão de Beleza',
  'Barbearia',
  'Clínica de Estética',
  'Clínica Médica — Monoespecialidade',
  'Clínica Médica — Multiespecialidades',
  'Clínica de Fisioterapia',
  'Nutricionista',
  'Psicólogo',
  'Outro',
];

export default function OnboardingPage() {
  const router = useRouter();
  const [nicho, setNicho] = useState('');
  const [outroNicho, setOutroNicho] = useState('');
  const [multiProfissional, setMultiProfissional] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [tenantId, setTenantId] = useState('');

  useEffect(() => {
    const userStr = localStorage.getItem('synka-user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        if (user.tenantId) setTenantId(user.tenantId);
      } catch (e) {
        console.error('Erro ao recuperar tenant da sessão:', e);
      }
    }
  }, []);

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
          tenantId: tenantId,
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
    <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col items-center justify-center p-6 font-sans">
      <div className="w-full max-w-md bg-white border border-gray-200 rounded-3xl p-8 shadow-xl relative overflow-hidden">
        
        <div className="flex justify-center mb-8 relative z-10">
          <img src="/synka-logo.png" alt="Synka" className="h-16 object-contain" />
        </div>

        <h1 className="text-2xl font-bold text-center mb-2 tracking-tight">Bem-vindo(a) ao Synka!</h1>
        <p className="text-gray-500 text-sm text-center mb-8">
          Antes de começarmos, conte um pouco sobre o seu negócio para personalizarmos sua experiência.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Qual é o seu nicho de atuação?</label>
            <select
              required
              value={nicho}
              onChange={(e) => setNicho(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-[#4a4ae2] focus:ring-1 focus:ring-[#4a4ae2] transition-colors appearance-none"
            >
              <option value="" disabled>Selecione um segmento...</option>
              {NICHOS.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>

          {nicho === 'Outro' && (
            <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Por favor, especifique:</label>
              <input
                required
                type="text"
                value={outroNicho}
                onChange={(e) => setOutroNicho(e.target.value)}
                placeholder="Ex: Clínica Veterinária"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#4a4ae2] focus:ring-1 focus:ring-[#4a4ae2] transition-colors"
              />
            </div>
          )}

          {showMultiProfissionalCheck && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 animate-in fade-in slide-in-from-top-2">
              <label className="flex items-start gap-3 cursor-pointer">
                <div className="pt-1">
                  <input
                    type="checkbox"
                    checked={multiProfissional}
                    onChange={(e) => setMultiProfissional(e.target.checked)}
                    className="w-5 h-5 rounded border-gray-300 text-[#4a4ae2] focus:ring-[#4a4ae2] focus:ring-offset-0 transition-colors"
                  />
                </div>
                <div>
                  <span className="text-sm font-semibold text-gray-800 block mb-0.5">Você tem mais de um profissional atendendo?</span>
                  <span className="text-xs text-gray-500">Isso ativará o modo de agendas individuais por pessoa na sua clínica.</span>
                </div>
              </label>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !nicho}
            className="w-full py-3.5 bg-[#4a4ae2] hover:bg-[#3a3ab2] text-white rounded-xl font-semibold text-sm transition-all shadow-[0_4px_16px_rgba(74,74,226,0.3)] hover:shadow-[0_4px_24px_rgba(74,74,226,0.5)] disabled:opacity-60 mt-4"
          >
            {loading ? 'Preparando o seu painel...' : 'Acessar o Painel'}
          </button>
        </form>
      </div>
    </div>
  );
}
