import Link from "next/link";
import React from "react";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#050510] text-white flex flex-col items-center justify-center relative overflow-hidden">
      
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#4a4ae2] opacity-20 blur-[150px] rounded-full pointer-events-none"></div>

      {/* Main Content */}
      <main className="z-10 text-center px-6 max-w-4xl mx-auto space-y-8">
        <h1 className="text-5xl md:text-7xl font-semibold tracking-tight leading-tight">
          Agendamento Inteligente para <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#4a4ae2] to-[#8080ff]">Sua Clínica</span>
        </h1>
        
        <p className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto font-light">
          O primeiro sistema de gestão whitelabel com Inteligência Artificial nativa no WhatsApp. Escalone o atendimento da sua clínica em piloto automático.
        </p>
        
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link 
            href="/dashboard"
            className="px-8 py-4 bg-[#4a4ae2] hover:bg-[#3a3ab2] rounded-full text-white font-medium transition-all shadow-[0_4px_30px_rgba(74,74,226,0.3)] w-full sm:w-auto text-center"
          >
            Acessar o Painel
          </Link>
        </div>
      </main>

      {/* Futuristic Bottom Decor */}
      <div className="absolute bottom-0 left-0 w-full h-[30vh] bg-gradient-to-t from-[#000000] to-transparent z-0 pointer-events-none"></div>
    </div>
  );
}
