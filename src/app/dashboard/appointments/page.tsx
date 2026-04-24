"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNicho } from "@/context/NichoContext";
import { fetchWithAuth } from "@/lib/api-utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type FichaResumo = {
  estiloPreferido?: string | null;
  maquinaNumero?: string | null;
  barbaEstilo?: string | null;
  produtosFavoritos?: string | null;
  tipoCabelo?: string | null;
  coloracaoAtual?: string | null;
  tipoPele?: string | null;
  alergiasSubstancias?: string | null;
  alertas?: string | null;
};

type FichaStatus = {
  preenchida: boolean;
  alertas: string | null;
  resumo: FichaResumo | null;
} | null;

type Agendamento = {
  id: string;
  dataHora: string;
  fimDataHora: string;
  durationMinutes: number;
  status: string;
  categoria?: string;
  tipoAtendimento?: string;
  convenio?: string;
  observacoes?: string;
  paciente: { id: string; nome: string; telefone: string; dataNascimento?: string; convenio?: string };
  profissional?: { id: string; nome: string } | null;
  servico?: { id: string; nome: string; duracaoMinutos?: number; preco?: number; color?: string } | null;
  fichaStatus?: FichaStatus;
};

type Totais = Record<string, number>;

// ─── Constantes ───────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; border: string; dot: string }> = {
  pendente:        { label: 'Aguardando',  bg: 'bg-amber-50',   text: 'text-amber-700',  border: 'border-amber-200', dot: 'bg-amber-400'  },
  confirmado:      { label: 'Confirmado',  bg: 'bg-green-50',   text: 'text-green-700',  border: 'border-green-200', dot: 'bg-green-500'  },
  em_atendimento:  { label: 'Em Atend.',   bg: 'bg-blue-50',    text: 'text-blue-700',   border: 'border-blue-200',  dot: 'bg-blue-500'   },
  done:            { label: 'Concluído',   bg: 'bg-green-50',   text: 'text-green-700',  border: 'border-green-200', dot: 'bg-green-500'  },
  cancelado:       { label: 'Cancelado',   bg: 'bg-red-50',     text: 'text-red-600',    border: 'border-red-200',   dot: 'bg-red-400'    },
  faltou:          { label: 'Faltou',      bg: 'bg-orange-50',  text: 'text-orange-700', border: 'border-orange-200',dot: 'bg-orange-400' },
};

const FLUXO: Record<string, { label: string; nextStatus: string; style: string }[]> = {
  pendente:       [
    { label: 'Check-in',  nextStatus: 'em_atendimento', style: 'bg-blue-600 text-white hover:bg-blue-700' },
    { label: 'Faltou',    nextStatus: 'faltou',          style: 'bg-orange-50 border border-orange-200 text-orange-700 hover:bg-orange-100' },
    { label: 'Cancelar',  nextStatus: 'cancelado',       style: 'bg-white border border-red-200 text-red-600 hover:bg-red-50' },
  ],
  confirmado:     [
    { label: 'Check-in',  nextStatus: 'em_atendimento', style: 'bg-blue-600 text-white hover:bg-blue-700' },
    { label: 'Faltou',    nextStatus: 'faltou',          style: 'bg-orange-50 border border-orange-200 text-orange-700 hover:bg-orange-100' },
    { label: 'Cancelar',  nextStatus: 'cancelado',       style: 'bg-white border border-red-200 text-red-600 hover:bg-red-50' },
  ],
  em_atendimento: [
    { label: 'Concluir', nextStatus: 'done',      style: 'bg-green-600 text-white hover:bg-green-700' },
    { label: 'Cancelar', nextStatus: 'cancelado', style: 'bg-white border border-red-200 text-red-600 hover:bg-red-50' },
  ],
  done:           [],
  cancelado:      [
    { label: 'Reativar', nextStatus: 'pendente', style: 'bg-white border border-card-border text-text-muted hover:bg-slate-50' },
  ],
  faltou:         [
    { label: 'Reativar', nextStatus: 'pendente', style: 'bg-white border border-card-border text-text-muted hover:bg-slate-50' },
  ],
};

function fmtHora(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Fortaleza' });
}

function fmtIdade(dataNascimento?: string) {
  if (!dataNascimento) return null;
  const anos = Math.floor((Date.now() - new Date(dataNascimento).getTime()) / (1000 * 60 * 60 * 24 * 365.25));
  return `${anos}a`;
}

function isAtrasado(ag: Agendamento) {
  if (!['pendente', 'confirmado', 'em_atendimento'].includes(ag.status)) return false;
  return new Date(ag.fimDataHora) < new Date();
}

// ─── Badge de Plano ──────────────────────────────────────────────────────────

function PlanoBadge({ pacienteId, servicoId }: { pacienteId: string; servicoId?: string }) {
  const [info, setInfo] = React.useState<any>(null);

  React.useEffect(() => {
    if (!pacienteId) return;
    const params = new URLSearchParams({ pacienteId });
    if (servicoId) params.set('servicoId', servicoId);
    fetchWithAuth(`/api/subscriptions/verificar?${params}`)
      .then(r => r.json())
      .then(d => { if (d.temPlano) setInfo(d); })
      .catch(() => {});
  }, [pacienteId, servicoId]);

  if (!info) return null;

  const limiteSuperado = info.limite !== null && info.usado >= info.limite;

  if (limiteSuperado) {
    return (
      <div className="mt-1.5 px-2 py-1.5 rounded-lg text-[9px]" style={{ background: '#FFFBEB', border: '1px solid #FCD34D' }}>
        <p className="font-black" style={{ color: '#92400E' }}>Limite do plano atingido</p>
        <p style={{ color: '#B45309' }}>{info.usado}/{info.limite} {info.tipo === 'limitado' ? 'usos' : ''} usados
          {info.descontoExtra ? ` · Será cobrado com ${info.descontoExtra}% OFF` : ''}
        </p>
      </div>
    );
  }

  return (
    <div className="mt-1.5 px-2 py-1.5 rounded-lg text-[9px]" style={{ background: '#F0FAF4', border: '1px solid #C8DDD4' }}>
      <p className="font-black" style={{ color: '#2D6A4F' }}>{info.planoNome}</p>
      {info.servicoIncluso && info.limite !== null && (
        <p style={{ color: '#40916C' }}>{info.usado} de {info.limite} usados · Não será cobrado</p>
      )}
      {info.servicoIncluso && info.tipo === 'ilimitado' && (
        <p style={{ color: '#40916C' }}>Ilimitado · Não será cobrado</p>
      )}
    </div>
  );
}

// ─── Card do Agendamento ─────────────────────────────────────────────────────

function CardAtendimento({
  ag,
  labels,
  isBeleza,
  nicho,
  onStatusChange,
  updating,
}: {
  ag: Agendamento;
  labels: any;
  isBeleza: boolean;
  nicho: string;
  onStatusChange: (id: string, status: string) => void;
  updating: string | null;
}) {
  const [expandido, setExpandido] = useState(false);
  const cfg = STATUS_CONFIG[ag.status] || STATUS_CONFIG.pendente;
  const acoes = FLUXO[ag.status] || [];
  const atrasado = isAtrasado(ag);
  const idade = fmtIdade(ag.paciente.dataNascimento);
  const cor = ag.servico?.color || '#6366f1';
  const isUpdating = updating === ag.id;
  const ficha = ag.fichaStatus;

  return (
    <div className={`group relative bg-white border rounded-2xl overflow-hidden transition-all duration-200 hover:shadow-md ${atrasado ? 'border-orange-300' : 'border-card-border'}`}>
      {/* Faixa colorida lateral */}
      <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl" style={{ background: cor }} />

      <div className="pl-4 pr-5 py-4 flex items-start gap-4">
        {/* Horário */}
        <div className="shrink-0 text-center w-14">
          <p className="text-lg font-black text-text-main leading-none">{fmtHora(ag.dataHora)}</p>
          <p className="text-[9px] font-black text-text-placeholder uppercase mt-0.5">
            {ag.durationMinutes}min
          </p>
          {atrasado && (
            <span className="mt-1 inline-block text-[8px] font-black text-orange-600 bg-orange-50 border border-orange-200 px-1.5 py-0.5 rounded-lg">
              ATRASADO
            </span>
          )}
        </div>

        {/* Info principal */}
        <div className="flex-1 min-w-0 space-y-1.5">
          {/* Nome + badge status */}
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-black text-text-main text-sm uppercase tracking-tight leading-none">
              {ag.paciente.nome}
            </p>
            {idade && (
              <span className="text-[8px] font-black text-text-placeholder bg-slate-50 px-1.5 py-0.5 rounded-lg border border-card-border">
                {idade}
              </span>
            )}
            <span className={`text-[8px] font-black px-2 py-0.5 rounded-lg border ${cfg.bg} ${cfg.text} ${cfg.border} flex items-center gap-1`}>
              <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
              {cfg.label}
            </span>
          </div>

          {/* Serviço + profissional */}
          <div className="flex items-center gap-3 flex-wrap text-[10px] text-text-muted font-medium">
            {ag.servico && (
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full" style={{ background: cor }} />
                {ag.servico.nome}
              </span>
            )}
            {ag.profissional && (
              <span className="text-text-placeholder">
                {labels.tratamentoProfissional} {ag.profissional.nome}
              </span>
            )}
            {!isBeleza && (ag.convenio || ag.paciente.convenio) && (
              <span className="bg-primary-soft text-primary px-2 py-0.5 rounded-lg border border-primary/10 font-black text-[8px]">
                {ag.convenio || ag.paciente.convenio}
              </span>
            )}
            {ag.tipoAtendimento === 'plano_assinatura' && (
              <span className="bg-green-50 text-green-700 px-2 py-0.5 rounded-lg border border-green-200 font-black text-[8px]">
                Plano ativo
              </span>
            )}
          </div>

          {/* Telefone + atalhos */}
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-[10px] font-mono text-text-placeholder">{ag.paciente.telefone}</p>
            {isBeleza ? (
              <div className="flex items-center gap-1.5">
                <a
                  href={`/dashboard/ficha/${ag.paciente.id}`}
                  className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-lg border flex items-center gap-1 transition-colors ${
                    ficha?.alertas
                      ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                      : ficha?.preenchida
                        ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                        : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                  }`}
                >
                  Ficha
                  {ficha?.alertas && <span className="w-1.5 h-1.5 rounded-full bg-red-500 ml-0.5" />}
                  {!ficha?.alertas && !ficha?.preenchida && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 ml-0.5" />}
                </a>
                {isBeleza && ficha?.resumo && (
                  <button
                    onClick={() => setExpandido(e => !e)}
                    className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded-lg bg-slate-50 text-text-placeholder border border-card-border hover:bg-slate-100 transition-colors"
                    title="Ver resumo da ficha"
                  >
                    {expandido ? '▲' : '▼'}
                  </button>
                )}
              </div>
            ) : (
              <a href={`/dashboard/clinical-records?pacienteId=${ag.paciente.id}`}
                className="text-[8px] font-black uppercase px-2 py-0.5 rounded-lg bg-primary-soft text-primary border border-primary/10 hover:bg-primary/10 transition-colors">
                Prontuário
              </a>
            )}
            <a href={`https://wa.me/55${ag.paciente.telefone.replace(/\D/g, '')}`}
              target="_blank" rel="noreferrer"
              className="text-[8px] font-black uppercase px-2 py-0.5 rounded-lg bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 transition-colors">
              WhatsApp
            </a>
          </div>

          {/* Observações */}
          {ag.observacoes && (
            <p className="text-[10px] text-text-muted italic bg-slate-50 px-2 py-1 rounded-lg border border-card-border">
              {ag.observacoes}
            </p>
          )}

          {/* Badge de plano de assinatura */}
          {(ag.status === 'pendente' || ag.status === 'confirmado') && (
            <PlanoBadge pacienteId={ag.paciente.id} servicoId={ag.servico?.id} />
          )}

          {/* Painel resumo da ficha (expandível) */}
          {isBeleza && expandido && ficha?.resumo && (
            <div className="mt-1 pt-3 border-t border-card-border space-y-2">
              {ficha.alertas && (
                <div className="flex items-center gap-2 bg-red-50 rounded-lg px-3 py-2">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                  <p className="text-[10px] font-black text-red-700">{ficha.alertas}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-1.5">
                {nicho === 'BARBEARIA' && (<>
                  {ficha.resumo.estiloPreferido && <div className="bg-slate-50 rounded-lg p-2"><p className="text-[8px] uppercase tracking-wide text-text-placeholder">Estilo</p><p className="text-[10px] font-black text-text-main mt-0.5">{ficha.resumo.estiloPreferido}</p></div>}
                  {ficha.resumo.maquinaNumero && <div className="bg-slate-50 rounded-lg p-2"><p className="text-[8px] uppercase tracking-wide text-text-placeholder">Máquina</p><p className="text-[10px] font-black text-text-main mt-0.5">Nº {ficha.resumo.maquinaNumero}</p></div>}
                  {ficha.resumo.barbaEstilo && <div className="bg-slate-50 rounded-lg p-2"><p className="text-[8px] uppercase tracking-wide text-text-placeholder">Barba</p><p className="text-[10px] font-black text-text-main mt-0.5">{ficha.resumo.barbaEstilo}</p></div>}
                  {ficha.resumo.produtosFavoritos && <div className="bg-slate-50 rounded-lg p-2"><p className="text-[8px] uppercase tracking-wide text-text-placeholder">Produto</p><p className="text-[10px] font-black text-text-main mt-0.5">{ficha.resumo.produtosFavoritos}</p></div>}
                </>)}
                {nicho === 'SALAO_BELEZA' && (<>
                  {ficha.resumo.tipoCabelo && <div className="bg-slate-50 rounded-lg p-2"><p className="text-[8px] uppercase tracking-wide text-text-placeholder">Cabelo</p><p className="text-[10px] font-black text-text-main mt-0.5">{ficha.resumo.tipoCabelo}</p></div>}
                  {ficha.resumo.coloracaoAtual && <div className="bg-slate-50 rounded-lg p-2"><p className="text-[8px] uppercase tracking-wide text-text-placeholder">Coloração</p><p className="text-[10px] font-black text-text-main mt-0.5">{ficha.resumo.coloracaoAtual}</p></div>}
                </>)}
                {nicho === 'CLINICA_ESTETICA' && (<>
                  {ficha.resumo.tipoPele && <div className="bg-slate-50 rounded-lg p-2"><p className="text-[8px] uppercase tracking-wide text-text-placeholder">Pele</p><p className="text-[10px] font-black text-text-main mt-0.5">{ficha.resumo.tipoPele}</p></div>}
                  {ficha.resumo.alergiasSubstancias && <div className="bg-red-50 rounded-lg p-2 col-span-2"><p className="text-[8px] uppercase tracking-wide text-red-400">Alergias</p><p className="text-[10px] font-black text-red-700 mt-0.5">{ficha.resumo.alergiasSubstancias}</p></div>}
                </>)}
              </div>
              <a href={`/dashboard/ficha/${ag.paciente.id}`} className="flex items-center justify-center gap-1.5 text-[9px] font-black text-primary hover:underline mt-1">
                Ver ficha completa →
              </a>
            </div>
          )}
        </div>

        {/* Ações de status */}
        {acoes.length > 0 && (
          <div className="shrink-0 flex flex-col gap-1.5">
            {acoes.map((a) => (
              <button
                key={a.nextStatus}
                onClick={() => onStatusChange(ag.id, a.nextStatus)}
                disabled={isUpdating}
                className={`text-[8px] font-black uppercase px-3 py-2 rounded-lg transition-all whitespace-nowrap min-h-[44px] ${a.style} disabled:opacity-50`}
              >
                {isUpdating ? '...' : a.label}
              </button>
            ))}
          </div>
        )}

        {/* Done checkmark */}
        {ag.status === 'done' && (
          <div className="shrink-0 w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4">
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="#16a34a" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Página Principal ─────────────────────────────────────────────────────────

export default function AtendimentosHojePage() {
  const { labels, nicho } = useNicho();
  const NICHOS_BELEZA = ['SALAO_BELEZA', 'BARBEARIA', 'CLINICA_ESTETICA'];
  const isBeleza = NICHOS_BELEZA.includes(nicho);

  const hoje = new Intl.DateTimeFormat('fr-CA', { timeZone: 'America/Fortaleza' }).format(new Date());
  const [data, setData] = useState(hoje);
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [totais, setTotais] = useState<Totais>({});
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [filtroStatus, setFiltroStatus] = useState<string>('todos');
  const [filtroProfId, setFiltroProfId] = useState<string>('todos');
  const [busca, setBusca] = useState('');
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState<Date>(new Date());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Aba ativa: atendimentos | fila
  const [abaAtiva, setAbaAtiva] = useState<'atendimentos' | 'fila'>('atendimentos');

  // Fila de espera
  type FilaItem = {
    id: string; posicao: number; prioridade: number; status: string;
    tenantId: string; servicoId: string; profissionalId?: string | null;
    dataDesejada: string; horarioDesejado?: string | null; preferencia: string;
    paciente: { nome: string; telefone: string };
    profissional?: { nome: string } | null;
    servico: { nome: string };
    expirarNotifEm?: string | null;
  };
  const [filaEspera, setFilaEspera] = useState<FilaItem[]>([]);
  const [loadingFila, setLoadingFila] = useState(false);
  const [notificandoFila, setNotificandoFila] = useState<string | null>(null);

  const carregarFila = useCallback(async () => {
    setLoadingFila(true);
    try {
      const res = await fetchWithAuth('/api/fila-espera');
      const d = await res.json();
      setFilaEspera(Array.isArray(d) ? d : []);
    } catch {}
    finally { setLoadingFila(false); }
  }, []);

  useEffect(() => {
    if (abaAtiva === 'fila') carregarFila();
  }, [abaAtiva, carregarFila]);

  const acionarFilaManual = async (item: FilaItem) => {
    setNotificandoFila(item.id);
    try {
      await fetchWithAuth('/api/fila-espera/verificar-e-notificar', {
        method: 'POST',
        body: JSON.stringify({
          tenantId: item.tenantId,
          profissionalId: item.profissionalId ?? null,
          servicoId: item.servicoId,
          dataHora: item.dataDesejada,
        }),
      });
      carregarFila();
    } catch {}
    finally { setNotificandoFila(null); }
  };

  // Encaixe rápido
  const [showEncaixe, setShowEncaixe] = useState(false);
  const [encaixes, setEncaixes] = useState<{ pacientes: any[]; servicos: any[]; profissionais: any[] }>({ pacientes: [], servicos: [], profissionais: [] });
  const [encPacBusca, setEncPacBusca] = useState('');
  const [encPacId, setEncPacId] = useState('');
  const [encPacNome, setEncPacNome] = useState('');
  const [encServId, setEncServId] = useState('');
  const [encProfId, setEncProfId] = useState('');
  const [encHorario, setEncHorario] = useState(() => {
    const now = new Date(); now.setSeconds(0, 0);
    now.setMinutes(Math.ceil(now.getMinutes() / 15) * 15);
    return now.toTimeString().slice(0, 5);
  });
  const [encSaving, setEncSaving] = useState(false);

  function navData(delta: number) {
    const d = new Date(data + 'T12:00:00');
    d.setDate(d.getDate() + delta);
    setData(d.toISOString().split('T')[0]);
  }

  async function abrirEncaixe() {
    setShowEncaixe(true);
    try {
      const [sRes, pRes] = await Promise.all([
        fetchWithAuth('/api/services'),
        fetchWithAuth('/api/team'),
      ]);
      const [servicos, profs] = await Promise.all([sRes.json(), pRes.json()]);
      setEncaixes(prev => ({
        ...prev,
        servicos: Array.isArray(servicos) ? servicos : [],
        profissionais: Array.isArray(profs) ? profs.filter((p: any) => p.ativo !== false) : [],
      }));
    } catch {}
  }

  async function buscarPacientesEncaixe(q: string) {
    setEncPacBusca(q); setEncPacId(''); setEncPacNome('');
    if (q.length < 2) { setEncaixes(prev => ({ ...prev, pacientes: [] })); return; }
    try {
      const res = await fetchWithAuth(`/api/patients?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setEncaixes(prev => ({ ...prev, pacientes: Array.isArray(data) ? data : [] }));
    } catch {}
  }

  async function salvarEncaixe() {
    if (!encPacId || !encHorario) return;
    setEncSaving(true);
    try {
      const dataHora = `${data}T${encHorario}:00-03:00`;
      const res = await fetchWithAuth('/api/appointments', {
        method: 'POST',
        body: JSON.stringify({
          pacienteId: encPacId,
          servicoId: encServId || undefined,
          profissionalId: encProfId || undefined,
          dataHora,
          status: 'confirmado',
          categoria: 'encaixe',
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || 'Erro ao salvar agendamento');
        return;
      }
      setShowEncaixe(false);
      setEncPacBusca(''); setEncPacId(''); setEncPacNome('');
      setEncServId(''); setEncProfId('');
      carregar(data);
    } catch (e: any) {
      alert(e.message || 'Erro ao salvar agendamento');
    } finally { setEncSaving(false); }
  }

  const carregar = useCallback(async (d: string, silent = false) => {
    if (!silent) setLoading(true);
    try {
      const url = `/api/appointments/hoje?data=${d}`;
      const res = await fetchWithAuth(url);
      const json = await res.json();
      if (Array.isArray(json.agendamentos)) {
        setAgendamentos(json.agendamentos);
        setTotais(json.totais || {});
        setUltimaAtualizacao(new Date());
      }
    } catch {}
    finally { if (!silent) setLoading(false); }
  }, []);

  // Carga inicial + auto-refresh a cada 60s
  useEffect(() => {
    carregar(data);
    intervalRef.current = setInterval(() => carregar(data, true), 60000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [data, carregar]);

  const mudarStatus = async (id: string, status: string) => {
    setUpdating(id);
    try {
      const res = await fetchWithAuth('/api/appointments/hoje', {
        method: 'PATCH',
        body: JSON.stringify({ id, status }),
      });
      const atualizado = await res.json();
      if (atualizado.id) {
        setAgendamentos(prev =>
          prev.map(a => a.id === id ? { ...a, ...atualizado } : a)
        );

        // Debitar uso de plano quando check-in confirmado
        if (status === 'confirmado') {
          const ag = agendamentos.find(a => a.id === id);
          if (ag?.paciente?.id && ag?.servico?.id) {
            fetchWithAuth(`/api/subscriptions/verificar?pacienteId=${ag.paciente.id}&servicoId=${ag.servico.id}`)
              .then(r => r.json())
              .then(info => {
                if (info.temPlano && info.assinaturaId && info.servicoIncluso && !info.limiteSuperado) {
                  return fetchWithAuth(`/api/subscriptions/clientes/${info.assinaturaId}/uso`, {
                    method: 'POST',
                    body: JSON.stringify({ servicoId: ag.servico!.id }),
                  });
                }
              })
              .catch(() => {});
          }
        }
        // Recalcular totais localmente
        setTotais(prev => {
          const oldStatus = agendamentos.find(a => a.id === id)?.status;
          const novo = { ...prev };
          if (oldStatus) novo[oldStatus] = Math.max(0, (novo[oldStatus] || 0) - 1);
          novo[status] = (novo[status] || 0) + 1;
          return novo;
        });
      }
    } finally {
      setUpdating(null);
    }
  };

  // Profissionais únicos para filtro
  const profissionais = Array.from(
    new Map(
      agendamentos
        .filter(a => a.profissional)
        .map(a => [a.profissional!.id, a.profissional!])
    ).values()
  );

  // Filtrar lista
  const lista = agendamentos.filter(a => {
    if (filtroStatus === 'aguardando' && !['pendente', 'confirmado'].includes(a.status)) return false;
    if (filtroStatus !== 'todos' && filtroStatus !== 'aguardando' && a.status !== filtroStatus) return false;
    if (filtroProfId !== 'todos' && a.profissional?.id !== filtroProfId) return false;
    if (busca.trim()) {
      const q = busca.toLowerCase();
      return a.paciente.nome.toLowerCase().includes(q) ||
        a.paciente.telefone.includes(busca) ||
        (a.servico?.nome.toLowerCase().includes(q) ?? false);
    }
    return true;
  });

  // Separar por status para exibição organizada
  const pendentes      = lista.filter(a => a.status === 'pendente');
  const confirmados    = lista.filter(a => a.status === 'confirmado');
  const emAtendimento  = lista.filter(a => a.status === 'em_atendimento');
  const concluidos     = lista.filter(a => a.status === 'done');
  const faltaram       = lista.filter(a => a.status === 'faltou');
  const cancelados     = lista.filter(a => a.status === 'cancelado');

  const total = agendamentos.length;
  const totalDia = Object.values(totais).reduce((s, v) => s + v, 0);
  const isHoje = data === hoje;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20 animate-premium">

      {/* ── Header ── */}
      <div className="bg-white border border-card-border rounded-[2.5rem] p-8 shadow-sm">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/20">
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><rect x="3.667" y="2.75" width="14.667" height="16.5" rx="2" stroke="currentColor" strokeWidth="1.8"/><path d="M7.333 7.333h7.334M7.333 11h7.334M7.333 14.667h4.584" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><path d="M7.333 2.75V4.583M14.667 2.75V4.583" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
            </div>
            <div>
              <h1 className="text-xl font-black italic uppercase tracking-tighter text-text-main">
                {isBeleza ? 'Agenda do Dia' : 'Atendimentos do Dia'}
              </h1>
              <p className="text-[9px] font-black uppercase tracking-[0.25em] text-text-placeholder opacity-60 mt-0.5">
                {isBeleza ? `Gerencie os ${labels.termoPacientePlural.toLowerCase()} de hoje` : 'Gerencie os atendimentos de hoje'} · {new Date(data + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Navegação de data */}
            <div className="flex items-center gap-1 bg-slate-50 border border-card-border rounded-xl p-1">
              <button onClick={() => navData(-1)} title="Dia anterior"
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white hover:shadow-sm transition-all text-text-placeholder font-black text-sm">
                ‹
              </button>
              <input type="date" value={data} onChange={e => setData(e.target.value)}
                className="text-[10px] font-black text-text-main bg-transparent border-0 outline-none cursor-pointer w-28 text-center" />
              <button onClick={() => navData(1)} title="Próximo dia"
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white hover:shadow-sm transition-all text-text-placeholder font-black text-sm">
                ›
              </button>
            </div>
            {isHoje ? (
              <span className="text-[9px] font-black uppercase px-3 py-2 bg-primary-soft text-primary border border-primary/10 rounded-xl">
                Hoje
              </span>
            ) : (
              <button onClick={() => setData(hoje)}
                className="text-[9px] font-black uppercase px-3 py-2 bg-white text-text-muted border border-card-border rounded-xl hover:bg-slate-50 transition-colors">
                Hoje
              </button>
            )}
            <button onClick={() => carregar(data)} title="Atualizar"
              className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-50 border border-card-border text-text-placeholder hover:bg-slate-100 transition-colors">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <path d="M23 4v6h-6M1 20v-6h6" /><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
              </svg>
            </button>
            <button onClick={abrirEncaixe}
              className="btn-primary text-[9px] px-4 py-2.5 whitespace-nowrap">
              + Encaixe rápido
            </button>
          </div>
        </div>

        {/* ── Abas: Atendimentos | Fila de Espera ── */}
        <div className="mt-5 flex gap-2">
          <button
            onClick={() => setAbaAtiva('atendimentos')}
            className={`text-[9px] font-black uppercase px-4 py-2 rounded-xl border transition-all ${abaAtiva === 'atendimentos' ? 'bg-primary text-white border-primary shadow-md' : 'bg-white text-text-muted border-card-border hover:border-primary/30 hover:text-primary'}`}
          >
            Atendimentos
          </button>
          <button
            onClick={() => setAbaAtiva('fila')}
            className={`text-[9px] font-black uppercase px-4 py-2 rounded-xl border transition-all flex items-center gap-1.5 ${abaAtiva === 'fila' ? 'bg-primary text-white border-primary shadow-md' : 'bg-white text-text-muted border-card-border hover:border-primary/30 hover:text-primary'}`}
          >
            Fila de Espera
            {filaEspera.length > 0 && (
              <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full ${abaAtiva === 'fila' ? 'bg-white/20' : 'bg-amber-100 text-amber-700'}`}>
                {filaEspera.length}
              </span>
            )}
          </button>
        </div>
      </div>

        {/* ── KPIs ── */}
        <div className="mt-6 grid grid-cols-3 sm:grid-cols-5 gap-3">
          {[
            { status: 'todos',          label: 'Total',      count: totalDia,                                                         bg: 'bg-slate-50',  text: 'text-text-main',  border: 'border-card-border'  },
            { status: 'aguardando',     label: 'Aguardando', count: (totais.pendente || 0) + (totais.confirmado || 0),                 ...STATUS_CONFIG.pendente         },
            { status: 'em_atendimento', label: 'Em Atend.',  count: totais.em_atendimento || 0,                                       ...STATUS_CONFIG.em_atendimento   },
            { status: 'done',           label: 'Concluídos', count: totais.done || 0,                                                  ...STATUS_CONFIG.done             },
            { status: 'cancelado',      label: 'Cancelados', count: (totais.cancelado || 0) + (totais.faltou || 0),                   ...STATUS_CONFIG.cancelado        },
          ].map(({ status, label, count, bg, text, border }) => (
            <button key={status}
              onClick={() => setFiltroStatus(filtroStatus === status ? 'todos' : status)}
              className={`p-3 rounded-2xl border text-left transition-all ${bg} ${border} ${filtroStatus === status ? 'ring-2 ring-primary/30 shadow-md' : 'hover:shadow-sm'}`}>
              <p className="text-xl font-black tracking-tighter italic leading-none"
                style={{ color: filtroStatus === status ? 'var(--color-primary)' : undefined }}>
                {count}
              </p>
              <p className={`text-[8px] font-black uppercase tracking-widest mt-1 ${text} opacity-70`}>{label}</p>
            </button>
          ))}
        </div>

        {/* ── Pills de filtro ── */}
        <div className="mt-4 flex flex-wrap gap-2">
          {[
            { v: 'todos',          l: 'Todos' },
            { v: 'aguardando',     l: 'Aguardando' },
            { v: 'confirmado',     l: 'Confirmado' },
            { v: 'em_atendimento', l: 'Em Atendimento' },
            { v: 'done',           l: 'Concluído' },
            { v: 'faltou',         l: 'Faltou' },
            { v: 'cancelado',      l: 'Cancelado' },
          ].map(({ v, l }) => {
            const cnt = v === 'todos' ? totalDia :
              v === 'aguardando' ? (totais.pendente || 0) + (totais.confirmado || 0) :
              (totais[v] || 0);
            const ativo = filtroStatus === v;
            return (
              <button key={v} onClick={() => setFiltroStatus(v)}
                className={`text-[9px] font-black uppercase px-3 py-1.5 rounded-full border transition-all ${ativo ? 'bg-primary text-white border-primary shadow-md' : 'bg-white text-text-muted border-card-border hover:border-primary/30 hover:text-primary'}`}>
                {l} {cnt > 0 && <span className={`ml-1 ${ativo ? 'opacity-80' : 'opacity-50'}`}>({cnt})</span>}
              </button>
            );
          })}
        </div>

      {/* ── Legenda indicadores ficha (beleza) ── */}
      {isBeleza && (
        <div className="flex items-center gap-4 text-[9px] text-text-placeholder flex-wrap">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-400" />
            Ficha preenchida
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            Ficha incompleta
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            Tem alertas
          </span>
        </div>
      )}

      {/* ── Painel Fila de Espera ── */}
      {abaAtiva === 'fila' && (
        <div className="bg-white border border-card-border rounded-[2.5rem] overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-slate-50 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-black italic uppercase tracking-tighter text-text-main">Fila de Espera</h2>
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-text-placeholder opacity-60 mt-0.5">
                Clientes aguardando horário — notificados têm 30 min para confirmar
              </p>
            </div>
            <button onClick={carregarFila} className="text-[9px] font-black uppercase px-3 py-1.5 rounded-xl border border-card-border bg-slate-50 text-text-muted hover:bg-slate-100 transition-colors">
              Atualizar
            </button>
          </div>

          {loadingFila ? (
            <div className="flex justify-center py-16">
              <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            </div>
          ) : filaEspera.length === 0 ? (
            <div className="py-20 text-center">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-text-placeholder opacity-40">Fila vazia</p>
            </div>
          ) : (
            <div>
              {filaEspera.map((item, i) => {
                const expirou = item.expirarNotifEm ? new Date(item.expirarNotifEm) < new Date() : false;
                return (
                  <div key={item.id} className={`flex items-center gap-3 px-6 py-4 border-b border-slate-50 last:border-0 ${item.status === 'notificado' ? 'bg-amber-50' : 'bg-white'}`}>
                    {/* Posição */}
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black shrink-0 ${item.prioridade === 1 ? 'bg-primary text-white' : 'bg-slate-100 text-text-muted'}`}>
                      {i + 1}
                    </div>

                    {/* Dados */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-text-main truncate">{item.paciente.nome}</p>
                      <p className="text-[10px] text-text-placeholder mt-0.5 truncate">
                        {item.servico.nome}
                        {item.profissional ? ` · ${item.profissional.nome}` : ' · Qualquer profissional'}
                        {item.horarioDesejado ? ` · ${item.horarioDesejado}` : item.preferencia !== 'qualquer' ? ` · ${item.preferencia}` : ''}
                      </p>
                      <p className="text-[10px] text-text-placeholder">
                        {new Date(item.dataDesejada).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })}
                      </p>
                    </div>

                    {/* Badges */}
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      {item.status === 'notificado' && !expirou && (
                        <span className="text-[9px] font-black bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full uppercase tracking-wide">
                          Aguardando resposta
                        </span>
                      )}
                      {item.prioridade === 1 && (
                        <span className="text-[9px] font-black bg-green-50 text-green-700 px-2 py-0.5 rounded-full uppercase tracking-wide">
                          Assinante
                        </span>
                      )}
                    </div>

                    {/* Ação manual */}
                    {item.status === 'aguardando' && (
                      <button
                        onClick={() => acionarFilaManual(item)}
                        disabled={notificandoFila === item.id}
                        className="text-[9px] font-black uppercase px-3 py-1.5 border border-card-border rounded-lg bg-white text-text-muted hover:border-primary/30 hover:text-primary transition-colors shrink-0 disabled:opacity-40"
                      >
                        {notificandoFila === item.id ? '…' : 'Notificar'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Filtros + Lista (apenas aba Atendimentos) ── */}
      {abaAtiva === 'atendimentos' && <>
      <div className="flex flex-wrap items-center gap-3">
        {/* Busca */}
        <div className="relative flex-1 min-w-[180px]">
          <input value={busca} onChange={e => setBusca(e.target.value)}
            placeholder={`Buscar ${labels.termoPaciente.toLowerCase()}...`}
            className="input-premium w-full py-3 text-sm pl-9" style={{ fontSize: '16px', minHeight: '48px' }} />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-placeholder"><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="6" cy="6" r="4" stroke="currentColor" strokeWidth="1.5"/><path d="M9.5 9.5l2.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg></span>
        </div>

        {/* Filtro por profissional */}
        {profissionais.length > 1 && (
          <select value={filtroProfId} onChange={e => setFiltroProfId(e.target.value)}
            className="input-premium py-2.5 text-sm">
            <option value="todos">Todos os {labels.termoProfissionalPlural}</option>
            {profissionais.map(p => (
              <option key={p.id} value={p.id}>{labels.tratamentoProfissional} {p.nome}</option>
            ))}
          </select>
        )}

        {/* Status badge de quando foi a última atualização */}
        <p className="text-[9px] font-black text-text-placeholder uppercase tracking-wider ml-auto opacity-60">
          Atualizado às {ultimaAtualizacao.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1,2,3,4].map(i => (
            <div key={i} className="bg-white border border-card-border rounded-2xl h-24 animate-pulse" />
          ))}
        </div>
      ) : lista.length === 0 ? (
        <div className="bg-white border border-card-border rounded-[2.5rem] py-24 text-center">
          <div className="mb-3 flex justify-center opacity-20"><svg width="36" height="36" viewBox="0 0 36 36" fill="none"><rect x="6" y="4.5" width="24" height="27" rx="3" stroke="#40916C" strokeWidth="2"/><path d="M12 12h12M12 18h12M12 24h7.5" stroke="#40916C" strokeWidth="2" strokeLinecap="round"/></svg></div>
          <p className="font-black text-text-placeholder text-xs uppercase tracking-[0.3em]">
            {total === 0 ? 'Nenhum atendimento neste dia' : 'Nenhum resultado para este filtro'}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Em Atendimento */}
          {emAtendimento.length > 0 && filtroStatus === 'todos' && (
            <section>
              <h2 className="text-[9px] font-black uppercase tracking-[0.3em] text-text-placeholder mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                Em Atendimento — {emAtendimento.length}
              </h2>
              <div className="space-y-2">
                {emAtendimento.map(a => (
                  <CardAtendimento key={a.id} ag={a} labels={labels} isBeleza={isBeleza} nicho={nicho} onStatusChange={mudarStatus} updating={updating} />
                ))}
              </div>
            </section>
          )}

          {/* Fila de espera — pendente + confirmado */}
          {(pendentes.length > 0 || confirmados.length > 0) && filtroStatus === 'todos' && (
            <section>
              <h2 className="text-[9px] font-black uppercase tracking-[0.3em] text-text-placeholder mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                Aguardando — {pendentes.length + confirmados.length} {labels.termoPacientePlural.toLowerCase()}
              </h2>
              <div className="space-y-2">
                {[...confirmados, ...pendentes].map(a => (
                  <CardAtendimento key={a.id} ag={a} labels={labels} isBeleza={isBeleza} nicho={nicho} onStatusChange={mudarStatus} updating={updating} />
                ))}
              </div>
            </section>
          )}

          {/* Filtrado único */}
          {filtroStatus !== 'todos' && (
            <div className="space-y-2">
              {lista.map(a => (
                <CardAtendimento key={a.id} ag={a} labels={labels} isBeleza={isBeleza} nicho={nicho} onStatusChange={mudarStatus} updating={updating} />
              ))}
            </div>
          )}

          {/* Concluídos */}
          {concluidos.length > 0 && filtroStatus === 'todos' && (
            <section>
              <h2 className="text-[9px] font-black uppercase tracking-[0.3em] text-text-placeholder mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                Concluídos — {concluidos.length}
              </h2>
              <div className="space-y-2 opacity-70">
                {concluidos.map(a => (
                  <CardAtendimento key={a.id} ag={a} labels={labels} isBeleza={isBeleza} nicho={nicho} onStatusChange={mudarStatus} updating={updating} />
                ))}
              </div>
            </section>
          )}

          {/* Faltaram */}
          {faltaram.length > 0 && filtroStatus === 'todos' && (
            <section>
              <h2 className="text-[9px] font-black uppercase tracking-[0.3em] text-text-placeholder mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-orange-400" />
                Faltaram — {faltaram.length}
              </h2>
              <div className="space-y-2 opacity-60">
                {faltaram.map(a => (
                  <CardAtendimento key={a.id} ag={a} labels={labels} isBeleza={isBeleza} nicho={nicho} onStatusChange={mudarStatus} updating={updating} />
                ))}
              </div>
            </section>
          )}

          {/* Cancelados */}
          {cancelados.length > 0 && filtroStatus === 'todos' && (
            <section>
              <h2 className="text-[9px] font-black uppercase tracking-[0.3em] text-text-placeholder mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-400" />
                Cancelados — {cancelados.length}
              </h2>
              <div className="space-y-2 opacity-50">
                {cancelados.map(a => (
                  <CardAtendimento key={a.id} ag={a} labels={labels} isBeleza={isBeleza} nicho={nicho} onStatusChange={mudarStatus} updating={updating} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
      </> } {/* fim abaAtiva === 'atendimentos' */}

      {/* ── Modal Encaixe Rápido ── */}
      {showEncaixe && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center" onClick={() => setShowEncaixe(false)}>
          <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm" />
          <div className="relative bg-white rounded-[2rem] shadow-2xl border border-card-border p-8 w-full max-w-md space-y-5 animate-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black italic uppercase tracking-tighter text-text-main">Encaixe Rápido</h3>
              <button onClick={() => setShowEncaixe(false)} className="text-text-placeholder hover:text-text-main w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors"><svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M9 3L3 9M3 3l6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg></button>
            </div>

            {/* Busca de paciente */}
            <div className="space-y-1.5">
              <label className="text-[9px] font-black uppercase tracking-widest text-text-placeholder">{labels.termoPaciente} *</label>
              <div className="relative">
                <input value={encPacId ? encPacNome : encPacBusca}
                  onChange={e => { setEncPacId(''); buscarPacientesEncaixe(e.target.value); }}
                  placeholder={`Buscar ${labels.termoPaciente.toLowerCase()}...`}
                  className="input-premium w-full py-3 text-sm" autoFocus />
                {encaixes.pacientes.length > 0 && !encPacId && (
                  <div className="absolute top-full left-0 right-0 bg-white border border-card-border rounded-xl shadow-xl z-10 mt-1 overflow-hidden">
                    {encaixes.pacientes.slice(0, 5).map((p: any) => (
                      <button key={p.id} onClick={() => { setEncPacId(p.id); setEncPacNome(p.nome); setEncaixes(prev => ({ ...prev, pacientes: [] })); }}
                        className="w-full px-4 py-3 text-left hover:bg-slate-50 border-b border-slate-50 last:border-0">
                        <p className="font-black text-text-main text-sm uppercase">{p.nome}</p>
                        <p className="text-[10px] font-mono text-text-muted">{p.telefone}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Data + hora */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase tracking-widest text-text-placeholder">Data</label>
                <input type="date" value={data} readOnly className="input-premium w-full py-3 text-sm bg-slate-50" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase tracking-widest text-text-placeholder">Horário *</label>
                <input type="time" value={encHorario} onChange={e => setEncHorario(e.target.value)}
                  className="input-premium w-full py-3 text-sm" />
              </div>
            </div>

            {/* Serviço */}
            {encaixes.servicos.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase tracking-widest text-text-placeholder">{labels.termoServico}</label>
                <select value={encServId} onChange={e => setEncServId(e.target.value)} className="input-premium w-full py-3 text-sm">
                  <option value="">— Selecionar —</option>
                  {encaixes.servicos.map((s: any) => (
                    <option key={s.id} value={s.id}>{s.nome}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Profissional */}
            {encaixes.profissionais.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase tracking-widest text-text-placeholder">{labels.termoProfissional}</label>
                <select value={encProfId} onChange={e => setEncProfId(e.target.value)} className="input-premium w-full py-3 text-sm">
                  <option value="">— Selecionar —</option>
                  {encaixes.profissionais.map((p: any) => (
                    <option key={p.id} value={p.id}>{p.nome}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <button onClick={() => setShowEncaixe(false)}
                className="flex-1 py-3 bg-slate-50 border border-card-border rounded-xl text-[9px] font-black uppercase hover:bg-slate-100 transition-colors">
                Cancelar
              </button>
              <button onClick={salvarEncaixe} disabled={encSaving || !encPacId || !encHorario}
                className="flex-1 btn-primary py-3 text-[9px] disabled:opacity-40">
                {encSaving ? 'Salvando...' : 'Encaixar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
