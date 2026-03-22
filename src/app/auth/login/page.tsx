"use client";
import React, { useState } from 'react';
import Link from 'next/link';

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await new Promise(r => setTimeout(r, 800));
    window.location.href = '/dashboard';
  };

  const handleGoogle = () => {
    // Google OAuth — will be wired to NextAuth in the next step
    alert('Integração Google em configuração. Use email/senha por enquanto.');
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans flex flex-col">
      
      {/* White Header */}
      <header className="bg-white border-b border-gray-100 h-20 flex items-center px-8">
        <Link href="/">
          <img src="/synka-logo.png" alt="Synka" className="h-14 object-contain" />
        </Link>
      </header>

      {/* Form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white border border-gray-200 rounded-3xl shadow-xl p-8">

          <div className="text-center mb-8">
            <img src="/synka-logo.png" alt="Synka" className="h-20 object-contain mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
              {isLogin ? 'Bem-vindo de volta' : 'Crie sua conta'}
            </h2>
            <p className="text-gray-400 mt-1.5 text-sm">
              {isLogin ? 'Faça login para gerenciar sua clínica' : 'Automatize seu atendimento em minutos'}
            </p>
          </div>

          {/* Google Button */}
          <button
            onClick={handleGoogle}
            type="button"
            className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-300 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-all mb-5 hover:border-gray-400"
          >
            <svg width="18" height="18" viewBox="0 0 48 48" fill="none">
              <path d="M47.532 24.552C47.532 22.8 47.38 21.112 47.1 19.48H24V29.02H37.196C36.62 32.04 34.84 34.6 32.22 36.28V42.26H40.18C44.82 38.02 47.532 31.84 47.532 24.552Z" fill="#4285F4"/>
              <path d="M24 48C30.6 48 36.16 45.84 40.18 42.26L32.22 36.28C30.08 37.72 27.3 38.58 24 38.58C17.62 38.58 12.22 34.3 10.34 28.52H2.14V34.68C6.14 42.6 14.46 48 24 48Z" fill="#34A853"/>
              <path d="M10.34 28.52C9.84 27.04 9.56 25.46 9.56 23.84C9.56 22.22 9.84 20.64 10.34 19.16V13H2.14C0.78 15.84 0 19 0 23.84C0 28.68 0.78 31.84 2.14 34.68L10.34 28.52Z" fill="#FBBC05"/>
              <path d="M24 9.1C27.6 9.1 30.8 10.38 33.32 12.8L40.36 5.76C36.16 1.86 30.6 -0.24 24 -0.24C14.46 -0.24 6.14 5.16 2.14 13L10.34 19.16C12.22 13.38 17.62 9.1 24 9.1Z" fill="#EA4335"/>
            </svg>
            Continuar com Google
          </button>

          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400 font-medium">ou com e-mail</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            {!isLogin && (
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-600">Nome Completo</label>
                <input type="text" required
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#4a4ae2] focus:ring-1 focus:ring-[#4a4ae2] transition-all"
                  placeholder="Dr. João Silva" />
              </div>
            )}
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-600">E-mail</label>
              <input type="email" required
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#4a4ae2] focus:ring-1 focus:ring-[#4a4ae2] transition-all"
                placeholder="seu@email.com" />
            </div>
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-gray-600">Senha</label>
                {isLogin && <button type="button" className="text-xs text-[#4a4ae2] hover:underline">Esqueceu?</button>}
              </div>
              <input type="password" required
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#4a4ae2] focus:ring-1 focus:ring-[#4a4ae2] transition-all"
                placeholder="••••••••" />
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-3.5 bg-[#4a4ae2] hover:bg-[#3a3ab2] text-white rounded-xl font-semibold text-sm transition-all shadow-[0_4px_16px_rgba(74,74,226,0.3)] hover:shadow-[0_4px_24px_rgba(74,74,226,0.5)] disabled:opacity-60 mt-2">
              {loading ? 'Entrando...' : isLogin ? 'Entrar' : 'Cadastrar Clínica'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-400">
            {isLogin ? 'Ainda não é cliente?' : 'Já possui uma conta?'}{' '}
            <button onClick={() => setIsLogin(!isLogin)} className="text-[#4a4ae2] hover:underline font-semibold">
              {isLogin ? 'Crie sua conta agora' : 'Faça login'}
            </button>
          </p>
        </div>
      </div>

      {/* White Footer */}
      <footer className="bg-white border-t border-gray-100 py-6 px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-400">
        <img src="/synka-logo.png" alt="Synka" className="h-10 object-contain" />
        <span>© 2025 SOMMAR SOLUÇÕES DIGITAIS — CNPJ: 65.771.133/0001-07</span>
        <div className="flex gap-4">
          <a href="https://wa.me/5585991516106" className="hover:text-gray-600 transition-colors">Suporte</a>
          <Link href="/" className="hover:text-gray-600 transition-colors">Home</Link>
        </div>
      </footer>
    </div>
  );
}
