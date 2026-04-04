"use client";
import React, { useState } from "react";
import { fetchWithAuth } from "@/lib/api-utils";
import { useToast } from "@/components/ui/Toast";

interface AssinaturaProntuarioProps {
  prontuarioId: string;
  assinado: boolean;
  assinadoEm?: string | null;
  assinaturaHash?: string | null;
  assinadoPorNome?: string | null;
  /** Se true, houve geração de rascunho IA neste prontuário */
  temRascunhoIA?: boolean;
  /** Se true, o profissional editou o rascunho — libera assinatura */
  iaRevisado?: boolean;
  onAssinado: (hash: string, data: string) => void;
}

export default function AssinaturaProntuario({
  prontuarioId,
  assinado,
  assinadoEm,
  assinaturaHash,
  assinadoPorNome,
  temRascunhoIA = false,
  iaRevisado = false,
  onAssinado,
}: AssinaturaProntuarioProps) {
  const { toast } = useToast();
  const [confirmando, setConfirmando] = useState(false);
  const [loading, setLoading] = useState(false);
  const [adendoAberto, setAdendoAberto] = useState(false);
  const [adendoTexto, setAdendoTexto] = useState("");
  const [salvandoAdendo, setSalvandoAdendo] = useState(false);

  // Checkboxes de confirmação
  const [checkRevisado, setCheckRevisado] = useState(false);
  const [checkIARevisada, setCheckIARevisada] = useState(false);
  const [checkVerificado, setCheckVerificado] = useState(false);

  const podeContinuar = temRascunhoIA ? iaRevisado : true;

  const todosMarcados =
    checkRevisado &&
    checkVerificado &&
    (!temRascunhoIA || checkIARevisada);

  async function assinar() {
    if (!todosMarcados) return;
    setLoading(true);
    try {
      const res = await fetchWithAuth("/api/prontuario/assinar", {
        method: "POST",
        body: JSON.stringify({ prontuarioId }),
      });
      const data = await res.json();
      if (data.success) {
        onAssinado(data.assinaturaHash, data.assinadoEm);
        toast.success("Prontuário assinado digitalmente com sucesso!");
        setConfirmando(false);
      } else {
        toast.error(data.error || "Erro ao assinar prontuário");
      }
    } catch {
      toast.error("Erro ao assinar prontuário");
    } finally {
      setLoading(false);
    }
  }

  async function salvarAdendo() {
    if (!adendoTexto.trim()) return;
    setSalvandoAdendo(true);
    try {
      // Adendo = novo prontuário com tipo ADENDO vinculado
      const res = await fetchWithAuth(`/api/prontuario/adendo`, {
        method: "POST",
        body: JSON.stringify({ prontuarioId, texto: adendoTexto }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Adendo registrado com sucesso!");
        setAdendoAberto(false);
        setAdendoTexto("");
      } else {
        toast.error(data.error || "Erro ao salvar adendo");
      }
    } catch {
      toast.error("Erro ao salvar adendo");
    } finally {
      setSalvandoAdendo(false);
    }
  }

  // ── Já assinado ──────────────────────────────────────────────
  if (assinado && assinaturaHash) {
    return (
      <div className="space-y-3">
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-green-50 border border-green-200">
          <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
            <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4">
              <path
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                stroke="#16a34a"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-green-700">
              Assinado por {assinadoPorNome || "profissional"}
            </p>
            {assinadoEm && (
              <p className="text-xs text-green-600 mt-0.5">
                {new Date(assinadoEm).toLocaleString("pt-BR")}
              </p>
            )}
            <p className="text-[10px] font-mono text-green-500/70 mt-1 truncate">
              SHA-256: {assinaturaHash.slice(0, 32)}...
            </p>
          </div>
        </div>

        {/* Adendo */}
        {!adendoAberto ? (
          <button
            id="adicionar-adendo-btn"
            type="button"
            onClick={() => setAdendoAberto(true)}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-xl border border-dashed border-slate-200 text-[10px] font-black text-slate-400 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-all uppercase tracking-wide"
          >
            + Adicionar Adendo
          </button>
        ) : (
          <div className="border border-blue-200 rounded-xl bg-blue-50 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-black uppercase tracking-widest text-blue-700">
                Adendo ao Prontuário
              </p>
              <button
                type="button"
                onClick={() => { setAdendoAberto(false); setAdendoTexto(""); }}
                className="text-blue-400 hover:text-blue-700"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M9 3L3 9M3 3l6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
              </button>
            </div>
            <p className="text-[9px] text-blue-600">
              O adendo será vinculado ao prontuário original e receberá sua própria assinatura.
              O conteúdo original permanece imutável.
            </p>
            <textarea
              value={adendoTexto}
              onChange={(e) => setAdendoTexto(e.target.value)}
              rows={4}
              placeholder="Descreva o adendo..."
              className="w-full px-3 py-2 rounded-lg border border-blue-200 bg-white text-xs text-slate-700 focus:outline-none focus:border-blue-400 resize-none"
            />
            <button
              type="button"
              onClick={salvarAdendo}
              disabled={salvandoAdendo || !adendoTexto.trim()}
              className="w-full py-2 rounded-lg bg-blue-600 text-white text-[10px] font-black uppercase tracking-wide hover:bg-blue-700 transition-colors disabled:opacity-60"
            >
              {salvandoAdendo ? "Salvando..." : "Assinar e Registrar Adendo"}
            </button>
          </div>
        )}
      </div>
    );
  }

  // ── Modal de confirmação ──────────────────────────────────────
  if (confirmando) {
    return (
      <div className="px-4 py-4 rounded-xl bg-amber-50 border border-amber-200 space-y-4">
        <div>
          <p className="text-sm font-black text-amber-700 uppercase tracking-tight">
            Confirmar Assinatura Digital
          </p>
          <p className="text-[10px] text-amber-600 mt-1 leading-relaxed">
            Após assinar, este prontuário será <strong>imutável</strong>. A assinatura gera um
            hash SHA-256 vinculado ao conteúdo atual.
          </p>
        </div>

        <div className="space-y-2.5">
          {/* Checkbox 1 */}
          <label className="flex items-start gap-2 cursor-pointer select-none">
            <input
              id="check-revisado"
              type="checkbox"
              checked={checkRevisado}
              onChange={(e) => setCheckRevisado(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-amber-600 shrink-0"
            />
            <span className="text-[10px] text-amber-700 leading-tight">
              Revisei todas as informações do prontuário
            </span>
          </label>

          {/* Checkbox 2 — só se tiver rascunho IA */}
          {temRascunhoIA && (
            <label className="flex items-start gap-2 cursor-pointer select-none">
              <input
                id="check-ia-revisada"
                type="checkbox"
                checked={checkIARevisada}
                onChange={(e) => setCheckIARevisada(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-amber-600 shrink-0"
              />
              <span className="text-[10px] text-amber-700 leading-tight">
                O rascunho gerado pela IA foi revisado e ajustado por mim
              </span>
            </label>
          )}

          {/* Checkbox 3 */}
          <label className="flex items-start gap-2 cursor-pointer select-none">
            <input
              id="check-verificado"
              type="checkbox"
              checked={checkVerificado}
              onChange={(e) => setCheckVerificado(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-amber-600 shrink-0"
            />
            <span className="text-[10px] text-amber-700 leading-tight">
              As informações geradas por IA foram verificadas e são de minha responsabilidade
            </span>
          </label>
        </div>

        <div className="flex gap-2">
          <button
            id="confirmar-assinatura-btn"
            type="button"
            onClick={assinar}
            disabled={loading || !todosMarcados}
            className="flex-1 py-2.5 rounded-xl bg-green-600 text-white text-[10px] font-black uppercase tracking-wide hover:bg-green-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? "Assinando..." : "Assinar Prontuário Digitalmente"}
          </button>
          <button
            type="button"
            onClick={() => {
              setConfirmando(false);
              setCheckRevisado(false);
              setCheckIARevisada(false);
              setCheckVerificado(false);
            }}
            className="px-4 py-2 rounded-xl border border-warm-200 text-[10px] text-slate-500 hover:bg-warm-50 transition-colors font-black uppercase"
          >
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  // ── Botão de assinar ──────────────────────────────────────────
  const bloqueado = temRascunhoIA && !iaRevisado;

  return (
    <div className="space-y-2">
      {bloqueado && (
        <div className="px-3 py-2 rounded-xl bg-amber-50 border border-amber-200">
          <p className="text-[10px] text-amber-700 font-medium flex items-center gap-1">
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none" className="shrink-0"><path d="M7 1.167L12.833 11.083H1.167L7 1.167z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/><path d="M7 5.833v2.334M7 10h.008" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
            Edite o rascunho da IA antes de assinar o prontuário.
          </p>
        </div>
      )}
      <button
        id="iniciar-assinatura-btn"
        type="button"
        disabled={bloqueado}
        onClick={() => setConfirmando(true)}
        title={bloqueado ? "Edite o rascunho antes de assinar" : "Assinar prontuário digitalmente"}
        className={[
          "w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed text-[10px] font-black uppercase tracking-wide transition-all",
          bloqueado
            ? "border-amber-200 text-amber-400 cursor-not-allowed opacity-70"
            : "border-warm-300 text-slate-400 hover:border-primary hover:text-primary hover:bg-primary/5",
        ].join(" ")}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-4 h-4">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
          />
        </svg>
        {bloqueado ? "Revise o rascunho IA primeiro" : "Revisar e Assinar Prontuário"}
      </button>
    </div>
  );
}
