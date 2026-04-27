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

// Lê a comissaoRegra de serviço se existir, senão cai no padrão global
function badgeProfissional(p: Profissional): string {
  const r = p.comissaoRegras.find(r => r.tipoBase === "servico" && r.referenciaId === null);
  if (r) return r.valorFixo != null ? `R$ ${r.valorFixo}` : `${r.percentual ?? 0}%`;
  return p.repasseTipo === "fixo" ? `R$ ${p.repasseFixo ?? 0}` : `${p.percentualRepasse ?? 0}%`;
}

// ─── CardComissao ─────────────────────────────────────────────────────────────
// key no pai garante que o useState reinicializa quando profissional ou
// valor da regra mudarem (fix do bug de save não refletir na UI).

function CardComissao({
  label, tipoBase, regra, padrao, profissionalId, onSalvo,
}: {
  label:          string;
  tipoBase:       "servico" | "produto";
  regra?:         ComissaoRegra;
  padrao:         string;
  profissionalId: string;
  onSalvo:        () => Promise<void>;
}) {
  const [tipoValor, setTipoValor] = useState<TipoValor>(regraParaTipo(regra));
  const [valor,     setValor]     = useState(regraParaValor(regra));
  const [saving,    setSaving]    = useState(false);
  const [ok,        setOk]        = useState(false);
  const [erro,      setErro]      = useState("");

  async function salvar() {
    if (!valor) return;
    setSaving(true); setOk(false); setErro("");
    try {
      const body: Record<string, unknown> = { profissionalId, tipoBase, referenciaId: null };
      if (tipoValor === "percentual") body.percentual = parseFloat(valor);
      else body.valorFixo = parseFloat(valor);
      const r = await fetchWithAuth("/api/settings/comissoes", {
        method: "POST", body: JSON.stringify(body),
      });
      if (!r.ok) throw new Error((await r.json()).error ?? "Erro");
      setOk(true);
      setTimeout(() => setOk(false), 2000);
      await onSalvo();
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : "Erro ao salvar");
    } finally { setSaving(false); }
  }

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
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
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
        <button
          onClick={salvar}
          disabled={saving || !valor}
          className="btn-primary py-2 px-4 text-xs disabled:opacity-50"
        >
          {saving ? "…" : "Salvar"}
        </button>
      </div>
      {ok   && <p className="text-[10px] font-bold text-sage-600">✓ Salvo</p>}
      {erro && <p className="text-[10px] font-bold text-red-500">✗ {erro}</p>}
      {!valor && !ok && !erro && (
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

  const prof = profissionais.find(p => p.id === profSelId);

  const regraServ = prof?.comissaoRegras.find(
    r => r.tipoBase === "servico" && r.referenciaId === null,
  );
  const regraProd = prof?.comissaoRegras.find(
    r => r.tipoBase === "produto" && r.referenciaId === null,
  );

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
    <div className="max-w-3xl mx-auto space-y-8 pb-32 px-4 animate-premium">

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
            <div className="flex flex-wrap gap-2">
              {profissionais.map(p => (
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
                    {badgeProfissional(p)}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Cards de comissão — key muda quando dados da regra mudam → reinicializa state */}
          {prof && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <CardComissao
                key={`${profSelId}-s-${regraServ?.id ?? "new"}-${regraServ?.percentual ?? ""}-${regraServ?.valorFixo ?? ""}`}
                label="Comissão em serviços"
                tipoBase="servico"
                regra={regraServ}
                padrao={padraoGlobal}
                profissionalId={profSelId}
                onSalvo={carregar}
              />
              <CardComissao
                key={`${profSelId}-p-${regraProd?.id ?? "new"}-${regraProd?.percentual ?? ""}-${regraProd?.valorFixo ?? ""}`}
                label="Comissão em produtos vendidos"
                tipoBase="produto"
                regra={regraProd}
                padrao={padraoGlobal}
                profissionalId={profSelId}
                onSalvo={carregar}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
