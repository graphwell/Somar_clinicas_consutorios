"use client";
import React, { useState, useEffect, useRef } from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { fetchWithAuth } from "@/lib/api-utils";
import { useNicho } from "@/context/NichoContext";

interface Props {
  open: boolean;
  onClose: () => void;
  profissionalId?: string;
  horario?: string;
  data: Date;
  profissionais: any[];
  onSuccess: () => void;
}

type Step = 1 | 2 | 3;
type TipoAtendimento = "particular" | "convenio" | "plano_assinatura";
type TipoCobranca = "plano" | "normal";

interface ConvenioVerify {
  aceita: boolean;
  semConfiguracao?: boolean;
  aviso?: string;
  mensagem?: string;
  detalhe?: string;
  conveniosAceitos?: { id: string; nome: string }[];
  preco?: number | null;
}

interface PlanoInfo {
  temPlano: boolean;
  planoNome?: string;
  assinaturaId?: string;
  servicoIncluso?: boolean;
  tipo?: "ilimitado" | "limitado";
  usado?: number;
  limite?: number | null;
  saldoRestante?: number | null;
  descontoExtra?: number | null;
  cobrarNormal?: boolean;
}

const NICHOS_BELEZA = ["SALAO_BELEZA", "BARBEARIA", "CLINICA_ESTETICA"];

export default function ModalAgendamento({
  open,
  onClose,
  profissionalId,
  horario,
  data,
  profissionais,
  onSuccess,
}: Props) {
  const { nicho } = useNicho();
  const ehBeleza = NICHOS_BELEZA.includes(nicho);

  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Step 1 — paciente
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedPaciente, setSelectedPaciente] = useState<any>(null);
  const [novoNome, setNovoNome] = useState("");
  const [novoTel, setNovoTel] = useState("");
  const [criarNovo, setCriarNovo] = useState(false);

  // Step 2 — serviço/profissional
  const [servicos, setServicos] = useState<any[]>([]);
  const [selectedServico, setSelectedServico] = useState<any>(null);
  const [selectedProfId, setSelectedProfId] = useState(profissionalId || "");
  const [selectedDate, setSelectedDate] = useState(
    `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`
  );
  const [selectedHora, setSelectedHora] = useState(horario || "09:00");
  const [comboSugestao, setComboSugestao] = useState<any>(null);
  const [adicionarCombo, setAdicionarCombo] = useState(false);

  // Convênio (saúde)
  const [tipoAtendimento, setTipoAtendimento] = useState<TipoAtendimento>("particular");
  const [convenios, setConvenios] = useState<any[]>([]);
  const [selectedConvenioId, setSelectedConvenioId] = useState("");
  const [convenioVerify, setConvenioVerify] = useState<ConvenioVerify | null>(null);
  const [verifyingConvenio, setVerifyingConvenio] = useState(false);
  const verifyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Plano (beleza)
  const [planoInfo, setPlanoInfo] = useState<PlanoInfo | null>(null);
  const [tipoCobranca, setTipoCobranca] = useState<TipoCobranca>("normal");
  const [verificandoPlano, setVerificandoPlano] = useState(false);

  // Step 3
  const [enviarLembrete, setEnviarLembrete] = useState(true);

  // Reset ao abrir
  useEffect(() => {
    if (open) {
      setStep(1);
      setError("");
      setSelectedPaciente(null);
      setSearch("");
      setSearchResults([]);
      setCriarNovo(false);
      setNovoNome("");
      setNovoTel("");
      setSelectedServico(null);
      setSelectedProfId(profissionalId || "");
      setSelectedDate(`${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`);
      setSelectedHora(horario || "09:00");
      setComboSugestao(null);
      setAdicionarCombo(false);
      setEnviarLembrete(true);
      setTipoAtendimento("particular");
      setSelectedConvenioId("");
      setConvenioVerify(null);
      setPlanoInfo(null);
      setTipoCobranca("normal");
    }
  }, [open, profissionalId, horario, data]);

  // Buscar serviços e convênios ao abrir
  useEffect(() => {
    if (open) {
      fetchWithAuth("/api/services")
        .then((r) => r.json())
        .then((d) => setServicos(Array.isArray(d) ? d : []))
        .catch(() => {});
      if (!ehBeleza) {
        fetchWithAuth("/api/convenios")
          .then((r) => r.json())
          .then((d) => setConvenios(Array.isArray(d) ? d.filter((c: any) => c.ativo) : []))
          .catch(() => {});
      }
    }
  }, [open, ehBeleza]);

  // Verificar plano quando paciente + serviço selecionados (beleza)
  useEffect(() => {
    if (!ehBeleza || !selectedPaciente?.id) {
      setPlanoInfo(null);
      return;
    }
    const servicoId = selectedServico?.id || "";
    setVerificandoPlano(true);
    fetchWithAuth(`/api/subscriptions/verificar?pacienteId=${selectedPaciente.id}&servicoId=${servicoId}`)
      .then((r) => r.json())
      .then((d: PlanoInfo) => {
        setPlanoInfo(d);
        if (d.temPlano && d.servicoIncluso && (d.limite === null || (d.usado ?? 0) < (d.limite ?? Infinity))) {
          setTipoCobranca("plano");
        } else {
          setTipoCobranca("normal");
        }
      })
      .catch(() => setPlanoInfo(null))
      .finally(() => setVerificandoPlano(false));
  }, [ehBeleza, selectedPaciente?.id, selectedServico?.id]);

  // Verificar convênio com debounce quando profissional + convênio selecionados (saúde)
  useEffect(() => {
    if (ehBeleza || tipoAtendimento !== "convenio" || !selectedConvenioId || !selectedProfId) {
      setConvenioVerify(null);
      return;
    }
    if (verifyTimeoutRef.current) clearTimeout(verifyTimeoutRef.current);
    verifyTimeoutRef.current = setTimeout(() => {
      setVerifyingConvenio(true);
      fetchWithAuth(`/api/convenios/verificar?profissionalId=${selectedProfId}&convenioId=${selectedConvenioId}`)
        .then((r) => r.json())
        .then((d) => setConvenioVerify(d))
        .catch(() => setConvenioVerify(null))
        .finally(() => setVerifyingConvenio(false));
    }, 400);
    return () => { if (verifyTimeoutRef.current) clearTimeout(verifyTimeoutRef.current); };
  }, [ehBeleza, tipoAtendimento, selectedConvenioId, selectedProfId]);

  // Busca de paciente com debounce
  useEffect(() => {
    if (!search || search.length < 2) {
      setSearchResults([]);
      return;
    }
    const t = setTimeout(() => {
      setSearching(true);
      fetchWithAuth(`/api/patients?q=${encodeURIComponent(search)}`)
        .then((r) => r.json())
        .then((d) => setSearchResults(Array.isArray(d) ? d.slice(0, 6) : []))
        .catch(() => {})
        .finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  // Sugestão de combo ao selecionar serviço
  async function checkCombo(servicoId: string) {
    try {
      const r = await fetchWithAuth(`/api/marketing/sugestao-combo?servico=${servicoId}`);
      const d = await r.json();
      const combos = Array.isArray(d) ? d : d.combos || [];
      setComboSugestao(combos[0] || null);
    } catch {}
  }

  async function handleSubmit() {
    setLoading(true);
    setError("");
    try {
      let pacienteId = selectedPaciente?.id;

      if (criarNovo) {
        if (!novoNome || !novoTel) {
          setError("Nome e telefone são obrigatórios");
          setLoading(false);
          return;
        }
        const r = await fetchWithAuth("/api/patients", {
          method: "POST",
          body: JSON.stringify({ nome: novoNome, telefone: novoTel }),
        });
        const p = await r.json();
        pacienteId = p.id;
      }

      if (!pacienteId) {
        setError("Selecione ou cadastre um paciente");
        setLoading(false);
        return;
      }

      const dataHora = `${selectedDate}T${selectedHora}:00-03:00`;
      const duration = selectedServico?.duracaoMinutos || 30;

      // Determinar tipoAtendimento final
      let tipoFinal: TipoAtendimento = "particular";
      let convenioNome: string | null = null;

      if (ehBeleza) {
        tipoFinal = tipoCobranca === "plano" ? "plano_assinatura" : "particular";
      } else {
        tipoFinal = tipoAtendimento;
        if (tipoAtendimento === "convenio") {
          const convenioSelecionado = convenios.find((c) => c.id === selectedConvenioId);
          convenioNome = convenioSelecionado?.nomeConvenio || null;
        }
      }

      const resp = await fetchWithAuth("/api/appointments", {
        method: "POST",
        body: JSON.stringify({
          pacienteId,
          profissionalId: selectedProfId || undefined,
          servicoId: selectedServico?.id || undefined,
          dataHora,
          durationMinutes: duration,
          status: "pendente",
          tipoAtendimento: tipoFinal,
          convenio: convenioNome,
          assinaturaId: tipoFinal === "plano_assinatura" ? planoInfo?.assinaturaId : undefined,
        }),
      });

      if (!resp.ok) {
        const errData = await resp.json();
        if (errData.error === "CONVENIO_NAO_ACEITO") {
          setError(errData.mensagem + (errData.detalhe ? " " + errData.detalhe : ""));
          setLoading(false);
          return;
        }
        throw new Error(errData.error || "Erro ao criar agendamento");
      }

      // Lembrete WhatsApp
      if (enviarLembrete && (selectedPaciente?.telefone || novoTel)) {
        fetchWithAuth("/api/marketing/send-lembrete", {
          method: "POST",
          body: JSON.stringify({
            telefone: selectedPaciente?.telefone || novoTel,
            nome: selectedPaciente?.nome || novoNome,
            dataHora,
            servico: selectedServico?.nome,
          }),
        }).catch(() => {});
      }

      onSuccess();
      onClose();
    } catch (e: any) {
      setError(e.message || "Erro ao criar agendamento. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  const profissionalSelecionado = profissionais.find((p) => p.id === selectedProfId);
  const convenioSelecionado = convenios.find((c) => c.id === selectedConvenioId);

  // Bloquear submit se convenio não aceito (saúde)
  const convenioConflito = !ehBeleza && tipoAtendimento === "convenio" && selectedConvenioId && selectedProfId && convenioVerify && !convenioVerify.aceita;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        step === 1 ? "Selecionar paciente" :
        step === 2 ? "Serviço e horário" :
        "Confirmar agendamento"
      }
      footer={
        <div className="flex gap-2 w-full">
          {step > 1 && (
            <Button variant="secondary" onClick={() => setStep((s) => (s - 1) as Step)}>
              Voltar
            </Button>
          )}
          <div className="flex-1" />
          {step < 3 ? (
            <Button
              variant="primary"
              onClick={() => {
                if (step === 1 && !selectedPaciente && !criarNovo) {
                  setError("Selecione um paciente");
                  return;
                }
                setError("");
                setStep((s) => (s + 1) as Step);
              }}
            >
              Continuar
            </Button>
          ) : (
            <Button variant="primary" loading={loading} onClick={handleSubmit} disabled={!!convenioConflito}>
              Confirmar agendamento
            </Button>
          )}
        </div>
      }
    >
      {/* Indicador de steps */}
      <div className="flex items-center gap-1 mb-5">
        {[1, 2, 3].map((s) => (
          <React.Fragment key={s}>
            <div
              className={`flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-medium transition-all ${
                s <= step
                  ? "bg-sage-500 text-white"
                  : "bg-warm-200 text-slate-100"
              }`}
            >
              {s}
            </div>
            {s < 3 && <div className={`flex-1 h-0.5 ${s < step ? "bg-sage-500" : "bg-warm-200"}`} />}
          </React.Fragment>
        ))}
      </div>

      {error && (
        <p className="text-xs text-red-500 mb-3 px-1">{error}</p>
      )}

      {/* ── STEP 1: Paciente ── */}
      {step === 1 && (
        <div className="space-y-3">
          <Input
            label="Buscar paciente"
            placeholder="Nome ou telefone…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setSelectedPaciente(null);
            }}
          />
          {searching && (
            <p className="text-[11px] text-slate-100">Buscando…</p>
          )}
          {searchResults.length > 0 && !selectedPaciente && (
            <div className="border border-warm-200 rounded-lg overflow-hidden">
              {searchResults.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setSelectedPaciente(p);
                    setSearch(p.nome);
                    setSearchResults([]);
                    setCriarNovo(false);
                  }}
                  className="w-full text-left px-3 py-2.5 hover:bg-warm-100 transition-colors border-b border-warm-100 last:border-0"
                >
                  <p className="text-sm text-slate-700">{p.nome}</p>
                  <p className="text-[11px] text-slate-100">{p.telefone}</p>
                </button>
              ))}
            </div>
          )}
          {selectedPaciente && (
            <div className="flex items-center justify-between bg-sage-50 border border-sage-100 rounded-lg px-3 py-2">
              <div>
                <p className="text-sm font-medium text-sage-700">{selectedPaciente.nome}</p>
                <p className="text-[11px] text-sage-500">{selectedPaciente.telefone}</p>
              </div>
              <button
                onClick={() => { setSelectedPaciente(null); setSearch(""); }}
                className="text-sage-400 hover:text-sage-600 text-xs"
              >
                Trocar
              </button>
            </div>
          )}
          <button
            onClick={() => { setCriarNovo(!criarNovo); setSelectedPaciente(null); }}
            className="text-[12px] text-sage-600 hover:text-sage-700 underline"
          >
            {criarNovo ? "Buscar paciente existente" : "+ Cadastrar novo paciente"}
          </button>
          {criarNovo && (
            <div className="space-y-3 pt-2">
              <Input label="Nome completo" value={novoNome} onChange={(e) => setNovoNome(e.target.value)} placeholder="Ex: Ana Beatriz Silva" />
              <Input label="Telefone / WhatsApp" value={novoTel} onChange={(e) => setNovoTel(e.target.value)} placeholder="(11) 99999-9999" type="tel" />
            </div>
          )}
        </div>
      )}

      {/* ── STEP 2: Serviço + Profissional + Tipo ── */}
      {step === 2 && (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Serviço</label>
            <select
              className="w-full h-10 px-3 bg-white border border-warm-300 rounded-lg text-sm text-slate-700 focus:outline-none focus:border-sage-500"
              value={selectedServico?.id || ""}
              onChange={(e) => {
                const sv = servicos.find((s) => s.id === e.target.value) || null;
                setSelectedServico(sv);
                if (sv) checkCombo(sv.id);
                else setComboSugestao(null);
              }}
            >
              <option value="">Selecionar serviço…</option>
              {servicos.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nome} {s.duracaoMinutos ? `(${s.duracaoMinutos}min)` : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Profissional</label>
            <select
              className="w-full h-10 px-3 bg-white border border-warm-300 rounded-lg text-sm text-slate-700 focus:outline-none focus:border-sage-500"
              value={selectedProfId}
              onChange={(e) => setSelectedProfId(e.target.value)}
            >
              <option value="">Qualquer profissional</option>
              {profissionais.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Data</label>
              <input
                type="date"
                className="w-full h-10 px-3 bg-white border border-warm-300 rounded-lg text-sm text-slate-700 focus:outline-none focus:border-sage-500"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Horário</label>
              <input
                type="time"
                className="w-full h-10 px-3 bg-white border border-warm-300 rounded-lg text-sm text-slate-700 focus:outline-none focus:border-sage-500"
                value={selectedHora}
                onChange={(e) => setSelectedHora(e.target.value)}
              />
            </div>
          </div>

          {/* ── BELEZA: verificação de plano ── */}
          {ehBeleza && (
            <div>
              {verificandoPlano && (
                <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
                  <span className="w-3 h-3 border border-slate-300 border-t-transparent rounded-full animate-spin inline-block" />
                  Verificando plano…
                </p>
              )}

              {!verificandoPlano && planoInfo?.temPlano && (
                <div className="rounded-xl border border-warm-200 p-4 space-y-3">
                  {/* Cabeçalho do plano */}
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#40916C]/10 flex items-center justify-center shrink-0">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#40916C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-700 truncate">{planoInfo.planoNome}</p>
                      <p className="text-[11px] text-slate-400">Plano ativo</p>
                    </div>
                    <span className="text-[10px] bg-[#40916C]/10 text-[#40916C] px-2 py-1 rounded-full font-medium shrink-0">Ativo</span>
                  </div>

                  {/* Uso do serviço */}
                  {planoInfo.servicoIncluso && selectedServico && (
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-500">{selectedServico.nome}</span>
                        <span className="text-slate-700 font-medium">
                          {planoInfo.usado} de {planoInfo.limite === null ? "∞" : planoInfo.limite} usos
                        </span>
                      </div>
                      {planoInfo.limite !== null && (
                        <div className="h-1.5 bg-warm-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#40916C] rounded-full transition-all"
                            style={{ width: `${Math.min(((planoInfo.usado ?? 0) / (planoInfo.limite ?? 1)) * 100, 100)}%` }}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Opções de cobrança */}
                  <div className="flex flex-col gap-2 pt-1">
                    {/* Usar plano — só se tiver saldo */}
                    {planoInfo.servicoIncluso && !planoInfo.cobrarNormal && (
                      <label className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${tipoCobranca === "plano" ? "border-[#40916C] bg-[#40916C]/5" : "border-warm-200 hover:border-warm-300"}`}>
                        <input
                          type="radio"
                          name="tipoCobranca"
                          value="plano"
                          checked={tipoCobranca === "plano"}
                          onChange={() => setTipoCobranca("plano")}
                          className="accent-[#40916C]"
                        />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-[#40916C]">Usar plano</p>
                          <p className="text-[11px] text-[#40916C]/70">
                            {planoInfo.limite === null
                              ? "Ilimitado — incluso no plano"
                              : `${planoInfo.saldoRestante} uso${(planoInfo.saldoRestante ?? 0) !== 1 ? "s" : ""} restante${(planoInfo.saldoRestante ?? 0) !== 1 ? "s" : ""}`}
                          </p>
                        </div>
                        <span className="text-sm font-medium text-[#40916C]">Grátis</span>
                      </label>
                    )}

                    {/* Limite atingido */}
                    {planoInfo.servicoIncluso && planoInfo.cobrarNormal && (
                      <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
                        <p className="text-xs font-medium text-amber-700">Limite do plano atingido</p>
                        {planoInfo.descontoExtra && (
                          <p className="text-[11px] text-amber-600 mt-0.5">
                            Será cobrado com {planoInfo.descontoExtra}% OFF (benefício do plano)
                          </p>
                        )}
                      </div>
                    )}

                    {/* Pagar normalmente */}
                    <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${tipoCobranca === "normal" ? "border-slate-400" : "border-warm-200 hover:border-warm-300"}`}>
                      <input
                        type="radio"
                        name="tipoCobranca"
                        value="normal"
                        checked={tipoCobranca === "normal"}
                        onChange={() => setTipoCobranca("normal")}
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-700">Pagar normalmente</p>
                        <p className="text-[11px] text-slate-400">
                          {selectedServico?.preco != null
                            ? `R$ ${selectedServico.preco.toFixed(2)} — não debita do plano`
                            : "Não debita do plano"}
                        </p>
                      </div>
                    </label>
                  </div>
                </div>
              )}

              {/* Cliente sem plano — só informa */}
              {!verificandoPlano && planoInfo && !planoInfo.temPlano && selectedPaciente && (
                <p className="text-[11px] text-slate-400 px-1">
                  Pagamento definido na hora do atendimento.
                </p>
              )}
            </div>
          )}

          {/* ── SAÚDE: tipo de atendimento com convênio ── */}
          {!ehBeleza && (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-2">Tipo de atendimento</label>
                <div className="flex gap-2">
                  {(["particular", "convenio"] as const).map((tipo) => (
                    <button
                      key={tipo}
                      onClick={() => { setTipoAtendimento(tipo); setSelectedConvenioId(""); setConvenioVerify(null); }}
                      className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-all ${
                        tipoAtendimento === tipo
                          ? "bg-sage-500 text-white border-sage-500"
                          : "bg-white text-slate-300 border-warm-300 hover:border-sage-300"
                      }`}
                    >
                      {tipo === "particular" ? "Particular" : "Convênio"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Seletor de convênio */}
              {tipoAtendimento === "convenio" && (
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Convênio</label>
                  {convenios.length === 0 ? (
                    <p className="text-xs text-slate-100 bg-warm-50 border border-warm-200 rounded-lg px-3 py-2">
                      Nenhum convênio cadastrado. Acesse <strong>Convênios</strong> no menu para cadastrar.
                    </p>
                  ) : (
                    <select
                      className="w-full h-10 px-3 bg-white border border-warm-300 rounded-lg text-sm text-slate-700 focus:outline-none focus:border-sage-500"
                      value={selectedConvenioId}
                      onChange={(e) => setSelectedConvenioId(e.target.value)}
                    >
                      <option value="">Selecionar convênio…</option>
                      {convenios.map((c) => (
                        <option key={c.id} value={c.id}>{c.nomeConvenio}</option>
                      ))}
                    </select>
                  )}

                  {/* Verificação em tempo real */}
                  {selectedConvenioId && selectedProfId && (
                    <div className="mt-2">
                      {verifyingConvenio ? (
                        <p className="text-[11px] text-slate-100 flex items-center gap-1.5">
                          <span className="w-3 h-3 border border-slate-200 border-t-transparent rounded-full animate-spin inline-block" />
                          Verificando…
                        </p>
                      ) : convenioVerify ? (
                        convenioVerify.aceita ? (
                          <div className="bg-sage-50 border border-sage-200 rounded-xl px-3 py-2 flex items-start gap-2">
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-sage-500 mt-0.5 shrink-0"><path d="M11.667 3.5L5.25 10.5 2.333 7.583" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            <div>
                              <p className="text-[12px] font-medium text-sage-700">
                                {convenioVerify.semConfiguracao ? "Aceita (sem restrições configuradas)" : "Profissional aceita este convênio"}
                              </p>
                              {convenioVerify.preco != null && (
                                <p className="text-[11px] text-sage-500 mt-0.5">
                                  Valor na tabela: {convenioVerify.preco.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                                </p>
                              )}
                              {convenioVerify.aviso && (
                                <p className="text-[11px] text-amber-600 mt-0.5">{convenioVerify.aviso}</p>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                            <p className="text-[12px] font-medium text-red-700">{convenioVerify.mensagem}</p>
                            {convenioVerify.detalhe && (
                              <p className="text-[11px] text-red-500 mt-0.5">{convenioVerify.detalhe}</p>
                            )}
                            {convenioVerify.conveniosAceitos && convenioVerify.conveniosAceitos.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1">
                                {convenioVerify.conveniosAceitos.map((c) => (
                                  <button
                                    key={c.id}
                                    onClick={() => setSelectedConvenioId(c.id)}
                                    className="text-[11px] px-2 py-0.5 bg-white border border-sage-200 text-sage-700 rounded-full hover:bg-sage-50"
                                  >
                                    {c.nome}
                                  </button>
                                ))}
                              </div>
                            )}
                            <p className="text-[11px] text-slate-400 mt-1.5">Escolha outro profissional ou altere para particular.</p>
                          </div>
                        )
                      ) : null}
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* Sugestão de combo */}
          {comboSugestao && (
            <div className="bg-gold-100 border border-gold-500/20 rounded-xl p-3">
              <p className="text-[12px] font-medium text-gold-500 mb-1">
                Que tal aproveitar também?
              </p>
              <p className="text-sm font-medium text-slate-700">{comboSugestao.nome}</p>
              {comboSugestao.descricao && (
                <p className="text-[11px] text-slate-300 mt-0.5">{comboSugestao.descricao}</p>
              )}
              <div className="flex items-center gap-2 mt-2">
                <button
                  onClick={() => setAdicionarCombo(!adicionarCombo)}
                  className={`px-3 py-1 rounded-lg text-[11px] font-medium transition-all ${
                    adicionarCombo
                      ? "bg-gold-500 text-white"
                      : "bg-white border border-gold-500/30 text-gold-500"
                  }`}
                >
                  {adicionarCombo ? "Adicionado" : "Adicionar ao agendamento"}
                </button>
                <button
                  onClick={() => setComboSugestao(null)}
                  className="text-[11px] text-slate-100 hover:text-slate-300"
                >
                  Não, obrigado
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── STEP 3: Confirmação ── */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="bg-warm-100 border border-warm-200 rounded-xl p-4 space-y-2">
            <div className="flex justify-between">
              <span className="text-xs text-slate-100">Paciente</span>
              <span className="text-sm font-medium text-slate-700">
                {selectedPaciente?.nome || novoNome}
              </span>
            </div>
            {selectedServico && (
              <div className="flex justify-between">
                <span className="text-xs text-slate-100">Serviço</span>
                <span className="text-sm font-medium text-slate-700">{selectedServico.nome}</span>
              </div>
            )}
            {profissionalSelecionado && (
              <div className="flex justify-between">
                <span className="text-xs text-slate-100">Profissional</span>
                <span className="text-sm font-medium text-slate-700">{profissionalSelecionado.nome}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-xs text-slate-100">Data e hora</span>
              <span className="text-sm font-medium text-slate-700">
                {new Date(`${selectedDate}T${selectedHora}`).toLocaleDateString("pt-BR", {
                  weekday: "short", day: "numeric", month: "short",
                })}{" "}
                às {selectedHora}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-slate-100">Cobrança</span>
              <span className="text-sm font-medium text-slate-700">
                {ehBeleza
                  ? tipoCobranca === "plano"
                    ? `Plano · ${planoInfo?.planoNome || ""}`
                    : "Particular"
                  : tipoAtendimento === "convenio" && convenioSelecionado
                    ? `Convênio · ${convenioSelecionado.nomeConvenio}`
                    : "Particular"}
              </span>
            </div>
          </div>

          {/* Aviso de conflito de convênio */}
          {convenioConflito && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2">
              <p className="text-[12px] font-medium text-red-700">
                Convênio não aceito por este profissional. Volte e corrija antes de confirmar.
              </p>
            </div>
          )}

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={enviarLembrete}
              onChange={(e) => setEnviarLembrete(e.target.checked)}
              className="w-4 h-4 rounded accent-sage-500"
            />
            <span className="text-sm text-slate-700">
              Enviar lembrete por WhatsApp
            </span>
          </label>
        </div>
      )}
    </Modal>
  );
}
