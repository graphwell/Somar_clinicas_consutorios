"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTheme } from '@/context/ThemeContext';
import { SynkaIcon } from '@/components/SynkaLogo';
import { NichoProvider, useNicho } from '@/context/NichoContext';

const NavItem = ({ href, label }: { href: string; label: string }) => (
  <Link href={href} className="flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all text-sm font-medium text-gray-400 hover:bg-white/5 hover:text-white">
    {label}
  </Link>
);

const TENANT_ID = 'clinica_id_default';

const NavigationLinks = () => {
  const { labels } = useNicho();
  return (
    <div className="flex flex-col gap-1 flex-1">
      <NavItem href="/dashboard" label="📅  Agenda" />
      <NavItem href="/dashboard/patients" label={`👥  ${labels.cliente}s`} />
      <NavItem href="/dashboard/reports" label="📊  Relatórios" />
      <div className="border-t border-white/5 my-2" />
      <NavItem href="/dashboard/team" label="🧑‍💼  Equipe" />
      <NavItem href="/dashboard/campaigns" label="📢  Avisos e Lembretes" />
      <NavItem href="/dashboard/billing" label="💳  Financeiro" />
      <NavItem href="/dashboard/settings" label="⚙️  Configurações" />
    </div>
  );
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { theme, setTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [clientLogo, setClientLogo] = useState<string | null>(null);
  const [clientName, setClientName] = useState<string | null>(null);

  // Módulos de UI
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [notificacoes, setNotificacoes] = useState<any[]>([]);

  const isDark = theme === 'dark-stellar';
  const isModern = theme === 'modern-blue';
  
  // Cores dinâmicas baseadas no preset
  const bg = theme === 'light-soft' ? 'bg-[#f8f9fc]' : theme === 'modern-blue' ? 'bg-[#eff6ff]' : 'bg-[#050510]';
  const sidebarBg = theme === 'light-soft' ? 'bg-white border-gray-100' : theme === 'modern-blue' ? 'bg-white/70 backdrop-blur-md border-blue-100' : 'bg-[#0a0a20]/80 border-white/5';
  const headerBg = theme === 'light-soft' ? 'bg-white/80 border-gray-100' : theme === 'modern-blue' ? 'bg-white/40 border-blue-100' : 'bg-[#050510]/80 border-white/5';
  const textColor = theme === 'light-soft' ? 'text-gray-800' : theme === 'modern-blue' ? 'text-blue-900' : 'text-[#f0f0f5]';

  const cycleTheme = () => {
    const presets: ('dark-stellar' | 'light-soft' | 'modern-blue')[] = ['dark-stellar', 'light-soft', 'modern-blue'];
    const idx = presets.indexOf(theme);
    setTheme(presets[(idx + 1) % presets.length]);
  };

  // Load client logo: localStorage first (instant), then API (source of truth)
  useEffect(() => {
    // 1. Show cached logo instantly
    const cached = localStorage.getItem(`synka-logo-${TENANT_ID}`);
    if (cached) setClientLogo(cached);

    // 2. Fetch from API in background to get clinic name and validate
    fetch(`/api/upload/logo?tenantId=${TENANT_ID}`)
      .then(r => r.json())
      .then(data => {
        if (data.onboardingCompleted === false) {
          window.location.href = '/onboarding';
          return;
        }
        if (data.logoUrl) {
          setClientLogo(data.logoUrl);
          localStorage.setItem(`synka-logo-${TENANT_ID}`, data.logoUrl);
        }
        if (data.nome) setClientName(data.nome);
      })
      .catch(() => {});

    // 3. Listen for real-time logo updates from the Settings page
    const handleLogoUpdate = (e: Event) => {
      const url = (e as CustomEvent<string>).detail;
      setClientLogo(url);
    };
    window.addEventListener('synka-logo-updated', handleLogoUpdate);
    return () => window.removeEventListener('synka-logo-updated', handleLogoUpdate);
  }, []);

  const fetchNotifications = () => {
    fetch('/api/notifications')
      .then(res => res.json())
      .then(data => {
        if (data.notificacoes) {
          setNotificacoes(data.notificacoes);
          setUnreadCount(data.unreadCount);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000); // Poll every minute
    return () => clearInterval(interval);
  }, []);

  const markAsRead = async (id: string) => {
    await fetch(`/api/notifications/${id}`, { method: 'PUT' });
    fetchNotifications();
  };

  return (
    <NichoProvider tenantId={TENANT_ID}>
      <div className={`min-h-screen ${bg} ${textColor} font-sans`}>

        {/* Mobile Overlay */}
        {mobileOpen && (
          <div className="fixed inset-0 bg-black/60 z-30 md:hidden" onClick={() => setMobileOpen(false)} />
        )}

        {/* Sidebar */}
        <nav className={`fixed left-0 top-0 h-full w-64 ${sidebarBg} backdrop-blur-xl border-r p-5 flex flex-col gap-3 z-40 transition-transform duration-300 ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>

          <div className="w-full h-24 flex items-center gap-3 px-2 mb-4">
            {clientLogo ? (
              <img src={clientLogo} alt="Logo da clínica" className="h-20 max-w-[220px] object-contain" />
            ) : (
              <div className="w-full h-16 flex items-center gap-3 px-1">
                <SynkaIcon size={48} />
                <div className="w-px h-8 bg-white/10" />
                <span className="text-xs text-gray-500 leading-tight">Adicione sua logo<br />em Configurações</span>
              </div>
            )}
          </div>

          <NavigationLinks />
          <div className="p-3 bg-[#4a4ae2]/10 border border-[#4a4ae2]/20 rounded-xl text-center text-xs">
            <p className="text-[#a0a0ff] uppercase tracking-widest font-bold mb-0.5">🟢 Trial</p>
            <p className="text-gray-400">7 dias restantes</p>
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

            <h2 className="hidden md:block text-base font-medium text-gray-400">
              {clientName || 'Painel da Clínica'}
            </h2>

            <div className="flex items-center gap-3 ml-auto">
              {/* Theme Toggle */}
              <button onClick={cycleTheme} className="p-2 rounded-lg border border-white/10 hover:bg-white/10 transition-colors text-sm" title="Trocar tema">
                {theme === 'dark-stellar' ? '🌙' : theme === 'light-soft' ? '☀️' : '🌊'}
              </button>

              {/* Notifications */}
              <div className="relative">
                <button 
                  onClick={() => setShowNotifications(!showNotifications)} 
                  className="p-2 rounded-lg border border-white/10 hover:bg-white/10 transition-colors text-sm relative" 
                  title="Notificações"
                >
                  🔔
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-lg border border-[#050510]">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {/* Notifications Dropdown */}
                {showNotifications && (
                  <div className="absolute right-0 mt-3 w-80 bg-[#0a0a20] border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden">
                    <div className="p-4 border-b border-white/5 bg-white/5 flex justify-between items-center">
                      <h3 className="font-bold text-sm">Notificações</h3>
                      <button onClick={fetchNotifications} className="text-xs text-[#8080ff] hover:underline">Atualizar</button>
                    </div>
                    <div className="max-h-80 overflow-y-auto w-full">
                      {notificacoes.length === 0 ? (
                        <p className="p-6 text-center text-sm text-gray-500">Nenhuma notificação recente.</p>
                      ) : (
                        notificacoes.map((n) => (
                          <div key={n.id} onClick={() => { if (!n.lida) markAsRead(n.id); }} className={`p-4 border-b border-white/5 cursor-pointer hover:bg-white/5 transition-colors ${n.lida ? 'opacity-50' : 'bg-[#4a4ae2]/10 relative'}`}>
                            {!n.lida && <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#4a4ae2]" />}
                            <p className="text-xs font-bold text-white mb-0.5">{n.titulo}</p>
                            <p className="text-[10px] text-gray-400 line-clamp-2">{n.mensagem}</p>
                            <p className="text-[9px] text-gray-500 mt-2">{new Date(n.createdAt).toLocaleString('pt-BR')}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* User Profile */}
              <div className="relative">
                <div 
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 border border-white/10 bg-white/5 px-3 py-1.5 rounded-full cursor-pointer hover:bg-white/10 transition-colors"
                >
                  <div className="hidden sm:flex flex-col items-end">
                    <span className="text-xs font-semibold leading-tight">Administrador</span>
                    <span className="text-[10px] text-[#a0a0ff]">Admin</span>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#4a4ae2] to-[#8080ff] flex items-center justify-center text-white text-xs font-bold">
                    A
                  </div>
                </div>

                {/* Dropdown Menu */}
                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-[#0a0a20] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden py-1">
                    <Link 
                      href="/dashboard/settings" 
                      onClick={() => setShowUserMenu(false)}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-300 hover:bg-white/5 transition-colors"
                    >
                      ⚙️ Configurações
                    </Link>
                    <Link 
                      href="/dashboard/settings#nicho" 
                      onClick={() => setShowUserMenu(false)}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-300 hover:bg-white/5 transition-colors"
                    >
                      🎯 Mudar Nicho
                    </Link>
                    <div className="border-t border-white/5 my-1" />
                    <button 
                      onClick={() => { setShowUserMenu(false); window.location.href = '/auth/login'; }}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/5 transition-colors"
                    >
                      🚪 Sair do Sistema
                    </button>
                  </div>
                )}
              </div>
            </div>
          </header>

          <div className="flex-1 p-4 md:p-8">
            {children}
          </div>

          {/* Footer */}
          <footer className={`border-t ${isDark ? 'border-white/5 text-gray-500' : 'border-gray-200 text-gray-400'} py-4 px-8 text-center text-xs`}>
            Desenvolvido por <strong className="text-[#8080ff]">Somar.IA</strong> — © 2025 SOMMAR SOLUÇÕES DIGITAIS — CNPJ: 65.771.133/0001-07
          </footer>
        </main>
      </div>
    </NichoProvider>
  );
}
