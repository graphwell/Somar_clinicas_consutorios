"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { fetchWithAuth } from "@/lib/api-utils";

/* ─── Tipos ──────────────────────────────────────────── */
interface Categoria { id: string; nome: string }
interface Produto {
  id: string; nome: string; tipo: string; unidade: string;
  estoque: number; estoqueMinimo: number; custoUnitario: number;
  preco: number; status: string; imageUrl?: string | null;
  fabricante?: string; dataValidade?: string | null;
  alertas?: { estoqueMinimo: boolean; vencendoEm7: boolean; vencido: boolean };
  categoria?: { nome: string } | null;
}
interface Servico { id: string; nome: string }
interface FichaTecnica {
  id: string; servicoId: string; produtoId: string;
  quantidadeEst: number; unidade: string;
  produto: { id: string; nome: string; unidade: string; estoque: number; custoUnitario: number; imageUrl?: string | null };
}
interface Alerta {
  tipo: string; severidade: "critico" | "atencao" | "info";
  produtoId: string; produtoNome: string; mensagem: string; diasRestantes?: number;
}
interface Previsao {
  produtoId: string; nome: string; unidade: string;
  estoque: number; estoqueMinimo: number;
  consumoNosPeriodo: number; consumoDiario: number;
  diasRestantes: number | null; dataRupturaPrevista: string | null;
  alertas: string[];
}
interface CustoServico {
  servicoId: string; servicoNome: string; precoServico: number;
  custoInsumos: number; margemPct: number | null; itens: number;
}

/* ─── Helpers ─────────────────────────────────────────── */
const UNIDADES = ["un", "ml", "g", "l", "kg", "cx", "par"];
const TIPOS = [
  { value: "insumo", label: "Insumo interno" },
  { value: "venda", label: "Produto para venda" },
  { value: "ambos", label: "Insumo + Venda" },
];

function fmt(v: number) { return "R$ " + v.toFixed(2).replace(".", ","); }
function fmtQtd(v: number, u: string) { return `${v % 1 === 0 ? v : v.toFixed(1)} ${u}`; }

function BadgeAlerta({ severidade }: { severidade: string }) {
  const map: Record<string, { bg: string; text: string; label: string }> = {
    critico: { bg: "#fee2e2", text: "#dc2626", label: "Crítico" },
    atencao: { bg: "#fef3c7", text: "#d97706", label: "Atenção" },
    info:    { bg: "#e0f2fe", text: "#0369a1", label: "Info" },
  };
  const s = map[severidade] || map.info;
  return (
    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: s.bg, color: s.text }}>
      {s.label}
    </span>
  );
}

function ProdutoImg({ url, nome, size = 40 }: { url?: string | null; nome: string; size?: number }) {
  if (url) return <img src={url} alt={nome} style={{ width: size, height: size, objectFit: "cover", borderRadius: 10, flexShrink: 0 }} />;
  return (
    <div style={{ width: size, height: size, borderRadius: 10, background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <svg width={size * 0.45} height={size * 0.45} viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M20 7H4a1 1 0 00-1 1v10a1 1 0 001 1h16a1 1 0 001-1V8a1 1 0 00-1-1z"/>
        <polyline points="21 15 16 10 5 21" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </div>
  );
}

/* ─── Modal Produto/Insumo ────────────────────────────── */
function ModalProduto({ produto, categorias, onClose, onSave }: {
  produto: Partial<Produto> | null; categorias: Categoria[];
  onClose: () => void; onSave: () => void;
}) {
  const [form, setForm] = useState({
    nome: produto?.nome || "",
    tipo: produto?.tipo || "insumo",
    unidade: produto?.unidade || "un",
    estoque: produto?.estoque?.toString() || "0",
    estoqueMinimo: produto?.estoqueMinimo?.toString() || "0",
    custoUnitario: produto?.custoUnitario?.toString() || "0",
    preco: produto?.preco?.toString() || "0",
    fabricante: produto?.fabricante || "",
    status: produto?.status || "active",
    dataValidade: produto?.dataValidade ? produto.dataValidade.split("T")[0] : "",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  // Modo entrada de estoque (para produto existente)
  const [modoEntrada, setModoEntrada] = useState(false);
  const [entradaQtd, setEntradaQtd] = useState("");
  const [entradaObs, setEntradaObs] = useState("");

  const handleSave = async () => {
    if (!form.nome.trim()) { setErr("Nome obrigatório"); return; }
    setSaving(true); setErr("");
    try {
      const payload: any = {
        nome: form.nome.trim(),
        tipo: form.tipo,
        unidade: form.unidade,
        estoqueMinimo: parseFloat(form.estoqueMinimo) || 0,
        custoUnitario: parseFloat(form.custoUnitario) || 0,
        preco: parseFloat(form.preco) || 0,
        fabricante: form.fabricante || null,
        status: form.status,
        dataValidade: form.dataValidade || null,
      };

      // Entrada de estoque (modo add)
      if (modoEntrada && produto?.id) {
        const res = await fetchWithAuth(`/api/insumos/produtos/${produto.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ entradaEstoque: parseFloat(entradaQtd) || 0, observacao: entradaObs }),
        });
        if (!res.ok) { const d = await res.json(); setErr(d.error || "Erro"); return; }
      } else if (produto?.id) {
        const res = await fetchWithAuth(`/api/insumos/produtos/${produto.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) { const d = await res.json(); setErr(d.error || "Erro"); return; }
      } else {
        payload.estoque = parseFloat(form.estoque) || 0;
        const res = await fetchWithAuth("/api/insumos/produtos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) { const d = await res.json(); setErr(d.error || "Erro"); return; }
      }
      onSave();
    } catch { setErr("Erro de conexão"); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-slate-900/40 backdrop-blur-sm p-0 md:p-4">
      <div className="bg-white w-full h-[92vh] md:h-auto md:max-h-[90vh] md:max-w-lg md:rounded-2xl rounded-t-2xl flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <h3 className="text-[15px] font-semibold text-slate-800">
              {produto?.id ? (modoEntrada ? "Entrada de Estoque" : "Editar Produto") : "Novo Produto / Insumo"}
            </h3>
            {produto?.id && (
              <div className="flex gap-2 mt-1.5">
                <button onClick={() => setModoEntrada(false)} className={`text-[11px] px-3 py-1 rounded-full border transition-colors ${!modoEntrada ? "border-slate-700 text-slate-700 bg-slate-50" : "border-slate-200 text-slate-400"}`}>Editar dados</button>
                <button onClick={() => setModoEntrada(true)} className={`text-[11px] px-3 py-1 rounded-full border transition-colors ${modoEntrada ? "border-emerald-600 text-emerald-700 bg-emerald-50" : "border-slate-200 text-slate-400"}`}>+ Entrada de estoque</button>
              </div>
            )}
          </div>
          <button onClick={onClose} className="flex items-center gap-1.5 text-[12px] font-medium text-slate-400 hover:text-slate-600 transition-colors px-2 py-1 rounded-lg hover:bg-slate-100">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
            Fechar
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {modoEntrada && produto?.id ? (
            <>
              <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100 text-center">
                <p className="text-[12px] text-emerald-600 font-medium">Estoque atual</p>
                <p className="text-2xl font-bold text-emerald-700 mt-1">{fmtQtd(produto.estoque || 0, produto.unidade || "un")}</p>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-slate-500">Quantidade a adicionar ({produto.unidade || "un"})</label>
                <input type="number" min="0" step="0.1" value={entradaQtd} onChange={e => setEntradaQtd(e.target.value)}
                  className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-slate-50 text-lg font-bold outline-none focus:border-emerald-400" placeholder="0" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-slate-500">Observação (opcional)</label>
                <input value={entradaObs} onChange={e => setEntradaObs(e.target.value)}
                  className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-slate-50 text-sm outline-none focus:border-emerald-400" placeholder="Ex: NF #1234, compra de fornecedor..." />
              </div>
            </>
          ) : (
            <>
              {/* Nome */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-slate-500">Nome *</label>
                <input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                  className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-slate-50 text-sm font-medium outline-none focus:border-slate-400" placeholder="Ex: Pomada Fox Black" />
              </div>
              {/* Tipo + Unidade */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium text-slate-500">Tipo</label>
                  <select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}
                    className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-slate-50 text-sm outline-none">
                    {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium text-slate-500">Unidade</label>
                  <select value={form.unidade} onChange={e => setForm(f => ({ ...f, unidade: e.target.value }))}
                    className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-slate-50 text-sm outline-none">
                    {UNIDADES.map(u => <option key={u}>{u}</option>)}
                  </select>
                </div>
              </div>
              {/* Estoque + Mínimo */}
              <div className="grid grid-cols-2 gap-3">
                {!produto?.id && (
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-medium text-slate-500">Estoque inicial</label>
                    <input type="number" min="0" step="0.1" value={form.estoque} onChange={e => setForm(f => ({ ...f, estoque: e.target.value }))}
                      className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-slate-50 text-sm font-bold outline-none focus:border-slate-400" />
                  </div>
                )}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium text-slate-500">Estoque mínimo</label>
                  <input type="number" min="0" step="0.1" value={form.estoqueMinimo} onChange={e => setForm(f => ({ ...f, estoqueMinimo: e.target.value }))}
                    className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-slate-50 text-sm font-bold outline-none focus:border-slate-400" />
                </div>
              </div>
              {/* Custo + Preço */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium text-slate-500">Custo unitário (R$)</label>
                  <input type="number" min="0" step="0.01" value={form.custoUnitario} onChange={e => setForm(f => ({ ...f, custoUnitario: e.target.value }))}
                    className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-slate-50 text-sm font-bold outline-none focus:border-slate-400" />
                </div>
                {form.tipo !== "insumo" && (
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-medium text-slate-500">Preço de venda (R$)</label>
                    <input type="number" min="0" step="0.01" value={form.preco} onChange={e => setForm(f => ({ ...f, preco: e.target.value }))}
                      className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-slate-50 text-sm font-bold outline-none focus:border-slate-400" />
                  </div>
                )}
              </div>
              {/* Fabricante + Validade */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium text-slate-500">Fabricante</label>
                  <input value={form.fabricante} onChange={e => setForm(f => ({ ...f, fabricante: e.target.value }))}
                    className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-slate-50 text-sm outline-none" placeholder="Ex: Fox, Wella..." />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium text-slate-500">Validade</label>
                  <input type="date" value={form.dataValidade} onChange={e => setForm(f => ({ ...f, dataValidade: e.target.value }))}
                    className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-slate-50 text-sm outline-none" />
                </div>
              </div>
              {/* Status */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-slate-500">Status</label>
                <div className="flex gap-2">
                  {["active", "inactive"].map(s => (
                    <button key={s} onClick={() => setForm(f => ({ ...f, status: s }))}
                      className={`flex-1 h-10 rounded-xl text-[12px] font-medium border transition-colors ${form.status === s ? "border-slate-700 bg-slate-800 text-white" : "border-slate-200 bg-slate-50 text-slate-500"}`}>
                      {s === "active" ? "Ativo" : "Inativo"}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
          {err && <p className="text-[11px] text-red-500 bg-red-50 p-3 rounded-xl">{err}</p>}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 flex gap-3">
          <button onClick={onClose} className="flex-1 h-11 rounded-xl bg-slate-100 text-[12px] font-medium text-slate-500">Cancelar</button>
          <button onClick={handleSave} disabled={saving}
            className="flex-2 flex-1 h-11 rounded-xl text-[12px] font-medium text-white disabled:opacity-50 transition-all"
            style={{ background: "#40916C" }}>
            {saving ? "Salvando..." : modoEntrada ? "Confirmar entrada" : produto?.id ? "Salvar" : "Criar"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Tab Estoque ─────────────────────────────────────── */
function TabEstoque({ categorias }: { categorias: Categoria[] }) {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroTipo, setFiltroTipo] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("active");
  const [editando, setEditando] = useState<Partial<Produto> | null | false>(false);
  const [toast, setToast] = useState("");
  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(""), 2500); };

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      if (filtroTipo) p.set("tipo", filtroTipo);
      if (filtroStatus) p.set("status", filtroStatus);
      const res = await fetchWithAuth(`/api/insumos/produtos?${p}`);
      const data = await res.json();
      setProdutos(Array.isArray(data) ? data : []);
    } finally { setLoading(false); }
  }, [filtroTipo, filtroStatus]);

  useEffect(() => { carregar(); }, [carregar]);

  const tipoLabel = (t: string) => ({ insumo: "Insumo", venda: "Venda", ambos: "Insumo+Venda" }[t] || t);
  const tipoColor = (t: string) => ({
    insumo: { bg: "#f0f9ff", text: "#0369a1" },
    venda: { bg: "#f0fdf4", text: "#166534" },
    ambos: { bg: "#fef3c7", text: "#92400e" },
  }[t] || { bg: "#f1f5f9", text: "#64748b" });

  // Indicador de estoque
  const estoqueBar = (p: Produto) => {
    if (p.alertas?.vencido) return { cor: "#dc2626", pct: 100, label: "Vencido" };
    if (p.alertas?.estoqueMinimo) return { cor: "#d97706", pct: Math.min(100, (p.estoque / Math.max(1, p.estoqueMinimo)) * 100), label: "Baixo" };
    return { cor: "#40916C", pct: 100, label: "OK" };
  };

  return (
    <div className="space-y-4">
      {/* Filtros + ações */}
      <div className="flex flex-col gap-3">
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}
            className="shrink-0 h-9 px-3 rounded-xl border border-slate-200 text-[12px] text-slate-700 bg-white outline-none">
            <option value="">Todos os tipos</option>
            {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}
            className="shrink-0 h-9 px-3 rounded-xl border border-slate-200 text-[12px] text-slate-700 bg-white outline-none">
            <option value="">Todos</option>
            <option value="active">Ativos</option>
            <option value="inactive">Inativos</option>
          </select>
        </div>
        <button onClick={() => setEditando({})}
          className="flex items-center justify-center gap-2 h-9 px-4 rounded-xl text-[12px] font-medium text-white self-start"
          style={{ background: "#40916C" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" d="M12 4v16M4 12h16"/></svg>
          Novo produto / insumo
        </button>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex justify-center py-16"><div className="w-7 h-7 border-2 border-slate-200 border-t-slate-500 rounded-full animate-spin" /></div>
      ) : produtos.length === 0 ? (
        <div className="text-center py-20 text-slate-400 text-[13px]">Nenhum produto encontrado.</div>
      ) : (
        <div className="grid grid-cols-1 gap-2">
          {produtos.map(p => {
            const bar = estoqueBar(p);
            const tc = tipoColor(p.tipo);
            return (
              <div key={p.id} onClick={() => setEditando(p)}
                className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-slate-100 hover:border-slate-300 hover:shadow-sm transition-all cursor-pointer group">
                <ProdutoImg url={p.imageUrl} nome={p.nome} size={48} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-[13px] font-semibold text-slate-800 truncate">{p.nome}</p>
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ background: tc.bg, color: tc.text }}>{tipoLabel(p.tipo)}</span>
                    {p.alertas?.vencido && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-600">Vencido</span>}
                    {p.alertas?.estoqueMinimo && !p.alertas.vencido && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-600">Baixo</span>}
                  </div>
                  <div className="flex items-center gap-3 mt-1.5">
                    {/* Mini barra de estoque */}
                    <div className="flex items-center gap-1.5">
                      <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${bar.pct}%`, background: bar.cor }} />
                      </div>
                      <span className="text-[11px] text-slate-500 font-medium">{fmtQtd(p.estoque, p.unidade)}</span>
                    </div>
                    {p.custoUnitario > 0 && (
                      <span className="text-[11px] text-slate-400">custo {fmt(p.custoUnitario)}/{p.unidade}</span>
                    )}
                    {p.fabricante && (
                      <span className="text-[11px] text-slate-400 hidden md:inline">{p.fabricante}</span>
                    )}
                  </div>
                </div>
                <svg className="text-slate-300 group-hover:text-slate-500 transition-colors shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6"/></svg>
              </div>
            );
          })}
        </div>
      )}

      {editando !== false && (
        <ModalProduto produto={editando} categorias={categorias} onClose={() => setEditando(false)}
          onSave={() => { carregar(); setEditando(false); showToast("Produto salvo!"); }} />
      )}
      {toast && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] bg-slate-800 text-white text-[12px] font-medium px-5 py-2.5 rounded-full shadow-xl">{toast}</div>}
    </div>
  );
}

/* ─── Tab Fichas Técnicas ─────────────────────────────── */
function TabFichas() {
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [fichas, setFichas] = useState<FichaTecnica[]>([]);
  const [loading, setLoading] = useState(true);
  const [servicoSel, setServicoSel] = useState("");
  const [toast, setToast] = useState("");
  const [qtds, setQtds] = useState<Record<string, string>>({});
  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(""), 2500); };

  useEffect(() => {
    Promise.all([
      fetchWithAuth("/api/services").then(r => r.json()),
      fetchWithAuth("/api/insumos/produtos?tipo=insumo&status=active").then(r => r.json()),
      fetchWithAuth("/api/insumos/ficha-tecnica").then(r => r.json()),
    ]).then(([s, p, f]) => {
      setServicos(Array.isArray(s) ? s : []);
      setProdutos(Array.isArray(p) ? p : []);
      setFichas(Array.isArray(f) ? f : []);
    }).finally(() => setLoading(false));
  }, []);

  const fichasDoServico = fichas.filter(f => f.servicoId === servicoSel);
  const produtosVinculados = new Set(fichasDoServico.map(f => f.produtoId));

  const recarregarFichas = async () => {
    const res = await fetchWithAuth("/api/insumos/ficha-tecnica");
    const data = await res.json();
    setFichas(Array.isArray(data) ? data : []);
  };

  const toggleVinculo = async (produtoId: string) => {
    const fichaExistente = fichasDoServico.find(f => f.produtoId === produtoId);
    if (fichaExistente) {
      await fetchWithAuth(`/api/insumos/ficha-tecnica?id=${fichaExistente.id}`, { method: "DELETE" });
      showToast("Insumo removido da ficha");
    } else {
      const produto = produtos.find(p => p.id === produtoId);
      const qtdStr = qtds[produtoId] || "1";
      await fetchWithAuth("/api/insumos/ficha-tecnica", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ servicoId: servicoSel, produtoId, quantidadeEst: parseFloat(qtdStr) || 1, unidade: produto?.unidade || "un" }),
      });
      showToast("Insumo vinculado!");
    }
    await recarregarFichas();
  };

  const custoTotal = fichasDoServico.reduce((acc, f) => acc + f.quantidadeEst * f.produto.custoUnitario, 0);
  const servicoAtual = servicos.find(s => s.id === servicoSel);

  if (loading) return <div className="flex justify-center py-16"><div className="w-7 h-7 border-2 border-slate-200 border-t-slate-500 rounded-full animate-spin" /></div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-5">
      {/* Painel esquerdo — serviços */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden h-fit">
        <div className="px-4 py-3 border-b border-slate-100">
          <p className="text-[11px] font-medium text-slate-400">Serviços</p>
        </div>
        {servicos.map(s => {
          const qtdFichas = fichas.filter(f => f.servicoId === s.id).length;
          const active = servicoSel === s.id;
          return (
            <button key={s.id} onClick={() => setServicoSel(s.id)}
              style={active ? { background: "#f0faf5", borderLeft: "3px solid #40916C" } : { borderLeft: "3px solid transparent" }}
              className="w-full flex items-center justify-between px-4 py-3.5 text-left border-b border-slate-50 hover:bg-slate-50 transition-all">
              <span className={`text-[13px] truncate ${active ? "font-semibold text-slate-800" : "font-medium text-slate-500"}`}>{s.nome}</span>
              {qtdFichas > 0 && (
                <span className="shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full ml-2"
                  style={active ? { background: "#40916C", color: "white" } : { background: "#f1f5f9", color: "#64748b" }}>
                  {qtdFichas}
                </span>
              )}
            </button>
          );
        })}
        {servicos.length === 0 && <p className="text-[12px] text-slate-400 py-8 text-center">Nenhum serviço cadastrado.</p>}
      </div>

      {/* Painel direito — produtos para vincular */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
        {!servicoSel ? (
          <div className="flex flex-col items-center justify-center h-64 text-center px-8">
            <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center mb-3 border border-slate-100">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="1.5"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="2"/><path d="M9 12h6M9 16h4"/></svg>
            </div>
            <p className="text-[13px] text-slate-400">Selecione um serviço para configurar sua ficha técnica de insumos.</p>
          </div>
        ) : (
          <div className="p-5">
            {/* Header */}
            <div className="flex items-start justify-between mb-5 pb-4 border-b border-slate-100">
              <div>
                <h4 className="text-[15px] font-semibold text-slate-800">{servicoAtual?.nome}</h4>
                <p className="text-[12px] text-slate-400 mt-0.5">Defina quanto de cada insumo é consumido por atendimento</p>
              </div>
              {fichasDoServico.length > 0 && (
                <div className="text-right shrink-0 ml-4">
                  <p className="text-[11px] text-slate-400">Custo estimado</p>
                  <p className="text-[15px] font-bold" style={{ color: "#40916C" }}>{fmt(custoTotal)}</p>
                </div>
              )}
            </div>

            {produtosVinculados.size === 0 && produtos.length === 0 && (
              <p className="text-[12px] text-slate-400 text-center py-8">Cadastre insumos primeiro na aba Estoque.</p>
            )}

            {/* Lista de insumos */}
            <div className="space-y-2">
              {produtos.map(p => {
                const vinculado = produtosVinculados.has(p.id);
                const ficha = fichasDoServico.find(f => f.produtoId === p.id);
                return (
                  <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl border transition-colors"
                    style={vinculado ? { borderColor: "#40916C", background: "#f0faf5" } : { borderColor: "#f1f5f9", background: "#fafafa" }}>
                    <button onClick={() => toggleVinculo(p.id)}
                      className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all"
                      style={vinculado ? { borderColor: "#40916C", background: "#40916C" } : { borderColor: "#CBD5E1", background: "white" }}>
                      {vinculado && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                    </button>
                    <ProdutoImg url={p.imageUrl} nome={p.nome} size={36} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-slate-700 truncate">{p.nome}</p>
                      <p className="text-[11px] text-slate-400">Estoque: {fmtQtd(p.estoque, p.unidade)}</p>
                    </div>
                    {/* Campo de quantidade */}
                    <div className="flex items-center gap-1 shrink-0">
                      <input
                        type="number" min="0.01" step="0.1"
                        value={vinculado ? (ficha?.quantidadeEst || 1) : (qtds[p.id] || "")}
                        onChange={e => {
                          setQtds(q => ({ ...q, [p.id]: e.target.value }));
                          if (vinculado && ficha) {
                            // Atualiza ficha ao mudar quantidade
                            fetchWithAuth("/api/insumos/ficha-tecnica", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ servicoId: servicoSel, produtoId: p.id, quantidadeEst: parseFloat(e.target.value) || 1, unidade: p.unidade }),
                            }).then(recarregarFichas);
                          }
                        }}
                        placeholder="qtd"
                        className="w-16 h-8 text-center rounded-lg border text-[12px] font-semibold outline-none"
                        style={vinculado ? { borderColor: "#40916C", background: "white", color: "#166534" } : { borderColor: "#e2e8f0", background: "white" }}
                      />
                      <span className="text-[11px] text-slate-400">{p.unidade}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {toast && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] bg-slate-800 text-white text-[12px] font-medium px-5 py-2.5 rounded-full shadow-xl">{toast}</div>}
    </div>
  );
}

/* ─── Tab Inteligência (Analytics) ───────────────────── */
function TabInteligencia() {
  const [data, setData] = useState<{ alertas: Alerta[]; previsoes: Previsao[]; custosServico: CustoServico[]; agendamentosConcluidos: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [dias, setDias] = useState(30);

  useEffect(() => {
    setLoading(true);
    fetchWithAuth(`/api/insumos/analytics?dias=${dias}`)
      .then(r => r.json())
      .then(d => setData(d))
      .finally(() => setLoading(false));
  }, [dias]);

  const iconAlerta = (tipo: string) => {
    const icons: Record<string, string> = {
      ruptura_iminente: "⚡",
      vencendo: "📅",
      vencido: "☠️",
      parado: "📦",
      acima_padrao: "📈",
    };
    return icons[tipo] || "⚠️";
  };

  const corAlerta = (s: string) => {
    const cores: Record<string, { bg: string; border: string; text: string }> = {
      critico: { bg: "#fff1f2", border: "#fecdd3", text: "#be123c" },
      atencao: { bg: "#fffbeb", border: "#fde68a", text: "#92400e" },
      info:    { bg: "#f0f9ff", border: "#bae6fd", text: "#075985" },
    };
    return cores[s] || cores.info;
  };

  if (loading) return <div className="flex justify-center py-16"><div className="w-7 h-7 border-2 border-slate-200 border-t-slate-500 rounded-full animate-spin" /></div>;
  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Período seletor */}
      <div className="flex items-center gap-3">
        <p className="text-[12px] text-slate-500 font-medium">Período de análise:</p>
        {[7, 15, 30, 60].map(d => (
          <button key={d} onClick={() => setDias(d)}
            className="px-3 py-1.5 rounded-xl text-[12px] font-medium border transition-colors"
            style={dias === d ? { background: "#40916C", color: "white", borderColor: "#40916C" } : { background: "white", color: "#64748b", borderColor: "#e2e8f0" }}>
            {d}d
          </button>
        ))}
        <span className="text-[11px] text-slate-400 ml-auto">{data.agendamentosConcluidos} atendimentos concluídos</span>
      </div>

      {/* Alertas */}
      {data.alertas.length > 0 && (
        <div>
          <h3 className="text-[13px] font-semibold text-slate-700 mb-3">🚨 Alertas ativos ({data.alertas.length})</h3>
          <div className="space-y-2">
            {data.alertas.slice(0, 10).map((a, i) => {
              const c = corAlerta(a.severidade);
              return (
                <div key={i} className="flex items-start gap-3 p-3 rounded-xl border" style={{ background: c.bg, borderColor: c.border }}>
                  <span className="text-lg leading-none mt-0.5">{iconAlerta(a.tipo)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium" style={{ color: c.text }}>{a.mensagem}</p>
                  </div>
                  <BadgeAlerta severidade={a.severidade} />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {data.alertas.length === 0 && (
        <div className="p-5 bg-emerald-50 rounded-2xl border border-emerald-100 text-center">
          <p className="text-[14px] font-semibold text-emerald-700">✅ Nenhum alerta ativo</p>
          <p className="text-[12px] text-emerald-600 mt-1">Todos os seus insumos estão dentro dos parâmetros normais.</p>
        </div>
      )}

      {/* Previsão de estoque */}
      {data.previsoes.filter(p => p.diasRestantes !== null).length > 0 && (
        <div>
          <h3 className="text-[13px] font-semibold text-slate-700 mb-3">📊 Previsão de duração</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {data.previsoes.filter(p => p.consumoDiario > 0).slice(0, 8).map(p => {
              const critico = p.diasRestantes !== null && p.diasRestantes <= 7;
              const atencao = p.diasRestantes !== null && p.diasRestantes <= 14;
              const cor = critico ? "#dc2626" : atencao ? "#d97706" : "#40916C";
              return (
                <div key={p.produtoId} className="p-4 bg-white rounded-xl border border-slate-100 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-lg font-bold"
                    style={{ background: critico ? "#fee2e2" : atencao ? "#fef3c7" : "#f0faf5", color: cor }}>
                    {p.diasRestantes !== null ? p.diasRestantes : "∞"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-slate-700 truncate">{p.nome}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {fmtQtd(p.estoque, p.unidade)} — consome ~{fmtQtd(p.consumoDiario, p.unidade)}/dia
                      {p.dataRupturaPrevista && <span> — acaba ~{p.dataRupturaPrevista}</span>}
                    </p>
                  </div>
                  <p className="text-[11px] font-semibold shrink-0" style={{ color: cor }}>
                    {p.diasRestantes !== null ? `${p.diasRestantes}d` : "∞"}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Custo por serviço */}
      {data.custosServico.length > 0 && (
        <div>
          <h3 className="text-[13px] font-semibold text-slate-700 mb-3">💰 Custo de insumos por serviço</h3>
          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="px-4 py-3 text-[11px] font-semibold text-slate-500">Serviço</th>
                  <th className="px-4 py-3 text-[11px] font-semibold text-slate-500 text-right">Insumos</th>
                  <th className="px-4 py-3 text-[11px] font-semibold text-slate-500 text-right hidden md:table-cell">Preço</th>
                  <th className="px-4 py-3 text-[11px] font-semibold text-slate-500 text-right">Margem</th>
                </tr>
              </thead>
              <tbody>
                {data.custosServico.map(s => {
                  const corMargem = (s.margemPct || 0) >= 70 ? "#16a34a" : (s.margemPct || 0) >= 40 ? "#d97706" : "#dc2626";
                  return (
                    <tr key={s.servicoId} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-[13px] font-medium text-slate-700">{s.servicoNome}</td>
                      <td className="px-4 py-3 text-[13px] text-right text-slate-600">{fmt(s.custoInsumos)}</td>
                      <td className="px-4 py-3 text-[13px] text-right text-slate-500 hidden md:table-cell">{fmt(s.precoServico)}</td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-[12px] font-bold" style={{ color: corMargem }}>
                          {s.margemPct !== null ? `${s.margemPct}%` : "—"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Página principal ────────────────────────────────── */
type Tab = "estoque" | "fichas" | "inteligencia";

export default function InsumosPage() {
  const [tab, setTab] = useState<Tab>("estoque");
  const [categorias, setCategorias] = useState<Categoria[]>([]);

  useEffect(() => {
    fetchWithAuth("/api/vitrine/categories").then(r => r.json()).then(d => {
      setCategorias(Array.isArray(d) ? d : []);
    });
  }, []);

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    {
      id: "estoque", label: "Estoque",
      icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/></svg>,
    },
    {
      id: "fichas", label: "Fichas Técnicas",
      icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="2"/><path d="M9 12h6M9 16h4"/></svg>,
    },
    {
      id: "inteligencia", label: "Inteligência",
      icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
    },
  ];

  return (
    <div className="max-w-5xl mx-auto py-4 lg:py-8 px-4">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 md:p-6 mb-5">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl flex items-center justify-center shadow-sm shrink-0"
            style={{ background: "linear-gradient(135deg, #40916C, #2d6a4f)" }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round">
              <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
              <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
              <line x1="12" y1="22.08" x2="12" y2="12"/>
            </svg>
          </div>
          <div>
            <h1 className="text-[17px] md:text-xl font-bold text-slate-800">Controle de Insumos</h1>
            <p className="text-[11px] text-slate-400 mt-0.5">Estoque inteligente com rastreio automático por atendimento</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-5 overflow-x-auto no-scrollbar pb-1">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={tab === t.id ? { background: "#40916C", color: "white", borderColor: "#40916C" } : {}}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[12px] font-medium whitespace-nowrap shrink-0 border transition-all ${tab === t.id ? "" : "bg-white text-slate-500 border-slate-200 hover:border-slate-400"}`}>
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* Conteúdo */}
      <div>
        {tab === "estoque"       && <TabEstoque categorias={categorias} />}
        {tab === "fichas"        && <TabFichas />}
        {tab === "inteligencia"  && <TabInteligencia />}
      </div>
    </div>
  );
}
