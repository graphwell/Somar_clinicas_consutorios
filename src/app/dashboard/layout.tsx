"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { NichoProvider, useNicho } from "@/context/NichoContext";
import { fetchWithAuth, getAuthToken } from "@/lib/api-utils";
import SynkaChatModal from "@/components/dashboard/SynkaChatModal";
import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";
import BottomNav from "@/components/layout/BottomNav";
import { ToastProvider } from "@/components/ui/Toast";

function DashboardContent({ children }: { children: React.ReactNode }) {
  const { onboardingCompleted, loading: nichoLoading } = useNicho();
  const router = useRouter();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [clientLogo, setClientLogo]   = useState<string | null>(null);
  const [clientName, setClientName]   = useState<string | null>(null);
  const [loading, setLoading]         = useState(true);
  const [hasMounted, setHasMounted]   = useState(false);
  const [currentUser, setCurrentUser] = useState<{
    nome?: string;
    email?: string;
    role?: string;
  } | null>(null);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    if (!hasMounted) return;
    if (!nichoLoading && onboardingCompleted === false) {
      window.location.href = "/onboarding";
    }
  }, [onboardingCompleted, nichoLoading, hasMounted]);

  useEffect(() => {
    if (!hasMounted) return;

    const token = getAuthToken();
    if (!token) return;

    try {
      const storedUser = localStorage.getItem("synka-user");
      if (storedUser) setCurrentUser(JSON.parse(storedUser));
    } catch {}

    fetchWithAuth("/api/settings")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        if (data.success && data.clinica) {
          const clinica = data.clinica;
          const branding = clinica.configBranding as any;
          if (branding?.logoUrl) setClientLogo(branding.logoUrl);
          if (clinica.nome || clinica.razaoSocial)
            setClientName(clinica.nome || clinica.razaoSocial);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [hasMounted]);

  if (!hasMounted) {
    return (
      <div className="min-h-screen bg-warm-100 flex items-center justify-center">
        <div className="text-[11px] font-medium text-slate-100 uppercase tracking-widest animate-pulse">
          Carregando Synka…
        </div>
      </div>
    );
  }

  return (
    <ToastProvider>
      <div className="min-h-screen bg-warm-100 text-text-main flex">
        {/* Sidebar */}
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          currentUser={currentUser}
          clientLogo={clientLogo}
          clientName={clientName}
        />

        {/* Main */}
        <div className="flex-1 lg:ml-[220px] flex flex-col min-h-screen">
          <Topbar
            onMenuClick={() => setSidebarOpen(true)}
            currentUser={currentUser}
            clientName={clientName}
          />

          <main className="flex-1 p-4 lg:p-6 pb-20 lg:pb-6">
            <div className="max-w-7xl mx-auto fade-up">{children}</div>
          </main>
        </div>

        {/* Bottom Nav mobile */}
        <BottomNav />

        {/* Chat IA flutuante */}
        <SynkaChatModal />
      </div>
    </ToastProvider>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <NichoProvider>
      <DashboardContent>{children}</DashboardContent>
    </NichoProvider>
  );
}
