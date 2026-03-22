import Link from "next/link";
import React from "react";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#050510] text-white flex flex-col relative overflow-hidden font-sans">
      
      {/* Background Glows */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#4a4ae2] opacity-20 blur-[150px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[#8080ff] opacity-10 blur-[150px] rounded-full pointer-events-none"></div>

      {/* Navbar Minimalista */}
      <header className="w-full flex justify-between items-center px-8 py-6 z-20 max-w-7xl mx-auto">
        <div className="font-bold text-2xl tracking-tighter flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#4a4ae2] to-[#8080ff] shadow-lg shadow-[#4a4ae2]/50"></div>
          Somar.IA
        </div>
        <Link href="/auth/login" className="px-6 py-2 rounded-full border border-white/20 hover:bg-white/10 transition-all text-sm font-medium">
          Acessar minha conta
        </Link>
      </header>

      {/* Main Content - Neuromarketing */}
      <main className="z-10 text-center px-6 max-w-5xl mx-auto space-y-10 flex-1 flex flex-col justify-center py-20">
        
        <div className="space-y-6">
          <div className="inline-block px-4 py-1.5 rounded-full border border-[#4a4ae2]/30 bg-[#4a4ae2]/10 text-[#a0a0ff] text-sm font-medium tracking-wide mb-4">
            🔥 A Revolução no Atendimento de Clínicas
          </div>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-tight">
            Sua clínica não pode mais perder tempo com <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#4a4ae2] to-[#8080ff]">agendamentos manuais</span>.
          </h1>
          
          <p className="text-gray-400 text-lg md:text-xl max-w-3xl mx-auto font-light leading-relaxed">
            Profissionais param. Robôs não. Transforme seu WhatsApp em uma máquina automática de marcação que trabalha 24h por dia, sem férias e sem erros. Diga adeus aos buracos na agenda e aumente seu faturamento com a Inteligência Artificial da Somar.
          </p>
        </div>
        
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-center gap-6">
          <Link 
            href="/auth/login"
            className="px-10 py-5 bg-gradient-to-r from-[#4a4ae2] to-[#6060ff] hover:scale-105 rounded-full text-white font-semibold text-lg transition-all shadow-[0_10px_40px_rgba(74,74,226,0.4)] w-full sm:w-auto text-center"
          >
            Quero Automatizar Minha Clínica
          </Link>
        </div>

        {/* Social Proof Placeholder */}
        <div className="pt-16 pb-8 opacity-60">
          <p className="text-sm font-medium uppercase tracking-widest text-gray-500 mb-6">Tecnologia confiável utilizada por clínicas inovadoras</p>
          <div className="flex justify-center gap-12 flex-wrap grayscale">
            {/* Logos fictícias ou placeholders */}
            <div className="h-8 w-24 bg-white/20 rounded"></div>
            <div className="h-8 w-32 bg-white/20 rounded"></div>
            <div className="h-8 w-20 bg-white/20 rounded"></div>
          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="w-full border-t border-white/10 bg-black/40 backdrop-blur-md z-20 py-8 text-center text-gray-500 text-sm mt-auto relative">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex flex-col items-center md:items-start">
            <p className="font-semibold text-white/70">© 2025 Somar.IA</p>
            <p>Todos os direitos reservados.</p>
            <p className="text-xs mt-1">SOMMAR SOLUÇÕES DIGITAIS — CNPJ: 65.771.133/0001-07 — Brasil</p>
          </div>
          
          <div className="flex flex-col items-center md:items-end gap-1">
            <Link href="/suporte" className="hover:text-white transition-colors font-medium">Página de Suporte</Link>
            <a href="mailto:somar.solucoes.suporte@gmail.com" className="hover:text-white transition-colors">somar.solucoes.suporte@gmail.com</a>
            <a href="https://wa.me/5585991516106" target="_blank" className="hover:text-white transition-colors flex items-center gap-2">
               WhatsApp: +55 85 99151-6106
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
