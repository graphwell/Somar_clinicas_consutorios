"use client";
import React, { useState } from 'react';

type Role = 'admin' | 'recepcao';
interface Member { id: string; nome: string; email: string; role: Role; status: 'ativo' | 'pendente'; }

const MOCK_MEMBERS: Member[] = [
  { id: '1', nome: 'Dr. João Silva', email: 'joao@clinica.com', role: 'admin', status: 'ativo' },
  { id: '2', nome: 'Maria Recepcionista', email: 'maria@clinica.com', role: 'recepcao', status: 'ativo' },
  { id: '3', nome: 'ana@clinica.com', email: 'ana@clinica.com', role: 'recepcao', status: 'pendente' },
];

const RoleBadge = ({ role }: { role: Role }) => (
  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${role === 'admin' ? 'bg-[#4a4ae2]/20 text-[#8080ff]' : 'bg-white/10 text-gray-300'}`}>
    {role === 'admin' ? 'Administrador' : 'Atendente'}
  </span>
);

export default function TeamPage() {
  const [showInvite, setShowInvite] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('recepcao');
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState('');

  const sendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    try {
      const res = await fetch('/api/team/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role, tenantId: 'clinica_id_default' }),
      });
      const data = await res.json();
      if (res.ok) { setSuccess(`✅ Convite enviado para ${email}!`); setEmail(''); setShowInvite(false); }
      else setSuccess(`❌ ${data.error}`);
    } finally { setSending(false); }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Equipe</h2>
          <p className="text-gray-400 text-sm mt-1">Gerencie os membros e suas permissões.</p>
        </div>
        <button onClick={() => setShowInvite(true)} className="px-5 py-2.5 bg-[#4a4ae2] hover:bg-[#3a3ab2] rounded-xl text-sm font-semibold transition-all shadow-[0_4px_20px_rgba(74,74,226,0.3)]">
          + Convidar Membro
        </button>
      </div>

      {success && (
        <div className="p-4 bg-white/5 border border-white/10 rounded-xl text-sm">{success}</div>
      )}

      {/* Modal de convite */}
      {showInvite && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-6">
          <div className="bg-[#0a0a20] border border-white/10 rounded-2xl p-8 w-full max-w-md space-y-6">
            <h3 className="text-xl font-bold">Convidar novo membro</h3>
            <form onSubmit={sendInvite} className="space-y-4">
              <div className="space-y-1">
                <label className="text-sm text-gray-400">E-mail do convidado</label>
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)} 
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#4a4ae2] transition-colors" 
                  placeholder="atendente@clinica.com" />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-gray-400">Permissão</label>
                <select value={role} onChange={e => setRole(e.target.value as Role)} 
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#4a4ae2] transition-colors appearance-none">
                  <option value="recepcao" className="bg-[#0a0a20]">Atendente (apenas agenda e pacientes)</option>
                  <option value="admin" className="bg-[#0a0a20]">Administrador (acesso total)</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowInvite(false)} className="flex-1 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm transition-all">
                  Cancelar
                </button>
                <button type="submit" disabled={sending} className="flex-1 py-3 bg-[#4a4ae2] hover:bg-[#3a3ab2] rounded-xl text-sm font-semibold transition-all disabled:opacity-50">
                  {sending ? 'Enviando...' : 'Enviar Convite'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lista de membros */}
      <div className="bg-[#0a0a20]/40 border border-white/5 rounded-2xl divide-y divide-white/5 overflow-hidden">
        {MOCK_MEMBERS.map(member => (
          <div key={member.id} className="flex items-center justify-between px-6 py-4 hover:bg-white/2 transition-colors">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#4a4ae2] to-[#8080ff] flex items-center justify-center text-white text-sm font-bold">
                {member.nome[0]}
              </div>
              <div>
                <p className="font-medium text-sm">{member.nome}</p>
                <p className="text-gray-400 text-xs">{member.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <RoleBadge role={member.role} />
              {member.status === 'pendente' && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 font-semibold uppercase tracking-wider">Pendente</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Nível de Permissões */}
      <div className="bg-[#0a0a20]/40 border border-white/5 rounded-2xl p-6 space-y-4">
        <h3 className="font-semibold text-sm uppercase tracking-widest text-gray-400">Níveis de Permissão</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div className="p-4 bg-[#4a4ae2]/10 border border-[#4a4ae2]/20 rounded-xl">
            <p className="font-bold text-[#8080ff] mb-2">👑 Administrador</p>
            <ul className="text-gray-400 space-y-1 text-xs">
              <li>✅ Acessa todas as telas</li>
              <li>✅ Gerencia equipe e convites</li>
              <li>✅ Visualiza dados financeiros</li>
              <li>✅ Configura a IA e o WhatsApp</li>
            </ul>
          </div>
          <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
            <p className="font-bold text-gray-300 mb-2">🧑‍💼 Atendente</p>
            <ul className="text-gray-400 space-y-1 text-xs">
              <li>✅ Visualiza e cria agendamentos</li>
              <li>✅ Cadastra e edita pacientes</li>
              <li>❌ Não acessa configurações</li>
              <li>❌ Não gerencia equipe ou plano</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
