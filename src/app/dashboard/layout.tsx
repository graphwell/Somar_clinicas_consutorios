"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTheme } from '@/context/ThemeContext';
import { SynkaIcon } from '@/components/SynkaLogo';
import { NichoProvider, useNicho } from '@/context/NichoContext';

const NavItem = ({ href, label, icon, isCollapsed }: { href: string; label: string; icon: string; isCollapsed: boolean }) => (
  <Link 
    href={href} 
    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-medium text-[var(--text-muted)] hover:bg-white/5 hover:text-[var(--foreground)] group relative`}
    title={isCollapsed ? label : ''}
  >
    <span className="text-lg">{icon}</span>
    {!isCollapsed && <span className="truncate">{label}</span>}
    {isCollapsed && (
      <div className="absolute left-full ml-4 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 shadow-xl border border-white/10">
        {label}
      </div>
    )}
  </Link>
);

const NavigationLinks = ({ isCollapsed }: { isCollapsed: boolean }) => {
  const { labels } = useNicho();
  return (
    <div className="flex flex-col gap-1 flex-1">
      <NavItem href="/dashboard" label="Agenda" icon="📅" isCollapsed={isCollapsed} />
      <NavItem href="/dashboard/patients" label={`${labels.cliente}s`} icon="👥" isCollapsed={isCollapsed} />
      <NavItem href="/dashboard/reports" label="Relatórios" icon="📊" isCollapsed={isCollapsed} />
      <div className="border-t border-white/5 my-2" />
      <NavItem href="/dashboard/team" label="Equipe" icon="🧑‍💼" isCollapsed={isCollapsed} />
      <NavItem href="/dashboard/campaigns" label="Marketing Hub" icon="📢" isCollapsed={isCollapsed} />
      <NavItem href="/dashboard/services" label="Serviços" icon="📦" isCollapsed={isCollapsed} />
      <NavItem href="/dashboard/billing" label="Financeiro" icon="💳" isCollapsed={isCollapsed} />
      <NavItem href="/dashboard/settings" label="Configurações" icon="⚙️" isCollapsed={isCollapsed} />
    </div>
  );
};

const TENANT_ID = 'clinica_id_default';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { theme, setTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [clientLogo, setClientLogo] = useState<string | null>(null);
  const [clientName, setClientName] = useState<string | null>(null);

  // Módulos de UI
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [notificacoes, setNotificacoes] = useState<any[]>([]);

  // Toggle Collapse logic with persistence
  useEffect(() => {
    const stored = localStorage.getItem('synka-sidebar-collapsed');
    if (stored === 'true') setIsCollapsed(true);
  }, []);

  const toggleSidebar = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem('synka-sidebar-collapsed', String(newState));
  };
  
  const cycleTheme = () => {
    const presets: ('dark-stellar' | 'light-soft' | 'modern-blue')[] = ['dark-stellar', 'light-soft', 'modern-blue'];
    const idx = presets.indexOf(theme);
    setTheme(presets[(idx + 1) % presets.length]);
  };

  // Load client logo
  useEffect(() => {
    const cached = localStorage.getItem(`synka-logo-${TENANT_ID}`);
    if (cached) setClientLogo(cached);

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
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  const markAsRead = async (id: string) => {
    await fetch(`/api/notifications/${id}`, { method: 'PUT' });
    fetchNotifications();
  };

  return (
    <NichoProvider tenantId={TENANT_ID}>
      <div className={`min-h-screen bg-[var(--background)] text-[var(--foreground)] font-sans flex`}>

        {/* Mobile Overlay */}
        {mobileOpen && (
          <div className="fixed inset-0 bg-black/60 z-30 md:hidden" onClick={() => setMobileOpen(false)} />
        )}

        {/* Sidebar */}
        <nav 
          className={`fixed left-0 top-0 h-full bg-[var(--sidebar-bg)] backdrop-blur-xl border-r border-[var(--border)] p-4 flex flex-col gap-3 z-40 transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-64'} ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
        >
          {/* Logo Section */}
          <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} h-20 mb-4 transition-all overflow-hidden`}>
            {clientLogo ? (
              <img src={clientLogo} alt="Logo" className={`${isCollapsed ? 'h-8 w-8' : 'h-14 max-w-[180px]'} object-contain rounded-lg`} />
            ) : (
              <div className="flex items-center gap-2">
                <img src="/icon-192.png" alt="Logo" className="h-10 w-10 shrink-0" />
                {!isCollapsed && <span className="font-black text-lg tracking-tighter">synka</span>}
              </div>
            )}
          </div>

          <NavigationLinks isCollapsed={isCollapsed} />
          
          {/* Collapse Toggle (Desktop only) */}
          <button 
            onClick={toggleSidebar}
            className="hidden md:flex items-center justify-center p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-500 hover:text-white transition-all border border-white/5"
            title={isCollapsed ? 'Expandir' : 'Recolher'}
          >
            {isCollapsed ? '→' : '←'}
          </button>

          {!isCollapsed && (
            <div className="p-3 bg-[var(--accent)]/10 border border-[var(--accent)]/20 rounded-xl text-center text-[10px] mt-2">
              <p className="text-[var(--accent)] uppercase tracking-widest font-bold mb-0.5">🟢 Trial</p>
              <p className="text-[var(--text-muted)]">7 dias restantes</p>
            </div>
          )}
        </nav>

        {/* Main */}
        <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${isCollapsed ? 'md:ml-20' : 'md:ml-64'}`}>
          <header className={`h-16 border-b border-[var(--border)] bg-[var(--header-bg)] backdrop-blur-md flex items-center px-4 md:px-8 justify-between sticky top-0 z-20`}>

            {/* Hamburger (mobile only) */}
            <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden p-2 rounded-lg hover:bg-white/10 transition-colors">
              <span className="block w-5 h-0.5 bg-current mb-1"></span>
              <span className="block w-5 h-0.5 bg-current mb-1"></span>
              <span className="block w-5 h-0.5 bg-current"></span>
            </button>

            <h2 className="hidden md:block text-sm font-semibold text-[var(--text-muted)]">
              {clientName || 'Painel de Controle'}
            </h2>

            <div className="flex items-center gap-3">
              {/* Theme Toggle */}
              <button onClick={cycleTheme} className="p-2.5 rounded-xl border border-[var(--border)] hover:bg-white/5 transition-all text-sm bg-white/2" title="Trocar tema">
                {theme === 'dark-stellar' ? '🌙' : theme === 'light-soft' ? '☀️' : '🌊'}
              </button>

              {/* Notifications */}
              <div className="relative">
                <button 
                  onClick={() => setShowNotifications(!showNotifications)} 
                  className="p-2.5 rounded-xl border border-[var(--border)] hover:bg-white/5 transition-all text-sm relative bg-white/2" 
                  title="Notificações"
                >
                  🔔
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-lg border-2 border-[var(--background)]">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {/* Notifications Dropdown */}
                {showNotifications && (
                  <div className="absolute right-0 mt-3 w-80 bg-[var(--card-bg)] backdrop-blur-xl border border-[var(--border)] rounded-2xl shadow-2xl z-50 overflow-hidden ring-1 ring-black/10">
                    <div className="p-4 border-b border-[var(--border)] flex justify-between items-center bg-white/5">
                      <h3 className="font-bold text-sm">Notificações</h3>
                      <button onClick={fetchNotifications} className="text-[10px] bg-[var(--accent)]/10 text-[var(--accent)] px-2 py-1 rounded-md font-bold hover:bg-[var(--accent)]/20">Atualizar</button>
                    </div>
                    <div className="max-h-80 overflow-y-auto w-full">
                      {notificacoes.length === 0 ? (
                        <p className="p-10 text-center text-sm text-[var(--text-muted)]">Nenhuma novidade por aqui.</p>
                      ) : (
                        notificacoes.map((n) => (
                          <div key={n.id} onClick={() => { if (!n.lida) markAsRead(n.id); }} className={`p-4 border-b border-[var(--border)] cursor-pointer hover:bg-white/5 transition-colors ${n.lida ? 'opacity-50' : 'bg-[var(--accent)]/5 relative'}`}>
                            {!n.lida && <div className="absolute left-0 top-0 bottom-0 w-1 bg-[var(--accent)]" />}
                            <p className="text-xs font-bold text-[var(--foreground)] mb-0.5">{n.titulo}</p>
                            <p className="text-[10px] text-[var(--text-muted)] line-clamp-2">{n.mensagem}</p>
                            <p className="text-[9px] text-gray-500 mt-2">{new Date(n.createdAt).toLocaleDateString('pt-BR')}</p>
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
                  className="flex items-center gap-2 border border-[var(--border)] bg-white/2 px-3 py-1.5 rounded-xl cursor-pointer hover:bg-white/5 transition-all shadow-sm"
                >
                  <div className="hidden sm:flex flex-col items-end">
                    <span className="text-xs font-bold leading-tight">Admin</span>
                    <span className="text-[9px] text-[var(--accent)] font-black uppercase tracking-widest">{theme.replace('-', ' ')}</span>
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[var(--accent)] to-blue-400 flex items-center justify-center text-white text-xs font-black shadow-lg">
                    A
                  </div>
                </div>

                {/* Dropdown Menu */}
                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-56 bg-[var(--card-bg)] backdrop-blur-xl border border-[var(--border)] rounded-2xl shadow-2xl z-50 overflow-hidden py-2 ring-1 ring-black/10">
                    <Link href="/dashboard/settings" onClick={() => setShowUserMenu(false)} className="flex items-center gap-3 px-4 py-3 text-sm text-[var(--foreground)] hover:bg-white/5 transition-colors">
                      <span className="text-lg">⚙️</span> Configurações
                    </Link>
                    <Link href="/dashboard/settings#nicho" onClick={() => setShowUserMenu(false)} className="flex items-center gap-3 px-4 py-3 text-sm text-[var(--foreground)] hover:bg-white/5 transition-colors">
                      <span className="text-lg">🎯</span> Alterar Nicho
                    </Link>
                    <div className="border-t border-[var(--border)] my-1 mx-2" />
                    <button onClick={() => { setShowUserMenu(false); window.location.href = '/auth/login'; }} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-500 hover:bg-red-500/5 transition-colors">
                      <span className="text-lg">🚪</span> Sair
                    </button>
                  </div>
                )}
              </div>
            </div>
          </header>

          <div className="flex-1 p-4 md:p-8 animate-in fade-in duration-500">
            {children}
          </div>

          {/* Footer */}
          <footer className={`border-t border-[var(--border)] py-6 px-8 text-center text-[10px] text-[var(--text-muted)] bg-black/2 tracking-widest font-medium uppercase`}>
            © 2025 SOMMAR SOLUÇÕES DIGITAIS — CNPJ: 65.771.133/0001-07
          </footer>
        </div>
      </div>
    </NichoProvider>
  );
}
