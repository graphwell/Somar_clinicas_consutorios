"use client";
import React, { useState, useEffect, useCallback } from "react";
import { useNicho } from "@/context/NichoContext";
import { fetchWithAuth } from "@/lib/api-utils";
import { PLANOS_TEMPLATES, TEMPLATES_GENERICOS, TEMPLATES_BARBEARIA } from "@/lib/planos-templates";

// ─── Types ──────────────────────────────────────────────────────────────────

type ServicoPlano = {
  servicoId:   string;
  nomeServico: string;
  tipo:        "ilimitado" | "limitado";
  quantidade:  number | null;
};

type Plano = {
  id:                     string;
  nome:                   string;
  descricao:              string | null;
  valor:                  number;
  periodicidade:          string;
  servicos:               ServicoPlano[];
  ativo:                  boolean;
  agendamentoPrioritario: boolean;
  descontoProdutos:       number | null;
  descontoServicosExtras: number | null;
  _count:                 { assinantes: number };
};

type Assinatura = {
  id:              string;
  status:          string;
  valorPago:       number;
  periodoInicio:   string;
  periodoFim:      string | null;
  proximaCobranca: string | null;
  contadorUso:     Record<string, { usado: number; limite: number | null }>;
  paciente:        { id: string; nome: string; telefone: string };
  plano:           { id: string; nome: string; valor: number; servicos: ServicoPlano[] };
};

type Servico = { id: string; nome: string };

// ─── Helpers ────────────────────────────────────────────────────────────────

const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const fmtData = (s: string | null) =>
  s ? new Date(s).toLocaleDateString("pt-BR") : "—";

const STATUS_LABEL: Record<string, { label: string; bg: string; text: string }> = {
  ativo:     { label: "Ativo",     bg: "#F0FAF4", text: "#2D6A4F" },
  suspenso:  { label: "Suspenso",  bg: "#FFFBEB", text: "#92400E" },
  cancelado: { label: "Cancelado", bg: "#FEF2F2", text: "#991B1B" },
  expirado:  { label: "Expirado",  bg: "#F3F4F5", text: "#6B7280" },
};

// ─── Componentes internos ────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_LABEL[status] ?? STATUS_LABEL.expirado;
  return (
    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
      style={{ background: cfg.bg, color: cfg.text }}>
      {cfg.label}
    </span>
  );
}

function BarraUso({ usado, limite, nome }: { usado: number; limite: number | null; nome: string }) {
  const pct      = limite ? Math.min(100, (usado / limite) * 100) : 0;
  const atingido = limite !== null && usado >= limite;
  return (
    <div className="space-y-0.5">
      <div className="flex justify-between text-[10px]" style={{ color: "#8A9BB0" }}>
        <span className="truncate max-w-[140px]">{nome}</span>
        <span style={{ color: atingido ? "#E24B4A" : "#8A9BB0", fontWeight: atingido ? 600 : 400 }}>
          {limite === null ? `${usado}/∞` : `${usado}/${limite}`}
        </span>
      </div>
      {limite !== null && (
        <div className="h-1.5 rounded-full w-full" style={{ background: "#F3F4F5" }}>
          <div className="h-1.5 rounded-full transition-all"
            style={{ width: `${pct}%`, background: atingido ? "#E24B4A" : "#40916C" }} />
        </div>
      )}
    </div>
  );
}

// ─── Modal Criar / Editar Plano ─────────────────────────────────────────────

function ModalPlano({
  plano,
  servicos,
  onClose,
  onSaved,
}: {
  plano:    Plano | null;
  servicos: Servico[];
  onClose:  () => void;
  onSaved:  () => void;
}) {
  type TipoServico = "nao_incluso" | "limitado" | "ilimitado";

  const [nome,          setNome]          = useState(plano?.nome ?? "");
  const [descricao,     setDescricao]     = useState(plano?.descricao ?? "");
  const [valor,         setValor]         = useState(plano?.valor?.toString() ?? "");
  const [periodicidade, setPeriodicidade] = useState(plano?.periodicidade ?? "mensal");
  const [ativo,         setAtivo]         = useState(plano?.ativo ?? true);
  const [agPrioritario, setAgPrioritario] = useState(plano?.agendamentoPrioritario ?? false);
  const [descProdutos,  setDescProdutos]  = useState(plano?.descontoProdutos?.toString() ?? "");
  const [descExtras,    setDescExtras]    = useState(plano?.descontoServicosExtras?.toString() ?? "");
  const [saving,        setSaving]        = useState(false);

  const [tiposServico, setTiposServico] = useState<Record<string, TipoServico>>(() => {
    const m: Record<string, TipoServico> = {};
    servicos.forEach(s => {
      const inc = plano?.servicos?.find(x => x.servicoId === s.id);
      m[s.id] = inc ? (inc.tipo as TipoServico) : "nao_incluso";
    });
    return m;
  });
  const [qtdsServico, setQtdsServico] = useState<Record<string, string>>(() => {
    const m: Record<string, string> = {};
    servicos.forEach(s => {
      const inc = plano?.servicos?.find(x => x.servicoId === s.id);
      m[s.id] = inc?.quantidade?.toString() ?? "1";
    });
    return m;
  });

  function buildServicos(): ServicoPlano[] {
    return servicos
      .filter(s => tiposServico[s.id] !== "nao_incluso")
      .map(s => ({
        servicoId:   s.id,
        nomeServico: s.nome,
        tipo:        tiposServico[s.id] as "limitado" | "ilimitado",
        quantidade:  tiposServico[s.id] === "limitado" ? (parseInt(qtdsServico[s.id]) || 1) : null,
      }));
  }

  async function handleSave() {
    if (!nome.trim() || !valor) return;
    setSaving(true);
    try {
      const body = {
        nome:                   nome.trim(),
        descricao:              descricao.trim() || null,
        valor:                  parseFloat(valor.replace(",", ".")),
        periodicidade,
        ativo,
        agendamentoPrioritario: agPrioritario,
        descontoProdutos:       descProdutos ? parseFloat(descProdutos) : null,
        descontoServicosExtras: descExtras   ? parseFloat(descExtras)   : null,
        servicos:               buildServicos(),
      };
      if (plano) {
        await fetchWithAuth(`/api/subscriptions/planos/${plano.id}`, {
          method: "PATCH", body: JSON.stringify(body),
        });
      } else {
        await fetchWithAuth("/api/subscriptions/planos", {
          method: "POST", body: JSON.stringify(body),
        });
      }
      onSaved();
      onClose();
    } catch {
      alert("Erro ao salvar plano.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto"
      style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)" }}>
      <div className="w-full max-w-xl my-8 rounded-2xl overflow-hidden shadow-2xl"
        style={{ background: "white", border: "1px solid #EEE9DF" }}>

        <div className="px-6 py-5 flex justify-between items-center" style={{ borderBottom: "1px solid #EEE9DF" }}>
          <h3 className="font-semibold text-base" style={{ color: "#1B2B3A" }}>
            {plano ? "Editar plano" : "Criar novo plano"}
          </h3>
          <button onClick={onClose} style={{ color: "#8A9BB0" }}><svg width="14" height="14" viewBox="0 0 12 12" fill="none"><path d="M9 3L3 9M3 3l6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg></button>
        </div>

        <div className="px-6 py-5 space-y-5 overflow-y-auto" style={{ maxHeight: "68vh", background: "#FAFAF9" }}>
          <div>
            <label className="block text-[11px] font-semibold uppercase mb-1.5" style={{ color: "#4A6480", letterSpacing: "0.5px" }}>Nome do plano *</label>
            <input value={nome} onChange={e => setNome(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl text-sm"
              style={{ border: "1px solid #EEE9DF", background: "white", color: "#1B2B3A" }}
              placeholder="Ex: Plano Premium" />
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase mb-1.5" style={{ color: "#4A6480", letterSpacing: "0.5px" }}>Descrição</label>
            <input value={descricao} onChange={e => setDescricao(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl text-sm"
              style={{ border: "1px solid #EEE9DF", background: "white", color: "#1B2B3A" }}
              placeholder="Ex: Para clientes que querem mais" />
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-[11px] font-semibold uppercase mb-1.5" style={{ color: "#4A6480", letterSpacing: "0.5px" }}>Valor (R$) *</label>
              <input value={valor} onChange={e => setValor(e.target.value)} type="text" inputMode="decimal"
                className="w-full px-3 py-2.5 rounded-xl text-sm"
                style={{ border: "1px solid #EEE9DF", background: "white", color: "#1B2B3A" }}
                placeholder="149,90" />
            </div>
            <div className="flex-1">
              <label className="block text-[11px] font-semibold uppercase mb-1.5" style={{ color: "#4A6480", letterSpacing: "0.5px" }}>Periodicidade</label>
              <select value={periodicidade} onChange={e => setPeriodicidade(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl text-sm"
                style={{ border: "1px solid #EEE9DF", background: "white", color: "#1B2B3A" }}>
                <option value="mensal">Mensal</option>
                <option value="trimestral">Trimestral</option>
                <option value="anual">Anual</option>
              </select>
            </div>
          </div>

          {servicos.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold uppercase mb-3" style={{ color: "#4A6480", letterSpacing: "0.5px" }}>Serviços incluídos</p>
              <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #EEE9DF" }}>
                {servicos.map((s, i) => (
                  <div key={s.id} className="px-4 py-3"
                    style={{ background: i % 2 === 0 ? "white" : "#FAFAF9", borderBottom: i < servicos.length - 1 ? "1px solid #F0EDE8" : "none" }}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex flex-col gap-1 flex-1">
                        {(["nao_incluso", "limitado", "ilimitado"] as TipoServico[]).map(op => (
                          <label key={op} className="flex items-center gap-1.5 cursor-pointer text-xs" style={{ color: "#4A6480" }}>
                            <input type="radio" name={`srv-${s.id}`} value={op}
                              checked={tiposServico[s.id] === op}
                              onChange={() => setTiposServico(p => ({ ...p, [s.id]: op }))}
                              className="accent-green-600" />
                            {op === "nao_incluso" && "Não incluso"}
                            {op === "limitado" && (
                              <span className="flex items-center gap-1">
                                Limitado →
                                <input type="number" min={1}
                                  value={qtdsServico[s.id]}
                                  onChange={e => setQtdsServico(p => ({ ...p, [s.id]: e.target.value }))}
                                  disabled={tiposServico[s.id] !== "limitado"}
                                  className="w-12 px-1 py-0.5 rounded text-center text-xs"
                                  style={{ border: "1px solid #EEE9DF", background: tiposServico[s.id] !== "limitado" ? "#F3F4F5" : "white" }} />
                                ×/mês
                              </span>
                            )}
                            {op === "ilimitado" && "Ilimitado"}
                          </label>
                        ))}
                      </div>
                      <span className="text-sm font-medium text-right" style={{ color: "#1B2B3A", minWidth: 80 }}>{s.nome}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="text-[11px] font-semibold uppercase mb-3" style={{ color: "#4A6480", letterSpacing: "0.5px" }}>Benefícios extras</p>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: "#4A6480" }}>
                <input type="checkbox" checked={agPrioritario} onChange={e => setAgPrioritario(e.target.checked)} className="accent-green-600" />
                Agendamento prioritário
              </label>
              <div className="flex items-center gap-2">
                <input type="checkbox"
                  checked={descProdutos !== ""}
                  onChange={e => setDescProdutos(e.target.checked ? "10" : "")}
                  className="accent-green-600" />
                <span className="text-sm" style={{ color: "#4A6480" }}>Desconto em produtos:</span>
                <input type="number" min={0} max={100}
                  value={descProdutos} onChange={e => setDescProdutos(e.target.value)}
                  disabled={descProdutos === ""}
                  className="w-14 px-2 py-1 rounded-lg text-sm text-center"
                  style={{ border: "1px solid #EEE9DF", background: descProdutos === "" ? "#F3F4F5" : "white" }} />
                <span className="text-sm" style={{ color: "#8A9BB0" }}>%</span>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox"
                  checked={descExtras !== ""}
                  onChange={e => setDescExtras(e.target.checked ? "10" : "")}
                  className="accent-green-600" />
                <span className="text-sm" style={{ color: "#4A6480" }}>Desconto em serviços extras:</span>
                <input type="number" min={0} max={100}
                  value={descExtras} onChange={e => setDescExtras(e.target.value)}
                  disabled={descExtras === ""}
                  className="w-14 px-2 py-1 rounded-lg text-sm text-center"
                  style={{ border: "1px solid #EEE9DF", background: descExtras === "" ? "#F3F4F5" : "white" }} />
                <span className="text-sm" style={{ color: "#8A9BB0" }}>%</span>
              </div>
            </div>
          </div>

          <div>
            <p className="text-[11px] font-semibold uppercase mb-2" style={{ color: "#4A6480", letterSpacing: "0.5px" }}>Status</p>
            <div className="space-y-1">
              {([{ v: true, l: "Ativo (visível para assinatura)" }, { v: false, l: "Inativo (oculto)" }]).map(opt => (
                <label key={String(opt.v)} className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: "#4A6480" }}>
                  <input type="radio" name="ativo" checked={ativo === opt.v} onChange={() => setAtivo(opt.v)} className="accent-green-600" />
                  {opt.l}
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="px-6 py-4 flex gap-2 justify-end" style={{ borderTop: "1px solid #EEE9DF" }}>
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-xl"
            style={{ border: "1px solid #EEE9DF", color: "#4A6480", background: "transparent" }}>
            Cancelar
          </button>
          <button onClick={handleSave} disabled={saving || !nome.trim() || !valor}
            className="px-5 py-2 text-sm font-medium rounded-xl text-white disabled:opacity-50"
            style={{ background: "#40916C" }}>
            {saving ? "Salvando…" : "Salvar plano"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal Assinar Cliente ───────────────────────────────────────────────────

function ModalAssinar({
  planos,
  termoPaciente,
  onClose,
  onSaved,
}: {
  planos:        Plano[];
  termoPaciente: string;
  onClose:       () => void;
  onSaved:       () => void;
}) {
  const [busca,     setBusca]     = useState("");
  const [pacientes, setPacientes] = useState<{ id: string; nome: string; telefone: string }[]>([]);
  const [selPac,    setSelPac]    = useState("");
  const [selPlano,  setSelPlano]  = useState(planos[0]?.id ?? "");
  const [saving,    setSaving]    = useState(false);

  useEffect(() => {
    if (busca.length < 2) { setPacientes([]); return; }
    const t = setTimeout(async () => {
      try {
        const r = await fetchWithAuth(`/api/patients?search=${encodeURIComponent(busca)}&limit=10`);
        const d = await r.json();
        setPacientes(Array.isArray(d.patients) ? d.patients : Array.isArray(d) ? d : []);
      } catch { setPacientes([]); }
    }, 300);
    return () => clearTimeout(t);
  }, [busca]);

  async function handleSave() {
    if (!selPac || !selPlano) return;
    setSaving(true);
    try {
      await fetchWithAuth("/api/subscriptions/clientes", {
        method: "POST", body: JSON.stringify({ pacienteId: selPac, planoId: selPlano }),
      });
      onSaved();
      onClose();
    } catch {
      alert("Erro ao assinar cliente.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)" }}>
      <div className="w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl"
        style={{ background: "white", border: "1px solid #EEE9DF" }}>
        <div className="px-6 py-5 flex justify-between items-center" style={{ borderBottom: "1px solid #EEE9DF" }}>
          <h3 className="font-semibold" style={{ color: "#1B2B3A" }}>Assinar {termoPaciente}</h3>
          <button onClick={onClose} style={{ color: "#8A9BB0" }}><svg width="14" height="14" viewBox="0 0 12 12" fill="none"><path d="M9 3L3 9M3 3l6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg></button>
        </div>
        <div className="px-6 py-5 space-y-4" style={{ background: "#FAFAF9" }}>
          <div>
            <label className="block text-[11px] font-semibold uppercase mb-1.5" style={{ color: "#4A6480", letterSpacing: "0.5px" }}>{termoPaciente}</label>
            <input value={busca} onChange={e => setBusca(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl text-sm mb-2"
              style={{ border: "1px solid #EEE9DF", background: "white", color: "#1B2B3A" }}
              placeholder={`Buscar ${termoPaciente.toLowerCase()}...`} />
            {pacientes.length > 0 && (
              <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #EEE9DF" }}>
                {pacientes.map(p => (
                  <button key={p.id} onClick={() => { setSelPac(p.id); setBusca(p.nome); setPacientes([]); }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-green-50 transition-colors"
                    style={{ color: "#1B2B3A", borderBottom: "1px solid #F0EDE8" }}>
                    {p.nome} <span className="text-xs ml-1" style={{ color: "#8A9BB0" }}>{p.telefone}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className="block text-[11px] font-semibold uppercase mb-1.5" style={{ color: "#4A6480", letterSpacing: "0.5px" }}>Plano</label>
            <select value={selPlano} onChange={e => setSelPlano(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl text-sm"
              style={{ border: "1px solid #EEE9DF", background: "white", color: "#1B2B3A" }}>
              {planos.filter(p => p.ativo).map(p => (
                <option key={p.id} value={p.id}>{p.nome} — {fmtBRL(p.valor)}/{p.periodicidade}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="px-6 py-4 flex gap-2 justify-end" style={{ borderTop: "1px solid #EEE9DF" }}>
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-xl"
            style={{ border: "1px solid #EEE9DF", color: "#4A6480" }}>Cancelar</button>
          <button onClick={handleSave} disabled={saving || !selPac || !selPlano}
            className="px-5 py-2 text-sm font-medium rounded-xl text-white disabled:opacity-50"
            style={{ background: "#40916C" }}>
            {saving ? "Salvando…" : "Confirmar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Tab Planos ──────────────────────────────────────────────────────────────

function TabPlanos({
  planos, servicos, loadingPlanos, nicho, onRefresh,
}: {
  planos: Plano[]; servicos: Servico[]; loadingPlanos: boolean; nicho: string; onRefresh: () => void;
}) {
  const [modalPlano,    setModalPlano]    = useState<Plano | null | "novo">(null);
  const [ativarLoading, setAtivarLoading] = useState<string | null>(null);

  async function ativarTemplate(tipo: string) {
    setAtivarLoading(tipo);
    try {
      await fetchWithAuth("/api/subscriptions/planos/ativar-template", {
        method: "POST", body: JSON.stringify({ templateTipo: tipo }),
      });
      onRefresh();
    } catch {
      alert("Erro ao ativar template.");
    } finally {
      setAtivarLoading(null);
    }
  }

  async function desativarReativar(plano: Plano) {
    const msg = plano.ativo ? "Desativar este plano?" : "Reativar este plano?";
    if (!confirm(msg)) return;
    await fetchWithAuth(`/api/subscriptions/planos/${plano.id}`, {
      method: "PATCH", body: JSON.stringify({ ativo: !plano.ativo }),
    });
    onRefresh();
  }

  if (loadingPlanos) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-48 rounded-xl animate-pulse" style={{ background: "#F3F4F5" }} />
        ))}
      </div>
    );
  }

  const planosAtivos = planos.filter(p => p.ativo);

  return (
    <>
      {planosAtivos.length === 0 && (
        <div className="rounded-2xl p-6 mb-6" style={{ background: "#F8FAF9", border: "1px solid #E2EDE8" }}>
          <p className="font-semibold mb-1" style={{ color: "#1B2B3A" }}>Comece rápido com um template</p>
          <p className="text-sm mb-4" style={{ color: "#8A9BB0" }}>Ative um modelo pré-configurado e personalize depois.</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {TEMPLATES_GENERICOS.map(t => (
              <div key={t.templateTipo} className="bg-white rounded-xl p-4"
                style={{ border: t.templateTipo === "premium" ? "2px solid #40916C" : "1px solid #EEE9DF" }}>
                {t.templateTipo === "premium" && (
                  <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full mb-2 inline-block"
                    style={{ background: "#40916C", color: "white" }}>Popular</span>
                )}
                <p className="font-semibold text-sm mb-0.5" style={{ color: "#1B2B3A" }}>{t.preview.titulo}</p>
                <p className="text-lg font-bold mb-2" style={{ color: "#40916C" }}>
                  {fmtBRL(t.valor)}<span className="text-xs font-normal" style={{ color: "#8A9BB0" }}>/mês</span>
                </p>
                <ul className="text-xs space-y-0.5 mb-3" style={{ color: "#4A6480" }}>
                  {t.preview.exemplo.map(e => <li key={e}>{e}</li>)}
                </ul>
                <button onClick={() => ativarTemplate(t.templateTipo)}
                  disabled={ativarLoading === t.templateTipo}
                  className="w-full py-2 text-xs font-medium rounded-lg text-white disabled:opacity-60"
                  style={{ background: "#40916C" }}>
                  {ativarLoading === t.templateTipo ? "Ativando…" : "Ativar"}
                </button>
              </div>
            ))}
          </div>
          <div className="mt-4 text-center">
            <button onClick={() => setModalPlano("novo")} className="text-sm font-medium" style={{ color: "#40916C" }}>
              Ou criar plano do zero →
            </button>
          </div>
        </div>
      )}

      {/* ── Templates exclusivos de barbearia ──────────────────────────────── */}
      {nicho === "BARBEARIA" && (
        <div className="rounded-2xl p-6 mb-6" style={{ background: "#1a1a2e10", border: "1px solid #C4973A40" }}>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-base">✂</span>
            <p className="font-semibold" style={{ color: "#1B2B3A" }}>Templates para Barbearia</p>
          </div>
          <p className="text-sm mb-4" style={{ color: "#8A9BB0" }}>
            Planos pensados para barbearias — serviços mapeados automaticamente pelo nome.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {TEMPLATES_BARBEARIA.map(t => (
              <div key={t.templateTipo} className="bg-white rounded-xl p-4"
                style={{ border: t.templateTipo === "black_ilimitado" ? "2px solid #C4973A" : "1px solid #EEE9DF" }}>
                {t.templateTipo === "black_ilimitado" && (
                  <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full mb-2 inline-block"
                    style={{ background: "#C4973A", color: "white" }}>Premium</span>
                )}
                <p className="font-semibold text-sm mb-0.5" style={{ color: "#1B2B3A" }}>{t.preview.titulo}</p>
                <p className="text-lg font-bold mb-1" style={{ color: "#C4973A" }}>
                  {fmtBRL(t.valor)}<span className="text-xs font-normal" style={{ color: "#8A9BB0" }}>/mês</span>
                </p>
                {/* Serviços inclusos */}
                <div className="mb-2 space-y-0.5">
                  {t.servicos.map((s, i) => (
                    <p key={i} className="text-xs" style={{ color: "#4A6480" }}>
                      {s.tipo === 'ilimitado'
                        ? `∞ ${s.nome}`
                        : `${s.quantidade}× ${s.nome}/mês`}
                    </p>
                  ))}
                </div>
                {/* Dias permitidos */}
                {t.diasPermitidos.length > 0 && (
                  <p className="text-[10px] mb-2" style={{ color: "#8A9BB0" }}>
                    📅 {t.diasPermitidos.map(d => d.charAt(0).toUpperCase() + d.slice(1)).join(', ')}
                  </p>
                )}
                <ul className="text-xs space-y-0.5 mb-3" style={{ color: "#4A6480" }}>
                  {t.preview.exemplo.map(e => <li key={e}>{e}</li>)}
                </ul>
                <button
                  onClick={() => ativarTemplate(t.templateTipo)}
                  disabled={ativarLoading === t.templateTipo}
                  className="w-full py-2 text-xs font-medium rounded-lg text-white disabled:opacity-60"
                  style={{ background: "#C4973A" }}>
                  {ativarLoading === t.templateTipo ? "Ativando…" : "Ativar template"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {planos.map(plano => (
          <div key={plano.id} className="rounded-xl p-5 flex flex-col"
            style={{
              background:  "white",
              border:      `1px solid ${plano.ativo ? "#C8DDD4" : "#E8E4DC"}`,
              borderLeft:  `3px solid ${plano.ativo ? "#40916C" : "#D1D5DB"}`,
            }}>
            <div className="flex justify-between items-start mb-3">
              <div>
                <p className="font-semibold text-sm" style={{ color: "#1B2B3A" }}>{plano.nome}</p>
                {plano.descricao && <p className="text-xs mt-0.5" style={{ color: "#8A9BB0" }}>{plano.descricao}</p>}
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                style={{ background: plano.ativo ? "#F0FAF4" : "#F3F4F5", color: plano.ativo ? "#2D6A4F" : "#6B7280" }}>
                {plano.ativo ? "● Ativo" : "○ Inativo"}
              </span>
            </div>

            <p className="text-2xl font-bold mb-3" style={{ color: "#40916C" }}>
              {fmtBRL(plano.valor)}
              <span className="text-xs font-normal ml-1" style={{ color: "#8A9BB0" }}>/{plano.periodicidade}</span>
            </p>

            <div className="space-y-1 mb-4 flex-1 text-xs" style={{ color: "#4A6480" }}>
              <p>{plano._count?.assinantes ?? 0} assinante{plano._count?.assinantes !== 1 ? "s" : ""} ativo{plano._count?.assinantes !== 1 ? "s" : ""}</p>
              <p>{plano.servicos?.length ?? 0} serviço{(plano.servicos?.length ?? 0) !== 1 ? "s" : ""} incluído{(plano.servicos?.length ?? 0) !== 1 ? "s" : ""}</p>
              {plano.agendamentoPrioritario && <p>Agendamento prioritário</p>}
              {(plano.descontoServicosExtras ?? 0) > 0 && (
                <p>{plano.descontoServicosExtras}% OFF em serviços extras</p>
              )}
            </div>

            <div className="flex gap-2">
              <button onClick={() => setModalPlano(plano)}
                className="flex-1 py-1.5 text-xs font-medium rounded-lg"
                style={{ background: "#F0FAF4", color: "#40916C", border: "1px solid #C8DDD4" }}>
                Editar
              </button>
              <button onClick={() => desativarReativar(plano)}
                className="py-1.5 px-3 text-xs rounded-lg"
                style={{ color: plano.ativo ? "#E24B4A" : "#40916C", border: `1px solid ${plano.ativo ? "#FAD7D7" : "#C8DDD4"}`, background: "transparent" }}>
                {plano.ativo ? "Desativar" : "Reativar"}
              </button>
            </div>
          </div>
        ))}

        {planosAtivos.length > 0 && (
          <button onClick={() => setModalPlano("novo")}
            className="rounded-xl p-5 flex flex-col items-center justify-center gap-2 min-h-[200px] transition-colors"
            style={{ border: "2px dashed #C8DDD4", background: "#F8FAF9", color: "#40916C" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#EDF7F2"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "#F8FAF9"; }}>
            <span className="text-2xl">+</span>
            <span className="text-sm font-medium">Criar plano</span>
          </button>
        )}
      </div>

      {modalPlano !== null && (
        <ModalPlano
          plano={modalPlano === "novo" ? null : modalPlano}
          servicos={servicos}
          onClose={() => setModalPlano(null)}
          onSaved={onRefresh}
        />
      )}
    </>
  );
}

// ─── Tab Assinantes ──────────────────────────────────────────────────────────

function TabAssinantes({
  planos, termoPaciente, onRefresh,
}: {
  planos: Plano[]; termoPaciente: string; onRefresh: () => void;
}) {
  const [assinaturas,   setAssinaturas]   = useState<Assinatura[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [filtroPlano,   setFiltroPlano]   = useState("");
  const [filtroStatus,  setFiltroStatus]  = useState("");
  const [modalAssinar,  setModalAssinar]  = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filtroPlano)  params.set("planoId", filtroPlano);
      if (filtroStatus) params.set("status",  filtroStatus);
      const r = await fetchWithAuth(`/api/subscriptions/clientes?${params}`);
      const d = await r.json();
      setAssinaturas(Array.isArray(d) ? d : []);
    } catch { setAssinaturas([]); }
    finally  { setLoading(false); }
  }, [filtroPlano, filtroStatus]);

  useEffect(() => { load(); }, [load]);

  async function cancelarAssinatura(id: string) {
    if (!confirm(`Cancelar a assinatura deste ${termoPaciente.toLowerCase()}?`)) return;
    await fetchWithAuth(`/api/subscriptions/planos/${id}`, {
      method: "PATCH", body: JSON.stringify({ status: "cancelado" }),
    });
    load();
  }

  return (
    <>
      <div className="flex flex-wrap gap-2 mb-5">
        <select value={filtroPlano} onChange={e => setFiltroPlano(e.target.value)}
          className="px-3 py-2 rounded-xl text-sm"
          style={{ border: "1px solid #EEE9DF", color: "#4A6480", background: "white" }}>
          <option value="">Todos os planos</option>
          {planos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
        </select>
        <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}
          className="px-3 py-2 rounded-xl text-sm"
          style={{ border: "1px solid #EEE9DF", color: "#4A6480", background: "white" }}>
          <option value="">Todos status</option>
          <option value="ativo">Ativo</option>
          <option value="suspenso">Suspenso</option>
          <option value="cancelado">Cancelado</option>
        </select>
        <div className="flex-1" />
        <button onClick={() => setModalAssinar(true)}
          className="px-4 py-2 text-sm font-medium rounded-xl text-white"
          style={{ background: "#40916C" }}>
          + Assinar {termoPaciente}
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-32 rounded-xl animate-pulse" style={{ background: "#F3F4F5" }} />
          ))}
        </div>
      ) : assinaturas.length === 0 ? (
        <div className="text-center py-16" style={{ color: "#8A9BB0" }}>
          <div className="flex justify-center mb-3"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#8A9BB0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg></div>
          <p className="font-medium">Nenhum assinante encontrado</p>
          <p className="text-sm mt-1">Assine um {termoPaciente.toLowerCase()} em um plano para começar</p>
        </div>
      ) : (
        <div className="space-y-3">
          {assinaturas.map(a => {
            const servicos: ServicoPlano[] = Array.isArray(a.plano?.servicos) ? (a.plano.servicos as ServicoPlano[]) : [];
            return (
              <div key={a.id} className="rounded-xl p-4"
                style={{ background: "white", border: "1px solid #EEE9DF" }}>
                <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
                  <div>
                    <p className="font-medium text-sm" style={{ color: "#1B2B3A" }}>{a.paciente.nome}</p>
                    <p className="text-xs mt-0.5" style={{ color: "#8A9BB0" }}>{a.paciente.telefone}</p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium" style={{ color: "#40916C" }}>{a.plano?.nome}</span>
                      <StatusBadge status={a.status} />
                    </div>
                    <p className="text-[10px]" style={{ color: "#8A9BB0" }}>
                      Desde {fmtData(a.periodoInicio)}
                      {a.proximaCobranca && ` · Próx. cobrança ${fmtData(a.proximaCobranca)}`}
                    </p>
                  </div>
                </div>

                {servicos.length > 0 && (
                  <div className="mb-3 space-y-1.5 p-3 rounded-lg" style={{ background: "#F8FAF9" }}>
                    <p className="text-[10px] font-semibold uppercase mb-1.5"
                      style={{ color: "#8A9BB0", letterSpacing: "0.4px" }}>Uso este mês</p>
                    {servicos.map(s => {
                      const c = (a.contadorUso as any)[s.servicoId] ?? { usado: 0, limite: s.quantidade };
                      return <BarraUso key={s.servicoId} nome={s.nomeServico} usado={c.usado} limite={c.limite} />;
                    })}
                  </div>
                )}

                {a.status === "ativo" && (
                  <button onClick={() => cancelarAssinatura(a.id)}
                    className="text-xs px-3 py-1.5 rounded-lg"
                    style={{ color: "#E24B4A", border: "1px solid #FAD7D7", background: "transparent" }}>
                    Cancelar plano
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {modalAssinar && (
        <ModalAssinar
          planos={planos}
          termoPaciente={termoPaciente}
          onClose={() => setModalAssinar(false)}
          onSaved={() => { load(); onRefresh(); }}
        />
      )}
    </>
  );
}

// ─── Tab Uso do Mês ──────────────────────────────────────────────────────────

function TabUso({ planos }: { planos: Plano[] }) {
  const [assinaturas, setAssinaturas] = useState<Assinatura[]>([]);
  const [loading,     setLoading]     = useState(true);

  useEffect(() => {
    fetchWithAuth("/api/subscriptions/clientes?status=ativo")
      .then(r => r.json())
      .then(d => setAssinaturas(Array.isArray(d) ? d : []))
      .catch(() => setAssinaturas([]))
      .finally(() => setLoading(false));
  }, []);

  const totalAssinantes   = assinaturas.length;
  const receitaRecorrente = assinaturas.reduce((s, a) => s + a.valorPago, 0);
  const totalUsos         = assinaturas.reduce((s, a) =>
    s + Object.values(a.contadorUso as any).reduce((t: number, c: any) => t + (c.usado ?? 0), 0), 0);

  const porPlano = planos.map(p => {
    const subs    = assinaturas.filter(a => a.plano?.id === p.id);
    const usos    = subs.reduce((s, a) =>
      s + Object.values(a.contadorUso as any).reduce((t: number, c: any) => t + (c.usado ?? 0), 0), 0);
    const receita = subs.reduce((s, a) => s + a.valorPago, 0);
    return { ...p, subs: subs.length, usos, receita };
  }).filter(p => p.subs > 0);

  const stats = [
    { l: "Assinantes ativos",    v: String(totalAssinantes) },
    { l: "Receita recorrente",   v: fmtBRL(receitaRecorrente) },
    { l: "Total de usos no mês", v: String(totalUsos) },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map(s => (
          <div key={s.l} className="rounded-xl p-4" style={{ background: "white", border: "1px solid #EEE9DF" }}>
            <p className="text-[10px] uppercase font-semibold mb-1" style={{ color: "#8A9BB0", letterSpacing: "0.4px" }}>{s.l}</p>
            <p className="text-xl font-bold" style={{ color: "#1B2B3A" }}>{loading ? "—" : s.v}</p>
          </div>
        ))}
      </div>

      {!loading && porPlano.length > 0 && (
        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #EEE9DF" }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "#F8FAF9", borderBottom: "1px solid #EEE9DF" }}>
                {["Plano", "Assinantes", "Usos totais", "Receita"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase"
                    style={{ color: "#8A9BB0", letterSpacing: "0.4px" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {porPlano.map((p, i) => (
                <tr key={p.id} style={{ background: i % 2 === 0 ? "white" : "#FAFAF9", borderBottom: "1px solid #F0EDE8" }}>
                  <td className="px-4 py-3 font-medium" style={{ color: "#1B2B3A" }}>{p.nome}</td>
                  <td className="px-4 py-3" style={{ color: "#4A6480" }}>{p.subs}</td>
                  <td className="px-4 py-3" style={{ color: "#4A6480" }}>{p.usos}</td>
                  <td className="px-4 py-3 font-medium" style={{ color: "#40916C" }}>{fmtBRL(p.receita)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && porPlano.length === 0 && (
        <div className="text-center py-12" style={{ color: "#8A9BB0" }}>
          <p>Nenhum assinante ativo este mês.</p>
        </div>
      )}
    </div>
  );
}

// ─── Página Principal ────────────────────────────────────────────────────────

export default function SubscriptionsPage() {
  const { labels, nicho } = useNicho();
  const [tab,      setTab]      = useState<"planos" | "assinantes" | "uso">("planos");
  const [planos,   setPlanos]   = useState<Plano[]>([]);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [loading,  setLoading]  = useState(true);

  const termoPaciente = labels.termoPaciente ?? "Cliente";

  const loadPlanos = useCallback(async () => {
    setLoading(true);
    try {
      const [rp, rs] = await Promise.all([
        fetchWithAuth("/api/subscriptions/planos"),
        fetchWithAuth("/api/services"),
      ]);
      const dp = await rp.json();
      const ds = await rs.json();
      setPlanos(Array.isArray(dp) ? dp : []);
      setServicos(Array.isArray(ds) ? ds : Array.isArray(ds?.services) ? ds.services : []);
    } catch {
      setPlanos([]); setServicos([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadPlanos(); }, [loadPlanos]);

  const TABS = [
    { key: "planos" as const,     label: "Planos" },
    { key: "assinantes" as const, label: `${termoPaciente}s Assinantes` },
    { key: "uso" as const,        label: "Uso do Mês" },
  ];

  return (
    <div className="max-w-5xl mx-auto pb-24">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: "#1B2B3A" }}>
            Planos & Assinaturas
          </h1>
          <p className="text-sm mt-1" style={{ color: "#4A6480" }}>
            Crie planos recorrentes para fidelizar seus {termoPaciente.toLowerCase()}s
          </p>
        </div>
      </div>

      <div className="flex gap-1 mb-6 p-1 rounded-xl w-fit" style={{ background: "#F3F4F5" }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className="px-4 py-2 text-sm font-medium rounded-lg transition-all"
            style={tab === t.key
              ? { background: "white", color: "#1B2B3A", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }
              : { color: "#8A9BB0", background: "transparent" }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "planos" && (
        <TabPlanos planos={planos} servicos={servicos} loadingPlanos={loading} nicho={nicho} onRefresh={loadPlanos} />
      )}
      {tab === "assinantes" && (
        <TabAssinantes planos={planos} termoPaciente={termoPaciente} onRefresh={loadPlanos} />
      )}
      {tab === "uso" && <TabUso planos={planos} />}
    </div>
  );
}
