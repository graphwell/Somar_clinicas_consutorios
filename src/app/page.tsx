"use client";
import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

const ROTATING_PHRASES = [
  { pain: 'recepcionista esquece de ligar para lembrar consultas', fix: 'A IA lembra sozinha, 24h por dia.' },
  { pain: 'pacientes desistem enquanto esperam resposta no WhatsApp', fix: 'Resposta instantânea. Zero fila.' },
  { pain: 'agenda cheia de furos por cancelamentos sem aviso', fix: 'Cancelamentos registrados e horário realocado.' },
  { pain: 'recepcionista perdida entre 3 conversas ao mesmo tempo', fix: 'Uma IA atendendo todos ao mesmo tempo.' },
  { pain: 'clínica fechada, paciente urgente sem resposta', fix: 'Atendimento automático fora do horário.' },
  { pain: 'erros de anotação causando conflito de horários', fix: 'Agenda sincronizada. Sem conflitos.' },
];

const BENEFITS = [
  { icon: '🤖', title: 'IA no WhatsApp', desc: 'Agendamentos, cancelamentos e remarcações feitos automaticamente pela IA sem intervenção humana.' },
  { icon: '📅', title: 'Agenda em Tempo Real', desc: 'Painel completo para sua equipe visualizar, criar e gerenciar consultas com um clique.' },
  { icon: '🔔', title: 'Lembretes Automáticos', desc: 'Pacientes recebem confirmações e lembretes 24h antes. Reduza no-shows em até 70%.' },
  { icon: '📊', title: 'Relatórios da Clínica', desc: 'Veja métricas de atendimento, taxa de confirmação e histórico completo de pacientes.' },
  { icon: '🔒', title: 'Seguro e Privado', desc: 'Dados da sua clínica protegidos com criptografia. Conformidade com LGPD.' },
  { icon: '⚡', title: 'Ativo em 24 horas', desc: 'Configure, conecte o WhatsApp e comece a atender. Sem instalação, sem servidor próprio.' },
];

export default function LandingPage() {
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [visible, setVisible] = useState(true);
  const [statCounts, setStatCounts] = useState([0, 0, 0]);
  const statsRef = useRef<HTMLDivElement>(null);
  const countsTargets = [70, 24, 300];

  // Rotate phrases with fade
  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setPhraseIdx(i => (i + 1) % ROTATING_PHRASES.length);
        setVisible(true);
      }, 400);
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  // Count-up animation when stats come into view
  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) {
        countsTargets.forEach((target, idx) => {
          let count = 0;
          const step = Math.ceil(target / 60);
          const timer = setInterval(() => {
            count = Math.min(count + step, target);
            setStatCounts(prev => { const n = [...prev]; n[idx] = count; return n; });
            if (count >= target) clearInterval(timer);
          }, 25);
        });
        observer.disconnect();
      }
    }, { threshold: 0.3 });
    if (statsRef.current) observer.observe(statsRef.current);
    return () => observer.disconnect();
  }, []);

  const phrase = ROTATING_PHRASES[phraseIdx];

  return (
    <div className="min-h-screen bg-[#050510] text-white font-sans overflow-x-hidden">

      {/* ── Nav ── */}
      <nav className="fixed top-0 w-full z-50 backdrop-blur-xl bg-[#050510]/80 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/synka-icon.png" alt="Synka" className="h-9 w-9 object-contain" />
            <span className="text-xl font-bold tracking-tight">synka</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/auth/login" className="hidden sm:block text-sm text-gray-400 hover:text-white transition-colors">
              Entrar
            </Link>
            <Link href="/auth/login"
              className="px-5 py-2 bg-[#4a4ae2] hover:bg-[#3a3ab2] rounded-xl text-sm font-semibold transition-all shadow-[0_4px_16px_rgba(74,74,226,0.4)] hover:shadow-[0_4px_24px_rgba(74,74,226,0.6)]">
              Acessar minha conta
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center text-center px-6 pt-24 pb-16 overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-[#4a4ae2]/12 rounded-full blur-[120px]" />
          <div className="absolute top-1/2 left-1/4 w-[300px] h-[300px] bg-[#00b4d8]/8 rounded-full blur-[80px]" />
        </div>

        {/* Badge */}
        <div className="inline-flex items-center gap-2 bg-[#4a4ae2]/10 border border-[#4a4ae2]/25 rounded-full px-4 py-1.5 text-xs text-[#a0a0ff] font-semibold uppercase tracking-widest mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-[#4a4ae2] animate-pulse" />
          Powered by Somar.IA
        </div>

        {/* Main heading */}
        <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold leading-tight max-w-5xl mb-6">
          Sua clínica cansou de
          <br />
          <span className="bg-gradient-to-r from-[#00b4d8] via-[#4a4ae2] to-[#8080ff] bg-clip-text text-transparent">
            perder pacientes
          </span>{' '}
          por não responder?
        </h1>

        <p className="text-gray-400 text-lg max-w-2xl mb-12">
          A Synka coloca um atendente de IA dentro do seu WhatsApp — agendando, lembrando e remarcando consultas enquanto você foca no que importa: <strong className="text-white">tratar pessoas.</strong>
        </p>

        {/* CTA buttons */}
        <div className="flex flex-col sm:flex-row gap-4 mb-20">
          <Link href="/auth/login"
            className="px-8 py-4 bg-[#4a4ae2] hover:bg-[#3a3ab2] rounded-2xl text-base font-bold transition-all shadow-[0_8px_32px_rgba(74,74,226,0.4)] hover:shadow-[0_8px_40px_rgba(74,74,226,0.6)] hover:-translate-y-0.5">
            Começar grátis — 7 dias ✨
          </Link>
          <a href="#como-funciona"
            className="px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-base font-semibold transition-all">
            Ver como funciona →
          </a>
        </div>

        {/* Social proof */}
        <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-gray-500">
          <span>✅ Sem instalação</span>
          <span className="hidden sm:block">·</span>
          <span>✅ Funciona 24h</span>
          <span className="hidden sm:block">·</span>
          <span>✅ Ativo em menos de 24h</span>
          <span className="hidden sm:block">·</span>
          <span>✅ Cancele quando quiser</span>
        </div>
      </section>

      {/* ── Rotating Pain Points ── */}
      <section id="como-funciona" className="py-24 px-6 bg-gradient-to-b from-[#050510] to-[#08081a]">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-xs uppercase tracking-widest text-[#4a4ae2] font-bold mb-4">Sua realidade hoje</p>
          <h2 className="text-3xl sm:text-4xl font-bold mb-16">Reconhece alguma dessas situações?</h2>

          <div className="relative min-h-[200px] flex flex-col items-center justify-center">
            <div className={`transition-all duration-400 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}`}>
              {/* Pain */}
              <div className="bg-red-500/8 border border-red-500/20 rounded-2xl px-8 py-6 mb-6 max-w-2xl mx-auto">
                <p className="text-base sm:text-lg text-gray-200 leading-relaxed">
                  😤 <span className="text-red-300 font-medium">&quot;{phrase.pain}&quot;</span>
                </p>
              </div>
              {/* Arrow */}
              <div className="text-[#4a4ae2] text-2xl mb-6">↓</div>
              {/* Fix */}
              <div className="bg-green-500/8 border border-green-500/20 rounded-2xl px-8 py-5 max-w-2xl mx-auto">
                <p className="text-base sm:text-lg text-green-300 font-semibold">
                  ✅ Synka resolve: {phrase.fix}
                </p>
              </div>
            </div>

            {/* Dots */}
            <div className="flex gap-2 mt-10">
              {ROTATING_PHRASES.map((_, i) => (
                <button key={i} onClick={() => { setPhraseIdx(i); setVisible(true); }}
                  className={`h-1.5 rounded-full transition-all duration-300 ${i === phraseIdx ? 'w-6 bg-[#4a4ae2]' : 'w-1.5 bg-white/20'}`} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section ref={statsRef} className="py-20 px-6 bg-[#08081a]">
        <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
          {[
            { value: statCounts[0], suffix: '%', label: 'redução em no-shows', color: 'from-green-400 to-emerald-300' },
            { value: statCounts[1], suffix: 'h', label: 'de atendimento por dia', color: 'from-[#00b4d8] to-[#4a4ae2]' },
            { value: statCounts[2], suffix: '+', label: 'mensagens automáticas/mês', color: 'from-[#4a4ae2] to-[#8080ff]' },
          ].map((s, i) => (
            <div key={i} className="space-y-2">
              <p className={`text-6xl font-extrabold bg-gradient-to-r ${s.color} bg-clip-text text-transparent`}>
                {s.value}{s.suffix}
              </p>
              <p className="text-gray-400 text-sm">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Benefits ── */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs uppercase tracking-widest text-[#4a4ae2] font-bold mb-3">Funcionalidades</p>
            <h2 className="text-3xl sm:text-4xl font-bold">Tudo que sua clínica precisa</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {BENEFITS.map(b => (
              <div key={b.title}
                className="group bg-[#0a0a20]/60 border border-white/5 hover:border-[#4a4ae2]/30 rounded-2xl p-7 transition-all hover:-translate-y-1 hover:shadow-[0_8px_32px_rgba(74,74,226,0.12)]">
                <span className="text-3xl mb-4 block">{b.icon}</span>
                <h3 className="font-bold text-base mb-2">{b.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="py-24 px-6 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-[#4a4ae2]/10 via-transparent to-[#00b4d8]/10 pointer-events-none" />
        <div className="max-w-3xl mx-auto relative z-10">
          <h2 className="text-4xl sm:text-5xl font-extrabold mb-6 leading-tight">
            Comece hoje.<br />
            <span className="bg-gradient-to-r from-[#00b4d8] to-[#8080ff] bg-clip-text text-transparent">
              Primeiros 7 dias gratuitos.
            </span>
          </h2>
          <p className="text-gray-400 mb-10 text-lg">Sem cartão de crédito. Sem burocracia. Em 24h sua IA está no ar.</p>
          <Link href="/auth/login"
            className="inline-block px-10 py-5 bg-[#4a4ae2] hover:bg-[#3a3ab2] rounded-2xl text-lg font-bold transition-all shadow-[0_8px_40px_rgba(74,74,226,0.5)] hover:shadow-[0_8px_56px_rgba(74,74,226,0.7)] hover:-translate-y-1">
            Criar minha conta grátis →
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/5 py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6 text-xs text-gray-500">
          <div className="flex items-center gap-3">
            <img src="/synka-icon.png" alt="Synka" className="h-6 w-6 object-contain opacity-70" />
            <span>Synka — um produto <strong className="text-gray-400">Somar.IA</strong></span>
          </div>
          <div className="text-center">
            © 2025 SOMMAR SOLUÇÕES DIGITAIS — CNPJ: 65.771.133/0001-07
          </div>
          <div className="flex gap-5">
            <a href="https://wa.me/5585991516106" className="hover:text-white transition-colors">WhatsApp</a>
            <a href="mailto:somar.solucoes.suporte@gmail.com" className="hover:text-white transition-colors">Suporte</a>
            <Link href="/auth/login" className="hover:text-white transition-colors">Login</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
