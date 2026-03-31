"use client";
import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { setAuthSession } from '@/lib/api-utils';

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 48 48" fill="none">
    <path d="M47.532 24.552C47.532 22.8 47.38 21.112 47.1 19.48H24V29.02H37.196C36.62 32.04 34.84 34.6 32.22 36.28V42.26H40.18C44.82 38.02 47.532 31.84 47.532 24.552Z" fill="#4285F4"/>
    <path d="M24 48C30.6 48 36.16 45.84 40.18 42.26L32.22 36.28C30.08 37.72 27.3 38.58 24 38.58C17.62 38.58 12.22 34.3 10.34 28.52H2.14V34.68C6.14 42.6 14.46 48 24 48Z" fill="#34A853"/>
    <path d="M10.34 28.52C9.84 27.04 9.56 25.46 9.56 23.84C9.56 22.22 9.84 20.64 10.34 19.16V13H2.14C0.78 15.84 0 19 0 23.84C0 28.68 0.78 31.84 2.14 34.68L10.34 28.52Z" fill="#FBBC05"/>
    <path d="M24 9.1C27.6 9.1 30.8 10.38 33.32 12.8L40.36 5.76C36.16 1.86 30.6 -0.24 24 -0.24C14.46 -0.24 6.14 5.16 2.14 13L10.34 19.16C12.22 13.38 17.62 9.1 24 9.1Z" fill="#EA4335"/>
  </svg>
);

function LoginForm() {
  const params = useSearchParams();
  const errorParam = params.get('error');

  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [showSenha, setShowSenha] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(
    errorParam === 'google_cancelado' ? 'Login com Google cancelado.' :
    errorParam === 'google_interno' ? 'Erro ao autenticar com Google. Tente novamente.' :
    errorParam === 'google_token' ? 'Não foi possível obter token do Google. Tente novamente.' :
    errorParam === 'google_dados' ? 'Não foi possível obter dados do Google. Tente novamente.' :
    errorParam === 'token_expirado' ? 'Link de verificação expirado. Faça login e solicite um novo.' :
    errorParam === 'token_invalido' ? 'Link inválido.' :
    ''
  );
  const [esqueciOpen, setEsqueciOpen] = useState(false);
  const [esqueciEmail, setEsqueciEmail] = useState('');
  const [esqueciLoading, setEsqueciLoading] = useState(false);
  const [esqueciOk, setEsqueciOk] = useState(false);
  const [emailNaoVerificado, setEmailNaoVerificado] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setEmailNaoVerificado(false);
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, senha }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.code === 'EMAIL_NAO_VERIFICADO') {
          setEmailNaoVerificado(true);
        } else {
          throw new Error(data.error || 'Erro ao realizar login.');
        }
        return;
      }
      setAuthSession(data.token, data.user);
      window.location.href = data.user?.onboardingCompleted === false ? '/onboarding' : '/dashboard';
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEsqueciSenha = async (e: React.FormEvent) => {
    e.preventDefault();
    setEsqueciLoading(true);
    try {
      await fetch('/api/auth/esqueci-senha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: esqueciEmail }),
      });
      setEsqueciOk(true);
    } finally {
      setEsqueciLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex" style={{ background: '#F5F0E8' }}>

      {/* LADO ESQUERDO — visual (apenas desktop) */}
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
            Gestão inteligente<br/>para clínicas
          </h1>
          <p className="text-white/60 text-base leading-relaxed mb-12">
            Automatize agendamentos, prontuários e marketing com IA.
          </p>

          <div className="space-y-4">
            {[
              { icon: '📅', text: 'Agenda IA com agendamento automático 24h' },
              { icon: '📋', text: 'Prontuário eletrônico com voz e IA' },
              { icon: '📲', text: 'Marketing automático via WhatsApp' },
            ].map((item) => (
              <div key={item.text} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-sm">{item.icon}</div>
                <p className="text-white/80 text-sm">{item.text}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-white/25 text-xs">© 2025 SOMMAR SOLUÇÕES DIGITAIS</p>
      </div>

      {/* LADO DIREITO — formulário */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 lg:p-12">
        {/* Logo mobile */}
        <div className="lg:hidden flex items-center gap-2.5 mb-8">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold" style={{ background: 'linear-gradient(135deg,#40916C,#2D6A4F)' }}>S</div>
          <span className="font-bold text-slate-700 text-lg">Synka</span>
        </div>

        <div className="w-full max-w-[400px]">
          <h2 className="text-2xl font-bold text-slate-700 mb-1">Bem-vindo de volta</h2>
          <p className="text-slate-300 text-sm mb-7">Faça login para gerenciar sua clínica.</p>

          {/* Erro global */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm">
              ⚠️ {error}
            </div>
          )}

          {/* Email não verificado */}
          {emailNaoVerificado && (
            <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-sm space-y-1">
              <p className="font-medium">📧 Email não verificado</p>
              <p>Verifique sua caixa de entrada e clique no link que enviamos.</p>
            </div>
          )}

          {/* Botão Google */}
          <a
            href="/api/auth/google"
            className="w-full flex items-center justify-center gap-3 h-11 rounded-xl border border-warm-300 bg-white text-slate-700 text-sm font-medium hover:bg-warm-100 transition-colors mb-5"
          >
            <GoogleIcon />
            Continuar com Google
          </a>

          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-warm-300" />
            <span className="text-xs text-slate-100 font-medium">ou com e-mail</span>
            <div className="flex-1 h-px bg-warm-300" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300 uppercase tracking-wider">E-mail</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-premium w-full"
                placeholder="seu@email.com"
              />
            </div>
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="text-xs font-medium text-slate-300 uppercase tracking-wider">Senha</label>
                <button type="button" onClick={() => setEsqueciOpen(true)} className="text-xs text-sage-600 hover:text-sage-700">
                  Esqueci minha senha
                </button>
              </div>
              <div className="relative">
                <input
                  type={showSenha ? 'text' : 'password'}
                  required
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  className="input-premium w-full pr-10"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowSenha((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-100 hover:text-slate-300 text-sm"
                >
                  {showSenha ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-xl text-white text-sm font-semibold transition-all disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg,#40916C,#2D6A4F)' }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Entrando...
                </span>
              ) : 'Entrar'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-300">
            Não tem conta?{' '}
            <Link href="/auth/register" className="text-sage-600 font-semibold hover:text-sage-700">
              Criar conta grátis
            </Link>
          </p>
        </div>
      </div>

      {/* Modal esqueci senha */}
      {esqueciOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-lg font-bold text-slate-700 mb-1">Recuperar acesso</h3>
            <p className="text-sm text-slate-300 mb-5">
              Informe seu email e enviaremos um link para redefinir sua senha.
            </p>
            {esqueciOk ? (
              <div className="text-center py-4 space-y-2">
                <p className="text-2xl">📧</p>
                <p className="font-medium text-slate-700">Verifique seu email!</p>
                <p className="text-sm text-slate-300">Se o email estiver cadastrado, você receberá as instruções.</p>
                <button onClick={() => { setEsqueciOpen(false); setEsqueciOk(false); }} className="mt-3 text-sage-600 text-sm font-medium">
                  Fechar
                </button>
              </div>
            ) : (
              <form onSubmit={handleEsqueciSenha} className="space-y-4">
                <input
                  type="email"
                  required
                  value={esqueciEmail}
                  onChange={(e) => setEsqueciEmail(e.target.value)}
                  className="input-premium w-full"
                  placeholder="seu@email.com"
                />
                <div className="flex gap-2">
                  <button type="button" onClick={() => setEsqueciOpen(false)}
                    className="flex-1 h-10 rounded-xl border border-warm-300 text-slate-300 text-sm hover:bg-warm-100 transition-colors">
                    Cancelar
                  </button>
                  <button type="submit" disabled={esqueciLoading}
                    className="flex-1 h-10 rounded-xl text-white text-sm font-medium transition-all disabled:opacity-60"
                    style={{ background: 'linear-gradient(135deg,#40916C,#2D6A4F)' }}>
                    {esqueciLoading ? 'Enviando...' : 'Enviar link'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" style={{ background: '#F5F0E8' }} />}>
      <LoginForm />
    </Suspense>
  );
}
