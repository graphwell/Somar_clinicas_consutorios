'use client';
import { useEffect, useState, useCallback } from 'react';
import { fetchWithAuth } from '@/lib/api-utils';

/* ─── Tipos ──────────────────────────────────────────────── */
interface Usuario {
  id: string;
  nome: string | null;
  email: string;
  role: string;
  telefone: string | null;
  avatarUrl: string | null;
  createdAt: string;
  profissionalId: string | null;
  profissional: { nome: string; fotoUrl: string | null } | null;
}

interface Convite {
  id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  role: string;
  createdAt: string;
  expirarEm: string;
  token: string;
}

interface Profissional {
  id: string;
  nome: string;
}

/* ─── Constantes ─────────────────────────────────────────── */
const ROLE_LABEL: Record<string, string> = {
  admin: 'Administrador',
  recepcao: 'Recepção',
  profissional: 'Profissional',
  temporario: 'Temporário',
};

const ROLE_COLOR: Record<string, string> = {
  admin:        '#1B2B3A',
  recepcao:     '#2D6A4F',
  profissional: '#1E40AF',
  temporario:   '#92400E',
};

const ROLE_BG: Record<string, string> = {
  admin:        '#F1F5F9',
  recepcao:     '#F0FAF4',
  profissional: '#EFF6FF',
  temporario:   '#FEF3C7',
};

/* ─── Helpers ─────────────────────────────────────────────── */
function iniciais(nome: string): string {
  return nome.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
}

function diasRestantes(iso: string): number {
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000));
}

function tempoDecorrido(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return 'agora';
  if (h < 24) return `há ${h}h`;
  const d = Math.floor(h / 24);
  return `há ${d} dia${d > 1 ? 's' : ''}`;
}

/* ─── Componente principal ───────────────────────────────── */
export default function PermissionsPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [convites, setConvites] = useState<Convite[]>([]);
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState('');

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [modo, setModo] = useState<'convite' | 'direto'>('convite');
  const [form, setForm] = useState({
    nome: '', email: '', telefone: '',
    role: 'recepcao', senha: '', profissionalId: '',
  });
  const [salvando, setSalvando] = useState(false);
  const [erroForm, setErroForm] = useState('');
  const [linkConvite, setLinkConvite] = useState('');

  // Inline actions
  const [alterandoRole, setAlterandoRole] = useState<string | null>(null);
  const [removendo, setRemovendo] = useState<string | null>(null);

  /* ── Carregar dados ── */
  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const [rUsers, rProfs] = await Promise.all([
        fetchWithAuth('/api/permissions/users').then(r => r.json()),
        fetchWithAuth('/api/team').then(r => r.json()),
      ]);
      setUsuarios(rUsers.usuarios ?? []);
      setConvites(rUsers.convites ?? []);
      setProfissionais(Array.isArray(rProfs) ? rProfs : []);
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    carregar();
    try {
      const u = JSON.parse(localStorage.getItem('synka-user') || '{}');
      setCurrentUserId(u.id ?? '');
    } catch {}
  }, [carregar]);

  /* ── Alterar role ── */
  async function alterarRole(id: string, novoRole: string) {
    setAlterandoRole(id);
    try {
      await fetchWithAuth(`/api/permissions/users/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ role: novoRole }),
      });
      setUsuarios(prev => prev.map(u => u.id === id ? { ...u, role: novoRole } : u));
    } catch {}
    finally { setAlterandoRole(null); }
  }

  /* ── Remover usuário ── */
  async function removerUsuario(u: Usuario) {
    if (!confirm(`Remover acesso de ${u.nome ?? u.email}?`)) return;
    setRemovendo(u.id);
    try {
      await fetchWithAuth(`/api/permissions/users/${u.id}`, { method: 'DELETE' });
      setUsuarios(prev => prev.filter(x => x.id !== u.id));
    } catch {}
    finally { setRemovendo(null); }
  }

  /* ── Cancelar convite ── */
  async function cancelarConvite(id: string) {
    if (!confirm('Cancelar este convite?')) return;
    await fetchWithAuth(`/api/permissions/invite?id=${id}`, { method: 'DELETE' });
    setConvites(prev => prev.filter(c => c.id !== id));
  }

  /* ── Copiar link ── */
  function copiarLink(token: string) {
    const link = `${window.location.origin}/convite/${token}`;
    navigator.clipboard.writeText(link).catch(() => {});
  }

  /* ── Salvar no modal ── */
  async function salvar() {
    setErroForm('');
    if (!form.nome.trim()) { setErroForm('Nome obrigatório'); return; }
    if (!form.email.trim() && !form.telefone.trim()) { setErroForm('Email ou telefone obrigatório'); return; }
    if (modo === 'direto' && form.senha.length < 6) { setErroForm('Senha deve ter no mínimo 6 caracteres'); return; }

    setSalvando(true);
    try {
      const url = modo === 'convite' ? '/api/permissions/invite' : '/api/permissions/create-direct';
      const res = await fetchWithAuth(url, {
        method: 'POST',
        body: JSON.stringify({
          nome: form.nome.trim(),
          email: form.email.trim() || undefined,
          telefone: form.telefone.trim() || undefined,
          role: form.role,
          senha: form.senha || undefined,
          profissionalId: form.profissionalId || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setErroForm(data.error || 'Erro ao salvar'); return; }

      if (modo === 'convite' && data.link) {
        setLinkConvite(data.link);
      } else {
        fecharModal();
        carregar();
      }
    } catch {
      setErroForm('Erro de conexão');
    } finally {
      setSalvando(false);
    }
  }

  function fecharModal() {
    setShowModal(false);
    setLinkConvite('');
    setErroForm('');
    setForm({ nome: '', email: '', telefone: '', role: 'recepcao', senha: '', profissionalId: '' });
  }

  /* ── Render ── */
  return (
    <div className="p-6 max-w-3xl mx-auto">

      {/* Cabeçalho */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black italic uppercase tracking-tighter text-text-main">
            Usuários & Permissões
          </h1>
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-text-placeholder opacity-50 mt-1">
            Gerencie quem acessa o sistema
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn-primary text-sm px-5 py-2.5"
        >
          + Novo usuário
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      ) : (
        <>
          {/* ── Seção Usuários ── */}
          <div className="bg-white border border-card-border rounded-[2rem] overflow-hidden shadow-sm mb-6">
            <div className="px-6 py-4 border-b border-slate-50">
              <h2 className="text-sm font-black italic uppercase tracking-tighter text-text-main">
                Equipe ativa
                <span className="ml-2 text-[10px] font-black bg-slate-100 text-text-muted px-2 py-0.5 rounded-full not-italic">
                  {usuarios.length}
                </span>
              </h2>
            </div>

            {usuarios.length === 0 ? (
              <div className="py-12 text-center text-[10px] font-black uppercase tracking-[0.3em] text-text-placeholder opacity-40">
                Nenhum usuário
              </div>
            ) : (
              <div>
                {usuarios.map((u, i) => {
                  const ehVoce = u.id === currentUserId;
                  const nomeExib = u.nome ?? u.email.split('@')[0];
                  return (
                    <div
                      key={u.id}
                      className={`flex items-center gap-4 px-6 py-4 border-b border-slate-50 last:border-0 ${ehVoce ? 'bg-slate-50/50' : 'bg-white'}`}
                    >
                      {/* Avatar */}
                      {u.avatarUrl ? (
                        <img src={u.avatarUrl} className="w-10 h-10 rounded-full object-cover shrink-0" />
                      ) : (
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-black text-white shrink-0"
                          style={{ background: ROLE_COLOR[u.role] ?? '#1B2B3A' }}
                        >
                          {iniciais(nomeExib)}
                        </div>
                      )}

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-text-main">{nomeExib}</p>
                          {ehVoce && (
                            <span className="text-[9px] font-black bg-slate-100 text-text-muted px-2 py-0.5 rounded-full uppercase">você</span>
                          )}
                        </div>
                        <p className="text-[11px] text-text-placeholder truncate">{u.email.includes('@synka.internal') ? u.telefone ?? '—' : u.email}</p>
                      </div>

                      {/* Role selector */}
                      <div className="shrink-0">
                        {ehVoce ? (
                          <span
                            className="text-[10px] font-black px-2.5 py-1 rounded-full uppercase"
                            style={{ background: ROLE_BG[u.role] ?? '#F1F5F9', color: ROLE_COLOR[u.role] ?? '#1B2B3A' }}
                          >
                            {ROLE_LABEL[u.role] ?? u.role}
                          </span>
                        ) : (
                          <select
                            value={u.role}
                            disabled={alterandoRole === u.id}
                            onChange={e => alterarRole(u.id, e.target.value)}
                            className="text-[11px] font-semibold border border-card-border rounded-xl px-2.5 py-1.5 bg-white text-text-main cursor-pointer focus:outline-none focus:border-primary/40 disabled:opacity-40"
                          >
                            <option value="admin">Administrador</option>
                            <option value="recepcao">Recepção</option>
                            <option value="profissional">Profissional</option>
                            <option value="temporario">Temporário</option>
                          </select>
                        )}
                      </div>

                      {/* Remover */}
                      {!ehVoce && (
                        <button
                          onClick={() => removerUsuario(u)}
                          disabled={removendo === u.id}
                          className="text-[10px] font-black text-red-400 hover:text-red-600 transition-colors disabled:opacity-40 shrink-0"
                          title="Remover acesso"
                        >
                          {removendo === u.id ? '…' : '✕'}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Seção Convites ── */}
          {convites.length > 0 && (
            <div className="bg-white border border-card-border rounded-[2rem] overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-slate-50">
                <h2 className="text-sm font-black italic uppercase tracking-tighter text-text-main">
                  Convites pendentes
                  <span className="ml-2 text-[10px] font-black bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full not-italic">
                    {convites.length}
                  </span>
                </h2>
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-text-placeholder opacity-50 mt-0.5">
                  Aguardando o destinatário criar a senha
                </p>
              </div>

              <div>
                {convites.map(c => (
                  <div key={c.id} className="flex items-center gap-4 px-6 py-4 border-b border-slate-50 last:border-0">
                    {/* Ícone */}
                    <div className="w-9 h-9 rounded-full bg-amber-50 border border-amber-100 flex items-center justify-center text-base shrink-0">
                      ⏳
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-text-main">{c.nome}</p>
                      <p className="text-[11px] text-text-placeholder">
                        {c.email ?? c.telefone ?? '—'}
                        {' · '}
                        <span
                          className="font-semibold"
                          style={{ color: ROLE_COLOR[c.role] ?? '#1B2B3A' }}
                        >
                          {ROLE_LABEL[c.role] ?? c.role}
                        </span>
                        {' · '}
                        enviado {tempoDecorrido(c.createdAt)}
                        {' · '}
                        expira em {diasRestantes(c.expirarEm)}d
                      </p>
                    </div>

                    {/* Ações */}
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => copiarLink(c.token)}
                        className="text-[10px] font-black uppercase px-3 py-1.5 border border-card-border rounded-lg bg-white text-text-muted hover:border-primary/30 hover:text-primary transition-colors"
                        title="Copiar link"
                      >
                        Copiar link
                      </button>
                      <button
                        onClick={() => cancelarConvite(c.id)}
                        className="text-[10px] font-black text-red-400 hover:text-red-600 transition-colors px-1"
                      >
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

      {/* ── Modal Novo Usuário ── */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) fecharModal(); }}
        >
          <div className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl overflow-hidden">

            {/* Header */}
            <div className="flex items-center justify-between px-7 pt-7 pb-5 border-b border-slate-50">
              <div>
                <h2 className="text-base font-black italic uppercase tracking-tighter text-text-main">
                  Novo usuário
                </h2>
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-text-placeholder opacity-50 mt-0.5">
                  Conceder acesso ao sistema
                </p>
              </div>
              <button onClick={fecharModal} className="text-text-placeholder hover:text-text-main transition-colors text-xl leading-none">✕</button>
            </div>

            {/* Conteúdo */}
            <div className="px-7 py-6">

              {/* Link gerado com sucesso */}
              {linkConvite ? (
                <div className="text-center">
                  <div className="w-14 h-14 rounded-full bg-green-50 border border-green-100 flex items-center justify-center text-2xl mx-auto mb-4">✓</div>
                  <p className="text-sm font-semibold text-text-main mb-1">Convite criado!</p>
                  <p className="text-[12px] text-text-placeholder mb-5">
                    {form.telefone ? 'Enviado via WhatsApp.' : ''}{form.email ? ' Enviado por email.' : ''} Ou copie o link abaixo:
                  </p>
                  <div className="bg-slate-50 border border-card-border rounded-xl p-3 mb-5 text-left">
                    <p className="text-[11px] text-text-placeholder break-all font-mono">{linkConvite}</p>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => navigator.clipboard.writeText(linkConvite).catch(() => {})}
                      className="flex-1 border border-card-border rounded-xl py-3 text-sm font-semibold text-text-muted hover:border-primary/30 transition-colors"
                    >
                      Copiar link
                    </button>
                    <button
                      onClick={() => { fecharModal(); carregar(); }}
                      className="flex-1 btn-primary py-3 text-sm"
                    >
                      Concluir
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Toggle modo */}
                  <div className="flex gap-1 p-1 bg-slate-100 rounded-xl mb-6">
                    {(['convite', 'direto'] as const).map(m => (
                      <button
                        key={m}
                        onClick={() => setModo(m)}
                        className={`flex-1 text-[11px] font-black uppercase py-2 rounded-lg transition-all ${modo === m ? 'bg-white shadow-sm text-text-main' : 'text-text-placeholder'}`}
                      >
                        {m === 'convite' ? '📩 Enviar convite' : '⚡ Criar agora'}
                      </button>
                    ))}
                  </div>

                  <p className="text-[11px] text-text-placeholder mb-5">
                    {modo === 'convite'
                      ? 'O usuário receberá um link para criar a própria senha.'
                      : 'Você define a senha agora e entrega pessoalmente.'}
                  </p>

                  {/* Campos */}
                  <div className="flex flex-col gap-4">
                    {/* Nome */}
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-wider text-text-placeholder block mb-1.5">Nome completo *</label>
                      <input
                        value={form.nome}
                        onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                        placeholder="Ex: Ana Costa"
                        className="input-premium w-full py-2.5 text-sm"
                      />
                    </div>

                    {/* Email */}
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-wider text-text-placeholder block mb-1.5">
                        Email {modo === 'direto' ? '*' : ''}
                      </label>
                      <input
                        type="email"
                        value={form.email}
                        onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                        placeholder="ana@clinica.com"
                        className="input-premium w-full py-2.5 text-sm"
                      />
                    </div>

                    {/* Telefone */}
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-wider text-text-placeholder block mb-1.5">
                        WhatsApp {modo === 'convite' ? '(para envio do link)' : '(opcional)'}
                      </label>
                      <input
                        type="tel"
                        value={form.telefone}
                        onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))}
                        placeholder="(85) 99999-0000"
                        className="input-premium w-full py-2.5 text-sm"
                      />
                    </div>

                    {/* Função */}
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-wider text-text-placeholder block mb-1.5">Função *</label>
                      <select
                        value={form.role}
                        onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                        className="input-premium w-full py-2.5 text-sm"
                      >
                        <option value="recepcao">Recepção</option>
                        <option value="profissional">Profissional</option>
                        <option value="admin">Administrador</option>
                        <option value="temporario">Temporário</option>
                      </select>
                    </div>

                    {/* Vincular a profissional */}
                    {form.role === 'profissional' && profissionais.length > 0 && (
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-wider text-text-placeholder block mb-1.5">Vincular ao perfil</label>
                        <select
                          value={form.profissionalId}
                          onChange={e => setForm(f => ({ ...f, profissionalId: e.target.value }))}
                          className="input-premium w-full py-2.5 text-sm"
                        >
                          <option value="">Nenhum (criar independente)</option>
                          {profissionais.map(p => (
                            <option key={p.id} value={p.id}>{p.nome}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Senha (só no modo direto) */}
                    {modo === 'direto' && (
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-wider text-text-placeholder block mb-1.5">Senha de acesso *</label>
                        <input
                          type="password"
                          value={form.senha}
                          onChange={e => setForm(f => ({ ...f, senha: e.target.value }))}
                          placeholder="Mínimo 6 caracteres"
                          className="input-premium w-full py-2.5 text-sm"
                        />
                      </div>
                    )}
                  </div>

                  {erroForm && (
                    <p className="text-[12px] text-red-500 mt-4 text-center">{erroForm}</p>
                  )}

                  {/* Botões */}
                  <div className="flex gap-3 mt-6">
                    <button
                      onClick={fecharModal}
                      className="flex-1 border border-card-border rounded-xl py-3 text-sm font-semibold text-text-muted hover:border-primary/30 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={salvar}
                      disabled={salvando}
                      className="flex-2 btn-primary py-3 text-sm flex-[2] flex items-center justify-center gap-2 disabled:opacity-60"
                    >
                      {salvando && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                      {salvando
                        ? 'Salvando...'
                        : modo === 'convite' ? 'Enviar convite' : 'Criar usuário'
                      }
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
