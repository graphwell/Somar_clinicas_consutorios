"use client";

import React, { useState } from 'react';

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);

  return (
    <div className="min-h-screen bg-[#050510] flex items-center justify-center p-6 font-sans">
      <div className="w-full max-w-md bg-white/5 border border-white/10 backdrop-blur-xl p-8 rounded-3xl shadow-2xl">
        
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#4a4ae2] to-[#8080ff] shadow-lg shadow-[#4a4ae2]/50 mx-auto mb-4"></div>
          <h2 className="text-3xl font-bold text-white tracking-tight">{isLogin ? 'Bem-vindo de volta' : 'Crie sua conta'}</h2>
          <p className="text-gray-400 mt-2 text-sm">
            {isLogin ? 'Faça login para gerenciar sua clínica' : 'Automatize seu atendimento em minutos'}
          </p>
        </div>

        <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); window.location.href = '/dashboard'; }}>
          
          {!isLogin && (
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-300">Nome Completo</label>
              <input 
                type="text" 
                required 
                className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#4a4ae2] focus:ring-1 focus:ring-[#4a4ae2] transition-all"
                placeholder="Dr. João Silva"
              />
            </div>
          )}

          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-300">E-mail</label>
            <input 
              type="email" 
              required 
              className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#4a4ae2] focus:ring-1 focus:ring-[#4a4ae2] transition-all"
              placeholder="seu@email.com"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-300">Senha</label>
            <input 
              type="password" 
              required 
              className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#4a4ae2] focus:ring-1 focus:ring-[#4a4ae2] transition-all"
              placeholder="••••••••"
            />
          </div>

          <button 
            type="submit" 
            className="w-full py-4 bg-[#4a4ae2] hover:bg-[#3a3ab2] rounded-xl text-white font-semibold transition-all shadow-[0_4px_20px_rgba(74,74,226,0.3)] mt-4"
          >
            {isLogin ? 'Entrar' : 'Cadastrar Clínica'}
          </button>
        </form>

        <div className="mt-8 text-center text-sm text-gray-400">
          {isLogin ? 'Ainda não é cliente?' : 'Já possui uma conta?'} {' '}
          <button 
            onClick={() => setIsLogin(!isLogin)} 
            className="text-[#8080ff] hover:text-[#a0a0ff] font-semibold transition-colors"
          >
            {isLogin ? 'Crie sua conta agora' : 'Faça login'}
          </button>
        </div>
      </div>
    </div>
  );
}
