"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTheme } from '@/context/ThemeContext';
import { usePathname } from 'next/navigation';
import { SynkaIcon } from '@/components/SynkaLogo';
import { NichoProvider, useNicho } from '@/context/NichoContext';

const NavItem = ({ href, label, icon, isCollapsed, active }: { href: string; label: string; icon: string; isCollapsed: boolean; active: boolean }) => (
  <Link 
    href={href} 
    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-medium group relative
      ${active ? 'bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20 shadow-sm' : 'text-[var(--text-muted)] hover:bg-white/5 hover:text-[var(--foreground)]'}`}
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
  const pathname = usePathname();
  
  return (
    <div className="flex flex-col gap-1 flex-1">
      <NavItem href="/dashboard" label="Agenda" icon="📅" isCollapsed={isCollapsed} active={pathname === '/dashboard'} />
      <NavItem href="/dashboard/patients" label={`${labels.cliente}s`} icon="👥" isCollapsed={isCollapsed} active={pathname.startsWith('/dashboard/patients')} />
      <NavItem href="/dashboard/finance" label="Financeiro" icon="🏦" isCollapsed={isCollapsed} active={pathname === '/dashboard/finance'} />
      <NavItem href="/dashboard/reports" label="Relatórios" icon="📊" isCollapsed={isCollapsed} active={pathname === '/dashboard/reports'} />
      
      <div className="border-t border-white/5 my-4 mx-2" />
      
      <p className={`text-[8px] font-black uppercase tracking-[0.3em] text-[var(--text-muted)] mb-2 px-4 ${isCollapsed ? 'hidden' : 'block'}`}>Gestão</p>
      <NavItem href="/dashboard/team" label="Equipe" icon="🧑‍💼" isCollapsed={isCollapsed} active={pathname === '/dashboard/team'} />
      <NavItem href="/dashboard/services" label="Serviços" icon="📦" isCollapsed={isCollapsed} active={pathname === '/dashboard/services'} />
      <NavItem href="/dashboard/campaigns" label="Marketing Hub" icon="📢" isCollapsed={isCollapsed} active={pathname === '/dashboard/campaigns'} />
      <NavItem href="/dashboard/settings" label="Configurações" icon="⚙️" isCollapsed={isCollapsed} active={pathname === '/dashboard/settings'} />
    </div>
  );
};

const TENANT_ID = 'clinica_id_default';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { theme, setTheme } = useTheme();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [clientLogo, setClientLogo] = useState<string | null>(null);
  const [clientName, setClientName] = useState<string | null>(null);

  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [notificacoes, setNotificacoes] = useState<any[]>([]);

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

  useEffect(() => {
    fetch(`/api/upload/logo?tenantId=${TENANT_ID}`)
      .then(r => r.json())
      .then(data => {
        if (data.onboardingCompleted === false) {
          window.location.href = '/onboarding';
          return;
        }
        if (data.logoUrl) setClientLogo(data.logoUrl);
        if (data.nome) setClientName(data.nome);
      })
      .catch(() => {});
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

  return (
    <NichoProvider tenantId={TENANT_ID}>
      <div className={`min-h-screen bg-[var(--background)] text-[var(--foreground)] font-sans flex`}>

        {mobileOpen && <div className="fixed inset-0 bg-black/60 z-30 md:hidden" onClick={() => setMobileOpen(false)} />}

        <nav className={`fixed left-0 top-0 h-full bg-[var(--sidebar-bg)] backdrop-blur-xl border-r border-[var(--border)] p-4 flex flex-col z-40 transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-64'} ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
          
          <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} h-20 mb-4 transition-all overflow-hidden`}>
            {clientLogo ? (
              <img src={clientLogo} alt="Logo" className={`${isCollapsed ? 'h-8 w-8' : 'h-14 max-w-[180px]'} object-contain rounded-xl`} />
            ) : (
              <div className="flex items-center gap-2">
                <img src="/icon-192.png" alt="Logo" className="h-10 w-10 shrink-0" />
                {!isCollapsed && <span className="font-black text-lg tracking-tighter italic">synka</span>}
              </div>
            )}
          </div>

          <NavigationLinks isCollapsed={isCollapsed} />
          
          {/* Bottom Actions: Billing & Trial */}
          <div className="mt-auto space-y-2">
            <Link 
              href="/dashboard/billing" 
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-[10px] font-black uppercase tracking-widest border border-dashed border-[var(--border)] hover:bg-white/5 
                ${isCollapsed ? 'justify-center' : ''} ${pathname === '/dashboard/billing' ? 'text-[var(--accent)] border-[var(--accent)]/40 bg-[var(--accent)]/5' : 'text-[var(--text-muted)]'}`}
              title={isCollapsed ? 'Assinatura' : ''}
            >
              <span>💳</span>
              {!isCollapsed && <span>Meus Planos</span>}
            </Link>

            <div className={`p-4 bg-[var(--accent)]/5 border border-[var(--accent)]/20 rounded-2xl relative overflow-hidden group ${isCollapsed ? 'text-center p-2' : ''}`}>
               <div className="absolute top-0 right-0 p-2 opacity-10 grayscale group-hover:grayscale-0 transition-all">✨</div>
               <p className={`text-[9px] font-black uppercase tracking-tighter text-[var(--accent)] ${isCollapsed ? 'hidden' : 'block'}`}>🟢 Estelar Trial</p>
               {!isCollapsed && <p className="text-[10px] text-[var(--text-muted)] mt-1 font-medium">7 dias restantes</p>}
               {isCollapsed && <p className="text-[10px] font-black text-[var(--accent)]">7D</p>}
            </div>

            <button onClick={toggleSidebar} className="w-full flex items-center justify-center p-3 rounded-xl bg-white/5 hover:bg-white/10 text-gray-500 hover:text-[var(--foreground)] transition-all border border-white/5 text-xs font-black">
              {isCollapsed ? '→' : '←'}
            </button>
          </div>
        </nav>

        <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${isCollapsed ? 'md:ml-20' : 'md:ml-64'}`}>
          <header className={`h-16 border-b border-[var(--border)] bg-[var(--header-bg)] backdrop-blur-md flex items-center px-4 md:px-8 justify-between sticky top-0 z-20`}>
            <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden p-2 rounded-lg hover:bg-white/10">
              <span className="block w-5 h-0.5 bg-current mb-1"></span>
              <span className="block w-5 h-0.5 bg-current mb-1"></span>
              <span className="block w-5 h-0.5 bg-current"></span>
            </button>

            <h2 className="hidden md:block text-xs font-black uppercase tracking-widest text-[var(--text-muted)] italic">
              {clientName || 'Sync Dashboard'}
            </h2>

            <div className="flex items-center gap-3">
              <button onClick={cycleTheme} className="p-2.5 rounded-xl border border-[var(--border)] hover:bg-white/5 transition-all text-sm bg-white/2">
                {theme === 'dark-stellar' ? '🌙' : theme === 'light-soft' ? '☀️' : '🌊'}
              </button>

              <div className="relative">
                <button onClick={() => setShowNotifications(!showNotifications)} className="p-2.5 rounded-xl border border-[var(--border)] hover:bg-white/5 transition-all text-sm relative bg-white/2">
                  🔔 {unreadCount > 0 && <span className="absolute top-1 right-1 h-3 w-3 rounded-full bg-red-500 border-2 border-[var(--background)] shadow-lg" />}
                </button>
                {showNotifications && (
                   <div className="absolute right-0 mt-3 w-80 bg-[var(--card-bg)] border border-[var(--border)] rounded-3xl shadow-2xl z-50 overflow-hidden animate-in zoom-in-95">
                      <div className="p-5 border-b border-[var(--border)] bg-white/5 flex justify-between items-center">
                         <h3 className="font-black text-[10px] uppercase tracking-widest">Notificações</h3>
                         <button onClick={fetchNotifications} className="text-[10px] text-[var(--accent)] font-bold">↻</button>
                      </div>
                      <div className="max-h-80 overflow-y-auto">
                        {notificacoes.length === 0 ? <p className="p-10 text-center text-[10px] font-black uppercase opacity-20">Nada novo</p> : notificacoes.map(n => (
                          <div key={n.id} className="p-4 border-b border-[var(--border)] hover:bg-white/5 cursor-pointer">
                             <p className="text-[11px] font-black text-[var(--foreground)] uppercase mb-0.5 italic">{n.titulo}</p>
                             <p className="text-[10px] text-[var(--text-muted)] line-clamp-2">{n.mensagem}</p>
                          </div>
                        ))}
                      </div>
                   </div>
                )}
              </div>

              <div className="relative">
                <div onClick={() => setShowUserMenu(!showUserMenu)} className="flex items-center gap-2 border border-[var(--border)] bg-white/2 px-3 py-1.5 rounded-xl cursor-pointer hover:bg-white/5 transition-all">
                  <div className="hidden sm:flex flex-col items-end mr-1">
                    <span className="text-[10px] font-black uppercase italic">Admin</span>
                    <span className="text-[8px] text-[var(--accent)] font-black uppercase tracking-widest">{theme.replace('-', ' ')}</span>
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[var(--accent)] to-blue-500 flex items-center justify-center text-white text-[10px] font-black">A</div>
                </div>
                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-56 bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl shadow-2xl z-50 overflow-hidden py-1">
                    <Link href="/dashboard/settings" onClick={() => setShowUserMenu(false)} className="flex items-center gap-3 px-5 py-3 text-[10px] font-black uppercase tracking-widest hover:bg-white/5 transition-all"><span>⚙️</span> Configurações</Link>
                    <Link href="/dashboard/settings#nicho" onClick={() => setShowUserMenu(false)} className="flex items-center gap-3 px-5 py-3 text-[10px] font-black uppercase tracking-widest hover:bg-white/5 transition-all"><span>🎯</span> Mudar Nicho</Link>
                    <div className="border-t border-[var(--border)] my-1" />
                    <button onClick={() => window.location.href = '/auth/login'} className="w-full flex items-center gap-3 px-5 py-3 text-[10px] font-black uppercase tracking-widest text-red-500 hover:bg-red-500/5 transition-all"><span>🚪</span> Sair</button>
                  </div>
                )}
              </div>
            </div>
          </header>

          <main className="flex-1 p-4 md:p-10 animate-in fade-in duration-700">
            {children}
          </main>

          <footer className="py-8 px-10 text-[9px] font-black text-[var(--text-muted)] uppercase tracking-[0.4em] bg-black/5 opacity-50 text-center">
            © 2025 SOMMAR SOLUÇÕES DIGITAIS — CNPJ: 65.771.133/0001-07
          </footer>
        </div>
      </div>
    </NichoProvider>
  );
}
