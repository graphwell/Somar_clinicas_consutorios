"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useNicho } from "@/context/NichoContext";
import { fetchWithAuth } from "@/lib/api-utils";
import { FichaBarbearia } from "@/components/ficha/FichaBarbearia";
import { FichaSalao } from "@/components/ficha/FichaSalao";
import { FichaEstetica } from "@/components/ficha/FichaEstetica";
import { GaleriaFotos } from "@/components/ficha/GaleriaFotos";
import { HistoricoVisitas } from "@/components/ficha/HistoricoVisitas";
import PlanoAtivoCard from "@/components/agenda/PlanoAtivoCard";

function iniciais(nome: string) {
  return nome.split(" ").slice(0, 2).map(p => p[0]).join("").toUpperCase();
}

function fmtMes(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { month: "short", year: "numeric" });
}

type TabId = "ficha" | "fotos" | "historico";

const CAMPOS_PROGRESSO: Record<string, string[]> = {
  BARBEARIA: ['estiloPreferido', 'maquinaNumero', 'barbaEstilo', 'produtosFavoritos', 'profissionalPreferidoId', 'observacoesGerais'],
  SALAO_BELEZA: ['tipoCabelo', 'porosidade', 'coloracaoAtual', 'produtosUsados', 'profissionalPreferidoId', 'observacoesGerais'],
  CLINICA_ESTETICA: ['tipoPele', 'fitzpatrick', 'alergiasSubstancias', 'medicamentosUso', 'protocolosRealizados', 'observacoesGerais'],
};

const CAMPOS_LABEL: Record<string, string> = {
  estiloPreferido: 'Estilo', maquinaNumero: 'Máquina', barbaEstilo: 'Barba',
  produtosFavoritos: 'Produto favorito', profissionalPreferidoId: 'Profissional preferido',
  observacoesGerais: 'Observações', tipoCabelo: 'Tipo de cabelo', porosidade: 'Porosidade',
  coloracaoAtual: 'Coloração', produtosUsados: 'Produtos usados', tipoPele: 'Tipo de pele',
  fitzpatrick: 'Fototipo', alergiasSubstancias: 'Alergias', medicamentosUso: 'Medicamentos',
  protocolosRealizados: 'Protocolos',
};

export default function FichaClientePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const pacienteId = params.pacienteId as string;
  const isNovo = searchParams.get('novo') === 'true';
  const { nicho, labels } = useNicho();

  const [paciente, setPaciente] = useState<any>(null);
  const [ficha, setFicha] = useState<any>(null);
  const [fotos, setFotos] = useState<any[]>([]);
  const [visitas, setVisitas] = useState<any[]>([]);
  const [planoAtivo, setPlanoAtivo] = useState<any>(null);
  const [profissionais, setProfissionais] = useState<{ id: string; nome: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabId>("ficha");

  // Progresso de preenchimento
  const progresso = useMemo(() => {
    if (!ficha) return 0;
    const campos = CAMPOS_PROGRESSO[nicho] ?? [];
    if (!campos.length) return 0;
    const preenchidos = campos.filter(c => ficha[c] !== null && ficha[c] !== undefined && ficha[c] !== '').length;
    return Math.round((preenchidos / campos.length) * 100);
  }, [ficha, nicho]);

  const camposVazios = useMemo(() => {
    if (!ficha) return [];
    const campos = CAMPOS_PROGRESSO[nicho] ?? [];
    return campos
      .filter(c => !ficha[c])
      .map(c => ({ key: c, label: CAMPOS_LABEL[c] ?? c }))
      .slice(0, 5);
  }, [ficha, nicho]);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const [dadosRes, profsRes] = await Promise.all([
        fetchWithAuth(`/api/ficha-cliente/${pacienteId}`),
        fetchWithAuth("/api/team"),
      ]);
      const dados = await dadosRes.json();
      const profs = await profsRes.json();

      if (dados.paciente) {
        setPaciente(dados.paciente);
        const f = dados.paciente.fichaCliente;
        if (f) {
          setFicha(f);
          setFotos(f.fotos ?? []);
          setVisitas(f.visitas ?? []);
        } else {
          // Criar ficha automaticamente
          const criarRes = await fetchWithAuth(`/api/ficha-cliente/${pacienteId}`, { method: "POST" });
          const fichaData = await criarRes.json();
          setFicha(fichaData);
        }
        // Plano ativo — mapeia para o formato esperado por PlanoAtivoCard
        if (dados.paciente.assinaturas?.length > 0) {
          const ass = dados.paciente.assinaturas[0];
          setPlanoAtivo({
            nome:        ass.plano?.nome ?? 'Plano ativo',
            servicos:    Array.isArray(ass.plano?.servicos) ? ass.plano.servicos : [],
            contadorUso: ass.contadorUso ?? {},
            dataFim:     ass.dataFim ?? ass.periodoFim ?? null,
          });
        }
      }

      if (Array.isArray(profs)) {
        setProfissionais(profs.filter((p: any) => p.ativo !== false).map((p: any) => ({ id: p.id, nome: p.nome })));
      }
    } finally {
      setLoading(false);
    }
  }, [pacienteId]);

  useEffect(() => { carregar(); }, [carregar]);

  async function salvarCampo(campo: string, valor: string) {
    const res = await fetchWithAuth(`/api/ficha-cliente/${pacienteId}`, {
      method: "PATCH",
      body: JSON.stringify({ [campo]: valor || null }),
    });
    const atualizado = await res.json();
    if (res.ok) setFicha(atualizado);
  }

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto space-y-4 pb-20 animate-premium">
        <div className="bg-white border border-card-border rounded-[2.5rem] p-8 animate-pulse h-40" />
        <div className="bg-white border border-card-border rounded-2xl h-64 animate-pulse" />
      </div>
    );
  }

  if (!paciente) {
    return (
      <div className="max-w-5xl mx-auto pt-20 text-center">
        <p className="text-text-placeholder font-black uppercase tracking-widest text-xs">Cliente não encontrado</p>
      </div>
    );
  }

  const TABS: { id: TabId; label: string }[] = [
    { id: "ficha", label: "Ficha" },
    { id: "fotos", label: `Fotos (${fotos.length})` },
    { id: "historico", label: `Histórico (${visitas.length})` },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-5 pb-20 animate-premium">

      {/* Banner: ficha nova (?novo=true) */}
      {isNovo && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-5">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#40916C" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-black text-sm text-green-800 uppercase tracking-tight">
                Preencha a ficha de {paciente.nome}
              </h3>
              <p className="text-xs text-green-700 mt-1">
                Quanto mais informações você preencher, melhor será o atendimento.
                Clique em qualquer campo para editar.
              </p>

              {/* Barra de progresso */}
              <div className="mt-3">
                <div className="flex justify-between text-[10px] mb-1">
                  <span className="text-green-700 font-medium">Preenchimento da ficha</span>
                  <span className="text-green-800 font-black">{progresso}%</span>
                </div>
                <div className="h-2 bg-green-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full transition-all duration-500"
                    style={{ width: `${progresso}%` }}
                  />
                </div>
              </div>

              {/* Chips de campos vazios prioritários */}
              {camposVazios.length > 0 && (
                <div className="mt-3">
                  <p className="text-[10px] text-green-700 mb-1.5">Campos importantes para preencher:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {camposVazios.map(campo => (
                      <span
                        key={campo.key}
                        className="text-[10px] bg-white border border-green-200 text-green-700 px-2.5 py-1 rounded-full font-medium"
                      >
                        + {campo.label}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Header do cliente */}
      <div className="bg-white border border-card-border rounded-[2.5rem] p-6 md:p-8 shadow-sm">
        <div className="flex items-start gap-4 flex-wrap">
          {/* Avatar */}
          <div className="w-14 h-14 rounded-full bg-primary-soft flex items-center justify-center text-primary font-black text-lg flex-shrink-0">
            {iniciais(paciente.nome)}
          </div>

          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-black uppercase tracking-tight text-text-main">{paciente.nome}</h1>
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
              <span className="text-[10px] text-text-placeholder">
                {labels.termoPaciente} desde {fmtMes(paciente.createdAt)}
              </span>
              <span className="text-[10px] text-text-placeholder">
                · {paciente.contagemVisitas} visita{paciente.contagemVisitas !== 1 ? "s" : ""}
              </span>
              {paciente.totalGasto > 0 && (
                <span className="text-[10px] text-text-placeholder">
                  · R$ {paciente.totalGasto.toFixed(2)} em serviços
                </span>
              )}
            </div>
            {paciente.telefone && (
              <p className="text-sm text-text-muted mt-1">{paciente.telefone}</p>
            )}

            <div className="flex flex-wrap gap-2 mt-2">
              {/* Plano ativo */}
              {planoAtivo && (
                <div className="inline-flex items-center gap-1.5 bg-green-50 border border-green-200 rounded-full px-3 py-1">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#40916C" strokeWidth="2.5">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                  <span className="text-[10px] font-black text-green-700">{planoAtivo.nome}</span>
                </div>
              )}

              {/* Alerta */}
              {ficha?.alertas && (
                <div className="inline-flex items-center gap-1.5 bg-red-50 border border-red-200 rounded-full px-3 py-1">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                    <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                  </svg>
                  <span className="text-[10px] font-black text-red-600 max-w-[200px] truncate">{ficha.alertas}</span>
                </div>
              )}
            </div>
          </div>

          {/* Ações */}
          <div className="flex gap-2 flex-wrap shrink-0">
            <a
              href={`/dashboard?novoAgendamento=${paciente.id}`}
              className="btn-primary text-[9px] px-3 py-2 flex items-center gap-1.5"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                <line x1="12" y1="14" x2="12" y2="18"/><line x1="10" y1="16" x2="14" y2="16"/>
              </svg>
              Agendar
            </a>
            {paciente.telefone && (
              <a
                href={`https://wa.me/55${paciente.telefone.replace(/\D/g, "")}`}
                target="_blank" rel="noreferrer"
                className="text-[9px] font-black uppercase px-3 py-2 rounded-xl bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 transition-colors flex items-center gap-1.5"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                WhatsApp
              </a>
            )}
          </div>
        </div>

        {/* Tabs — mobile: abaixo do header */}
        <div className="mt-5 flex gap-1 border-b border-card-border">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`text-[10px] font-black uppercase px-4 py-2.5 border-b-2 -mb-px transition-colors ${
                tab === t.id
                  ? "border-primary text-primary"
                  : "border-transparent text-text-muted hover:text-text-main"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Card de plano ativo — aparece acima dos campos da ficha */}
      {planoAtivo && (
        <PlanoAtivoCard planoAtivo={planoAtivo} />
      )}

      {/* Conteúdo por tab (mobile) / grid desktop */}
      <div className="md:grid md:grid-cols-[2fr_3fr] md:gap-5">
        {/* Coluna esquerda — Ficha */}
        <div className={tab === "ficha" ? "block" : "hidden md:block"}>
          {nicho === "BARBEARIA" && (
            <FichaBarbearia ficha={ficha} profissionais={profissionais} onSalvar={salvarCampo} />
          )}
          {nicho === "SALAO_BELEZA" && (
            <FichaSalao ficha={ficha} profissionais={profissionais} onSalvar={salvarCampo} />
          )}
          {nicho === "CLINICA_ESTETICA" && (
            <FichaEstetica ficha={ficha} profissionais={profissionais} onSalvar={salvarCampo} />
          )}
        </div>

        {/* Coluna direita — Fotos + Histórico */}
        <div className="space-y-5">
          {/* Fotos */}
          <div className={tab === "fotos" ? "block" : "hidden md:block"}>
            <div className="bg-white border border-card-border rounded-2xl p-5">
              <h2 className="text-xs font-black uppercase tracking-[0.2em] text-text-main mb-4">Fotos</h2>
              <GaleriaFotos
                pacienteId={pacienteId}
                fotos={fotos}
                onFotoAdicionada={f => setFotos(prev => [f, ...prev])}
                onFotoDeletada={id => setFotos(prev => prev.filter(f => f.id !== id))}
              />
            </div>
          </div>

          {/* Histórico */}
          <div className={tab === "historico" ? "block" : "hidden md:block"}>
            <div className="bg-white border border-card-border rounded-2xl p-5">
              <h2 className="text-xs font-black uppercase tracking-[0.2em] text-text-main mb-4">Histórico de Visitas</h2>
              <HistoricoVisitas visitas={visitas} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
