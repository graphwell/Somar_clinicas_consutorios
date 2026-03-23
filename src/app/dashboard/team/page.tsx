"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { useNicho } from '@/context/NichoContext';

const TENANT_ID = 'clinica_id_default';

interface Profissional {
  id: string;
  nome: string;
  especialidade: string | null;
  ativo: boolean;
}

export default function TeamPage() {
  const { labels } = useNicho();
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Profissional | null>(null);

  // Form
  const [nome, setNome] = useState('');
  const [especialidade, setEspecialidade] = useState('');
  const [ativo, setAtivo] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchTeam = useCallback(() => {
    setLoading(true);
    fetch(`/api/team?tenantId=${TENANT_ID}`)
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setProfissionais(data); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchTeam(); }, [fetchTeam]);

  const openAdd = () => {
    setEditing(null);
    setNome('');
    setEspecialidade('');
    setAtivo(true);
    setShowModal(true);
  };

  const openEdit = (p: Profissional) => {
    setEditing(p);
    setNome(p.nome);
    setEspecialidade(p.especialidade || '');
    setAtivo(p.ativo);
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const url = editing ? `/api/team/${editing.id}` : '/api/team';
      const method = editing ? 'PUT' : 'POST';
      const body = { tenantId: TENANT_ID, nome, especialidade, ativo };

      const res = await fetch(url, {
        method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
      });
      if (!res.ok) throw new Error();
      setShowModal(false);
      fetchTeam();
    } catch (error) {
      alert("Erro ao salvar profissional");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">🧑‍💼 Minha Equipe</h2>
          <p className="text-gray-400 text-sm mt-1">Gerencie os {labels.profissional.toLowerCase()}s e suas agendas.</p>
        </div>
        <button
          onClick={openAdd}
          className="px-5 py-2.5 bg-[#4a4ae2] hover:bg-[#3a3ab2] rounded-xl text-sm font-semibold transition-all shadow-[0_4px_20px_rgba(74,74,226,0.35)]"
        >
          + Adicionar {labels.profissional}
        </button>
      </div>

      <div className="bg-[#0a0a20]/50 border border-white/5 rounded-2xl overflow-hidden min-h-[400px]">
        {loading ? (
          <div className="flex items-center justify-center p-16 text-gray-400">Carregando...</div>
        ) : profissionais.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-16 text-gray-400">
            <span className="text-5xl mb-4">🙌</span>
            <p className="font-medium text-white">Nenhum membro cadastrado</p>
            <p className="text-sm mt-1">Sua clínica opera apenas com uma pessoa ou você ainda não os adicionou.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
            {profissionais.map(p => (
              <div key={p.id} className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:border-white/20 transition-all flex flex-col">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-[#4a4ae2] to-[#8080ff] flex items-center justify-center text-white font-bold text-lg shadow-inner">
                    {p.nome.charAt(0).toUpperCase()}
                  </div>
                  <span className={`px-2 py-1 rounded-lg text-xs font-bold ${p.ativo ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                    {p.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white mb-1">{p.nome}</h3>
                <p className="text-sm text-gray-400 mb-6">{p.especialidade || 'Geral'}</p>
                
                <button 
                  onClick={() => openEdit(p)}
                  className="mt-auto w-full py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm transition-all text-white font-medium"
                >
                  Editar
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
          <div className="bg-[#0d0d22] border border-white/10 rounded-2xl p-8 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-6">{editing ? `Editar ${labels.profissional}` : `Novo ${labels.profissional}`}</h3>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs text-gray-400 uppercase tracking-widest">Nome</label>
                <input required type="text" value={nome} onChange={e => setNome(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#4a4ae2]" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-gray-400 uppercase tracking-widest">Especialidade (Opcional)</label>
                <input type="text" value={especialidade} onChange={e => setEspecialidade(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#4a4ae2]" />
              </div>
              <div className="flex items-center gap-3 pt-2">
                <input type="checkbox" checked={ativo} onChange={e => setAtivo(e.target.checked)} className="w-5 h-5 rounded border-white/20 bg-[#050510] text-[#4a4ae2]" id="ativo-chk" />
                <label htmlFor="ativo-chk" className="text-sm text-white font-medium cursor-pointer">Profissional Ativo (Recebe agenda)</label>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-sm transition-all">Cancelar</button>
                <button type="submit" disabled={saving} className="flex-1 py-3 bg-[#4a4ae2] hover:bg-[#3a3ab2] rounded-xl text-sm font-semibold transition-all">
                  {saving ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
