"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTheme } from '@/context/ThemeContext';
import { usePathname, useRouter } from 'next/navigation';
import { NichoProvider, useNicho } from '@/context/NichoContext';
import { fetchWithAuth, getAuthToken, clearAuthSession } from '@/lib/api-utils';

const NavItem = ({ href, label, icon, isCollapsed, active }: { href: string; label: string; icon: string; isCollapsed: boolean; active: boolean }) => (
  <Link 
    href={href} 
    className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all text-xs font-bold group relative
      ${active ? 'bg-primary-soft text-primary shadow-sm border border-primary/10' : 'text-text-muted hover:bg-slate-50 hover:text-text-main'}`}
    title={isCollapsed ? label : ''}
  >
    <span className="text-lg">{icon}</span>
    {!isCollapsed && <span className="truncate">{label}</span>}
    {isCollapsed && (
      <div className="absolute left-full ml-4 px-3 py-2 bg-text-main text-white text-[10px] font-black rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 shadow-xl uppercase tracking-widest">
        {label}
      </div>
    )}
  </Link>
);

const NavigationLinks = ({ isCollapsed }: { isCollapsed: boolean }) => {
  const { labels } = useNicho();
  const pathname = usePathname();
  
  return (
    <div className="flex flex-col gap-8 flex-1 overflow-y-auto no-scrollbar py-6">
      <section className="space-y-1.5">
        <p className={`text-[9px] font-black uppercase tracking-[0.2em] text-text-placeholder mb-3 px-4 ${isCollapsed ? 'hidden' : 'block'}`}>Principal</p>
        <NavItem href="/dashboard" label={labels.termoAgenda} icon="📅" isCollapsed={isCollapsed} active={pathname === '/dashboard'} />
        <NavItem href="/dashboard/patients" label={labels.termoPacientePlural} icon="👥" isCollapsed={isCollapsed} active={pathname.startsWith('/dashboard/patients')} />
        <NavItem href="/dashboard/team" label={labels.termoProfissional === 'Médico' ? 'Corpo Clínico' : labels.termoProfissional === 'Dentista' ? 'Equipe Odonto' : 'Equipe'} icon="🧑‍💼" isCollapsed={isCollapsed} active={pathname === '/dashboard/team'} />
        <NavItem href="/dashboard/services" label={labels.termoServicoPlural} icon="📦" isCollapsed={isCollapsed} active={pathname === '/dashboard/services'} />
      </section>

      <section className="space-y-1.5">
        <p className={`text-[9px] font-black uppercase tracking-[0.2em] text-text-placeholder mb-3 px-4 ${isCollapsed ? 'hidden' : 'block'}`}>Operação</p>
        {labels.temProntuario && (
          <NavItem href="/dashboard/clinical-records" label="Prontuário" icon="🩺" isCollapsed={isCollapsed} active={pathname.startsWith('/dashboard/clinical-records')} />
        )}
        {labels.temConvenio && (
          <NavItem href="/dashboard/insurance" label="Convênios" icon="💳" isCollapsed={isCollapsed} active={pathname.startsWith('/dashboard/insurance')} />
        )}
        {labels.temAssinatura && (
          <NavItem href="/dashboard/subscriptions" label="Planos e Assinaturas" icon="🎟️" isCollapsed={isCollapsed} active={pathname.startsWith('/dashboard/subscriptions')} />
        )}
        <NavItem href="/dashboard/reports" label="Relatórios" icon="📊" isCollapsed={isCollapsed} active={pathname === '/dashboard/reports'} />
      </section>

      <section className="space-y-1.5">
        <p className={`text-[9px] font-black uppercase tracking-[0.2em] text-text-placeholder mb-3 px-4 ${isCollapsed ? 'hidden' : 'block'}`}>Marketing & IA</p>
        <NavItem href="/dashboard/help" label="Central de Ajuda" icon="🧠" isCollapsed={isCollapsed} active={pathname === '/dashboard/help'} />
        <NavItem href="/dashboard/marketing" label="Campanhas" icon="📢" isCollapsed={isCollapsed} active={pathname === '/dashboard/marketing'} />
        <NavItem href="/dashboard/integrations" label="Integrações" icon="🔗" isCollapsed={isCollapsed} active={pathname === '/dashboard/integrations'} />
      </section>

      <section className="space-y-1.5 mt-auto border-t border-slate-50 pt-6">
        <p className={`text-[9px] font-black uppercase tracking-[0.2em] text-text-placeholder mb-3 px-4 ${isCollapsed ? 'hidden' : 'block'}`}>Gestão</p>
        <NavItem href="/dashboard/finance" label="Financeiro" icon="🏦" isCollapsed={isCollapsed} active={pathname === '/dashboard/finance'} />
        <NavItem href="/dashboard/settings" label="Configurações" icon="⚙️" isCollapsed={isCollapsed} active={pathname === '/dashboard/settings'} />
      </section>
    </div>
  );
};

function DashboardContent({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();
  const { onboardingCompleted, loading: nichoLoading } = useNicho();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [clientLogo, setClientLogo] = useState<string | null>(null);
  const [clientName, setClientName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    if (!hasMounted) return;
    // Redireciona para onboarding se não concluído
    if (!nichoLoading && onboardingCompleted === false) {
      window.location.href = '/onboarding';
      return;
    }
  }, [onboardingCompleted, nichoLoading, hasMounted]);

  useEffect(() => {
    if (!hasMounted) return;
    const token = getAuthToken();
    if (!token) {
      window.location.href = '/auth/login';
      return;
    }

    const stored = localStorage.getItem('synka-sidebar-collapsed');
    if (stored === 'true') setIsCollapsed(true);

    // Busca branding dinâmico baseado no token
    fetchWithAuth('/api/upload/logo')
      .then(response => {
        if (response.ok) return response.json();
        throw new Error();
      })
      .then(data => {
        if (data.logoUrl) setClientLogo(data.logoUrl);
        if (data.nomeClinica) setClientName(data.nomeClinica);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const toggleSidebar = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem('synka-sidebar-collapsed', String(newState));
  };
  
  if (!hasMounted) return <div className="min-h-screen bg-slate-50 flex items-center justify-center animate-pulse font-black text-[10px] uppercase tracking-widest text-text-placeholder">Inicializando Synka...</div>;
  if (loading && !getAuthToken()) return null; // Prevenção de flash de conteúdo não autorizado

  return (
    <div className={`min-h-screen bg-background text-text-main flex`}>
      
      {mobileOpen && <div className="fixed inset-0 bg-slate-900/10 backdrop-blur-sm z-30 md:hidden animate-in fade-in" onClick={() => setMobileOpen(false)} />}

      <nav className={`fixed left-0 top-0 h-full bg-white border-r border-card-border p-6 flex flex-col z-40 transition-all duration-500 shadow-sm ${isCollapsed ? 'w-24' : 'w-72'} ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} h-12 mb-10 transition-all`}>
          <div className="flex items-center gap-3 overflow-hidden">
             <img src="/icon-192.png" alt="Logo" className="h-10 w-10 shrink-0" />
             {!isCollapsed && <span className="font-black text-2xl tracking-tighter text-text-main">synka<span className="text-primary">.</span></span>}
          </div>
        </div>

        <NavigationLinks isCollapsed={isCollapsed} />
        
        <div className="mt-6 space-y-4 pt-6 border-t border-slate-50">
          <button onClick={toggleSidebar} className="w-full h-12 flex items-center justify-center rounded-2xl bg-slate-50 hover:bg-slate-100 text-text-placeholder transition-all font-black text-xs border border-card-border">
            {isCollapsed ? '→' : '←'}
          </button>
          <button onClick={() => clearAuthSession()} className="w-full h-12 flex items-center justify-center rounded-2xl bg-red-50 hover:bg-red-100 text-red-500 transition-all font-black text-xs border border-red-100">
             {isCollapsed ? '🚪' : 'SAIR DO CONSOLE'}
          </button>
        </div>
      </nav>

      <div className={`flex-1 flex flex-col min-h-screen transition-all duration-500 ${isCollapsed ? 'md:ml-24' : 'md:ml-72'}`}>
        <header className="h-[76px] glass-header flex items-center px-6 md:px-12 justify-between">
          <div className="flex items-center gap-6">
            <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-card-border">
               <span className="block w-5 h-0.5 bg-text-muted mb-1"></span>
               <span className="block w-5 h-0.5 bg-text-muted mb-1"></span>
               <span className="block w-5 h-0.5 bg-text-muted"></span>
            </button>
            
            <div className="flex items-center h-full min-h-[40px]">
              {clientLogo ? (
                <img src={clientLogo} alt="Logo" className="max-h-[40px] w-auto object-contain animate-premium" />
              ) : (
                <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-text-placeholder italic">
                  {clientName || 'Console Clinical OS'}
                </h2>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden lg:flex items-center gap-2 px-4 py-2 bg-status-success-bg rounded-full border border-status-success/10 text-[9px] font-black text-status-success uppercase tracking-[0.2em]">
              <span className="w-1.5 h-1.5 bg-status-success rounded-full animate-pulse shadow-[0_0_8px_var(--color-status-success)]"></span> Ativo
            </div>

            <div className="w-px h-6 bg-card-border mx-2 hidden md:block" />

            <div className="flex items-center gap-3">
               <button className="w-11 h-11 rounded-xl flex items-center justify-center bg-white border border-card-border hover:bg-slate-50 transition-all relative shadow-sm">
                  🔔 <span className="absolute top-3 right-3 w-2 h-2 bg-status-error rounded-full border-2 border-white"></span>
               </button>
               <div className="flex items-center gap-4 pl-4 border-l border-card-border ml-2">
                  <div className="text-right hidden sm:block">
                     <p className="text-[10px] font-black text-text-main uppercase tracking-tighter">Administrador</p>
                     <p className="text-[8px] font-black text-primary uppercase tracking-widest opacity-60">V2.3 SaaS</p>
                  </div>
                  <div className="w-11 h-11 rounded-2xl bg-primary-soft flex items-center justify-center font-black text-primary border border-primary/20 shadow-sm text-sm">A</div>
               </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 md:p-14 animate-premium">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>

        <footer className="py-12 text-[9px] font-black text-text-placeholder uppercase tracking-[0.5em] bg-white border-t border-slate-50 text-center">
          © 2025 SYNKA CLINICAL OS — V2.3 MULTI-TENANT REAL
        </footer>
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <NichoProvider>
       <DashboardContent>{children}</DashboardContent>
    </NichoProvider>
  );
}
