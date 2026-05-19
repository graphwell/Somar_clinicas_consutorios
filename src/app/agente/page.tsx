"use client";
import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

const ROLES = ['admin', 'recepcao', 'profissional', 'temporario'];

const roleColor = (r: string) => {
  if (r === 'admin') return 'text-purple-400 bg-purple-500/10 border-purple-500/20';
  if (r === 'recepcao') return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
  if (r === 'profissional') return 'text-green-400 bg-green-500/10 border-green-500/20';
  return 'text-gray-400 bg-white/5 border-white/10';
};

const Campo = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="py-3 border-b border-white/5 last:border-0">
    <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-0.5">{label}</p>
    <p className="text-sm text-white">{value ?? <span className="text-gray-600">—</span>}</p>
  </div>
);

const Modal = ({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
    <div className="bg-[#0a0a20] border border-white/10 p-8 rounded-3xl w-full max-w-md">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold">{title}</h3>
        <button onClick={onClose} className="text-gray-500 hover:text-white">
          <svg width="16" height="16" viewBox="0 0 12 12" fill="none">
            <path d="M9 3L3 9M3 3l6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>
      {children}
    </div>
  </div>
);

function AgenteContent() {
  const searchParams = useSearchParams();
  const targetUserId = searchParams.get('targetUserId');

  const [secret, setSecret] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);

  const [usuario, setUsuario] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');

  type Modal =
    | { type: 'editar' }
    | { type: 'senha' }
    | { type: 'expiracao' }
    | { type: 'deletar' }
    | null;

  const [modal, setModal] = useState<Modal>(null);

  // Form states
  const [editNome, setEditNome] = useState('');
  const [editSobrenome, setEditSobrenome] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editTelefone, setEditTelefone] = useState('');
  const [editRole, setEditRole] = useState('');
  const [editEmailVerificado, setEditEmailVerificado] = useState(false);
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmaSenha, setConfirmaSenha] = useState('');
  const [editExpiracao, setEditExpiracao] = useState('');

  const apiBase = (path: string) => `${path}?secret=${secret}`;

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    try {
      const res = await fetch(apiBase('/api/admin/metrics'), {
        headers: { 'x-admin-secret': secret },
      });
      if (res.ok) {
        setAuthenticated(true);
        carregarUsuario(secret);
      } else {
        alert('Senha incorreta');
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const carregarUsuario = async (s = secret) => {
    if (!targetUserId) return;
    setLoading(true);
    setErro('');
    try {
      const res = await fetch(`/api/admin/usuarios/${targetUserId}?secret=${s}`, {
        headers: { 'x-admin-secret': s },
      });
      const data = await res.json();
      if (res.ok) {
        setUsuario(data.usuario);
      } else {
        setErro(data.error ?? 'Erro ao carregar usuário');
      }
    } finally {
      setLoading(false);
    }
  };

  const mostrarSucesso = (msg: string) => {
    setSucesso(msg);
    setTimeout(() => setSucesso(''), 3000);
  };

  const apiPatch = async (body: object) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/usuarios/${targetUserId}?secret=${secret}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-admin-secret': secret },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok) {
        await carregarUsuario();
        return true;
      }
      alert(data.error ?? 'Erro ao salvar');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const abrirEditar = () => {
    setEditNome(usuario.nome ?? '');
    setEditSobrenome(usuario.sobrenome ?? '');
    setEditEmail(usuario.email ?? '');
    setEditTelefone(usuario.telefone ?? '');
    setEditRole(usuario.role ?? 'recepcao');
    setEditEmailVerificado(usuario.emailVerificado ?? false);
    setModal({ type: 'editar' });
  };

  const salvarEdicao = async () => {
    const ok = await apiPatch({
      nome: editNome,
      sobrenome: editSobrenome,
      email: editEmail,
      telefone: editTelefone,
      role: editRole,
      emailVerificado: editEmailVerificado,
    });
    if (ok) { setModal(null); mostrarSucesso('Dados atualizados com sucesso.'); }
  };

  const salvarSenha = async () => {
    if (novaSenha.length < 6) { alert('A senha deve ter pelo menos 6 caracteres'); return; }
    if (novaSenha !== confirmaSenha) { alert('As senhas não coincidem'); return; }
    const ok = await apiPatch({ novaSenha });
    if (ok) { setModal(null); setNovaSenha(''); setConfirmaSenha(''); mostrarSucesso('Senha redefinida com sucesso.'); }
  };

  const salvarExpiracao = async () => {
    const ok = await apiPatch({ acessoExpiraEm: editExpiracao || null });
    if (ok) { setModal(null); mostrarSucesso('Data de expiração atualizada.'); }
  };

  const toggleAtivo = async () => {
    const ok = await apiPatch({ ativo: !usuario.ativo });
    if (ok) mostrarSucesso(usuario.ativo ? 'Usuário desativado.' : 'Usuário reativado.');
  };

  const deletarUsuario = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/usuarios/${targetUserId}?secret=${secret}`, {
        method: 'DELETE',
        headers: { 'x-admin-secret': secret },
      });
      if (res.ok) {
        setModal(null);
        setUsuario(null);
        mostrarSucesso('Usuário deletado permanentemente.');
      } else {
        const data = await res.json();
        alert(data.error ?? 'Erro ao deletar');
      }
    } finally {
      setSaving(false);
    }
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-[#050510] flex items-center justify-center text-white p-4">
        <form onSubmit={handleAuth} className="bg-[#0a0a20] p-8 rounded-2xl border border-white/10 w-full max-w-sm text-center">
          <div className="w-16 h-16 bg-[#4a4ae2]/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#4a4ae2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold mb-2">Synka Master</h2>
          <p className="text-gray-400 text-sm mb-1">Gestão de Usuário</p>
          {targetUserId && (
            <p className="text-[10px] text-gray-600 font-mono mb-6 truncate">{targetUserId}</p>
          )}
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
            disabled={authLoading}
            className="w-full py-3 bg-[#4a4ae2] hover:bg-[#3a3ab2] rounded-xl text-sm font-semibold transition-all shadow-[0_4px_20px_rgba(74,74,226,0.35)]"
          >
            {authLoading ? 'Verificando...' : 'Acessar'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050510] text-white p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between bg-[#0a0a20]/80 border border-white/5 p-5 rounded-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-tr from-[#4a4ae2] to-[#8080ff] rounded-xl flex items-center justify-center shadow-[0_0_16px_rgba(74,74,226,0.3)]">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <div>
              <h1 className="font-bold text-lg">Gestão de Usuário</h1>
              <p className="text-[10px] text-gray-500 font-mono">{targetUserId}</p>
            </div>
          </div>
          <button onClick={() => setAuthenticated(false)} className="text-xs text-gray-500 hover:text-white transition-colors">
            Sair
          </button>
        </div>

        {/* Toast de sucesso */}
        {sucesso && (
          <div className="bg-green-500/10 border border-green-500/20 text-green-400 text-sm px-5 py-3 rounded-xl text-center font-semibold">
            {sucesso}
          </div>
        )}

        {loading && (
          <div className="text-center text-gray-500 py-16">Carregando...</div>
        )}

        {erro && !loading && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-5 py-4 rounded-xl text-center">
            {erro}
          </div>
        )}

        {!loading && !erro && !usuario && (
          <div className="text-center text-gray-500 py-16">Usuário não encontrado ou deletado.</div>
        )}

        {usuario && (
          <>
            {/* Card principal do usuário */}
            <div className="bg-[#0a0a20]/50 border border-white/5 rounded-2xl p-6 space-y-1">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  {usuario.avatarUrl ? (
                    <img src={usuario.avatarUrl} alt="avatar" className="w-14 h-14 rounded-full object-cover border border-white/10" />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-[#4a4ae2]/20 flex items-center justify-center text-[#8080ff] font-bold text-xl">
                      {(usuario.nome?.[0] ?? usuario.email?.[0] ?? '?').toUpperCase()}
                    </div>
                  )}
                  <div>
                    <h2 className="font-bold text-xl">{[usuario.nome, usuario.sobrenome].filter(Boolean).join(' ') || '(sem nome)'}</h2>
                    <p className="text-sm text-gray-400">{usuario.email}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${roleColor(usuario.role)}`}>
                        {usuario.role}
                      </span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                        usuario.ativo
                          ? 'text-green-400 bg-green-500/10 border-green-500/20'
                          : 'text-red-400 bg-red-500/10 border-red-500/20'
                      }`}>
                        {usuario.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <Campo label="ID" value={<span className="font-mono text-[11px]">{usuario.id}</span>} />
              <Campo label="Tenant ID" value={<span className="font-mono text-[11px]">{usuario.tenantId}</span>} />
              <Campo label="Empresa" value={usuario.clinica?.nome ?? '—'} />
              <Campo label="Nicho" value={usuario.clinica?.nicho?.replace(/_/g, ' ')} />
              <Campo label="Telefone" value={usuario.telefone} />
              <Campo label="Google OAuth" value={usuario.googleId ? `Sim (${usuario.googleEmail})` : 'Não'} />
              <Campo label="E-mail verificado" value={usuario.emailVerificado ? 'Sim' : 'Não'} />
              <Campo label="Perfil completo" value={usuario.perfilCompleto ? 'Sim' : 'Não'} />
              <Campo label="Primeiro acesso" value={usuario.primeiroAcesso ? 'Pendente' : 'Concluído'} />
              <Campo
                label="Expiração de acesso"
                value={usuario.acessoExpiraEm
                  ? new Date(usuario.acessoExpiraEm).toLocaleString('pt-BR')
                  : 'Sem expiração'}
              />
              <Campo label="Criado em" value={new Date(usuario.createdAt).toLocaleString('pt-BR')} />
              <Campo label="Atualizado em" value={new Date(usuario.updatedAt).toLocaleString('pt-BR')} />
            </div>

            {/* Ações */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <ActionBtn onClick={abrirEditar} label="Editar dados" icon="edit" color="default" />
              <ActionBtn onClick={() => { setEditExpiracao(usuario.acessoExpiraEm ? usuario.acessoExpiraEm.slice(0, 16) : ''); setModal({ type: 'expiracao' }); }} label="Alterar expiração" icon="clock" color="yellow" />
              <ActionBtn onClick={() => { setNovaSenha(''); setConfirmaSenha(''); setModal({ type: 'senha' }); }} label="Redefinir senha" icon="key" color="blue" disabled={!!usuario.googleId} />
              <ActionBtn onClick={toggleAtivo} label={usuario.ativo ? 'Desativar acesso' : 'Reativar acesso'} icon="toggle" color={usuario.ativo ? 'orange' : 'green'} loading={saving} />
              <ActionBtn onClick={() => setModal({ type: 'deletar' })} label="Deletar usuário" icon="trash" color="red" />
            </div>
          </>
        )}
      </div>

      {/* Modal: Editar */}
      {modal?.type === 'editar' && (
        <Modal title="Editar Dados do Usuário" onClose={() => setModal(null)}>
          <div className="space-y-4">
            <FormField label="Nome">
              <input className="modal-input" value={editNome} onChange={e => setEditNome(e.target.value)} placeholder="Nome" />
            </FormField>
            <FormField label="Sobrenome">
              <input className="modal-input" value={editSobrenome} onChange={e => setEditSobrenome(e.target.value)} placeholder="Sobrenome" />
            </FormField>
            <FormField label="E-mail">
              <input className="modal-input" type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)} />
            </FormField>
            <FormField label="Telefone">
              <input className="modal-input" value={editTelefone} onChange={e => setEditTelefone(e.target.value)} placeholder="5585..." />
            </FormField>
            <FormField label="Role">
              <select className="modal-input" value={editRole} onChange={e => setEditRole(e.target.value)}>
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </FormField>
            <FormField label="E-mail verificado">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editEmailVerificado}
                  onChange={e => setEditEmailVerificado(e.target.checked)}
                  className="accent-[#4a4ae2] w-4 h-4"
                />
                <span className="text-sm text-gray-300">{editEmailVerificado ? 'Sim' : 'Não'}</span>
              </label>
            </FormField>
          </div>
          <ModalActions onCancel={() => setModal(null)} onConfirm={salvarEdicao} saving={saving} label="Salvar" />
        </Modal>
      )}

      {/* Modal: Senha */}
      {modal?.type === 'senha' && (
        <Modal title="Redefinir Senha" onClose={() => setModal(null)}>
          <div className="space-y-4">
            <FormField label="Nova Senha">
              <input className="modal-input" type="password" value={novaSenha} onChange={e => setNovaSenha(e.target.value)} placeholder="Mínimo 6 caracteres" />
            </FormField>
            <FormField label="Confirmar Senha">
              <input className="modal-input" type="password" value={confirmaSenha} onChange={e => setConfirmaSenha(e.target.value)} placeholder="Repita a senha" />
            </FormField>
          </div>
          <ModalActions onCancel={() => setModal(null)} onConfirm={salvarSenha} saving={saving} label="Redefinir" />
        </Modal>
      )}

      {/* Modal: Expiração */}
      {modal?.type === 'expiracao' && (
        <Modal title="Alterar Expiração de Acesso" onClose={() => setModal(null)}>
          <div className="space-y-4">
            <FormField label="Data e hora de expiração">
              <input
                className="modal-input"
                type="datetime-local"
                value={editExpiracao}
                onChange={e => setEditExpiracao(e.target.value)}
              />
            </FormField>
            <p className="text-xs text-gray-500">Deixe em branco para remover a expiração (acesso permanente).</p>
          </div>
          <ModalActions onCancel={() => setModal(null)} onConfirm={salvarExpiracao} saving={saving} label="Salvar" />
        </Modal>
      )}

      {/* Modal: Deletar */}
      {modal?.type === 'deletar' && (
        <Modal title="Confirmar Exclusão" onClose={() => setModal(null)}>
          <p className="text-gray-300 text-sm leading-relaxed">
            Você está prestes a <strong className="text-red-400">deletar permanentemente</strong> o usuário:
          </p>
          <div className="my-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
            <p className="font-bold text-white">{[usuario?.nome, usuario?.sobrenome].filter(Boolean).join(' ') || '(sem nome)'}</p>
            <p className="text-xs text-gray-400">{usuario?.email}</p>
            <p className="text-[10px] text-gray-600 font-mono mt-1">{targetUserId}</p>
          </div>
          <p className="text-xs text-gray-500">Esta ação é irreversível.</p>
          <div className="flex gap-3 mt-6">
            <button onClick={() => setModal(null)} className="flex-1 py-3 bg-white/5 rounded-xl text-sm font-bold hover:bg-white/10 transition-all">
              Cancelar
            </button>
            <button
              onClick={deletarUsuario}
              disabled={saving}
              className="flex-1 py-3 bg-red-500 text-white rounded-xl text-sm font-bold hover:bg-red-600 transition-all"
            >
              {saving ? 'Deletando...' : 'Confirmar Exclusão'}
            </button>
          </div>
        </Modal>
      )}

      <style>{`
        .modal-input {
          width: 100%;
          background: rgba(0,0,0,0.4);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 12px;
          padding: 10px 14px;
          font-size: 14px;
          color: white;
          outline: none;
          transition: border-color 0.15s;
        }
        .modal-input:focus { border-color: #4a4ae2; }
        .modal-input option { background: #0a0a20; }
      `}</style>
    </div>
  );
}

const ActionBtn = ({
  onClick,
  label,
  icon,
  color,
  loading,
  disabled,
}: {
  onClick: () => void;
  label: string;
  icon: string;
  color: string;
  loading?: boolean;
  disabled?: boolean;
}) => {
  const colors: Record<string, string> = {
    default: 'bg-white/5 text-gray-300 hover:bg-white/10 border-white/10',
    blue:    'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border-blue-500/20',
    yellow:  'bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20 border-yellow-500/20',
    green:   'bg-green-500/10 text-green-400 hover:bg-green-500/20 border-green-500/20',
    orange:  'bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 border-orange-500/20',
    red:     'bg-red-500/10 text-red-400 hover:bg-red-500/20 border-red-500/20',
  };

  const icons: Record<string, JSX.Element> = {
    edit:   <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
    key:    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="15" r="5"/><path d="M21 2l-9.3 9.3"/><path d="M15 8l3 3"/></svg>,
    clock:  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
    toggle: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="5" width="22" height="14" rx="7"/><circle cx="8" cy="12" r="3"/></svg>,
    trash:  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>,
  };

  return (
    <button
      onClick={onClick}
      disabled={loading || disabled}
      className={`flex items-center gap-2 justify-center px-4 py-3 rounded-xl text-xs font-bold border transition-all disabled:opacity-40 disabled:cursor-not-allowed ${colors[color]}`}
    >
      {loading ? (
        <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
      ) : (
        icons[icon]
      )}
      {label}
    </button>
  );
};

const FormField = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <label className="block text-[10px] text-gray-400 uppercase font-black tracking-widest mb-1.5">{label}</label>
    {children}
  </div>
);

const ModalActions = ({ onCancel, onConfirm, saving, label }: { onCancel: () => void; onConfirm: () => void; saving: boolean; label: string }) => (
  <div className="flex gap-3 mt-6">
    <button onClick={onCancel} className="flex-1 py-3 bg-white/5 rounded-xl text-sm font-bold hover:bg-white/10 transition-all">
      Cancelar
    </button>
    <button onClick={onConfirm} disabled={saving} className="flex-1 py-3 bg-[#4a4ae2] rounded-xl text-sm font-bold hover:bg-[#3a3ab2] transition-all disabled:opacity-60">
      {saving ? 'Salvando...' : label}
    </button>
  </div>
);

export default function AgentePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#050510] flex items-center justify-center text-gray-500">
        Carregando...
      </div>
    }>
      <AgenteContent />
    </Suspense>
  );
}
