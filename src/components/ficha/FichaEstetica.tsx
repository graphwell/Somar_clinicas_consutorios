"use client";
import React from "react";
import { SecaoFicha } from "./SecaoFicha";
import { CampoFicha, CampoSelect } from "./CampoFicha";

interface FichaEsteticaProps {
  ficha: any;
  profissionais: { id: string; nome: string }[];
  onSalvar: (campo: string, valor: string) => Promise<void>;
}

export function FichaEstetica({ ficha, profissionais, onSalvar }: FichaEsteticaProps) {
  return (
    <div className="space-y-3">
      {/* Perfil da pele */}
      <SecaoFicha titulo="Perfil da Pele" icone={
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </svg>
      }>
        <CampoSelect
          label="Tipo de pele"
          valor={ficha?.tipoPele}
          opcoes={["Oleosa", "Seca", "Mista", "Sensível", "Normal"]}
          onChange={v => onSalvar("tipoPele", v)}
        />
        <CampoSelect
          label="Fototipo (Fitzpatrick)"
          valor={ficha?.fitzpatrick}
          opcoes={[
            "Tipo I — Muito claro",
            "Tipo II — Claro",
            "Tipo III — Médio",
            "Tipo IV — Moreno claro",
            "Tipo V — Moreno escuro",
            "Tipo VI — Negro",
          ]}
          onChange={v => onSalvar("fitzpatrick", v)}
        />
        <CampoFicha
          label="Patologias da pele"
          valor={ficha?.patologiasPele}
          placeholder="Rosácea, melasma, acne, dermatite..."
          tipo="textarea"
          onChange={v => onSalvar("patologiasPele", v)}
        />
      </SecaoFicha>

      {/* Restrições e Alertas */}
      <SecaoFicha titulo="Restrições e Alertas" icone={
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
      }>
        <CampoFicha
          label="Alergias a substâncias"
          valor={ficha?.alergiasSubstancias}
          tipo="textarea"
          placeholder="Ácidos, fragrâncias, conservantes, látex..."
          onChange={v => onSalvar("alergiasSubstancias", v)}
          destaque={!!ficha?.alergiasSubstancias}
        />
        <CampoFicha
          label="Medicamentos em uso"
          valor={ficha?.medicamentosUso}
          tipo="textarea"
          placeholder="Isotretinoína, anticoagulantes, retinoides..."
          onChange={v => onSalvar("medicamentosUso", v)}
          destaque={!!ficha?.medicamentosUso}
        />
        <CampoFicha
          label="Alertas importantes"
          valor={ficha?.alertas}
          tipo="textarea"
          placeholder="Contraindicações ou restrições urgentes..."
          onChange={v => onSalvar("alertas", v)}
          destaque={!!ficha?.alertas}
        />
      </SecaoFicha>

      {/* Protocolos */}
      <SecaoFicha titulo="Histórico de Protocolos" icone={
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
          <polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
        </svg>
      }>
        <CampoFicha
          label="Protocolos já realizados"
          valor={ficha?.protocolosRealizados}
          tipo="textarea"
          placeholder="Peeling, microagulhamento, laser, ultrassom..."
          onChange={v => onSalvar("protocolosRealizados", v)}
        />
        <CampoFicha
          label="Última limpeza de pele (data)"
          valor={ficha?.ultimaLimpezaPele ? new Date(ficha.ultimaLimpezaPele).toISOString().split("T")[0] : ""}
          tipo="date"
          onChange={v => onSalvar("ultimaLimpezaPele", v)}
        />
        <CampoFicha
          label="Evolução e resultados"
          valor={ficha?.resultadosEvolucao}
          tipo="textarea"
          placeholder="Progresso observado, fotos de referência..."
          onChange={v => onSalvar("resultadosEvolucao", v)}
        />
      </SecaoFicha>

      {/* Observações */}
      <SecaoFicha titulo="Observações Gerais" icone={
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
      }>
        <CampoFicha
          label="Observações gerais"
          valor={ficha?.observacoesGerais}
          placeholder="Notas da esteticista..."
          tipo="textarea"
          onChange={v => onSalvar("observacoesGerais", v)}
        />
        {profissionais.length > 0 && (
          <div className="rounded-xl p-3 bg-slate-50 border border-card-border">
            <p className="text-[9px] uppercase tracking-[0.2em] font-black text-text-placeholder mb-1">Esteticista preferida</p>
            <select
              value={ficha?.profissionalPreferidoId ?? ""}
              onChange={e => onSalvar("profissionalPreferidoId", e.target.value)}
              className="w-full text-sm text-text-main bg-transparent outline-none cursor-pointer"
            >
              <option value="">Sem preferência</option>
              {profissionais.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
          </div>
        )}
      </SecaoFicha>
    </div>
  );
}
