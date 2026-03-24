"use client";
import React, { useState, useEffect } from 'react';
import { useNicho } from '@/context/NichoContext';

interface Service {
  id: string;
  nome: string;
  descricao?: string;
  preco: number;
  duracaoMinutos: number;
  color?: string;
}

const TENANT_ID = 'clinica_id_default';

const PRESET_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#6366F1', '#14B8A6'];

export default function ServicesPage() {
  const { labels } = useNicho();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [preco, setPreco] = useState('');
  const [duracao, setDuracao] = useState('30');
  const [color, setColor] = useState('#3B82F6');
  const [saving, setSaving] = useState(false);

  const fetchServices = async () => {
    try {
      const res = await fetch(`/api/services?tenantId=${TENANT_ID}`);
      const data = await res.json();
      setServices(Array.isArray(data) ? data : []);
    } catch (error) { console.error(error); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchServices(); }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: TENANT_ID,
          id: editingId || undefined,
          nome,
          descricao,
          preco: preco.toString().replace(',', '.'),
          duracaoMinutos: duracao,
          color
        })
      });
      if (res.ok) {
        setShowModal(false);
        resetForm();
        fetchServices();
      }
    } catch (error) { console.error(error); }
    finally { setSaving(false); }
  };

  const handleEdit = (s: Service) => {
    setEditingId(s.id);
    setNome(s.nome);
    setDescricao(s.descricao || '');
    setPreco(s.preco.toString());
    setDuracao(s.duracaoMinutos.toString());
    setColor(s.color || '#3B82F6');
    setShowModal(true);
  };

  const resetForm = () => {
    setEditingId(null);
    setNome('');
    setDescricao('');
    setPreco('');
    setDuracao('30');
    setColor('#3B82F6');
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex items-center justify-between bg-[var(--card-bg)] border border-[var(--border)] p-8 rounded-[2.5rem] shadow-sm">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-[var(--foreground)] uppercase italic">📦 Catálogo de {labels.servico}s</h2>
          <p className="text-xs text-[var(--text-muted)] mt-1 font-black uppercase tracking-widest opacity-60">Personalize seus procedimentos e cores na agenda</p>
        </div>
        <button onClick={() => { resetForm(); setShowModal(true); }} className="px-8 py-4 bg-[var(--accent)] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-[var(--accent)]/20 transition-all active:scale-95">+ Novo {labels.servico}</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {loading ? (
          <div className="col-span-full py-20 text-center font-black uppercase tracking-widest text-[10px] opacity-40">Carregando...</div>
        ) : services.map((s) => (
          <div key={s.id} onClick={() => handleEdit(s)} className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[2.5rem] p-8 space-y-6 group hover:border-[var(--accent)]/40 transition-all shadow-sm cursor-pointer relative overflow-hidden">
             <div className="absolute top-0 right-0 w-24 h-24 translate-x-12 -translate-y-12 rounded-full opacity-10 blur-2xl" style={{ backgroundColor: s.color || 'var(--accent)' }} />
             
             <div className="flex justify-between items-start">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-inner border border-[var(--border)]" style={{ backgroundColor: (s.color || 'var(--accent)') + '15' }}>
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: s.color || 'var(--accent)' }} />
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-[var(--text-muted)] block font-black uppercase tracking-widest mb-1">Preço</span>
                  <span className="text-2xl font-black text-[var(--foreground)] tracking-tighter">R$ {s.preco.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
             </div>

             <div>
                <h3 className="font-black text-[var(--foreground)] group-hover:text-[var(--accent)] transition-colors tracking-tight text-xl italic uppercase underline decoration-[var(--accent)]/20 underline-offset-4">{s.nome}</h3>
                <p className="text-xs text-[var(--text-muted)] mt-3 line-clamp-2 h-10 font-medium leading-relaxed italic opacity-80">{s.descricao || 'Sem descrição cadastrada.'}</p>
             </div>

             <div className="flex items-center justify-between border-t border-[var(--border)] pt-6">
                <div className="flex items-center gap-2">
                   <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color || 'var(--accent)' }} />
                   <span className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">Procedimento Ativo</span>
                </div>
                <span className="bg-[var(--foreground)]/5 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-tighter text-[var(--text-muted)]">⏱ {s.duracaoMinutos} Min</span>
             </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[3rem] p-10 w-full max-w-lg shadow-2xl animate-in zoom-in duration-300" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-black italic uppercase tracking-tight text-[var(--foreground)]">{editingId ? 'Editar' : 'Novo'} {labels.servico}</h3>
              <button onClick={() => setShowModal(false)} className="w-10 h-10 rounded-2xl hover:bg-[var(--foreground)]/5 flex items-center justify-center text-gray-400">✕</button>
            </div>
            
            <form onSubmit={handleSave} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[9px] text-[var(--text-muted)] font-black uppercase tracking-widest">Nome do Procedimento</label>
                <input required type="text" value={nome} onChange={e => setNome(e.target.value)} className="w-full bg-[var(--foreground)]/5 border border-[var(--border)] rounded-2xl px-5 py-4 text-sm focus:outline-none focus:border-[var(--accent)] font-medium" />
              </div>

              <div className="space-y-2">
                <label className="text-[9px] text-[var(--text-muted)] font-black uppercase tracking-widest">Cor na Agenda (Identificação Visual)</label>
                <div className="flex flex-wrap gap-2 pt-1">
                  {PRESET_COLORS.map(c => (
                    <button key={c} type="button" onClick={() => setColor(c)} className={`w-10 h-10 rounded-xl transition-all ${color === c ? 'ring-4 ring-[var(--accent)]/30 scale-110 z-10' : 'opacity-60 hover:opacity-100'}`} style={{ backgroundColor: c }} />
                  ))}
                  <input type="color" value={color} onChange={e => setColor(e.target.value)} className="w-10 h-10 rounded-xl bg-transparent border-0 p-0 cursor-pointer overflow-hidden" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[9px] text-[var(--text-muted)] font-black uppercase tracking-widest">Valor (R$)</label>
                  <input required type="text" value={preco} onChange={e => setPreco(e.target.value)} className="w-full bg-[var(--foreground)]/5 border border-[var(--border)] rounded-2xl px-5 py-4 text-sm focus:outline-none" placeholder="0,00" />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] text-[var(--text-muted)] font-black uppercase tracking-widest">Duração (Min)</label>
                  <input required type="number" value={duracao} onChange={e => setDuracao(e.target.value)} className="w-full bg-[var(--foreground)]/5 border border-[var(--border)] rounded-2xl px-5 py-4 text-sm focus:outline-none" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[9px] text-[var(--text-muted)] font-black uppercase tracking-widest">Descrição</label>
                <textarea rows={2} value={descricao} onChange={e => setDescricao(e.target.value)} className="w-full bg-[var(--foreground)]/5 border border-[var(--border)] rounded-2xl px-5 py-4 text-sm focus:outline-none resize-none font-medium text-[var(--text-muted)]" />
              </div>

              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-4 rounded-2xl bg-[var(--foreground)]/5 text-[10px] font-black uppercase tracking-widest transition-all">Cancelar</button>
                <button type="submit" disabled={saving} className="flex-1 py-4 rounded-2xl bg-[var(--accent)] text-white text-[10px] font-black uppercase tracking-widest shadow-xl shadow-[var(--accent)]/20">
                  {saving ? 'GRAVANDO...' : 'SALVAR CATÁLOGO'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
