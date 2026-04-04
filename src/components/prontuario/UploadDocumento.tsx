"use client";
import React, { useRef, useState, useEffect } from "react";
import AvisoIA from "./AvisoIA";

interface MedicamentoExtraido {
  nome: string;
  dosagem: string;
  posologia: string;
  quantidade: string | null;
}

interface DocumentoExtraido {
  tipo: string;
  data: string | null;
  profissional: string | null;
  crm: string | null;
  especialidade: string | null;
  medicamentos: MedicamentoExtraido[];
  diagnostico: string | null;
  observacoes: string | null;
  resumo: string;
  erro?: boolean;
}

interface UploadDocumentoProps {
  /** Chamado ao clicar "Adicionar ao prontuário" */
  onAdicionar: (dados: DocumentoExtraido) => void;
  disabled?: boolean;
}

const TIPO_LABEL: Record<string, string> = {
  receita: "Receita médica",
  laudo: "Laudo",
  exame: "Resultado de exame",
  foto: "Foto clínica",
  outro: "Documento",
};

function formatarContadorRegressivo(deletarEm: Date): string {
  const diff = deletarEm.getTime() - Date.now();
  if (diff <= 0) return "0h 0min";
  const horas = Math.floor(diff / (1000 * 60 * 60));
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return `${horas}h ${mins}min`;
}

export default function UploadDocumento({ onAdicionar, disabled }: UploadDocumentoProps) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const galeriaRef = useRef<HTMLInputElement>(null);
  const pdfRef = useRef<HTMLInputElement>(null);

  const [estado, setEstado] = useState<"idle" | "lendo" | "resultado" | "erro">("idle");
  const [resultado, setResultado] = useState<DocumentoExtraido | null>(null);
  const [deletarEm, setDeletarEm] = useState<Date | null>(null);
  const [contador, setContador] = useState("");
  const [consentimentoOk, setConsentimentoOk] = useState(false);

  // Contador regressivo LGPD
  useEffect(() => {
    if (!deletarEm) return;
    const interval = setInterval(() => {
      setContador(formatarContadorRegressivo(deletarEm));
    }, 30000);
    setContador(formatarContadorRegressivo(deletarEm));
    return () => clearInterval(interval);
  }, [deletarEm]);

  async function processarArquivo(file: File) {
    if (!consentimentoOk) {
      alert("Confirme o consentimento LGPD antes de enviar o documento.");
      return;
    }

    setEstado("lendo");
    setResultado(null);

    try {
      const formData = new FormData();
      formData.append("arquivo", file);

      const res = await fetch("/api/prontuario/ia/ler-documento", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("synka-token") || ""}`,
        },
        body: formData,
      });

      if (!res.ok) throw new Error("Erro ao processar documento");

      const dados: DocumentoExtraido = await res.json();
      setResultado(dados);
      setEstado("resultado");

      // Registrar data de deleção LGPD (48h)
      const prazo = new Date(Date.now() + 48 * 60 * 60 * 1000);
      setDeletarEm(prazo);
    } catch {
      setEstado("erro");
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processarArquivo(file);
    // Reset input para permitir reenvio do mesmo arquivo
    e.target.value = "";
  }

  function resetar() {
    setEstado("idle");
    setResultado(null);
    setDeletarEm(null);
    setContador("");
  }

  return (
    <div className="space-y-3">
      {/* Consentimento LGPD */}
      {estado === "idle" && (
        <label className="flex items-start gap-2 cursor-pointer select-none">
          <input
            id="consentimento-upload"
            type="checkbox"
            checked={consentimentoOk}
            onChange={(e) => setConsentimentoOk(e.target.checked)}
            className="mt-0.5 w-4 h-4 accent-[var(--primary,#4a4ae2)] shrink-0"
          />
          <span className="text-[10px] text-slate-500 leading-tight">
            Autorizo o processamento temporário deste documento pela IA. O arquivo será
            excluído automaticamente em <strong>48 horas</strong> (LGPD).
          </span>
        </label>
      )}

      {/* Área de upload */}
      {estado === "idle" && (
        <div className="border border-dashed border-slate-200 rounded-2xl p-4 bg-slate-50 space-y-3">
          <div className="flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400 shrink-0"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/></svg>
            <div>
              <p className="text-[11px] font-black uppercase tracking-widest text-slate-600">
                Anexar documento do paciente
              </p>
              <p className="text-[9px] text-slate-400">Receita, laudo, exame, foto clínica</p>
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            {/* Câmera (traseira) */}
            <button
              id="upload-camera-btn"
              type="button"
              disabled={disabled || !consentimentoOk}
              onClick={() => cameraRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 text-[10px] font-black text-slate-600 hover:border-blue-400 hover:text-blue-600 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>
              Câmera
            </button>
            <input
              ref={cameraRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleFileChange}
            />

            {/* Galeria */}
            <button
              id="upload-galeria-btn"
              type="button"
              disabled={disabled || !consentimentoOk}
              onClick={() => galeriaRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 text-[10px] font-black text-slate-600 hover:border-purple-400 hover:text-purple-600 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
              Galeria
            </button>
            <input
              ref={galeriaRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />

            {/* PDF */}
            <button
              id="upload-pdf-btn"
              type="button"
              disabled={disabled || !consentimentoOk}
              onClick={() => pdfRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 text-[10px] font-black text-slate-600 hover:border-red-400 hover:text-red-600 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              PDF
            </button>
            <input
              ref={pdfRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        </div>
      )}

      {/* Loading */}
      {estado === "lendo" && (
        <div className="flex items-center gap-3 px-4 py-4 rounded-2xl bg-blue-50 border border-blue-200">
          <svg className="w-5 h-5 animate-spin text-blue-500 shrink-0" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" opacity="0.25" />
            <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
          </svg>
          <div>
            <p className="text-[11px] font-black text-blue-700 uppercase tracking-wide">
              Lendo documento com IA...
            </p>
            <p className="text-[9px] text-blue-500">Identificando medicamentos e informações</p>
          </div>
        </div>
      )}

      {/* Resultado */}
      {estado === "resultado" && resultado && (
        <div className="space-y-3">
          {/* Card de extração */}
          <div className="border border-card-border rounded-2xl bg-white overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex items-center text-slate-400">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                </span>
                <div>
                  <p className="text-[11px] font-black text-slate-700 uppercase tracking-wide">
                    {TIPO_LABEL[resultado.tipo] || "Documento"}
                  </p>
                  {resultado.data && (
                    <p className="text-[9px] text-slate-400">{resultado.data}</p>
                  )}
                </div>
              </div>
              <button
                id="upload-resetar-btn"
                type="button"
                onClick={resetar}
                className="flex items-center gap-1 text-[9px] text-slate-400 hover:text-red-500 font-black"
              >
                <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M9 3L3 9M3 3l6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                Cancelar
              </button>
            </div>

            {/* Profissional */}
            {resultado.profissional && (
              <div className="px-4 py-2 border-b border-slate-50">
                <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">
                  Profissional
                </p>
                <p className="text-[11px] font-black text-slate-700">
                  {resultado.profissional}
                  {resultado.crm ? ` · CRM ${resultado.crm}` : ""}
                </p>
              </div>
            )}

            {/* Diagnóstico */}
            {resultado.diagnostico && (
              <div className="px-4 py-2 border-b border-slate-50">
                <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">
                  Diagnóstico / Achado
                </p>
                <p className="text-[11px] text-slate-700">{resultado.diagnostico}</p>
              </div>
            )}

            {/* Medicamentos */}
            {resultado.medicamentos.length > 0 && (
              <div className="px-4 py-3 space-y-2">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                  Medicamentos encontrados
                </p>
                {resultado.medicamentos.map((med, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-[10px] text-slate-300 mt-0.5">•</span>
                    <div>
                      <span className="text-[11px] font-black text-slate-700">
                        {med.nome}
                        {med.dosagem ? ` ${med.dosagem}` : ""}
                      </span>
                      {med.posologia && (
                        <span className="text-[10px] text-slate-400"> — {med.posologia}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Observações */}
            {resultado.observacoes && (
              <div className="px-4 py-2 border-t border-slate-50">
                <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">
                  Observações
                </p>
                <p className="text-[10px] text-slate-600 leading-relaxed">
                  {resultado.observacoes}
                </p>
              </div>
            )}

            {/* Botão adicionar */}
            <div className="px-4 py-3 border-t border-slate-100">
              <button
                id="upload-adicionar-btn"
                type="button"
                onClick={() => onAdicionar(resultado)}
                className="w-full py-2.5 rounded-xl bg-[var(--primary,#4a4ae2)] text-white text-[10px] font-black uppercase tracking-wide hover:opacity-90 transition-opacity"
              >
                Adicionar ao prontuário
              </button>
            </div>
          </div>

          {/* Aviso IA alto */}
          <AvisoIA
            nivel="alto"
            mensagem={`Extraído por IA — confira o documento original. ${deletarEm ? `Arquivo será deletado automaticamente em ${contador || "48h"} (LGPD).` : ""}`}
          />

          {/* Contador regressivo LGPD */}
          {deletarEm && (
            <div className="flex items-center gap-1.5 text-[9px] text-slate-400">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
              <span>
                Arquivo deletado automaticamente em <strong>{contador}</strong>
              </span>
            </div>
          )}
        </div>
      )}

      {/* Erro */}
      {estado === "erro" && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-red-50 border border-red-200">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-red-400 shrink-0"><circle cx="12" cy="12" r="10" fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="1.5"/><path d="M8 8l8 8M16 8l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
          <div className="flex-1">
            <p className="text-[11px] font-black text-red-700">Erro ao ler o documento</p>
            <p className="text-[9px] text-red-500">
              Verifique se o arquivo é legível e tente novamente.
            </p>
          </div>
          <button
            type="button"
            onClick={resetar}
            className="text-[9px] text-red-400 hover:text-red-600 font-black shrink-0"
          >
            Tentar novamente
          </button>
        </div>
      )}
    </div>
  );
}
