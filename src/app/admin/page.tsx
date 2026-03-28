"use client";
import React, { useState, useEffect } from 'react';

const SECRET = '13201320';
const API = (path: string) => `${path}?secret=${SECRET}`;

const PLANOS = ['starter', 'pro', 'enterprise'];
const NICHOS = ['CLINICA_MEDICA', 'CLINICA_MULTI', 'CLINICA_ESTETICA', 'SALAO_BELEZA', 'BARBEARIA', 'ODONTOLOGIA', 'FISIOTERAPIA'];

const planColor = (p?: string) => {
  if (p === 'enterprise') return 'text-purple-400 bg-purple-500/10 border-purple-500/20';
  if (p === 'pro') return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
  return 'text-gray-400 bg-white/5 border-white/10';
};

const statusColor = (botActive: boolean, motivo?: string) => {
  if (!botActive && motivo === 'Inadimplência') return 'text-orange-400 bg-orange-500/10 border-orange-500/20';
  if (!botActive) return 'text-red-400 bg-red-500/10 border-red-500/20';
  return 'text-green-400 bg-green-500/10 border-green-500/20';
};

const statusLabel = (botActive: boolean, motivo?: string) => {
  if (!botActive && motivo === 'Inadimplência') return '⚠ Inadimplente';
  if (!botActive && motivo) return `✕ ${motivo}`;
  if (!botActive) return '✕ Suspenso';
  return '● Ativo';
};

type Modal =
  | { type: 'editar'; clinica: any }
  | { type: 'plano'; clinica: any }
  | { type: 'suspender'; clinica: any }
  | { type: 'trial'; clinica: any }
  | { type: 'deletar'; clinica: any }
  | null;

export default function AdminSynkaPage() {
  const [secret, setSecret] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [metrics, setMetrics] = useState<any>(null);
  const [clinicas, setClinicas] = useState<any[]>([]);
  const [modal, setModal] = useState<Modal>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  // Form states
  const [editNome, setEditNome] = useState('');
  const [editNicho, setEditNicho] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editPlano, setEditPlano] = useState('');
  const [editStatusAssinatura, setEditStatusAssinatura] = useState('');
  const [editDiasTrial, setEditDiasTrial] = useState('');
  const [editMotivoSuspensao, setEditMotivoSuspensao] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(API('/api/admin/metrics'));
      if (res.ok) {
        const data = await res.json();
        setMetrics(data.metrics);
        setAuthenticated(true);
        fetchClinicas();
      } else {
        alert('Senha incorreta');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchClinicas = async () => {
    const res = await fetch(API('/api/admin/tenants'));
    if (res.ok) {
      const data = await res.json();
      setClinicas(data.clinicas);
    }
  };

  const apiPut = async (tenantId: string, body: object) => {
    setSaving(true);
    try {
      const res = await fetch(API(`/api/admin/tenants/${tenantId}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) { const d = await res.json(); alert(d.error ?? 'Erro'); return false; }
      return true;
    } finally {
      setSaving(false);
    }
  };

  // ── Ações ──────────────────────────────────────────────────────────────────

  const salvarEdicao = async () => {
    if (!modal || modal.type !== 'editar') return;
    const ok = await apiPut(modal.clinica.tenantId, { nome: editNome, nicho: editNicho, adminPhone: editPhone });
    if (ok) { setModal(null); fetchClinicas(); }
  };

  const salvarPlano = async () => {
    if (!modal || modal.type !== 'plano') return;
    const ok = await apiPut(modal.clinica.tenantId, { plano: editPlano, statusAssinatura: editStatusAssinatura });
    if (ok) { setModal(null); fetchClinicas(); }
  };

  const salvarTrial = async () => {
    if (!modal || modal.type !== 'trial') return;
    if (!editDiasTrial || Number(editDiasTrial) <= 0) { alert('Informe a quantidade de dias'); return; }
    const ok = await apiPut(modal.clinica.tenantId, { diasTrial: Number(editDiasTrial) });
    if (ok) { setModal(null); fetchClinicas(); }
  };

  const suspender = async (tipo: 'suspender_manual' | 'suspender_inadimplencia') => {
    if (!modal || modal.type !== 'suspender') return;
    const ok = await apiPut(modal.clinica.tenantId, { acao: tipo, motivoSuspensao: editMotivoSuspensao || undefined });
    if (ok) { setModal(null); fetchClinicas(); }
  };

  const reativar = async (tenantId: string) => {
    const ok = await apiPut(tenantId, { acao: 'reativar' });
    if (ok) fetchClinicas();
  };

  const deletar = async () => {
    if (!modal || modal.type !== 'deletar') return;
    setSaving(true);
    try {
      const res = await fetch(API(`/api/admin/tenants/${modal.clinica.tenantId}`), { method: 'DELETE' });
      if (res.ok) { setModal(null); fetchClinicas(); }
      else { const d = await res.json(); alert(d.error ?? 'Erro ao deletar'); }
    } finally {
      setSaving(false);
    }
  };

  // ── Helpers de abertura de modal ───────────────────────────────────────────

  const abrirEditar = (c: any) => {
    setEditNome(c.nome);
    setEditNicho(c.nicho);
    setEditPhone(c.adminPhone ?? '');
    setModal({ type: 'editar', clinica: c });
  };

  const abrirPlano = (c: any) => {
    setEditPlano(c.assinatura?.plano ?? 'starter');
    setEditStatusAssinatura(c.assinatura?.status ?? 'trial');
    setModal({ type: 'plano', clinica: c });
  };

  const abrirSuspender = (c: any) => {
    setEditMotivoSuspensao('');
    setModal({ type: 'suspender', clinica: c });
  };

  const abrirTrial = (c: any) => {
    setEditDiasTrial('7');
    setModal({ type: 'trial', clinica: c });
  };

  const filtradas = clinicas.filter(c =>
    c.nome.toLowerCase().includes(search.toLowerCase()) ||
    c.tenantId.toLowerCase().includes(search.toLowerCase())
  );

  // ── Login ──────────────────────────────────────────────────────────────────

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-[#050510] flex items-center justify-center text-white p-4">
        <form onSubmit={handleAuth} className="bg-[#0a0a20] p-8 rounded-2xl border border-white/10 w-full max-w-sm text-center">
          <div className="w-16 h-16 bg-[#4a4ae2]/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-3xl">🛡️</span>
          </div>
          <h2 className="text-xl font-bold mb-2">Synka Master</h2>
          <p className="text-gray-400 text-sm mb-6">Acesso restrito</p>
          <input
            type="password"
            autoComplete="new-password"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            placeholder="Senha Mestra"
            className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#4a4ae2] transition-colors mb-4 text-center"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[#4a4ae2] hover:bg-[#3a3ab2] rounded-xl text-sm font-semibold transition-all shadow-[0_4px_20px_rgba(74,74,226,0.35)]"
          >
            {loading ? 'Verificando...' : 'Acessar'}
          </button>
        </form>
      </div>
    );
  }

  // ── Painel Principal ───────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#050510] text-white p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0a0a20]/80 border border-white/5 p-6 rounded-2xl">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-tr from-[#4a4ae2] to-[#8080ff] rounded-xl flex items-center justify-center text-2xl shadow-[0_0_20px_rgba(74,74,226,0.3)]">👑</div>
            <div>
              <h1 className="text-2xl font-bold">Synka Master</h1>
              <p className="text-sm text-gray-400">{clinicas.length} empresas cadastradas</p>
            </div>
          </div>
          <button onClick={() => setAuthenticated(false)} className="text-sm text-gray-400 hover:text-white transition-colors">
            Sair [✕]
          </button>
        </div>

        {/* KPIs */}
        {metrics && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KPI label="Empresas" value={metrics.totalClinicas} color="text-white" />
            <KPI label="Ativas" value={metrics.clinicasAtivas} color="text-green-400" />
            <KPI label="Agendamentos (mês)" value={metrics.totalAgendamentosMes} color="text-[#8080ff]" />
            <KPI label="Total Pacientes" value={metrics.totalPacientes} color="text-orange-400" />
          </div>
        )}

        {/* Busca */}
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar empresa ou tenant ID..."
          className="w-full bg-[#0a0a20] border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#4a4ae2] transition-colors"
        />

        {/* Tabela */}
        <div className="bg-[#0a0a20]/50 border border-white/5 rounded-2xl overflow-hidden">
          <div className="p-5 border-b border-white/5 flex items-center justify-between">
            <h2 className="font-bold text-lg">Empresas (Tenants)</h2>
            <span className="text-xs text-gray-500">{filtradas.length} resultado(s)</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-gray-400 uppercase tracking-wider bg-white/5">
                <tr>
                  <th className="px-5 py-3 font-medium">Empresa</th>
                  <th className="px-5 py-3 font-medium">Nicho</th>
                  <th className="px-5 py-3 font-medium text-center">Uso</th>
                  <th className="px-5 py-3 font-medium">Plano</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtradas.map((c) => {
                  const motivo = (c.configBranding as any)?.motivoSuspensao;
                  const trialEnd = (c.configBranding as any)?.trialEndsAt;
                  return (
                    <tr key={c.id} className="hover:bg-white/[0.03] transition-colors group">
                      <td className="px-5 py-4">
                        <p className="font-bold text-white">{c.nome}</p>
                        <p className="text-[10px] text-gray-500 font-mono mt-0.5">{c.tenantId}</p>
                        {trialEnd && (
                          <p className="text-[9px] text-yellow-500 mt-0.5">
                            Trial até {new Date(trialEnd).toLocaleDateString('pt-BR')}
                          </p>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <span className="px-2 py-1 bg-white/10 text-gray-300 rounded-lg text-[10px] font-semibold">
                          {c.nicho?.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-center text-[11px] text-gray-400 space-y-0.5">
                        <p><span className="text-white font-bold">{c._count?.agendamentos ?? 0}</span> agend.</p>
                        <p><span className="text-white font-bold">{c._count?.pacientes ?? 0}</span> pac.</p>
                        <p><span className="text-white font-bold">{c._count?.profissionais ?? 0}</span> prof.</p>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold border ${planColor(c.assinatura?.plano)}`}>
                          {c.assinatura?.plano ?? 'sem plano'}
                        </span>
                        {c.assinatura?.status && (
                          <p className="text-[9px] text-gray-500 mt-1">{c.assinatura.status}</p>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold border ${statusColor(c.botActive, motivo)}`}>
                          {statusLabel(c.botActive, motivo)}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-1.5 flex-wrap">
                          <ActionBtn onClick={() => abrirEditar(c)} label="Editar" color="default" />
                          <ActionBtn onClick={() => abrirPlano(c)} label="Plano" color="blue" />
                          <ActionBtn onClick={() => abrirTrial(c)} label="Trial" color="yellow" />
                          {c.botActive
                            ? <ActionBtn onClick={() => abrirSuspender(c)} label="Suspender" color="orange" />
                            : <ActionBtn onClick={() => reativar(c.tenantId)} label="Reativar" color="green" />
                          }
                          <ActionBtn onClick={() => setModal({ type: 'deletar', clinica: c })} label="Deletar" color="red" />
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtradas.length === 0 && (
                  <tr><td colSpan={6} className="px-5 py-12 text-center text-gray-500">Nenhuma empresa encontrada</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Modais ── */}

      {/* Editar */}
      {modal?.type === 'editar' && (
        <Modal title={`Editar: ${modal.clinica.nome}`} onClose={() => setModal(null)}>
          <Field label="Nome da Empresa">
            <input className="modal-input" value={editNome} onChange={e => setEditNome(e.target.value)} />
          </Field>
          <Field label="Nicho">
            <select className="modal-input" value={editNicho} onChange={e => setEditNicho(e.target.value)}>
              {NICHOS.map(n => <option key={n} value={n}>{n.replace(/_/g, ' ')}</option>)}
            </select>
          </Field>
          <Field label="Telefone Admin">
            <input className="modal-input" value={editPhone} onChange={e => setEditPhone(e.target.value)} placeholder="5585..." />
          </Field>
          <ModalActions onCancel={() => setModal(null)} onConfirm={salvarEdicao} saving={saving} label="Salvar" />
        </Modal>
      )}

      {/* Plano */}
      {modal?.type === 'plano' && (
        <Modal title={`Plano: ${modal.clinica.nome}`} onClose={() => setModal(null)}>
          <Field label="Plano">
            <select className="modal-input" value={editPlano} onChange={e => setEditPlano(e.target.value)}>
              {PLANOS.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
            </select>
          </Field>
          <Field label="Status da Assinatura">
            <select className="modal-input" value={editStatusAssinatura} onChange={e => setEditStatusAssinatura(e.target.value)}>
              {['trial', 'active', 'past_due', 'canceled'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
          <ModalActions onCancel={() => setModal(null)} onConfirm={salvarPlano} saving={saving} label="Salvar Plano" />
        </Modal>
      )}

      {/* Trial */}
      {modal?.type === 'trial' && (
        <Modal title={`Adicionar Trial: ${modal.clinica.nome}`} onClose={() => setModal(null)}>
          <Field label="Dias de Trial a adicionar">
            <input
              className="modal-input"
              type="number"
              min="1"
              max="365"
              value={editDiasTrial}
              onChange={e => setEditDiasTrial(e.target.value)}
            />
          </Field>
          <p className="text-xs text-gray-500 mt-1">O status da assinatura será definido como "trial" e a data de término calculada a partir de hoje.</p>
          <ModalActions onCancel={() => setModal(null)} onConfirm={salvarTrial} saving={saving} label="Conceder Trial" />
        </Modal>
      )}

      {/* Suspender */}
      {modal?.type === 'suspender' && (
        <Modal title={`Suspender: ${modal.clinica.nome}`} onClose={() => setModal(null)}>
          <Field label="Motivo (opcional)">
            <input
              className="modal-input"
              value={editMotivoSuspensao}
              onChange={e => setEditMotivoSuspensao(e.target.value)}
              placeholder="Ex: Conta em revisão"
            />
          </Field>
          <div className="flex gap-3 mt-6">
            <button onClick={() => setModal(null)} className="flex-1 py-3 bg-white/5 rounded-xl text-sm font-bold hover:bg-white/10 transition-all">Cancelar</button>
            <button
              onClick={() => suspender('suspender_inadimplencia')}
              disabled={saving}
              className="flex-1 py-3 bg-orange-500/20 text-orange-400 rounded-xl text-sm font-bold hover:bg-orange-500/30 transition-all border border-orange-500/20"
            >
              ⚠ Inadimplência
            </button>
            <button
              onClick={() => suspender('suspender_manual')}
              disabled={saving}
              className="flex-1 py-3 bg-red-500/20 text-red-400 rounded-xl text-sm font-bold hover:bg-red-500/30 transition-all border border-red-500/20"
            >
              ✕ Manual
            </button>
          </div>
        </Modal>
      )}

      {/* Deletar */}
      {modal?.type === 'deletar' && (
        <Modal title="⚠ Confirmar Exclusão" onClose={() => setModal(null)}>
          <p className="text-gray-300 text-sm leading-relaxed">
            Você está prestes a <strong className="text-red-400">deletar permanentemente</strong> a empresa:
          </p>
          <div className="my-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
            <p className="font-bold text-white">{modal.clinica.nome}</p>
            <p className="text-xs text-gray-400 font-mono">{modal.clinica.tenantId}</p>
          </div>
          <p className="text-xs text-gray-500">Esta ação é irreversível. Todos os dados da empresa serão removidos.</p>
          <div className="flex gap-3 mt-6">
            <button onClick={() => setModal(null)} className="flex-1 py-3 bg-white/5 rounded-xl text-sm font-bold hover:bg-white/10 transition-all">Cancelar</button>
            <button
              onClick={deletar}
              disabled={saving}
              className="flex-1 py-3 bg-red-500 text-white rounded-xl text-sm font-bold hover:bg-red-600 transition-all"
            >
              {saving ? 'Deletando...' : 'Confirmar Exclusão'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Componentes auxiliares ──────────────────────────────────────────────────

const KPI = ({ label, value, color }: { label: string; value: any; color: string }) => (
  <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
    <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold mb-1">{label}</p>
    <p className={`text-4xl font-bold ${color}`}>{value ?? '—'}</p>
  </div>
);

const ActionBtn = ({ onClick, label, color }: { onClick: () => void; label: string; color: string }) => {
  const colors: Record<string, string> = {
    default: 'bg-white/5 text-gray-300 hover:bg-white/10',
    blue:    'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20',
    yellow:  'bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20',
    green:   'bg-green-500/10 text-green-400 hover:bg-green-500/20',
    orange:  'bg-orange-500/10 text-orange-400 hover:bg-orange-500/20',
    red:     'bg-red-500/10 text-red-400 hover:bg-red-500/20',
  };
  return (
    <button onClick={onClick} className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wide transition-all ${colors[color]}`}>
      {label}
    </button>
  );
};

const Modal = ({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
    <div className="bg-[#0a0a20] border border-white/10 p-8 rounded-3xl w-full max-w-md">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold">{title}</h3>
        <button onClick={onClose} className="text-gray-500 hover:text-white text-xl leading-none">✕</button>
      </div>
      {children}
    </div>
  </div>
);

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="mb-4">
    <label className="block text-xs text-gray-400 uppercase font-black tracking-widest mb-1.5">{label}</label>
    {children}
  </div>
);

const ModalActions = ({ onCancel, onConfirm, saving, label }: { onCancel: () => void; onConfirm: () => void; saving: boolean; label: string }) => (
  <div className="flex gap-3 mt-6">
    <button onClick={onCancel} className="flex-1 py-3 bg-white/5 rounded-xl text-sm font-bold hover:bg-white/10 transition-all">Cancelar</button>
    <button onClick={onConfirm} disabled={saving} className="flex-1 py-3 bg-[#4a4ae2] rounded-xl text-sm font-bold hover:bg-[#3a3ab2] transition-all">
      {saving ? 'Salvando...' : label}
    </button>
  </div>
);
