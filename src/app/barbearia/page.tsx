"use client";
import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";

/* ─── META / SEO (via next/head não é necessário em App Router) ─── */
// title: "Barbearia – Organize, Reduza Faltas e Aumente o Faturamento | Synka"
// description: "O Synka transforma sua barbearia com agendamento automático, lembretes pelo WhatsApp e uma vitrine digital dos seus serviços. Menos faltas, mais lucro."

/* ─── DORES ROTATIVAS ─── */
const DORES = [
  {
    dor: '"Cliente marcou, não apareceu e nem avisou."',
    fix: "Synka envia lembrete automático 24h antes. Falta zero.",
  },
  {
    dor: '"Fico no WhatsApp o dia inteiro respondendo horário."',
    fix: "Synka agenda pela IA. Você foca na tesoura.",
  },
  {
    dor: '"Agenda cheia no papel, mas cheia de buracos na prática."',
    fix: "Agenda digital em tempo real. Sem conflitos.",
  },
  {
    dor: '"Cliente não sabe o preço antes de chegar — gera atrito."',
    fix: "Vitrine de serviços com preços e fotos. Cliente já vem sabendo.",
  },
  {
    dor: '"Perdi cliente porque demorei a responder sábado à noite."',
    fix: "Synka atende e agenda 24h por dia, 7 dias por semana.",
  },
];

/* ─── SERVIÇOS / VITRINE ─── */
const SERVICOS = [
  {
    emoji: "✂️",
    nome: "Corte",
    preco: "R$ 35 – 50",
    desc: "Corte masculino com acabamento e lavagem inclusos.",
    destaque: false,
  },
  {
    emoji: "🪒",
    nome: "Barba",
    preco: "R$ 25 – 40",
    desc: "Barba na navalha com toalha quente e balm pós barba.",
    destaque: false,
  },
  {
    emoji: "🔥",
    nome: "Combo Corte + Barba",
    preco: "R$ 55 – 80",
    desc: "O combo mais pedido. O cliente gasta mais, você fatura mais.",
    destaque: true,
  },
  {
    emoji: "💈",
    nome: "Degradê",
    preco: "R$ 45 – 60",
    desc: "Fade técnico com máquina e acabamento a laser.",
    destaque: false,
  },
  {
    emoji: "🛒",
    nome: "Pomada / Produtos",
    preco: "A partir de R$ 30",
    desc: "Venda online direto no agendamento. Receita extra sem esforço.",
    destaque: false,
  },
  {
    emoji: "🎁",
    nome: "Pacote Mensal VIP",
    preco: "R$ 150/mês",
    desc: "4 cortes por mês + barba inclusa. Fidelização automática.",
    destaque: false,
  },
];

/* ─── DEPOIMENTOS ─── */
const DEPOIMENTOS = [
  {
    nome: "Thiago Henrique",
    negocio: "Barbearia TH Cortes – Belém/PA",
    avatar: "TH",
    texto: "Eu tinha vergonha da minha agenda. Caderninho rasgado, cliente ligando pra confirmar horário, barbeiro sem saber o que tinha no dia. Hoje tudo tá no painel. Parece outra barbearia.",
    estrelas: 5,
    color: "#b45309"
  },
  {
    nome: "Anderson Paiva",
    negocio: "Corte & Estilo Barbearia – Goiânia/GO",
    avatar: "AP",
    texto: "No primeiro mês reduzi 11 faltas. Cada falta era R$ 45. Você faz a conta. O Synka se pagou na primeira semana.",
    estrelas: 5,
    color: "#0f766e"
  },
  {
    nome: "Bruno Castilho",
    negocio: "Barbearia Castilho – Curitiba/PR",
    avatar: "BC",
    texto: "Meu cliente chegou na cadeira já sabendo que ia fazer combo corte + barba. Eu não precisei oferecer. A vitrine fez isso por mim.",
    estrelas: 5,
    color: "#7c3aed"
  },
  {
    nome: "Felipe Nogueira",
    negocio: "Barbearia do Nogueira – Fortaleza/CE",
    avatar: "FN",
    texto: "Trabalho sozinho. Não dá pra ficar no celular enquanto estou com tesoura na mão. O Synka responde o cliente, agenda e manda lembrete. Eu só corto.",
    estrelas: 5,
    color: "#be123c"
  },
  {
    nome: "Rodrigo Menezes",
    negocio: "RM Barbearia – Salvador/BA",
    avatar: "RM",
    texto: "Abri minha segunda unidade e achei que ia virar um caos. Com o Synka as duas agendas ficam num lugar só. Não me arrependo.",
    estrelas: 5,
    color: "#0369a1"
  },
  {
    nome: "Lucas Drummond",
    negocio: "Drummond Barber – Belo Horizonte/MG",
    avatar: "LD",
    texto: "Coloquei o link na bio do Instagram. Cliente clica, escolhe o horário e confirma. Sem me chamar no direct, sem confusão. Profissionalizou demais.",
    estrelas: 5,
    color: "#15803d"
  },
  {
    nome: "Caio Ferreira",
    negocio: "Barbearia Ferreira – Recife/PE",
    avatar: "CF",
    texto: "Tentei três aplicativos antes. Todos complicados demais. O Synka foi o único que configurei no mesmo dia e já saiu funcionando.",
    estrelas: 5,
    color: "#92400e"
  },
  {
    nome: "Mateus Oliveira",
    negocio: "Black Barber Shop – Porto Alegre/RS",
    avatar: "MO",
    texto: "Minha recepcionista ficou doente uma semana. A barbearia não parou. O sistema agendou tudo sozinho. Esse dia me convenceu de vez.",
    estrelas: 5,
    color: "#1d4ed8"
  }
];

/* ─── COMPONENTE PRINCIPAL ─── */
export default function PageBarbearia() {
  const [doreIdx, setDoreIdx] = useState(0);
  const [visible, setVisible] = useState(true);
  const [statCounts, setStatCounts] = useState([0, 0, 0]);
  const statsRef = useRef<HTMLDivElement>(null);

  /* rotação de dores */
  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setDoreIdx((i) => (i + 1) % DORES.length);
        setVisible(true);
      }, 350);
    }, 3800);
    return () => clearInterval(interval);
  }, []);

  /* contador animado */
  useEffect(() => {
    const targets = [70, 24, 40];
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          targets.forEach((target, idx) => {
            let count = 0;
            const step = Math.ceil(target / 60);
            const timer = setInterval(() => {
              count = Math.min(count + step, target);
              setStatCounts((prev) => {
                const n = [...prev];
                n[idx] = count;
                return n;
              });
              if (count >= target) clearInterval(timer);
            }, 25);
          });
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    if (statsRef.current) observer.observe(statsRef.current);
    return () => observer.disconnect();
  }, []);

  const dore = DORES[doreIdx];
  const WA_LINK =
    "https://wa.me/5585991516106?text=Ol%C3%A1!%20Vi%20o%20Synka%20para%20barbearia%20e%20quero%20saber%20mais.";
  const CADASTRO_LINK = "/auth/login";

  return (
    <div className="min-h-[100svh] bg-[#050510] text-white font-sans overflow-x-hidden">
      {/* ══════════════════════════════
          NAV
      ══════════════════════════════ */}
      <nav className="fixed top-0 w-full z-50 bg-white shadow-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <img src="/synka-logo.png" alt="Synka" className="h-10 object-contain" />
          <div className="flex items-center gap-3">
            <Link
              href="/planos"
              className="hidden sm:block text-sm text-gray-800 hover:text-[#40916C] font-bold transition-colors"
            >
              Planos e Preços
            </Link>
            <Link
              href={WA_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:block text-sm text-gray-500 hover:text-gray-800 font-medium transition-colors ml-4"
            >
              WhatsApp
            </Link>
            <Link
              href={CADASTRO_LINK}
              className="px-5 py-2 bg-[#40916C] hover:bg-[#2D6A4F] text-white rounded-xl text-sm font-semibold transition-all shadow-[0_4px_16px_rgba(64,145,108,0.35)]"
            >
              Testar Grátis
            </Link>
          </div>
        </div>
      </nav>

      {/* ══════════════════════════════
          HERO
      ══════════════════════════════ */}
      <section className="relative min-h-[100svh] flex flex-col items-center justify-center text-center px-6 pt-36 pb-20 overflow-hidden">
        {/* glow */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-[#40916C]/10 rounded-full blur-[130px]" />
          <div className="absolute top-2/3 left-1/4 w-[400px] h-[300px] bg-[#52B788]/6 rounded-full blur-[90px]" />
          <div className="absolute top-1/3 right-10 w-[300px] h-[300px] bg-[#1B4332]/20 rounded-full blur-[80px]" />
        </div>

        {/* badge nicho */}
        <div className="inline-flex items-center gap-2 bg-[#40916C]/10 border border-[#40916C]/25 rounded-full px-4 py-1.5 text-xs text-[#95D5B2] font-semibold uppercase tracking-widest mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-[#40916C] animate-pulse" />
          Para Barbearias
        </div>

        {/* headline */}
        <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold leading-tight max-w-5xl mb-6 tracking-tight">
          Ganhe mais dinheiro com{" "}
          <span className="bg-gradient-to-r from-[#52B788] to-[#95D5B2] bg-clip-text text-transparent">
            sua barbearia
          </span>
          {" "}usando uma agenda inteligente
        </h1>

        <p className="text-gray-400 text-xl max-w-2xl mb-4 leading-relaxed">
          Organize seus horários, reduza faltas e venda mais produtos automaticamente.
        </p>

        {/* micro-prova */}
        <p className="text-[#95D5B2] text-sm font-medium mb-10">
          ✓ Teste grátis por 30 dias &nbsp;·&nbsp; ✓ Planos a partir de R$ 37,90/mês &nbsp;·&nbsp; ✓ Cancele quando quiser
        </p>

        {/* CTAs */}
        <div className="flex flex-col items-center gap-2 mb-20 w-full sm:w-auto">
          <a
            href={WA_LINK}
            target="_blank"
            rel="noopener noreferrer"
            id="hero-cta-whatsapp"
            className="w-full sm:w-auto max-w-sm px-8 py-4 bg-[#40916C] hover:bg-[#2D6A4F] rounded-2xl text-base font-bold transition-all shadow-[0_8px_32px_rgba(64,145,108,0.45)] hover:shadow-[0_8px_44px_rgba(64,145,108,0.65)] hover:-translate-y-0.5 text-center flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            👉 Começar teste grátis no WhatsApp
          </a>
          <p className="text-gray-500 text-xs">Resposta rápida. Sem compromisso.</p>
        </div>

        {/* estatísticas rápidas hero */}
        <div className="flex flex-wrap justify-center gap-8 sm:gap-16 text-center">
          {[
            { val: "70%", label: "menos faltas" },
            { val: "24h", label: "funcionando sem parar" },
            { val: "+R$20", label: "ticket médio a mais por cliente" },
          ].map((s) => (
            <div key={s.val}>
              <p className="text-2xl font-extrabold text-[#52B788]">{s.val}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════
          BENEFÍCIOS — CARDS SIMPLES
      ══════════════════════════════ */}
      <section className="py-20 px-6 bg-[#050510]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-xs uppercase tracking-widest text-[#52B788] font-bold mb-3">O que você ganha</p>
            <h2 className="text-3xl sm:text-4xl font-bold">Por que barbeiros escolhem o Synka</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              {
                icon: "💰",
                title: "Venda mais em cada cliente",
                desc: "Ofereça produtos automaticamente durante o agendamento, como pomadas e combos de serviços.",
              },
              {
                icon: "📲",
                title: "Agenda automática no WhatsApp",
                desc: "Seus clientes agendam sozinhos, sem você precisar responder mensagem o tempo todo.",
              },
              {
                icon: "🚫",
                title: "Reduza faltas",
                desc: "Envie lembretes automáticos e cobre antecipado para garantir presença.",
              },
              {
                icon: "📸",
                title: "Poste antes e depois fácil",
                desc: "Tire fotos e o sistema monta imagens prontas para Instagram com autorização do cliente.",
              },
              {
                icon: "🛒",
                title: "Tenha sua vitrine pronta",
                desc: "Produtos já cadastrados para vender sem precisar configurar tudo do zero.",
              },
              {
                icon: "📋",
                title: "Tudo organizado",
                desc: "Controle seus clientes, histórico e atendimentos em um só lugar.",
              },
            ].map((card) => (
              <div
                key={card.title}
                className="group bg-[#0a1a14]/60 border border-white/5 hover:border-[#40916C]/30 rounded-2xl p-7 transition-all hover:-translate-y-1 hover:shadow-[0_8px_32px_rgba(64,145,108,0.12)]"
              >
                <span className="text-4xl mb-4 block">{card.icon}</span>
                <h3 className="font-bold text-base mb-2">{card.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{card.desc}</p>
              </div>
            ))}
          </div>
          <div className="flex flex-col items-center gap-2 mt-12">
            <a
              href={WA_LINK}
              target="_blank"
              rel="noopener noreferrer"
              id="cards-cta-whatsapp"
              className="inline-flex items-center justify-center gap-2 px-10 py-4 bg-[#40916C] hover:bg-[#2D6A4F] rounded-2xl text-base font-bold transition-all shadow-[0_8px_32px_rgba(64,145,108,0.4)] hover:-translate-y-0.5"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              👉 Começar teste grátis no WhatsApp
            </a>
            <p className="text-gray-500 text-xs">Resposta rápida. Sem compromisso.</p>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════
          DORES REAIS (ROTATIVAS)
      ══════════════════════════════ */}
      <section className="py-24 px-6 bg-gradient-to-b from-[#050510] to-[#08081a]">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-xs uppercase tracking-widest text-[#52B788] font-bold mb-4">
            O dia a dia da sua barbearia
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold mb-16">Você se reconhece nisso?</h2>

          <div className="relative min-h-[220px] flex flex-col items-center justify-center">
            <div
              style={{
                transition: "opacity 350ms ease, transform 350ms ease",
                opacity: visible ? 1 : 0,
                transform: visible ? "translateY(0)" : "translateY(10px)",
              }}
              className="w-full"
            >
              {/* Dor */}
              <div className="bg-red-500/8 border border-red-500/20 rounded-2xl px-8 py-7 mb-6 max-w-2xl mx-auto">
                <p className="text-base sm:text-lg text-red-300 font-medium leading-relaxed">
                  {dore.dor}
                </p>
              </div>
              {/* seta */}
              <div className="text-[#52B788] text-3xl mb-6">↓</div>
              {/* Solução */}
              <div className="bg-green-500/8 border border-green-500/20 rounded-2xl px-8 py-6 max-w-2xl mx-auto">
                <p className="text-base sm:text-lg text-green-300 font-semibold">{dore.fix}</p>
              </div>
            </div>

            {/* dots */}
            <div className="flex gap-2 mt-10">
              {DORES.map((_, i) => (
                <button
                  key={i}
                  onClick={() => { setDoreIdx(i); setVisible(true); }}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === doreIdx ? "w-6 bg-[#40916C]" : "w-1.5 bg-white/20"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════
          QUEBRA DE PADRÃO
      ══════════════════════════════ */}
      <section className="py-20 px-6 bg-[#08081a]">
        <div className="max-w-3xl mx-auto text-center">
          <div className="bg-gradient-to-br from-[#1B4332]/50 to-[#0a1a14]/80 border border-[#40916C]/20 rounded-3xl px-8 sm:px-14 py-14">
            <p className="text-lg text-gray-400 mb-4">O problema real não é só agenda bagunçada…</p>
            <h2 className="text-3xl sm:text-5xl font-extrabold leading-tight mb-6">
              É o{" "}
              <span className="bg-gradient-to-r from-[#52B788] to-[#95D5B2] bg-clip-text text-transparent">
                dinheiro que você deixa de ganhar
              </span>{" "}
              todo mês.
            </h2>
            <p className="text-gray-400 text-base sm:text-lg leading-relaxed">
              Um barbeiro que atende 20 clientes por dia e tem <strong className="text-white">2 faltas por dia</strong>{" "}
              perde cerca de{" "}
              <strong className="text-red-400">R$ 1.400 por mês</strong> em horários vazios.{" "}
              <span className="text-[#52B788] font-semibold">
                O Synka paga o próprio investimento no primeiro dia de uso.
              </span>
            </p>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════
          STATS ANIMADOS
      ══════════════════════════════ */}
      <section ref={statsRef} className="py-20 px-6 bg-[#08081a]">
        <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
          {[
            { value: statCounts[0], suffix: "%", label: "de redução em faltas", color: "from-green-400 to-emerald-300" },
            { value: statCounts[1], suffix: "h", label: "de atendimento automático por dia", color: "from-[#52B788] to-[#40916C]" },
            { value: statCounts[2], suffix: "%", label: "de aumento no ticket médio com vitrine", color: "from-[#95D5B2] to-[#52B788]" },
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

      {/* ══════════════════════════════
          SOLUÇÃO — O QUE O SYNKA FAZ
      ══════════════════════════════ */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs uppercase tracking-widest text-[#52B788] font-bold mb-3">A solução</p>
            <h2 className="text-3xl sm:text-4xl font-bold">
              Tudo que sua barbearia precisa — num só lugar
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              {
                icon: (
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
                ),
                title: "IA que agenda pelo WhatsApp",
                desc: "Seu cliente manda mensagem, a IA responde, oferta horários e confirma tudo. Automático. Você não precisa tocar no celular.",
              },
              {
                icon: (
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                ),
                title: "Agenda digital em tempo real",
                desc: "Você e sua equipe veem todos os horários num painel limpo. Sem caderninho, sem confusão, sem conflito de horários.",
              },
              {
                icon: (
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
                ),
                title: "Lembretes automáticos",
                desc: "24h antes do horário, o cliente recebe o lembrete no WhatsApp e confirma com um clique. Falta? Quase nunca mais.",
              },
              {
                icon: (
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 7V5a2 2 0 00-4 0v2M12 12v4M10 14h4"/></svg>
                ),
                title: "Vitrine de serviços digital",
                desc: "Exiba seus cortes, combos e produtos com preços e fotos. O cliente escolhe antes de chegar, aumenta o ticket e reduz conversas desnecessárias.",
              },
              {
                icon: (
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
                ),
                title: "Relatórios do seu negócio",
                desc: "Veja quantos clientes atendeu, taxa de confirmação, serviços mais pedidos e quanto faturou. Decisão com dados.",
              },
              {
                icon: (
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                ),
                title: "Ativo em menos de 24h",
                desc: "Sem instalar nada. Sem contratar TI. Conecta o WhatsApp, cadastra seus serviços e começa a ganhar. É isso.",
              },
            ].map((b) => (
              <div
                key={b.title}
                className="group bg-[#0a1a14]/60 border border-white/5 hover:border-[#40916C]/30 rounded-2xl p-7 transition-all hover:-translate-y-1 hover:shadow-[0_8px_32px_rgba(64,145,108,0.12)]"
              >
                <span className="text-[#52B788] mb-4 block">{b.icon}</span>
                <h3 className="font-bold text-base mb-2">{b.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════
          VEJA O SISTEMA POR DENTRO
      ══════════════════════════════ */}
      <section className="synka-prints-section py-24 px-6 bg-[#f9fafb]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4 tracking-tight">
              Veja o sistema por dentro
            </h2>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto leading-relaxed">
              Interface simples. Feita para quem trabalha, não para quem entende de tecnologia.
            </p>
          </div>

          <div className="flex overflow-x-auto lg:grid lg:grid-cols-3 gap-8 pb-8 lg:pb-0 snap-x snap-mandatory scroll-smooth no-scrollbar">
            {[
              { src: "/print1.jpg", legend: "Agenda do dia em tempo real" },
              { src: "/print2.jpg", legend: "Convênios integrados ao sistema" },
              { src: "/print3.jpg", legend: "Prontuário digital do paciente" },
              { src: "/print4.jpg", legend: "Agendamento em 3 passos simples" },
              { src: "/print5.jpg", legend: "Serviço, profissional e horário numa tela" },
              { src: "/print6.jpg", legend: "Confirmação com lembrete automático no WhatsApp" },
            ].map((print, i) => (
              <div 
                key={i} 
                className="snap-center shrink-0 w-[80vw] sm:w-[45vw] lg:w-auto hover:scale-[1.02] transition-transform duration-200"
              >
                <div className="bg-white p-2 rounded-2xl shadow-sm border border-gray-100 h-full">
                  <div className="aspect-video overflow-hidden rounded-xl bg-gray-100 mb-4 shadow-inner">
                    <img 
                      src={print.src} 
                      alt={print.legend} 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <p className="text-center text-xs text-gray-500 font-medium px-4 pb-2">
                    {print.legend}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <style jsx>{`
          .no-scrollbar::-webkit-scrollbar {
            display: none;
          }
          .no-scrollbar {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
        `}</style>
      </section>


      {/* ══════════════════════════════
          🔥 VITRINE DE SERVIÇOS
      ══════════════════════════════ */}
      <section className="py-24 px-6 bg-gradient-to-b from-[#08081a] to-[#050510]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 bg-[#40916C]/10 border border-[#40916C]/25 rounded-full px-4 py-1.5 text-xs text-[#95D5B2] font-semibold uppercase tracking-widest mb-6">
              <span>🔥</span> Recurso exclusivo
            </div>
            <h2 className="text-3xl sm:text-5xl font-bold mb-4">
              Sua vitrine de serviços{" "}
              <span className="bg-gradient-to-r from-[#52B788] to-[#95D5B2] bg-clip-text text-transparent">
                dentro do agendamento
              </span>
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Seu cliente não só agenda — ele <strong className="text-white">escolhe o serviço, vê o preço e já sabe quanto vai pagar</strong> antes de sair de casa. Mais profissionalismo. Mais faturamento.
            </p>
          </div>

          {/* Destaque do recurso */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10 text-center">
            {[
              { icon: "💡", text: "Cliente escolhe o serviço antes de chegar" },
              { icon: "💰", text: "Combos aumentam o ticket médio sem você precisar insistir" },
              { icon: "📸", text: "Mostre fotos dos seus trabalhos com cada serviço" },
            ].map((item) => (
              <div
                key={item.text}
                className="flex items-center gap-3 bg-[#0a1a14]/60 border border-[#40916C]/15 rounded-xl px-5 py-4 text-left text-sm text-gray-300"
              >
                <span className="text-2xl">{item.icon}</span>
                <span>{item.text}</span>
              </div>
            ))}
          </div>

          {/* Cards de serviços — simulação da vitrine */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {SERVICOS.map((s) => (
              <div
                key={s.nome}
                className={`relative rounded-2xl p-6 border transition-all group hover:-translate-y-1
                  ${s.destaque
                    ? "bg-gradient-to-br from-[#1B4332] to-[#0a1a14] border-[#52B788]/50 shadow-[0_4px_32px_rgba(64,145,108,0.25)]"
                    : "bg-[#0a1a14]/70 border-white/8 hover:border-[#40916C]/30"
                  }`}
              >
                {s.destaque && (
                  <span className="absolute top-4 right-4 bg-[#40916C] text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide">
                    Mais pedido
                  </span>
                )}
                <span className="text-4xl mb-4 block">{s.emoji}</span>
                <h3 className="font-extrabold text-lg mb-1">{s.nome}</h3>
                <p className="text-[#52B788] font-bold text-base mb-3">{s.preco}</p>
                <p className="text-gray-400 text-sm leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>

          <p className="text-center text-gray-500 text-sm mt-8">
            ↑ Exemplo de vitrine. Você cadastra os seus serviços com preços reais, fotos e descrição.
          </p>
        </div>
      </section>

      {/* ══════════════════════════════
          COMO FUNCIONA
      ══════════════════════════════ */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs uppercase tracking-widest text-[#52B788] font-bold mb-3">Processo</p>
            <h2 className="text-3xl sm:text-4xl font-bold">Como funciona na prática</h2>
          </div>
          <div className="space-y-5">
            {[
              {
                step: "01",
                title: "Cliente entra em contato",
                desc: "Pelo WhatsApp, link na bio ou QR Code da sua barbearia. A IA atende na hora.",
              },
              {
                step: "02",
                title: "Escolhe o serviço na vitrine",
                desc: "O cliente vê corte, barba, combos e produtos com preços. Ele escolhe antes de chegar.",
              },
              {
                step: "03",
                title: "Agenda o horário",
                desc: "A IA mostra os horários disponíveis e confirma tudo automaticamente. Sem você tocar no celular.",
              },
              {
                step: "04",
                title: "Recebe lembrete automático",
                desc: "24h antes, o Synka manda lembrete no WhatsApp. O cliente confirma com um clique. Falta quase não existe mais.",
              },
              {
                step: "05",
                title: "Você só foca em cortar bem",
                desc: "Sem ficar no celular, sem agenda bagunçada, sem estresse. Mais clientes, mais faturamento, menos dor de cabeça.",
              },
            ].map((item, i) => (
              <div
                key={i}
                className="flex gap-5 bg-[#0a1a14]/50 border border-white/5 hover:border-[#40916C]/20 rounded-2xl px-6 py-5 transition-all group"
              >
                <span className="text-3xl font-extrabold text-[#40916C]/40 group-hover:text-[#40916C]/70 transition-colors shrink-0 w-10">
                  {item.step}
                </span>
                <div>
                  <h3 className="font-bold text-base mb-1">{item.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════
          PROVA SOCIAL / DEPOIMENTOS
      ══════════════════════════════ */}
      <section className="py-24 px-6 bg-[#08081a]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs uppercase tracking-widest text-[#52B788] font-bold mb-3">Donos de barbearia falam</p>
            <h2 className="text-3xl sm:text-4xl font-bold">Resultado real, no bolso de quem usou</h2>
          </div>
          <div className="flex flex-wrap justify-center gap-6">
            {DEPOIMENTOS.map((d) => (
              <div
                key={d.nome}
                className="w-full md:w-[calc(50%-1.5rem)] lg:w-[calc(33.333%-1.5rem)] bg-[#0a1a14]/70 border border-white/8 rounded-2xl p-7 hover:border-[#40916C]/25 transition-all hover:-translate-y-0.5"
              >
                {/* estrelas */}
                <div className="flex gap-0.5 mb-4">
                  {Array(d.estrelas).fill(null).map((_, i) => (
                    <svg key={i} className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="text-gray-300 text-sm leading-relaxed mb-5 italic">"{d.texto}"</p>
                <div className="flex items-center gap-3">
                  <div 
                    className="w-9 h-9 rounded-full border flex items-center justify-center text-xs font-bold shrink-0"
                    style={{ backgroundColor: d.color + '20', borderColor: d.color + '40', color: d.color }}
                  >
                    {d.avatar}
                  </div>
                  <div>
                    <p className="font-bold text-sm">{d.nome}</p>
                    <p className="text-gray-500 text-xs">{d.negocio}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════
          BENEFÍCIOS DIRETOS
      ══════════════════════════════ */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-12">
            Com o Synka, sua barbearia…
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { emoji: "📉", texto: "Tem menos faltas e horários vazios" },
              { emoji: "💰", texto: "Aumenta o ticket médio com combos e produtos" },
              { emoji: "📱", texto: "Para de perder tempo respondendo WhatsApp" },
              { emoji: "😌", texto: "Você trabalha com menos estresse e mais foco" },
              { emoji: "🏆", texto: "Passa profissionalismo e confiança ao cliente" },
              { emoji: "🚀", texto: "Fatura mais sem precisar contratar mais ninguém" },
            ].map((item) => (
              <div
                key={item.texto}
                className="flex items-center gap-4 bg-[#0a1a14]/50 border border-white/5 rounded-xl px-5 py-4 hover:border-[#40916C]/20 transition-all"
              >
                <span className="text-2xl shrink-0">{item.emoji}</span>
                <span className="text-sm text-gray-300 font-medium">{item.texto}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════
          CTA FINAL
      ══════════════════════════════ */}
      <section className="py-28 px-6 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-[#40916C]/12 via-transparent to-[#52B788]/12 pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-[#40916C]/8 rounded-full blur-[120px] pointer-events-none" />
        <div className="max-w-3xl mx-auto relative z-10">
          <div className="inline-flex items-center gap-2 bg-[#40916C]/10 border border-[#40916C]/25 rounded-full px-4 py-1.5 text-xs text-[#95D5B2] font-semibold uppercase tracking-widest mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-[#40916C] animate-pulse" />
            Oferta de lançamento
          </div>
          <h2 className="text-4xl sm:text-6xl font-extrabold mb-6 leading-tight">
            Chega de perder dinheiro.<br />
            <span className="bg-gradient-to-r from-[#52B788] to-[#2D6A4F] bg-clip-text text-transparent">
              Comece grátis hoje.
            </span>
          </h2>
          <p className="text-gray-400 mb-4 text-lg">
            30 dias gratuitos. Planos a partir de R$ 37,90/mês.
          </p>
          <p className="text-gray-500 text-sm mb-10">
            Em menos de 24h sua barbearia já recebe agendamentos automaticamente e para de perder dinheiro.
          </p>
          {/* Garantias antes dos planos */}
          <div className="flex flex-wrap justify-center gap-6 mb-10">
            {[
              "✔ Teste grátis por 30 dias",
              "✔ Sem contrato",
              "✔ Cancele quando quiser",
            ].map((g) => (
              <span key={g} className="text-[#95D5B2] font-semibold text-sm">{g}</span>
            ))}
          </div>
          <div className="flex flex-col items-center gap-2 justify-center">
            <a
              href={WA_LINK}
              target="_blank"
              rel="noopener noreferrer"
              id="cta-final-whatsapp"
              className="inline-flex items-center justify-center gap-2 px-10 py-5 bg-[#40916C] hover:bg-[#2D6A4F] rounded-2xl text-lg font-bold transition-all shadow-[0_8px_40px_rgba(64,145,108,0.5)] hover:shadow-[0_8px_56px_rgba(64,145,108,0.7)] hover:-translate-y-1"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              👉 Começar teste grátis no WhatsApp
            </a>
            <p className="text-gray-500 text-sm mt-1">Resposta rápida. Sem compromisso.</p>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════
          FOOTER
      ══════════════════════════════ */}
      <footer className="bg-white border-t border-gray-100 py-20 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-10 text-xs text-gray-400 font-medium">
          <div className="text-center">
            © 2025 SOMMAR SOLUÇÕES DIGITAIS — CNPJ: 65.771.133/0001-07
          </div>
          <div className="flex gap-5">
            <a
              href={WA_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-gray-700 transition-colors"
            >
              WhatsApp
            </a>
            <a href="mailto:somar.solucoes.suporte@gmail.com" className="hover:text-gray-700 transition-colors">
              Suporte
            </a>
            <Link href="/auth/login" className="hover:text-gray-700 transition-colors">
              Login
            </Link>
          </div>
        </div>
      </footer>

      {/* Botão WhatsApp Flutuante */}
      <a
        href={WA_LINK}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-[#25D366] text-white p-4 sm:px-5 sm:py-3 rounded-full shadow-lg hover:scale-105 hover:brightness-90 transition-all duration-200 group"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="28" height="28" fill="white">
          <path d="M16 0C7.163 0 0 7.163 0 16c0 2.833.738 5.494 2.031 7.807L0 32l8.418-2.007A15.934 15.934 0 0 0 16 32c8.837 0 16-7.163 16-16S24.837 0 16 0zm0 29.333a13.267 13.267 0 0 1-6.756-1.839l-.485-.287-5.002 1.193 1.215-4.872-.317-.5A13.226 13.226 0 0 1 2.667 16C2.667 8.636 8.636 2.667 16 2.667S29.333 8.636 29.333 16 23.364 29.333 16 29.333zm7.27-9.862c-.398-.199-2.354-1.162-2.718-1.294-.364-.133-.63-.199-.895.199-.265.398-1.029 1.294-1.261 1.56-.232.265-.464.298-.862.1-.398-.2-1.682-.62-3.204-1.977-1.184-1.057-1.983-2.362-2.215-2.76-.232-.398-.025-.613.174-.811.179-.178.398-.464.597-.696.199-.232.265-.398.398-.664.133-.265.066-.497-.033-.696-.1-.199-.895-2.157-1.227-2.953-.323-.775-.65-.67-.895-.682l-.762-.013c-.265 0-.696.1-1.061.497-.364.398-1.393 1.361-1.393 3.319 0 1.957 1.426 3.848 1.625 4.113.199.265 2.806 4.284 6.797 6.009.95.41 1.691.655 2.269.839.953.304 1.82.261 2.506.158.764-.114 2.354-.963 2.686-1.893.332-.93.332-1.727.232-1.893-.099-.166-.364-.265-.762-.464z"/>
        </svg>
        <span className="hidden sm:inline font-bold text-sm pr-1">Fale com nossa equipe agora</span>
      </a>
    </div>
  );
}
