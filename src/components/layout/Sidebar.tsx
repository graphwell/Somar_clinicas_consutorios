"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useNicho } from "@/context/NichoContext";
import { clearAuthSession, fetchWithAuth } from "@/lib/api-utils";
import Avatar from "@/components/ui/Avatar";
import { SynkaLogo } from '@/components/SynkaLogo';
import {
  IconAgenda, IconPacientes, IconEquipe, IconServicos,
  IconProntuario, IconOdontograma, IconConvenio, IconRelatorios,
  IconCampanhas, IconIntegracoes, IconFinanceiro, IconAssinaturas,
  IconConfiguracoes, IconLogout, IconAjuda, IconStethoscope, IconVitrine,
  IconAntesDepois,
} from "@/components/icons/NavIcons";

interface NavItemProps {
  href: string;
  label: string;
  Icon: React.FC;
  active: boolean;
}

function NavItem({ href, label, Icon, active }: NavItemProps) {
  return (
    <Link
      href={href}
      className={[
        "flex items-center gap-2.5 px-3 py-2.5 mx-2 rounded-lg",
        "text-[13px] transition-all duration-150",
        active
          ? "text-white font-medium shadow-sage"
          : "text-white/55 hover:bg-white/[0.07] hover:text-white/85",
      ].join(" ")}
      style={
        active
          ? { background: "linear-gradient(135deg, #40916C, #2D6A4F)" }
          : {}
      }
    >
      <Icon />
      <span className="truncate">{label}</span>
    </Link>
  );
}

function SectionLabel({ label }: { label: string }) {
  return (
    <p className="px-5 pt-5 pb-1.5 text-[9px] uppercase tracking-[1.2px] text-white/30 font-medium">
      {label}
    </p>
  );
}

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: { nome?: string; email?: string; role?: string; avatarUrl?: string | null } | null;
  clientLogo?: string | null;
  clientName?: string | null;
}

export default function Sidebar({
  isOpen,
  onClose,
  currentUser,
  clientLogo,
  clientName,
}: SidebarProps) {
  const pathname = usePathname();
  const { labels, nicho } = useNicho();
  const NICHOS_ANTES_DEPOIS = ['CLINICA_ESTETICA', 'SALAO_BELEZA', 'BARBEARIA'];
  const temAntesDepois = NICHOS_ANTES_DEPOIS.includes(nicho);
  const [planoAtual, setPlanoAtual] = useState<string>('trial');
  const [diasRestantes, setDiasRestantes] = useState<number>(30);

  useEffect(() => {
    fetchWithAuth('/api/billing/planos')
      .then(r => r.json())
      .then(data => {
        if (data?.assinatura) {
          setPlanoAtual(data.assinatura.plano ?? 'trial');
          if (data.assinatura.trialFim) {
            const dias = Math.max(0, Math.ceil(
              (new Date(data.assinatura.trialFim).getTime() - Date.now()) / 86400000
            ));
            setDiasRestantes(dias);
          }
        }
      })
      .catch(() => {});
  }, []);

  const role = currentUser?.role || "recepcao";
  const isAdmin = role === "admin" || role === "synka_admin";
  const isRecepcao = role === "recepcao";
  const isProfissional = role === "profissional";

  const is = (path: string, exact = false) =>
    exact ? pathname === path : pathname.startsWith(path);

  const prontuarioIcon =
    labels.tipoProntuario === "ODONTOLOGICO"
      ? IconOdontograma
      : IconProntuario;

  return (
    <>
      {/* Sidebar */}
      <aside
        className={[
          "fixed left-0 top-0 bottom-0 z-50 flex flex-col",
          "w-[220px] transition-transform duration-300",
          "lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
        style={{ background: "#1B2B3A" }}
      >
        {/* Logo / Branding */}
        <div
          className="px-5 py-6"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}
        >
          {clientLogo ? (
            <div className="h-10 flex items-center">
              <img
                src={clientLogo}
                alt={clientName || "Logo"}
                style={{ maxHeight: '40px', maxWidth: '120px', objectFit: 'contain', background: 'transparent' }}
              />
            </div>
          ) : clientName ? (
            <div className="flex items-center gap-3">
              <div
                className="w-[38px] h-[38px] rounded-xl flex items-center justify-center text-xs font-medium text-white shrink-0"
                style={{ background: "linear-gradient(135deg,#40916C,#52B788)" }}
              >
                {clientName.charAt(0).toUpperCase()}
              </div>
              <div className="overflow-hidden">
                <p className="text-sm text-white font-display truncate leading-tight">
                  {clientName}
                </p>
                <p
                  className="text-[10px] uppercase tracking-widest mt-0.5"
                  style={{ color: "rgba(255,255,255,0.4)" }}
                >
                  {labels.labelNicho || "Clínica"}
                </p>
              </div>
            </div>
          ) : (
            /* Sem logo nem nome — exibe logo Synka branca */
            <SynkaLogo variant="dark" height={28} />
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto no-scrollbar py-2">
          <SectionLabel label="Principal" />
          <NavItem href="/dashboard" label={labels.termoAgenda || "Agenda"} Icon={IconAgenda} active={is("/dashboard", true)} />
          <NavItem href="/dashboard/appointments" label="Atendimentos" Icon={IconStethoscope} active={is("/dashboard/appointments")} />
          <NavItem href="/dashboard/patients" label={labels.termoPacientePlural || "Pacientes"} Icon={IconPacientes} active={is("/dashboard/patients")} />
          {!isProfissional && (
            <NavItem href="/dashboard/team" label={labels.termoProfissionalPlural || "Equipe"} Icon={IconEquipe} active={is("/dashboard/team")} />
          )}
          {!isProfissional && (
            <NavItem href="/dashboard/services" label={labels.termoServicoPlural || "Serviços"} Icon={IconServicos} active={is("/dashboard/services")} />
          )}

          <SectionLabel label="Operação" />
          {labels.temFichaCliente && (
            <NavItem href="/dashboard/ficha" label="Fichas" Icon={IconProntuario} active={is("/dashboard/ficha")} />
          )}
          {labels.temProntuario && (
            <NavItem href="/dashboard/clinical-records" label={labels.termoProntuario || "Prontuário"} Icon={prontuarioIcon} active={is("/dashboard/clinical-records")} />
          )}
          {labels.temOdontograma && (
            <NavItem href="/dashboard/odontograma" label="Odontograma" Icon={IconOdontograma} active={is("/dashboard/odontograma")} />
          )}
          {labels.temConvenio && !isProfissional && (
            <NavItem href="/dashboard/insurance" label="Convênios" Icon={IconConvenio} active={is("/dashboard/insurance")} />
          )}
          {isAdmin && (
            <NavItem href="/dashboard/reports" label="Relatórios" Icon={IconRelatorios} active={is("/dashboard/reports")} />
          )}

          {(isAdmin || isRecepcao) && (
            <>
              <SectionLabel label="Marketing & IA" />
              <NavItem href="/dashboard/help" label="Central de Ajuda" Icon={IconAjuda} active={is("/dashboard/help")} />
              {isAdmin && (
                <NavItem href="/dashboard/marketing/campaigns" label="Avisos e Lembretes" Icon={IconCampanhas} active={is("/dashboard/marketing/campaigns")} />
              )}
              {isAdmin && temAntesDepois && (
                <NavItem href="/dashboard/antes-depois" label="Antes e Depois" Icon={IconAntesDepois} active={is("/dashboard/antes-depois")} />
              )}
            </>
          )}

          {isAdmin && (
            <>
              <SectionLabel label="Vitrine" />
              <NavItem href="/dashboard/vitrine" label="Vitrine de Produtos" Icon={IconVitrine} active={is("/dashboard/vitrine")} />
            </>
          )}

          <SectionLabel label="Gestão" />
          {isAdmin && (
            <NavItem href="/dashboard/finance" label="Financeiro" Icon={IconFinanceiro} active={is("/dashboard/finance")} />
          )}
          {isAdmin && (
            <NavItem href="/dashboard/integrations" label="Integrações" Icon={IconIntegracoes} active={is("/dashboard/integrations")} />
          )}
          {!isProfissional && (
            <NavItem href="/dashboard/settings" label="Configurações" Icon={IconConfiguracoes} active={is("/dashboard/settings", true) || is("/dashboard/settings/convenios") || is("/dashboard/settings/upsell")} />
          )}
          {isAdmin && (
            <NavItem href="/dashboard/settings/permissoes" label="Permissões" Icon={IconConfiguracoes} active={is("/dashboard/settings/permissoes")} />
          )}
        </nav>

        {/* Meu Plano — acima do avatar */}
        <div className="px-3 pb-1">
          <Link
            href="/dashboard/billing"
            className="flex items-center justify-between px-3 py-2.5 rounded-lg transition-all duration-150"
            style={{ color: 'rgba(255,255,255,0.55)' }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.07)';
              (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.85)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.background = '';
              (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.55)';
            }}
          >
            <div className="flex items-center gap-2.5">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0">
                <rect x="1.333" y="3.333" width="13.333" height="9.333" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M1.333 6.667h13.333" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                <path d="M4 10h2M7.333 10h1.333" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <span className="text-[13px] font-medium">Meu Plano</span>
            </div>
            {planoAtual === 'trial' && (
              <span
                className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full uppercase tracking-wide"
                style={diasRestantes <= 3
                  ? { background: '#EF4444', color: 'white' }
                  : diasRestantes <= 7
                    ? { background: '#F59E0B', color: '#78350F' }
                    : { background: 'rgba(245,158,11,0.25)', color: '#FCD34D' }
                }
              >
                {diasRestantes <= 0 ? 'Expirado' : `${diasRestantes}d`}
              </span>
            )}
            {planoAtual === 'start' && (
              <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full uppercase" style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)' }}>
                Start
              </span>
            )}
            {planoAtual === 'solo' && (
              <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full uppercase" style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)' }}>
                Solo
              </span>
            )}
            {planoAtual === 'pro' && (
              <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full uppercase" style={{ background: 'rgba(64,145,108,0.3)', color: '#95D5B2' }}>
                Pro
              </span>
            )}
            {planoAtual === 'business' && (
              <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full uppercase" style={{ background: 'rgba(196,151,58,0.2)', color: '#FCD34D' }}>
                Business
              </span>
            )}
          </Link>
        </div>

        {/* Footer — Usuário + Logout */}
        <div
          className="px-4 py-4"
          style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}
        >
          <div className="flex items-center gap-2.5 mb-3">
          <Link
            href="/dashboard/settings"
            className="relative group flex-shrink-0"
            title="Editar meu perfil"
          >
            <Avatar
              nome={currentUser?.nome || currentUser?.email || "U"}
              src={currentUser?.avatarUrl}
              size="md"
            />
            {/* Badge câmera — aparece no hover */}
            <div
              className="absolute inset-0 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ background: 'rgba(0,0,0,0.45)' }}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
            </div>
          </Link>
            <div className="overflow-hidden flex-1">
              <p className="text-[12px] text-white font-medium truncate">
                {currentUser?.nome || currentUser?.email?.split("@")[0] || "Usuário"}
              </p>
              <p className="text-[10px] capitalize" style={{ color: "rgba(255,255,255,0.4)" }}>
                {role}
              </p>
            </div>
          </div>
          <button
            onClick={() => clearAuthSession()}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] transition-all duration-150"
            style={{ color: "rgba(255,255,255,0.4)" }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)";
              (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.7)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "";
              (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.4)";
            }}
          >
            <IconLogout />
            Sair
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[49] lg:hidden"
          onClick={onClose}
        />
      )}
    </>
  );
}
