"use client";
import React, { useState, useEffect, useCallback } from "react";
import { useNicho } from "@/context/NichoContext";
import { fetchWithAuth } from "@/lib/api-utils";
import KpiSection from "@/components/dashboard/KpiSection";
import AgendaConsolidada, {
  ProfissionalComAgenda,
  AgendamentoItem,
} from "@/components/agenda/AgendaConsolidada";
import ModalAgendamento from "@/components/agenda/ModalAgendamento";
import SynkaPanel from "@/components/synka/SynkaPanel";
import Card from "@/components/ui/Card";

export default function DashboardPage() {
  const { labels } = useNicho();

  const [data, setData] = useState(new Date());
  const [profissionais, setProfissionais] = useState<ProfissionalComAgenda[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ nome?: string; email?: string; role?: string } | null>(null);

  // Modal de agendamento
  const [modalOpen, setModalOpen] = useState(false);
  const [slotProfId, setSlotProfId] = useState<string | undefined>();
  const [slotHorario, setSlotHorario] = useState<string | undefined>();

  // Modal de detalhe de agendamento
  const [agendamentoSelecionado, setAgendamentoSelecionado] = useState<AgendamentoItem | null>(null);
  const [profSelecionado, setProfSelecionado] = useState<ProfissionalComAgenda | null>(null);

  // Usuário logado
  useEffect(() => {
    try {
      const stored = localStorage.getItem("synka-user");
      if (stored) setUser(JSON.parse(stored));
    } catch {}
  }, []);

  // Buscar agenda do dia
  const fetchAgenda = useCallback(async (d: Date) => {
    setLoading(true);
    try {
      const ds = d.toISOString().split("T")[0];
      const res = await fetchWithAuth(`/api/appointments/agenda?data=${ds}`);
      const json = await res.json();
      setProfissionais(json.profissionais || []);
    } catch (e) {
      console.error("Erro ao buscar agenda:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAgenda(data);
  }, [data, fetchAgenda]);

  function handleSlotClick(profissionalId: string, horario: string) {
    setSlotProfId(profissionalId);
    setSlotHorario(horario);
    setModalOpen(true);
  }

  function handleNovoAgendamento() {
    setSlotProfId(undefined);
    setSlotHorario(undefined);
    setModalOpen(true);
  }

  function handleAgendamentoClick(ag: AgendamentoItem, prof: ProfissionalComAgenda) {
    setAgendamentoSelecionado(ag);
    setProfSelecionado(prof);
  }

  return (
    <div className="space-y-6">
      {/* ── KPIs ── */}
      <KpiSection selectedDate={data} />

      {/* ── Agenda + Painel Synka ── */}
      <div className="flex gap-4 items-start">
        {/* Agenda (70%) */}
        <div className="flex-1 min-w-0">
          <Card className="p-4 lg:p-5">
            <AgendaConsolidada
              data={data}
              profissionais={profissionais}
              loading={loading}
              role={user?.role || "admin"}
              profissionalId={undefined}
              onDataChange={(d) => setData(d)}
              onSlotClick={handleSlotClick}
              onAgendamentoClick={handleAgendamentoClick}
              onNovoAgendamento={handleNovoAgendamento}
            />
          </Card>
        </div>

        {/* Synka Panel (30%) — oculto em mobile */}
        <div className="hidden xl:block w-[300px] shrink-0">
          <SynkaPanel
            profissionais={profissionais}
            data={data}
          />
        </div>
      </div>

      {/* Synka Panel mobile — accordion */}
      <div className="xl:hidden">
        <SynkaPanel profissionais={profissionais} data={data} collapsed />
      </div>

      {/* Modal de agendamento */}
      <ModalAgendamento
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        profissionalId={slotProfId}
        horario={slotHorario}
        data={data}
        profissionais={profissionais}
        onSuccess={() => fetchAgenda(data)}
      />

      {/* Modal de detalhe de agendamento */}
      {agendamentoSelecionado && profSelecionado && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          onClick={() => setAgendamentoSelecionado(null)}
        >
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
          <div
            className="relative bg-white w-full max-w-sm rounded-t-2xl sm:rounded-2xl shadow-2xl sm:mx-4 z-10 slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle mobile */}
            <div className="flex justify-center pt-3 sm:hidden">
              <div className="w-10 h-1 bg-warm-300 rounded-full" />
            </div>

            <div className="px-5 py-4">
              <div
                className="w-full h-1 rounded-full mb-4"
                style={{
                  background: agendamentoSelecionado.servico?.color || profSelecionado.color,
                }}
              />
              <h3 className="font-display text-lg text-slate-700 mb-4">
                {agendamentoSelecionado.pacienteNome}
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-100">Horário</span>
                  <span className="text-slate-700 font-medium">
                    {new Date(agendamentoSelecionado.dataHora).toLocaleTimeString("pt-BR", {
                      hour: "2-digit", minute: "2-digit",
                    })}
                    {" – "}
                    {new Date(agendamentoSelecionado.fimDataHora).toLocaleTimeString("pt-BR", {
                      hour: "2-digit", minute: "2-digit",
                    })}
                  </span>
                </div>
                {agendamentoSelecionado.servico && (
                  <div className="flex justify-between">
                    <span className="text-slate-100">Serviço</span>
                    <span className="text-slate-700 font-medium">
                      {agendamentoSelecionado.servico.nome}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-100">Profissional</span>
                  <span className="text-slate-700 font-medium">{profSelecionado.nome}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-100">Status</span>
                  <span
                    className={`font-medium capitalize ${
                      agendamentoSelecionado.status === "confirmado"
                        ? "text-sage-500"
                        : agendamentoSelecionado.status === "pendente"
                        ? "text-gold-500"
                        : "text-red-500"
                    }`}
                  >
                    {agendamentoSelecionado.status}
                  </span>
                </div>
                {agendamentoSelecionado.pacienteTelefone && (
                  <div className="flex justify-between">
                    <span className="text-slate-100">Telefone</span>
                    <a
                      href={`https://wa.me/55${agendamentoSelecionado.pacienteTelefone.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sage-600 font-medium hover:underline"
                    >
                      {agendamentoSelecionado.pacienteTelefone}
                    </a>
                  </div>
                )}
                {agendamentoSelecionado.observacoes && (
                  <div>
                    <span className="text-slate-100 block mb-1">Observações</span>
                    <p className="text-slate-700 text-xs bg-warm-100 rounded-lg px-3 py-2">
                      {agendamentoSelecionado.observacoes}
                    </p>
                  </div>
                )}
              </div>

              <button
                onClick={() => setAgendamentoSelecionado(null)}
                className="mt-4 w-full h-10 rounded-lg border border-warm-300 text-slate-300 text-sm hover:bg-warm-100 transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
