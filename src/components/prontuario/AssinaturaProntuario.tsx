"use client";
import React, { useState } from "react";
import { fetchWithAuth } from "@/lib/api-utils";
import { useToast } from "@/components/ui/Toast";

interface AssinaturaProntuarioProps {
  prontuarioId: string;
  assinado: boolean;
  assinadoEm?: string | null;
  assinaturaHash?: string | null;
  onAssinado: (hash: string, data: string) => void;
}

export default function AssinaturaProntuario({
  prontuarioId,
  assinado,
  assinadoEm,
  assinaturaHash,
  onAssinado,
}: AssinaturaProntuarioProps) {
  const { toast } = useToast();
  const [confirmando, setConfirmando] = useState(false);
  const [loading, setLoading] = useState(false);

  async function assinar() {
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

  if (assinado && assinaturaHash) {
    return (
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
          <p className="text-sm font-medium text-green-700">Prontuário assinado digitalmente</p>
          {assinadoEm && (
            <p className="text-xs text-green-600 mt-0.5">
              {new Date(assinadoEm).toLocaleString("pt-BR")}
            </p>
          )}
          <p className="text-[10px] font-mono text-green-500/70 mt-1 truncate">
            SHA-256: {assinaturaHash}
          </p>
        </div>
      </div>
    );
  }

  if (confirmando) {
    return (
      <div className="px-4 py-3 rounded-xl bg-gold-50 border border-gold-200">
        <p className="text-sm font-medium text-gold-600 mb-1">Confirmar assinatura digital?</p>
        <p className="text-xs text-gold-500 mb-3">
          Após assinar, este prontuário não poderá ser editado. A assinatura é irreversível e
          gera um hash SHA-256 vinculado ao conteúdo atual.
        </p>
        <div className="flex gap-2">
          <button
            onClick={assinar}
            disabled={loading}
            className="flex-1 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-60"
          >
            {loading ? "Assinando..." : "Confirmar e Assinar"}
          </button>
          <button
            onClick={() => setConfirmando(false)}
            className="px-4 py-2 rounded-lg border border-warm-200 text-sm text-slate-500 hover:bg-warm-50 transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirmando(true)}
      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-warm-300 text-sm text-slate-300 hover:border-sage-400 hover:text-sage-600 hover:bg-sage-50 transition-all"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-4 h-4">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
        />
      </svg>
      Assinar Prontuário Digitalmente
    </button>
  );
}
