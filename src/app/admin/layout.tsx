"use client";
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { fetchWithAuth, clearAuthSession } from '@/lib/api-utils';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [authorized, setAuthorized] = React.useState(false);

  React.useEffect(() => {
    // Verificação rápida de autoridade admin via API (segura)
    fetchWithAuth('/api/admin/health')
      .then((r: any) => {
        if (r.ok) setAuthorized(true);
        else window.location.href = '/dashboard';
      })
      .catch(() => window.location.href = '/dashboard');
  }, []);

  const isTabActive = (path: string) => pathname.startsWith(path);

  if (!authorized) return null; // Prevenção de flash de admin para não-admins

  return (
    <div className="min-h-screen bg-background text-text-main flex flex-col">
      {/* Admin Header */}
      <header className="h-[76px] glass-header flex items-center px-6 md:px-12 justify-between border-b border-card-border">
        <div className="flex items-center gap-10">
          <div className="flex items-center gap-3">
             <img src="/icon-192.png" alt="Logo" className="h-8 w-8" />
             <span className="font-black text-xl tracking-tighter">synka<span className="text-primary">.admin</span></span>
          </div>

          <nav className="hidden md:flex items-center gap-1">
            <Link 
              href="/admin/ops" 
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all
                ${isTabActive('/admin/ops') ? 'bg-primary-soft text-primary' : 'text-text-placeholder hover:text-text-main hover:bg-slate-50'}`}
            >
              Ops Center
            </Link>
            <Link 
              href="/admin/health" 
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all
                ${isTabActive('/admin/health') ? 'bg-primary-soft text-primary' : 'text-text-placeholder hover:text-text-main hover:bg-slate-50'}`}
            >
              Saúde dos Bancos
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3 px-4 py-2 bg-slate-900 text-white rounded-full text-[9px] font-black uppercase tracking-widest shadow-xl">
            <span className="w-1.5 h-1.5 bg-status-success rounded-full animate-pulse mr-2"></span>
            Ops Team
          </div>
          <button 
            onClick={() => window.location.href = '/dashboard'}
            className="text-[10px] font-black uppercase tracking-widest text-primary hover:underline"
          >
            Voltar ao Console
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto no-scrollbar pb-20">
        {children}
      </main>

      <footer className="h-16 flex items-center justify-center border-t border-slate-50 bg-white/50 backdrop-blur-sm text-[8px] font-black text-text-placeholder uppercase tracking-[0.4em]">
        Synka Infrastructure Command Center — Restrito Somar Soluções
      </footer>
    </div>
  );
}
