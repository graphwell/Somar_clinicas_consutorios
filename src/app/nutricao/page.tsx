"use client";
import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";

const DORES = [
  { dor: '"Paciente marcou consulta, não apareceu e nem avisou."', fix: "Synka confirma presença 24h antes. Consulta garantida." },
  { dor: '"Paciente some depois da segunda consulta e não retorna."', fix: "Lembrete automático de retorno. Acompanhamento garantido." },
  { dor: '"Fico trocando mensagens para agendar e remarcar."', fix: "IA agenda por você. Você foca nos pacientes." },
  { dor: '"Agenda vazia na terça, lotada na quinta — mal distribuída."', fix: "IA distribui os horários e preenche os buracos." },
  { dor: '"Paciente não sabia o valor antes de chegar."', fix: "Vitrine com consultas, pacotes e valores. Sem surpresa." },
];

const SERVICOS = [
  { emoji: "🥗", nome: "Consulta Inicial", preco: "R$ 150 – 300", desc: "Anamnese completa e plano alimentar personalizado. Exiba sua abordagem na vitrine.", destaque: false },
  { emoji: "📋", nome: "Consulta de Retorno", preco: "R$ 100 – 200", desc: "Retorno garantido com lembrete automático. Fidelização real.", destaque: false },
  { emoji: "🎯", nome: "Pacote 4 Consultas", preco: "R$ 400 – 900", desc: "Alto ticket. Receita previsível e acompanhamento garantido.", destaque: true },
  { emoji: "💪", nome: "Nutrição Esportiva", preco: "R$ 200 – 400", desc: "Nicho de alto valor. Exiba especialidade e diferenciais na vitrine.", destaque: false },
  { emoji: "👶", nome: "Nutrição Infantil", preco: "R$ 180 – 350", desc: "Inclua orientação para pais. Diferencial que poucos oferecem.", destaque: false },
  { emoji: "💻", nome: "Consulta Online", preco: "R$ 120 – 250", desc: "Agenda separada ou unificada. Paciente agenda sem precisar ligar.", destaque: false },
];

const DEPOIMENTOS = [
  { nome: "Dra. Amanda Costa", negocio: "Nutricionista – Fortaleza/CE", avatar: "AC", texto: "Antes eu perdia 5 consultas por semana. Com o Synka caiu para quase zero. Só isso representa mais de R$ 1.000 a mais no mês.", estrelas: 5 },
  { nome: "Dra. Larissa Mendes", negocio: "Clínica de Nutrição – São Paulo/SP", avatar: "LM", texto: "O lembrete de retorno automático mudou tudo. Pacientes que sumiam agora voltam. Minha taxa de fidelização dobrou.", estrelas: 5 },
  { nome: "Dr. Felipe Novais", negocio: "Nutrição Esportiva – Recife/PE", avatar: "FN", texto: "Coloquei meus pacotes na vitrine com preços. Os pacientes chegam decididos. Vendo mais pacotes sem precisar oferecer.", estrelas: 5 },
];

const WA = "https://wa.me/5511925203237?text=Ol%C3%A1!%20Vi%20o%20Synka%20para%20nutri%C3%A7%C3%A3o%20e%20quero%20saber%20mais.";
const CTA = "/auth/login";

export default function PageNutricao() {
  const [idx, setIdx] = useState(0);
  const [vis, setVis] = useState(true);
  const [counts, setCounts] = useState([0, 0, 0]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setInterval(() => { setVis(false); setTimeout(() => { setIdx(i => (i+1)%DORES.length); setVis(true); }, 350); }, 3800);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const targets = [70, 24, 50];
    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) {
        targets.forEach((target, i) => {
          let c = 0; const step = Math.ceil(target/60);
          const timer = setInterval(() => { c = Math.min(c+step, target); setCounts(p => { const n=[...p]; n[i]=c; return n; }); if(c>=target) clearInterval(timer); }, 25);
        });
        obs.disconnect();
      }
    }, { threshold: 0.3 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  const dore = DORES[idx];

  return (
    <div className="min-h-[100svh] bg-[#050510] text-white font-sans overflow-x-hidden">
      <nav className="fixed top-0 w-full z-50 bg-white shadow-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <img src="/synka-logo.png" alt="Synka" className="h-10 object-contain" />
          <div className="flex items-center gap-3">
            <Link href="/planos" className="hidden sm:block text-sm text-gray-800 hover:text-[#40916C] font-bold transition-colors">Planos e Preços</Link>
            <Link href={WA} target="_blank" rel="noopener noreferrer" className="hidden sm:block text-sm text-gray-500 hover:text-gray-800 font-medium transition-colors ml-4">WhatsApp</Link>
            <Link href={CTA} className="px-5 py-2 bg-[#40916C] hover:bg-[#2D6A4F] text-white rounded-xl text-sm font-semibold transition-all shadow-[0_4px_16px_rgba(64,145,108,0.35)]">Testar Grátis</Link>
          </div>
        </div>
      </nav>

      <section className="relative min-h-[100svh] flex flex-col items-center justify-center text-center px-6 pt-36 pb-20 overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-[#40916C]/10 rounded-full blur-[130px]" />
          <div className="absolute top-2/3 right-1/4 w-[300px] h-[300px] bg-[#84CC16]/5 rounded-full blur-[90px]" />
        </div>
        <div className="inline-flex items-center gap-2 bg-[#40916C]/10 border border-[#40916C]/25 rounded-full px-4 py-1.5 text-xs text-[#95D5B2] font-semibold uppercase tracking-widest mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-[#40916C] animate-pulse" />Para Nutricionistas
        </div>
        <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold leading-tight max-w-5xl mb-6 tracking-tight">
          Sua clínica perde{" "}
          <span className="bg-gradient-to-r from-red-400 to-red-300 bg-clip-text text-transparent">consultas e dinheiro</span>
          <br/>com faltas e pacientes que somem.
        </h1>
        <p className="text-gray-400 text-xl max-w-2xl mb-4 leading-relaxed">
          Cada falta, cada retorno esquecido, cada WhatsApp não respondido é dinheiro e resultado que você deixa na mesa.
          <br/><span className="text-[#52B788] font-semibold">O Synka resolve isso — automático, 24h, sem esforço.</span>
        </p>
        <p className="text-[#95D5B2] text-sm font-medium mb-10">✓ Sem instalação &nbsp;·&nbsp; ✓ Funciona em 24h &nbsp;·&nbsp; ✓ Cancele quando quiser</p>
        <div className="flex flex-col sm:flex-row gap-4 mb-20 w-full sm:w-auto items-center">
          <Link href={CTA} id="hero-cta-nutricao" className="w-full sm:w-auto max-w-xs px-8 py-4 bg-[#40916C] hover:bg-[#2D6A4F] rounded-2xl text-base font-bold transition-all shadow-[0_8px_32px_rgba(64,145,108,0.45)] hover:-translate-y-0.5 text-center">Testar grátis — 30 dias →</Link>
          <a href={WA} target="_blank" rel="noopener noreferrer" id="hero-wa-nutricao" className="w-full sm:w-auto max-w-xs px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/15 rounded-2xl text-base font-semibold transition-all text-center flex items-center justify-center gap-2">
            <svg className="w-5 h-5 text-[#52B788]" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            Falar no WhatsApp
          </a>
        </div>
        <div className="flex flex-wrap justify-center gap-8 sm:gap-16 text-center">
          {[{val:"70%",label:"menos faltas e no-shows"},{val:"24h",label:"agenda funcionando sozinha"},{val:"+50%",label:"adesão ao tratamento com retorno automático"}].map(s=>(
            <div key={s.val}><p className="text-2xl font-extrabold text-[#52B788]">{s.val}</p><p className="text-xs text-gray-500 mt-0.5">{s.label}</p></div>
          ))}
        </div>
      </section>

      <section className="py-24 px-6 bg-gradient-to-b from-[#050510] to-[#08081a]">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-xs uppercase tracking-widest text-[#52B788] font-bold mb-4">O dia a dia do consultório</p>
          <h2 className="text-3xl sm:text-4xl font-bold mb-16">Você se reconhece nisso?</h2>
          <div className="relative min-h-[220px] flex flex-col items-center justify-center">
            <div style={{transition:"opacity 350ms ease, transform 350ms ease",opacity:vis?1:0,transform:vis?"translateY(0)":"translateY(10px)"}} className="w-full">
              <div className="bg-red-500/8 border border-red-500/20 rounded-2xl px-8 py-7 mb-6 max-w-2xl mx-auto"><p className="text-base sm:text-lg text-red-300 font-medium leading-relaxed">{dore.dor}</p></div>
              <div className="text-[#52B788] text-3xl mb-6">↓</div>
              <div className="bg-green-500/8 border border-green-500/20 rounded-2xl px-8 py-6 max-w-2xl mx-auto"><p className="text-base sm:text-lg text-green-300 font-semibold">{dore.fix}</p></div>
            </div>
            <div className="flex gap-2 mt-10">{DORES.map((_,i)=><button key={i} onClick={()=>{setIdx(i);setVis(true);}} className={`h-1.5 rounded-full transition-all duration-300 ${i===idx?"w-6 bg-[#40916C]":"w-1.5 bg-white/20"}`}/>)}</div>
          </div>
        </div>
      </section>

      <section className="py-20 px-6 bg-[#08081a]">
        <div className="max-w-3xl mx-auto text-center">
          <div className="bg-gradient-to-br from-[#1B4332]/50 to-[#0a1a14]/80 border border-[#40916C]/20 rounded-3xl px-8 sm:px-14 py-14">
            <p className="text-lg text-gray-400 mb-4">O problema não é falta de pacientes…</p>
            <h2 className="text-3xl sm:text-5xl font-extrabold leading-tight mb-6">É o <span className="bg-gradient-to-r from-[#52B788] to-[#95D5B2] bg-clip-text text-transparent">faturamento que some</span> com faltas e abandonos.</h2>
            <p className="text-gray-400 text-base sm:text-lg leading-relaxed">
              Uma nutricionista com 4 faltas por semana a R$ 180 perde{" "}
              <strong className="text-red-400">R$ 2.880 por mês</strong>.{" "}
              <span className="text-[#52B788] font-semibold">O Synka paga o próprio investimento com 1 consulta evitada.</span>
            </p>
          </div>
        </div>
      </section>

      <section ref={ref} className="py-20 px-6 bg-[#08081a]">
        <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
          {[{value:counts[0],suffix:"%",label:"de redução em faltas",color:"from-green-400 to-emerald-300"},{value:counts[1],suffix:"h",label:"agenda funcionando sozinha por dia",color:"from-[#52B788] to-[#40916C]"},{value:counts[2],suffix:"%",label:"mais pacientes concluem o tratamento com retorno automático",color:"from-[#95D5B2] to-[#52B788]"}].map((s,i)=>(
            <div key={i} className="space-y-2"><p className={`text-6xl font-extrabold bg-gradient-to-r ${s.color} bg-clip-text text-transparent`}>{s.value}{s.suffix}</p><p className="text-gray-400 text-sm">{s.label}</p></div>
          ))}
        </div>
      </section>

      <section className="py-24 px-6 bg-gradient-to-b from-[#08081a] to-[#050510]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 bg-[#40916C]/10 border border-[#40916C]/25 rounded-full px-4 py-1.5 text-xs text-[#95D5B2] font-semibold uppercase tracking-widest mb-6"><span>🔥</span> Recurso exclusivo</div>
            <h2 className="text-3xl sm:text-5xl font-bold mb-4">Sua vitrine de consultas <span className="bg-gradient-to-r from-[#52B788] to-[#95D5B2] bg-clip-text text-transparent">dentro do agendamento</span></h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">O paciente vê <strong className="text-white">seus serviços, especialidades e valores</strong> antes de marcar. Chega decidido e comprometido.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {SERVICOS.map(s=>(
              <div key={s.nome} className={`relative rounded-2xl p-6 border transition-all hover:-translate-y-1 ${s.destaque?"bg-gradient-to-br from-[#1B4332] to-[#0a1a14] border-[#52B788]/50 shadow-[0_4px_32px_rgba(64,145,108,0.25)]":"bg-[#0a1a14]/70 border-white/8 hover:border-[#40916C]/30"}`}>
                {s.destaque&&<span className="absolute top-4 right-4 bg-[#40916C] text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide">Mais vendido</span>}
                <span className="text-4xl mb-4 block">{s.emoji}</span>
                <h3 className="font-extrabold text-lg mb-1">{s.nome}</h3>
                <p className="text-[#52B788] font-bold text-base mb-3">{s.preco}</p>
                <p className="text-gray-400 text-sm leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 px-6 bg-[#08081a]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14"><p className="text-xs uppercase tracking-widest text-[#52B788] font-bold mb-3">Nutricionistas falam</p><h2 className="text-3xl sm:text-4xl font-bold">Resultado real, no consultório de quem usou</h2></div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {DEPOIMENTOS.map(d=>(
              <div key={d.nome} className="bg-[#0a1a14]/70 border border-white/8 rounded-2xl p-7 hover:border-[#40916C]/25 transition-all hover:-translate-y-0.5">
                <div className="flex gap-0.5 mb-4">{Array(d.estrelas).fill(null).map((_,i)=><svg key={i} className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>)}</div>
                <p className="text-gray-300 text-sm leading-relaxed mb-5 italic">"{d.texto}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#40916C]/30 border border-[#52B788]/30 flex items-center justify-center text-[#52B788] text-xs font-bold shrink-0">{d.avatar}</div>
                  <div><p className="font-bold text-sm">{d.nome}</p><p className="text-gray-500 text-xs">{d.negocio}</p></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-28 px-6 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-[#40916C]/12 via-transparent to-[#52B788]/12 pointer-events-none"/>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-[#40916C]/8 rounded-full blur-[120px] pointer-events-none"/>
        <div className="max-w-3xl mx-auto relative z-10">
          <div className="inline-flex items-center gap-2 bg-[#40916C]/10 border border-[#40916C]/25 rounded-full px-4 py-1.5 text-xs text-[#95D5B2] font-semibold uppercase tracking-widest mb-8"><span className="w-1.5 h-1.5 rounded-full bg-[#40916C] animate-pulse"/>Oferta de lançamento</div>
          <h2 className="text-4xl sm:text-6xl font-extrabold mb-6 leading-tight">Pare de perder consulta.<br/><span className="bg-gradient-to-r from-[#52B788] to-[#2D6A4F] bg-clip-text text-transparent">Comece grátis hoje.</span></h2>
          <p className="text-gray-400 mb-4 text-lg">30 dias gratuitos. Sem cartão. Sem burocracia.</p>
          <p className="text-gray-500 text-sm mb-10">Em menos de 24h seu consultório já terá agendamento automático e vitrine de consultas funcionando.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href={CTA} id="cta-final-nutricao" className="px-10 py-5 bg-[#40916C] hover:bg-[#2D6A4F] rounded-2xl text-lg font-bold transition-all shadow-[0_8px_40px_rgba(64,145,108,0.5)] hover:-translate-y-1 text-center">Começar grátis agora →</Link>
            <a href={WA} target="_blank" rel="noopener noreferrer" id="cta-wa-nutricao" className="px-10 py-5 bg-white/5 hover:bg-white/10 border border-white/15 rounded-2xl text-lg font-semibold transition-all flex items-center justify-center gap-2">
              <svg className="w-5 h-5 text-[#52B788]" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              Falar no WhatsApp
            </a>
          </div>
        </div>
      </section>

      <footer className="bg-white border-t border-gray-100 py-20 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-10 text-xs text-gray-400 font-medium">
          <div>© 2025 SOMMAR SOLUÇÕES DIGITAIS — CNPJ: 65.771.133/0001-07</div>
          <div className="flex gap-5">
            <a href={WA} target="_blank" rel="noopener noreferrer" className="hover:text-gray-700 transition-colors">WhatsApp</a>
            <a href="mailto:somar.solucoes.suporte@gmail.com" className="hover:text-gray-700 transition-colors">Suporte</a>
            <Link href="/auth/login" className="hover:text-gray-700 transition-colors">Login</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
