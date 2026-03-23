"use client";
import React, { useState, useEffect } from 'react';
import { useNicho } from '@/context/NichoContext';

interface Service {
  id: string;
  nome: string;
  descricao?: string;
  preco: number;
  duracaoMinutos: number;
}

const TENANT_ID = 'clinica_id_default';

export default function ServicesPage() {
  const { labels } = useNicho();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  
  // States for new/edit service
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [preco, setPreco] = useState('');
  const [duracao, setDuracao] = useState('30');
  const [saving, setSaving] = useState(false);

  const fetchServices = async () => {
    try {
      const res = await fetch(`/api/services?tenantId=${TENANT_ID}`);
      const data = await res.json();
      setServices(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: TENANT_ID,
          nome,
          descricao,
          preco: preco.replace(',', '.'),
          duracaoMinutos: duracao
        })
      });
      if (res.ok) {
        setShowModal(false);
        resetForm();
        fetchServices();
      }
    } catch (error) {
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setNome('');
    setDescricao('');
    setPreco('');
    setDuracao('30');
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Catálogo de {labels.servico}s</h2>
          <p className="text-sm text-gray-500 mt-1">Gerencie os preços e descrições dos seus procedimentos.</p>
        </div>
        <button 
          onClick={() => { resetForm(); setShowModal(true); }}
          className="bg-[#4a4ae2] hover:bg-[#3a3ab2] text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-lg shadow-[#4a4ae2]/20"
        >
          + Novo {labels.servico}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-20 text-center animate-pulse text-gray-400">Carregando catálogo...</div>
        ) : services.length === 0 ? (
          <div className="col-span-full py-20 bg-white/5 border border-dashed border-white/10 rounded-2xl text-center">
            <p className="text-gray-500">Nenhum {labels.servico.toLowerCase()} cadastrado ainda.</p>
          </div>
        ) : (
          services.map((s) => (
            <div key={s.id} className="bg-[#0a0a20]/40 backdrop-blur-md border border-white/5 rounded-2xl p-6 space-y-4 group hover:border-[#4a4ae2]/40 transition-all">
              <div className="flex justify-between items-start">
                <div className="w-10 h-10 rounded-xl bg-[#4a4ae2]/10 flex items-center justify-center text-xl">📦</div>
                <div className="text-right">
                  <span className="text-sm text-gray-500 block">Valor</span>
                  <span className="text-lg font-bold text-[#f0f0f5]">R$ {s.preco.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
              <div>
                <h3 className="font-bold text-[#f0f0f5] group-hover:text-[#4a4ae2] transition-colors">{s.nome}</h3>
                <p className="text-xs text-gray-500 mt-1 line-clamp-2 h-8">{s.descricao || 'Sem descrição.'}</p>
              </div>
              <div className="flex items-center gap-4 text-[10px] text-gray-500 uppercase tracking-widest border-t border-white/5 pt-4">
                <span>⏱ {s.duracaoMinutos} min</span>
                <span>ID: {s.id.slice(0,8)}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0a0a20] border border-white/10 rounded-3xl p-8 w-full max-w-lg shadow-2xl animate-in zoom-in duration-300">
            <h3 className="text-xl font-bold mb-6">Novo {labels.servico}</h3>
            <form onSubmit={handleSave} className="space-y-5">
              <div className="space-y-1">
                <label className="text-xs text-gray-400 uppercase tracking-widest">Nome do {labels.servico}</label>
                <input required type="text" value={nome} onChange={e => setNome(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#4a4ae2] transition-colors" placeholder="Ex: Limpeza de Pele Profunda" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-gray-400 uppercase tracking-widest">Descrição Curta</label>
                <textarea rows={3} value={descricao} onChange={e => setDescricao(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#4a4ae2] transition-colors resize-none" placeholder="O que está incluso neste procedimento?" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs text-gray-400 uppercase tracking-widest">Valor (R$)</label>
                  <input required type="text" value={preco} onChange={e => setPreco(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#4a4ae2] transition-colors" placeholder="00,00" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-gray-400 uppercase tracking-widest">Duração (Min)</label>
                  <input required type="number" value={duracao} onChange={e => setDuracao(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#4a4ae2] transition-colors" />
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-sm font-medium transition-all">Cancelar</button>
                <button type="submit" disabled={saving} className="flex-1 py-3 rounded-xl bg-[#4a4ae2] hover:bg-[#3a3ab2] text-white text-sm font-bold transition-all shadow-lg shadow-[#4a4ae2]/20">
                  {saving ? 'Gravando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
