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
        <h1 className="text-2xl font-bold bg-gradient-to-r from-[#4a4ae2] to-[#9d50bb] bg-clip-text text-transparent">
          Somar.IA
        </h1>
        
        <ul className="flex flex-col gap-2 mt-8">
          <li className="px-4 py-2 bg-white/5 rounded-lg hover:bg-white/10 cursor-pointer transition-all border border-transparent hover:border-white/10">
            Agenda
          </li>
          <li className="px-4 py-2 rounded-lg hover:bg-white/10 cursor-pointer transition-all">
            Pacientes
          </li>
          <li className="px-4 py-2 rounded-lg hover:bg-white/10 cursor-pointer transition-all">
            Relatórios
          </li>
          <li className="px-4 py-2 rounded-lg hover:bg-white/10 cursor-pointer transition-all">
            Configurações
          </li>
        </ul>

        <div className="mt-auto p-4 bg-[#4a4ae2]/10 border border-[#4a4ae2]/20 rounded-xl">
          <p className="text-xs text-[#4a4ae2]">Clinic Active</p>
          <p className="text-sm font-medium">Clínica UNY LIFE</p>
        </div>
      </nav>

      {/* Main Content */}
      <main className="pl-64 flex-1">
        <header className="h-20 border-b border-white/5 flex items-center px-10 justify-between bg-[#050510]/80 sticky top-0 backdrop-blur-md z-10">
          <h2 className="text-xl font-medium">Dashboard</h2>
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#4a4ae2] to-[#ff0080]" />
        </header>
        
        <div className="p-10">
          {children}
        </div>
      </main>
    </div>
  );
}
