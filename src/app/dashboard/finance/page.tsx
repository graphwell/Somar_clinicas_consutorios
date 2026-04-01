"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { fetchWithAuth } from "@/lib/api-utils";

/* ─── Tipos ──────────────────────────────────────────────────── */
interface Resumo {
  periodo: string; periodoKey: string;
  receitaBruta: number; despesasTotal: number; lucroLiquido: number; ticketMedio: number;
  receitaBrutaAnterior: number; variacaoReceita: number;
  receitaParticular: number; receitaConvenio: number;
  receitaPorConvenio: { nome: string; total: number; percentual: number }[];
  despesasFixas: number; despesasVariaveis: number;
  despesasPorCategoria: { categoria: string; total: number }[];
  aReceber: number; aPagar: number;
  repassesPendentes: number; repassesPagos: number;
  porProfissional: { id: string; nome: string; especialidade?: string; totalAtendimentos: number; receitaGerada: number; percentualRepasse: number; valorRepasse: number }[];
  evolucao: { mes: string; periodo: string; receita: number; despesa: number; lucro: number }[];
  porFormaPagamento: { forma: string; total: number; percentual: number }[];
}

interface Transacao {
  id: string; tipo: string; status: string; valor: number; descricao?: string;
  categoria?: string; formaPagamento?: string; numeroRecibo?: string;
  dataVencimento?: string; dataPagamento?: string; createdAt: string;
  profissional?: { id: string; nome: string } | null;
  agendamento?: { paciente?: { nome: string } | null; servico?: { nome: string } | null } | null;
}

interface Repasse {
  id: string; profissionalId: string; periodo: string;
  totalBruto: number; percentual: number; totalRepasse: number; status: string;
  profissional: { id: string; nome: string; especialidade?: string; percentualRepasse?: number };
}

type Tab = "extrato" | "receber" | "pagar" | "repasses";

/* ─── Helpers ────────────────────────────────────────────────── */
function brl(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function pct(v: number, positiveGood = true) {
  const abs = Math.abs(v).toFixed(1);
  const up = v >= 0;
  const color = up === positiveGood ? "text-emerald-400" : "text-red-400";
  const arrow = up ? "↑" : "↓";
  return <span className={`text-[11px] font-bold ${color}`}>{arrow} {abs}%</span>;
}
function periodoLabel(key: string) {
  const [ano, mes] = key.split("-").map(Number);
  return new Date(ano, mes - 1, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}
function prevPeriodo(key: string) {
  const [ano, mes] = key.split("-").map(Number);
  const d = new Date(ano, mes - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function nextPeriodo(key: string) {
  const [ano, mes] = key.split("-").map(Number);
  const d = new Date(ano, mes, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function statusBadge(status: string) {
  const map: Record<string, string> = {
    paid: "bg-emerald-500/15 text-emerald-400",
    pending: "bg-amber-500/15 text-amber-400",
    canceled: "bg-gray-500/15 text-gray-400",
    realizado: "bg-emerald-500/15 text-emerald-400",
    previsto: "bg-blue-500/15 text-blue-400",
  };
  const labels: Record<string, string> = {
    paid: "Pago", pending: "Pendente", canceled: "Cancelado",
    realizado: "Realizado", previsto: "Previsto",
  };
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${map[status] || "bg-gray-500/15 text-gray-400"}`}>
      {labels[status] || status}
    </span>
  );
}
function formaLabel(f: string) {
  const m: Record<string, string> = {
    pix: "PIX", dinheiro: "Dinheiro", cartao_debito: "Déb.", cartao_credito: "Cré.",
    convenio: "Convênio", boleto: "Boleto", outros: "Outros",
  };
  return m[f] || f;
}

/* ─── SVG: Gráfico de Evolução ───────────────────────────────── */
function GraficoEvolucao({ dados }: { dados: Resumo["evolucao"] }) {
  const W = 520; const H = 180; const PAD = { l: 56, r: 16, t: 16, b: 32 };
  const plotW = W - PAD.l - PAD.r;
  const plotH = H - PAD.t - PAD.b;
  const maxVal = Math.max(...dados.flatMap((d) => [d.receita, d.despesa]), 1);
  const steps = 4;
  const n = dados.length;
  const barW = plotW / n;

  function yPos(v: number) { return PAD.t + plotH - (v / maxVal) * plotH; }
  function xPos(i: number) { return PAD.l + i * barW + barW / 2; }

  const receitaPath = dados.map((d, i) => `${i === 0 ? "M" : "L"} ${xPos(i)} ${yPos(d.receita)}`).join(" ");
  const despesaPath = dados.map((d, i) => `${i === 0 ? "M" : "L"} ${xPos(i)} ${yPos(d.despesa)}`).join(" ");

  const yLabels = Array.from({ length: steps + 1 }, (_, i) => (maxVal / steps) * i);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 200 }}>
      {/* Grid */}
      {yLabels.map((v, i) => (
        <g key={i}>
          <line x1={PAD.l} y1={yPos(v)} x2={W - PAD.r} y2={yPos(v)} stroke="#ffffff08" strokeWidth={1} />
          <text x={PAD.l - 4} y={yPos(v) + 4} textAnchor="end" fontSize={9} fill="#64748b">
            {v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v.toFixed(0)}
          </text>
        </g>
      ))}
      {/* Área receita */}
      <defs>
        <linearGradient id="gRec" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#40916C" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#40916C" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="gDesp" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f87171" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#f87171" stopOpacity="0" />
        </linearGradient>
      </defs>
      {dados.length > 1 && (
        <>
          <path d={`${receitaPath} L ${xPos(n - 1)} ${H - PAD.b} L ${xPos(0)} ${H - PAD.b} Z`} fill="url(#gRec)" />
          <path d={`${despesaPath} L ${xPos(n - 1)} ${H - PAD.b} L ${xPos(0)} ${H - PAD.b} Z`} fill="url(#gDesp)" />
          <path d={receitaPath} fill="none" stroke="#40916C" strokeWidth={2} strokeLinejoin="round" />
          <path d={despesaPath} fill="none" stroke="#f87171" strokeWidth={2} strokeLinejoin="round" />
        </>
      )}
      {/* Pontos */}
      {dados.map((d, i) => (
        <g key={i}>
          <circle cx={xPos(i)} cy={yPos(d.receita)} r={3} fill="#40916C" />
          <circle cx={xPos(i)} cy={yPos(d.despesa)} r={3} fill="#f87171" />
          <text x={xPos(i)} y={H - PAD.b + 14} textAnchor="middle" fontSize={9} fill="#64748b">{d.mes}</text>
        </g>
      ))}
      {/* Legenda */}
      <circle cx={PAD.l} cy={H - 4} r={4} fill="#40916C" />
      <text x={PAD.l + 8} y={H} fontSize={9} fill="#94a3b8">Receita</text>
      <circle cx={PAD.l + 60} cy={H - 4} r={4} fill="#f87171" />
      <text x={PAD.l + 68} y={H} fontSize={9} fill="#94a3b8">Despesa</text>
    </svg>
  );
}

/* ─── SVG: Pizza Receitas ─────────────────────────────────────── */
function PizzaReceitas({ resumo }: { resumo: Resumo }) {
  const itens: { nome: string; total: number; color: string }[] = [
    { nome: "Particular", total: resumo.receitaParticular, color: "#40916C" },
    ...(resumo.receitaPorConvenio.map((c, i) => ({
      nome: c.nome, total: c.total,
      color: ["#52B788", "#74C69D", "#95D5B2", "#B7E4C7"][i % 4],
    }))),
  ].filter((i) => i.total > 0);

  const total = itens.reduce((s, i) => s + i.total, 0);
  if (total === 0) return <p className="text-xs text-gray-500 text-center py-8">Sem dados</p>;

  const R = 60; const cx = 80; const cy = 75;
  let angle = -Math.PI / 2;
  const sectors = itens.map((item) => {
    const frac = item.total / total;
    const startAngle = angle;
    angle += frac * 2 * Math.PI;
    const endAngle = angle;
    const x1 = cx + R * Math.cos(startAngle); const y1 = cy + R * Math.sin(startAngle);
    const x2 = cx + R * Math.cos(endAngle); const y2 = cy + R * Math.sin(endAngle);
    const large = frac > 0.5 ? 1 : 0;
    return { ...item, frac, path: `M ${cx} ${cy} L ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2} Z` };
  });

  return (
    <div className="flex items-center gap-4">
      <svg viewBox="0 0 160 150" className="shrink-0 w-32">
        {sectors.map((s, i) => <path key={i} d={s.path} fill={s.color} />)}
        <circle cx={cx} cy={cy} r={30} fill="#0a0a20" />
      </svg>
      <div className="space-y-1.5 flex-1 min-w-0">
        {sectors.map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }} />
            <span className="text-[11px] text-gray-400 truncate">{s.nome}</span>
            <span className="text-[11px] text-gray-300 ml-auto shrink-0">{(s.frac * 100).toFixed(0)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── KPI Card compacto ──────────────────────────────────────── */
function KpiCard({ label, value, variacao, color, icon }: {
  label: string; value: string; variacao?: number; color: string; icon: string;
}) {
  return (
    <div className={`shrink-0 min-w-[160px] bg-[#0a0a20]/60 border border-white/5 rounded-2xl px-4 py-3 relative overflow-hidden`}>
      <div className={`absolute top-0 left-0 right-0 h-0.5 ${color}`} />
      <div className="flex items-start justify-between gap-2 mb-1">
        <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest leading-tight">{label}</p>
        <span className="text-base">{icon}</span>
      </div>
      <p className="text-[22px] font-black text-white leading-none">{value}</p>
      {variacao !== undefined && (
        <div className="mt-1">{pct(variacao)}<span className="text-[10px] text-gray-600 ml-1">vs mês ant.</span></div>
      )}
    </div>
  );
}

/* ─── Modal Marcar Recebido/Pago ─────────────────────────────── */
function ModalPagar({
  tx, onClose, onDone,
}: { tx: Transacao | null; onClose: () => void; onDone: () => void }) {
  const [forma, setForma] = useState("pix");
  const [data, setData] = useState(new Date().toISOString().split("T")[0]);
  const [saving, setSaving] = useState(false);
  if (!tx) return null;
  const label = tx.tipo === "income" ? "Marcar como recebido" : "Marcar como pago";
  async function confirm() {
    setSaving(true);
    try {
      await fetchWithAuth(`/api/finance/transacoes/${tx!.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "paid", formaPagamento: forma, dataPagamento: data }),
      });
      onDone(); onClose();
    } catch {} finally { setSaving(false); }
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-[#111827] border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        <h3 className="font-bold text-white mb-1">{label}</h3>
        <p className="text-xs text-gray-400 mb-4 truncate">{tx.descricao}</p>
        <div className="space-y-3">
          <div>
            <label className="block text-[10px] text-gray-500 uppercase font-bold mb-1">Forma de pagamento</label>
            <select className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none" value={forma} onChange={(e) => setForma(e.target.value)}>
              {["pix", "dinheiro", "cartao_debito", "cartao_credito", "convenio", "boleto"].map((f) => (
                <option key={f} value={f}>{formaLabel(f)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] text-gray-500 uppercase font-bold mb-1">Data</label>
            <input type="date" className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none" value={data} onChange={(e) => setData(e.target.value)} />
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="flex-1 py-2.5 text-sm border border-white/10 rounded-xl text-gray-400 hover:bg-white/5 transition-colors">Cancelar</button>
          <button disabled={saving} onClick={confirm} className="flex-1 py-2.5 text-sm bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50 font-bold transition-colors">
            {saving ? "…" : "Confirmar"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Modal Registrar Transação ──────────────────────────────── */
function ModalTransacao({
  open, tipo: tipoInicial, onClose, onDone, profissionais,
}: {
  open: boolean; tipo: "income" | "expense"; onClose: () => void; onDone: () => void;
  profissionais: { id: string; nome: string }[];
}) {
  const [tipo, setTipo] = useState<"income" | "expense">(tipoInicial);
  const [valor, setValor] = useState("");
  const [descricao, setDescricao] = useState("");
  const [categoria, setCategoria] = useState("");
  const [forma, setForma] = useState("pix");
  const [profId, setProfId] = useState("");
  const [dataPgto, setDataPgto] = useState(new Date().toISOString().split("T")[0]);
  const [dataVenc, setDataVenc] = useState("");
  const [obs, setObs] = useState("");
  const [statusTx, setStatusTx] = useState<"paid" | "pending">("paid");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { if (open) { setTipo(tipoInicial); setError(""); setValor(""); setDescricao(""); } }, [open, tipoInicial]);
  if (!open) return null;

  const categoriasReceita = ["consulta", "procedimento", "convenio", "retorno", "outros"];
  const categoriasDespesa = ["aluguel", "salario", "material", "marketing", "despesa_fixa", "despesa_variavel", "outros"];

  async function handleSave() {
    if (!valor || !descricao) { setError("Valor e descrição obrigatórios"); return; }
    setSaving(true); setError("");
    try {
      const body: any = {
        tipo, valor: parseFloat(valor), descricao, categoria,
        formaPagamento: forma, profissionalId: profId || null, observacao: obs || null,
      };
      if (statusTx === "paid") body.dataPagamento = dataPgto;
      else body.dataVencimento = dataVenc || null;
      const r = await fetchWithAuth("/api/finance/transacoes", { method: "POST", body: JSON.stringify(body) });
      const data = await r.json();
      if (!r.ok) { setError(data.error || "Erro ao salvar"); return; }
      onDone(); onClose();
    } catch { setError("Erro ao salvar"); } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div className="bg-[#0f1623] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-white/5">
          <div className="flex gap-2">
            {(["income", "expense"] as const).map((t) => (
              <button key={t} onClick={() => setTipo(t)}
                className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${tipo === t ? (t === "income" ? "bg-emerald-600 text-white" : "bg-red-600 text-white") : "text-gray-500 hover:text-gray-300"}`}>
                {t === "income" ? "💰 Receita" : "💸 Despesa"}
              </button>
            ))}
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 text-xl leading-none">✕</button>
        </div>
        <div className="p-5 space-y-4">
          {error && <p className="text-xs text-red-400 bg-red-500/10 px-3 py-2 rounded-lg">{error}</p>}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] text-gray-500 uppercase font-bold mb-1">Valor (R$) *</label>
              <input type="number" step="0.01" className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500" placeholder="0,00" value={valor} onChange={(e) => setValor(e.target.value)} autoFocus />
            </div>
            <div>
              <label className="block text-[10px] text-gray-500 uppercase font-bold mb-1">Forma de Pagamento</label>
              <select className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none" value={forma} onChange={(e) => setForma(e.target.value)}>
                {["pix", "dinheiro", "cartao_debito", "cartao_credito", "convenio", "boleto"].map((f) => (
                  <option key={f} value={f}>{formaLabel(f)}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-[10px] text-gray-500 uppercase font-bold mb-1">Descrição *</label>
            <input className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500" placeholder="Ex: Consulta Dr. Carlos" value={descricao} onChange={(e) => setDescricao(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] text-gray-500 uppercase font-bold mb-1">Categoria</label>
              <select className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none" value={categoria} onChange={(e) => setCategoria(e.target.value)}>
                <option value="">Selecionar…</option>
                {(tipo === "income" ? categoriasReceita : categoriasDespesa).map((c) => (
                  <option key={c} value={c}>{c.replace(/_/g, " ")}</option>
                ))}
              </select>
            </div>
            {tipo === "income" && profissionais.length > 0 && (
              <div>
                <label className="block text-[10px] text-gray-500 uppercase font-bold mb-1">Profissional</label>
                <select className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none" value={profId} onChange={(e) => setProfId(e.target.value)}>
                  <option value="">Nenhum</option>
                  {profissionais.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
                </select>
              </div>
            )}
          </div>
          {tipo === "expense" && (
            <div>
              <label className="block text-[10px] text-gray-500 uppercase font-bold mb-2">Status</label>
              <div className="flex gap-2">
                {(["paid", "pending"] as const).map((s) => (
                  <button key={s} onClick={() => setStatusTx(s)}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${statusTx === s ? "bg-white/10 text-white border-white/20" : "text-gray-500 border-white/5 hover:border-white/10"}`}>
                    {s === "paid" ? "Pago agora" : "Registrar pendente"}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            {(tipo === "income" || statusTx === "paid") && (
              <div>
                <label className="block text-[10px] text-gray-500 uppercase font-bold mb-1">Data do pagamento</label>
                <input type="date" className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none" value={dataPgto} onChange={(e) => setDataPgto(e.target.value)} />
              </div>
            )}
            {tipo === "expense" && statusTx === "pending" && (
              <div>
                <label className="block text-[10px] text-gray-500 uppercase font-bold mb-1">Data de vencimento</label>
                <input type="date" className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none" value={dataVenc} onChange={(e) => setDataVenc(e.target.value)} />
              </div>
            )}
          </div>
          <div>
            <label className="block text-[10px] text-gray-500 uppercase font-bold mb-1">Observação</label>
            <textarea rows={2} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none resize-none" value={obs} onChange={(e) => setObs(e.target.value)} />
          </div>
        </div>
        <div className="flex gap-2 p-5 pt-0">
          <button onClick={onClose} className="flex-1 py-3 text-sm border border-white/10 rounded-xl text-gray-400 hover:bg-white/5 transition-colors">Cancelar</button>
          <button disabled={saving} onClick={handleSave}
            className={`flex-1 py-3 text-sm font-bold rounded-xl text-white transition-colors disabled:opacity-50 ${tipo === "income" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"}`}>
            {saving ? "Salvando…" : "Confirmar"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Menu dropdown ⋯ ────────────────────────────────────────── */
function TxMenu({ tx, onPagar, onCancelar, onRecibo }: {
  tx: Transacao; onPagar: () => void; onCancelar: () => void; onRecibo: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function h(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    if (open) document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((v) => !v)} className="w-7 h-7 flex items-center justify-center text-gray-500 hover:text-gray-300 rounded-lg hover:bg-white/5 transition-colors text-sm">⋯</button>
      {open && (
        <div className="absolute right-0 top-8 z-20 bg-[#1a2035] border border-white/10 rounded-xl shadow-xl py-1 min-w-[140px]">
          {tx.status === "pending" && (
            <button onClick={() => { setOpen(false); onPagar(); }} className="w-full text-left px-3 py-2 text-xs text-gray-300 hover:bg-white/5">✓ Marcar como pago</button>
          )}
          {tx.status === "paid" && tx.numeroRecibo && (
            <button onClick={() => { setOpen(false); onRecibo(); }} className="w-full text-left px-3 py-2 text-xs text-gray-300 hover:bg-white/5">🖨 Imprimir recibo</button>
          )}
          {tx.status !== "canceled" && (
            <button onClick={() => { setOpen(false); onCancelar(); }} className="w-full text-left px-3 py-2 text-xs text-red-400 hover:bg-white/5">✕ Cancelar</button>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Item de transação ──────────────────────────────────────── */
function TxItem({ tx, onRefresh }: { tx: Transacao; onRefresh: () => void }) {
  const [modalPagar, setModalPagar] = useState(false);
  const isReceita = tx.tipo === "income";

  async function cancelar() {
    await fetchWithAuth(`/api/finance/transacoes/${tx.id}`, { method: "DELETE" });
    onRefresh();
  }
  function abrirRecibo() {
    window.open(`/api/finance/recibo/${tx.id}`, "_blank");
  }

  return (
    <>
      <div className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors border-b border-white/[0.03] last:border-0">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0 ${isReceita ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"}`}>
          {isReceita ? "↑" : "↓"}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-medium text-gray-200 truncate">{tx.descricao || "—"}</p>
            {statusBadge(tx.status)}
          </div>
          <p className="text-[11px] text-gray-500 mt-0.5 flex flex-wrap items-center gap-1.5">
            {tx.agendamento?.paciente && <span>{tx.agendamento.paciente.nome}</span>}
            {tx.profissional && <><span>•</span><span>{tx.profissional.nome}</span></>}
            <span>•</span>
            <span>{new Date(tx.createdAt).toLocaleDateString("pt-BR")}</span>
            {tx.formaPagamento && <><span>•</span><span>{formaLabel(tx.formaPagamento)}</span></>}
          </p>
        </div>
        <div className="text-right shrink-0 flex items-center gap-2">
          <div>
            <p className={`text-sm font-bold tabular-nums ${isReceita ? "text-emerald-400" : "text-red-400"}`}>
              {isReceita ? "+" : "-"}{brl(tx.valor)}
            </p>
            {tx.numeroRecibo && <p className="text-[10px] text-gray-600">{tx.numeroRecibo}</p>}
          </div>
          {tx.status === "pending" && (
            <button onClick={() => setModalPagar(true)} className="hidden sm:block px-2 py-1 text-[10px] font-bold border border-emerald-500/30 text-emerald-400 rounded-lg hover:bg-emerald-500/10 transition-colors whitespace-nowrap">
              ✓ {isReceita ? "Receber" : "Pagar"}
            </button>
          )}
          <TxMenu tx={tx} onPagar={() => setModalPagar(true)} onCancelar={cancelar} onRecibo={abrirRecibo} />
        </div>
      </div>
      <ModalPagar tx={modalPagar ? tx : null} onClose={() => setModalPagar(false)} onDone={onRefresh} />
    </>
  );
}

/* ─── Tab Extrato ─────────────────────────────────────────────── */
function TabExtrato({ periodo, onRefresh: parentRefresh }: { periodo: string; onRefresh: () => void }) {
  const [txs, setTxs] = useState<Transacao[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [q, setQ] = useState("");

  const [ano, mes] = periodo.split("-").map(Number);
  const dataInicio = `${ano}-${String(mes).padStart(2, "0")}-01`;
  const lastDay = new Date(ano, mes, 0).getDate();
  const dataFim = `${ano}-${String(mes).padStart(2, "0")}-${lastDay}`;

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), dataInicio, dataFim });
    if (filtroTipo !== "todos") params.set("tipo", filtroTipo);
    if (q) params.set("q", q);
    fetchWithAuth(`/api/finance/transacoes?${params}`)
      .then((r) => r.json())
      .then((d) => { setTxs(d.transacoes || []); setTotal(d.total || 0); setPages(d.pages || 1); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page, filtroTipo, q, dataInicio, dataFim]);

  useEffect(() => { load(); }, [load]);

  function refresh() { load(); parentRefresh(); }

  return (
    <div className="space-y-3">
      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        <div className="flex gap-1 bg-white/5 border border-white/5 rounded-xl p-0.5">
          {["todos", "income", "expense"].map((t) => (
            <button key={t} onClick={() => { setFiltroTipo(t); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${filtroTipo === t ? "bg-white/10 text-white" : "text-gray-500 hover:text-gray-300"}`}>
              {t === "todos" ? "Todos" : t === "income" ? "Receitas" : "Despesas"}
            </button>
          ))}
        </div>
        <div className="flex-1 min-w-[160px] relative">
          <input className="w-full bg-white/5 border border-white/5 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-white/20 placeholder-gray-600"
            placeholder="Buscar descrição…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
        </div>
        <p className="text-[11px] text-gray-600 self-center">{total} transações</p>
      </div>
      {/* Lista */}
      <div className="bg-[#0a0a20]/60 border border-white/5 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="py-12 text-center"><div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" /></div>
        ) : txs.length === 0 ? (
          <div className="py-12 text-center text-gray-600 text-xs">Nenhuma transação encontrada</div>
        ) : (
          txs.map((tx) => <TxItem key={tx.id} tx={tx} onRefresh={refresh} />)
        )}
      </div>
      {/* Paginação */}
      {pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="px-3 py-1.5 text-xs border border-white/10 rounded-lg text-gray-400 disabled:opacity-30 hover:bg-white/5">← Ant</button>
          <span className="text-xs text-gray-500">{page} / {pages}</span>
          <button disabled={page === pages} onClick={() => setPage((p) => p + 1)} className="px-3 py-1.5 text-xs border border-white/10 rounded-lg text-gray-400 disabled:opacity-30 hover:bg-white/5">Próx →</button>
        </div>
      )}
    </div>
  );
}

/* ─── Tab A Receber / A Pagar ─────────────────────────────────── */
function TabPendentes({ tipo, periodo, onRefresh: parentRefresh }: { tipo: "income" | "expense"; periodo: string; onRefresh: () => void }) {
  const [txs, setTxs] = useState<Transacao[]>([]);
  const [loading, setLoading] = useState(true);
  const label = tipo === "income" ? "receber" : "pagar";

  const [ano, mes] = periodo.split("-").map(Number);
  const dataInicio = `${ano}-${String(mes).padStart(2, "0")}-01`;
  const dataFim = `${ano}-${String(mes).padStart(2, "0")}-${new Date(ano, mes, 0).getDate()}`;

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ tipo, status: "pending", dataInicio, dataFim });
    fetchWithAuth(`/api/finance/transacoes?${params}`)
      .then((r) => r.json())
      .then((d) => setTxs(d.transacoes || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [tipo, dataInicio, dataFim]);

  useEffect(() => { load(); }, [load]);
  function refresh() { load(); parentRefresh(); }

  const totalPendente = txs.reduce((s, t) => s + t.valor, 0);
  const vencidas = txs.filter((t) => t.dataVencimento && new Date(t.dataVencimento) < new Date());

  return (
    <div className="space-y-3">
      {vencidas.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3 flex items-center gap-3">
          <span className="text-lg">⚠️</span>
          <div>
            <p className="text-xs font-bold text-amber-400">{vencidas.length} {vencidas.length === 1 ? "cobrança vencida" : "cobranças vencidas"} — {brl(vencidas.reduce((s, t) => s + t.valor, 0))}</p>
          </div>
        </div>
      )}
      <div className="bg-[#0a0a20]/60 border border-white/5 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="py-12 text-center"><div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" /></div>
        ) : txs.length === 0 ? (
          <div className="py-12 text-center text-gray-600 text-xs">Nada a {label} neste período</div>
        ) : (
          txs.map((tx) => <TxItem key={tx.id} tx={tx} onRefresh={refresh} />)
        )}
      </div>
      {txs.length > 0 && (
        <div className="flex justify-between items-center px-1">
          <span className="text-xs text-gray-500">{txs.length} item(s)</span>
          <span className="text-sm font-bold text-white">Total a {label}: <span className={tipo === "income" ? "text-emerald-400" : "text-red-400"}>{brl(totalPendente)}</span></span>
        </div>
      )}
    </div>
  );
}

/* ─── Tab Repasses ────────────────────────────────────────────── */
function TabRepasses({ periodo, onRefresh: parentRefresh }: { periodo: string; onRefresh: () => void }) {
  const [repasses, setRepasses] = useState<Repasse[]>([]);
  const [loading, setLoading] = useState(true);
  const [calculando, setCalculando] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    fetchWithAuth(`/api/finance/repasses?periodo=${periodo}`)
      .then((r) => r.json())
      .then((d) => setRepasses(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [periodo]);

  useEffect(() => { load(); }, [load]);

  async function calcular() {
    setCalculando(true);
    try {
      await fetchWithAuth("/api/finance/repasses/calcular", { method: "POST", body: JSON.stringify({ periodo }) });
      load(); parentRefresh();
    } catch {} finally { setCalculando(false); }
  }

  async function marcarPago(id: string) {
    await fetchWithAuth(`/api/finance/repasses/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "pago", pago_em: new Date().toISOString() }),
    }).catch(() => {});
    load();
  }

  const total = repasses.reduce((s, r) => s + r.totalRepasse, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500">Repasses calculados com base nos atendimentos concluídos</p>
        <button disabled={calculando} onClick={calcular}
          className="px-4 py-2 text-xs font-bold bg-white/5 border border-white/10 rounded-xl text-gray-300 hover:bg-white/10 disabled:opacity-50 transition-colors">
          {calculando ? "Calculando…" : "🔄 Calcular repasses do mês"}
        </button>
      </div>
      <div className="bg-[#0a0a20]/60 border border-white/5 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="py-12 text-center"><div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" /></div>
        ) : repasses.length === 0 ? (
          <div className="py-12 text-center text-gray-600 text-xs">
            <p>Nenhum repasse calculado para este período.</p>
            <p className="mt-1">Clique em "Calcular repasses do mês" para gerar.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead><tr className="border-b border-white/5">
              <th className="text-left px-4 py-3 text-[10px] text-gray-500 uppercase font-bold">Profissional</th>
              <th className="text-right px-4 py-3 text-[10px] text-gray-500 uppercase font-bold hidden sm:table-cell">Receita</th>
              <th className="text-right px-4 py-3 text-[10px] text-gray-500 uppercase font-bold hidden sm:table-cell">%</th>
              <th className="text-right px-4 py-3 text-[10px] text-gray-500 uppercase font-bold">Repasse</th>
              <th className="text-center px-4 py-3 text-[10px] text-gray-500 uppercase font-bold">Status</th>
              <th className="w-10" />
            </tr></thead>
            <tbody>
              {repasses.map((r) => (
                <tr key={r.id} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-200 text-sm">{r.profissional.nome}</p>
                    {r.profissional.especialidade && <p className="text-[11px] text-gray-500">{r.profissional.especialidade}</p>}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-400 tabular-nums hidden sm:table-cell">{brl(r.totalBruto)}</td>
                  <td className="px-4 py-3 text-right text-gray-500 tabular-nums hidden sm:table-cell">{r.percentual.toFixed(0)}%</td>
                  <td className="px-4 py-3 text-right font-bold text-emerald-400 tabular-nums">{brl(r.totalRepasse)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${r.status === "pago" ? "bg-emerald-500/15 text-emerald-400" : "bg-amber-500/15 text-amber-400"}`}>
                      {r.status === "pago" ? "Pago" : "Pendente"}
                    </span>
                  </td>
                  <td className="px-2 py-3">
                    {r.status === "pendente" && (
                      <button onClick={() => marcarPago(r.id)} className="text-[10px] text-emerald-400 hover:text-emerald-300 font-bold whitespace-nowrap">Pagar</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {repasses.length > 0 && (
        <div className="flex justify-end">
          <span className="text-sm font-bold text-white">Total repasses: <span className="text-emerald-400">{brl(total)}</span></span>
        </div>
      )}
    </div>
  );
}

/* ─── Página principal ────────────────────────────────────────── */
export default function FinancePage() {
  const hoje = new Date();
  const [periodo, setPeriodo] = useState(`${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`);
  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [loadingResumo, setLoadingResumo] = useState(true);
  const [tab, setTab] = useState<Tab>("extrato");
  const [profissionais, setProfissionais] = useState<{ id: string; nome: string }[]>([]);
  const [modalTipo, setModalTipo] = useState<"income" | "expense" | null>(null);

  const loadResumo = useCallback(() => {
    setLoadingResumo(true);
    fetchWithAuth(`/api/finance/resumo?periodo=${periodo}`)
      .then((r) => r.json())
      .then((d) => setResumo(d.error ? null : d))
      .catch(() => {})
      .finally(() => setLoadingResumo(false));
  }, [periodo]);

  useEffect(() => { loadResumo(); }, [loadResumo]);

  useEffect(() => {
    fetchWithAuth("/api/team").then((r) => r.json()).then((d) => setProfissionais(Array.isArray(d) ? d : [])).catch(() => {});
  }, []);

  // Exportar CSV
  function exportarCSV() {
    if (!resumo) return;
    const [ano, mes] = periodo.split("-").map(Number);
    const dataInicio = `${ano}-${String(mes).padStart(2, "0")}-01`;
    const dataFim = `${ano}-${String(mes).padStart(2, "0")}-${new Date(ano, mes, 0).getDate()}`;
    window.location.href = `/api/finance/transacoes?dataInicio=${dataInicio}&dataFim=${dataFim}&limit=1000`;
  }

  const periodoMaximo = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;

  return (
    <div className="max-w-6xl mx-auto space-y-5 pb-16 animate-in fade-in duration-300">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-white">Financeiro</h2>
          <p className="text-gray-500 text-sm mt-0.5">Gestão financeira da clínica</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          {/* Seletor período */}
          <div className="flex items-center gap-1 bg-white/5 border border-white/5 rounded-xl px-2 py-1.5">
            <button onClick={() => setPeriodo(prevPeriodo(periodo))} className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-white/5">←</button>
            <span className="text-sm font-medium text-white px-2 min-w-[140px] text-center capitalize">{periodoLabel(periodo)}</span>
            <button disabled={periodo >= periodoMaximo} onClick={() => setPeriodo(nextPeriodo(periodo))} className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-white disabled:opacity-30 transition-colors rounded-lg hover:bg-white/5">→</button>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setModalTipo("income")} className="flex-1 sm:flex-none px-3 py-2 min-h-[44px] text-xs font-bold bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors">+ Receita</button>
            <button onClick={() => setModalTipo("expense")} className="flex-1 sm:flex-none px-3 py-2 min-h-[44px] text-xs font-bold bg-red-600/80 text-white rounded-xl hover:bg-red-700 transition-colors">+ Despesa</button>
            <button onClick={exportarCSV} className="px-3 py-2 min-h-[44px] text-xs border border-white/10 text-gray-400 rounded-xl hover:bg-white/5 transition-colors">↓</button>
          </div>
        </div>
      </div>

      {/* KPI Cards — scroll horizontal no mobile */}
      <div className="flex gap-3 overflow-x-auto pb-1 -mx-4 sm:mx-0 px-4 sm:px-0 snap-x">
        {loadingResumo ? (
          [1, 2, 3, 4].map((i) => <div key={i} className="shrink-0 min-w-[160px] h-20 bg-white/5 animate-pulse rounded-2xl snap-start" />)
        ) : resumo ? (
          <>
            <KpiCard label="Receita Bruta" value={brl(resumo.receitaBruta)} variacao={resumo.variacaoReceita} color="bg-emerald-500" icon="💰" />
            <KpiCard label="Despesas" value={brl(resumo.despesasTotal)} color="bg-red-500" icon="📉" />
            <KpiCard label="Lucro Líquido" value={brl(resumo.lucroLiquido)} color={resumo.lucroLiquido >= 0 ? "bg-emerald-500" : "bg-red-500"} icon={resumo.lucroLiquido >= 0 ? "✅" : "⚠️"} />
            <KpiCard label="Ticket Médio" value={brl(resumo.ticketMedio)} color="bg-amber-500" icon="🎫" />
          </>
        ) : null}
      </div>

      {/* Gráfico + Pizza */}
      {resumo && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-[#0a0a20]/60 border border-white/5 rounded-2xl p-5">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Evolução 6 meses</h3>
            <GraficoEvolucao dados={resumo.evolucao} />
          </div>
          <div className="bg-[#0a0a20]/60 border border-white/5 rounded-2xl p-5 hidden lg:block">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Receitas por origem</h3>
            <PizzaReceitas resumo={resumo} />
            <div className="mt-4 pt-4 border-t border-white/5 space-y-1">
              <div className="flex justify-between text-xs"><span className="text-gray-500">A receber</span><span className="text-amber-400 font-bold">{brl(resumo.aReceber)}</span></div>
              <div className="flex justify-between text-xs"><span className="text-gray-500">A pagar</span><span className="text-red-400 font-bold">{brl(resumo.aPagar)}</span></div>
              <div className="flex justify-between text-xs"><span className="text-gray-500">Repasses pendentes</span><span className="text-gray-300 font-bold">{brl(resumo.repassesPendentes)}</span></div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-white/5 overflow-x-auto">
        <div className="flex gap-0 min-w-max">
          {([
            { key: "extrato", label: "Extrato" },
            { key: "receber", label: `A Receber${resumo && resumo.aReceber > 0 ? ` · ${brl(resumo.aReceber)}` : ""}` },
            { key: "pagar", label: `A Pagar${resumo && resumo.aPagar > 0 ? ` · ${brl(resumo.aPagar)}` : ""}` },
            { key: "repasses", label: "Repasses" },
          ] as { key: Tab; label: string }[]).map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-4 py-3 text-xs font-bold uppercase tracking-wider transition-all relative whitespace-nowrap ${tab === t.key ? "text-white" : "text-gray-500 hover:text-gray-300"}`}>
              {t.label}
              {tab === t.key && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500 rounded-t-full" />}
            </button>
          ))}
        </div>
      </div>

      {/* Conteúdo da tab */}
      {tab === "extrato" && <TabExtrato periodo={periodo} onRefresh={loadResumo} />}
      {tab === "receber" && <TabPendentes tipo="income" periodo={periodo} onRefresh={loadResumo} />}
      {tab === "pagar" && <TabPendentes tipo="expense" periodo={periodo} onRefresh={loadResumo} />}
      {tab === "repasses" && <TabRepasses periodo={periodo} onRefresh={loadResumo} />}

      {/* Modal transação */}
      <ModalTransacao
        open={modalTipo !== null}
        tipo={modalTipo || "income"}
        onClose={() => setModalTipo(null)}
        onDone={loadResumo}
        profissionais={profissionais}
      />
    </div>
  );
}
