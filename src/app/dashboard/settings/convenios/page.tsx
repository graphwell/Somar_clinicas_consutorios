"use client";
import React, { useState, useEffect, useCallback } from 'react';

const TENANT_ID = 'clinica_id_default';

interface Convenio {
  id: string;
  nomeConvenio: string;
  ativo: boolean;
}

export default function ConveniosPage() {
  const [convenios, setConvenios] = useState<Convenio[]>([]);
  const [loading, setLoading] = useState(true);
  const [nomeNovo, setNomeNovo] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchConvenios = useCallback(() => {
    setLoading(true);
    fetch(`/api/settings/convenios?tenantId=${TENANT_ID}`)
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setConvenios(data); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchConvenios(); }, [fetchConvenios]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomeNovo.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/settings/convenios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId: TENANT_ID, nomeConvenio: nomeNovo, ativo: true })
      });
      if (res.ok) {
        setNomeNovo('');
        fetchConvenios();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (c: Convenio) => {
    try {
      await fetch(`/api/settings/convenios/${c.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId: TENANT_ID, nomeConvenio: c.nomeConvenio, ativo: !c.ativo })
      });
      fetchConvenios();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja excluir este convênio?')) return;
    try {
      await fetch(`/api/settings/convenios/${id}?tenantId=${TENANT_ID}`, { method: 'DELETE' });
      fetchConvenios();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold">🏥 Convênios e Planos</h2>
        <p className="text-gray-400 text-sm mt-1">Gerencie os planos de saúde / convênios aceitos pela clínica.</p>
      </div>

      <div className="bg-[#0a0a20]/50 border border-white/5 rounded-2xl p-6">
        <form onSubmit={handleCreate} className="flex flex-col sm:flex-row gap-3 mb-8">
          <input
            type="text"
            required
            value={nomeNovo}
            onChange={e => setNomeNovo(e.target.value)}
            placeholder="Nome do Convênio (ex: Unimed, Bradesco Saúde)"
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#4a4ae2] transition-colors"
          />
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-3 bg-[#4a4ae2] hover:bg-[#3a3ab2] rounded-xl text-sm font-semibold transition-all shadow-[0_4px_20px_rgba(74,74,226,0.35)] whitespace-nowrap"
          >
            {saving ? 'Adicionando...' : '+ Adicionar'}
          </button>
        </form>

        {loading ? (
          <div className="text-center p-8 text-gray-400">Carregando convênios...</div>
        ) : convenios.length === 0 ? (
          <div className="text-center p-12 border border-white/5 border-dashed rounded-xl bg-white/3">
            <span className="text-4xl">📄</span>
            <p className="text-gray-400 mt-4 text-sm">Nenhum convênio cadastrado.</p>
            <p className="text-gray-500 text-xs mt-1">Adicione o primeiro ali em cima para que fique disponível no agendamento.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {convenios.map(c => (
              <div key={c.id} className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl hover:border-white/20 transition-all">
                <div className="flex items-center gap-4">
                  <div className={`w-3 h-3 rounded-full ${c.ativo ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-gray-600'}`} />
                  <span className="font-semibold">{c.nomeConvenio}</span>
                  {!c.ativo && <span className="text-xs bg-red-500/10 text-red-400 px-2 py-0.5 rounded-full outline outline-1 outline-red-500/20">Desativado</span>}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleToggle(c)} className="px-3 py-1.5 text-xs font-semibold bg-white/10 hover:bg-white/20 rounded-lg transition-colors">
                    {c.ativo ? 'Desativar' : 'Reativar'}
                  </button>
                  <button onClick={() => handleDelete(c.id)} className="px-3 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-500/10 hover:text-red-300 rounded-lg transition-colors">
                    Excluir
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
