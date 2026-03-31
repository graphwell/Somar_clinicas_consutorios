"use client";
import React, { useState } from "react";
import { fetchWithAuth } from "@/lib/api-utils";
import { useToast } from "@/components/ui/Toast";
import { SkeletonLines } from "@/components/ui/Skeleton";
import AvisoIA from "./AvisoIA";

interface SynkaProntuarioPanelProps {
  tipo: string;
  especialidade?: string;
  queixaPrincipal?: string;
  transcricao?: string;
  historicoMedico?: string;
  medicamentos?: string;
  alergias?: string;
  onSoapGerado: (soap: {
    soapSubjetivo: string;
    soapObjetivo: string;
    soapAvaliacao: string;
    soapPlano: string;
    cidsSugeridos?: Array<{ codigo: string; descricao: string; relevancia: number }>;
  }) => void;
  onPerguntasGeradas?: (perguntas: Array<{ id: number; pergunta: string; tipo: string }>) => void;
  onCidSelecionado?: (codigo: string, descricao: string) => void;
  cidsSugeridosExternos?: Array<{ codigo: string; descricao: string; relevancia: number }>;
}

export default function SynkaProntuarioPanel({
  tipo,
  especialidade,
  queixaPrincipal,
  transcricao,
  historicoMedico,
  medicamentos,
  alergias,
  onSoapGerado,
  onPerguntasGeradas,
  onCidSelecionado,
  cidsSugeridosExternos,
}: SynkaProntuarioPanelProps) {
  const { toast } = useToast();
  const [loadingSOAP, setLoadingSOAP] = useState(false);
  const [loadingPerguntas, setLoadingPerguntas] = useState(false);
  const [soapGerado, setSoapGerado] = useState(false);
  const [perguntasGeradas, setPerguntasGeradas] = useState(false);
  const [abas, setAbas] = useState<"acoes" | "interacoes">("acoes");
  const [novoMed, setNovoMed] = useState("");
  const [loadingInteracao, setLoadingInteracao] = useState(false);
  const [interacoes, setInteracoes] = useState<any>(null);

  async function gerarSOAP() {
    setLoadingSOAP(true);
    try {
      const res = await fetchWithAuth("/api/prontuario/ia/rascunho", {
        method: "POST",
        body: JSON.stringify({
          tipo,
          especialidade,
          queixaPrincipal,
          transcricao,
          historicoMedico,
          medicamentos,
          alergias,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      onSoapGerado(data);
      setSoapGerado(true);
      toast.success("Rascunho SOAP gerado com sucesso!");
    } catch (e: any) {
      toast.error("Erro ao gerar SOAP: " + e.message);
    } finally {
      setLoadingSOAP(false);
    }
  }

  async function gerarPerguntas() {
    setLoadingPerguntas(true);
    try {
      const res = await fetchWithAuth("/api/prontuario/ia/perguntas", {
        method: "POST",
        body: JSON.stringify({ tipo, especialidade, queixaPrincipal, historicoMedico }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      onPerguntasGeradas?.(data.perguntas || []);
      setPerguntasGeradas(true);
      toast.success("Perguntas de anamnese geradas!");
    } catch (e: any) {
      toast.error("Erro ao gerar perguntas: " + e.message);
    } finally {
      setLoadingPerguntas(false);
    }
  }

  async function verificarInteracao() {
    if (!novoMed.trim()) return;
    setLoadingInteracao(true);
    try {
      const res = await fetchWithAuth("/api/prontuario/ia/interacoes", {
        method: "POST",
        body: JSON.stringify({
          medicamentosAtuais: medicamentos,
          novoMedicamento: novoMed,
          alergias,
        }),
      });
      const data = await res.json();
      setInteracoes(data);
    } catch {
      toast.error("Erro ao verificar interações");
    } finally {
      setLoadingInteracao(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-warm-100">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-sage-400 to-sage-600 flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="white" className="w-3.5 h-3.5">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span className="text-sm font-semibold text-slate-700 font-display">Synka IA</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-sage-100 text-sage-600 font-medium">
            Assistente Clínico
          </span>
        </div>
        <p className="text-[11px] text-slate-300">
          IA especializada em {especialidade || "clínica geral"}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-warm-100">
        {(["acoes", "interacoes"] as const).map((aba) => (
          <button
            key={aba}
            onClick={() => setAbas(aba)}
            className={[
              "flex-1 py-2 text-xs font-medium transition-colors",
              abas === aba
                ? "text-sage-600 border-b-2 border-sage-500"
                : "text-slate-300 hover:text-slate-500",
            ].join(" ")}
          >
            {aba === "acoes" ? "Ações IA" : "Interações"}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {abas === "acoes" && (
          <>
            {/* Generate SOAP */}
            <div className="p-3 rounded-xl bg-sage-50 border border-sage-100">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-xs font-semibold text-sage-700">Gerar rascunho SOAP</p>
                  <p className="text-[11px] text-sage-600 mt-0.5">
                    Usa transcrição + queixa para redigir automaticamente
                  </p>
                </div>
                {soapGerado && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-600">
                    Gerado
                  </span>
                )}
              </div>
              <button
                onClick={gerarSOAP}
                disabled={loadingSOAP}
                className="w-full py-2 rounded-lg bg-sage-500 text-white text-xs font-medium hover:bg-sage-600 transition-colors disabled:opacity-60 flex items-center justify-center gap-1.5"
              >
                {loadingSOAP ? (
                  <>
                    <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="4" opacity="0.25" />
                      <path d="M4 12a8 8 0 018-8V0" stroke="white" strokeWidth="4" />
                    </svg>
                    Gerando SOAP...
                  </>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-3.5 h-3.5">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    {soapGerado ? "Regenerar SOAP" : "Gerar SOAP"}
                  </>
                )}
              </button>
            </div>

            {/* Dynamic questions */}
            {onPerguntasGeradas && (
              <div className="p-3 rounded-xl bg-blue-50 border border-blue-100">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-xs font-semibold text-blue-700">Perguntas de Anamnese</p>
                    <p className="text-[11px] text-blue-600 mt-0.5">
                      Gera perguntas específicas para a queixa
                    </p>
                  </div>
                  {perguntasGeradas && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-600">
                      Geradas
                    </span>
                  )}
                </div>
                <button
                  onClick={gerarPerguntas}
                  disabled={loadingPerguntas}
                  className="w-full py-2 rounded-lg bg-blue-500 text-white text-xs font-medium hover:bg-blue-600 transition-colors disabled:opacity-60"
                >
                  {loadingPerguntas ? "Gerando..." : "Sugerir perguntas"}
                </button>
              </div>
            )}

            {/* Tips */}
            <div className="p-3 rounded-xl bg-warm-50 border border-warm-100">
              <p className="text-[11px] font-medium text-slate-500 mb-2">Dicas clínicas</p>
              <ul className="space-y-1.5 text-[11px] text-slate-400">
                <li className="flex items-start gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-sage-400 mt-1.5 shrink-0" />
                  Grave a consulta para transcrição automática mais precisa
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-sage-400 mt-1.5 shrink-0" />
                  Revise sempre o rascunho da IA antes de salvar
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-sage-400 mt-1.5 shrink-0" />
                  Assine digitalmente após concluir para garantir integridade
                </li>
              </ul>
            </div>
          </>
        )}

        {abas === "interacoes" && (
          <>
            <div className="p-3 rounded-xl bg-warm-50 border border-warm-100">
              <p className="text-xs font-medium text-slate-700 mb-2">Verificar interação medicamentosa</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={novoMed}
                  onChange={(e) => setNovoMed(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && verificarInteracao()}
                  placeholder="Nome do medicamento..."
                  className="flex-1 h-8 px-3 rounded-lg border border-warm-200 text-xs text-slate-700 focus:outline-none focus:border-sage-400"
                />
                <button
                  onClick={verificarInteracao}
                  disabled={loadingInteracao || !novoMed.trim()}
                  className="px-3 py-1.5 rounded-lg bg-sage-500 text-white text-xs font-medium hover:bg-sage-600 transition-colors disabled:opacity-60"
                >
                  {loadingInteracao ? "..." : "Verificar"}
                </button>
              </div>
              {medicamentos && (
                <p className="text-[10px] text-slate-300 mt-1.5">
                  Medicamentos em uso: {medicamentos}
                </p>
              )}
            </div>

            {loadingInteracao && <SkeletonLines lines={4} />}

            {interacoes && !loadingInteracao && (
              <div className="space-y-2">
                {interacoes.seguro && interacoes.interacoes?.length === 0 ? (
                  <div className="p-3 rounded-xl bg-green-50 border border-green-200">
                    <p className="text-xs font-medium text-green-700">Nenhuma interação detectada</p>
                    <p className="text-[11px] text-green-600 mt-0.5">
                      Não foram encontradas interações conhecidas com os medicamentos em uso.
                    </p>
                  </div>
                ) : (
                  interacoes.interacoes?.map((inter: any, i: number) => (
                    <div
                      key={i}
                      className={[
                        "p-3 rounded-xl border",
                        inter.gravidade === "GRAVE" || inter.gravidade === "CONTRAINDICADO"
                          ? "bg-red-50 border-red-200"
                          : inter.gravidade === "MODERADA"
                          ? "bg-orange-50 border-orange-200"
                          : "bg-gold-50 border-gold-200",
                      ].join(" ")}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={[
                            "text-[10px] px-1.5 py-0.5 rounded-full font-medium",
                            inter.gravidade === "GRAVE" || inter.gravidade === "CONTRAINDICADO"
                              ? "bg-red-100 text-red-600"
                              : inter.gravidade === "MODERADA"
                              ? "bg-orange-100 text-orange-600"
                              : "bg-gold-100 text-gold-600",
                          ].join(" ")}
                        >
                          {inter.gravidade}
                        </span>
                        <span className="text-xs font-medium text-slate-700">
                          {inter.medicamento1} + {inter.medicamento2}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600">{inter.descricao}</p>
                      {inter.recomendacao && (
                        <p className="text-[11px] text-slate-500 mt-1 font-medium">
                          → {inter.recomendacao}
                        </p>
                      )}
                    </div>
                  ))
                )}

                {interacoes.alertas?.map((alerta: any, i: number) => (
                  <div key={i} className="p-3 rounded-xl bg-red-50 border border-red-200">
                    <p className="text-[11px] text-red-700 font-medium">{alerta.tipo}</p>
                    <p className="text-[11px] text-red-600">{alerta.mensagem}</p>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* CIDs Sugeridos (se houver e tiver callback) */}
      {onCidSelecionado && cidsSugeridosExternos && cidsSugeridosExternos.length > 0 && (
        <div className="px-4 py-3 border-t border-warm-100 space-y-2">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">CIDs sugeridos pela IA</p>
          {cidsSugeridosExternos.slice(0, 4).map((cid, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onCidSelecionado(cid.codigo, cid.descricao)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-primary-soft hover:bg-primary/10 border border-primary/10 transition-all text-left"
            >
              <span className="text-[9px] font-black font-mono text-primary shrink-0">{cid.codigo}</span>
              <div className="flex-1 min-w-0">
                <p className="text-[9px] text-slate-600 truncate">{cid.descricao}</p>
                <div className="mt-0.5 h-1 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary/60"
                    style={{ width: `${Math.round((cid.relevancia ?? 0.5) * 100)}%` }}
                  />
                </div>
              </div>
              <span className="text-[8px] font-black text-primary shrink-0">
                {Math.round((cid.relevancia ?? 0.5) * 100)}%
              </span>
            </button>
          ))}
          <AvisoIA nivel="medio" mensagem="CIDs sugeridos pela IA — confirme antes de adicionar." />
        </div>
      )}

      {/* Rodapé fixo — AvisoIA sempre visível */}
      <div className="shrink-0 px-4 py-3 border-t border-warm-100 bg-warm-50">
        <AvisoIA
          nivel="baixo"
          mensagem="Synka IA auxilia — a responsabilidade clínica é do profissional."
        />
      </div>
    </div>
  );
}
