"use client";
import React, { useState, useEffect, useCallback } from "react";
import { fetchWithAuth } from "@/lib/api-utils";

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface ComissaoRegra {
  id:           string;
  tipoBase:     string;
  referenciaId: string | null;
  percentual:   number | null;
  valorFixo:    number | null;
}

interface Profissional {
  id:                string;
  nome:              string;
  percentualRepasse: number | null;
  repasseFixo:       number | null;
  repasseTipo:       string | null;
  comissaoRegras:    ComissaoRegra[];
}

type TipoValor = "percentual" | "fixo";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function regraParaTipo(regra?: ComissaoRegra): TipoValor {
  return regra?.valorFixo != null ? "fixo" : "percentual";
}

function regraParaValor(regra?: ComissaoRegra): string {
  if (!regra) return "";
  return regra.valorFixo != null ? String(regra.valorFixo) : String(regra.percentual ?? "");
}

function badgeProfissional(p: Profissional): string {
  const r = p.comissaoRegras.find(r => r.tipoBase === "servico" && r.referenciaId === null);
  if (r) return r.valorFixo != null ? `R$ ${r.valorFixo}` : `${r.percentual ?? 0}%`;
  return p.repasseTipo === "fixo" ? `R$ ${p.repasseFixo ?? 0}` : `${p.percentualRepasse ?? 0}%`;
}

// ─── CardComissao — componente controlado, sem botão de save ──────────────────

function CardComissao({
  label, tipoValor, setTipoValor, valor, setValor, padrao,
}: {
  label:        string;
  tipoValor:    TipoValor;
  setTipoValor: (t: TipoValor) => void;
  valor:        string;
  setValor:     (v: string) => void;
  padrao:       string;
}) {
  return (
    <div className="bg-warm-100 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-[9px] font-black uppercase tracking-widest text-text-placeholder">
          {label}
        </label>
        <div className="flex items-center gap-1 bg-white rounded-lg border border-warm-200 p-0.5">
          <button
            onClick={() => setTipoValor("percentual")}
            className={`text-[9px] font-black px-2 py-1 rounded-md transition-all ${
              tipoValor === "percentual" ? "bg-primary text-white" : "text-text-muted"
            }`}
          >%</button>
          <button
            onClick={() => setTipoValor("fixo")}
            className={`text-[9px] font-black px-2 py-1 rounded-md transition-all ${
              tipoValor === "fixo" ? "bg-primary text-white" : "text-text-muted"
            }`}
          >R$</button>
        </div>
      </div>
      <div className="relative">
        {tipoValor === "fixo" && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-text-muted">R$</span>
        )}
        <input
          type="number" min="0" max={tipoValor === "percentual" ? 100 : undefined}
          value={valor}
          onChange={e => setValor(e.target.value)}
          placeholder="0"
          className={`input-premium w-full py-2 text-sm ${tipoValor === "fixo" ? "pl-8" : ""}`}
        />
        {tipoValor === "percentual" && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-text-muted">%</span>
        )}
      </div>
      {!valor && (
        <p className="text-[9px] text-text-placeholder italic">{padrao}</p>
      )}
    </div>
  );
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default function ComissoesPage() {
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [profSelId,     setProfSelId]     = useState<string>("");

  // Estado dos dois cards — controlado no pai
  const [tipoServico,  setTipoServico]  = useState<TipoValor>("percentual");
  const [valorServico, setValorServico] = useState("");
  const [tipoProduto,  setTipoProduto]  = useState<TipoValor>("percentual");
  const [valorProduto, setValorProduto] = useState("");

  // Estado do botão unificado
  const [saving,   setSaving]   = useState(false);
  const [feedback, setFeedback] = useState<{ ok?: string; err?: string }>({});

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetchWithAuth("/api/settings/comissoes");
      const d = await r.json();
      const lista: Profissional[] = d.profissionais ?? [];
      setProfissionais(lista);
      if (!profSelId && lista.length > 0) setProfSelId(lista[0].id);
    } catch { setProfissionais([]); }
    finally  { setLoading(false); }
  }, [profSelId]);

  useEffect(() => { carregar(); }, []); // eslint-disable-line

  // Sincroniza os inputs sempre que o profissional selecionado ou os dados mudarem
  useEffect(() => {
    const p    = profissionais.find(p => p.id === profSelId);
    const serv = p?.comissaoRegras.find(r => r.tipoBase === "servico" && r.referenciaId === null);
    const prod = p?.comissaoRegras.find(r => r.tipoBase === "produto" && r.referenciaId === null);
    setTipoServico(regraParaTipo(serv));
    setValorServico(regraParaValor(serv));
    setTipoProduto(regraParaTipo(prod));
    setValorProduto(regraParaValor(prod));
    setFeedback({});
  }, [profSelId, profissionais]);

  async function salvarTudo() {
    if (saving) return;
    setSaving(true);
    setFeedback({});

    async function postRegra(tipoBase: "servico" | "produto", tipoValor: TipoValor, valor: string) {
      if (!valor) return;
      const body: Record<string, unknown> = { profissionalId: profSelId, tipoBase, referenciaId: null };
      if (tipoValor === "percentual") body.percentual = parseFloat(valor);
      else body.valorFixo = parseFloat(valor);
      const r = await fetchWithAuth("/api/settings/comissoes", {
        method: "POST", body: JSON.stringify(body),
      });
      if (!r.ok) throw new Error(`${tipoBase === "servico" ? "Serviços" : "Produtos"}: ${(await r.json()).error ?? "Erro"}`);
    }

    const [resServ, resProd] = await Promise.allSettled([
      postRegra("servico", tipoServico, valorServico),
      postRegra("produto", tipoProduto, valorProduto),
    ]);

    const erros = [resServ, resProd]
      .filter((r): r is PromiseRejectedResult => r.status === "rejected")
      .map(r => r.reason?.message ?? "Erro desconhecido");

    if (erros.length > 0) {
      setFeedback({ err: erros.join(" | ") });
    } else {
      setFeedback({ ok: "Comissões salvas" });
      setTimeout(() => setFeedback({}), 2000);
      await carregar();
    }

    setSaving(false);
  }

  const prof = profissionais.find(p => p.id === profSelId);

  const padraoGlobal = prof
    ? prof.repasseTipo === "fixo"
      ? `Usando padrão global: R$ ${prof.repasseFixo ?? 0}`
      : `Usando padrão global: ${prof.percentualRepasse ?? 0}%`
    : "";

  if (loading) return (
    <div className="max-w-3xl mx-auto py-12 flex justify-center">
      <div className="w-6 h-6 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-32 px-4 md:px-6 animate-premium">

      {/* Cabeçalho */}
      <div className="premium-card p-6 bg-white space-y-1">
        <h1 className="text-xl font-black italic uppercase tracking-tight text-text-main">
          Comissões
        </h1>
        <p className="text-[10px] font-black text-text-placeholder uppercase tracking-widest opacity-60">
          Defina o percentual ou valor fixo de comissão por profissional
        </p>
      </div>

      {profissionais.length === 0 ? (
        <div className="text-center py-12 text-xs text-text-placeholder">
          Nenhum profissional ativo cadastrado.
        </div>
      ) : (
        <>
          {/* Seletor de profissional */}
          <div className="bg-white border border-warm-200 rounded-xl p-5">
            <label className="text-[9px] font-black uppercase tracking-widest text-text-placeholder block mb-3">
              Profissional
            </label>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {profissionais.map(p => (
                <button
                  key={p.id}
                  onClick={() => setProfSelId(p.id)}
                  className={`flex shrink-0 items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
                    profSelId === p.id
                      ? "bg-primary text-white border-primary shadow-lg shadow-primary/20"
                      : "bg-white border-warm-200 text-text-muted hover:border-primary/30"
                  }`}
                >
                  {p.nome}
                  <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md ${
                    profSelId === p.id ? "bg-white/20 text-white" : "bg-warm-100 text-text-placeholder"
                  }`}>
                    {badgeProfissional(p)}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Cards + botão unificado */}
          {prof && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <CardComissao
                  label="Comissão em serviços"
                  tipoValor={tipoServico}   setTipoValor={setTipoServico}
                  valor={valorServico}      setValor={setValorServico}
                  padrao={padraoGlobal}
                />
                <CardComissao
                  label="Comissão em produtos vendidos"
                  tipoValor={tipoProduto}   setTipoValor={setTipoProduto}
                  valor={valorProduto}      setValor={setValorProduto}
                  padrao={padraoGlobal}
                />
              </div>

              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-end">
                {feedback.ok  && <span className="text-[10px] font-bold text-sage-600 text-center md:text-left">✓ {feedback.ok}</span>}
                {feedback.err && <span className="text-[10px] font-bold text-red-500 text-center md:text-left">✗ {feedback.err}</span>}
                <button
                  onClick={salvarTudo}
                  disabled={saving}
                  className="w-full md:w-auto flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-6 py-2.5 rounded-xl transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <>
                      <svg className="w-4 h-4 animate-spin shrink-0" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                      </svg>
                      Salvando...
                    </>
                  ) : feedback.ok ? "✓ Salvo" : "Salvar comissões"}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
