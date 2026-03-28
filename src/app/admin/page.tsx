"use client";
import React, { useState, useEffect } from 'react';

export default function AdminSynkaPage() {
  const [secret, setSecret] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [metrics, setMetrics] = useState<any>(null);
  const [clinicas, setClinicas] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [editingNicho, setEditingNicho] = useState<any>(null);
  const [newNicho, setNewNicho] = useState('');
  const [newLabels, setNewLabels] = useState<any>({});

  // Authenticate
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/metrics?secret=${secret}`);
      if (res.ok) {
        setAuthenticated(true);
        const data = await res.json();
        setMetrics(data.metrics);
        fetchClinicas();
      } else {
        alert("Senha incorreta");
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchClinicas = async () => {
    const res = await fetch(`/api/admin/tenants?secret=${secret}`);
    if (res.ok) {
      const data = await res.json();
      setClinicas(data.clinicas);
    }
  };

  const toggleStatus = async (id: string, currentBotActive: boolean) => {
    const newStatus = currentBotActive ? 'inativo' : 'ativo';
    if (!confirm(`Deseja alterar o status desta clínica para ${newStatus}?`)) return;

    try {
      await fetch(`/api/admin/tenants/${id}?secret=${secret}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statusBot: newStatus })
      });
      fetchClinicas();
    } catch(e) {
      alert("Erro ao alterar status");
    }
  };

  const saveNicho = async () => {
    try {
      await fetch(`/api/admin/tenants/${editingNicho.tenantId}?secret=${secret}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          nicho: newNicho,
          labels: newLabels
        })
      });
      setEditingNicho(null);
      fetchClinicas();
    } catch(e) {
      alert("Erro ao salvar nicho");
    }
  };

  const openNichoModal = (c: any) => {
    setEditingNicho(c);
    setNewNicho(c.nicho || 'Clínica Médica — Monoespecialidade');
    setNewLabels({
       cliente: 'Paciente',
       servico: 'Consulta',
       profissional: 'Médico',
       atendimento: 'Consulta',
       prontuario: 'Prontuário'
    });
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-[#050510] flex items-center justify-center text-white p-4">
        <form onSubmit={handleAuth} className="bg-[#0a0a20] p-8 rounded-2xl border border-white/10 w-full max-w-sm text-center">
          <div className="w-16 h-16 bg-[#4a4ae2]/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-3xl">🛡️</span>
          </div>
          <h2 className="text-xl font-bold mb-2">Painel Synka Master</h2>
          <p className="text-gray-400 text-sm mb-6">Acesso restrito aos administradores</p>
          <input 
            type="password" 
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

  return (
    <div className="min-h-screen bg-[#050510] text-white p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0a0a20]/80 border border-white/5 p-6 rounded-2xl">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-tr from-[#4a4ae2] to-[#8080ff] rounded-xl flex items-center justify-center text-2xl shadow-[0_0_20px_rgba(74,74,226,0.3)]">
              👑
            </div>
            <div>
              <h1 className="text-2xl font-bold">Synka Master</h1>
              <p className="text-sm text-gray-400">Visão Geral da Franquia</p>
            </div>
          </div>
          <button onClick={() => setAuthenticated(false)} className="text-sm text-gray-400 hover:text-white transition-colors">
            Sair [✕]
          </button>
        </div>

        {/* Metrics Grid */}
        {metrics && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
              <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold">Clínicas Registradas</p>
              <p className="text-4xl font-bold text-white mt-1">{metrics.totalClinicas}</p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
              <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold">Clínicas Ativas</p>
              <p className="text-4xl font-bold text-green-400 mt-1">{metrics.clinicasAtivas}</p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
              <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold">Agendamentos (Mês)</p>
              <p className="text-4xl font-bold text-[#8080ff] mt-1">{metrics.totalAgendamentosMes}</p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
              <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold">Total de Pacientes</p>
              <p className="text-4xl font-bold text-orange-400 mt-1">{metrics.totalPacientes}</p>
            </div>
          </div>
        )}

        {/* Lista de Clínicas */}
        <div className="bg-[#0a0a20]/50 border border-white/5 rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-white/5">
            <h2 className="text-lg font-bold">Empresas (Tenants)</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-gray-400 uppercase tracking-wider bg-white/5">
                <tr>
                  <th className="px-6 py-4 font-medium">Clinica / Tenant ID</th>
                  <th className="px-6 py-4 font-medium text-center">Nicho</th>
                  <th className="px-6 py-4 font-medium text-center">Uso</th>
                  <th className="px-6 py-4 font-medium text-center">Status</th>
                  <th className="px-6 py-4 font-medium text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {clinicas.map((c) => (
                  <tr key={c.id} className="hover:bg-white/5 transition-colors group">
                    <td className="px-6 py-4">
                      <p className="font-bold text-white">{c.nome}</p>
                      <p className="text-xs text-gray-500 font-mono mt-0.5">{c.tenantId}</p>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-block px-2.5 py-1 bg-white/10 text-gray-300 rounded-lg text-xs font-semibold">
                        {c.nichoId}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="text-xs text-gray-400 space-y-1">
                        <p><span className="text-white font-medium">{c._count?.agendamentos || 0}</span> agendamentos</p>
                        <p><span className="text-white font-medium">{c._count?.pacientes || 0}</span> pacientes</p>
                        <p><span className="text-white font-medium">{c._count?.profissionais || 0}</span> profs</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {c.botActive ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/15 text-green-400 text-xs font-bold border border-green-500/30">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> Ativo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/15 text-red-400 text-xs font-bold border border-red-500/30">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span> Inativo
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => openNichoModal(c)}
                          className="px-3 py-2 rounded-lg bg-white/5 text-xs text-white hover:bg-white/10"
                        >
                          Configurar Nicho
                        </button>
                        <button
                          onClick={() => toggleStatus(c.tenantId, c.botActive)}
                          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                            c.botActive
                              ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
                              : 'bg-green-500/10 text-green-400 hover:bg-green-500/20'
                          }`}
                        >
                          {c.botActive ? 'Suspender' : 'Reativar'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {clinicas.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                      Nenhuma clínica encontrada
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Nicho */}
        {editingNicho && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
             <div className="bg-[#0a0a20] border border-white/10 p-8 rounded-3xl w-full max-w-md">
                <h3 className="text-xl font-bold mb-6 italic uppercase">Ajustar Nicho: {editingNicho.nome}</h3>
                
                <div className="space-y-4">
                   <div className="space-y-1">
                      <label className="text-xs text-gray-400 uppercase font-black">Nicho Principal</label>
                      <select 
                        value={newNicho} 
                        onChange={(e) => setNewNicho(e.target.value)}
                        className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm"
                      >
                        <option value="Clínica Médica — Monoespecialidade">Clínica Médica</option>
                        <option value="Salão de Beleza">Salão de Beleza</option>
                        <option value="Barbearia">Barbearia</option>
                        <option value="Odontologia">Odontologia</option>
                      </select>
                   </div>
                   
                   <p className="text-[10px] text-gray-500 italic mt-4">
                     As labels (Paciente, Consulta, etc.) são ajustadas automaticamente baseadas no nicho selecionado, mas podem ser sobrescritas via banco de dados.
                   </p>

                   <div className="flex gap-3 mt-8">
                      <button onClick={() => setEditingNicho(null)} className="flex-1 py-3 bg-white/5 rounded-xl text-sm font-bold">Cancelar</button>
                      <button onClick={saveNicho} className="flex-1 py-3 bg-[#4a4ae2] rounded-xl text-sm font-bold">Salvar Alterações</button>
                   </div>
                </div>
             </div>
          </div>
        )}
      </div>
    </div>
  );
}
