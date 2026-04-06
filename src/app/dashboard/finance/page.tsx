"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { fetchWithAuth } from "@/lib/api-utils";
import { useNicho } from "@/context/NichoContext";

const NICHOS_BELEZA = ['SALAO_BELEZA', 'BARBEARIA', 'CLINICA_ESTETICA'];

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
  const good = up === positiveGood;
  return (
    <span style={{ fontSize: 11, fontWeight: 600, color: good ? '#40916C' : '#E24B4A' }}>
      {up ? '↑' : '↓'} {abs}%
    </span>
  );
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
  const styles: Record<string, { bg: string; color: string }> = {
    paid:      { bg: '#D8F3DC', color: '#2D6A4F' },
    pending:   { bg: '#FAEEDA', color: '#BA7517' },
    canceled:  { bg: '#EEE9DF', color: '#8A9BB0' },
    realizado: { bg: '#D8F3DC', color: '#2D6A4F' },
    previsto:  { bg: '#DBE9FA', color: '#1A5EA8' },
  };
  const labelMap: Record<string, string> = {
    paid: 'Pago', pending: 'Pendente', canceled: 'Cancelado',
    realizado: 'Realizado', previsto: 'Previsto',
  };
  const s = styles[status] || { bg: '#EEE9DF', color: '#8A9BB0' };
  return (
    <span style={{ fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 20, background: s.bg, color: s.color, textTransform: 'uppercase' as const, letterSpacing: '0.4px', flexShrink: 0 }}>
      {labelMap[status] || status}
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
      {yLabels.map((v, i) => (
        <g key={i}>
          <line x1={PAD.l} y1={yPos(v)} x2={W - PAD.r} y2={yPos(v)} stroke="#EEE9DF" strokeWidth={1} />
          <text x={PAD.l - 4} y={yPos(v) + 4} textAnchor="end" fontSize={9} fill="#8A9BB0">
            {v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v.toFixed(0)}
          </text>
        </g>
      ))}
      <defs>
        <linearGradient id="gRec" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#40916C" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#40916C" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="gDesp" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#E24B4A" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#E24B4A" stopOpacity="0" />
        </linearGradient>
      </defs>
      {dados.length > 1 && (
        <>
          <path d={`${receitaPath} L ${xPos(n - 1)} ${H - PAD.b} L ${xPos(0)} ${H - PAD.b} Z`} fill="url(#gRec)" />
          <path d={`${despesaPath} L ${xPos(n - 1)} ${H - PAD.b} L ${xPos(0)} ${H - PAD.b} Z`} fill="url(#gDesp)" />
          <path d={receitaPath} fill="none" stroke="#40916C" strokeWidth={2} strokeLinejoin="round" />
          <path d={despesaPath} fill="none" stroke="#E24B4A" strokeWidth={2} strokeLinejoin="round" />
        </>
      )}
      {dados.map((d, i) => (
        <g key={i}>
          <circle cx={xPos(i)} cy={yPos(d.receita)} r={3} fill="#40916C" />
          <circle cx={xPos(i)} cy={yPos(d.despesa)} r={3} fill="#E24B4A" />
          <text x={xPos(i)} y={H - PAD.b + 14} textAnchor="middle" fontSize={9} fill="#8A9BB0">{d.mes}</text>
        </g>
      ))}
    </svg>
  );
}

/* ─── SVG: Pizza Receitas ─────────────────────────────────────── */
function PizzaReceitas({ resumo }: { resumo: Resumo }) {
  const itens: { nome: string; total: number; color: string }[] = [
    { nome: "Particular", total: resumo.receitaParticular, color: "#40916C" },
    ...(resumo.receitaPorConvenio?.map((c, i) => ({
      nome: c?.nome, total: c?.total,
      color: ["#C4973A", "#378ADD", "#9B72CF", "#52B788"][i % 4],
    })) || []),
  ].filter((i) => i.total > 0);

  const total = itens.reduce((s, i) => s + i.total, 0);
  if (total === 0) return <p style={{ fontSize: 12, color: '#8A9BB0', textAlign: 'center', padding: '32px 0' }}>Sem dados</p>;

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
    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <svg viewBox="0 0 160 150" style={{ flexShrink: 0, width: 120 }}>
        {sectors.map((s, i) => <path key={i} d={s.path} fill={s.color} />)}
        <circle cx={cx} cy={cy} r={30} fill="white" />
      </svg>
      <div style={{ flex: 1, minWidth: 0 }}>
        {sectors.map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: s.color }} />
            <span style={{ fontSize: 11, color: '#4A6480', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{s.nome}</span>
            <span style={{ fontSize: 11, color: '#1B2B3A', fontWeight: 500, flexShrink: 0 }}>{(s.frac * 100).toFixed(0)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── KPI Card ───────────────────────────────────────────────── */
function KpiCard({ label, value, variacao, color }: {
  label: string; value: string; variacao?: number; color: string;
}) {
  return (
    <div style={{ flexShrink: 0, minWidth: 160, background: 'white', border: '1px solid #EEE9DF', borderRadius: 16, padding: '16px 20px', position: 'relative', overflow: 'hidden' }}
      className="snap-start">
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: color, borderRadius: '3px 3px 0 0' }} />
      <p style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 500, color: '#8A9BB0', marginTop: 4, marginBottom: 8 }}>
        {label}
      </p>
      <p style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 500, color: '#1B2B3A', lineHeight: 1 }}>
        {value}
      </p>
      {variacao !== undefined && (
        <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
          {pct(variacao)}
          <span style={{ fontSize: 10, color: '#8A9BB0' }}>vs mês ant.</span>
        </div>
      )}
    </div>
  );
}

/* ─── Modal Marcar Recebido/Pago ─────────────────────────────── */
function ModalPagar({ tx, onClose, onDone }: { tx: Transacao | null; onClose: () => void; onDone: () => void }) {
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
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(0,0,0,0.45)' }}>
      <div style={{ background: 'white', border: '1px solid #EEE9DF', borderRadius: 20, padding: 24, width: '100%', maxWidth: 380, boxShadow: '0 20px 60px rgba(0,0,0,0.12)' }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, color: '#1B2B3A', marginBottom: 4 }}>{label}</h3>
        <p style={{ fontSize: 12, color: '#8A9BB0', marginBottom: 20 }}>{tx.descricao}</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ display: 'block', fontSize: 10, color: '#8A9BB0', textTransform: 'uppercase', fontWeight: 700, marginBottom: 6 }}>Forma de pagamento</label>
            <select style={{ width: '100%', border: '1px solid #EEE9DF', borderRadius: 10, padding: '10px 12px', fontSize: 13, color: '#1B2B3A', background: 'white', outline: 'none' }}
              value={forma} onChange={(e) => setForma(e.target.value)}>
              {["pix", "dinheiro", "cartao_debito", "cartao_credito", "convenio", "boleto"].map((f) => (
                <option key={f} value={f}>{formaLabel(f)}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 10, color: '#8A9BB0', textTransform: 'uppercase', fontWeight: 700, marginBottom: 6 }}>Data</label>
            <input type="date" style={{ width: '100%', border: '1px solid #EEE9DF', borderRadius: 10, padding: '10px 12px', fontSize: 13, color: '#1B2B3A', background: 'white', outline: 'none' }}
              value={data} onChange={(e) => setData(e.target.value)} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '10px 0', fontSize: 13, border: '1px solid #EEE9DF', borderRadius: 10, color: '#8A9BB0', background: 'white', cursor: 'pointer' }}>
            Cancelar
          </button>
          <button disabled={saving} onClick={confirm} style={{ flex: 1, padding: '10px 0', fontSize: 13, fontWeight: 600, background: '#40916C', color: 'white', border: 'none', borderRadius: 10, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
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

  const inputStyle: React.CSSProperties = {
    width: '100%', border: '1px solid #EEE9DF', borderRadius: 10,
    padding: '10px 12px', fontSize: 13, color: '#1B2B3A',
    background: 'white', outline: 'none', boxSizing: 'border-box',
  };
  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: 10, color: '#8A9BB0',
    textTransform: 'uppercase', fontWeight: 700, marginBottom: 6,
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(0,0,0,0.5)' }}>
      <div style={{ background: 'white', border: '1px solid #EEE9DF', borderRadius: 20, width: '100%', maxWidth: 500, boxShadow: '0 20px 60px rgba(0,0,0,0.12)', maxHeight: '90vh', overflowY: 'auto' }}>
        {/* Header do modal */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 20px 16px', borderBottom: '1px solid #EEE9DF' }}>
          <div style={{ display: 'flex', gap: 8 }}>
            {(["income", "expense"] as const).map((t) => (
              <button key={t} onClick={() => setTipo(t)} style={{
                padding: '6px 16px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none',
                background: tipo === t ? (t === "income" ? '#40916C' : '#E24B4A') : '#F8F6F1',
                color: tipo === t ? 'white' : '#8A9BB0',
              }}>
                {t === "income" ? "Receita" : "Despesa"}
              </button>
            ))}
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #EEE9DF', borderRadius: 8, background: 'white', cursor: 'pointer', color: '#8A9BB0' }}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M9 3L3 9M3 3l6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
          </button>
        </div>

        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {error && (
            <p style={{ fontSize: 12, color: '#E24B4A', background: '#FCEBEB', padding: '10px 14px', borderRadius: 8 }}>{error}</p>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Valor (R$) *</label>
              <input type="number" step="0.01" style={inputStyle} placeholder="0,00" value={valor} onChange={(e) => setValor(e.target.value)} autoFocus />
            </div>
            <div>
              <label style={labelStyle}>Forma de Pagamento</label>
              <select style={inputStyle} value={forma} onChange={(e) => setForma(e.target.value)}>
                {["pix", "dinheiro", "cartao_debito", "cartao_credito", "convenio", "boleto"].map((f) => (
                  <option key={f} value={f}>{formaLabel(f)}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label style={labelStyle}>Descrição *</label>
            <input style={inputStyle} placeholder="Ex: Consulta Dr. Carlos" value={descricao} onChange={(e) => setDescricao(e.target.value)} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Categoria</label>
              <select style={inputStyle} value={categoria} onChange={(e) => setCategoria(e.target.value)}>
                <option value="">Selecionar…</option>
                {(tipo === "income" ? categoriasReceita : categoriasDespesa).map((c) => (
                  <option key={c} value={c}>{c.replace(/_/g, " ")}</option>
                ))}
              </select>
            </div>
            {tipo === "income" && profissionais.length > 0 && (
              <div>
                <label style={labelStyle}>Profissional</label>
                <select style={inputStyle} value={profId} onChange={(e) => setProfId(e.target.value)}>
                  <option value="">Nenhum</option>
                  {profissionais?.map((p) => <option key={p?.id} value={p?.id}>{p?.nome}</option>)}
                </select>
              </div>
            )}
          </div>
          {tipo === "expense" && (
            <div>
              <label style={labelStyle}>Status</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {(["paid", "pending"] as const).map((s) => (
                  <button key={s} onClick={() => setStatusTx(s)} style={{
                    flex: 1, padding: '10px 0', borderRadius: 10, fontSize: 12, fontWeight: 500, cursor: 'pointer',
                    border: '1px solid ' + (statusTx === s ? '#40916C' : '#EEE9DF'),
                    background: statusTx === s ? '#F0FAF4' : 'white',
                    color: statusTx === s ? '#40916C' : '#8A9BB0',
                  }}>
                    {s === "paid" ? "Pago agora" : "Registrar pendente"}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {(tipo === "income" || statusTx === "paid") && (
              <div>
                <label style={labelStyle}>Data do pagamento</label>
                <input type="date" style={inputStyle} value={dataPgto} onChange={(e) => setDataPgto(e.target.value)} />
              </div>
            )}
            {tipo === "expense" && statusTx === "pending" && (
              <div>
                <label style={labelStyle}>Data de vencimento</label>
                <input type="date" style={inputStyle} value={dataVenc} onChange={(e) => setDataVenc(e.target.value)} />
              </div>
            )}
          </div>
          <div>
            <label style={labelStyle}>Observação</label>
            <textarea rows={2} style={{ ...inputStyle, resize: 'none' }} value={obs} onChange={(e) => setObs(e.target.value)} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, padding: '0 20px 20px' }}>
          <button onClick={onClose} style={{ flex: 1, padding: '12px 0', fontSize: 13, border: '1px solid #EEE9DF', borderRadius: 10, color: '#8A9BB0', background: 'white', cursor: 'pointer' }}>
            Cancelar
          </button>
          <button disabled={saving} onClick={handleSave} style={{
            flex: 1, padding: '12px 0', fontSize: 13, fontWeight: 600, border: 'none', borderRadius: 10,
            background: tipo === "income" ? '#40916C' : '#E24B4A',
            color: 'white', cursor: 'pointer', opacity: saving ? 0.6 : 1,
          }}>
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
    <div style={{ position: 'relative' }} ref={ref}>
      <button onClick={() => setOpen((v) => !v)} style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #EEE9DF', borderRadius: 6, background: 'white', cursor: 'pointer', color: '#8A9BB0', fontSize: 14 }}>⋯</button>
      {open && (
        <div style={{ position: 'absolute', right: 0, top: 34, zIndex: 20, background: 'white', border: '1px solid #EEE9DF', borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.1)', minWidth: 150, overflow: 'hidden' }}>
          {tx.status === "pending" && (
            <button onClick={() => { setOpen(false); onPagar(); }} style={{ width: '100%', textAlign: 'left', padding: '10px 14px', fontSize: 12, color: '#1B2B3A', background: 'white', border: 'none', cursor: 'pointer' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#F8F6F1')}
              onMouseLeave={e => (e.currentTarget.style.background = 'white')}>
              Marcar como pago
            </button>
          )}
          {tx.status === "paid" && tx.numeroRecibo && (
            <button onClick={() => { setOpen(false); onRecibo(); }} style={{ width: '100%', textAlign: 'left', padding: '10px 14px', fontSize: 12, color: '#1B2B3A', background: 'white', border: 'none', cursor: 'pointer' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#F8F6F1')}
              onMouseLeave={e => (e.currentTarget.style.background = 'white')}>
              Imprimir recibo
            </button>
          )}
          {tx.status !== "canceled" && (
            <button onClick={() => { setOpen(false); onCancelar(); }} style={{ width: '100%', textAlign: 'left', padding: '10px 14px', fontSize: 12, color: '#E24B4A', background: 'white', border: 'none', cursor: 'pointer' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#F8F6F1')}
              onMouseLeave={e => (e.currentTarget.style.background = 'white')}>
              Cancelar
            </button>
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
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px', borderBottom: '1px solid #EEE9DF', background: 'white', transition: 'background 150ms' }}
        className="last:border-0"
        onMouseEnter={e => (e.currentTarget.style.background = '#F8F6F1')}
        onMouseLeave={e => (e.currentTarget.style.background = 'white')}>

        {/* Ícone direcional */}
        <div style={{ width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: isReceita ? '#F0FAF4' : '#FCEBEB' }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d={isReceita ? 'M7 11V3M3 7l4-4 4 4' : 'M7 3v8M11 7l-4 4-4-4'}
              stroke={isReceita ? '#40916C' : '#E24B4A'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        {/* Descrição */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <p style={{ fontSize: 13, fontWeight: 500, color: '#1B2B3A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {tx.descricao || "—"}
            </p>
            {statusBadge(tx.status)}
          </div>
          <p style={{ fontSize: 11, color: '#8A9BB0', marginTop: 2 }}>
            {tx.agendamento?.paciente && <span>{tx.agendamento.paciente?.nome} · </span>}
            {tx.profissional && <span>{tx.profissional?.nome} · </span>}
            <span>{new Date(tx.createdAt).toLocaleDateString("pt-BR")}</span>
            {tx.formaPagamento && <span> · {formaLabel(tx.formaPagamento)}</span>}
          </p>
        </div>

        {/* Valor e ações */}
        <div style={{ textAlign: 'right', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          <div>
            <p style={{ fontSize: 14, fontWeight: 600, color: isReceita ? '#40916C' : '#E24B4A' }}>
              {isReceita ? "+" : "-"}{brl(tx.valor)}
            </p>
            {tx.numeroRecibo && <p style={{ fontSize: 10, color: '#8A9BB0' }}>{tx.numeroRecibo}</p>}
          </div>
          {tx.status === "pending" && (
            <button onClick={() => setModalPagar(true)} style={{ padding: '4px 10px', fontSize: 11, fontWeight: 500, border: '1px solid #40916C', color: '#40916C', borderRadius: 6, background: 'transparent', cursor: 'pointer' }}
              className="hidden sm:block">
              {isReceita ? "Receber" : "Pagar"}
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Filtros */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', gap: 2, background: '#F8F6F1', border: '1px solid #EEE9DF', borderRadius: 10, padding: 3 }}>
          {["todos", "income", "expense"].map((t) => (
            <button key={t} onClick={() => { setFiltroTipo(t); setPage(1); }} style={{
              padding: '6px 12px', borderRadius: 7, fontSize: 11, fontWeight: 600, cursor: 'pointer', border: 'none',
              background: filtroTipo === t ? 'white' : 'transparent',
              color: filtroTipo === t ? '#1B2B3A' : '#8A9BB0',
              boxShadow: filtroTipo === t ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
            }}>
              {t === "todos" ? "Todos" : t === "income" ? "Receitas" : "Despesas"}
            </button>
          ))}
        </div>
        <input style={{ flex: 1, minWidth: 160, border: '1px solid #EEE9DF', borderRadius: 10, padding: '8px 12px', fontSize: 12, color: '#1B2B3A', background: 'white', outline: 'none' }}
          placeholder="Buscar descrição…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
        <span style={{ fontSize: 11, color: '#8A9BB0', alignSelf: 'center' }}>{total} transações</span>
      </div>

      {/* Lista */}
      <div style={{ background: 'white', border: '1px solid #EEE9DF', borderRadius: 16, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '48px 0', textAlign: 'center' }}>
            <div style={{ width: 20, height: 20, border: '2px solid #40916C', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto' }} />
          </div>
        ) : txs.length === 0 ? (
          <div style={{ padding: '48px 0', textAlign: 'center', fontSize: 12, color: '#8A9BB0' }}>Nenhuma transação encontrada</div>
        ) : (
          txs.map((tx) => <TxItem key={tx.id} tx={tx} onRefresh={refresh} />)
        )}
      </div>

      {/* Paginação */}
      {pages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} style={{ padding: '6px 12px', fontSize: 12, border: '1px solid #EEE9DF', borderRadius: 8, color: '#4A6480', background: 'white', cursor: 'pointer', opacity: page === 1 ? 0.4 : 1 }}>← Ant</button>
          <span style={{ fontSize: 12, color: '#8A9BB0' }}>{page} / {pages}</span>
          <button disabled={page === pages} onClick={() => setPage((p) => p + 1)} style={{ padding: '6px 12px', fontSize: 12, border: '1px solid #EEE9DF', borderRadius: 8, color: '#4A6480', background: 'white', cursor: 'pointer', opacity: page === pages ? 0.4 : 1 }}>Próx →</button>
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {vencidas.length > 0 && (
        <div style={{ background: '#FAEEDA', border: '1px solid #F4C97A', borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
            <path d="M8 1.333L14.667 13.333H1.333L8 1.333z" stroke="#BA7517" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M8 6v3M8 11h.008" stroke="#BA7517" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <p style={{ fontSize: 12, fontWeight: 600, color: '#BA7517' }}>
            {vencidas.length} {vencidas.length === 1 ? "cobrança vencida" : "cobranças vencidas"} — {brl(vencidas.reduce((s, t) => s + t.valor, 0))}
          </p>
        </div>
      )}

      <div style={{ background: 'white', border: '1px solid #EEE9DF', borderRadius: 16, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '48px 0', textAlign: 'center' }}>
            <div style={{ width: 20, height: 20, border: '2px solid #40916C', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto' }} />
          </div>
        ) : txs.length === 0 ? (
          <div style={{ padding: '48px 0', textAlign: 'center', fontSize: 12, color: '#8A9BB0' }}>Nada a {label} neste período</div>
        ) : (
          txs.map((tx) => <TxItem key={tx.id} tx={tx} onRefresh={refresh} />)
        )}
      </div>

      {txs.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 4px' }}>
          <span style={{ fontSize: 12, color: '#8A9BB0' }}>{txs.length} item(s)</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#1B2B3A' }}>
            Total a {label}:{' '}
            <span style={{ color: tipo === "income" ? '#40916C' : '#E24B4A' }}>{brl(totalPendente)}</span>
          </span>
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <p style={{ fontSize: 12, color: '#8A9BB0' }}>Repasses calculados com base nos atendimentos concluídos</p>
        <button disabled={calculando} onClick={calcular} style={{ padding: '8px 16px', fontSize: 12, fontWeight: 500, border: '1px solid #EEE9DF', borderRadius: 10, color: '#4A6480', background: 'white', cursor: 'pointer', opacity: calculando ? 0.6 : 1 }}>
          {calculando ? "Calculando…" : "Calcular repasses do mês"}
        </button>
      </div>

      <div style={{ background: 'white', border: '1px solid #EEE9DF', borderRadius: 16, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '48px 0', textAlign: 'center' }}>
            <div style={{ width: 20, height: 20, border: '2px solid #40916C', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto' }} />
          </div>
        ) : repasses.length === 0 ? (
          <div style={{ padding: '48px 0', textAlign: 'center', fontSize: 12, color: '#8A9BB0' }}>
            <p>Nenhum repasse calculado para este período.</p>
            <p style={{ marginTop: 4 }}>Clique em "Calcular repasses do mês" para gerar.</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #EEE9DF' }}>
                <th style={{ textAlign: 'left', padding: '12px 20px', fontSize: 10, color: '#8A9BB0', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.08em' }}>Profissional</th>
                <th style={{ textAlign: 'right', padding: '12px 20px', fontSize: 10, color: '#8A9BB0', textTransform: 'uppercase', fontWeight: 700 }} className="hidden sm:table-cell">Receita</th>
                <th style={{ textAlign: 'right', padding: '12px 20px', fontSize: 10, color: '#8A9BB0', textTransform: 'uppercase', fontWeight: 700 }} className="hidden sm:table-cell">%</th>
                <th style={{ textAlign: 'right', padding: '12px 20px', fontSize: 10, color: '#8A9BB0', textTransform: 'uppercase', fontWeight: 700 }}>Repasse</th>
                <th style={{ textAlign: 'center', padding: '12px 20px', fontSize: 10, color: '#8A9BB0', textTransform: 'uppercase', fontWeight: 700 }}>Status</th>
                <th style={{ width: 40 }} />
              </tr>
            </thead>
            <tbody>
              {repasses.map((r) => (
                <tr key={r.id} style={{ borderBottom: '1px solid #F8F6F1' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#F8F6F1')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'white')}>
                  <td style={{ padding: '12px 20px' }}>
                    <p style={{ fontSize: 13, fontWeight: 500, color: '#1B2B3A' }}>{r?.profissional?.nome}</p>
                    {r.profissional.especialidade && <p style={{ fontSize: 11, color: '#8A9BB0' }}>{r.profissional.especialidade}</p>}
                  </td>
                  <td style={{ padding: '12px 20px', textAlign: 'right', fontSize: 13, color: '#4A6480' }} className="hidden sm:table-cell">{brl(r.totalBruto)}</td>
                  <td style={{ padding: '12px 20px', textAlign: 'right', fontSize: 13, color: '#8A9BB0' }} className="hidden sm:table-cell">{r.percentual.toFixed(0)}%</td>
                  <td style={{ padding: '12px 20px', textAlign: 'right', fontSize: 13, fontWeight: 600, color: '#40916C' }}>{brl(r.totalRepasse)}</td>
                  <td style={{ padding: '12px 20px', textAlign: 'center' }}>
                    <span style={{ fontSize: 10, fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: r.status === "pago" ? '#D8F3DC' : '#FAEEDA', color: r.status === "pago" ? '#2D6A4F' : '#BA7517', textTransform: 'uppercase' as const }}>
                      {r.status === "pago" ? "Pago" : "Pendente"}
                    </span>
                  </td>
                  <td style={{ padding: '8px 12px' }}>
                    {r.status === "pendente" && (
                      <button onClick={() => marcarPago(r.id)} style={{ fontSize: 11, fontWeight: 500, color: '#40916C', background: 'none', border: 'none', cursor: 'pointer' }}>Pagar</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {repasses.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#1B2B3A' }}>
            Total repasses: <span style={{ color: '#40916C' }}>{brl(total)}</span>
          </span>
        </div>
      )}
    </div>
  );
}

/* ─── Página principal ────────────────────────────────────────── */
export default function FinancePage() {
  const { nicho } = useNicho();
  const isBeleza = NICHOS_BELEZA.includes(nicho);

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

  function exportarCSV() {
    if (!resumo) return;
    const [ano, mes] = periodo.split("-").map(Number);
    const dataInicio = `${ano}-${String(mes).padStart(2, "0")}-01`;
    const dataFim = `${ano}-${String(mes).padStart(2, "0")}-${new Date(ano, mes, 0).getDate()}`;
    window.location.href = `/api/finance/transacoes?dataInicio=${dataInicio}&dataFim=${dataFim}&limit=1000`;
  }

  const periodoMaximo = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;

  const tabs: { key: Tab; label: string }[] = [
    { key: "extrato", label: "Extrato" },
    { key: "receber", label: `A Receber${resumo && resumo.aReceber > 0 ? ` · ${brl(resumo.aReceber)}` : ""}` },
    { key: "pagar", label: `A Pagar${resumo && resumo.aPagar > 0 ? ` · ${brl(resumo.aPagar)}` : ""}` },
    { key: "repasses", label: "Repasses" },
  ];

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', paddingBottom: 64 }} className="space-y-5 animate-in fade-in duration-300">

      {/* Header */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }} className="sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 500, color: '#1B2B3A' }}>Financeiro</h2>
          <p style={{ fontSize: 13, color: '#8A9BB0', marginTop: 2 }}>
            {isBeleza ? 'Gestão financeira do seu negócio' : 'Gestão financeira da clínica'}
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }} className="sm:flex-row sm:items-center">
          {/* Navegador de período */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 0, background: 'white', border: '1px solid #EEE9DF', borderRadius: 10 }}>
            <button onClick={() => setPeriodo(prevPeriodo(periodo))} style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', color: '#8A9BB0', cursor: 'pointer', fontSize: 14 }}>←</button>
            <span style={{ fontSize: 13, fontWeight: 500, color: '#1B2B3A', minWidth: 140, textAlign: 'center', textTransform: 'capitalize' }}>{periodoLabel(periodo)}</span>
            <button disabled={periodo >= periodoMaximo} onClick={() => setPeriodo(nextPeriodo(periodo))} style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', color: '#8A9BB0', cursor: 'pointer', fontSize: 14, opacity: periodo >= periodoMaximo ? 0.3 : 1 }}>→</button>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            {/* + Receita */}
            <button onClick={() => setModalTipo("income")} style={{ height: 36, padding: '0 16px', background: '#40916C', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1v10M1 6h10" stroke="white" strokeWidth="1.5" strokeLinecap="round" /></svg>
              <span className="hidden sm:inline">Receita</span>
              <span className="sm:hidden">+R</span>
            </button>
            {/* + Despesa */}
            <button onClick={() => setModalTipo("expense")} style={{ height: 36, padding: '0 16px', background: 'transparent', color: '#E24B4A', border: '1.5px solid #E24B4A', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1v10M1 6h10" stroke="#E24B4A" strokeWidth="1.5" strokeLinecap="round" /></svg>
              <span className="hidden sm:inline">Despesa</span>
              <span className="sm:hidden">+D</span>
            </button>
            {/* Export */}
            <button onClick={exportarCSV} style={{ height: 36, padding: '0 12px', fontSize: 13, border: '1px solid #EEE9DF', color: '#8A9BB0', borderRadius: 8, background: 'white', cursor: 'pointer' }}>↓</button>
          </div>
        </div>
      </div>

      {/* KPI Cards — scroll horizontal no mobile */}
      <div className="flex gap-3 overflow-x-auto pb-1 -mx-4 sm:mx-0 px-4 sm:px-0 snap-x">
        {loadingResumo ? (
          [1, 2, 3, 4].map((i) => (
            <div key={i} style={{ flexShrink: 0, minWidth: 160, height: 80, background: 'white', border: '1px solid #EEE9DF', borderRadius: 16 }} className="animate-pulse snap-start" />
          ))
        ) : resumo ? (
          <>
            <KpiCard label="Receita Bruta" value={brl(resumo.receitaBruta)} variacao={resumo.variacaoReceita} color="#40916C" />
            <KpiCard label="Despesas" value={brl(resumo.despesasTotal)} color="#E24B4A" />
            <KpiCard label="Lucro Líquido" value={brl(resumo.lucroLiquido)} color={resumo.lucroLiquido >= 0 ? "#40916C" : "#E24B4A"} />
            <KpiCard label="Ticket Médio" value={brl(resumo.ticketMedio)} color="#C4973A" />
          </>
        ) : null}
      </div>

      {/* Gráfico + Pizza */}
      {resumo && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Gráfico evolução */}
          <div style={{ background: 'white', border: '1px solid #EEE9DF', borderRadius: 16, padding: 20 }} className="lg:col-span-2">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 500, color: '#1B2B3A' }}>Evolução 6 meses</h3>
              <div style={{ display: 'flex', gap: 14 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#4A6480' }}>
                  <span style={{ width: 12, height: 2, background: '#40916C', borderRadius: 1, display: 'inline-block' }} />Receita
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#4A6480' }}>
                  <span style={{ width: 12, height: 2, background: '#E24B4A', borderRadius: 1, display: 'inline-block' }} />Despesa
                </span>
              </div>
            </div>
            <GraficoEvolucao dados={resumo.evolucao} />
          </div>

          {/* Pizza receitas */}
          <div style={{ background: 'white', border: '1px solid #EEE9DF', borderRadius: 16, padding: 20 }} className="hidden lg:block">
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 500, color: '#1B2B3A', marginBottom: 16 }}>Receitas por origem</h3>
            <PizzaReceitas resumo={resumo} />
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #EEE9DF', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span style={{ color: '#8A9BB0' }}>A receber</span>
                <span style={{ color: '#C4973A', fontWeight: 600 }}>{brl(resumo.aReceber)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span style={{ color: '#8A9BB0' }}>A pagar</span>
                <span style={{ color: '#E24B4A', fontWeight: 600 }}>{brl(resumo.aPagar)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span style={{ color: '#8A9BB0' }}>Repasses pendentes</span>
                <span style={{ color: '#1B2B3A', fontWeight: 600 }}>{brl(resumo.repassesPendentes)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ borderBottom: '1px solid #EEE9DF', overflowX: 'auto' }}>
        <div style={{ display: 'flex', gap: 0, minWidth: 'max-content' }}>
          {tabs.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              padding: '12px 16px', fontSize: 12, fontWeight: tab === t.key ? 600 : 400,
              color: tab === t.key ? '#40916C' : '#8A9BB0',
              borderBottom: `2px solid ${tab === t.key ? '#40916C' : 'transparent'}`,
              background: 'transparent', border: 'none',
              borderBottom: `2px solid ${tab === t.key ? '#40916C' : 'transparent'}`,
              cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 150ms',
            } as React.CSSProperties}>
              {t.label}
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
