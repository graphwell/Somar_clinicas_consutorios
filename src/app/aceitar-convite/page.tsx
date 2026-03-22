"use client";
import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function AcceptContent() {
  const params = useSearchParams();
  const token = params.get('token');
  const [status, setStatus] = useState<'loading' | 'valid' | 'invalid'>('loading');
  const [invite, setInvite] = useState<{ email: string; role: string } | null>(null);
  const [nome, setNome] = useState('');
  const [senha, setSenha] = useState('');
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) { setStatus('invalid'); return; }
    fetch(`/api/team/invite?token=${token}`)
      .then(r => r.json())
      .then(data => { if (data.email) { setInvite(data); setStatus('valid'); } else setStatus('invalid'); })
      .catch(() => setStatus('invalid'));
  }, [token]);

  const handleAccept = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/team/accept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, nome, senha }),
    });
    if (res.ok) setDone(true);
    else { const d = await res.json(); setError(d.error); }
  };

  return (
    <div className="min-h-screen bg-[#050510] text-white flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white/5 border border-white/10 rounded-3xl p-8 space-y-6">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto rounded-xl bg-gradient-to-br from-[#4a4ae2] to-[#8080ff] mb-4"></div>
          <h1 className="text-2xl font-bold">Aceitar Convite</h1>
        </div>

        {status === 'loading' && <p className="text-center text-gray-400">Validando convite...</p>}
        {status === 'invalid' && <p className="text-center text-red-400">⚠️ Convite inválido ou expirado.</p>}
        {done && <p className="text-center text-green-400">✅ Conta criada com sucesso! Você já pode fazer login.</p>}

        {status === 'valid' && !done && invite && (
          <form onSubmit={handleAccept} className="space-y-4">
            <p className="text-sm text-gray-400">Você foi convidado como <strong className="text-[#a0a0ff]">{invite.role === 'admin' ? 'Administrador' : 'Atendente'}</strong> para {invite.email}.</p>
            <div className="space-y-1">
              <label className="text-sm text-gray-400">Seu Nome Completo</label>
              <input type="text" required value={nome} onChange={e => setNome(e.target.value)} className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#4a4ae2] transition-all" placeholder="Dr. Maria Silva" />
            </div>
            <div className="space-y-1">
              <label className="text-sm text-gray-400">Criar Senha</label>
              <input type="password" required value={senha} onChange={e => setSenha(e.target.value)} className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#4a4ae2] transition-all" placeholder="••••••••" />
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button type="submit" className="w-full py-4 bg-[#4a4ae2] hover:bg-[#3a3ab2] rounded-xl text-white font-semibold transition-all">
              Criar Minha Conta
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function AcceptInvitePage() {
  return <Suspense fallback={<div className="min-h-screen bg-[#050510] flex items-center justify-center text-white">Carregando...</div>}><AcceptContent /></Suspense>;
}
