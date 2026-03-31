"use client";
import React, { useState } from 'react';
import Link from 'next/link';

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 48 48" fill="none">
    <path d="M47.532 24.552C47.532 22.8 47.38 21.112 47.1 19.48H24V29.02H37.196C36.62 32.04 34.84 34.6 32.22 36.28V42.26H40.18C44.82 38.02 47.532 31.84 47.532 24.552Z" fill="#4285F4"/>
    <path d="M24 48C30.6 48 36.16 45.84 40.18 42.26L32.22 36.28C30.08 37.72 27.3 38.58 24 38.58C17.62 38.58 12.22 34.3 10.34 28.52H2.14V34.68C6.14 42.6 14.46 48 24 48Z" fill="#34A853"/>
    <path d="M10.34 28.52C9.84 27.04 9.56 25.46 9.56 23.84C9.56 22.22 9.84 20.64 10.34 19.16V13H2.14C0.78 15.84 0 19 0 23.84C0 28.68 0.78 31.84 2.14 34.68L10.34 28.52Z" fill="#FBBC05"/>
    <path d="M24 9.1C27.6 9.1 30.8 10.38 33.32 12.8L40.36 5.76C36.16 1.86 30.6 -0.24 24 -0.24C14.46 -0.24 6.14 5.16 2.14 13L10.34 19.16C12.22 13.38 17.62 9.1 24 9.1Z" fill="#EA4335"/>
  </svg>
);

function calcForcaSenha(s: string): { nivel: number; label: string; cor: string } {
  if (!s) return { nivel: 0, label: '', cor: '' };
  let score = 0;
  if (s.length >= 8) score++;
  if (/[A-Z]/.test(s)) score++;
  if (/[0-9]/.test(s)) score++;
  if (/[^A-Za-z0-9]/.test(s)) score++;
  if (score <= 1) return { nivel: score, label: 'Fraca', cor: '#E05C5C' };
  if (score === 2) return { nivel: score, label: 'Média', cor: '#C4973A' };
  if (score === 3) return { nivel: score, label: 'Boa', cor: '#40916C' };
  return { nivel: 4, label: 'Forte', cor: '#2D6A4F' };
}

function formatTel(v: string): string {
  const d = v.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export default function RegisterPage() {
  const [nome, setNome] = useState('');
  const [sobrenome, setSobrenome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [showSenha, setShowSenha] = useState(false);
  const [nomeClinica, setNomeClinica] = useState('');
  const [termos, setTermos] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [emailEnviado, setEmailEnviado] = useState(false);

  const forca = calcForcaSenha(senha);
  const reqSenha = [
    { ok: senha.length >= 8, text: '8+ caracteres' },
    { ok: /[A-Z]/.test(senha), text: 'Maiúscula' },
    { ok: /[0-9]/.test(senha), text: 'Número' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!termos) { setError('Aceite os Termos de Uso para continuar.'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, sobrenome, telefone: telefone.replace(/\D/g, ''), email, senha, nomeClinica }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao criar conta.');
      setEmailEnviado(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (emailEnviado) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: '#F5F0E8' }}>
        <div className="w-full max-w-sm text-center space-y-4">
          <div className="w-20 h-20 mx-auto rounded-full flex items-center justify-center text-4xl"
            style={{ background: 'linear-gradient(135deg,#40916C,#2D6A4F)' }}>
            📧
          </div>
          <h2 className="text-xl font-bold text-slate-700">Verifique seu email</h2>
          <p className="text-slate-300 text-sm leading-relaxed">
            Enviamos um link de confirmação para <strong className="text-slate-700">{email}</strong>.
            Clique no link para ativar sua conta.
          </p>
          <p className="text-slate-100 text-xs">Não recebeu? Verifique a pasta de spam.</p>
          <Link href="/auth/login" className="block mt-4 text-sage-600 text-sm font-medium hover:text-sage-700">
            ← Voltar ao login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex" style={{ background: '#F5F0E8' }}>

      {/* LADO ESQUERDO — desktop */}
      <div
        className="hidden lg:flex flex-col justify-between w-[480px] shrink-0 p-12"
        style={{ background: 'linear-gradient(160deg, #1B3A2D 0%, #2D6A4F 60%, #40916C 100%)' }}
      >
        <div>
          <div className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center text-white font-bold text-lg">S</div>
            <div>
              <p className="text-white font-semibold text-lg leading-none">Synka</p>
              <p className="text-white/40 text-[10px] uppercase tracking-widest">by Somar.ia</p>
            </div>
          </div>
          <h1 className="text-4xl font-bold text-white leading-tight mb-4">
            Comece grátis<br/>hoje mesmo
          </h1>
          <p className="text-white/60 text-base leading-relaxed mb-10">
            Crie sua conta em 2 minutos e veja como a Synka transforma a gestão da sua clínica.
          </p>
          <div className="space-y-3">
            {['Sem contrato — cancele quando quiser', 'Suporte em português', 'IA treinada para saúde'].map((t) => (
              <div key={t} className="flex items-center gap-2.5">
                <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-white text-xs">✓</div>
                <p className="text-white/75 text-sm">{t}</p>
              </div>
            ))}
          </div>
        </div>
        <p className="text-white/25 text-xs">© 2025 SOMMAR SOLUÇÕES DIGITAIS</p>
      </div>

      {/* LADO DIREITO — formulário */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 lg:p-10 overflow-y-auto">
        {/* Logo mobile */}
        <div className="lg:hidden flex items-center gap-2.5 mb-6">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold" style={{ background: 'linear-gradient(135deg,#40916C,#2D6A4F)' }}>S</div>
          <span className="font-bold text-slate-700 text-lg">Synka</span>
        </div>

        <div className="w-full max-w-[440px]">
          <h2 className="text-2xl font-bold text-slate-700 mb-1">Criar sua conta</h2>
          <p className="text-slate-300 text-sm mb-6">Automatize seu atendimento em minutos.</p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm">
              ⚠️ {error}
            </div>
          )}

          {/* Google */}
          <a href="/api/auth/google"
            className="w-full flex items-center justify-center gap-3 h-11 rounded-xl border border-warm-300 bg-white text-slate-700 text-sm font-medium hover:bg-warm-100 transition-colors mb-5">
            <GoogleIcon />
            Cadastrar com Google
          </a>

          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-warm-300" />
            <span className="text-xs text-slate-100 font-medium">ou com e-mail</span>
            <div className="flex-1 h-px bg-warm-300" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300 uppercase tracking-wider">Nome *</label>
                <input value={nome} onChange={e => setNome(e.target.value)} required
                  className="input-premium w-full" placeholder="João" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300 uppercase tracking-wider">Sobrenome *</label>
                <input value={sobrenome} onChange={e => setSobrenome(e.target.value)} required
                  className="input-premium w-full" placeholder="Silva" />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300 uppercase tracking-wider">Telefone *</label>
              <input
                value={telefone}
                onChange={e => setTelefone(formatTel(e.target.value))}
                required
                className="input-premium w-full"
                placeholder="(85) 99999-0000"
                inputMode="tel"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300 uppercase tracking-wider">Nome da clínica *</label>
              <input value={nomeClinica} onChange={e => setNomeClinica(e.target.value)} required
                className="input-premium w-full" placeholder="Clínica Sorriso" />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300 uppercase tracking-wider">E-mail *</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                className="input-premium w-full" placeholder="seu@email.com" />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300 uppercase tracking-wider">Senha *</label>
              <div className="relative">
                <input
                  type={showSenha ? 'text' : 'password'}
                  value={senha}
                  onChange={e => setSenha(e.target.value)}
                  required
                  className="input-premium w-full pr-10"
                  placeholder="••••••••"
                />
                <button type="button" onClick={() => setShowSenha(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-100 text-sm">
                  {showSenha ? '🙈' : '👁️'}
                </button>
              </div>

              {/* Barra de força */}
              {senha && (
                <div className="space-y-1.5">
                  <div className="flex gap-1 h-1.5">
                    {[1,2,3,4].map(i => (
                      <div key={i} className="flex-1 rounded-full transition-colors"
                        style={{ background: i <= forca.nivel ? forca.cor : '#EEE9DF' }} />
                    ))}
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex gap-3">
                      {reqSenha.map(r => (
                        <span key={r.text} className="text-[10px]" style={{ color: r.ok ? '#40916C' : '#8A9BB0' }}>
                          {r.ok ? '✓' : '○'} {r.text}
                        </span>
                      ))}
                    </div>
                    <span className="text-[10px] font-medium" style={{ color: forca.cor }}>{forca.label}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Termos */}
            <div className="flex items-start gap-2.5 pt-1">
              <input
                id="termos"
                type="checkbox"
                checked={termos}
                onChange={e => setTermos(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-warm-300 accent-sage-500"
              />
              <label htmlFor="termos" className="text-xs text-slate-300 leading-relaxed">
                Aceito os{' '}
                <a href="/termos" target="_blank" className="text-sage-600 hover:underline">Termos de Uso</a>
                {' '}e a{' '}
                <a href="/privacidade" target="_blank" className="text-sage-600 hover:underline">Política de Privacidade</a>
              </label>
            </div>

            <button type="submit" disabled={loading}
              className="w-full h-11 rounded-xl text-white text-sm font-semibold transition-all disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg,#40916C,#2D6A4F)' }}>
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Criando conta...
                </span>
              ) : 'Criar conta grátis'}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-slate-300">
            Já tem conta?{' '}
            <Link href="/auth/login" className="text-sage-600 font-semibold hover:text-sage-700">Entrar</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
