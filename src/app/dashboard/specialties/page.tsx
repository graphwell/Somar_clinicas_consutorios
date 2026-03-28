"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useNicho } from '@/context/NichoContext';
import { fetchWithAuth } from '@/lib/api-utils';

interface ProfissionalCard {
  id: string;
  nome: string;
  especialidade: string | null;
  registroProfissional: string | null;
  fotoUrl: string | null;
  color: string | null;
  ativo: boolean;
  servicos: { id: string; nome: string }[];
  _count: { agendamentos: number };
}

interface EspecialidadeGroup {
  especialidade: string;
  profissionais: ProfissionalCard[];
  totalAgendamentos: number;
}

const ICONS: Record<string, string> = {
  'Cardiologia': '❤️',
  'Ortopedia': '🦴',
  'Dermatologia': '🧴',
  'Neurologia': '🧠',
  'Ginecologia': '🌸',
  'Pediatria': '👶',
  'Oftalmologia': '👁️',
  'Psiquiatria': '🧘',
  'Endocrinologia': '⚗️',
  'Urologia': '💧',
  'Oncologia': '🎗️',
  'Fisioterapia': '🏃',
  'Nutrição': '🥗',
  'Odontologia': '🦷',
  'Geral': '🏥',
};

function getIcon(especialidade: string): string {
  for (const key of Object.keys(ICONS)) {
    if (especialidade.toLowerCase().includes(key.toLowerCase())) return ICONS[key];
  }
  return '🔬';
}

function getColorForSpecialty(especialidade: string): string {
  const colors = [
    '#4a4ae2', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444',
    '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f97316',
  ];
  let hash = 0;
  for (let i = 0; i < especialidade.length; i++) hash = especialidade.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

export default function SpecialtiesPage() {
  const { labels } = useNicho();
  const [especialidades, setEspecialidades] = useState<EspecialidadeGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<EspecialidadeGroup | null>(null);

  useEffect(() => {
    fetchWithAuth('/api/specialties')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setEspecialidades(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = especialidades.filter(e =>
    e.especialidade.toLowerCase().includes(search.toLowerCase()) ||
    e.profissionais.some(p => p.nome.toLowerCase().includes(search.toLowerCase()))
  );

  const totalProfissionais = especialidades.reduce((s, e) => s + e.profissionais.length, 0);
  const totalAgendamentos = especialidades.reduce((s, e) => s + e.totalAgendamentos, 0);

  return (
    <div className="max-w-7xl mx-auto space-y-10 pb-40 animate-premium">

      {/* Header */}
      <div className="bg-white border border-card-border p-10 rounded-[3rem] shadow-sm flex flex-col md:flex-row md:items-center gap-6">
        <div className="w-14 h-14 rounded-3xl bg-primary text-white flex items-center justify-center text-3xl shadow-xl shadow-primary/20">🏥</div>
        <div className="flex-1">
          <h2 className="text-2xl font-black italic uppercase tracking-tighter text-text-main">
            Especialidades
          </h2>
          <p className="text-[10px] font-black text-text-placeholder uppercase tracking-[0.25em] mt-1 opacity-60">
            {labels.termoProfissionalPlural} organizados por área de atuação
          </p>
        </div>
        <Link
          href="/dashboard/team"
          className="btn-primary px-6 py-3 text-[10px] flex items-center gap-2 self-start"
        >
          <span>🧑‍💼</span> Gerenciar {labels.termoProfissionalPlural}
        </Link>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Especialidades', value: especialidades.length, icon: '🏥' },
          { label: labels.termoProfissionalPlural, value: totalProfissionais, icon: '🧑‍💼' },
          { label: 'Atendimentos', value: totalAgendamentos.toLocaleString('pt-BR'), icon: '📅' },
        ].map((kpi, i) => (
          <div key={i} className="bg-white border border-card-border rounded-[2rem] p-6 flex items-center gap-4 shadow-sm">
            <div className="w-10 h-10 rounded-2xl bg-primary-soft flex items-center justify-center text-xl">{kpi.icon}</div>
            <div>
              <p className="text-2xl font-black text-text-main">{kpi.value}</p>
              <p className="text-[9px] font-black uppercase tracking-widest text-text-placeholder opacity-60 mt-0.5">{kpi.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={`Buscar por especialidade ou ${labels.termoProfissional.toLowerCase()}...`}
          className="input-premium w-full py-4 pl-12 text-sm"
        />
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-placeholder text-base">🔍</span>
      </div>

      {/* Content */}
      {loading ? (
        <div className="py-24 text-center text-[10px] font-black uppercase tracking-widest text-text-placeholder animate-pulse">
          Carregando especialidades...
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-card-border rounded-[2.5rem] py-24 text-center shadow-sm">
          <p className="text-5xl mb-4">🔬</p>
          <p className="font-black text-text-main text-sm uppercase tracking-tight">
            {search ? 'Nenhum resultado encontrado' : 'Nenhuma especialidade cadastrada'}
          </p>
          <p className="text-xs text-text-muted mt-2">
            {search
              ? 'Tente buscar por outro termo'
              : `Cadastre ${labels.termoProfissionalPlural.toLowerCase()} com especialidade em "Gerenciar ${labels.termoProfissionalPlural}"`}
          </p>
          {!search && (
            <Link href="/dashboard/team" className="btn-primary mx-auto px-8 py-3 text-[10px] mt-6 inline-block">
              Cadastrar {labels.termoProfissional}
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filtered.map(grupo => {
            const cor = getColorForSpecialty(grupo.especialidade);
            const icon = getIcon(grupo.especialidade);
            const ativos = grupo.profissionais.filter(p => p.ativo).length;
            const totalServicos = [...new Set(grupo.profissionais.flatMap(p => p.servicos.map(s => s.nome)))];

            return (
              <div
                key={grupo.especialidade}
                className="bg-white border border-card-border rounded-[2rem] overflow-hidden shadow-sm hover:shadow-md transition-all cursor-pointer group"
                onClick={() => setSelected(selected?.especialidade === grupo.especialidade ? null : grupo)}
              >
                {/* Card header */}
                <div className="p-6 flex items-center gap-4 border-b border-slate-50">
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-sm shrink-0 transition-transform group-hover:scale-110"
                    style={{ backgroundColor: `${cor}15`, border: `1.5px solid ${cor}30` }}
                  >
                    {icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-black text-text-main text-sm uppercase tracking-tight truncate">{grupo.especialidade}</h3>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[9px] font-black uppercase tracking-wider" style={{ color: cor }}>
                        {grupo.profissionais.length} {grupo.profissionais.length === 1 ? labels.termoProfissional : labels.termoProfissionalPlural}
                      </span>
                      {grupo.profissionais.length !== ativos && (
                        <span className="text-[9px] font-black text-amber-500 uppercase tracking-wider">
                          {grupo.profissionais.length - ativos} inativo{grupo.profissionais.length - ativos > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-lg font-black text-text-main">{grupo.totalAgendamentos.toLocaleString('pt-BR')}</p>
                    <p className="text-[8px] font-black uppercase tracking-wider text-text-placeholder opacity-60">atendimentos</p>
                  </div>
                </div>

                {/* Professionals avatars */}
                <div className="px-6 py-4 flex items-center justify-between">
                  <div className="flex -space-x-2">
                    {grupo.profissionais.slice(0, 5).map(p => (
                      <div
                        key={p.id}
                        title={p.nome}
                        className="w-8 h-8 rounded-xl border-2 border-white flex items-center justify-center text-[10px] font-black text-white shadow-sm"
                        style={{ backgroundColor: p.color || cor }}
                      >
                        {p.nome.charAt(0)}
                      </div>
                    ))}
                    {grupo.profissionais.length > 5 && (
                      <div className="w-8 h-8 rounded-xl border-2 border-white flex items-center justify-center text-[9px] font-black bg-slate-100 text-text-muted shadow-sm">
                        +{grupo.profissionais.length - 5}
                      </div>
                    )}
                  </div>
                  <span className="text-[8px] font-black uppercase tracking-wider text-text-placeholder opacity-60 group-hover:opacity-100 transition-opacity">
                    {selected?.especialidade === grupo.especialidade ? 'Recolher ▲' : 'Ver detalhes ▼'}
                  </span>
                </div>

                {/* Expanded detail */}
                {selected?.especialidade === grupo.especialidade && (
                  <div className="border-t border-slate-50 px-6 py-5 space-y-5 animate-in slide-in-from-top-2 duration-200">

                    {/* Professionals list */}
                    <div className="space-y-2">
                      <p className="text-[9px] font-black uppercase tracking-widest text-text-placeholder">{labels.termoProfissionalPlural}</p>
                      {grupo.profissionais.map(p => (
                        <div key={p.id} className="flex items-center gap-3 py-2 border-b border-slate-50 last:border-0">
                          <div
                            className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black text-white shrink-0"
                            style={{ backgroundColor: p.color || cor }}
                          >
                            {p.nome.charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-black text-text-main truncate">{p.nome}</p>
                            {p.registroProfissional && (
                              <p className="text-[9px] text-text-muted font-mono">{p.registroProfissional}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-[8px] font-black px-2 py-0.5 rounded-lg uppercase tracking-wider ${
                                p.ativo ? 'bg-green-50 text-green-600' : 'bg-slate-100 text-slate-400'
                              }`}
                            >
                              {p.ativo ? 'Ativo' : 'Inativo'}
                            </span>
                            <Link
                              href="/dashboard/team"
                              onClick={e => e.stopPropagation()}
                              className="text-[8px] font-black text-primary hover:underline uppercase tracking-wider"
                            >
                              Editar
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Services list */}
                    {totalServicos.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-[9px] font-black uppercase tracking-widest text-text-placeholder">
                          {labels.termoAtendimentoPlural} ({totalServicos.length})
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {totalServicos.slice(0, 8).map((s, i) => (
                            <span
                              key={i}
                              className="text-[9px] font-black px-2.5 py-1 rounded-xl uppercase tracking-wide"
                              style={{ backgroundColor: `${cor}15`, color: cor }}
                            >
                              {s}
                            </span>
                          ))}
                          {totalServicos.length > 8 && (
                            <span className="text-[9px] font-black px-2.5 py-1 rounded-xl bg-slate-100 text-text-muted uppercase tracking-wide">
                              +{totalServicos.length - 8}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
