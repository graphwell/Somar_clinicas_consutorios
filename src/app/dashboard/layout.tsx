/**
 * Somar.IA SaaS Scheduler - Modern Dashboard Shell
 * Using premium glassmorphism and tailwind.
 */
import React from 'react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#050510] text-[#f0f0f5] font-sans selection:bg-[#4a4ae2] selection:text-white">
      {/* Sidebar / Navigation */}
      <nav className="fixed left-0 top-0 h-full w-64 bg-[#0a0a20]/50 backdrop-blur-xl border-r border-white/5 p-6 flex flex-col gap-6">
        
        {/* Logo da Clínica (Substitui Somar.IA) */}
        <div className="w-full h-16 flex items-center justify-center bg-white/5 border border-white/10 rounded-xl mb-4">
           {/* Aqui vira o <img src={clinica.logoUrl} /> vindo do banco */}
           <span className="text-sm font-medium text-gray-400">Sua Logo Aqui</span>
        </div>
        
        <ul className="flex flex-col gap-2 mt-4">
          <li className="px-4 py-2 rounded-lg hover:bg-white/10 cursor-pointer transition-all">
            Agenda
          </li>
          <li className="px-4 py-2 rounded-lg hover:bg-white/10 cursor-pointer transition-all">
            Pacientes
          </li>
          <li className="px-4 py-2 rounded-lg hover:bg-white/10 cursor-pointer transition-all">
            Relatórios
          </li>
          <li className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 cursor-pointer transition-all">
            Configurações
          </li>
        </ul>

        <div className="mt-auto p-4 bg-[#4a4ae2]/10 border border-[#4a4ae2]/20 rounded-xl text-center">
          <p className="text-[10px] uppercase tracking-widest text-[#4a4ae2] font-bold mb-1">Licença Ativa</p>
          <p className="text-sm font-medium">Plano Pro</p>
        </div>
      </nav>

      {/* Main Content */}
      <main className="pl-64 flex-1 flex flex-col min-h-screen">
        
        <header className="h-20 border-b border-white/5 flex items-center px-10 justify-between bg-[#050510]/80 sticky top-0 backdrop-blur-md z-10">
          <h2 className="text-xl font-medium">Dashboard</h2>
          
          {/* Topo Direito: Reservado para o Usuário */}
          <div className="flex items-center gap-4 border border-white/10 bg-white/5 px-4 py-2 rounded-full cursor-pointer hover:bg-white/10 transition-colors">
            <div className="flex flex-col items-end">
              <span className="text-sm font-medium">Dr. João Silva</span>
              <span className="text-xs text-[#a0a0ff]">Admin</span>
            </div>
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#4a4ae2] to-[#8080ff] shadow-lg flex items-center justify-center text-white font-bold">
              JS
            </div>
          </div>
        </header>
        
        <div className="p-10">
          {children}
        </div>
      </main>
    </div>
  );
}
