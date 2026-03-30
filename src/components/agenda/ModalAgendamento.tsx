"use client";
import React, { useState, useEffect } from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { fetchWithAuth } from "@/lib/api-utils";

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

export default function ModalAgendamento({
  open,
  onClose,
  profissionalId,
  horario,
  data,
  profissionais,
  onSuccess,
}: Props) {
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
  const [selectedDate, setSelectedDate] = useState(data.toISOString().split("T")[0]);
  const [selectedHora, setSelectedHora] = useState(horario || "09:00");
  const [comboSugestao, setComboSugestao] = useState<any>(null);
  const [adicionarCombo, setAdicionarCombo] = useState(false);

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
      setSelectedDate(data.toISOString().split("T")[0]);
      setSelectedHora(horario || "09:00");
      setComboSugestao(null);
      setAdicionarCombo(false);
      setEnviarLembrete(true);
    }
  }, [open, profissionalId, horario, data]);

  // Buscar serviços
  useEffect(() => {
    if (open) {
      fetchWithAuth("/api/services")
        .then((r) => r.json())
        .then((d) => setServicos(Array.isArray(d) ? d : []))
        .catch(() => {});
    }
  }, [open]);

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

      // Criar paciente novo se necessário
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

      const dataHora = `${selectedDate}T${selectedHora}:00`;
      const duration = selectedServico?.duracaoMinutos || 30;

      await fetchWithAuth("/api/appointments", {
        method: "POST",
        body: JSON.stringify({
          pacienteId,
          profissionalId: selectedProfId || undefined,
          servicoId: selectedServico?.id || undefined,
          dataHora,
          durationMinutes: duration,
          status: "pendente",
        }),
      });

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
      setError("Erro ao criar agendamento. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  const profissionalSelecionado = profissionais.find((p) => p.id === selectedProfId);

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
            <Button variant="primary" loading={loading} onClick={handleSubmit}>
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

      {/* ── STEP 2: Serviço + Profissional ── */}
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

          {/* Sugestão de combo */}
          {comboSugestao && (
            <div className="bg-gold-100 border border-gold-500/20 rounded-xl p-3">
              <p className="text-[12px] font-medium text-gold-500 mb-1">
                💡 Que tal aproveitar também?
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
                  {adicionarCombo ? "✓ Adicionado" : "Adicionar ao agendamento"}
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
          </div>

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
