"use client";
import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconAgenda, IconPacientes, IconStethoscope, IconMore,
  IconEquipe, IconServicos, IconFinanceiro, IconRelatorios, IconCampanhas, IconConfiguracoes,
} from "@/components/icons/NavIcons";

interface NavItem {
  href: string;
  label: string;
  Icon: React.FC;
}

const items: NavItem[] = [
  { href: "/dashboard",          label: "Agenda",    Icon: IconAgenda },
  { href: "/dashboard/patients", label: "Pacientes", Icon: IconPacientes },
];

export default function BottomNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <>
      {/* Bottom sheet "Mais" */}
      {moreOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end lg:hidden"
          onClick={() => setMoreOpen(false)}
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            className="relative bg-white w-full rounded-t-2xl shadow-2xl pb-safe slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-warm-300 rounded-full" />
            </div>
            <p className="px-5 py-3 text-xs font-medium text-slate-100 uppercase tracking-widest">
              Menu
            </p>
            <div className="grid grid-cols-3 gap-px bg-warm-200">
              {[
                { href: "/dashboard/appointments",       label: "Atendimentos",  Icon: IconStethoscope },
                { href: "/dashboard/team",               label: "Equipe",        Icon: IconEquipe },
                { href: "/dashboard/services",           label: "Serviços",      Icon: IconServicos },
                { href: "/dashboard/finance",            label: "Financeiro",    Icon: IconFinanceiro },
                { href: "/dashboard/reports",            label: "Relatórios",    Icon: IconRelatorios },
                { href: "/dashboard/marketing/campaigns",label: "Marketing",     Icon: IconCampanhas },
                { href: "/dashboard/settings",           label: "Configurações", Icon: IconConfiguracoes },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMoreOpen(false)}
                  className="flex flex-col items-center gap-1 py-4 bg-white hover:bg-warm-100 transition-colors text-slate-300"
                >
                  <item.Icon />
                  <span className="text-[10px]">{item.label}</span>
                </Link>
              ))}
            </div>
            <div className="h-8" />
          </div>
        </div>
      )}

      {/* Bottom Nav bar */}
      <nav
        className="fixed bottom-0 inset-x-0 z-40 lg:hidden"
        style={{
          height: 'calc(56px + env(safe-area-inset-bottom, 0px))',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          background: "white",
          borderTop: "1px solid #EEE9DF",
        }}
      >
        <div className="flex h-full">
          {items.map(({ href, label, Icon }) => {
            const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className="flex-1 flex flex-col items-center justify-center gap-0.5 relative"
              >
                <span className={active ? "text-sage-500" : "text-slate-100"}>
                  <Icon />
                </span>
                <span
                  className={`text-[10px] mt-0.5 ${active ? "text-sage-500" : "text-slate-100"}`}
                >
                  {label}
                </span>
                {active && (
                  <span className="absolute bottom-1 w-1 h-1 bg-sage-500 rounded-full" />
                )}
              </Link>
            );
          })}

          {/* Mais */}
          <button
            onClick={() => setMoreOpen(true)}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 text-slate-100"
          >
            <IconMore />
            <span className="text-[10px] mt-0.5">Mais</span>
          </button>
        </div>
      </nav>
    </>
  );
}
