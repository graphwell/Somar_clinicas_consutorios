"use client";
import React, { useState, useEffect, useCallback } from "react";
import { fetchWithAuth } from "@/lib/api-utils";

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface ComissaoRegra {
  id:            string;
  tipoBase:      string;
  referenciaId:  string | null;
  percentual:    number | null;
  valorFixo:     number | null;
  ativo:         boolean;
}

interface Profissional {
  id:                string;
  nome:              string;
  percentualRepasse: number | null;
  repasseFixo:       number | null;
  repasseTipo:       string | null;
  comissaoRegras:    ComissaoRegra[];
}

interface CatProduto { id: string; nome: string }

interface DadosComissao {
  profissionais:     Profissional[];
  categoriasServico: string[];
  categoriasProduto: CatProduto[];
}

type TipoValor = "percentual" | "fixo";

// ─── Sub-componentes ─────────────────────────────────────────────────────────

function SaveFeedback({ msg, err }: { msg?: string; err?: string }) {
  if (!msg && !err) return null;
  return (
    <span className={`text-[10px] font-bold ml-2 ${err ? "text-red-500" : "text-sage-600"}`}>
      {err ? `✗ ${err}` : `✓ ${msg}`}
    </span>
  );
}

function InputComissao({
  label, tipoValor, setTipoValor, valor, setValor, saving, onSalvar, feedback,
  placeholder = "0", padrao,
}: {
  label:        string;
  tipoValor:    TipoValor;
  setTipoValor: (t: TipoValor) => void;
  valor:        string;
  setValor:     (v: string) => void;
  saving:       boolean;
  onSalvar:     () => void;
  feedback:     { msg?: string; err?: string };
  placeholder?: string;
  padrao?:      string;
}) {
  return (
    <div className="bg-warm-100 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-[9px] font-black uppercase tracking-widest text-text-placeholder">{label}</label>
        <div className="flex items-center gap-1 bg-white rounded-lg border border-warm-200 p-0.5">
          <button
            onClick={() => setTipoValor("percentual")}
            className={`text-[9px] font-black px-2 py-1 rounded-md transition-all ${tipoValor === "percentual" ? "bg-primary text-white" : "text-text-muted"}`}
          >%</button>
          <button
            onClick={() => setTipoValor("fixo")}
            className={`text-[9px] font-black px-2 py-1 rounded-md transition-all ${tipoValor === "fixo" ? "bg-primary text-white" : "text-text-muted"}`}
          >R$</button>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          {tipoValor === "fixo" && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-text-muted">R$</span>
          )}
          <input
            type="number" min="0" max={tipoValor === "percentual" ? 100 : undefined}
            value={valor}
            onChange={e => setValor(e.target.value)}
            placeholder={placeholder}
            className={`input-premium w-full py-2 text-sm ${tipoValor === "fixo" ? "pl-8" : ""}`}
          />
          {tipoValor === "percentual" && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-text-muted">%</span>
          )}
        </div>
        <button onClick={onSalvar} disabled={saving || !valor} className="btn-primary py-2 px-4 text-xs disabled:opacity-50">
          {saving ? "…" : "Salvar"}
        </button>
      </div>
      <SaveFeedback {...feedback} />
      {padrao && !valor && (
        <p className="text-[9px] text-text-placeholder italic">{padrao}</p>
      )}
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function ComissoesPage() {
  const [dados,         setDados]         = useState<DadosComissao | null>(null);
  const [loading,       setLoading]       = useState(true);
  const [profSelId,     setProfSelId]     = useState<string>("");

  // Estado por regra: saving e feedback
  const [savingMap,     setSavingMap]     = useState<Record<string, boolean>>({});
  const [feedbackMap,   setFeedbackMap]   = useState<Record<string, { msg?: string; err?: string }>>({});

  // Painel de nova exceção
  const [novaExcecao,   setNovaExcecao]   = useState(false);
  const [excTipo,       setExcTipo]       = useState<"servico" | "produto">("servico");
  const [excServicos,   setExcServicos]   = useState<{ id: string; nome: string }[]>([]);
  const [excProdutos,   setExcProdutos]   = useState<{ id: string; nome: string }[]>([]);
  const [excRefId,      setExcRefId]      = useState("");
  const [excTipoValor,  setExcTipoValor]  = useState<TipoValor>("percentual");
  const [excValor,      setExcValor]      = useState("");
  const [excSaving,     setExcSaving]     = useState(false);

  // ── Carregar dados ──────────────────────────────────────────────────────────
  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetchWithAuth("/api/settings/comissoes");
      const d = await r.json();
      setDados(d);
      if (!profSelId && d.profissionais?.length > 0) setProfSelId(d.profissionais[0].id);
    } catch { setDados(null); }
    finally  { setLoading(false); }
  }, [profSelId]);

  useEffect(() => { carregar(); }, []); // eslint-disable-line

  // Carregar serviços e produtos para nova exceção
  useEffect(() => {
    if (!novaExcecao) return;
    if (excTipo === "servico") {
      fetchWithAuth("/api/services").then(r => r.json()).then(d => setExcServicos(Array.isArray(d) ? d : [])).catch(() => {});
    } else {
      fetchWithAuth("/api/insumos/produtos").then(r => r.json()).then(d => setExcProdutos(Array.isArray(d) ? d : [])).catch(() => {});
    }
  }, [novaExcecao, excTipo]);

  // ── Salvar regra ────────────────────────────────────────────────────────────
  async function salvar(chave: string, tipoBase: string, referenciaId: string | null, tipoValor: TipoValor, valor: string) {
    if (!profSelId || !valor) return;
    setSavingMap(p => ({ ...p, [chave]: true }));
    setFeedbackMap(p => ({ ...p, [chave]: {} }));
    try {
      const body: Record<string, unknown> = { profissionalId: profSelId, tipoBase, referenciaId };
      if (tipoValor === "percentual") body.percentual = parseFloat(valor);
      else body.valorFixo = parseFloat(valor);
      const r = await fetchWithAuth("/api/settings/comissoes", { method: "POST", body: JSON.stringify(body) });
      if (!r.ok) throw new Error((await r.json()).error ?? "Erro");
      setFeedbackMap(p => ({ ...p, [chave]: { msg: "Salvo" } }));
      setTimeout(() => setFeedbackMap(p => ({ ...p, [chave]: {} })), 2000);
      await carregar();
    } catch (e: unknown) {
      setFeedbackMap(p => ({ ...p, [chave]: { err: e instanceof Error ? e.message : "Erro ao salvar" } }));
    } finally {
      setSavingMap(p => ({ ...p, [chave]: false }));
    }
  }

  async function remover(id: string) {
    if (!confirm("Remover esta regra de comissão?")) return;
    await fetchWithAuth(`/api/settings/comissoes?id=${id}`, { method: "DELETE" });
    await carregar();
  }

  async function salvarExcecao() {
    if (!excRefId || !excValor) return;
    setExcSaving(true);
    try {
      const tipoBase = excTipo === "servico" ? "servico_especifico" : "produto_especifico";
      const body: Record<string, unknown> = { profissionalId: profSelId, tipoBase, referenciaId: excRefId };
      if (excTipoValor === "percentual") body.percentual = parseFloat(excValor);
      else body.valorFixo = parseFloat(excValor);
      const r = await fetchWithAuth("/api/settings/comissoes", { method: "POST", body: JSON.stringify(body) });
      if (!r.ok) throw new Error();
      setNovaExcecao(false); setExcRefId(""); setExcValor("");
      await carregar();
    } catch { alert("Erro ao salvar exceção."); }
    finally  { setExcSaving(false); }
  }

  // ── Helpers de estado ───────────────────────────────────────────────────────
  const profissional = dados?.profissionais.find(p => p.id === profSelId);

  function getRegra(tipoBase: string, referenciaId: string | null): ComissaoRegra | undefined {
    return profissional?.comissaoRegras.find(r => r.tipoBase === tipoBase && r.referenciaId === referenciaId);
  }

  function regraTipoValor(regra?: ComissaoRegra): TipoValor {
    return regra?.valorFixo !== null ? "fixo" : "percentual";
  }

  function regraValor(regra?: ComissaoRegra): string {
    if (!regra) return "";
    return regra.valorFixo !== null ? String(regra.valorFixo) : String(regra.percentual ?? "");
  }

  const padraoGlobal = profissional
    ? profissional.repasseTipo === "fixo"
      ? `Usando padrão global: R$ ${profissional.repasseFixo ?? 0}`
      : `Usando padrão global: ${profissional.percentualRepasse ?? 0}%`
    : "";

  // ── Sub-componente reutilizável por categoria ───────────────────────────────
  function SecaoCategoria({
    titulo, tipo, categorias, tipoBaseRegra, labelCategoria,
  }: {
    titulo:        string;
    tipo:          "servico_categoria" | "produto_categoria";
    categorias:    { id: string; label: string }[];
    tipoBaseRegra: string;
    labelCategoria: string;
  }) {
    const [tiposValor, setTiposValor] = useState<Record<string, TipoValor>>({});
    const [valores,    setValores]    = useState<Record<string, string>>({});

    // Inicializar com valores existentes
    useEffect(() => {
      if (!profissional) return;
      const tv: Record<string, TipoValor> = {};
      const vl: Record<string, string>    = {};
      for (const cat of categorias) {
        const r = getRegra(tipo, cat.id);
        tv[cat.id] = regraTipoValor(r);
        vl[cat.id] = regraValor(r);
      }
      setTiposValor(tv);
      setValores(vl);
    }, [profSelId, profissional?.comissaoRegras.length]); // eslint-disable-line

    return (
      <div className="premium-card p-6 bg-white space-y-4">
        <div className="border-b border-slate-50 pb-3">
          <h3 className="text-sm font-black uppercase tracking-tight text-text-main italic">{titulo}</h3>
          <p className="text-[9px] text-text-placeholder mt-0.5">Substituição por {labelCategoria}</p>
        </div>
        {categorias.length === 0 ? (
          <p className="text-xs text-text-placeholder italic">Nenhuma {labelCategoria.toLowerCase()} cadastrada.</p>
        ) : (
          <div className="space-y-3">
            {categorias.map(cat => {
              const chave = `${tipoBaseRegra}_${cat.id}`;
              const padrao = getRegra(tipo === "servico_categoria" ? "servico" : "produto", null);
              const padraoTxt = padrao
                ? padrao.valorFixo !== null ? `Herda: R$ ${padrao.valorFixo}` : `Herda: ${padrao.percentual ?? 0}%`
                : `Herda padrão de ${tipo === "servico_categoria" ? "serviços" : "produtos"}`;
              return (
                <div key={cat.id} className="flex items-center gap-3">
                  <span className="text-xs font-medium text-text-main w-36 truncate">{cat.label}</span>
                  <div className="flex items-center gap-1 bg-warm-100 rounded-lg border border-warm-200 p-0.5">
                    <button onClick={() => setTiposValor(p => ({ ...p, [cat.id]: "percentual" }))} className={`text-[9px] font-black px-1.5 py-0.5 rounded transition-all ${tiposValor[cat.id] !== "fixo" ? "bg-primary text-white" : "text-text-muted"}`}>%</button>
                    <button onClick={() => setTiposValor(p => ({ ...p, [cat.id]: "fixo" }))} className={`text-[9px] font-black px-1.5 py-0.5 rounded transition-all ${tiposValor[cat.id] === "fixo" ? "bg-primary text-white" : "text-text-muted"}`}>R$</button>
                  </div>
                  <input
                    type="number" min="0"
                    value={valores[cat.id] ?? ""}
                    onChange={e => setValores(p => ({ ...p, [cat.id]: e.target.value }))}
                    placeholder={padraoTxt}
                    className="input-premium py-1.5 text-xs w-24"
                  />
                  <button
                    onClick={() => salvar(chave, tipo, cat.id, tiposValor[cat.id] ?? "percentual", valores[cat.id] ?? "")}
                    disabled={savingMap[chave] || !valores[cat.id]}
                    className="btn-primary py-1.5 px-3 text-[9px] disabled:opacity-40"
                  >
                    {savingMap[chave] ? "…" : "Salvar"}
                  </button>
                  <SaveFeedback {...(feedbackMap[chave] ?? {})} />
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="max-w-5xl mx-auto py-12 flex justify-center">
      <div className="w-6 h-6 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
    </div>
  );

  if (!dados) return (
    <div className="max-w-5xl mx-auto py-12 text-center text-xs text-text-placeholder">Erro ao carregar dados.</div>
  );

  const excEspecificas = profissional?.comissaoRegras.filter(r =>
    r.tipoBase === "servico_especifico" || r.tipoBase === "produto_especifico"
  ) ?? [];

  // Categorias para seção 2 e 3
  const catServico  = dados.categoriasServico.map(c => ({ id: c, label: c }));
  const catProduto  = dados.categoriasProduto.map(c => ({ id: c.id, label: c.nome }));

  const regraServ = getRegra("servico", null);
  const regraProd = getRegra("produto", null);

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-32 px-4 animate-premium">

      {/* Cabeçalho */}
      <div className="premium-card p-6 bg-white space-y-1">
        <h1 className="text-xl font-black italic uppercase tracking-tight text-text-main">
          Comissões
        </h1>
        <p className="text-[10px] font-black text-text-placeholder uppercase tracking-widest opacity-60">
          Configure as regras de comissão por profissional, serviço e produto
        </p>
      </div>

      {/* Seletor de profissional */}
      <div className="bg-white border border-warm-200 rounded-xl p-5 space-y-3">
        <label className="text-[9px] font-black uppercase tracking-widest text-text-placeholder block mb-2">
          Profissional
        </label>
        <div className="flex flex-wrap gap-2">
          {dados.profissionais.map(p => (
            <button
              key={p.id}
              onClick={() => setProfSelId(p.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
                profSelId === p.id
                  ? "bg-primary text-white border-primary shadow-lg shadow-primary/20"
                  : "bg-white border-warm-200 text-text-muted hover:border-primary/30"
              }`}
            >
              {p.nome}
              <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md ${
                profSelId === p.id ? "bg-white/20 text-white" : "bg-warm-100 text-text-placeholder"
              }`}>
                {p.repasseTipo === "fixo" ? `R$ ${p.repasseFixo ?? 0}` : `${p.percentualRepasse ?? 0}%`}
              </span>
            </button>
          ))}
        </div>
      </div>

      {profissional && (
        <>
          {/* SEÇÃO 1: Padrão por tipo */}
          <div>
            <h2 className="text-[9px] font-black uppercase tracking-widest text-text-placeholder mb-3">
              1. Comissão padrão por tipo
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <ComissaoRegraSimples
                label="Serviços — padrão"
                tipoBase="servico"
                regraInicial={regraServ}
                padrao={padraoGlobal}
                profissionalId={profSelId}
                onSalvo={carregar}
              />
              <ComissaoRegraSimples
                label="Produtos — padrão"
                tipoBase="produto"
                regraInicial={regraProd}
                padrao={padraoGlobal}
                profissionalId={profSelId}
                onSalvo={carregar}
              />
            </div>
          </div>

          {/* SEÇÃO 2: Por categoria de serviço */}
          <div>
            <h2 className="text-[9px] font-black uppercase tracking-widest text-text-placeholder mb-3">
              2. Por categoria de serviço
            </h2>
            <SecaoCategoria
              titulo="Categorias de Serviço"
              tipo="servico_categoria"
              categorias={catServico}
              tipoBaseRegra="servcat"
              labelCategoria="Categoria de serviço"
            />
          </div>

          {/* SEÇÃO 3: Por categoria de produto */}
          <div>
            <h2 className="text-[9px] font-black uppercase tracking-widest text-text-placeholder mb-3">
              3. Por categoria de produto
            </h2>
            <SecaoCategoria
              titulo="Categorias de Produto"
              tipo="produto_categoria"
              categorias={catProduto}
              tipoBaseRegra="prodcat"
              labelCategoria="Categoria de produto"
            />
          </div>

          {/* SEÇÃO 4: Exceções específicas */}
          <div>
            <h2 className="text-[9px] font-black uppercase tracking-widest text-text-placeholder mb-3">
              4. Exceções específicas
              <span className="ml-2 text-primary text-[8px]">— sobreescreve todas as outras regras</span>
            </h2>
            <div className="premium-card p-6 bg-white space-y-4">
              {excEspecificas.length === 0 && !novaExcecao ? (
                <p className="text-xs text-text-placeholder italic">Nenhuma exceção cadastrada.</p>
              ) : (
                <div className="space-y-2">
                  {excEspecificas.map(r => (
                    <div key={r.id} className="flex items-center justify-between gap-3 bg-warm-100 rounded-xl px-4 py-3">
                      <div>
                        <span className="text-[9px] font-black uppercase text-text-placeholder mr-2">
                          {r.tipoBase === "servico_especifico" ? "Serviço" : "Produto"}
                        </span>
                        <span className="text-xs font-medium text-text-main">{r.referenciaId}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-primary">
                          {r.valorFixo !== null ? `R$ ${r.valorFixo}` : `${r.percentual ?? 0}%`}
                        </span>
                        <button onClick={() => remover(r.id)} className="text-[9px] text-red-400 hover:text-red-600 font-black uppercase">Remover</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {novaExcecao ? (
                <div className="border border-warm-200 rounded-xl p-4 space-y-3 bg-warm-50">
                  <div className="flex gap-2">
                    {(["servico", "produto"] as const).map(t => (
                      <button key={t} onClick={() => setExcTipo(t)}
                        className={`text-[9px] font-black uppercase px-3 py-1.5 rounded-lg border transition-all ${
                          excTipo === t ? "bg-primary text-white border-primary" : "border-warm-200 text-text-muted"
                        }`}>
                        {t === "servico" ? "Serviço" : "Produto"}
                      </button>
                    ))}
                  </div>
                  <select value={excRefId} onChange={e => setExcRefId(e.target.value)} className="input-premium w-full py-2 text-sm">
                    <option value="">Selecionar {excTipo === "servico" ? "serviço" : "produto"}…</option>
                    {(excTipo === "servico" ? excServicos : excProdutos).map(s => (
                      <option key={s.id} value={s.id}>{s.nome}</option>
                    ))}
                  </select>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 bg-white rounded-lg border border-warm-200 p-0.5">
                      {(["percentual", "fixo"] as TipoValor[]).map(t => (
                        <button key={t} onClick={() => setExcTipoValor(t)}
                          className={`text-[9px] font-black px-2 py-1 rounded-md transition-all ${excTipoValor === t ? "bg-primary text-white" : "text-text-muted"}`}>
                          {t === "percentual" ? "%" : "R$"}
                        </button>
                      ))}
                    </div>
                    <input
                      type="number" min="0" value={excValor} onChange={e => setExcValor(e.target.value)}
                      placeholder={excTipoValor === "percentual" ? "0–100" : "0,00"}
                      className="input-premium py-1.5 text-sm w-24"
                    />
                    <button onClick={salvarExcecao} disabled={excSaving || !excRefId || !excValor} className="btn-primary py-1.5 px-4 text-xs disabled:opacity-40">
                      {excSaving ? "Salvando…" : "Salvar"}
                    </button>
                    <button onClick={() => setNovaExcecao(false)} className="text-xs text-text-muted hover:text-text-main">Cancelar</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setNovaExcecao(true)} className="text-sm text-primary font-medium hover:text-primary/70 transition-colors">
                  + Adicionar exceção específica
                </button>
              )}
            </div>
          </div>

          {/* Indicador de hierarquia */}
          <div className="bg-warm-100 border border-warm-200 rounded-xl p-4">
            <p className="text-[9px] font-black uppercase tracking-widest text-text-placeholder mb-2">Como as regras são aplicadas</p>
            <div className="flex flex-wrap items-center gap-2 text-xs text-text-muted">
              <span className="bg-white border border-warm-200 rounded-lg px-2 py-1 font-medium text-primary">1º Exceção específica</span>
              <span className="text-text-placeholder">→</span>
              <span className="bg-white border border-warm-200 rounded-lg px-2 py-1">2º Categoria</span>
              <span className="text-text-placeholder">→</span>
              <span className="bg-white border border-warm-200 rounded-lg px-2 py-1">3º Padrão do tipo</span>
              <span className="text-text-placeholder">→</span>
              <span className="bg-white border border-warm-200 rounded-lg px-2 py-1">4º Padrão global</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Sub-componente para regra simples (seção 1) ─────────────────────────────

function ComissaoRegraSimples({
  label, tipoBase, regraInicial, padrao, profissionalId, onSalvo,
}: {
  label:          string;
  tipoBase:       string;
  regraInicial?:  ComissaoRegra;
  padrao:         string;
  profissionalId: string;
  onSalvo:        () => void;
}) {
  const [tipoValor, setTipoValor] = useState<TipoValor>(
    regraInicial?.valorFixo !== null ? "fixo" : "percentual"
  );
  const [valor,    setValor]    = useState(
    regraInicial ? (regraInicial.valorFixo !== null ? String(regraInicial.valorFixo) : String(regraInicial.percentual ?? "")) : ""
  );
  const [saving,   setSaving]   = useState(false);
  const [feedback, setFeedback] = useState<{ msg?: string; err?: string }>({});

  async function salvar() {
    if (!valor) return;
    setSaving(true); setFeedback({});
    try {
      const body: Record<string, unknown> = { profissionalId, tipoBase, referenciaId: null };
      if (tipoValor === "percentual") body.percentual = parseFloat(valor);
      else body.valorFixo = parseFloat(valor);
      const r = await fetchWithAuth("/api/settings/comissoes", { method: "POST", body: JSON.stringify(body) });
      if (!r.ok) throw new Error((await r.json()).error ?? "Erro");
      setFeedback({ msg: "Salvo" });
      setTimeout(() => setFeedback({}), 2000);
      onSalvo();
    } catch (e: unknown) {
      setFeedback({ err: e instanceof Error ? e.message : "Erro ao salvar" });
    } finally { setSaving(false); }
  }

  return (
    <InputComissao
      label={label}
      tipoValor={tipoValor} setTipoValor={setTipoValor}
      valor={valor} setValor={setValor}
      saving={saving} onSalvar={salvar}
      feedback={feedback}
      padrao={!valor ? padrao : undefined}
    />
  );
}
