"use client";
import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { SynkaLogo } from '@/components/SynkaLogo';

function ResetForm() {
  const params = useSearchParams();
  const token = params.get('token') || '';
  const [novaSenha, setNovaSenha] = useState('');
  const [confirma, setConfirma] = useState('');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState(false);

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: '#F5F0E8' }}>
        <p className="text-red-500">Link inválido. <Link href="/auth/login" className="underline">Voltar</Link></p>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (novaSenha !== confirma) { setError('As senhas não coincidem.'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-senha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, novaSenha }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setOk(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: '#F5F0E8' }}>
      <div className="w-full max-w-sm bg-white rounded-2xl p-8 shadow-lg border border-warm-200">
        <div className="mb-6">
          <SynkaLogo variant="light" height={30} />
        </div>
        <h2 className="text-xl font-bold text-slate-700 mb-1">Nova senha</h2>
        <p className="text-sm text-slate-300 mb-6">Crie uma senha forte para sua conta.</p>

        {ok ? (
          <div className="text-center space-y-3">
            <p className="text-2xl">✅</p>
            <p className="font-medium text-slate-700">Senha redefinida!</p>
            <Link href="/auth/login" className="block mt-4 text-sage-600 text-sm font-medium hover:text-sage-700">
              Ir para o login →
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm">⚠️ {error}</div>}
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300 uppercase tracking-wider">Nova senha</label>
              <div className="relative">
                <input type={show ? 'text' : 'password'} value={novaSenha} onChange={e => setNovaSenha(e.target.value)}
                  required className="input-premium w-full pr-10" placeholder="••••••••" />
                <button type="button" onClick={() => setShow(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-100 text-sm">{show ? '🙈' : '👁️'}</button>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300 uppercase tracking-wider">Confirmar</label>
              <input type="password" value={confirma} onChange={e => setConfirma(e.target.value)}
                required className="input-premium w-full" placeholder="••••••••" />
            </div>
            <button type="submit" disabled={loading}
              className="w-full h-11 rounded-xl text-white text-sm font-semibold transition-all disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg,#40916C,#2D6A4F)' }}>
              {loading ? 'Salvando...' : 'Salvar nova senha'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function ResetSenhaPage() {
  return <Suspense fallback={<div className="min-h-screen" style={{ background: '#F5F0E8' }} />}><ResetForm /></Suspense>;
}
