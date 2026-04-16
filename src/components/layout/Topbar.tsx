"use client";
import React, { useState, useEffect, useRef } from "react";
import { IconMenu, IconBell } from "@/components/icons/NavIcons";
import Avatar from "@/components/ui/Avatar";
import Link from "next/link";
import { fetchWithAuth, clearAuthSession } from "@/lib/api-utils";
import { useToast } from "@/components/ui/Toast";

interface TopbarProps {
  onMenuClick: () => void;
  currentUser: { nome?: string; email?: string; role?: string } | null;
  currentUser: { nome?: string; email?: string; role?: string } | null;
  clientName?: string | null;
  clientSlug?: string | null;
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

function formatDate(): string {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());
}

export default function Topbar({ onMenuClick, currentUser, clientName, clientSlug }: TopbarProps) {
  const { toast } = useToast();
  const [notifCount, setNotifCount] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifs, setNotifs] = useState<any[]>([]);
  const [userOpen, setUserOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchWithAuth("/api/notifications")
      .then((r) => r.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : data.notifications || [];
        setNotifs(list.slice(0, 5));
        setNotifCount(list.filter((n: any) => !n.lida).length);
      })
      .catch(() => {});
  }, []);

  // Fechar dropdowns ao clicar fora
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node))
        setNotifOpen(false);
      if (userRef.current && !userRef.current.contains(e.target as Node))
        setUserOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const nome = currentUser?.nome || currentUser?.email?.split("@")[0] || "Usuário";
  const dateStr = formatDate();

  const handleCopyLink = () => {
    if (!clientSlug) return;
    const url = `${window.location.origin}/agendar/${clientSlug}`;
    navigator.clipboard.writeText(url)
      .then(() => toast.success("Link copiado para a área de transferência!"))
      .catch(() => toast.error("Não foi possível copiar o link."));
    setUserOpen(false);
  };

  return (
    <header
      className="sticky top-0 z-30 flex items-center justify-between px-4 lg:px-6"
      style={{
        height: 60,
        background: "white",
        borderBottom: "1px solid #EEE9DF",
      }}
    >
      {/* Esquerda */}
      <div className="flex items-center gap-3">
        {/* Hamburger (mobile) */}
        <button
          onClick={onMenuClick}
          className="lg:hidden w-9 h-9 flex items-center justify-center rounded-lg text-slate-300 hover:bg-warm-200 transition-colors"
        >
          <IconMenu />
        </button>

        {/* Saudação (desktop) */}
        <div className="hidden lg:block">
          <h2 className="font-display text-lg text-slate-700 leading-tight">
            {getGreeting()}, {nome.split(" ")[0]}
          </h2>
          <p className="text-[11px] text-slate-100 capitalize mt-0.5">{dateStr}</p>
        </div>

        {/* Nome da clínica (mobile — centro) */}
        <p className="lg:hidden text-sm font-medium text-slate-700 truncate max-w-[180px]">
          {clientName || "Synka"}
        </p>
      </div>

      {/* Direita */}
      <div className="flex items-center gap-2">
        {/* Status pill */}
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium bg-sage-100 text-sage-700">
          <span className="w-1.5 h-1.5 rounded-full bg-sage-500 pulse-dot" />
          Ativo
        </div>

        {/* Notificações */}
        <div ref={notifRef} className="relative">
          <button
            onClick={() => setNotifOpen((v) => !v)}
            className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-300 hover:bg-warm-200 transition-colors relative"
          >
            <IconBell />
            {notifCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-xl border border-warm-200 shadow-card-hover z-50 overflow-hidden fade-up">
              <div className="px-4 py-3 border-b border-warm-200">
                <p className="text-xs font-medium text-slate-700">Notificações</p>
              </div>
              {notifs.length === 0 ? (
                <p className="px-4 py-6 text-xs text-slate-100 text-center">
                  Nenhuma notificação
                </p>
              ) : (
                notifs.map((n: any) => (
                  <div
                    key={n.id}
                    className={`px-4 py-3 border-b border-warm-100 text-xs ${
                      !n.lida ? "bg-sage-50" : ""
                    }`}
                  >
                    <p className="font-medium text-slate-700">{n.titulo}</p>
                    <p className="text-slate-100 mt-0.5">{n.mensagem}</p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Avatar / user dropdown */}
        <div ref={userRef} className="relative">
          <button
            onClick={() => setUserOpen((v) => !v)}
            className="flex items-center gap-2 hover:bg-warm-200 rounded-lg px-2 py-1 transition-colors"
          >
            <Avatar nome={nome} size="md" />
            <div className="hidden sm:block text-left">
              <p className="text-[11px] font-medium text-slate-700 leading-tight">
                {nome.split(" ")[0]}
              </p>
              <p className="text-[10px] text-slate-100 capitalize">
                {currentUser?.role || ""}
              </p>
            </div>
          </button>

          {userOpen && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl border border-warm-200 shadow-card-hover z-50 overflow-hidden fade-up">
              <div className="px-4 py-3 border-b border-warm-200">
                <p className="text-xs font-medium text-slate-700">{nome}</p>
                <p className="text-[11px] text-slate-100">{currentUser?.email}</p>
              </div>

              <div className="py-1 flex flex-col border-b border-warm-100">
                <Link
                  href="/dashboard/settings"
                  onClick={() => setUserOpen(false)}
                  className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
                  Configurações
                </Link>
                
                {clientSlug && (
                  <button
                    onClick={handleCopyLink}
                    className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>
                    Copiar Meu Link Público
                  </button>
                )}
              </div>

              <div className="py-1">
                <button
                  onClick={() => clearAuthSession()}
                  className="w-full text-left px-4 py-2 text-xs text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                  Sair da conta
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
