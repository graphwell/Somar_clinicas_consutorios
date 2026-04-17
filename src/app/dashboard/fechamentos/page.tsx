"use client";
import React, { useState, useEffect, useCallback } from "react";
import { fetchWithAuth } from "@/lib/api-utils";

interface DiaBloqueado {
  id: string;
  data: string;
  titulo: string;
  mensagem: string;
  retornoData?: string | null;
  retornoHora?: string | null;
  ativo: boolean;
}

function formatarData(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    weekday: "long", day: "2-digit", month: "long", year: "numeric", timeZone: "UTC",
  });
}

function gerarMensagem(titulo: string, data: string, retornoData?: string, retornoHora?: string) {
  const dataFmt = new Date(data).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "UTC" });
  const retFmt = retornoData ? new Date(retornoData).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "UTC" }) : null;
  return (
    `Olá! 👋 Hoje, dia ${dataFmt}, não estaremos funcionando` +
    (titulo ? ` por conta do ${titulo}` : "") +
    "." +
    (retFmt ? ` Voltamos no dia ${retFmt}${retornoHora ? ` às ${retornoHora}` : ""}. ` : " ") +
    "Caso queira agendar para outra data, é só responder aqui! 😊"
  );
}

export default function FechamentosPage() {
  const [dias, setDias] = useState<DiaBloqueado[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [toast, setToast] = useState("");
  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(""), 3000); };

  // Form
  const [form, setForm] = useState({
    data: "",
    titulo: "Feriado",
    mensagem: "",
    retornoData: "",
    retornoHora: "08:00",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth("/api/dias-bloqueados?ativos=false");
      const d = await res.json();
      setDias(Array.isArray(d) ? d : []);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  // Atualiza a mensagem automaticamente quando os campos mudam
  useEffect(() => {
    if (form.data) {
      setForm(f => ({
        ...f,
        mensagem: gerarMensagem(f.titulo, f.data, f.retornoData || undefined, f.retornoHora || undefined),
      }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.data, form.titulo, form.retornoData, form.retornoHora]);

  const handleSalvar = async () => {
    if (!form.data) { setErr("Selecione uma data"); return; }
    if (!form.mensagem.trim()) { setErr("Mensagem obrigatória"); return; }
    setSaving(true); setErr("");
    try {
      const res = await fetchWithAuth("/api/dias-bloqueados", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: form.data,
          titulo: form.titulo,
          mensagem: form.mensagem,
          retornoData: form.retornoData || null,
          retornoHora: form.retornoHora || null,
        }),
      });
      if (!res.ok) { const d = await res.json(); setErr(d.error || "Erro"); return; }
      setShowModal(false);
      setForm({ data: "", titulo: "Feriado", mensagem: "", retornoData: "", retornoHora: "08:00" });
      await carregar();
      showToast("Aviso de fechamento configurado! ✅");
    } finally { setSaving(false); }
  };

  const toggleAtivo = async (d: DiaBloqueado) => {
    await fetchWithAuth("/api/dias-bloqueados", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: d.id, ativo: !d.ativo }),
    });
    await carregar();
    showToast(d.ativo ? "Aviso desativado" : "Aviso reativado");
  };

  const excluir = async (id: string) => {
    if (!confirm("Remover este aviso de fechamento?")) return;
    await fetchWithAuth(`/api/dias-bloqueados?id=${id}`, { method: "DELETE" });
    await carregar();
    showToast("Aviso removido");
  };

  const hoje = new Date().toISOString().split("T")[0];
  const proximos = dias.filter(d => d.data >= hoje && d.ativo);
  const passados  = dias.filter(d => d.data < hoje || !d.ativo);

  return (
    <div className="max-w-2xl mx-auto py-4 lg:py-8 px-4">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 md:p-6 mb-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl flex items-center justify-center shadow-sm shrink-0"
              style={{ background: "linear-gradient(135deg, #EF4444, #DC2626)" }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round">
                <rect x="3" y="4" width="18" height="18" rx="3" />
                <path d="M16 2v4M8 2v4M3 10h18" />
                <path d="M9 15l6-6M15 15l-6-6" />
              </svg>
            </div>
            <div>
              <h1 className="text-[17px] md:text-xl font-bold text-slate-800">Avisos de Fechamento</h1>
              <p className="text-[11px] text-slate-400 mt-0.5">Configure feriados e dias que não haverá atendimento</p>
            </div>
          </div>
          <button onClick={() => setShowModal(true)}
            className="flex items-center gap-2 h-9 px-4 rounded-xl text-[12px] font-medium text-white shrink-0"
            style={{ background: "#40916C" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" d="M12 4v16M4 12h16" />
            </svg>
            Adicionar
          </button>
        </div>
      </div>

      {/* Info box */}
      <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 mb-5 flex gap-3">
        <span className="text-xl shrink-0">💡</span>
        <div>
          <p className="text-[12px] font-semibold text-blue-700 mb-0.5">Como funciona?</p>
          <p className="text-[11px] text-blue-600 leading-relaxed">
            Ao configurar um dia de fechamento, clientes que tentarem agendar via <strong>WhatsApp</strong> ou pelo <strong>Link Público</strong> receberão automaticamente o aviso configurado — sem precisar de ninguém respondendo.
          </p>
        </div>
      </div>

      {/* Lista - Próximos */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-7 h-7 border-2 border-slate-200 border-t-slate-500 rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {proximos.length > 0 && (
            <div className="mb-5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2 px-1">Próximos fechamentos</p>
              <div className="space-y-2">
                {proximos.map(d => (
                  <div key={d.id} className="bg-white rounded-2xl border border-red-100 p-4 shadow-sm">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0 border border-red-100">
                        <span className="text-lg">🚫</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-[13px] font-semibold text-slate-800">{d.titulo}</p>
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-600">Ativo</span>
                        </div>
                        <p className="text-[12px] text-slate-500 mt-0.5 capitalize">{formatarData(d.data)}</p>
                        <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{d.mensagem}</p>
                        {(d.retornoData || d.retornoHora) && (
                          <p className="text-[11px] text-emerald-600 font-medium mt-1">
                            📅 Retorno: {d.retornoData ? new Date(d.retornoData).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "UTC" }) : ""}
                            {d.retornoHora ? ` às ${d.retornoHora}` : ""}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col gap-1 shrink-0">
                        <button onClick={() => toggleAtivo(d)}
                          className="text-[10px] px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-500 hover:border-slate-300 transition-colors">
                          Desativar
                        </button>
                        <button onClick={() => excluir(d.id)}
                          className="text-[10px] px-2.5 py-1.5 rounded-lg border border-red-100 text-red-400 hover:border-red-300 transition-colors">
                          Remover
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {proximos.length === 0 && (
            <div className="text-center py-14 bg-white rounded-2xl border border-slate-100 mb-5">
              <div className="text-4xl mb-3">📅</div>
              <p className="text-[13px] font-medium text-slate-600">Nenhum fechamento configurado</p>
              <p className="text-[11px] text-slate-400 mt-1">Clique em "Adicionar" para configurar um feriado ou dia sem atendimento.</p>
            </div>
          )}

          {passados.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-300 mb-2 px-1">Histórico</p>
              <div className="space-y-1.5">
                {passados.map(d => (
                  <div key={d.id} className="bg-slate-50 rounded-xl border border-slate-100 px-4 py-3 flex items-center gap-3">
                    <span className="text-base shrink-0">🗓</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-medium text-slate-500 truncate">{d.titulo}</p>
                      <p className="text-[11px] text-slate-400 capitalize">{formatarData(d.data)}</p>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      {!d.ativo && (
                        <button onClick={() => toggleAtivo(d)}
                          className="text-[10px] px-2.5 py-1 rounded-lg border border-slate-200 text-slate-400 hover:text-emerald-600 hover:border-emerald-200 transition-colors">
                          Reativar
                        </button>
                      )}
                      <button onClick={() => excluir(d.id)}
                        className="text-[10px] px-2.5 py-1 rounded-lg border border-slate-200 text-slate-400 hover:text-red-500 hover:border-red-200 transition-colors">
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-slate-900/40 backdrop-blur-sm p-0 md:p-4">
          <div className="bg-white w-full h-[90vh] md:h-auto md:max-h-[90vh] md:max-w-lg md:rounded-2xl rounded-t-2xl flex flex-col overflow-hidden shadow-2xl">
            {/* Header modal */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div>
                <h3 className="text-[15px] font-semibold text-slate-800">Novo Aviso de Fechamento</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">Configure o dia e a mensagem que será enviada</p>
              </div>
              <button onClick={() => setShowModal(false)}
                className="flex items-center gap-1.5 text-[12px] font-medium text-slate-400 hover:text-slate-600 transition-colors px-2 py-1 rounded-lg hover:bg-slate-100">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
                Fechar
              </button>
            </div>

            {/* Body modal */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Data */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-slate-500">Data do fechamento *</label>
                <input type="date" value={form.data} min={hoje}
                  onChange={e => setForm(f => ({ ...f, data: e.target.value }))}
                  className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-slate-50 text-sm outline-none focus:border-slate-400" />
              </div>

              {/* Título */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-slate-500">Motivo / Título</label>
                <select value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
                  className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-slate-50 text-sm outline-none">
                  <option>Feriado</option>
                  <option>Feriado Nacional</option>
                  <option>Feriado Municipal</option>
                  <option>Recesso</option>
                  <option>Manutenção</option>
                  <option>Evento interno</option>
                  <option>Outro</option>
                </select>
              </div>

              {/* Retorno */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium text-slate-500">Data de retorno</label>
                  <input type="date" value={form.retornoData} min={form.data || hoje}
                    onChange={e => setForm(f => ({ ...f, retornoData: e.target.value }))}
                    className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-slate-50 text-sm outline-none focus:border-slate-400" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium text-slate-500">Horário de abertura</label>
                  <input type="time" value={form.retornoHora}
                    onChange={e => setForm(f => ({ ...f, retornoHora: e.target.value }))}
                    className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-slate-50 text-sm outline-none focus:border-slate-400" />
                </div>
              </div>

              {/* Mensagem */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-slate-500">Mensagem enviada ao cliente *</label>
                <textarea value={form.mensagem} onChange={e => setForm(f => ({ ...f, mensagem: e.target.value }))}
                  rows={4}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm outline-none focus:border-slate-400 resize-none"
                  placeholder="Gerado automaticamente ao selecionar a data..." />
                <p className="text-[10px] text-slate-400">Esta mensagem será enviada via WhatsApp e exibida no link público de agendamento.</p>
              </div>

              {/* Preview */}
              {form.mensagem && (
                <div className="bg-[#DCF8C6] rounded-2xl rounded-tl-sm px-4 py-3 max-w-[90%]">
                  <p className="text-[12px] text-slate-700 leading-relaxed">{form.mensagem}</p>
                  <p className="text-[9px] text-slate-400 text-right mt-1">Preview WhatsApp</p>
                </div>
              )}

              {err && <p className="text-[11px] text-red-500 bg-red-50 p-3 rounded-xl">{err}</p>}
            </div>

            {/* Footer modal */}
            <div className="p-4 border-t border-slate-100 flex gap-3">
              <button onClick={() => setShowModal(false)}
                className="flex-1 h-11 rounded-xl bg-slate-100 text-[12px] font-medium text-slate-500">
                Cancelar
              </button>
              <button onClick={handleSalvar} disabled={saving}
                className="flex-1 h-11 rounded-xl text-[12px] font-medium text-white disabled:opacity-50"
                style={{ background: "#EF4444" }}>
                {saving ? "Salvando..." : "Confirmar fechamento"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] bg-slate-800 text-white text-[12px] font-medium px-5 py-2.5 rounded-full shadow-xl">
          {toast}
        </div>
      )}
    </div>
  );
}
