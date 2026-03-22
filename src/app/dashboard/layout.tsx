"use client";
import React, { useState } from 'react';
import { useTheme } from '@/context/ThemeContext';
import Link from 'next/link';

const NavItem = ({ href, label, active }: { href: string; label: string; active?: boolean }) => (
  <Link href={href} className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all text-sm font-medium ${active ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}>
    {label}
  </Link>
);

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { theme, toggleTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isDark = theme === 'dark';
  const bg = isDark ? 'bg-[#050510]' : 'bg-gray-100';
  const sidebarBg = isDark ? 'bg-[#0a0a20]/80 border-white/5' : 'bg-white border-gray-200';
  const headerBg = isDark ? 'bg-[#050510]/80 border-white/5' : 'bg-white/80 border-gray-200';
  const textColor = isDark ? 'text-[#f0f0f5]' : 'text-gray-900';

  return (
    <div className={`min-h-screen ${bg} ${textColor} font-sans`}>
      
      {/* Mobile Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/60 z-30 md:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <nav className={`fixed left-0 top-0 h-full w-64 ${sidebarBg} backdrop-blur-xl border-r p-5 flex flex-col gap-3 z-40 transition-transform duration-300 ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        
        {/* Logo Synka */}
        <div className="w-full h-16 flex items-center justify-center px-2 mb-2">
           <img src="/synka-icon.png" alt="Synka" className="h-12 w-12 object-contain" />
           <span className="ml-3 text-xl font-bold tracking-tight">Synka</span>
        </div>

        <div className="flex flex-col gap-1 flex-1">
          <NavItem href="/dashboard" label="📅  Agenda" />
          <NavItem href="/dashboard/patients" label="👥  Pacientes" />
          <NavItem href="/dashboard/reports" label="📊  Relatórios" />
          <div className="border-t border-white/5 my-2" />
          {/* Admin-only links */}
          <NavItem href="/dashboard/team" label="🧑‍💼  Equipe" active />
          <NavItem href="/dashboard/billing" label="💳  Financeiro" />
          <NavItem href="/dashboard/settings" label="⚙️  Configurações" />
        </div>

        <div className="p-3 bg-[#4a4ae2]/10 border border-[#4a4ae2]/20 rounded-xl text-center text-xs">
          <p className="text-[#a0a0ff] uppercase tracking-widest font-bold mb-0.5">Plano Starter</p>
          <p className="text-gray-400">Trial — 14 dias restantes</p>
        </div>
      </nav>

      {/* Main */}
      <main className="md:pl-64 flex flex-col min-h-screen">
        <header className={`h-16 border-b ${headerBg} backdrop-blur-md flex items-center px-4 md:px-8 justify-between sticky top-0 z-20`}>
          
          {/* Hamburger (mobile only) */}
          <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden p-2 rounded-lg hover:bg-white/10 transition-colors">
            <span className="block w-5 h-0.5 bg-current mb-1"></span>
            <span className="block w-5 h-0.5 bg-current mb-1"></span>
            <span className="block w-5 h-0.5 bg-current"></span>
          </button>

          <h2 className="hidden md:block text-lg font-medium">Dashboard</h2>
          
          <div className="flex items-center gap-3 ml-auto">
            {/* Theme Toggle */}
            <button onClick={toggleTheme} className="p-2 rounded-lg border border-white/10 hover:bg-white/10 transition-colors text-sm" title="Trocar tema">
              {isDark ? '☀️' : '🌙'}
            </button>

            {/* User Profile */}
            <div className="flex items-center gap-2 border border-white/10 bg-white/5 px-3 py-1.5 rounded-full cursor-pointer hover:bg-white/10 transition-colors">
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-xs font-semibold leading-tight">Dr. João Silva</span>
                <span className="text-[10px] text-[#a0a0ff]">Admin</span>
              </div>
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#4a4ae2] to-[#8080ff] flex items-center justify-center text-white text-xs font-bold">
                JS
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 p-4 md:p-8">
          {children}
        </div>

        {/* Footer */}
        <footer className={`border-t ${isDark ? 'border-white/5 text-gray-500' : 'border-gray-200 text-gray-400'} py-4 px-8 text-center text-xs`}>
          © 2025 Somar.IA — SOMMAR SOLUÇÕES DIGITAIS — CNPJ: 65.771.133/0001-07 — 
          <a href="mailto:somar.solucoes.suporte@gmail.com" className="hover:underline ml-1">somar.solucoes.suporte@gmail.com</a>
        </footer>
      </main>
    </div>
  );
}
