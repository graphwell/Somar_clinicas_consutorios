"use client";
import React, { useState, useEffect } from 'react';
import { useNicho } from '@/context/NichoContext';
import { fetchWithAuth } from '@/lib/api-utils';

interface Service {
  id: string;
  nome: string;
  descricao?: string;
  preco: number;
  duracaoMinutos: number;
  color?: string;
}

const OFFICIAL_COLORS = [
  { label: 'Estética', value: '#F472B6' },
  { label: 'Cabelo', value: '#A78BFA' },
  { label: 'Massagem', value: '#34D399' },
  { label: 'Unhas', value: '#FB7185' },
  { label: 'Médico', value: '#60A5FA' },
  { label: 'Terapia', value: '#38BDF8' }
];

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
      const res = await fetchWithAuth('/api/services');
      const data = await res.json();
      setServices(Array.isArray(data) ? data : []);
    } catch { } finally { setLoading(false); }
  };

  useEffect(() => { fetchServices(); }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      await fetchWithAuth('/api/services', {
        method: 'POST',
        body: JSON.stringify({ id: editingId || undefined, nome, descricao, preco: Number(preco.toString().replace(',', '.')), duracaoMinutos: Number(duracao), color })
      });
      setShowModal(false); resetForm(); fetchServices();
    } catch { } finally { setSaving(false); }
  };

  const handleEdit = (s: Service) => {
    setEditingId(s.id); setNome(s.nome); setDescricao(s.descricao || ''); setPreco(s.preco.toString()); setDuracao(s.duracaoMinutos.toString()); setColor(s.color || '#3B82F6'); setShowModal(true);
  };

  const resetForm = () => {
    setEditingId(null); setNome(''); setDescricao(''); setPreco(''); setDuracao('30'); setColor('#3B82F6');
  };

  return (
    <div className="max-w-7xl mx-auto space-y-12 pb-40 animate-premium">
      
      {/* Header Premium V2.2 */}
      <div className="bg-white border border-card-border p-10 rounded-[3rem] shadow-sm flex flex-col md:flex-row justify-between items-center gap-8">
        <div className="flex items-center gap-6">
           <div className="w-14 h-14 rounded-3xl bg-primary text-white flex items-center justify-center text-3xl shadow-xl shadow-primary/20 italic font-black">S</div>
           <div>
              <h2 className="text-2xl font-black italic uppercase tracking-tighter text-text-main">Catálogo de <span className="text-primary">{labels.servico}s</span></h2>
              <p className="text-[10px] font-black text-text-placeholder uppercase tracking-[0.25em] mt-1 opacity-60">Visualização V2.2 Official Design</p>
           </div>
        </div>
        <button onClick={() => { resetForm(); setShowModal(true); }} className="btn-primary flex items-center justify-center gap-3">
           <span className="text-lg">➕</span> Registrar Procedimento
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
        {loading ? (
          <div className="col-span-full py-40 text-center font-black uppercase text-[10px] text-text-placeholder tracking-[0.5em] animate-pulse">Sincronizando serviços...</div>
        ) : (
          services.map((s) => (
            <div key={s.id} onClick={() => handleEdit(s)} className="premium-card p-10 flex flex-col justify-between group relative overflow-hidden transition-all hover:-translate-y-2 cursor-pointer h-96">
               <div className="absolute top-0 right-0 w-32 h-32 translate-x-12 -translate-y-12 rounded-full opacity-0 blur-3xl transition-opacity group-hover:opacity-40" style={{ backgroundColor: s.color || '#3B82F6' }} />
               
               <div className="flex justify-between items-start border-b border-slate-50 pb-8">
                  <div className="w-20 h-20 rounded-[2rem] flex items-center justify-center text-3xl border border-card-border shadow-inner bg-slate-50 relative overflow-hidden">
                    <div className="absolute inset-x-0 bottom-0 h-1" style={{ backgroundColor: s.color || '#3B82F6' }} />
                    <div className="w-3 h-3 rounded-full shadow-lg animate-pulse" style={{ backgroundColor: s.color || '#3B82F6' }} />
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-text-placeholder block font-black uppercase tracking-widest mb-1.5 opacity-40">Valor de Venda</span>
                    <span className="text-3xl font-black text-text-main tracking-tighter italic">R$ {s.preco.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
               </div>

               <div className="py-6">
                  <h3 className="font-black text-text-main group-hover:text-primary transition-colors tracking-tighter text-2xl italic uppercase underline decoration-primary/5 underline-offset-8 decoration-4">{s.nome}</h3>
                  <p className="text-xs text-text-muted mt-6 line-clamp-2 h-10 font-medium leading-relaxed italic opacity-60">{s.descricao || 'Serviço ativo sem descrição técnica.'}</p>
               </div>

               <div className="flex items-center justify-between border-t border-slate-50 pt-8 mt-auto">
                  <div className="flex items-center gap-3">
                     <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color || '#3B82F6' }} />
                     <span className="text-[10px] font-black text-text-placeholder uppercase tracking-widest">Ativo</span>
                  </div>
                  <span className="bg-slate-50 text-text-main border border-card-border px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-inner">⏱ {s.duracaoMinutos} min</span>
               </div>
            </div>
          ))
        )}
        
        {!loading && services.length === 0 && (
           <div className="col-span-full py-60 text-center bg-white border border-card-border rounded-[4rem] text-text-placeholder uppercase font-black text-xs tracking-[0.5em] opacity-30 shadow-inner italic">Catálogo Vazio</div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/10 backdrop-blur-md z-[200] flex items-center justify-center p-4 animate-in fade-in" onClick={() => setShowModal(false)}>
          <div className="bg-white border border-card-border rounded-[3.5rem] p-12 w-full max-w-xl shadow-2xl scale-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-10 pb-8 border-b border-slate-50">
              <div>
                 <h3 className="text-2xl font-black italic uppercase tracking-tighter text-text-main">📌 Definir Procedimento</h3>
                 <p className="text-[10px] font-black text-text-placeholder uppercase tracking-widest mt-1 opacity-60">Configurações técnicas e comerciais V2.2</p>
              </div>
              <button onClick={() => setShowModal(false)} className="w-10 h-10 rounded-xl hover:bg-slate-50 flex items-center justify-center text-text-placeholder transition-colors italic font-black">✕</button>
            </div>
            
            <form onSubmit={handleSave} className="space-y-8">
              <div className="space-y-2">
                <label className="text-[9px] text-text-placeholder font-black uppercase tracking-[0.25em] ml-2">Título Comercial</label>
                <input required type="text" value={nome} onChange={e => setNome(e.target.value)} className="input-premium w-full py-4 text-base" placeholder="Ex: Limpeza de Pele" />
              </div>

              <div className="space-y-4">
                <label className="text-[9px] text-text-placeholder font-black uppercase tracking-[0.25em] ml-2">Paleta Sugerida (Identificação em Agenda)</label>
                <div className="flex flex-wrap gap-3">
                  {OFFICIAL_COLORS.map(c => (
                     <button key={c.value} type="button" onClick={() => setColor(c.value)} className={`flex-1 min-w-[70px] h-12 rounded-xl transition-all border-2 text-[8px] font-black uppercase tracking-tighter flex items-center justify-center ${color === c.value ? 'border-primary shadow-lg ring-4 ring-primary/10' : 'border-transparent opacity-60 hover:opacity-100'}`} style={{ backgroundColor: c.value + '20', color: c.value }}>
                        {c.label}
                     </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-[9px] text-text-placeholder font-black uppercase tracking-[0.25em] ml-2">Preço de Venda (R$)</label>
                  <input required value={preco} onChange={e => setPreco(e.target.value)} className="input-premium w-full text-lg font-black italic" placeholder="0,00" />
                </div>
                <div className="space-y-2 text-left">
                  <label className="text-[9px] text-text-placeholder font-black uppercase tracking-[0.25em] ml-2">Ciclo de Tempo (Minutos)</label>
                  <input required type="number" value={duracao} onChange={e => setDuracao(e.target.value)} className="input-premium w-full text-lg font-black italic" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[9px] text-text-placeholder font-black uppercase tracking-[0.25em] ml-2">Descrição Operacional</label>
                <textarea rows={2} value={descricao} onChange={e => setDescricao(e.target.value)} className="input-premium w-full py-4 text-sm resize-none" placeholder="Detalhes técnicos..." />
              </div>

              <div className="flex gap-4 pt-8">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-5 rounded-[1.5rem] bg-slate-100 text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all font-black">Descartar</button>
                <button type="submit" disabled={saving} className="btn-primary flex-2 py-5 text-[10px]">
                  {saving ? 'Gravando...' : 'Confirmar e Publicar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
