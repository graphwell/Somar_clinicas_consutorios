"use client";
import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useNicho } from "@/context/NichoContext";
import { clearAuthSession } from "@/lib/api-utils";
import Avatar from "@/components/ui/Avatar";
import {
  IconAgenda, IconPacientes, IconEquipe, IconServicos,
  IconProntuario, IconOdontograma, IconConvenio, IconRelatorios,
  IconCampanhas, IconIntegracoes, IconFinanceiro, IconAssinaturas,
  IconConfiguracoes, IconLogout, IconEspecialidades, IconAjuda,
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
  currentUser: { nome?: string; email?: string; role?: string } | null;
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
  const { labels } = useNicho();

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
            <img
              src={clientLogo}
              alt={clientName || "Logo"}
              className="h-10 w-auto object-contain"
            />
          ) : (
            <div className="flex items-center gap-3">
              <div
                className="w-[38px] h-[38px] rounded-xl flex items-center justify-center text-xs font-medium text-white shrink-0"
                style={{ background: "linear-gradient(135deg,#40916C,#52B788)" }}
              >
                {(clientName || "S").charAt(0).toUpperCase()}
              </div>
              <div className="overflow-hidden">
                <p className="text-sm text-white font-display truncate leading-tight">
                  {clientName || "Synka"}
                </p>
                <p
                  className="text-[10px] uppercase tracking-widest mt-0.5"
                  style={{ color: "rgba(255,255,255,0.4)" }}
                >
                  {labels.labelNicho || "Clínica"}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto no-scrollbar py-2">
          <SectionLabel label="Principal" />
          <NavItem href="/dashboard" label={labels.termoAgenda || "Agenda"} Icon={IconAgenda} active={is("/dashboard", true)} />
          <NavItem href="/dashboard/patients" label={labels.termoPacientePlural || "Pacientes"} Icon={IconPacientes} active={is("/dashboard/patients")} />
          {!isProfissional && (
            <NavItem href="/dashboard/team" label={labels.termoProfissionalPlural || "Equipe"} Icon={IconEquipe} active={is("/dashboard/team")} />
          )}
          {!isProfissional && (
            <NavItem href="/dashboard/services" label={labels.termoAtendimentoPlural || "Serviços"} Icon={IconServicos} active={is("/dashboard/services")} />
          )}
          {labels.temEspecialidades && !isProfissional && (
            <NavItem href="/dashboard/specialties" label="Especialidades" Icon={IconEspecialidades} active={is("/dashboard/specialties")} />
          )}

          <SectionLabel label="Operação" />
          {labels.temProntuario && (
            <NavItem href="/dashboard/clinical-records" label={labels.termoProntuario || "Prontuário"} Icon={prontuarioIcon} active={is("/dashboard/clinical-records")} />
          )}
          {labels.temOdontograma && (
            <NavItem href="/dashboard/odontograma" label="Odontograma" Icon={IconOdontograma} active={is("/dashboard/odontograma")} />
          )}
          {labels.temConvenio && !isProfissional && (
            <NavItem href="/dashboard/insurance" label="Convênios" Icon={IconConvenio} active={is("/dashboard/insurance")} />
          )}
          {labels.temAssinatura && !isProfissional && (
            <NavItem href="/dashboard/subscriptions" label="Planos" Icon={IconAssinaturas} active={is("/dashboard/subscriptions")} />
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
              {isAdmin && (
                <NavItem href="/dashboard/marketing/integrations" label="Integrações" Icon={IconIntegracoes} active={is("/dashboard/marketing/integrations")} />
              )}
            </>
          )}

          <SectionLabel label="Gestão" />
          {isAdmin && (
            <NavItem href="/dashboard/finance" label="Financeiro" Icon={IconFinanceiro} active={is("/dashboard/finance")} />
          )}
          {!isProfissional && (
            <NavItem href="/dashboard/settings" label="Configurações" Icon={IconConfiguracoes} active={is("/dashboard/settings", true) || is("/dashboard/settings/convenios") || is("/dashboard/settings/upsell")} />
          )}
          {isAdmin && (
            <NavItem href="/dashboard/settings/permissoes" label="Permissões" Icon={IconConfiguracoes} active={is("/dashboard/settings/permissoes")} />
          )}
        </nav>

        {/* Footer — Usuário + Logout */}
        <div
          className="px-4 py-4"
          style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}
        >
          <div className="flex items-center gap-2.5 mb-3">
            <Avatar
              nome={currentUser?.nome || currentUser?.email || "U"}
              size="md"
            />
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
