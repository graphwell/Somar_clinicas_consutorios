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

const NICHO_FRASES = [
  {
    problema: 'perder pacientes',
    contexto: 'por não responder?',
    subtitulo: 'A Synka agenda, lembra e confirma consultas automaticamente enquanto você foca no que importa: tratar pessoas.',
  },
  {
    problema: 'perder clientes',
    contexto: 'por falta de lembretes?',
    subtitulo: 'A Synka envia lembretes automáticos e confirma horários pelo WhatsApp enquanto você foca no que importa: atender bem.',
  },
  {
    problema: 'agenda vazia',
    contexto: 'na cadeira do barbeiro?',
    subtitulo: 'A Synka preenche sua agenda automaticamente, envia lembretes e reduz faltas enquanto você foca no que importa: cortar bem.',
  },
  {
    problema: 'perder clientes',
    contexto: 'por falta de organização?',
    subtitulo: 'A Synka organiza sua agenda, envia lembretes e fideliza clientes automaticamente enquanto você foca no que importa: cuidar da beleza.',
  },
  {
    problema: 'faltas e cancelamentos',
    contexto: 'sem aviso prévio?',
    subtitulo: 'A Synka confirma presença automaticamente pelo WhatsApp e preenche horários vagos enquanto você foca no que importa: seus pacientes.',
  },
];

const BENEFIT_ICONS: Record<string, React.ReactNode> = {
  'IA no WhatsApp': <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 12h4m0 0l2-2m-2 2l2 2M12 8v4"/></svg>,
  'Agenda em Tempo Real': <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  'Lembretes Automáticos': <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>,
  'Relatórios da Clínica': <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  'Seguro e Privado': <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>,
  'Ativo em 24 horas': <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
};
const BENEFITS = [
  { title: 'IA no WhatsApp', desc: 'Agendamentos, cancelamentos e remarcações feitos automaticamente pela IA sem intervenção humana.' },
  { title: 'Agenda em Tempo Real', desc: 'Painel completo para sua equipe visualizar, criar e gerenciar consultas com um clique.' },
  { title: 'Lembretes Automáticos', desc: 'Pacientes recebem confirmações e lembretes 24h antes. Reduza no-shows em até 70%.' },
  { title: 'Relatórios da Clínica', desc: 'Veja métricas de atendimento, taxa de confirmação e histórico completo de pacientes.' },
  { title: 'Seguro e Privado', desc: 'Dados da sua clínica protegidos com criptografia. Conformidade com LGPD.' },
  { title: 'Ativo em 24 horas', desc: 'Configure, conecte o WhatsApp e comece a atender. Sem instalação, sem servidor próprio.' },
];

export default function LandingPage() {
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [visible, setVisible] = useState(true);
  const [statCounts, setStatCounts] = useState([0, 0, 0]);
  const statsRef = useRef<HTMLDivElement>(null);
  const countsTargets = [70, 24, 300];

  const [fraseAtual, setFraseAtual] = useState(0);
  const [animando, setAnimando] = useState(false);

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

  useEffect(() => {
    const interval = setInterval(() => {
      setAnimando(true);
      setTimeout(() => {
        setFraseAtual(prev => (prev + 1) % NICHO_FRASES.length);
        setAnimando(false);
      }, 300);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

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
    <div className="min-h-[100svh] bg-[#050510] text-white font-sans overflow-x-hidden">

      {/* ── Nav ── */}
      <nav className="fixed top-0 w-full z-50 bg-white shadow-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <img src="/synka-logo.png" alt="Synka" className="h-10 object-contain" />
          <div className="flex items-center gap-3">
            <Link href="/planos" className="hidden sm:block text-sm text-gray-800 hover:text-[#40916C] font-bold transition-colors">
              Planos e Preços
            </Link>
            <Link href="/auth/login" className="hidden sm:block text-sm text-gray-500 hover:text-gray-800 font-medium transition-colors ml-4">
              Entrar
            </Link>
            <Link href="/auth/login"
              className="px-5 py-2 bg-[#40916C] hover:bg-[#2D6A4F] text-white rounded-xl text-sm font-semibold transition-all shadow-[0_4px_16px_rgba(64,145,108,0.35)]">
              Acessar minha conta
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative min-h-[100svh] flex flex-col items-center justify-center text-center px-6 pt-32 pb-16 overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-[#40916C]/12 rounded-full blur-[120px]" />
          <div className="absolute top-1/2 left-1/4 w-[300px] h-[300px] bg-[#52B788]/8 rounded-full blur-[80px]" />
        </div>

        {/* Badge */}
        <div className="inline-flex items-center gap-2 bg-[#40916C]/10 border border-[#40916C]/25 rounded-full px-4 py-1.5 text-xs text-[#95D5B2] font-semibold uppercase tracking-widest mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-[#40916C] animate-pulse" />
          Powered by Somar.IA
        </div>

        {/* Main heading */}
        <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold leading-tight max-w-5xl mb-6">
          Seu negócio cansou de{' '}
          <span
            style={{
              color: '#52B788',
              display: 'inline-block',
              transition: 'opacity 300ms ease',
              opacity: animando ? 0 : 1,
            }}
          >
            {NICHO_FRASES[fraseAtual].problema}
          </span>
          {' '}{NICHO_FRASES[fraseAtual].contexto}
        </h1>

        <p
          className="text-gray-400 text-lg max-w-2xl mb-4"
          style={{ transition: 'opacity 300ms ease', opacity: animando ? 0 : 1 }}
        >
          {NICHO_FRASES[fraseAtual].subtitulo}
        </p>

        {/* Dots */}
        <div className="flex gap-1.5 justify-center mb-10">
          {NICHO_FRASES.map((_, i) => (
            <button
              key={i}
              onClick={() => { setFraseAtual(i); setAnimando(false); }}
              style={{
                width: i === fraseAtual ? 20 : 6,
                height: 6,
                borderRadius: 3,
                background: i === fraseAtual ? '#52B788' : 'rgba(255,255,255,0.3)',
                transition: 'all 300ms ease',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
              }}
            />
          ))}
        </div>

        {/* CTA buttons */}
        <div className="flex flex-col sm:flex-row gap-4 mb-20 w-full sm:w-auto items-center">
          <Link href="/auth/login"
            className="w-full sm:w-auto max-w-xs px-8 py-4 bg-[#40916C] hover:bg-[#2D6A4F] rounded-2xl text-base font-bold transition-all shadow-[0_8px_32px_rgba(64,145,108,0.4)] hover:shadow-[0_8px_40px_rgba(64,145,108,0.6)] hover:-translate-y-0.5 text-center">
            Começar grátis — 30 dias
          </Link>
          <a href="#como-funciona"
            className="px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-base font-semibold transition-all">
            Ver como funciona →
          </a>
        </div>

        {/* Social proof */}
        <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-gray-500">
          <span>-Sem instalação</span>
          <span className="hidden sm:block">·</span>
          <span>-Funciona 24h</span>
          <span className="hidden sm:block">·</span>
          <span>-Ativo em menos de 24h</span>
          <span className="hidden sm:block">·</span>
          <span>-Cancele quando quiser</span>
        </div>
      </section>

      {/* ── Rotating Pain Points ── */}
      <section id="como-funciona" className="py-24 px-6 bg-gradient-to-b from-[#050510] to-[#08081a]">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-xs uppercase tracking-widest text-[#52B788] font-bold mb-4">Sua realidade hoje</p>
          <h2 className="text-3xl sm:text-4xl font-bold mb-16">Reconhece alguma dessas situações?</h2>

          <div className="relative min-h-[200px] flex flex-col items-center justify-center">
            <div className={`transition-all duration-400 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}`}>
              {/* Pain */}
              <div className="bg-red-500/8 border border-red-500/20 rounded-2xl px-8 py-6 mb-6 max-w-2xl mx-auto">
                <p className="text-base sm:text-lg text-gray-200 leading-relaxed">
                  <span className="text-red-300 font-medium">&quot;{phrase.pain}&quot;</span>
                </p>
              </div>
              {/* Arrow */}
              <div className="text-[#52B788] text-2xl mb-6">↓</div>
              {/* Fix */}
              <div className="bg-green-500/8 border border-green-500/20 rounded-2xl px-8 py-5 max-w-2xl mx-auto">
                <p className="text-base sm:text-lg text-green-300 font-semibold">
                  Synka resolve: {phrase.fix}
                </p>
              </div>
            </div>

            {/* Dots */}
            <div className="flex gap-2 mt-10">
              {ROTATING_PHRASES.map((_, i) => (
                <button key={i} onClick={() => { setPhraseIdx(i); setVisible(true); }}
                  className={`h-1.5 rounded-full transition-all duration-300 ${i === phraseIdx ? 'w-6 bg-[#40916C]' : 'w-1.5 bg-white/20'}`} />
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
            { value: statCounts[1], suffix: 'h', label: 'de atendimento por dia', color: 'from-[#52B788] to-[#40916C]' },
            { value: statCounts[2], suffix: '+', label: 'mensagens automáticas/mês', color: 'from-[#40916C] to-[#2D6A4F]' },
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
            <p className="text-xs uppercase tracking-widest text-[#52B788] font-bold mb-3">Funcionalidades</p>
            <h2 className="text-3xl sm:text-4xl font-bold">Tudo que sua clínica precisa</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {BENEFITS.map(b => (
              <div key={b.title}
                className="group bg-[#0a1a14]/60 border border-white/5 hover:border-[#40916C]/30 rounded-2xl p-7 transition-all hover:-translate-y-1 hover:shadow-[0_8px_32px_rgba(64,145,108,0.12)]">
                <span className="text-[#52B788] mb-4 block">{BENEFIT_ICONS[b.title]}</span>
                <h3 className="font-bold text-base mb-2">{b.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="py-24 px-6 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-[#40916C]/10 via-transparent to-[#52B788]/10 pointer-events-none" />
        <div className="max-w-3xl mx-auto relative z-10">
          <h2 className="text-4xl sm:text-5xl font-extrabold mb-6 leading-tight">
            Comece hoje.<br />
            <span className="bg-gradient-to-r from-[#52B788] to-[#2D6A4F] bg-clip-text text-transparent">
              Primeiros 30 dias gratuitos.
            </span>
          </h2>
          <p className="text-gray-400 mb-10 text-lg">Sem cartão de crédito. Sem burocracia. Em 24h sua IA está no ar.</p>
          <Link href="/auth/login"
            className="inline-block px-10 py-5 bg-[#40916C] hover:bg-[#2D6A4F] rounded-2xl text-lg font-bold transition-all shadow-[0_8px_40px_rgba(64,145,108,0.5)] hover:shadow-[0_8px_56px_rgba(64,145,108,0.7)] hover:-translate-y-1">
            Criar minha conta grátis →
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-white border-t border-gray-100 py-20 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-10 text-xs text-gray-400 font-medium">
          <div className="text-center">
            © 2025 SOMMAR SOLUÇÕES DIGITAIS — CNPJ: 65.771.133/0001-07
          </div>
          <div className="flex gap-5">
            <a href="https://wa.me/5585991516106" className="hover:text-gray-700 transition-colors">WhatsApp</a>
            <a href="mailto:somar.solucoes.suporte@gmail.com" className="hover:text-gray-700 transition-colors">Suporte</a>
            <Link href="/auth/login" className="hover:text-gray-700 transition-colors">Login</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
