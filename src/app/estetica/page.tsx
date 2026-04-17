"use client";
import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Script from "next/script";
/* ─── GATILHOS HERO ROTATIVOS ─── */
const GATILHOS = [
  {
    linha1: "Aqui você vai",
    destaque: "vender mais.",
  },
  {
    linha1: "Receba o pagamento",
    destaque: "na hora do agendamento.",
  },
  {
    linha1: "Venda combos e produtos",
    destaque: "pela sua vitrine online.",
  },
  {
    linha1: "Cliente sumiu?",
    destaque: "O sistema chama ele de volta.",
  },
  {
    linha1: "Chega de falta sem aviso.",
    destaque: "WhatsApp confirma sozinho.",
  },
];

/* ─── DORES ROTATIVAS ─── */
const DORES = [
  {
    dor: '"Cliente marcou procedimento, não apareceu e nem avisou."',
    fix: "Synka envia lembrete automático 24h antes. Agenda respeitada.",
  },
  {
    dor: '"Passo o dia no WhatsApp tentando confirmar os horários."',
    fix: "IA confirma por você. Você foca nos procedimentos.",
  },
  {
    dor: '"Cliente não sabe o preço dos procedimentos antes de chegar — negocia na hora."',
    fix: "Vitrine digital com preços e fotos. Cliente chega decidido.",
  },
  {
    dor: '"Agenda vazia na segunda e terça, lotada no fim de semana."',
    fix: "IA distribui os horários e preenche os buracos automaticamente.",
  },
  {
    dor: '"Perco pacientes fiéis porque esqueço de lembrá-los de retornar."',
    fix: "Lembretes de retorno automáticos. Fidelização no piloto automático.",
  },
];

/* ─── PROCEDIMENTOS / VITRINE ─── */
const PROCEDIMENTOS = [
  {
    emoji: "✨",
    nome: "Limpeza de Pele",
    preco: "R$ 120 – 180",
    desc: "Limpeza profunda com extração e máscara calmante. Alta procura, ideal para fidelizar.",
    destaque: false,
  },
  {
    emoji: "💉",
    nome: "Toxina Botulínica",
    preco: "R$ 600 – 1.500",
    desc: "Procedimento de alto ticket. Apresente com foto do resultado e agende online.",
    destaque: true,
  },
  {
    emoji: "🌿",
    nome: "Peeling Químico",
    preco: "R$ 200 – 400",
    desc: "Renovação celular com diferentes ácidos. Ofereça o pacote de 3 sessões e aumente o ticket.",
    destaque: false,
  },
  {
    emoji: "💆",
    nome: "Drenagem Linfática",
    preco: "R$ 90 – 150",
    desc: "Drenagem manual ou com aparelho. Venda pacotes de sessões direto na vitrine.",
    destaque: false,
  },
  {
    emoji: "⚡",
    nome: "Radiofrequência",
    preco: "R$ 180 – 350",
    desc: "Tratamento de firmeza e contorno facial. Pacotes de 5 ou 10 sessões com desconto.",
    destaque: false,
  },
  {
    emoji: "🎁",
    nome: "Pacote VIP Mensal",
    preco: "A partir de R$ 400/mês",
    desc: "Combine procedimentos no pacote e fidelize o cliente todo mês. Receita recorrente garantida.",
    destaque: false,
  },
];

/* ─── DEPOIMENTOS ─── */
const DEPOIMENTOS = [
  {
    nome: "Camila Rocha",
    negocio: "Studio Camila Estética – Fortaleza/CE",
    avatar: "CR",
    texto:
      "Eu tinha uma média de 6 faltas por semana. Com o Synka, caiu para quase zero. Só isso já pagou o sistema várias vezes. Ainda nem entrei nas outras funções.",
    estrelas: 5,
  },
  {
    nome: "Patrícia Duarte",
    negocio: "Clínica PD Estética – São Paulo/SP",
    avatar: "PD",
    texto:
      "Coloquei todos os procedimentos na vitrine com preços e fotos. As clientes chegam sabendo exatamente o que querem. Ticket médio subiu uns R$ 80 por visita.",
    estrelas: 5,
  },
  {
    nome: "Aline Menezes",
    negocio: "Espaco Aline Beauty – Recife/PE",
    avatar: "AM",
    texto:
      "Antes eu passava 2h por dia respondendo WhatsApp. Agora a IA faz tudo. Uso esse tempo para atender mais clientes. Simples assim.",
    estrelas: 5,
  },
];

/* ─── COMPONENTE PRINCIPAL ─── */
export default function PageEstetica() {
  const [gatilhoIdx, setGatilhoIdx] = useState(0);
  const [gatilhoVisible, setGatilhoVisible] = useState(true);
  const [doreIdx, setDoreIdx] = useState(0);
  const [visible, setVisible] = useState(true);
  const [statCounts, setStatCounts] = useState([0, 0, 0]);
  const statsRef = useRef<HTMLDivElement>(null);

  /* rotação de gatilhos hero */
  useEffect(() => {
    const interval = setInterval(() => {
      setGatilhoVisible(false);
      setTimeout(() => {
        setGatilhoIdx((i) => (i + 1) % GATILHOS.length);
        setGatilhoVisible(true);
      }, 350);
    }, 3500);
    return () => clearInterval(interval);
  }, []);

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
    const targets = [70, 24, 80];
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
    "https://wa.me/5585991516106?text=Ol%C3%A1!%20Vi%20o%20Synka%20para%20est%C3%A9tica%20e%20quero%20saber%20mais.";
  const CADASTRO_LINK = "/auth/login";

  return (
    <div className="min-h-[100svh] bg-[#050510] text-white font-sans overflow-x-hidden">
      <Script id="clarity-script" strategy="afterInteractive">
        {`
          (function(c,l,a,r,i,t,y){
              c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
              t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
              y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
          })(window, document, "clarity", "script", "wcsspu8dwd");
        `}
      </Script>

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
          <div className="absolute top-2/3 right-1/4 w-[400px] h-[300px] bg-[#9B5DE5]/6 rounded-full blur-[90px]" />
          <div className="absolute top-1/3 left-10 w-[300px] h-[300px] bg-[#1B4332]/20 rounded-full blur-[80px]" />
        </div>

        {/* badge nicho */}
        <div className="inline-flex items-center gap-2 bg-[#40916C]/10 border border-[#40916C]/25 rounded-full px-4 py-1.5 text-xs text-[#95D5B2] font-semibold uppercase tracking-widest mb-5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#40916C] animate-pulse" />
          Para Clínicas de Estética
        </div>

        {/* barra de nichos — mostra amplitude do sistema */}
        <div className="w-full max-w-2xl mb-8 overflow-x-auto scrollbar-none">
          <div className="flex items-center gap-0 whitespace-nowrap justify-center flex-wrap gap-y-1">
            {[
              "Clínica de Estética",
              "Salão de Beleza",
              "Barbearia",
              "Clínica Médica",
              "Odontologia",
              "Nutrição",
              "Psicologia",
              "Fisioterapia",
              "e muito mais…",
            ].map((nicho, i, arr) => (
              <span key={nicho} className="flex items-center">
                <span className={`text-[11px] font-medium px-1.5 ${i === arr.length - 1 ? "text-[#52B788]" : "text-gray-500"}`}>
                  {nicho}
                </span>
                {i < arr.length - 1 && (
                  <span className="text-gray-700 text-[11px] select-none">·</span>
                )}
              </span>
            ))}
          </div>
        </div>

        {/* headline rotativa */}
        <h1
          className="text-4xl sm:text-6xl md:text-7xl font-extrabold leading-tight max-w-5xl mb-6 tracking-tight transition-opacity duration-300"
          style={{ opacity: gatilhoVisible ? 1 : 0 }}
        >
          {GATILHOS[gatilhoIdx].linha1}{" "}
          <span className="bg-gradient-to-r from-[#52B788] to-[#95D5B2] bg-clip-text text-transparent">
            {GATILHOS[gatilhoIdx].destaque}
          </span>
        </h1>

        <p className="text-gray-400 text-xl max-w-2xl mb-4 leading-relaxed">
          Agenda online, pagamento antecipado, vitrine de produtos e lembretes automáticos — tudo no seu WhatsApp.
        </p>

        <div className="flex flex-wrap justify-center gap-2 mb-10">
          {[
            { icon: "✓", text: "30 dias grátis" },
            { icon: "✓", text: "Sem cartão de crédito" },
            { icon: "✓", text: "A partir de R$ 37,90/mês" },
            { icon: "✓", text: "Cancele quando quiser" },
          ].map((g) => (
            <span
              key={g.text}
              className="inline-flex items-center gap-1.5 bg-[#40916C]/10 border border-[#40916C]/20 text-[#95D5B2] text-xs font-semibold px-3 py-1.5 rounded-full"
            >
              <span className="text-[#52B788]">{g.icon}</span>
              {g.text}
            </span>
          ))}
        </div>

        {/* CTAs */}
        <div className="flex flex-col items-center gap-2 mb-20 w-full sm:w-auto">
          <a
            href={WA_LINK}
            target="_blank"
            rel="noopener noreferrer"
            id="hero-cta-whatsapp-estetica"
            className="w-full sm:w-auto max-w-sm px-8 py-4 bg-[#40916C] hover:bg-[#2D6A4F] rounded-2xl text-base font-bold transition-all shadow-[0_8px_32px_rgba(64,145,108,0.45)] hover:shadow-[0_8px_44px_rgba(64,145,108,0.65)] hover:-translate-y-0.5 text-center flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            👉 Começar teste grátis no WhatsApp
          </a>
          <p className="text-gray-500 text-xs">Atendimento rápido. Sem compromisso.</p>
        </div>

        {/* micro-stats hero */}
        <div className="flex flex-wrap justify-center gap-8 sm:gap-16 text-center">
          {[
            { val: "70%", label: "menos faltas e no-shows" },
            { val: "24h", label: "atendendo automaticamente" },
            { val: "+R$80", label: "de ticket médio com vitrine" },
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
            <p className="text-xs uppercase tracking-widest text-[#52B788] font-bold mb-3">O que você conquista</p>
            <h2 className="text-3xl sm:text-4xl font-bold">Por que clínicas escolhem o Synka</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              {
                icon: "💰",
                title: "Aumente seu faturamento",
                desc: "Ofereça serviços e produtos automaticamente durante o agendamento, elevando o ticket de cada atendimento.",
              },
              {
                icon: "📅",
                title: "Agendamento automático",
                desc: "Seus clientes agendam sozinhos pelo WhatsApp ou link, a qualquer hora, sem depender de você.",
              },
              {
                icon: "🔔",
                title: "Reduza faltas",
                desc: "Lembretes automáticos e possibilidade de cobrança antecipada mantêm sua agenda sempre cheia.",
              },
              {
                icon: "📸",
                title: "Antes e depois profissional",
                desc: "Registre fotos e gere imagens prontas para redes sociais com autorização do cliente.",
              },
              {
                icon: "🧠",
                title: "Prontuário inteligente",
                desc: "Organize informações dos atendimentos com ajuda de inteligência artificial, sem papelada.",
              },
              {
                icon: "🏆",
                title: "Atendimento mais profissional",
                desc: "Tenha histórico completo de cada cliente e mais controle sobre o crescimento da sua clínica.",
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
              id="cards-cta-whatsapp-estetica"
              className="inline-flex items-center justify-center gap-2 px-10 py-4 bg-[#40916C] hover:bg-[#2D6A4F] rounded-2xl text-base font-bold transition-all shadow-[0_8px_32px_rgba(64,145,108,0.4)] hover:-translate-y-0.5"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              👉 Começar teste grátis no WhatsApp
            </a>
            <p className="text-gray-500 text-xs">Atendimento rápido. Sem compromisso.</p>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════
          DORES ROTATIVAS
      ══════════════════════════════ */}
      <section className="py-24 px-6 bg-gradient-to-b from-[#050510] to-[#08081a]">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-xs uppercase tracking-widest text-[#52B788] font-bold mb-4">
            A realidade de quem cuida da beleza dos outros
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold mb-16">Você vive alguma dessas situações?</h2>

          <div className="relative min-h-[220px] flex flex-col items-center justify-center">
            <div
              style={{
                transition: "opacity 350ms ease, transform 350ms ease",
                opacity: visible ? 1 : 0,
                transform: visible ? "translateY(0)" : "translateY(10px)",
              }}
              className="w-full"
            >
              <div className="bg-red-500/8 border border-red-500/20 rounded-2xl px-8 py-7 mb-6 max-w-2xl mx-auto">
                <p className="text-base sm:text-lg text-red-300 font-medium leading-relaxed">
                  {dore.dor}
                </p>
              </div>
              <div className="text-[#52B788] text-3xl mb-6">↓</div>
              <div className="bg-green-500/8 border border-green-500/20 rounded-2xl px-8 py-6 max-w-2xl mx-auto">
                <p className="text-base sm:text-lg text-green-300 font-semibold">{dore.fix}</p>
              </div>
            </div>

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
            <p className="text-lg text-gray-400 mb-4">O problema real não é só agenda desorganizada…</p>
            <h2 className="text-3xl sm:text-5xl font-extrabold leading-tight mb-6">
              É o{" "}
              <span className="bg-gradient-to-r from-[#52B788] to-[#95D5B2] bg-clip-text text-transparent">
                potencial que você deixa na mesa
              </span>{" "}
              todo mês.
            </h2>
            <p className="text-gray-400 text-base sm:text-lg leading-relaxed">
              Uma esteticista que realiza 15 procedimentos por semana e tem{" "}
              <strong className="text-white">3 faltas semanais</strong> perde cerca de{" "}
              <strong className="text-red-400">R$ 1.800 por mês</strong> — fora as sessões de retorno que o
              cliente esquece de agendar.{" "}
              <span className="text-[#52B788] font-semibold">
                O Synka recupera esse dinheiro no primeiro mês de uso.
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
            { value: statCounts[0], suffix: "%", label: "de redução em faltas e cancelamentos", color: "from-green-400 to-emerald-300" },
            { value: statCounts[1], suffix: "h", label: "de atendimento automático por dia", color: "from-[#52B788] to-[#40916C]" },
            { value: statCounts[2], suffix: "%", label: "de aumento no ticket médio com vitrine de procedimentos", color: "from-[#95D5B2] to-[#52B788]" },
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
          SOLUÇÃO
      ══════════════════════════════ */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs uppercase tracking-widest text-[#52B788] font-bold mb-3">A solução</p>
            <h2 className="text-3xl sm:text-4xl font-bold">
              Tudo que sua clínica de estética precisa — num só lugar
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              {
                icon: (
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
                ),
                title: "IA que agenda pelo WhatsApp",
                desc: "A cliente manda mensagem, a IA responde na hora, mostra os procedimentos disponíveis e agenda tudo. Você nem precisa pegar o celular.",
              },
              {
                icon: (
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                ),
                title: "Agenda digital em tempo real",
                desc: "Painel completo para ver todos os procedimentos agendados. Sem caderninho, sem confusão, sem conflito de horários na cabine.",
              },
              {
                icon: (
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
                ),
                title: "Lembretes automáticos",
                desc: "24h antes do procedimento, a cliente recebe lembrete no WhatsApp e confirma com um clique. Falta? Quase nunca mais.",
              },
              {
                icon: (
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 7V5a2 2 0 00-4 0v2M12 12v4M10 14h4"/></svg>
                ),
                title: "Vitrine de procedimentos",
                desc: "Exiba limpeza de pele, botox, peeling, radiofrequência com fotos e preços. A cliente escolhe e agenda sem precisar de você.",
              },
              {
                icon: (
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
                ),
                title: "Lembretes de retorno",
                desc: "Após o procedimento, o Synka avisa automaticamente quando a cliente deve retornar. Fideliza sem nenhum esforço da sua parte.",
              },
              {
                icon: (
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                ),
                title: "Ativo em menos de 24h",
                desc: "Sem instalar nada. Sem contratar TI. Conecta o WhatsApp, cadastra seus procedimentos e começa a atender. É isso.",
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
          🔥 VITRINE DE PROCEDIMENTOS
      ══════════════════════════════ */}
      <section className="py-24 px-6 bg-gradient-to-b from-[#08081a] to-[#050510]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 bg-[#40916C]/10 border border-[#40916C]/25 rounded-full px-4 py-1.5 text-xs text-[#95D5B2] font-semibold uppercase tracking-widest mb-6">
              <span>🔥</span> Recurso exclusivo
            </div>
            <h2 className="text-3xl sm:text-5xl font-bold mb-4">
              Sua vitrine de procedimentos{" "}
              <span className="bg-gradient-to-r from-[#52B788] to-[#95D5B2] bg-clip-text text-transparent">
                dentro do agendamento
              </span>
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              A cliente não só agenda — ela{" "}
              <strong className="text-white">escolhe o procedimento, vê o preço e já sabe quanto vai pagar</strong>{" "}
              antes de sair de casa. Mais profissionalismo. Mais faturamento.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10 text-center">
            {[
              { icon: "💡", text: "Cliente escolhe o procedimento antes de chegar" },
              { icon: "💰", text: "Pacotes de sessões aumentam o ticket sem você precisar vender" },
              { icon: "📸", text: "Exiba fotos dos resultados com cada procedimento" },
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

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {PROCEDIMENTOS.map((p) => (
              <div
                key={p.nome}
                className={`relative rounded-2xl p-6 border transition-all group hover:-translate-y-1
                  ${p.destaque
                    ? "bg-gradient-to-br from-[#1B4332] to-[#0a1a14] border-[#52B788]/50 shadow-[0_4px_32px_rgba(64,145,108,0.25)]"
                    : "bg-[#0a1a14]/70 border-white/8 hover:border-[#40916C]/30"
                  }`}
              >
                {p.destaque && (
                  <span className="absolute top-4 right-4 bg-[#40916C] text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide">
                    Alto ticket
                  </span>
                )}
                <span className="text-4xl mb-4 block">{p.emoji}</span>
                <h3 className="font-extrabold text-lg mb-1">{p.nome}</h3>
                <p className="text-[#52B788] font-bold text-base mb-3">{p.preco}</p>
                <p className="text-gray-400 text-sm leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>

          <p className="text-center text-gray-500 text-sm mt-8">
            ↑ Exemplo de vitrine. Você cadastra seus procedimentos com preços reais, fotos e descrição.
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
                desc: "Pelo WhatsApp, link na bio ou QR Code da sua clínica. A IA atende na hora — fim de semana, feriado, madrugada.",
              },
              {
                step: "02",
                title: "Escolhe o procedimento na vitrine",
                desc: "A cliente vê limpeza de pele, botox, peeling e pacotes com preços e fotos. Ela escolhe sem precisar perguntar.",
              },
              {
                step: "03",
                title: "Agenda o horário",
                desc: "A IA mostra os horários disponíveis e confirma tudo automaticamente. Sem você precisar tocar no celular.",
              },
              {
                step: "04",
                title: "Recebe lembrete automático",
                desc: "24h antes, o Synka manda lembrete personalizado no WhatsApp. A cliente confirma com um clique.",
              },
              {
                step: "05",
                title: "Lembrete de retorno automático",
                desc: "Após o procedimento, o Synka avisa quando é hora de retornar. Fidelização sem nenhum esforço extra.",
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
          PROVA SOCIAL
      ══════════════════════════════ */}
      <section className="py-24 px-6 bg-[#08081a]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs uppercase tracking-widest text-[#52B788] font-bold mb-3">Esteticistas falam</p>
            <h2 className="text-3xl sm:text-4xl font-bold">Resultado real, no bolso de quem usou</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {DEPOIMENTOS.map((d) => (
              <div
                key={d.nome}
                className="bg-[#0a1a14]/70 border border-white/8 rounded-2xl p-7 hover:border-[#40916C]/25 transition-all hover:-translate-y-0.5"
              >
                <div className="flex gap-0.5 mb-4">
                  {Array(d.estrelas).fill(null).map((_, i) => (
                    <svg key={i} className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="text-gray-300 text-sm leading-relaxed mb-5 italic">"{d.texto}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#40916C]/30 border border-[#52B788]/30 flex items-center justify-center text-[#52B788] text-xs font-bold shrink-0">
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
            Com o Synka, sua clínica…
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { emoji: "📉", texto: "Tem menos faltas e horários não realizados" },
              { emoji: "💰", texto: "Aumenta o ticket com pacotes e combos de procedimentos" },
              { emoji: "📱", texto: "Para de gastar horas respondendo WhatsApp" },
              { emoji: "💆", texto: "Fideliza clientes com lembretes automáticos de retorno" },
              { emoji: "🏆", texto: "Passa profissionalismo e confiança para novas clientes" },
              { emoji: "🚀", texto: "Fatura mais sem precisar contratar recepcionista" },
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
            Chega de perder procedimento.<br />
            <span className="bg-gradient-to-r from-[#52B788] to-[#2D6A4F] bg-clip-text text-transparent">
              Comece grátis hoje.
            </span>
          </h2>
          <p className="text-gray-400 mb-4 text-lg">
            30 dias gratuitos. Planos a partir de R$ 37,90/mês.
          </p>
          <p className="text-gray-500 text-sm mb-8">
            Em menos de 24h sua clínica já recebe agendamentos automaticamente e começa a crescer.
          </p>
          {/* Garantias antes do botão */}
          <div className="flex flex-wrap justify-center gap-6 mb-10">
            {[
              "✔ Teste grátis por 30 dias",
              "✔ Sem contrato",
              "✔ Suporte via WhatsApp",
            ].map((g) => (
              <span key={g} className="text-[#95D5B2] font-semibold text-sm">{g}</span>
            ))}
          </div>
          <div className="flex flex-col items-center gap-2 justify-center">
            <a
              href={WA_LINK}
              target="_blank"
              rel="noopener noreferrer"
              id="cta-final-whatsapp-estetica"
              className="inline-flex items-center justify-center gap-2 px-10 py-5 bg-[#40916C] hover:bg-[#2D6A4F] rounded-2xl text-lg font-bold transition-all shadow-[0_8px_40px_rgba(64,145,108,0.5)] hover:shadow-[0_8px_56px_rgba(64,145,108,0.7)] hover:-translate-y-1"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              👉 Começar teste grátis no WhatsApp
            </a>
            <p className="text-gray-500 text-sm mt-1">Atendimento rápido. Sem compromisso.</p>
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
            <a href={WA_LINK} target="_blank" rel="noopener noreferrer" className="hover:text-gray-700 transition-colors">WhatsApp</a>
            <a href="mailto:somar.solucoes.suporte@gmail.com" className="hover:text-gray-700 transition-colors">Suporte</a>
            <Link href="/auth/login" className="hover:text-gray-700 transition-colors">Login</Link>
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
