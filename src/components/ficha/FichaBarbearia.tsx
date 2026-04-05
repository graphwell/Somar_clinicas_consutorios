"use client";
import React from "react";
import { SecaoFicha } from "./SecaoFicha";
import { CampoFicha, CampoSelect } from "./CampoFicha";

interface FichaBarbeariaProps {
  ficha: any;
  profissionais: { id: string; nome: string }[];
  onSalvar: (campo: string, valor: string) => Promise<void>;
}

export function FichaBarbearia({ ficha, profissionais, onSalvar }: FichaBarbeariaProps) {
  return (
    <div className="space-y-3">
      {/* Preferências de corte */}
      <SecaoFicha titulo="Preferências de Corte" icone={
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/>
          <path d="M20 4L8.12 15.88M14.47 14.48L20 20M8.12 8.12L12 12"/>
        </svg>
      }>
        <CampoFicha
          label="Estilo preferido"
          valor={ficha?.estiloPreferido}
          placeholder="Ex: Degradê médio, social, mohawk..."
          onChange={v => onSalvar("estiloPreferido", v)}
        />
        <CampoFicha
          label="Número da máquina"
          valor={ficha?.maquinaNumero}
          placeholder="Ex: 1, 2, 1.5..."
          onChange={v => onSalvar("maquinaNumero", v)}
        />
        <CampoFicha
          label="Produto favorito"
          valor={ficha?.produtosFavoritos}
          placeholder="Ex: Pomada matte, cera, gel..."
          onChange={v => onSalvar("produtosFavoritos", v)}
        />
      </SecaoFicha>

      {/* Barba */}
      <SecaoFicha titulo="Barba" icone={
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 4l16 16M4 20l6-6m6-6l4-4" strokeLinecap="round"/>
        </svg>
      }>
        <CampoFicha
          label="Estilo da barba"
          valor={ficha?.barbaEstilo}
          placeholder="Ex: Cheia, degradê, cavanhaque, cavado..."
          onChange={v => onSalvar("barbaEstilo", v)}
        />
        <CampoFicha
          label="Produto para barba"
          valor={ficha?.produtoBarba}
          placeholder="Ex: Óleo de barba, balm, cera..."
          onChange={v => onSalvar("produtoBarba", v)}
        />
      </SecaoFicha>

      {/* Alertas */}
      <SecaoFicha titulo="Observações e Alertas" icone={
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
      }>
        <CampoFicha
          label="Alertas importantes"
          valor={ficha?.alertas}
          placeholder="Alergias, restrições, preferências especiais..."
          tipo="textarea"
          onChange={v => onSalvar("alertas", v)}
          destaque={!!ficha?.alertas}
        />
        <CampoFicha
          label="Observações gerais"
          valor={ficha?.observacoesGerais}
          placeholder="Notas do barbeiro..."
          tipo="textarea"
          onChange={v => onSalvar("observacoesGerais", v)}
        />
      </SecaoFicha>

      {/* Profissional preferido */}
      {profissionais.length > 0 && (
        <SecaoFicha titulo="Preferências" icone={
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
          </svg>
        }>
          <div className="rounded-xl p-3 bg-slate-50 border border-card-border">
            <p className="text-[9px] uppercase tracking-[0.2em] font-black text-text-placeholder mb-1">Barbeiro preferido</p>
            <select
              value={ficha?.profissionalPreferidoId ?? ""}
              onChange={e => onSalvar("profissionalPreferidoId", e.target.value)}
              className="w-full text-sm text-text-main bg-transparent outline-none cursor-pointer"
            >
              <option value="">Sem preferência</option>
              {profissionais.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
          </div>
        </SecaoFicha>
      )}
    </div>
  );
}
