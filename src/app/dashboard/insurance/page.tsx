"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { fetchWithAuth } from "@/lib/api-utils";

/* ─── tipos ───────────────────────────────────────────────────── */
interface Convenio {
  id: string;
  nomeConvenio: string;
  codigo?: string | null;
  telefone?: string | null;
  site?: string | null;
  observacoes?: string | null;
  ativo: boolean;
  totalProfissionais: number;
  totalServicos: number;
  totalPacientes: number;
}

interface Profissional { id: string; nome: string; especialidade?: string | null; }
interface ServicoTabela {
  servicoId: string; servicoNome: string;
  precoParticular: number | null;
  precoConvenio: number | null;
  codigoTuss: string | null;
  tabelaId: string | null;
  ativo: boolean;
}

/* ─── utils ───────────────────────────────────────────────────── */
function fmtBRL(v: number | null) {
  if (v == null) return "—";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/* ─── Stat mini (linha horizontal) ───────────────────────────── */
function StatMini({ label, value }: { label: string; value: number }) {
  return (
    <div className="shrink-0 min-w-[110px] flex flex-col gap-0.5 bg-white border border-warm-200 rounded-[10px] px-3.5 py-2.5">
      <span className="text-[20px] font-medium text-slate-700 leading-none tabular-nums">{value}</span>
      <span className="text-[11px] text-slate-100 leading-tight">{label}</span>
    </div>
  );
}

/* ─── Dropdown menu "..." ─────────────────────────────────────── */
function CardMenu({
  convenio,
  onEdit,
  onToggle,
}: {
  convenio: Convenio;
  onEdit: (c: Convenio) => void;
  onToggle: (c: Convenio) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-7 h-7 flex items-center justify-center rounded-lg border border-warm-200 text-slate-300 hover:bg-warm-100 transition-colors text-base leading-none"
        aria-label="Mais opções"
      >
        ⋯
      </button>
      {open && (
        <div className="absolute right-0 top-8 z-20 bg-white border border-warm-200 rounded-xl shadow-lg py-1 min-w-[120px]">
          <button
            onClick={() => { setOpen(false); onEdit(convenio); }}
            className="w-full text-left px-3 py-2 text-[12px] text-slate-700 hover:bg-warm-50 transition-colors"
          >
            Editar
          </button>
          <button
            onClick={() => { setOpen(false); onToggle(convenio); }}
            className="w-full text-left px-3 py-2 text-[12px] text-slate-700 hover:bg-warm-50 transition-colors"
          >
            {convenio.ativo ? "Desativar" : "Ativar"}
          </button>
        </div>
      )}
    </div>
  );
}

/* ─── Convenio Card (compacto) ────────────────────────────────── */
function ConvenioCard({
  convenio,
  onEdit,
  onProfissionais,
  onTabela,
  onToggle,
}: {
  convenio: Convenio;
  onEdit: (c: Convenio) => void;
  onProfissionais: (c: Convenio) => void;
  onTabela: (c: Convenio) => void;
  onToggle: (c: Convenio) => void;
}) {
  return (
    <div className={`bg-white border rounded-xl p-4 flex flex-col gap-3 transition-opacity ${convenio.ativo ? "border-warm-200" : "border-warm-100 opacity-55"}`}>
      {/* Linha 1: nome + badge + menu */}
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium text-slate-700 text-sm leading-tight truncate">{convenio.nomeConvenio}</p>
          {convenio.codigo && <p className="text-[11px] text-slate-100 mt-0.5">ANS {convenio.codigo}</p>}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${convenio.ativo ? "bg-sage-100 text-sage-700" : "bg-warm-100 text-slate-300"}`}>
            {convenio.ativo ? "Ativo" : "Inativo"}
          </span>
          <CardMenu convenio={convenio} onEdit={onEdit} onToggle={onToggle} />
        </div>
      </div>

      {/* Linha 2: stats compactos */}
      <div className="flex gap-3 text-[12px] text-slate-300">
        <span><strong className="text-slate-500 font-medium">{convenio.totalProfissionais}</strong> prof.</span>
        <span><strong className="text-slate-500 font-medium">{convenio.totalServicos}</strong> serv.</span>
        <span><strong className="text-slate-500 font-medium">{convenio.totalPacientes}</strong> pac.</span>
      </div>

      {/* Linha 3: botões de ação */}
      <div className="flex gap-1.5 pt-0.5 border-t border-warm-100">
        <button
          onClick={() => onProfissionais(convenio)}
          className="flex-1 h-7 text-[11px] font-medium text-sage-700 border border-sage-200 bg-sage-50 hover:bg-sage-100 rounded-lg transition-colors"
        >
          Profissionais
        </button>
        <button
          onClick={() => onTabela(convenio)}
          className="flex-1 h-7 text-[11px] font-medium text-sage-700 border border-sage-200 bg-sage-50 hover:bg-sage-100 rounded-lg transition-colors"
        >
          Tabela
        </button>
      </div>
    </div>
  );
}

/* ─── Modal Form Convênio ─────────────────────────────────────── */
function ModalConvenio({
  open, onClose, convenio, onSave,
}: {
  open: boolean; onClose: () => void;
  convenio: Convenio | null;
  onSave: () => void;
}) {
  const [nome, setNome] = useState("");
  const [codigo, setCodigo] = useState("");
  const [telefone, setTelefone] = useState("");
  const [site, setSite] = useState("");
  const [obs, setObs] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setNome(convenio?.nomeConvenio ?? "");
      setCodigo(convenio?.codigo ?? "");
      setTelefone(convenio?.telefone ?? "");
      setSite(convenio?.site ?? "");
      setObs(convenio?.observacoes ?? "");
      setError("");
    }
  }, [open, convenio]);

  if (!open) return null;

  async function handleSave() {
    if (!nome.trim()) { setError("Nome do convênio é obrigatório"); return; }
    setLoading(true); setError("");
    try {
      const body = { nomeConvenio: nome.trim(), codigo: codigo.trim() || null, telefone: telefone.trim() || null, site: site.trim() || null, observacoes: obs.trim() || null };
      if (convenio) {
        await fetchWithAuth(`/api/convenios/${convenio.id}`, { method: "PATCH", body: JSON.stringify(body) });
      } else {
        await fetchWithAuth("/api/convenios", { method: "POST", body: JSON.stringify(body) });
      }
      onSave();
      onClose();
    } catch {
      setError("Erro ao salvar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-warm-100">
          <h2 className="font-semibold text-slate-700">{convenio ? "Editar convênio" : "Novo convênio"}</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center text-slate-200 hover:text-slate-400 rounded-lg hover:bg-slate-100 transition-colors"><svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M9 3L3 9M3 3l6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg></button>
        </div>
        <div className="px-5 py-4 space-y-3">
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Nome do convênio *</label>
            <input className="w-full h-10 px-3 border border-warm-300 rounded-lg text-sm text-slate-700 focus:outline-none focus:border-sage-500" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Unimed, Bradesco Saúde…" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Código ANS</label>
              <input className="w-full h-10 px-3 border border-warm-300 rounded-lg text-sm text-slate-700 focus:outline-none focus:border-sage-500" value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder="000000" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Telefone</label>
              <input className="w-full h-10 px-3 border border-warm-300 rounded-lg text-sm text-slate-700 focus:outline-none focus:border-sage-500" value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="(11) 3000-0000" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Site</label>
            <input className="w-full h-10 px-3 border border-warm-300 rounded-lg text-sm text-slate-700 focus:outline-none focus:border-sage-500" value={site} onChange={(e) => setSite(e.target.value)} placeholder="https://…" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Observações</label>
            <textarea className="w-full px-3 py-2 border border-warm-300 rounded-lg text-sm text-slate-700 focus:outline-none focus:border-sage-500 resize-none" rows={2} value={obs} onChange={(e) => setObs(e.target.value)} />
          </div>
        </div>
        <div className="flex gap-2 justify-end px-5 pb-5 pt-2">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-warm-300 rounded-xl text-slate-300 hover:bg-warm-100 transition-colors">Cancelar</button>
          <button onClick={handleSave} disabled={loading} className="px-4 py-2 text-sm bg-sage-500 text-white rounded-xl hover:bg-sage-600 disabled:opacity-50 transition-colors font-medium">
            {loading ? "Salvando…" : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Modal Profissionais ─────────────────────────────────────── */
function ModalProfissionais({
  open, onClose, convenio, allProfissionais, onSave,
}: {
  open: boolean; onClose: () => void;
  convenio: Convenio | null;
  allProfissionais: Profissional[];
  onSave: () => void;
}) {
  const [linked, setLinked] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && convenio) {
      setLoading(true);
      fetchWithAuth(`/api/convenios/${convenio.id}/profissionais`)
        .then((r) => r.json())
        .then((data: any[]) => {
          const active = new Set(data.filter((p) => p.vinculoAtivo).map((p) => p.id));
          setLinked(active);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [open, convenio]);

  if (!open || !convenio) return null;

  async function toggle(profId: string, currentlyLinked: boolean) {
    if (!convenio) return;
    setSaving(true);
    try {
      if (currentlyLinked) {
        await fetchWithAuth(`/api/convenios/${convenio.id}/profissionais`, {
          method: "DELETE",
          body: JSON.stringify({ profissionalId: profId }),
        });
        setLinked((prev) => { const s = new Set(prev); s.delete(profId); return s; });
      } else {
        await fetchWithAuth(`/api/convenios/${convenio.id}/profissionais`, {
          method: "POST",
          body: JSON.stringify({ profissionalId: profId }),
        });
        setLinked((prev) => new Set([...prev, profId]));
      }
      onSave();
    } catch {}
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-warm-100">
          <div>
            <h2 className="font-semibold text-slate-700">Profissionais</h2>
            <p className="text-[11px] text-slate-100">{convenio.nomeConvenio}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center text-slate-200 hover:text-slate-400 rounded-lg hover:bg-slate-100 transition-colors"><svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M9 3L3 9M3 3l6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg></button>
        </div>
        <div className="px-5 py-4 max-h-96 overflow-y-auto">
          {loading ? (
            <p className="text-sm text-slate-100 text-center py-6">Carregando…</p>
          ) : allProfissionais.length === 0 ? (
            <p className="text-sm text-slate-100 text-center py-6">Nenhum profissional cadastrado.</p>
          ) : (
            <div className="space-y-1">
              <p className="text-[11px] text-slate-100 mb-3">Marque os profissionais que aceitam este convênio. Se nenhum for marcado, assume-se que todos aceitam.</p>
              {allProfissionais.map((prof) => {
                const isLinked = linked.has(prof.id);
                return (
                  <button
                    key={prof.id}
                    disabled={saving}
                    onClick={() => toggle(prof.id, isLinked)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-colors ${isLinked ? "bg-sage-50 border-sage-200" : "bg-white border-warm-100 hover:bg-warm-50"}`}
                  >
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${isLinked ? "bg-sage-500 border-sage-500" : "border-warm-300"}`}>
                      {isLinked && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/></svg>}
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-medium text-slate-700">{prof.nome}</p>
                      {prof.especialidade && <p className="text-[11px] text-slate-100">{prof.especialidade}</p>}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <div className="px-5 pb-5 pt-2 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm bg-sage-500 text-white rounded-xl hover:bg-sage-600 transition-colors font-medium">Fechar</button>
        </div>
      </div>
    </div>
  );
}

/* ─── Modal Tabela de Preços ──────────────────────────────────── */
function ModalTabela({
  open, onClose, convenio, onSave,
}: {
  open: boolean; onClose: () => void;
  convenio: Convenio | null;
  onSave: () => void;
}) {
  const [itens, setItens] = useState<ServicoTabela[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPreco, setEditPreco] = useState("");
  const [editTuss, setEditTuss] = useState("");
  const [saving, setSaving] = useState(false);

  const loadTabela = useCallback(() => {
    if (!convenio) return;
    setLoading(true);
    fetchWithAuth(`/api/convenios/${convenio.id}/tabela`)
      .then((r) => r.json())
      .then((d) => setItens(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [convenio]);

  useEffect(() => { if (open && convenio) loadTabela(); }, [open, convenio, loadTabela]);

  if (!open || !convenio) return null;

  function startEdit(item: ServicoTabela) {
    setEditingId(item.servicoId);
    setEditPreco(item.precoConvenio != null ? String(item.precoConvenio) : "");
    setEditTuss(item.codigoTuss ?? "");
  }

  async function saveEdit(servicoId: string) {
    if (!convenio) return;
    const preco = parseFloat(editPreco.replace(",", "."));
    if (isNaN(preco)) return;
    setSaving(true);
    try {
      await fetchWithAuth(`/api/convenios/${convenio.id}/tabela`, {
        method: "POST",
        body: JSON.stringify({ servicoId, preco, codigoTuss: editTuss.trim() || null }),
      });
      setEditingId(null);
      loadTabela();
      onSave();
    } catch {}
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl">
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-warm-100">
          <div>
            <h2 className="font-semibold text-slate-700">Tabela de Preços</h2>
            <p className="text-[11px] text-slate-100">{convenio.nomeConvenio}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center text-slate-200 hover:text-slate-400 rounded-lg hover:bg-slate-100 transition-colors"><svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M9 3L3 9M3 3l6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg></button>
        </div>

        {/* Aviso TISS */}
        <div className="mx-5 mt-4 px-4 py-3 bg-blue-50 border border-blue-100 rounded-xl flex items-start gap-3">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-blue-400 shrink-0 mt-0.5"><path d="M2 14.667V7.333L8 1.333l6 6v7.334H2z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/><path d="M5.333 14.667V10h5.334v4.667" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/></svg>
          <div>
            <p className="text-xs font-semibold text-blue-700">Faturamento TISS — Em breve</p>
            <p className="text-[11px] text-blue-500 mt-0.5">A geração automática de guias e lotes TISS estará disponível em breve. Configure os preços agora para usar quando lançar.</p>
          </div>
        </div>

        <div className="px-5 py-4 max-h-[480px] overflow-y-auto">
          {loading ? (
            <p className="text-sm text-slate-100 text-center py-8">Carregando…</p>
          ) : itens.length === 0 ? (
            <p className="text-sm text-slate-100 text-center py-8">Nenhum serviço cadastrado.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-warm-100">
                  <th className="text-left text-[11px] font-medium text-slate-100 pb-2">Serviço</th>
                  <th className="text-right text-[11px] font-medium text-slate-100 pb-2">Particular</th>
                  <th className="text-right text-[11px] font-medium text-slate-100 pb-2">Convênio</th>
                  <th className="text-center text-[11px] font-medium text-slate-100 pb-2">Cód. TUSS</th>
                  <th className="w-16" />
                </tr>
              </thead>
              <tbody>
                {itens.map((item) => (
                  <tr key={item.servicoId} className="border-b border-warm-50 last:border-0">
                    <td className="py-2.5 text-slate-700 font-medium">{item.servicoNome}</td>
                    <td className="py-2.5 text-right text-slate-300 tabular-nums">{fmtBRL(item.precoParticular)}</td>
                    <td className="py-2.5 text-right tabular-nums">
                      {editingId === item.servicoId ? (
                        <input
                          type="number"
                          className="w-24 text-right px-2 py-1 border border-sage-300 rounded-lg text-sm text-slate-700 focus:outline-none focus:border-sage-500"
                          value={editPreco}
                          onChange={(e) => setEditPreco(e.target.value)}
                          placeholder="0,00"
                          autoFocus
                        />
                      ) : (
                        <span className={item.precoConvenio != null ? "text-slate-700 font-medium" : "text-slate-200"}>
                          {fmtBRL(item.precoConvenio)}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 text-center">
                      {editingId === item.servicoId ? (
                        <input
                          className="w-24 text-center px-2 py-1 border border-sage-300 rounded-lg text-sm text-slate-700 focus:outline-none focus:border-sage-500"
                          value={editTuss}
                          onChange={(e) => setEditTuss(e.target.value)}
                          placeholder="00.00.00.00-0"
                        />
                      ) : (
                        <span className="text-[11px] text-slate-200 font-mono">{item.codigoTuss || "—"}</span>
                      )}
                    </td>
                    <td className="py-2.5 text-right">
                      {editingId === item.servicoId ? (
                        <div className="flex gap-1 justify-end">
                          <button
                            disabled={saving}
                            onClick={() => saveEdit(item.servicoId)}
                            className="text-[11px] px-2 py-1 bg-sage-500 text-white rounded-lg hover:bg-sage-600 disabled:opacity-50"
                          >
                            {saving ? "…" : "OK"}
                          </button>
                          <button onClick={() => setEditingId(null)} className="text-[11px] px-2 py-1 border border-warm-200 rounded-lg text-slate-300 hover:bg-warm-100">✕</button>
                        </div>
                      ) : (
                        <button onClick={() => startEdit(item)} className="text-[11px] text-sage-600 hover:text-sage-700 font-medium">Editar</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="px-5 pb-5 pt-2 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm bg-sage-500 text-white rounded-xl hover:bg-sage-600 transition-colors font-medium">Fechar</button>
        </div>
      </div>
    </div>
  );
}

/* ─── Página principal ────────────────────────────────────────── */
export default function InsurancePage() {
  const [convenios, setConvenios] = useState<Convenio[]>([]);
  const [allProfissionais, setAllProfissionais] = useState<Profissional[]>([]);
  const [loading, setLoading] = useState(true);

  // modais
  const [modalConvenio, setModalConvenio] = useState(false);
  const [editConvenio, setEditConvenio] = useState<Convenio | null>(null);
  const [modalProfs, setModalProfs] = useState(false);
  const [profsConvenio, setProfsConvenio] = useState<Convenio | null>(null);
  const [modalTabela, setModalTabela] = useState(false);
  const [tabelaConvenio, setTabelaConvenio] = useState<Convenio | null>(null);

  const loadConvenios = useCallback(() => {
    setLoading(true);
    fetchWithAuth("/api/convenios")
      .then((r) => r.json())
      .then((d) => setConvenios(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadConvenios();
    fetchWithAuth("/api/team")
      .then((r) => r.json())
      .then((d) => setAllProfissionais(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, [loadConvenios]);

  async function handleToggle(convenio: Convenio) {
    await fetchWithAuth(`/api/convenios/${convenio.id}`, {
      method: "PATCH",
      body: JSON.stringify({ ativo: !convenio.ativo }),
    });
    loadConvenios();
  }

  // stats agregados
  const totalConvenios = convenios.filter((c) => c.ativo).length;
  const totalProfVinculados = convenios.reduce((acc, c) => acc + (c.totalProfissionais || 0), 0);
  const totalPacientes = convenios.reduce((acc, c) => acc + (c.totalPacientes || 0), 0);
  const totalServicos = convenios.reduce((acc, c) => acc + (c.totalServicos || 0), 0);

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      {/* Header responsivo */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-700">Convênios</h1>
          <p className="text-sm text-slate-100 mt-0.5">Gerencie planos, profissionais e tabelas de preços</p>
        </div>
        <button
          onClick={() => { setEditConvenio(null); setModalConvenio(true); }}
          className="w-full sm:w-auto px-4 py-2 bg-sage-500 text-white text-sm font-medium rounded-xl hover:bg-sage-600 transition-colors"
        >
          + Novo convênio
        </button>
      </div>

      {/* Stats — linha horizontal compacta */}
      <div className="flex gap-3 overflow-x-auto pb-1 mb-5 -mx-4 sm:mx-0 px-4 sm:px-0">
        <StatMini label="Convênios ativos" value={totalConvenios} />
        <StatMini label="Prof. vinculados" value={totalProfVinculados} />
        <StatMini label="Pac. por convênio" value={totalPacientes} />
        <StatMini label="Serv. com tabela" value={totalServicos} />
      </div>

      {/* Grid de convênios */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-sage-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : convenios.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 bg-sage-100 rounded-2xl flex items-center justify-center mb-4 text-2xl">🏥</div>
          <p className="font-semibold text-slate-700 mb-1">Nenhum convênio cadastrado</p>
          <p className="text-sm text-slate-100 mb-4">Cadastre os planos de saúde aceitos pela clínica</p>
          <button
            onClick={() => { setEditConvenio(null); setModalConvenio(true); }}
            className="px-4 py-2 bg-sage-500 text-white text-sm font-medium rounded-xl hover:bg-sage-600 transition-colors"
          >
            Cadastrar primeiro convênio
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {convenios.map((convenio) => (
            <ConvenioCard
              key={convenio.id}
              convenio={convenio}
              onEdit={(c) => { setEditConvenio(c); setModalConvenio(true); }}
              onProfissionais={(c) => { setProfsConvenio(c); setModalProfs(true); }}
              onTabela={(c) => { setTabelaConvenio(c); setModalTabela(true); }}
              onToggle={handleToggle}
            />
          ))}
        </div>
      )}

      {/* Modais */}
      <ModalConvenio
        open={modalConvenio}
        onClose={() => setModalConvenio(false)}
        convenio={editConvenio}
        onSave={loadConvenios}
      />
      <ModalProfissionais
        open={modalProfs}
        onClose={() => setModalProfs(false)}
        convenio={profsConvenio}
        allProfissionais={allProfissionais}
        onSave={loadConvenios}
      />
      <ModalTabela
        open={modalTabela}
        onClose={() => setModalTabela(false)}
        convenio={tabelaConvenio}
        onSave={loadConvenios}
      />
    </div>
  );
}
