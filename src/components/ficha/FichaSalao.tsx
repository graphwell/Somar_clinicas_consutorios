"use client";
import React from "react";
import { SecaoFicha } from "./SecaoFicha";
import { CampoFicha, CampoSelect } from "./CampoFicha";

interface FichaSalaoProps {
  ficha: any;
  profissionais: { id: string; nome: string }[];
  onSalvar: (campo: string, valor: string) => Promise<void>;
}

export function FichaSalao({ ficha, profissionais, onSalvar }: FichaSalaoProps) {
  return (
    <div className="space-y-3">
      {/* Perfil do cabelo */}
      <SecaoFicha titulo="Perfil do Cabelo" icone={
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/>
          <path d="M20 4L8.12 15.88M14.47 14.48L20 20M8.12 8.12L12 12"/>
        </svg>
      }>
        <CampoSelect
          label="Tipo de cabelo"
          valor={ficha?.tipoCabelo}
          opcoes={["Liso", "Ondulado", "Cacheado", "Crespo", "Coily"]}
          onChange={v => onSalvar("tipoCabelo", v)}
        />
        <CampoSelect
          label="Porosidade"
          valor={ficha?.porosidade}
          opcoes={["Baixa", "Média", "Alta"]}
          onChange={v => onSalvar("porosidade", v)}
        />
        <CampoFicha
          label="Coloração atual"
          valor={ficha?.coloracaoAtual}
          placeholder="Ex: Loiro mel, castanho escuro, ruivo..."
          onChange={v => onSalvar("coloracaoAtual", v)}
        />
        <CampoFicha
          label="Histórico de coloração"
          valor={ficha?.historicoColoracao}
          placeholder="Procedimentos anteriores de cor..."
          tipo="textarea"
          onChange={v => onSalvar("historicoColoracao", v)}
        />
      </SecaoFicha>

      {/* Química */}
      <SecaoFicha titulo="Química" icone={
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 3H5v3l-3 9a1 1 0 001 1h8a1 1 0 001-1l-3-9V3zM9 3h6M15 3h4v3l3 9a1 1 0 01-1 1h-8a1 1 0 01-1-1l3-9V3"/>
        </svg>
      }>
        <CampoFicha
          label="Última química (data)"
          valor={ficha?.ultimaQuimica ? new Date(ficha.ultimaQuimica).toISOString().split("T")[0] : ""}
          tipo="date"
          onChange={v => onSalvar("ultimaQuimica", v)}
        />
        <CampoSelect
          label="Tipo de química"
          valor={ficha?.tipoQuimica}
          opcoes={["Relaxamento", "Permanente", "Botox", "Progressiva", "Cauterização", "Nenhuma"]}
          onChange={v => onSalvar("tipoQuimica", v)}
        />
      </SecaoFicha>

      {/* Produtos e Reações */}
      <SecaoFicha titulo="Produtos e Reações" icone={
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
      }>
        <CampoFicha
          label="Produtos usados com sucesso"
          valor={ficha?.produtosUsados}
          tipo="textarea"
          placeholder="Marcas e linhas que funcionam bem..."
          onChange={v => onSalvar("produtosUsados", v)}
        />
        <CampoFicha
          label="Reações a produtos"
          valor={ficha?.reacoesProdutos}
          tipo="textarea"
          placeholder="Alergias, irritações, produtos a evitar..."
          onChange={v => onSalvar("reacoesProdutos", v)}
          destaque={!!ficha?.reacoesProdutos}
        />
        <CampoFicha
          label="Alertas importantes"
          valor={ficha?.alertas}
          tipo="textarea"
          placeholder="Restrições ou observações urgentes..."
          onChange={v => onSalvar("alertas", v)}
          destaque={!!ficha?.alertas}
        />
      </SecaoFicha>

      {/* Observações */}
      <SecaoFicha titulo="Observações Gerais" icone={
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
          <polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
        </svg>
      }>
        <CampoFicha
          label="Observações gerais"
          valor={ficha?.observacoesGerais}
          placeholder="Preferências, notas da profissional..."
          tipo="textarea"
          onChange={v => onSalvar("observacoesGerais", v)}
        />
        {profissionais.length > 0 && (
          <div className="rounded-xl p-3 bg-slate-50 border border-card-border">
            <p className="text-[9px] uppercase tracking-[0.2em] font-black text-text-placeholder mb-1">Profissional preferida</p>
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
